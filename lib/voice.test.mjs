import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, currentTime, TOOL_EXECUTORS, VOICE_TOOLS } from './voice/tools.js';
import { MAX_TOOL_ROUNDS, runVoiceAgent } from './voice/agent.js';

// A stand-in for the Anthropic client: each call pops the next scripted reply
// and records the request, so a test can check what the agent sent.
function fakeClient(replies) {
    const requests = [];
    return {
        requests,
        messages: {
            create: async (params) => {
                requests.push(structuredClone(params));
                if (!replies.length) throw new Error('no scripted reply left');
                return replies.shift();
            }
        }
    };
}

const text = (value) => ({ type: 'text', text: value });
const toolUse = (id, name, input) => ({ type: 'tool_use', id, name, input });
const turn = (content, stop_reason) => ({ content, stop_reason });

test('calculate follows operator precedence and parentheses', () => {
    assert.equal(calculate('2+3*4').result, 14);
    assert.equal(calculate('(12+3)*4').result, 60);
    assert.equal(calculate('10/4').result, 2.5);
    assert.equal(calculate('1.5*2').result, 3);
    assert.equal(calculate('.5+.5').result, 1);
    assert.equal(calculate('  7 - 2 - 1 ').result, 4);
});

test('calculate handles power and unary minus the usual way', () => {
    assert.equal(calculate('2^3^2').result, 512);
    assert.equal(calculate('-2^2').result, -4);
    assert.equal(calculate('(-2)^2').result, 4);
    assert.equal(calculate('3*-2').result, -6);
});

test('calculate rejects bad input instead of guessing', () => {
    for (const bad of ['', '1/0', '2+', '(1+2', '2 3', 'abc', '1e5', 'alert(1)', 'process.exit()', 42]) {
        assert.throws(() => calculate(bad), Error, `expected ${JSON.stringify(bad)} to fail`);
    }
    assert.throws(() => calculate('1+'.repeat(300) + '1'), /ארוך מדי/);
});

test('current_time reports the date and time in Israel', () => {
    const { text: reply } = currentTime(new Date('2026-01-15T12:00:00Z'));
    assert.match(reply, /2026/);
    assert.match(reply, /14:00/); // 12:00 UTC is 14:00 in Jerusalem in January
});

test('every declared tool has an executor and a schema', () => {
    for (const tool of VOICE_TOOLS) {
        assert.equal(typeof TOOL_EXECUTORS[tool.name], 'function', tool.name);
        assert.equal(tool.input_schema.type, 'object', tool.name);
    }
});

test('the agent answers directly when no tool is needed', async () => {
    const client = fakeClient([turn([text('שלום, איך אפשר לעזור?')], 'end_turn')]);
    const result = await runVoiceAgent({ messages: [{ role: 'user', content: 'שלום' }], client });
    assert.equal(result.text, 'שלום, איך אפשר לעזור?');
    assert.deepEqual(result.toolCalls, []);
    assert.equal(client.requests.length, 1);
    assert.equal(client.requests[0].messages[0].content, 'שלום');
});

test('the agent runs a requested tool and answers with its result', async () => {
    const client = fakeClient([
        turn([text('בודק.'), toolUse('t1', 'calculate', { expression: '(12+3)*4' })], 'tool_use'),
        turn([text('התוצאה היא 60.')], 'end_turn')
    ]);
    const result = await runVoiceAgent({ messages: [{ role: 'user', content: 'כמה זה 12+3 כפול 4?' }], client });

    assert.equal(result.text, 'התוצאה היא 60.');
    assert.deepEqual(result.toolCalls, [{ name: 'calculate', input: { expression: '(12+3)*4' } }]);

    const second = client.requests[1].messages;
    const toolResult = second.at(-1);
    assert.equal(toolResult.role, 'user');
    assert.deepEqual(toolResult.content[0], {
        type: 'tool_result',
        tool_use_id: 't1',
        content: JSON.stringify({ result: 60 })
    });
});

test('tools the model asks for in one turn run at the same time', async () => {
    const slow = async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return { ok: true };
    };
    const client = fakeClient([
        turn([toolUse('a', 'slow_a', {}), toolUse('b', 'slow_b', {})], 'tool_use'),
        turn([text('סיימתי')], 'end_turn')
    ]);
    const started = Date.now();
    const result = await runVoiceAgent({
        messages: [{ role: 'user', content: 'שתי משימות' }],
        client,
        executors: { slow_a: slow, slow_b: slow }
    });
    const elapsed = Date.now() - started;

    assert.equal(result.text, 'סיימתי');
    assert.equal(result.toolCalls.length, 2);
    // Two 150ms calls one after another would take 300ms or more.
    assert.ok(elapsed < 280, `took ${elapsed}ms, so the calls did not overlap`);
});

test('a failing tool is reported back to the model, not thrown to the user', async () => {
    const client = fakeClient([
        turn([toolUse('x', 'calculate', { expression: '1/0' })], 'tool_use'),
        turn([text('לא אפשר לחלק באפס.')], 'end_turn')
    ]);
    const result = await runVoiceAgent({ messages: [{ role: 'user', content: '1 חלקי 0' }], client });
    assert.equal(result.text, 'לא אפשר לחלק באפס.');
    const reported = client.requests[1].messages.at(-1).content[0];
    assert.equal(reported.is_error, true);
    assert.match(reported.content, /אפס/);
});

test('a tool name the agent made up is reported as unknown', async () => {
    const client = fakeClient([
        turn([toolUse('u', 'delete_everything', {})], 'tool_use'),
        turn([text('לא מצאתי כלי כזה.')], 'end_turn')
    ]);
    await runVoiceAgent({ messages: [{ role: 'user', content: 'x' }], client });
    const reported = client.requests[1].messages.at(-1).content[0];
    assert.equal(reported.is_error, true);
    assert.match(reported.content, /delete_everything/);
});

test('the agent gives up after too many tool rounds', async () => {
    const loop = Array.from({ length: MAX_TOOL_ROUNDS + 1 }, (_, i) =>
        turn([toolUse(`r${i}`, 'current_time', {})], 'tool_use')
    );
    const client = fakeClient(loop);
    await assert.rejects(
        runVoiceAgent({ messages: [{ role: 'user', content: 'שוב ושוב' }], client }),
        /יותר מדי קריאות/
    );
});

test('the request carries the system prompt and the declared tools', async () => {
    const client = fakeClient([turn([text('ok')], 'end_turn')]);
    await runVoiceAgent({ messages: [{ role: 'user', content: 'היי' }], client });
    const [request] = client.requests;
    assert.match(request.system, /קצר/);
    assert.deepEqual(request.tools.map((tool) => tool.name), ['current_time', 'calculate']);
    assert.ok(request.max_tokens > 0);
});
