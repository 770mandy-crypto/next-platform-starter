// Call lifecycle, shared by phone calls (Twilio webhooks) and browser test
// calls: start → customer turns → finish (summary, outcome, cost, quality).

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { agentKnowledge, audit, getBusiness } from './business.js';
import { agentTurn, AGENT_MODEL, estimateAiCost, isAgentConfigured } from './agent.js';
import { isStopRequest } from './compliance.js';
import { withTenant } from './db.js';
import { greeting, linesFor } from './prompt.js';
import { customerPhone, runTool } from './tools.js';

export class CallError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

async function loadLead(db, businessId, leadId) {
    if (!leadId) return null;
    const { rows } = await db.query('SELECT * FROM leads WHERE business_id = $1 AND id = $2', [businessId, leadId]);
    return rows[0] ?? null;
}

async function findLeadByPhone(db, businessId, phone) {
    if (!phone) return null;
    const { rows } = await db.query('SELECT * FROM leads WHERE business_id = $1 AND phone = $2', [businessId, phone]);
    return rows[0] ?? null;
}

// Creates the call row and returns it with the opening line (already
// recorded as the agent's first turn).
export function startCall(businessId, { direction, channel, leadId = null, from = '', to = '', sid = null, goal = '' }) {
    return withTenant(businessId, async (db) => {
        const business = await getBusiness(db, businessId);
        let lead = await loadLead(db, businessId, leadId);
        if (!lead) lead = await findLeadByPhone(db, businessId, direction === 'outbound' ? to : from);
        const { rows } = await db.query(
            `INSERT INTO calls (business_id, lead_id, direction, channel, status, provider_call_sid, from_number, to_number, goal)
             VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8) RETURNING *`,
            [businessId, lead?.id ?? null, direction, channel, sid, from, to, goal]
        );
        const call = rows[0];
        const opening = greeting({ business, call, lead });
        await db.query("INSERT INTO call_turns (call_id, business_id, role, content) VALUES ($1, $2, 'agent', $3)", [
            call.id,
            businessId,
            opening
        ]);
        return { call, business, lead, opening };
    });
}

export async function getCall(db, businessId, callId) {
    const { rows } = await db.query('SELECT * FROM calls WHERE business_id = $1 AND id = $2', [businessId, callId]);
    if (!rows[0]) throw new CallError('call not found', 404);
    return rows[0];
}

function toolResultTexts(messages) {
    return messages
        .filter((m) => m.role === 'user' && Array.isArray(m.content))
        .flatMap((m) => m.content.filter((b) => b.type === 'tool_result').map((b) => String(b.content)));
}

