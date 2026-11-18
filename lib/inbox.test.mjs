// Offline checks for the inbox flow. The Claude client is a fake that records
// every call, so the tests show which agent read an email and that no call
// asked for a tool (which is how the agent would act on the outside world).
import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanEmail, MAX_EMAIL_CHARS, processEmail, routeEmail, splitReply } from './agents/inbox.js';

function fakeClient() {
    const calls = [];
    return {
        calls,
        messages: {
            create: async (params) => {
                calls.push(params);
                const id = params.system.match(/^You are ([\w-]+)\./)[1];
                return { content: [{ type: 'text', text: `ans:${id}` }] };
            }
        }
    };
}

const repliedBy = (call) => call.system.match(/^You are ([\w-]+)\./)[1];

test('an invoice goes to the invoices agent', () => {
    assert.equal(routeEmail({ subject: 'חשבונית מספר 1042', body: '' }).agentId, 'invoices');
    assert.equal(routeEmail({ subject: 'Your invoice is ready', body: '' }).agentId, 'invoices');
});

test('a meeting request goes to the calendar agent', () => {
    assert.equal(routeEmail({ subject: 'נוכל לקבוע פגישה?', body: 'מתאים לי יום שלישי' }).agentId, 'calendar');
    assert.equal(routeEmail({ subject: 'Invitation: review', body: '' }).agentId, 'calendar');
});

test('an invoice that mentions a call still goes to invoices', () => {
    assert.equal(routeEmail({ subject: 'חשבונית', body: 'נדבר בפגישה' }).agentId, 'invoices');
});

test('ordinary mail stays with the email agent', () => {
    assert.equal(routeEmail({ subject: 'שלום', body: 'מה שלומך?' }).agentId, 'email');
});

test('an invoice is handed from the email agent to the invoices agent', async () => {
    const client = fakeClient();
    const result = await processEmail({
        email: { from: 'supplier@example.com', subject: 'חשבונית 77', body: 'סכום לתשלום 1,200 ש״ח עד 30.11' },
        client
    });
    assert.equal(result.agentId, 'invoices');
    assert.equal(result.text, 'ans:invoices');
    assert.deepEqual(result.chain, ['email', 'invoices']);
    assert.equal(client.calls.length, 1);
    assert.equal(repliedBy(client.calls[0]), 'invoices');
    assert.match(client.calls[0].messages[0].content, /הועבר אליך מהסוכן מיילים/);
});

test('an ordinary email is answered by the email agent itself', async () => {
    const client = fakeClient();
    const result = await processEmail({ email: { subject: 'שלום', body: 'מה שלומך?' }, client });
    assert.equal(result.agentId, 'email');
    assert.equal(result.text, 'ans:email');
    assert.deepEqual(result.chain, ['email']);
    assert.equal(repliedBy(client.calls[0]), 'email');
});

test('no inbox call offers a tool, so nothing is sent on the user\'s behalf', async () => {
    const client = fakeClient();
    await processEmail({ email: { subject: 'פגישה', body: 'מתי?' }, client });
    await processEmail({ email: { subject: 'שלום', body: 'היי' }, client });
    for (const call of client.calls) assert.equal(call.tools, undefined);
});

test('an empty email is refused without calling Claude', async () => {
    const client = fakeClient();
    await assert.rejects(processEmail({ email: { subject: '  ', body: '' }, client }), { message: 'המייל ריק.' });
    assert.equal(client.calls.length, 0);
});

test('a very long email is cut and marked', () => {
    const clean = cleanEmail({ subject: 'x', body: 'א'.repeat(MAX_EMAIL_CHARS + 500) });
    assert.ok(clean.body.endsWith('[המייל קוצר]'));
    assert.ok(clean.body.length <= MAX_EMAIL_CHARS + 20);
});

test('the reply is split from the summary at the draft marker', () => {
    const split = splitReply('סיכום: לקוח מבקש הצעה.\n=== טיוטה ===\nשלום, אשלח מחר.');
    assert.equal(split.summary, 'סיכום: לקוח מבקש הצעה.');
    assert.equal(split.draft, 'שלום, אשלח מחר.');
});

test('an answer without the marker is kept whole as the draft', () => {
    assert.deepEqual(splitReply('שלום, אשלח מחר.'), { summary: '', draft: 'שלום, אשלח מחר.' });
});
