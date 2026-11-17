// Offline checks for agent-to-agent messages. The Claude client is a fake that
// records each call and answers in the name of the agent it was asked for.
import assert from 'node:assert/strict';
import test from 'node:test';

import { AGENT_IDS, getAgent } from './agents/catalog.js';
import { MODEL } from './agents/chat.js';
import { askAgent, askEveryAgent, delegate, MAX_HOPS, MAX_MESSAGE_CHARS } from './agents/relay.js';

function fakeClient({ fail = [] } = {}) {
    const calls = [];
    return {
        calls,
        messages: {
            create: async (params) => {
                calls.push(params);
                const id = params.system.match(/^You are ([\w-]+)\./)[1];
                if (fail.includes(id)) throw new Error(`${id} is down`);
                return { content: [{ type: 'text', text: `ans:${id}` }] };
            }
        }
    };
}

const repliedBy = (call) => call.system.match(/^You are ([\w-]+)\./)[1];

test('askAgent answers with the target role prompt and the chat model', async () => {
    const client = fakeClient();
    const text = await askAgent({ agentId: 'bug-hunter', messages: [{ role: 'user', content: 'hi' }], client });
    assert.equal(text, 'ans:bug-hunter');
    assert.equal(client.calls.length, 1);
    assert.equal(client.calls[0].model, MODEL);
    assert.equal(repliedBy(client.calls[0]), 'bug-hunter');
    assert.deepEqual(client.calls[0].messages, [{ role: 'user', content: 'hi' }]);
});

test('askAgent refuses an unknown agent without calling Claude', async () => {
    const client = fakeClient();
    await assert.rejects(askAgent({ agentId: 'nope', messages: [], client }), { message: 'הסוכן לא נמצא.' });
    assert.equal(client.calls.length, 0);
});

test('delegate passes the task to the target, labelled with the sender', async () => {
    const client = fakeClient();
    const result = await delegate({ fromAgentId: 'researcher', toAgentId: 'security-auditor', task: 'בדוק את ה-headers', client });
    assert.equal(result.agentId, 'security-auditor');
    assert.equal(result.text, 'ans:security-auditor');
    assert.deepEqual(result.chain, ['researcher', 'security-auditor']);
    const [message] = client.calls[0].messages;
    assert.match(message.content, /הועבר אליך מהסוכן מחקר/);
    assert.match(message.content, /בדוק את ה-headers$/);
});

test('an agent cannot delegate to itself', async () => {
    const client = fakeClient();
    await assert.rejects(delegate({ fromAgentId: 'documenter', toAgentId: 'documenter', task: 'x', client }), {
        message: 'סוכן לא יכול להעביר משימה לעצמו.'
    });
    assert.equal(client.calls.length, 0);
});

test('a delegation chain cannot loop back to an agent already in it', async () => {
    const client = fakeClient();
    const chain = ['researcher', 'bug-hunter'];
    await assert.rejects(delegate({ fromAgentId: 'bug-hunter', toAgentId: 'researcher', task: 'x', chain, client }), {
        status: 409
    });
    assert.equal(client.calls.length, 0);
});

test('a delegation chain is cut off after MAX_HOPS agents', async () => {
    const client = fakeClient();
    const chain = AGENT_IDS.slice(0, MAX_HOPS);
    await assert.rejects(delegate({ fromAgentId: chain.at(-1), toAgentId: AGENT_IDS[MAX_HOPS], task: 'x', chain, client }), {
        status: 409
    });
    assert.equal(client.calls.length, 0);
});

test('delegate rejects empty and oversized tasks', async () => {
    const client = fakeClient();
    await assert.rejects(delegate({ fromAgentId: 'researcher', toAgentId: 'bug-hunter', task: '   ', client }), { message: 'ההודעה ריקה.' });
    await assert.rejects(
        delegate({ fromAgentId: 'researcher', toAgentId: 'bug-hunter', task: 'א'.repeat(MAX_MESSAGE_CHARS + 1), client }),
        { message: 'ההודעה ארוכה מדי.' }
    );
    assert.equal(client.calls.length, 0);
});

test('a broadcast reaches every agent once and returns one result each', async () => {
    const client = fakeClient();
    const results = await askEveryAgent({ message: 'מה דעתך?', client });
    assert.equal(results.length, AGENT_IDS.length);
    assert.deepEqual(results.map((r) => r.agentId), AGENT_IDS);
    assert.equal(client.calls.length, AGENT_IDS.length);
    assert.ok(results.every((r) => r.ok && r.text === `ans:${r.agentId}`));
    assert.equal(results[0].label, getAgent(AGENT_IDS[0]).label);
});

test('one agent failing does not stop the broadcast', async () => {
    const client = fakeClient({ fail: ['researcher'] });
    const results = await askEveryAgent({ message: 'שלום', client });
    const failed = results.filter((r) => !r.ok);
    assert.equal(failed.length, 1);
    assert.equal(failed[0].agentId, 'researcher');
    assert.match(failed[0].error, /researcher is down/);
    assert.equal(results.filter((r) => r.ok).length, AGENT_IDS.length - 1);
});
