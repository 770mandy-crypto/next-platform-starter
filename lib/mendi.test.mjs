// Offline checks for MENDI AI: the connectors against a fixture server, the
// file builders, approvals (once-only sending, trusted auto-approval), tool
// access per agent, and a full manager → meeting → presentation → mail mission
// driven by a scripted stand-in for the Claude client.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

process.env.MASLUL_STORE = 'memory';

// --- Fixture server: Zoom, Resend, WhatsApp ----------------------------------

const requests = [];
const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, url: req.url, headers: req.headers, body });
    const json = (status, value) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(value));
    };
    const url = new URL(req.url, 'http://x');

    if (url.pathname === '/oauth/token') return json(200, { access_token: 'zoom-token', expires_in: 3600 });
    if (url.pathname === '/v2/users/me/recordings') {
        return json(200, {
            meetings: [
                {
                    uuid: '/abc//def==',
                    id: 123,
                    topic: 'פגישת צוות',
                    start_time: '2026-11-04T08:00:00Z',
                    duration: 40,
                    recording_files: [{ file_type: 'MP4' }, { file_type: 'TRANSCRIPT', status: 'completed' }]
                }
            ]
        });
    }
    if (url.pathname.startsWith('/v2/meetings/') && url.pathname.endsWith('/recordings')) {
        return json(200, {
            topic: 'פגישת צוות',
            start_time: '2026-11-04T08:00:00Z',
            duration: 40,
            recording_files: [{ file_type: 'TRANSCRIPT', download_url: `${base}/rec/download/t1` }]
        });
    }
    if (url.pathname === '/rec/download/t1') {
        if (url.searchParams.get('access_token') !== 'zoom-token') return json(401, { message: 'no token' });
        res.writeHead(200, { 'content-type': 'text/vtt' });
        return res.end('WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nדנה: שלום לכולם\n\n2\n00:00:04.000 --> 00:00:06.000\nדנה: נתחיל\n\n3\n00:00:06.000 --> 00:00:09.000\nיוסי: אני אכין את התקציב עד יום חמישי\n');
    }
    if (url.pathname.startsWith('/v2/past_meetings/')) {
        return json(200, {
            participants: [
                { name: 'דנה', user_email: 'dana@example.com' },
                { name: 'יוסי', user_email: 'yossi@example.com' },
                { name: 'דנה', user_email: 'dana@example.com' }
            ]
        });
    }
    if (url.pathname === '/emails') return json(200, { id: `email-${requests.length}` });
    if (url.pathname.endsWith('/messages')) return json(200, { messages: [{ id: `wamid-${requests.length}` }] });
    json(404, { error: 'not found' });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
Object.assign(process.env, {
    ANTHROPIC_API_KEY: 'test-key',
    ZOOM_ACCOUNT_ID: 'acc',
    ZOOM_CLIENT_ID: 'cid',
    ZOOM_CLIENT_SECRET: 'secret',
    ZOOM_API_HOST: base,
    ZOOM_OAUTH_HOST: base,
    RESEND_API_KEY: 're_test',
    MENDI_EMAIL_FROM: 'MENDI <mendi@example.com>',
    RESEND_API_URL: base,
    WHATSAPP_TOKEN: 'wa',
    WHATSAPP_PHONE_NUMBER_ID: '555',
    WHATSAPP_API_HOST: base
});
test.after(() => server.close());

const { resetMemoryDb, getDb } = await import('./pilot/db.js');
const { AGENTS, AGENT_IDS } = await import('./mendi/agents.js');
const connectors = await import('./mendi/connectors.js');
const slides = await import('./mendi/slides.js');
const store = await import('./mendi/store.js');
const actions = await import('./mendi/actions.js');
const { runTool, toolsFor, AGENT_TOOLS } = await import('./mendi/tools.js');
const { runMission, historyFor, replayable } = await import('./mendi/run.js');
const { createQueuedMission } = await import('./mendi/launch.js');
const { systemPrompt } = await import('./mendi/prompts.js');
const { deleteAccountData } = await import('./pilot/workspace.js');

