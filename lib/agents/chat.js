// Streams one agent's reply from Claude. The route forwards these events to the
// browser as they arrive, so the answer appears while it is being written
// instead of after the whole reply is done.

import Anthropic from '@anthropic-ai/sdk';
import { agentEffort, agentSystemPrompt, agentTools } from './prompts.js';

const MODEL = 'claude-opus-5';

// A per-reply ceiling on output, which is also a cost cap for a chat anyone
// with an account can use.
const MAX_TOKENS = 16_000;

// A reply that uses web tools can pause partway ("pause_turn") when the
// server-side tool loop hits its step limit; it is resumed by sending the
// partial reply back. The output cap and each tool's max_uses apply per API
// request, so a resume only gets what the reply has not used yet, and happens
// at most once: each resume also re-sends every page read so far as input.
const MAX_RESUMES = 1;
const MIN_RESUME_TOKENS = 2_000;

export function isAgentChatConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Yields, in order:
//   { type: 'text', text }        a piece of the answer
//   { type: 'searching' }         the agent started a web search
//   { type: 'reading' }           the agent is opening a web page
//   { type: 'source', url, title } a web page the answer cites or was read
// then one closing event: 'done', 'truncated' (hit a length or step cap) or
// 'refused'. On a refusal any partial text already sent must be discarded.
export async function* streamAgentReply({ agentId, messages, signal }) {
    const client = new Anthropic();
    let tools = agentTools(agentId);
    let maxTokens = MAX_TOKENS;
    let replySoFar = [];
    let container;

    for (let resumes = 0; ; resumes += 1) {
        const conversation = replySoFar.length ? [...messages, { role: 'assistant', content: replySoFar }] : messages;
        const stream = client.beta.messages.stream(
            {
                model: MODEL,
                max_tokens: maxTokens,
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
                else if (block.type === 'server_tool_use' && block.name === 'web_fetch') yield { type: 'reading' };
                else if (block.type === 'web_fetch_tool_result' && block.content?.type === 'web_fetch_result') {
                    yield { type: 'source', url: block.content.url, title: block.content.content?.title ?? null };
                }
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
            maxTokens -= final.usage?.output_tokens ?? 0;
            tools = remainingTools(agentTools(agentId), replySoFar);
            // Resume only while the reply has budget left for both output and
            // every tool (a tool it has already used must stay declared).
            if (maxTokens >= MIN_RESUME_TOKENS && tools) continue;
        }

        if (final.stop_reason === 'refusal') yield { type: 'refused' };
        else if (final.stop_reason === 'max_tokens' || final.stop_reason === 'pause_turn') yield { type: 'truncated' };
        else yield { type: 'done' };
        return;
    }
}

// Each tool's max_uses reduced by the calls the reply has already made, or null
// when any tool has none left.
function remainingTools(tools, content) {
    const used = {};
    for (const block of content) {
        if (block.type === 'server_tool_use') used[block.name] = (used[block.name] ?? 0) + 1;
    }
    const remaining = tools.map((tool) => ({ ...tool, max_uses: tool.max_uses - (used[tool.name] ?? 0) }));
    return remaining.every((tool) => tool.max_uses > 0) ? remaining : null;
}

// The blocks of a paused reply that can be sent back to resume it. If a safety
// fallback happened mid-reply, what the declined model produced before the last
// fallback marker is echoed only as text and complete web tool call/result
// pairs; its thinking and any unpaired tool calls are dropped, as the API
// requires.
const WEB_RESULTS = ['web_search_tool_result', 'web_fetch_tool_result'];

function resumable(content) {
    const boundary = content.findLastIndex((block) => block.type === 'fallback');
    if (boundary < 0) return content;
    const answered = new Set(content.filter((block) => WEB_RESULTS.includes(block.type)).map((block) => block.tool_use_id));
    return content.filter(
        (block, index) =>
            index > boundary ||
            block.type === 'text' ||
            WEB_RESULTS.includes(block.type) ||
            (block.type === 'server_tool_use' && answered.has(block.id))
    );
}