// Handles one thing the customer said. Returns what to say back and whether
// the call should end or be transferred.
export async function customerTurn(businessId, callId, customerText, { client, now = () => new Date() } = {}) {
    const text = String(customerText ?? '').trim().slice(0, 2000);
    const snapshot = await withTenant(businessId, async (db) => {
        const call = await getCall(db, businessId, callId);
        if (call.status !== 'active') throw new CallError('call is not active', 409);
        const business = await getBusiness(db, businessId);
        const knowledge = await agentKnowledge(db, businessId);
        const lead = await loadLead(db, businessId, call.lead_id);
        const { rows } = await db.query(
            "SELECT content, role FROM call_turns WHERE call_id = $1 AND business_id = $2 ORDER BY id",
            [callId, businessId]
        );
        await db.query("INSERT INTO call_turns (call_id, business_id, role, content) VALUES ($1, $2, 'customer', $3)", [
            callId,
            businessId,
            text
        ]);
        return { call, business, knowledge, lead, turns: rows };
    });
    const { call, business, knowledge, lead, turns } = snapshot;
    const lines = linesFor(business);

    if (!isAgentConfigured() && !client) {
        // Never improvise without the model: hand the caller to a person.
        await recordAgentReply(businessId, call, {
            spoken: lines.error,
            flag: 'ai_not_configured',
            errors: 1,
            endRequested: true,
            modelOutcome: 'failed'
        });
        await runTool('log_unanswered_question', { question: `AI not configured. Customer said: ${text}` }, toolCtx(business, call, lead));
        return { reply: lines.error, end: true, transfer: business.handoff_phone || null };
    }

    let result;
    try {
        result = await agentTurn({
            business,
            knowledge,
            call,
            lead,
            history: call.model_messages,
            customerText: text,
            pendingNote: call.pending_note,
            openingLine: turns.find((t) => t.role === 'agent')?.content ?? '',
            customerTexts: turns.filter((t) => t.role === 'customer').map((t) => t.content),
            groundingText: toolResultTexts(call.model_messages),
            client: client ?? new Anthropic(),
            now
        });
    } catch (error) {
        console.error('sales agent turn failed:', error);
        await recordAgentReply(businessId, call, {
            spoken: lines.error,
            flag: 'agent_error',
            errors: 1,
            endRequested: true,
            modelOutcome: 'failed'
        });
        await runTool('log_unanswered_question', { question: `Agent error during call. Customer said: ${text}` }, toolCtx(business, call, lead));
        return { reply: lines.error, end: true, transfer: business.handoff_phone || null };
    }

    // Backstop: a clear stop request is honoured even if the model missed it.
    if (isStopRequest(text) && !result.toolEvents.some((e) => e.name === 'add_to_do_not_call')) {
        const ctx = toolCtx(business, call, result.lead);
        await runTool('add_to_do_not_call', { note: text.slice(0, 200) }, ctx);
        result.state.outcomes.add('do_not_call');
        result.state.endCall = true;
        result.flags.push('stop_request_backstop');
    }
    if (result.flags.includes('unverified_number')) {
        await runTool('log_unanswered_question', { question: text }, toolCtx(business, call, result.lead));
    }

    const end = result.state.endCall || result.state.outcomes.has('do_not_call');
    await recordAgentReply(businessId, call, {
        spoken: result.spoken,
        flag: result.flags.join(',') || null,
        latencyMs: result.latencyMs,
        addedMessages: result.addedMessages,
        nextNote: result.nextNote,
        usage: result.usage,
        guardrailBlocks: result.flags.filter((f) => f === 'unverified_number' || f === 'claims_human').length,
        errors: result.state.toolErrors + (result.flags.includes('agent_error') ? 1 : 0),
        endRequested: end,
        transferTo: result.state.transfer,
        toolEvents: result.toolEvents,
        outcomes: [...result.state.outcomes],
        modelOutcome: result.state.modelOutcome
    });
    return { reply: result.spoken, end, transfer: result.state.transfer, flags: result.flags, toolEvents: result.toolEvents };
}

function toolCtx(business, call, lead) {
    return {
        business,
        call,
        lead,
        now: () => new Date(),
        groundingText: [],
        state: { outcomes: new Set(), endCall: false, transfer: null, toolErrors: 0 }
    };
}

async function recordAgentReply(businessId, call, r) {
    await withTenant(businessId, async (db) => {
        for (const event of r.toolEvents ?? []) {
            await db.query(
                "INSERT INTO call_turns (call_id, business_id, role, content, tool_name, flag) VALUES ($1, $2, 'tool', $3, $4, $5)",
                [call.id, businessId, JSON.stringify({ input: event.input, result: event.result }), event.name, event.ok ? null : 'tool_error']
            );
        }
        await db.query(
            "INSERT INTO call_turns (call_id, business_id, role, content, latency_ms, flag) VALUES ($1, $2, 'agent', $3, $4, $5)",
            [call.id, businessId, r.spoken, r.latencyMs ?? null, r.flag ?? null]
        );
        const usage = r.usage ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
        // Optimistic concurrency: the history only grows from the version this
        // turn read; a concurrent turn on the same call makes this one fail.
        const { rowCount } = await db.query(
            `UPDATE calls SET
                model_messages = model_messages || $3::jsonb,
                pending_note = $4,
                turn_count = turn_count + 1,
                input_tokens = input_tokens + $5,
                output_tokens = output_tokens + $6,
                ai_cost_usd = ai_cost_usd + $7,
                total_latency_ms = total_latency_ms + $8,
                guardrail_blocks = guardrail_blocks + $9,
                errors = errors + $10,
                end_requested = end_requested OR $11,
                transfer_to = coalesce($12, transfer_to),
                silence_count = 0
             WHERE business_id = $1 AND id = $2 AND turn_count = $13`,
            [
                businessId,
                call.id,
                JSON.stringify(r.addedMessages ?? []),
                r.nextNote ?? '',
                usage.input + usage.cacheRead + usage.cacheWrite,
                usage.output,
                estimateAiCost(usage),
                r.latencyMs ?? 0,
                r.guardrailBlocks ?? 0,
                r.errors ?? 0,
                Boolean(r.endRequested),
                r.transferTo ?? null,
                call.turn_count
            ]
        );
        if (!rowCount) throw new CallError('call changed during this turn', 409);
        // Outcomes reached by tools are remembered on the call as they happen.
        const outcome = pickOutcome(r.outcomes ?? [], r.modelOutcome);
        if (outcome) {
            await db.query(
                `UPDATE calls SET outcome = $3 WHERE business_id = $1 AND id = $2
                 AND (outcome IS NULL OR outcome_rank(outcome) < outcome_rank($3))`,
                [businessId, call.id, outcome]
            );
        }
    });
}

