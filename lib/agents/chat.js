// Streams one agent's reply from Claude. The route forwards these events to the
// browser as they arrive, so the answer appears while it is being written
// instead of after the whole reply is done.

import Anthropic from '@anthropic-ai/sdk';
import { agentEffort, agentSystemPrompt, agentTools } from './prompts.js';

const MODEL = 'claude-opus-5';

// A per-reply ceiling on output, which is also a cost cap for a chat anyone
// with an account can use.
const MAX_TOKENS = 16_000;

// A reply that searches the web can pause partway ("pause_turn") when the
// server-side tool loop hits its step limit; it is resumed by sending the
// partial reply back. Bounded, so one message cannot run up searches forever.
const MAX_RESUMES = 2;

export function isAgentChatConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Yields, in order:
//   { type: 'text', text }        a piece of the answer
//   { type: 'searching' }         the agent started a web search
//   { type: 'source', url, title } a web page the answer cites
// then one closing event: 'done', 'truncated' (hit a length or step cap) or
// 'refused'. On a refusal any partial text already sent must be discarded.
export async function* streamAgentReply({ agentId, messages, signal }) {
    const client = new Anthropic();
    const tools = agentTools(agentId);
    let replySoFar = [];
    let container;

    for (let resumes = 0; ; resumes += 1) {
        const conversation = replySoFar.length ? [...messages, { role: 'assistant', content: replySoFar }] : messages;
        const stream = client.beta.messages.stream(
            {
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: agentSystemPrompt(agentId),
                thinking: { type: 'adaptive' },
                output_config: { effort: agentEffort(agentId) },
                // If a safety classifier declines, the server retries on its
                // default fallback model within the same stream: already-sent
                // text is kept and the fallback continues from it.
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default',
                ...(tools.length ? { tools } : {}),
                // Web search filters its results by running code; a resumed
                // turn goes back to the same sandbox.
                ...(container ? { container } : {}),
                messages: conversation
            },
            { signal }
        );

        for await (const event of stream) {
            if (event.type === 'content_block_start') {
                const block = event.content_block;
                if (block.type === 'server_tool_use' && block.name === 'web_search') yield { type: 'searching' };
            } else if (event.type === 'content_block_delta') {
                const { delta } = event;
                if (delta.type === 'text_delta') {
                    yield { type: 'text', text: delta.text };
                } else if (delta.type === 'citations_delta' && delta.citation.type === 'web_search_result_location') {
                    yield { type: 'source', url: delta.citation.url, title: delta.citation.title ?? null };
                }
            }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === 'pause_turn' && resumes < MAX_RESUMES) {
            replySoFar = [...replySoFar, ...resumable(final.content)];
            container = final.container?.id ?? container;
            continue;
        }

        if (final.stop_reason === 'refusal') yield { type: 'refused' };
        else if (final.stop_reason === 'max_tokens' || final.stop_reason === 'pause_turn') yield { type: 'truncated' };
        else yield { type: 'done' };
        return;
    }
}

// The blocks of a paused reply that can be sent back to resume it. If a safety
// fallback happened mid-reply, what the declined model produced before the last
// fallback marker is echoed only as text and complete search call/result pairs;
// its thinking and any unpaired tool calls are dropped, as the API requires.
function resumable(content) {
    const boundary = content.findLastIndex((block) => block.type === 'fallback');
    if (boundary < 0) return content;
    const answered = new Set(content.filter((block) => block.type === 'web_search_tool_result').map((block) => block.tool_use_id));
    return content.filter(
        (block, index) =>
            index > boundary ||
            block.type === 'text' ||
            block.type === 'web_search_tool_result' ||
            (block.type === 'server_tool_use' && answered.has(block.id))
    );
}
