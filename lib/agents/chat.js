// Streams one agent's reply from Claude. The route forwards these events to the
// browser as they arrive, so the answer appears while it is being written and
// a long reply never runs into the function's response timeout.

import Anthropic from '@anthropic-ai/sdk';
import { agentEffort, agentSystemPrompt } from './prompts.js';

const MODEL = 'claude-opus-5';

// A per-reply ceiling on output, which is also a cost cap for a chat anyone
// with an account can use.
const MAX_TOKENS = 16_000;

export function isAgentChatConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Yields { type: 'text', text } for each piece of the answer, then one closing
// event: 'done', 'truncated' (hit the length cap) or 'refused'. On a refusal
// any partial text already sent must be discarded by the caller.
export async function* streamAgentReply({ agentId, messages, signal }) {
    const client = new Anthropic();
    const stream = client.beta.messages.stream(
        {
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: agentSystemPrompt(agentId),
            thinking: { type: 'adaptive' },
            output_config: { effort: agentEffort(agentId) },
            // If a safety classifier declines, the server retries on its
            // default fallback model within the same stream: already-sent text
            // is kept and the fallback continues from it.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            messages
        },
        { signal }
    );

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield { type: 'text', text: event.delta.text };
        }
    }

    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') yield { type: 'refused' };
    else if (final.stop_reason === 'max_tokens') yield { type: 'truncated' };
    else yield { type: 'done' };
}