// When several things happened, the strongest result names the call.
export const OUTCOME_ORDER = [
    'failed',
    'no_answer',
    'info_only',
    'not_interested',
    'lead_captured',
    'follow_up',
    'transferred',
    'meeting_booked',
    'do_not_call'
];

export function pickOutcome(outcomes, modelOutcome) {
    const all = [...outcomes, ...(modelOutcome ? [modelOutcome] : [])];
    return all.sort((a, b) => OUTCOME_ORDER.indexOf(b) - OUTCOME_ORDER.indexOf(a))[0] ?? null;
}

export async function recordSilence(businessId, callId) {
    return withTenant(businessId, async (db) => {
        const { rows } = await db.query(
            'UPDATE calls SET silence_count = silence_count + 1 WHERE business_id = $1 AND id = $2 RETURNING silence_count',
            [businessId, callId]
        );
        return rows[0]?.silence_count ?? 0;
    });
}

// --- Finishing -------------------------------------------------------------

const SummarySchema = z.object({
    summary: z.string().describe('2-4 sentences in the business language: need, what was offered, result, next step'),
    outcome: z.enum(['meeting_booked', 'lead_captured', 'transferred', 'not_interested', 'do_not_call', 'follow_up', 'info_only']),
    sentiment: z.enum(['positive', 'neutral', 'negative']),
    quality_score: z.number().describe('1-5: did the agent follow the rules, stay accurate, listen, and avoid pressure'),
    quality_notes: z.string().describe('Concrete issues in the agent behaviour, or empty'),
    complaint: z.boolean().describe('True if the customer complained about the call or the business')
});

async function summarise({ business, turns, client }) {
    const transcript = turns
        .filter((t) => t.role === 'customer' || t.role === 'agent')
        .map((t) => `${t.role === 'agent' ? 'Agent' : 'Customer'}: ${t.content}`)
        .join('\n');
    const { betaZodOutputFormat } = await import('@anthropic-ai/sdk/helpers/beta/zod');
    const response = await client.beta.messages.parse({
        model: AGENT_MODEL,
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low', format: betaZodOutputFormat(SummarySchema) },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: `You review phone calls made by an AI sales agent for "${business.name}". Write in ${business.language}.`,
        messages: [{ role: 'user', content: `<transcript>\n${transcript}\n</transcript>` }]
    });
    if (!response.parsed_output) throw new Error(`summary failed: ${response.stop_reason}`);
    const usage = {
        input: response.usage?.input_tokens ?? 0,
        output: response.usage?.output_tokens ?? 0,
        cacheRead: response.usage?.cache_read_input_tokens ?? 0,
        cacheWrite: response.usage?.cache_creation_input_tokens ?? 0
    };
    return { ...response.parsed_output, usage };
}

function fallbackSummary(business, turns, outcome) {
    const customer = turns.filter((t) => t.role === 'customer').length;
    const he = String(business.language).startsWith('he');
    let summary;
    if (!customer) summary = he ? 'הלקוח לא דיבר בשיחה.' : 'The customer did not speak.';
    else if (he) summary = `אין סיכום אוטומטי (מודל ה-AI לא זמין). ${customer} פניות של הלקוח — ראו תמלול.`;
    else summary = `No automatic summary (AI model unavailable). ${customer} customer turns; see the transcript.`;
    return {
        summary,
        outcome: outcome ?? (customer ? 'info_only' : 'no_answer'),
        sentiment: '',
        quality_score: null,
        quality_notes: '',
        complaint: false
    };
}

