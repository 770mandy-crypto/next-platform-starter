// A stand-in for the Claude Messages API that streams scripted replies as
// server-sent events, the way the real API does. Each reply is written as a
// whole message ({ content, stop_reason, container? }), so a test reads as
// "Claude answered this". Points the SDK at itself through ANTHROPIC_BASE_URL.
import { createServer } from 'node:http';

// One message → the stream of events the Messages API sends for it.
export function toEvents(message) {
    const events = [['message_start', { type: 'message_start', message: { ...message, content: [], stop_reason: null } }]];
    message.content.forEach((block, index) => {
        if (block.type === 'text') {
            events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }]);
            events.push(['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } }]);
        } else if (block.type === 'tool_use') {
            events.push(['content_block_start', { type: 'content_block_start', index, content_block: { ...block, input: {} } }]);
            events.push(['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } }]);
        } else {
            events.push(['content_block_start', { type: 'content_block_start', index, content_block: block }]);
        }
        events.push(['content_block_stop', { type: 'content_block_stop', index }]);
    });
    events.push([
        'message_delta',
        { type: 'message_delta', delta: { stop_reason: message.stop_reason, stop_sequence: null, ...(message.container ? { container: message.container } : {}) }, usage: { output_tokens: 5 } }
    ]);
    events.push(['message_stop', { type: 'message_stop' }]);
    return events;
}

export async function startClaudeStream() {
    const state = { requests: [], replies: [] };
    const server = createServer(async (req, res) => {
        let body = '';
        for await (const chunk of req) body += chunk;
        state.requests.push(JSON.parse(body));
        const next = state.replies.shift();
        if (!next) {
            res.writeHead(500, { 'content-type': 'application/json' });
            return res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'no scripted reply' } }));
        }
        const message = { id: 'msg', type: 'message', role: 'assistant', model: 'm', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 }, ...next };
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        for (const [name, data] of toEvents(message)) res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
        res.end();
    });
    await new Promise((resolve) => server.listen(0, resolve));
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    state.reset = () => {
        state.requests.length = 0;
        state.replies.length = 0;
    };
    state.close = () => server.close();
    return state;
}

// Building blocks for scripted replies.
export const search = (id, query = 'q') => [
    { type: 'server_tool_use', id, name: 'web_search', input: { query } },
    { type: 'web_search_tool_result', tool_use_id: id, content: [] }
];
export const fetched = (id, url, title) => [
    { type: 'server_tool_use', id, name: 'web_fetch', input: { url } },
    { type: 'web_fetch_tool_result', tool_use_id: id, content: { type: 'web_fetch_result', url, content: { type: 'document', title, source: { type: 'text', media_type: 'text/plain', data: '…' } } } }
];
