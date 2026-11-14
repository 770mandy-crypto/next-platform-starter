// Research on the web, then answer through one tool call: the shared loop
// behind the letter writer and the appointment planner. Claude searches and
// reads pages with Anthropic's server-side web tools, then calls `tool` with
// the finished result in a fixed shape, which is checked with `schema`.
//
// Yields, in order:
//   { type: 'searching' }               a web search started
//   { type: 'reading' }                 a web page is being read
//   { type: 'source', url, title }      a page that was read
//   { type: 'writing' }                 research is done; the result is being written
// then one closing event: { type: 'result', value, consulted }, 'refused' or 'failed'.

import Anthropic from '@anthropic-ai/sdk';

const MAX_ROUNDS = 4;

export const webTools = ({ searches = 6, fetches = 6 } = {}) => [
    { type: 'web_search_20260209', name: 'web_search', max_uses: searches, user_location: { type: 'approximate', country: 'IL', timezone: 'Asia/Jerusalem' } },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: fetches }
];

export function hebrewDate(now) {
    return new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(now));
}

// Keeps only http(s) links and drops duplicates.
export function cleanSources(sources) {
    const seen = new Set();
    return sources.filter((s) => {
        try {
            const url = new URL(s.url);
            if (!['http:', 'https:'].includes(url.protocol) || seen.has(url.href)) return false;
            seen.add(url.href);
            return true;
        } catch {
            return false;
        }
    });
}

export async function* researchThenAnswer({ model, system, content, tool, schema, effort = 'high', maxTokens = 16_000, tools = webTools(), signal, client = new Anthropic() }) {
    const messages = [{ role: 'user', content }];
    const consulted = [];
    let nudged = false;
    // Web search filters results by running code; a resumed turn returns to
    // the same sandbox.
    let container;

    for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const stream = client.beta.messages.stream(
            {
                model,
                max_tokens: maxTokens,
                system,
                thinking: { type: 'adaptive' },
                output_config: { effort },
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default',
                tools: [...tools, tool],
                ...(container ? { container } : {}),
                messages
            },
            { signal }
        );
        let announced = false;
        for await (const event of stream) {
            if (event.type !== 'content_block_start') continue;
            const block = event.content_block;
            if (block.type === 'server_tool_use' && block.name === 'web_search') yield { type: 'searching' };
            else if (block.type === 'server_tool_use' && block.name === 'web_fetch') yield { type: 'reading' };
            else if (block.type === 'web_fetch_tool_result' && block.content?.type === 'web_fetch_result') {
                const source = { url: block.content.url, title: block.content.content?.title ?? block.content.url };
                consulted.push(source);
                yield { type: 'source', ...source };
            } else if (block.type === 'tool_use' && block.name === tool.name && !announced) {
                announced = true;
                yield { type: 'writing' };
            }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
            yield { type: 'refused' };
            return;
        }

        const call = final.content.find((block) => block.type === 'tool_use' && block.name === tool.name);
        if (call) {
            const parsed = schema.safeParse(call.input);
            if (!parsed.success) {
                console.error(`${tool.name}: unexpected shape:`, parsed.error.message);
                yield { type: 'failed' };
                return;
            }
            yield { type: 'result', value: parsed.data, consulted };
            return;
        }

        // The turn paused mid-research, or ended without calling the tool:
        // carry on from where it stopped, nudging once if it simply forgot.
        messages.push({ role: 'assistant', content: final.content });
        container = final.container?.id ?? container;
        if (final.stop_reason === 'pause_turn') continue;
        if (nudged || final.stop_reason === 'max_tokens') break;
        nudged = true;
        messages.push({ role: 'user', content: `Now give your answer by calling ${tool.name}.` });
    }
    yield { type: 'failed' };
}