const USER = 'user-0000000001';
const ORIGIN = 'https://mendi.example';

function toolContext(agentId, emitted = []) {
    return { userId: USER, origin: ORIGIN, missionId: 'm-test', agentId, emit: (event) => emitted.push(event) };
}

// --- Catalog and prompts -----------------------------------------------------

test('the team has ten agents, each with a prompt and a tool list', () => {
    assert.equal(AGENTS.length, 10);
    for (const id of AGENT_IDS) {
        assert.ok(AGENT_TOOLS[id], `${id} has tools`);
        const [shared, own] = systemPrompt(id, { user: { name: 'מנדי', email: 'm@example.com' } });
        assert.match(shared.text, /approval/);
        assert.match(own.text, /מנדי/);
    }
});

test('only the manager can delegate, and only at the top level', () => {
    const names = (id, options) => toolsFor(id, options).map((tool) => tool.name);
    assert.ok(names('manager').includes('delegate'));
    assert.ok(!names('manager', { canDelegate: false }).includes('delegate'));
    for (const id of AGENT_IDS.filter((item) => item !== 'manager')) assert.ok(!names(id).includes('delegate'));
    assert.ok(names('research').includes('web_search'));
    assert.ok(!names('mail').includes('web_search'));
});

// --- Connectors ----------------------------------------------------------------

test('a Zoom transcript turns into who-said-what lines', () => {
    const text = connectors.vttToText('WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nא: אחת\n\n2\n00:00:02.000 --> 00:00:03.000\nא: שתיים\n\n3\n00:00:03.000 --> 00:00:04.000\nב: שלוש');
    assert.equal(text, 'א: אחת שתיים\nב: שלוש');
});

test('meeting UUIDs with slashes are encoded twice', () => {
    assert.equal(connectors.zoomMeetingPath('abc=='), 'abc%3D%3D');
    assert.equal(connectors.zoomMeetingPath('/abc//d'), encodeURIComponent(encodeURIComponent('/abc//d')));
});

test('Zoom recordings and a transcript with participants come back through the connector', async () => {
    connectors.resetZoomToken();
    const listed = await runTool('zoom_list_recordings', {}, toolContext('meeting'));
    assert.equal(listed.isError, false);
    assert.equal(listed.result.meetings[0].has_transcript, true);

    const got = await runTool('zoom_get_transcript', { meeting_uuid: '/abc//def==' }, toolContext('meeting'));
    assert.equal(got.isError, false);
    assert.match(got.result.transcript, /^דנה: שלום לכולם נתחיל\nיוסי:/);
    assert.deepEqual(got.result.participants.map((person) => person.email), ['dana@example.com', 'yossi@example.com']);
    const download = requests.find((item) => item.url.startsWith('/rec/download'));
    assert.match(download.url, /access_token=zoom-token/);
});

test('a missing connector is reported to the agent, not thrown', async () => {
    const saved = process.env.ZOOM_CLIENT_SECRET;
    delete process.env.ZOOM_CLIENT_SECRET;
    connectors.resetZoomToken();
    try {
        const outcome = await runTool('zoom_list_recordings', {}, toolContext('meeting'));
        assert.equal(outcome.isError, true);
        assert.match(outcome.result.error, /ZOOM_CLIENT_SECRET/);
    } finally {
        process.env.ZOOM_CLIENT_SECRET = saved;
    }
});

test('an agent cannot use another agent’s tools', async () => {
    const outcome = await runTool('create_presentation', { title: 'x', slides: [{ title: 'y' }] }, toolContext('mail'));
    assert.equal(outcome.isError, true);
    assert.match(outcome.result.error, /not available/);
});

// --- Files ---------------------------------------------------------------------

