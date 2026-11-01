import assert from 'node:assert/strict';
import test from 'node:test';
import { streamNadlanReply } from './nadlan/agent.js';

// A fake client that replays scripted turns and records each request.
function fakeClient(turns) {
    const requests = [];
    return {
        requests,
        beta: {
            messages: {
                stream(params) {
                    requests.push(structuredClone(params));
                    const turn = turns.shift();
                    return {
                        async *[Symbol.asyncIterator]() {
                            for (const e of turn.events ?? []) yield e;
                        },
                        finalMessage: async () => turn.final
                    };
                }
            }
        }
    };
}

async function collect(gen) {
    const out = [];
    for await (const e of gen) out.push(e);
    return out;
}

test('runs a tool, sends results back and streams the answer', async () => {
    const client = fakeClient([
        {
            events: [{ type: 'content_block_start', content_block: { type: 'tool_use' } }],
            final: { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'search_areas', input: { city: 'חיפה', limit: 2 } }] }
        },
        {
            events: [{ type: 'content_block_delta', delta: { type: 'text_delta', text: 'הדר' } }],
            final: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'הדר' }] }
        }
    ]);
    const events = await collect(streamNadlanReply({ messages: [{ role: 'user', content: 'חיפה?' }], client }));

    assert.deepEqual(events.map((e) => e.type), ['tool', 'areas', 'text', 'done']);
    assert.ok(events[1].ids.length === 2);
    const second = client.requests[1].messages;
    const result = second.at(-1).content[0];
    assert.equal(result.type, 'tool_result');
    assert.equal(result.tool_use_id, 't1');
    const payload = JSON.parse(result.content);
    assert.equal(payload.count, 2);
    assert.ok(payload.areas.every((a) => a.cityName === 'חיפה' && !('lat' in a)));
    assert.equal(client.requests[0].model, 'claude-opus-5-5');
});

test('invalid tool input comes back as an error result', async () => {
    const client = fakeClient([
        { final: { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'get_area', input: { id: 'nope' } }, { type: 'tool_use', id: 't2', name: 'search_areas', input: { goal: 'party' } }] } },
        { final: { stop_reason: 'end_turn', content: [] } }
    ]);
    await collect(streamNadlanReply({ messages: [{ role: 'user', content: 'x' }], client }));
    const results = client.requests[1].messages.at(-1).content;
    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.is_error));
});

test('refusal and truncation close the stream', async () => {
    let events = await collect(streamNadlanReply({ messages: [], client: fakeClient([{ final: { stop_reason: 'refusal', content: [] } }]) }));
    assert.deepEqual(events.map((e) => e.type), ['refused']);
    events = await collect(streamNadlanReply({ messages: [], client: fakeClient([{ final: { stop_reason: 'max_tokens', content: [] } }]) }));
    assert.deepEqual(events.map((e) => e.type), ['truncated']);
});
