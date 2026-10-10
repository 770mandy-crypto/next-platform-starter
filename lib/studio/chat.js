// Streams the studio director's reply and runs the tools it calls. This is a
// manual tool loop: Claude answers, and when it asks for tools they run here
// (each one only starts a job, so a round takes seconds), their results go
// back, and Claude continues, until it finishes or a round cap is reached.

import Anthropic from '@anthropic-ai/sdk';
import { studioSystemPrompt } from './prompt.js';
import { runTool, studioTools } from './tools.js';

const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 32_000;
// Tool rounds per user message. A full production plan rarely needs more than
// a few (say: images, then videos from them, then a summary).
export const MAX_ROUNDS = 6;

export function isStudioChatConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Yields, in order:
//   { type: 'text', text }            a piece of the answer
//   { type: 'tool', name }            Claude started calling a tool
//   { type: 'tool_result', name, ok, error? }
//   { type: 'job', job }              a job a tool started or reported on
// then one closing event: 'done', 'truncated' or 'refused'.
export async function* streamStudioReply({ messages, context, signal, client = new Anthropic() }) {
    const tools = studioTools();
    const conversation = [...messages];

    for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const stream = client.beta.messages.stream(
            {
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: studioSystemPrompt(),
                thinking: { type: 'adaptive' },
                output_config: { effort: 'medium' },
                // If a safety classifier declines, the server retries on its
                // default fallback model within the same stream.
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default',
                tools,
                messages: conversation
            },
            { signal }
        );

        for await (const event of stream) {
            if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
                yield { type: 'tool', name: event.content_block.name };
            } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield { type: 'text', text: event.delta.text };
            }
        }
        const final = await stream.finalMessage();

        // A refused or cut-off turn never runs its tools: a refusal or the
        // output cap can stop a tool call partway through its input.
        if (final.stop_reason !== 'tool_use') {
            if (final.stop_reason === 'refusal') yield { type: 'refused' };
            else if (final.stop_reason === 'max_tokens') yield { type: 'truncated' };
            else yield { type: 'done' };
            return;
        }

        const content = replayable(final.content);
        const calls = content.filter((block) => block.type === 'tool_use');
        const results = [];
        for (const call of calls) {
            const outcome = await runTool(call.name, call.input, context);
            yield {
                type: 'tool_result',
                name: call.name,
                ok: !outcome.isError,
                ...(outcome.isError ? { error: outcome.result.error } : {})
            };
            for (const job of outcome.jobs) yield { type: 'job', job };
            results.push({
                type: 'tool_result',
                tool_use_id: call.id,
                content: JSON.stringify(outcome.result),
                ...(outcome.isError ? { is_error: true } : {})
            });
        }
        // All results go back together in one user turn.
        conversation.push({ role: 'assistant', content }, { role: 'user', content: results });
    }
    yield { type: 'truncated' };
}

// The blocks of a turn that are sent back with its tool results. If a safety
// fallback happened mid-turn, what the declined model produced before the
// last fallback marker is kept only as text: its thinking and tool calls are
// dropped (they were never run), as the API requires.
export function replayable(content) {
    const boundary = content.findLastIndex((block) => block.type === 'fallback');
    if (boundary < 0) return content;
    return content.filter((block, index) => index > boundary || block.type === 'text');
}