test('a deck with every layout builds into a .pptx file', async () => {
    const deck = await slides.buildDeck({
        title: 'סיכום פגישה',
        subtitle: 'נובמבר 2026',
        theme: 'ocean',
        slides: [
            { title: 'סקירה', bullets: ['נקודה אחת', 'נקודה שתיים'], notes: 'הערות' },
            { title: 'חלק ב', layout: 'section', bullets: ['תת כותרת'] },
            { title: 'השוואה', layout: 'two_column', bullets: ['א'], right_bullets: ['ב'], column_titles: ['לפני', 'אחרי'] },
            { title: 'ציטוט', layout: 'quote', bullets: ['משפט חשוב', 'דנה'] },
            { title: 'נתונים', layout: 'chart', chart: { type: 'bar', labels: ['ינו', 'פבר'], series: [{ name: 'מכירות', values: [3, 5] }] }, bullets: ['עלייה'] },
            { title: 'מספרים', layout: 'stats', stats: [{ value: '42%', label: 'צמיחה' }] }
        ]
    });
    assert.equal(deck.subarray(0, 2).toString(), 'PK');
    assert.ok(deck.length > 20_000);
});

test('tables open in Excel with Hebrew intact and no formulas', () => {
    const csv = slides.buildCsv(['שם', 'סכום'], [['=HYPERLINK("x")', -5], ['פסיק, ומירכאה "', 12.5]]);
    assert.ok(csv.startsWith('﻿'));
    assert.match(csv, /'=HYPERLINK/);
    assert.match(csv, /,-5\r\n/);
    assert.match(csv, /"פסיק, ומירכאה """/);
});

test('an invite is valid iCalendar in UTC with folded long lines', () => {
    const ics = slides.buildInvite({
        title: 'פגישה עם דני '.repeat(8),
        start: '2026-11-08T10:00:00+02:00',
        end: '2026-11-08T11:00:00+02:00',
        attendees: ['dani@example.com'],
        uid: 'u1'
    });
    assert.match(ics, /DTSTART:20261108T080000Z/);
    assert.match(ics, /ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:dani@example.com/);
    for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, line);
});

// --- Approvals -----------------------------------------------------------------

test('an email waits for approval, is sent once with its attachment, and is logged', async () => {
    resetMemoryDb();
    const file = await store.saveFile(USER, { name: 'deck.pptx', type: 'application/x', data: Buffer.from('DECK'), agent: 'presentation', kind: 'presentation' });
    const emitted = [];
    const outcome = await runTool(
        'send_email',
        { to: ['dana@example.com'], subject: 'סיכום', body: 'שלום\n\n- נקודה', attachment_file_ids: [file.id] },
        toolContext('mail', emitted)
    );
    assert.equal(outcome.result.status, 'waiting_for_approval');
    const before = requests.filter((item) => item.url === '/emails').length;

    const sent = await actions.approveAction(USER, outcome.result.action_id, { origin: ORIGIN, edits: { subject: 'סיכום מעודכן' } });
    assert.equal(sent.status, 'sent');
    assert.equal(await actions.approveAction(USER, outcome.result.action_id, { origin: ORIGIN }), null, 'second approve does nothing');

    const mails = requests.filter((item) => item.url === '/emails');
    assert.equal(mails.length, before + 1);
    const payload = JSON.parse(mails.at(-1).body);
    assert.equal(payload.subject, 'סיכום מעודכן');
    assert.equal(payload.attachments[0].filename, 'deck.pptx');
    assert.equal(Buffer.from(payload.attachments[0].content, 'base64').toString(), 'DECK');
    assert.match(payload.html, /<ul/);
    assert.ok((await store.listActivity(USER)).some((entry) => entry.kind === 'sent'));
});

test('a rejected action is never sent', async () => {
    resetMemoryDb();
    const outcome = await runTool('send_whatsapp', { to: ['+972501234567'], text: 'היי' }, toolContext('service'));
    assert.equal(outcome.result.status, 'waiting_for_approval');
    assert.equal((await actions.rejectAction(USER, outcome.result.action_id)).status, 'rejected');
    assert.equal(await actions.approveAction(USER, outcome.result.action_id, { origin: ORIGIN }), null);
});