// Ends a call once: computes duration, cost, summary and quality, then
// applies the business's transcript policy.
export async function finishCall(businessId, callId, { status = 'completed', client, now = new Date() } = {}) {
    const loaded = await withTenant(businessId, async (db) => {
        const { rows } = await db.query(
            `UPDATE calls SET status = $3, ended_at = $4,
                duration_seconds = greatest(0, extract(epoch FROM ($4 - started_at))::int)
             WHERE business_id = $1 AND id = $2 AND status IN ('active', 'queued') RETURNING *`,
            [businessId, callId, status, now]
        );
        if (!rows[0]) return null;
        const business = await getBusiness(db, businessId);
        const turns = (
            await db.query('SELECT role, content FROM call_turns WHERE call_id = $1 AND business_id = $2 ORDER BY id', [
                callId,
                businessId
            ])
        ).rows;
        return { call: rows[0], business, turns };
    });
    if (!loaded) return null; // already finished
    const { call, business, turns } = loaded;

    const spoke = turns.some((t) => t.role === 'customer');
    let review;
    if (spoke && (client || isAgentConfigured())) {
        try {
            review = await summarise({ business, turns, client: client ?? new Anthropic() });
        } catch (error) {
            console.error('sales call summary failed:', error);
        }
    }
    review ??= fallbackSummary(business, turns, call.outcome);

    // Outcomes recorded by tools during the call win over the reviewer's guess.
    const toolOutcome = call.outcome;
    let outcome = pickOutcome([review.outcome, toolOutcome].filter(Boolean));
    if (status === 'failed') outcome = 'failed';
    if (status === 'no_answer') outcome = 'no_answer';
    if (status === 'transferred' && OUTCOME_ORDER.indexOf(outcome) < OUTCOME_ORDER.indexOf('transferred')) {
        outcome = 'transferred';
    }

    const minutes = call.channel === 'phone' ? Math.ceil((call.duration_seconds ?? 0) / 60) : 0;
    const extraAi = review.usage ? estimateAiCost(review.usage) : 0;

    return withTenant(businessId, async (db) => {
        const { rows } = await db.query(
            `UPDATE calls SET outcome = $3, summary = $4, sentiment = $5, quality_score = $6, quality_notes = $7,
                complaint = $8, telephony_cost_usd = $9, ai_cost_usd = ai_cost_usd + $10,
                input_tokens = input_tokens + $11, output_tokens = output_tokens + $12
             WHERE business_id = $1 AND id = $2 RETURNING *`,
            [
                businessId,
                callId,
                outcome,
                review.summary,
                review.sentiment,
                review.quality_score === null ? null : Math.max(1, Math.min(5, review.quality_score)),
                review.quality_notes,
                review.complaint,
                minutes * business.telephony_cost_per_minute,
                extraAi,
                review.usage ? review.usage.input + review.usage.cacheRead + review.usage.cacheWrite : 0,
                review.usage?.output ?? 0
            ]
        );
        if (call.lead_id) {
            await db.query(
                `UPDATE leads SET last_called_at = $3,
                    status = CASE WHEN status = 'new' THEN 'contacted'
                                  WHEN $4 = 'not_interested' AND status IN ('contacted', 'interested') THEN 'not_interested'
                                  ELSE status END,
                    updated_at = now()
                 WHERE business_id = $1 AND id = $2`,
                [businessId, call.lead_id, now, outcome]
            );
        }
        if (review.complaint || (review.quality_score !== null && review.quality_score <= 2)) {
            await db.query(
                "INSERT INTO tasks (business_id, lead_id, call_id, kind, description) VALUES ($1, $2, $3, 'review_call', $4)",
                [businessId, call.lead_id, callId, review.quality_notes || 'Low-quality call or complaint: review the transcript']
            );
        }
        // A test call's booking must not block the slot for real customers.
        if (call.channel === 'web_test') {
            await db.query(
                "UPDATE appointments SET status = 'cancelled', notes = notes || ' [test call]' WHERE business_id = $1 AND call_id = $2",
                [businessId, callId]
            );
        }
        if (!business.store_transcripts) {
            await db.query("DELETE FROM call_turns WHERE call_id = $1 AND business_id = $2", [callId, businessId]);
            await db.query(
                "UPDATE calls SET model_messages = '[]'::jsonb, transcript_purged = true WHERE business_id = $1 AND id = $2",
                [businessId, callId]
            );
        }
        await audit(db, businessId, { actor: 'system', action: 'call.finished', detail: { call_id: callId, outcome } });
        return rows[0];
    });
}

export { customerPhone };
