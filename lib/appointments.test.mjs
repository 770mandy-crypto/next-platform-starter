// Offline checks for the appointment planner, against a streaming Claude
// stand-in (lib/testing/claude-stream.mjs).
import assert from 'node:assert/strict';
import test from 'node:test';
import { fetched, search, startClaudeStream } from './testing/claude-stream.mjs';

const claude = await startClaudeStream();
test.after(() => claude.close());

const { planAppointment, buildUserContent, CHROME_RULES } = await import('./appointments/planner.js');
const { parseAppointmentRequest, RequestError } = await import('./appointments/request.js');

const PLAN = {
    title: 'תור לאורתופד במכבי, רמת גן',
    summary: 'הכי מהר דרך האתר או האפליקציה. לאורתופד במכבי לא צריך הפניה.',
    channels: [
        { kind: 'online', name: 'זימון תורים באתר מכבי', url: 'https://www.maccabi4u.co.il/appointments', phone: '', hours: '', note: 'צריך להתחבר עם קוד חד-פעמי.' },
        { kind: 'phone', name: 'מוקד מכבי', url: 'javascript:alert(1)', phone: '*3555', hours: 'א׳–ה׳ 7:00–23:00', note: '' }
    ],
    prepare: ['כרטיס מגנטי של מכבי'],
    steps: ['נכנסים לאתר', 'בוחרים "אורתופדיה"'],
    tips: ['תורים שהתבטלו משתחררים בבוקר.'],
    cost: '',
    chromeTask: 'פתח את https://www.maccabi4u.co.il/appointments וחפש תור לאורתופד ברמת גן, בבקרים.',
    sources: [{ title: 'מכבי – זימון תורים', url: 'https://www.maccabi4u.co.il/appointments' }]
};
const call = (input = PLAN) => ({ type: 'tool_use', id: 'toolu_1', name: 'prepare_plan', input });
const INPUT = { need: 'אורתופד', provider: 'maccabi', city: 'רמת גן', when: 'בבקרים' };

async function run(input = INPUT) {
    const events = [];
    for await (const event of planAppointment({ input, now: Date.UTC(2026, 10, 15, 8) })) events.push(event);
    return events;
}

test('the planner researches and returns a plan, with the safety rules always appended', async () => {
    claude.reset();
    claude.replies.push({
        content: [...search('s1', 'מכבי זימון תור אורתופד'), ...fetched('s2', 'https://www.kolzchut.org.il/he/maccabi', 'כל זכות – מכבי'), call()],
        stop_reason: 'tool_use'
    });
    const events = await run();
    assert.deepEqual(
        events.map((e) => e.type),
        ['searching', 'reading', 'source', 'writing', 'plan']
    );
    const { plan } = events.at(-1);
    assert.ok(plan.chromeTask.startsWith('פתח את https://www.maccabi4u.co.il/appointments'));
    assert.ok(plan.chromeTask.endsWith(CHROME_RULES), 'login, confirmation and payment rules are added by code, not left to the model');
    assert.match(CHROME_RULES, /עצור ותראה לי/);
    assert.match(CHROME_RULES, /אל תזין פרטי תשלום/);
    // An unsafe link is removed; the phone line stays.
    assert.equal(plan.channels[1].url, '');
    assert.equal(plan.channels[1].phone, '*3555');
    assert.deepEqual(
        plan.sources.map((s) => s.url),
        ['https://www.maccabi4u.co.il/appointments', 'https://www.kolzchut.org.il/he/maccabi']
    );

    const [request] = claude.requests;
    assert.deepEqual(request.tools.map((t) => t.name), ['web_search', 'web_fetch', 'prepare_plan']);
    assert.equal(request.output_config.effort, 'medium');
    assert.match(request.system, /יום ראשון, 15 בנובמבר 2026/);
    assert.match(request.system, /Never invent them/);
});

test('a plan with no way to book is rejected', async () => {
    claude.reset();
    claude.replies.push({ content: [call({ ...PLAN, channels: [] })], stop_reason: 'tool_use' });
    assert.equal((await run()).at(-1).type, 'failed');
});

test('what reaches Claude: the need, the provider and the preferences, and nothing else', () => {
    const text = buildUserContent(INPUT);
    assert.match(text, /<need>אורתופד<\/need>/);
    assert.match(text, /Provider: מכבי/);
    assert.match(text, /Area \/ city: רמת גן/);
    assert.match(text, /<when>בבקרים<\/when>/);
    assert.match(buildUserContent({ need: 'דרכון', provider: null, city: '', when: '' }), /Provider: not specified/);
});

test('requests are checked before any paid work', () => {
    assert.deepEqual(parseAppointmentRequest({ need: '  רופא   עור  ', provider: 'clalit', city: 'חיפה', idNumber: '123', password: 'x' }), {
        need: 'רופא עור',
        provider: 'clalit',
        city: 'חיפה',
        when: ''
    });
    assert.equal(parseAppointmentRequest({ need: 'רופא שיניים', provider: '__proto__' }).provider, null);
    assert.throws(() => parseAppointmentRequest({ need: 'א' }), RequestError);
    assert.throws(() => parseAppointmentRequest(null), RequestError);
});