test('pre-approved kinds go out by themselves only to trusted recipients', async () => {
    resetMemoryDb();
    await store.saveSettings(USER, { autoApprove: { whatsapp: true }, trustedRecipients: ['+972-50-123-4567'] });
    const trusted = await runTool('send_whatsapp', { to: ['+972501234567'], text: 'תזכורת' }, toolContext('mail'));
    assert.equal(trusted.result.status, 'sent');
    const stranger = await runTool('send_whatsapp', { to: ['+972509999999'], text: 'תזכורת' }, toolContext('mail'));
    assert.equal(stranger.result.status, 'waiting_for_approval');
    const email = await runTool('send_email', { to: ['x@example.com'], subject: 's', body: 'b' }, toolContext('mail'));
    assert.equal(email.result.status, 'waiting_for_approval', 'email was not pre-approved');
});

test('attachments must be the user’s own files', async () => {
    resetMemoryDb();
    const outcome = await runTool('send_email', { to: ['a@example.com'], subject: 's', body: 'b', attachment_file_ids: ['000000000-nope-nope'] }, toolContext('mail'));
    assert.equal(outcome.isError, true);
    assert.match(outcome.result.error, /list_files/);
});

// --- Missions ------------------------------------------------------------------

// A stand-in for the Anthropic client that answers each agent from its own
// script, so parallel and nested runs stay deterministic.
function teamClient(scripts) {
    const calls = [];
    const agentOf = (params) => params.system[1].text.match(/You are (MENDI \w+)/)[1];
    const byName = Object.fromEntries(AGENTS.map((agent) => [agent.name, agent.id]));
    return {
        calls,
        beta: {
            messages: {
                stream(params) {
                    const agent = byName[agentOf(params)];
                    calls.push({ agent, params: structuredClone(params) });
                    const script = scripts[agent];
                    const turn = typeof script[0] === 'function' ? script.shift()(params) : script.shift();
                    if (!turn) throw new Error(`no scripted turn left for ${agent}`);
                    const events = turn.content.flatMap((block, index) =>
                        block.type === 'text'
                            ? [
                                  { type: 'content_block_start', index, content_block: { type: 'text', text: '' } },
                                  { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } }
                              ]
                            : [{ type: 'content_block_start', index, content_block: block }]
                    );
                    return {
                        async *[Symbol.asyncIterator]() {
                            yield* events;
                        },
                        finalMessage: async () => turn
                    };
                }
            }
        }
    };
}

const toolUse = (id, name, input) => ({ type: 'tool_use', id, name, input });
const lastToolResult = (params) => JSON.parse(params.messages.at(-1).content[0].content);

