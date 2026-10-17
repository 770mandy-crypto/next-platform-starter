// One customer turn: the customer's words go to Claude together with the
// conversation so far; Claude may call tools (each runs against the
// database); its final text is checked by the guardrails and becomes what
// the customer hears.
//
// The model history is append-only: nothing already sent is ever edited.
// When a reply is blocked, the next user turn carries a note saying so.

import Anthropic from '@anthropic-ai/sdk';
import { allowedNumbers, checkReply, trimForSpeech } from './guardrails.js';
import { buildCallContext, buildSystemPrompt, linesFor } from './prompt.js';
import { formatLocal } from './time.js';
import { runTool, TOOL_DEFINITIONS } from './tools.js';
import { replayable } from '../studio/chat.js';

export const AGENT_MODEL = process.env.SALES_AGENT_MODEL || 'claude-opus-5-5';
// Phone conversations need fast turns, so the default effort is low.
const AGENT_EFFORT = process.env.SALES_AGENT_EFFORT || 'low';
const MAX_ROUNDS = 4;

export function isAgentConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

// USD per million tokens. Used for the dashboard's cost estimate only.
const PRICES = {
    'claude-opus-5-5': [4, 20],
    'claude-sonnet-5-5': [2, 10],
    'claude-haiku-5-5': [0.1, 0.5],
    'claude-fable-5-1': [10, 50]
};

export function estimateAiCost(usage, model = AGENT_MODEL) {
    const [input, output] = PRICES[model] ?? PRICES['claude-opus-5-5'];
    return (
        (usage.input * input +
            usage.cacheWrite * input * 1.25 +
            usage.cacheRead * input * 0.1 +
            usage.output * output) /
        1_000_000
    );
}

function groundingSources({ business, knowledge, customerTexts, extra }) {
    const nationalForms = [business.contact_phone, business.handoff_phone, business.inbound_number]
        .filter(Boolean)
        .flatMap((p) => [p, p.startsWith('+972') ? `0${p.slice(4)}` : p]);
    return [
        JSON.stringify(knowledge),
        JSON.stringify(business.business_hours),
        String(business.appointment_minutes),
        ...nationalForms,
        ...customerTexts,
        ...extra
    ];
}

export async function agentTurn({
    business,
    knowledge,
    call,
    lead,
    history,
    customerText,
    pendingNote = '',
    openingLine = '',
    customerTexts = [],
    groundingText = [],
    client = new Anthropic(),
    now = () => new Date()
}) {
    const started = Date.now();
    const ctx = {
        business,
        call,
        lead,
        now,
        groundingText,
        state: { outcomes: new Set(), endCall: false, transfer: null, modelOutcome: null, toolErrors: 0 }
    };

    let text = `Customer: ${customerText}`;
    if (!history.length) {
        const context = buildCallContext({ business, call, lead, nowLabel: formatLocal(now(), business.timezone, 'en-GB') });
        text = `${context}\n\nOpening line you already said: "${openingLine}"\n\n${text}`;
    }
    if (pendingNote) text = `${pendingNote}\n\n${text}`;

    const added = [{ role: 'user', content: [{ type: 'text', text }] }];
    const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    const toolEvents = [];
    let replyText = '';
    let stopReason = null;

    for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const response = await client.beta.messages.create({
            model: AGENT_MODEL,
            max_tokens: 4096,
            system: [{ type: 'text', text: buildSystemPrompt(business, knowledge), cache_control: { type: 'ephemeral' } }],
            thinking: { type: 'adaptive' },
            output_config: { effort: AGENT_EFFORT },
            // A safety decline re-runs on the server's default fallback model
            // instead of leaving the caller in silence.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            tools: TOOL_DEFINITIONS,
            messages: [...history, ...added]
        });
        usage.input += response.usage?.input_tokens ?? 0;
        usage.output += response.usage?.output_tokens ?? 0;
        usage.cacheRead += response.usage?.cache_read_input_tokens ?? 0;
        usage.cacheWrite += response.usage?.cache_creation_input_tokens ?? 0;
        stopReason = response.stop_reason;

        const content = replayable(response.content);
        added.push({ role: 'assistant', content });
        const textNow = content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join(' ')
            .trim();
        if (textNow) replyText = replyText ? `${replyText} ${textNow}` : textNow;

        // A refused or cut-off turn never runs its tools.
        if (response.stop_reason !== 'tool_use') break;

        const results = [];
        for (const block of content.filter((b) => b.type === 'tool_use')) {
            const outcome = await runTool(block.name, block.input, ctx);
            toolEvents.push({ name: block.name, input: block.input, ok: !outcome.isError, result: outcome.result });
            results.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(outcome.result),
                ...(outcome.isError ? { is_error: true } : {})
            });
        }
        added.push({ role: 'user', content: results });
        if (round === MAX_ROUNDS - 1) stopReason = 'max_rounds';
    }

    // The history must end on an assistant turn so the next customer turn can
    // follow it; if the last thing sent was tool results, close it.
    if (added.at(-1).role === 'user') {
        added.push({ role: 'assistant', content: [{ type: 'text', text: replyText || '…' }] });
    }

    const lines = linesFor(business);
    const flags = [];
    let spoken = trimForSpeech(replyText);

    if (stopReason === 'refusal' || !spoken) {
        flags.push(stopReason === 'refusal' ? 'refusal' : 'empty_reply');
        spoken = ctx.state.transfer ? lines.transferring : lines.error;
    } else {
        const allowed = allowedNumbers(
            groundingSources({
                business,
                knowledge,
                customerTexts: [...customerTexts, customerText],
                extra: [...groundingText, ...toolEvents.map((e) => JSON.stringify(e.result))]
            })
        );
        const problems = checkReply(spoken, { allowed });
        if (problems.length) {
            flags.push(...problems.map((p) => p.type));
            spoken = lines.unverified;
        }
    }

    return {
        spoken,
        rawReply: replyText,
        addedMessages: added,
        flags,
        toolEvents,
        usage,
        state: ctx.state,
        lead: ctx.lead,
        latencyMs: Date.now() - started,
        nextNote: flags.length
            ? `(System note: your previous reply was NOT spoken because it failed a check (${flags.join(', ')}). ` +
              `The customer heard instead: "${spoken}". Only state facts from verified knowledge or tool results.)`
            : ''
    };
}
