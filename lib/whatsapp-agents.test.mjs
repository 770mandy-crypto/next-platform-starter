// Offline checks for talking with the site's agents over WhatsApp. The phone
// numbers used here start with 999, so replies go to the simulator's outbox
// and nothing leaves the machine; the assistant, the agents and the broadcast
// are all replaced with fakes.
import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MASLUL_STORE = 'memory';
const { handleMessage, parseAgentCommand, findAgent } = await import('./whatsapp/engine.js');
const store = await import('./whatsapp/store.js');
const { readOutbox } = await import('./whatsapp/outbound.js');

let counter = 0;
const message = (phone, text) => ({
    id: `wamid.${phone}.${(counter += 1)}`,
    from: phone,
    type: 'text',
    text,
    timestamp: Date.now(),
    name: 'טסט'
});

function fakes() {
    const brainCalls = [];
    const agentCalls = [];
    const broadcastCalls = [];
    return {
        brainCalls,
        agentCalls,
        broadcastCalls,
        brain: async ({ content }) => {
            brainCalls.push(content);
            return { reply: 'תשובה מהעוזר' };
        },
        agentReply: async (args) => {
            agentCalls.push(args);
            return `תשובה מ-${args.agentId}`;
        },
        everyAgent: async ({ message }) => {
            broadcastCalls.push(message);
            return [
                { agentId: 'bug-hunter', label: 'באגים', ok: true, text: 'אין באגים' },
                { agentId: 'researcher', label: 'מחקר', ok: false, error: 'נפל' }
            ];
        }
    };
}

const texts = async (phone) => (await readOutbox(phone)).map((item) => item.text);

test('parseAgentCommand reads the three commands and ignores ordinary text', () => {
    assert.equal(parseAgentCommand('חזרה לעוזר').type, 'leave');
    assert.deepEqual(parseAgentCommand('לכל הסוכנים: מה דעתכם?'), { type: 'all', message: 'מה דעתכם?' });
    assert.equal(parseAgentCommand('דבר עם באגים').agent.id, 'bug-hunter');
    assert.equal(parseAgentCommand('דבר עם אמא שלי'), null, 'unknown names stay with the assistant');
    assert.equal(parseAgentCommand('מה השעה?'), null);
});

test('findAgent matches a label or an id', () => {
    assert.equal(findAgent('מחקר').id, 'researcher');
    assert.equal(findAgent('researcher').label, 'מחקר');
    assert.equal(findAgent('nope'), null);
});

test('after "דבר עם", messages go to that agent and not to the assistant', async () => {
    const phone = '999100000001';
    const f = fakes();
    await handleMessage(message(phone, 'דבר עם באגים'), f);
    assert.match((await texts(phone)).at(-1), /עכשיו אתה מדבר עם \*באגים\*/);

    await handleMessage(message(phone, 'הפונקציה הזו מחזירה תוצאה שגויה'), f);
    assert.equal(f.brainCalls.length, 0);
    assert.equal(f.agentCalls.length, 1);
    assert.equal(f.agentCalls[0].agentId, 'bug-hunter');
    assert.equal(f.agentCalls[0].messages.at(-1).role, 'user');
    assert.equal((await texts(phone)).at(-1), 'תשובה מ-bug-hunter');
});

test('the agent sees the earlier turns of its own conversation', async () => {
    const phone = '999100000002';
    const f = fakes();
    await handleMessage(message(phone, 'דבר עם מחקר'), f);
    await handleMessage(message(phone, 'מה ההבדל בין A ל-B?'), f);
    await handleMessage(message(phone, 'ומה לגבי C?'), f);
    const second = f.agentCalls[1].messages;
    assert.equal(second.length, 3);
    assert.deepEqual(second.map((turn) => turn.role), ['user', 'assistant', 'user']);
    assert.equal(second[1].content, 'תשובה מ-researcher');
});

test('"חזרה לעוזר" returns the person to the assistant', async () => {
    const phone = '999100000003';
    const f = fakes();
    await handleMessage(message(phone, 'דבר עם תיעוד'), f);
    await handleMessage(message(phone, 'חזרה לעוזר'), f);
    await handleMessage(message(phone, 'מה השעה?'), f);
    assert.equal(f.agentCalls.length, 0);
    assert.equal(f.brainCalls.length, 1);
    assert.equal((await store.getUser(phone)).agent, null);
});

test('"לכל הסוכנים" sends one reply per agent, with failures marked', async () => {
    const phone = '999100000004';
    const f = fakes();
    await handleMessage(message(phone, 'לכל הסוכנים: מה דעתכם על הרעיון?'), f);
    assert.deepEqual(f.broadcastCalls, ['מה דעתכם על הרעיון?']);
    const sent = (await texts(phone)).slice(-2);
    assert.match(sent[0], /\*באגים\*\nאין באגים/);
    assert.match(sent[1], /\*מחקר\*: הסוכן לא הצליח לענות/);
    assert.equal(f.brainCalls.length, 0);
});

test('a failing agent gets an apology and nothing is saved from it', async () => {
    const phone = '999100000005';
    const f = fakes();
    f.agentReply = async () => {
        throw new Error('upstream down');
    };
    await handleMessage(message(phone, 'דבר עם אבטחה'), f);
    await handleMessage(message(phone, 'בדוק לי את הקוד'), f);
    assert.match((await texts(phone)).at(-1), /הסוכן לא הצליח לענות/);
    assert.equal((await store.getUser(phone)).agentHistory.length, 0);
});