test('the manager runs a meeting through three agents and ends with one answer', async () => {
    resetMemoryDb();
    let deckId;
    const client = teamClient({
        manager: [
            { stop_reason: 'tool_use', content: [{ type: 'text', text: 'מתחיל.' }, toolUse('d1', 'delegate', { agent: 'meeting', task: 'סכם את הפגישה האחרונה' })] },
            (params) => {
                assert.match(lastToolResult(params).result, /יוסי/);
                return { stop_reason: 'tool_use', content: [toolUse('d2', 'delegate', { agent: 'presentation', task: 'מצגת', context: 'סיכום...' })] };
            },
            (params) => {
                deckId = lastToolResult(params).files[0].file_id;
                return {
                    stop_reason: 'tool_use',
                    content: [toolUse('d3', 'delegate', { agent: 'mail', task: 'מייל למשתתפים', context: `file ${deckId}; dana@example.com, yossi@example.com` })]
                };
            },
            (params) => {
                const result = lastToolResult(params);
                assert.equal(result.actions[0].status, 'waiting_for_approval');
                return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'הכול מוכן. המייל ממתין לאישורך.' }] };
            }
        ],
        meeting: [
            { stop_reason: 'tool_use', content: [toolUse('z1', 'zoom_list_recordings', {})] },
            { stop_reason: 'tool_use', content: [toolUse('z2', 'zoom_get_transcript', { meeting_uuid: '/abc//def==' })] },
            { stop_reason: 'end_turn', content: [{ type: 'text', text: 'סיכום: יוסי יכין תקציב עד חמישי.' }] }
        ],
        presentation: [
            { stop_reason: 'tool_use', content: [toolUse('p1', 'create_presentation', { title: 'פגישת צוות', slides: [{ title: 'החלטות', bullets: ['תקציב'] }] })] },
            { stop_reason: 'end_turn', content: [{ type: 'text', text: 'המצגת מוכנה.' }] }
        ],
        mail: [
            (params) => ({
                stop_reason: 'tool_use',
                content: [
                    toolUse('m1', 'send_email', {
                        to: ['dana@example.com', 'yossi@example.com'],
                        subject: 'סיכום פגישת צוות',
                        body: 'מצורפת המצגת.',
                        attachment_file_ids: [params.messages[0].content.match(/file (\S+);/)[1]]
                    })
                ]
            }),
            { stop_reason: 'end_turn', content: [{ type: 'text', text: 'המייל ממתין לאישור.' }] }
        ]
    });

    const mission = await store.createMission(USER, { room: 'manager', agentId: 'manager', message: 'תטפל לי בפגישה', dispatchToken: 't' });
    const done = await runMission({ userId: USER, missionId: mission.id, user: { name: 'מנדי', email: 'm@example.com' }, origin: ORIGIN, client });

    assert.equal(done.status, 'done');
    assert.equal(done.reply, 'מתחיל.\n\nהכול מוכן. המייל ממתין לאישורך.');
    assert.deepEqual(done.steps.map((step) => [step.agent, step.status]), [['meeting', 'done'], ['presentation', 'done'], ['mail', 'done']]);
    assert.equal(done.files.length, 1);
    assert.equal(done.files[0].id, deckId);
    assert.equal(done.actions[0].status, 'pending');
    assert.deepEqual(done.steps[2].actions[0].attachments, [deckId]);

    // Saved, unlocked, logged; specialists never saw the delegate tool.
    assert.equal((await store.getMission(USER, mission.id)).status, 'done');
    assert.equal(await (await getDb()).get(`mendi/${USER}/running`), null);
    for (const call of client.calls.filter((item) => item.agent !== 'manager')) {
        assert.ok(!call.params.tools.some((tool) => tool.name === 'delegate'));
    }
    const pending = (await store.listActions(USER)).filter((action) => action.status === 'pending');
    assert.equal(pending.length, 1);

    // Running it again does nothing.
    const again = await runMission({ userId: USER, missionId: mission.id, origin: ORIGIN, client });
    assert.equal(again.status, 'done');
});

test('independent delegations run side by side, and a failing agent is reported, not fatal', async () => {
    resetMemoryDb();
    const client = teamClient({
        manager: [
            {
                stop_reason: 'tool_use',
                content: [
                    toolUse('a', 'delegate', { agent: 'research', task: 'מחקר' }),
                    toolUse('b', 'delegate', { agent: 'marketing', task: 'פוסטים' })
                ]
            },
            (params) => {
                const results = params.messages.at(-1).content;
                assert.equal(results.length, 2);
                assert.equal(results[0].tool_use_id, 'a');
                assert.equal(JSON.parse(results[1].content).status, 'failed');
                return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'סיכום.' }] };
            }
        ],
        research: [{ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ממצאים.' }] }],
        marketing: [
            () => {
                throw new Error('boom');
            }
        ]
    });
    const mission = await store.createMission(USER, { room: 'manager', agentId: 'manager', message: 'שני דברים' });
    const done = await runMission({ userId: USER, missionId: mission.id, origin: ORIGIN, client });
    assert.equal(done.status, 'done');
    assert.deepEqual(done.steps.map((step) => step.status).sort(), ['done', 'failed']);
});

