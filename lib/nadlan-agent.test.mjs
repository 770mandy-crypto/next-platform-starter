import assert from 'node:assert/strict';
import test from 'node:test';
import { streamNadlanReply } from './nadlan/agent.js';
import { sampleDataset } from './nadlan/dataset.js';
import { createListing, resetListingsCache } from './nadlan/listings.js';

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

function memoryDb() {
    const map = new Map();
    return {
        get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : null),
        set: async (k, v) => void map.set(k, structuredClone(v)),
        delete: async (k) => void map.delete(k),
        list: async (p) => [...map.keys()].filter((k) => k.startsWith(p)).sort()
    };
}

const data = sampleDataset();
const run = (client, db = memoryDb()) => collect(streamNadlanReply({ messages: [{ role: 'user', content: 'x' }], client, data, db: async () => db }));

async function collect(gen) {
    const out = [];
    for await (const e of gen) out.push(e);
    return out;
}

test('runs a tool, sends results back and streams the answer', async () => {
    const client = fakeClient([
        {
            events: [{ type: 'content_block_start', content_block: { type: 'tool_use', name: 'search_areas' } }],
            final: { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'search_areas', input: { city: 'חיפה', limit: 2 } }] }
        },
        {
            events: [{ type: 'content_block_delta', delta: { type: 'text_delta', text: 'הדר' } }],
            final: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'הדר' }] }
        }
    ]);
    const events = await run(client);

    assert.deepEqual(events.map((e) => e.type), ['tool', 'areas', 'text', 'done']);
    assert.equal(events[1].ids.length, 2);
    const result = client.requests[1].messages.at(-1).content[0];
    assert.equal(result.tool_use_id, 't1');
    const payload = JSON.parse(result.content);
    assert.equal(payload.count, 2);
    assert.ok(payload.areas.every((a) => a.cityName === 'חיפה' && !('lat' in a)));
    assert.equal(client.requests[0].model, 'claude-opus-5-5');
    assert.match(client.requests[0].system[1].text, /SAMPLE/);
});

test('search_listings returns listings without phone numbers', async () => {
    resetListingsCache();
    const db = memoryDb();
    const area = data.areas.find((a) => a.id === 'hfa-hadar');
    await createListing(db, { ownerName: 'דנה', phone: '0521234567', rooms: 3, sqm: 70, price: 1_100_000, street: 'הרצל', description: '' }, area);
    const client = fakeClient([
        { final: { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'search_listings', input: { area_id: 'hfa-hadar' } }] } },
        { final: { stop_reason: 'end_turn', content: [] } }
    ]);
    const events = await run(client, db);
    assert.ok(events.some((e) => e.type === 'listings' && e.ids.length === 1));
    const text = client.requests[1].messages.at(-1).content[0].content;
    assert.ok(!text.includes('0521234567') && !text.includes('editToken'));
    assert.equal(JSON.parse(text).count, 1);
});

test('invalid tool input comes back as an error result', async () => {
    const client = fakeClient([
        { final: { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'get_area', input: { id: 'nope' } }, { type: 'tool_use', id: 't2', name: 'search_areas', input: { goal: 'party' } }] } },
        { final: { stop_reason: 'end_turn', content: [] } }
    ]);
    await run(client);
    const results = client.requests[1].messages.at(-1).content;
    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.is_error));
});

test('a paused web search resumes without a user turn', async () => {
    const paused = [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'q' } }];
    const client = fakeClient([{ final: { stop_reason: 'pause_turn', content: paused } }, { final: { stop_reason: 'end_turn', content: [] } }]);
    const events = await run(client);
    assert.deepEqual(events.map((e) => e.type), ['done']);
    assert.deepEqual(client.requests[1].messages.at(-1), { role: 'assistant', content: paused });
});

test('refusal and truncation close the stream', async () => {
    assert.deepEqual((await run(fakeClient([{ final: { stop_reason: 'refusal', content: [] } }]))).map((e) => e.type), ['refused']);
    assert.deepEqual((await run(fakeClient([{ final: { stop_reason: 'max_tokens', content: [] } }]))).map((e) => e.type), ['truncated']);
});