test('a direct chat with one agent uses only that agent’s tools', async () => {
    resetMemoryDb();
    const client = teamClient({
        secretary: [
            { stop_reason: 'tool_use', content: [toolUse('t', 'add_task', { title: 'להתקשר לרו״ח', due: '2026-11-06' })] },
            { stop_reason: 'end_turn', content: [{ type: 'text', text: 'הוספתי.' }] }
        ]
    });
    const mission = await store.createMission(USER, { room: 'secretary', agentId: 'secretary', message: 'תזכיר לי להתקשר לרו״ח' });
    const done = await runMission({ userId: USER, missionId: mission.id, origin: ORIGIN, client });
    assert.equal(done.reply, 'הוספתי.');
    assert.equal(done.tasks[0].title, 'להתקשר לרו״ח');
    assert.deepEqual(client.calls[0].params.tools.map((tool) => tool.name).sort(), [...AGENT_TOOLS.secretary].sort());
});

test('history comes from the same room’s finished missions', async () => {
    resetMemoryDb();
    const first = await store.createMission(USER, { room: 'manager', agentId: 'manager', message: 'שאלה 1' });
    await store.saveMission(USER, { ...first, status: 'done', reply: 'תשובה 1' });
    const other = await store.createMission(USER, { room: 'finance', agentId: 'finance', message: 'כספים' });
    await store.saveMission(USER, { ...other, status: 'done', reply: 'x' });
    const failed = await store.createMission(USER, { room: 'manager', agentId: 'manager', message: 'נכשל' });
    await store.saveMission(USER, { ...failed, status: 'failed' });
    const current = await store.createMission(USER, { room: 'manager', agentId: 'manager', message: 'שאלה 2' });
    assert.deepEqual(await historyFor(USER, current), [
        { role: 'user', content: 'שאלה 1' },
        { role: 'assistant', content: 'תשובה 1' },
        { role: 'user', content: 'שאלה 2' }
    ]);
});

test('one mission at a time per user', async () => {
    resetMemoryDb();
    const user = { id: USER, name: 'מנדי', email: 'm@example.com' };
    const mission = await createQueuedMission(user, { room: 'manager', message: 'משימה' });
    assert.equal(mission.status, 'queued');
    await assert.rejects(createQueuedMission(user, { room: 'manager', message: 'עוד' }), { status: 429 });
    await store.releaseMissionLock(USER, mission.id);
    await createQueuedMission(user, { room: 'research', message: 'עכשיו' });
    await assert.rejects(createQueuedMission({ ...user, id: 'user-0000000002' }, { room: 'nobody', message: 'x' }), { status: 400 });
});

test('a fallback marker drops the declined model’s tool calls before replay', () => {
    const content = [
        { type: 'text', text: 'a' },
        { type: 'tool_use', id: 'x', name: 'delegate', input: {} },
        { type: 'fallback' },
        { type: 'text', text: 'b' }
    ];
    assert.deepEqual(replayable(content).map((block) => block.type), ['text', 'text']);
});

test('settings keep only sensible trusted recipients', async () => {
    const settings = await store.saveSettings(USER, {
        autoApprove: { email: 1, whatsapp: false, sms: true },
        trustedRecipients: ['  Dana@Example.com ', 'dana@example.com', '+972 (50) 123-4567', 'x']
    });
    assert.deepEqual(settings, {
        autoApprove: { email: true, whatsapp: false },
        trustedRecipients: ['dana@example.com', '972501234567']
    });
});

test('deleting the account removes everything MENDI kept, files included', async () => {
    resetMemoryDb();
    const file = await store.saveFile(USER, { name: 'a.csv', type: 'text/csv', data: Buffer.from('x'), agent: 'finance', kind: 'spreadsheet' });
    await store.addTask(USER, { title: 't' });
    await deleteAccountData({ id: USER, email: 'm@example.com' });
    const db = await getDb();
    assert.deepEqual(await db.list(`mendi/${USER}/`), []);
    assert.equal(await store.loadFileData(file.id), null);
});
