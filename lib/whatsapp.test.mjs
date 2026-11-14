// Offline checks for the WhatsApp agent. One fixture server stands in for the
// outside world: the WhatsApp Cloud API (Graph), ElevenLabs speech-to-text and
// the Claude API. Messages go in the way Meta delivers them.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';

process.env.MASLUL_STORE = 'memory';

const graph = { sent: [], media: new Map(), fail: false };
const eleven = { requests: 0, text: 'תזכיר לי לקנות חלב' };
const claude = { requests: [], replies: [] };

const readBody = async (req) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks);
};
const sendJson = (res, status, value) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(value));
};

const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const url = new URL(req.url, 'http://x');

    if (url.pathname.startsWith('/v1/messages')) {
        const json = JSON.parse(body.toString());
        claude.requests.push(json);
        const next = claude.replies.shift();
        if (!next) return sendJson(res, 500, { type: 'error', error: { type: 'api_error', message: 'no scripted reply' } });
        return sendJson(res, 200, {
            id: `msg_${claude.requests.length}`,
            type: 'message',
            role: 'assistant',
            model: json.model,
            content: next.content,
            stop_reason: next.stop_reason ?? 'end_turn',
            stop_sequence: null,
            usage: { input_tokens: 10, output_tokens: 10 }
        });
    }
    if (url.pathname === '/v1/speech-to-text') {
        eleven.requests += 1;
        return sendJson(res, 200, { text: eleven.text, language_code: 'heb' });
    }
    if (url.pathname.startsWith('/download/')) {
        res.writeHead(200, { 'content-type': 'application/octet-stream' });
        return res.end(graph.media.get(url.pathname.slice('/download/'.length)).bytes);
    }
    // Graph: /v23.0/<phone id>/messages, or /v23.0/<media id>
    const [, , first, second] = url.pathname.split('/');
    if (req.headers.authorization !== 'Bearer wa-token') return sendJson(res, 401, { error: { message: 'bad token' } });
    if (second === 'messages') {
        const json = JSON.parse(body.toString());
        if (graph.fail && json.type) return sendJson(res, 400, { error: { message: 'refused' } });
        graph.sent.push(json);
        return sendJson(res, 200, { messaging_product: 'whatsapp', messages: [{ id: `wamid.out${graph.sent.length}` }] });
    }
    const media = graph.media.get(first);
    if (media) return sendJson(res, 200, { url: `${base}/download/${first}`, mime_type: media.mimeType, file_size: media.bytes.length });
    sendJson(res, 404, { error: { message: 'not found' } });
});
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;

process.env.WHATSAPP_GRAPH_HOST = base;
process.env.ELEVENLABS_HOST = base;
process.env.ANTHROPIC_BASE_URL = base;
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.WHATSAPP_TOKEN = 'wa-token';
process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';

const { resetMemoryDb } = await import('./pilot/db.js');
const api = await import('./whatsapp/api.js');
const time = await import('./whatsapp/time.js');
const store = await import('./whatsapp/store.js');
const { handleMessage, sendDueReminders, WINDOW_MS } = await import('./whatsapp/engine.js');

test.after(() => server.close());

const PHONE = '972501234567';
// Sunday 15 November 2026, 10:00 in Israel (UTC+2 in winter).
const NOW = Date.UTC(2026, 10, 15, 8, 0);

let seq = 0;
const message = (fields) => ({ id: `wamid.in${(seq += 1)}`, from: PHONE, name: 'דנה', type: 'text', timestamp: NOW, text: null, ...fields });
const text = (t) => message({ type: 'text', text: t });
const texts = () => graph.sent.filter((m) => m.type === 'text').map((m) => m.text.body);

const toolUse = (id, name, input) => ({ type: 'tool_use', id, name, input });
const say = (t) => ({ content: [{ type: 'text', text: t }] });

function reset() {
    resetMemoryDb();
    graph.sent.length = 0;
    graph.media.clear();
    graph.fail = false;
    claude.requests.length = 0;
    claude.replies.length = 0;
    eleven.requests = 0;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.WHATSAPP_ALLOWED_NUMBERS;
    delete process.env.WHATSAPP_REMINDER_TEMPLATE;
    delete process.env.WHATSAPP_DAILY_LIMIT;
}

// --- Time --------------------------------------------------------------------

test('Israel wall-clock times convert across the daylight-saving change', () => {
    // Winter: UTC+2. Summer: UTC+3.
    assert.equal(time.localToInstant('2026-11-16T08:00'), Date.UTC(2026, 10, 16, 6, 0));
    assert.equal(time.localToInstant('2026-07-01T08:00'), Date.UTC(2026, 6, 1, 5, 0));
    assert.equal(time.instantToLocal(Date.UTC(2026, 6, 1, 5, 0)), '2026-07-01T08:00');
    assert.equal(time.localToInstant('2026-02-31T08:00'), null);
    assert.equal(time.localToInstant('tomorrow'), null);
    // A daily 08:00 reminder stays at 08:00 when the clocks move forward
    // (Israel, Friday 27 March 2026).
    const before = time.localToInstant('2026-03-26T08:00');
    const next = time.nextOccurrence(time.nextOccurrence(before, 'daily'), 'daily');
    assert.equal(time.instantToLocal(next), '2026-03-28T08:00');
    // Monthly on the 31st: last day of February, then back to the 31st.
    const jan31 = time.localToInstant('2027-01-31T09:00');
    const feb = time.nextOccurrence(jan31, 'monthly', 31);
    assert.equal(time.instantToLocal(feb), '2027-02-28T09:00');
    assert.equal(time.instantToLocal(time.nextOccurrence(feb, 'monthly', 31)), '2027-03-31T09:00');
    assert.match(time.describeNow(NOW), /^Sunday 2026-11-15 10:00$/);
});

// --- Webhook plumbing ------------------------------------------------------

test('webhook signatures are checked against the app secret', () => {
    const payload = '{"a":1}';
    const header = `sha256=${createHmac('sha256', 'secret').update(payload).digest('hex')}`;
    assert.equal(api.verifySignature({ secret: 'secret', header, payload }), true);
    assert.equal(api.verifySignature({ secret: 'other', header, payload }), false);
    assert.equal(api.verifySignature({ secret: 'secret', header: 'sha256=00', payload }), false);
    assert.equal(api.verifySignature({ secret: 'secret', header: null, payload }), false);
});

test('parseWebhook flattens messages and skips delivery receipts', () => {
    const payload = {
        entry: [
            {
                changes: [
                    { value: { statuses: [{ id: 'wamid.x', status: 'delivered' }] } },
                    {
                        value: {
                            contacts: [{ wa_id: PHONE, profile: { name: 'דנה' } }],
                            messages: [
                                { id: 'wamid.1', from: PHONE, timestamp: '1700000000', type: 'text', text: { body: 'שלום' } },
                                { id: 'wamid.2', from: PHONE, timestamp: '1700000001', type: 'image', image: { id: 'm1', mime_type: 'image/jpeg', caption: 'חשבון' } }
                            ]
                        }
                    }
                ]
            }
        ]
    };
    const parsed = api.parseWebhook(payload);
    assert.equal(parsed.length, 2);
    assert.deepEqual(
        { id: parsed[0].id, name: parsed[0].name, text: parsed[0].text, timestamp: parsed[0].timestamp },
        { id: 'wamid.1', name: 'דנה', text: 'שלום', timestamp: 1_700_000_000_000 }
    );
    assert.deepEqual({ mediaId: parsed[1].mediaId, caption: parsed[1].caption, mimeType: parsed[1].mimeType }, { mediaId: 'm1', caption: 'חשבון', mimeType: 'image/jpeg' });
    assert.deepEqual(api.parseWebhook({}), []);
});

test('long replies are split on line breaks', () => {
    const parts = api.splitText(`${'א'.repeat(3000)}\n${'ב'.repeat(3000)}`);
    assert.deepEqual(parts.map((p) => p.length), [3000, 3000]);
    assert.deepEqual(api.splitText('קצר'), ['קצר']);
});

// --- Conversations ---------------------------------------------------------

test('a first hello gets the welcome message without calling Claude', async () => {
    reset();
    assert.equal(await handleMessage(text('היי'), { now: NOW }), 'welcomed');
    assert.equal(claude.requests.length, 0);
    assert.match(texts()[0], /תזכורות/);
    // The message was marked read with a typing indicator first.
    assert.equal(graph.sent[0].status, 'read');
});

test('a reminder request is scheduled in Israel time and sent when due', async () => {
    reset();
    claude.replies.push(
        { content: [toolUse('t1', 'add_reminder', { text: 'להתקשר לגן', due_at: '2026-11-16T09:00', repeat: 'none' })], stop_reason: 'tool_use' },
        say('✅ מחר ב-09:00 אזכיר לך להתקשר לגן.')
    );
    assert.equal(await handleMessage(text('תזכיר לי מחר בבוקר להתקשר לגן'), { now: NOW }), 'answered');
    assert.deepEqual(texts(), ['✅ מחר ב-09:00 אזכיר לך להתקשר לגן.']);

    // Claude was told the time and got the tool result back.
    assert.match(claude.requests[0].system, /Sunday 2026-11-15 10:00/);
    const result = JSON.parse(claude.requests[1].messages.at(-1).content[0].content);
    assert.equal(result.reminder.due_at, '2026-11-16T09:00');

    const [reminder] = await store.listReminders(PHONE);
    assert.equal(reminder.dueAt, Date.UTC(2026, 10, 16, 7, 0));

    // Not yet due.
    assert.deepEqual(await sendDueReminders(reminder.dueAt - 60_000), { sent: 0, template: 0, skipped: 0, failed: 0 });
    // Due, and within 24 hours of the person's last message: plain text.
    graph.sent.length = 0;
    assert.equal((await sendDueReminders(reminder.dueAt + 30_000)).sent, 1);
    assert.deepEqual(texts(), ['⏰ *תזכורת*\nלהתקשר לגן']);
    // One-off: gone, and a second run sends nothing.
    assert.deepEqual(await store.listReminders(PHONE), []);
    assert.equal((await sendDueReminders(reminder.dueAt + 90_000)).sent, 0);
});

test('a reminder for a time that has passed is refused back to Claude', async () => {
    reset();
    claude.replies.push(
        { content: [toolUse('t1', 'add_reminder', { text: 'x', due_at: '2026-11-15T09:00', repeat: 'none' })], stop_reason: 'tool_use' },
        say('השעה הזאת כבר עברה. למחר?')
    );
    await handleMessage(text('תזכיר לי ב-9'), { now: NOW });
    const toolResult = claude.requests[1].messages.at(-1).content[0];
    assert.equal(toolResult.is_error, true);
    assert.match(toolResult.content, /already passed/);
    assert.deepEqual(await store.listReminders(PHONE), []);
});

test('outside the 24-hour window a reminder goes out as a template, or is skipped without one', async () => {
    reset();
    await store.noteInbound(PHONE, { at: NOW });
    const dueAt = NOW + WINDOW_MS + 60_000;
    await store.addReminder(PHONE, { text: 'לשלם\nארנונה', dueAt, repeat: 'none' });
    assert.equal((await sendDueReminders(dueAt)).skipped, 1);
    assert.equal(graph.sent.length, 0);

    process.env.WHATSAPP_REMINDER_TEMPLATE = 'reminder_he';
    await store.addReminder(PHONE, { text: 'לשלם\nארנונה', dueAt, repeat: 'none' });
    assert.equal((await sendDueReminders(dueAt)).template, 1);
    const [sent] = graph.sent;
    assert.equal(sent.type, 'template');
    assert.equal(sent.template.name, 'reminder_he');
    assert.equal(sent.template.language.code, 'he');
    assert.equal(sent.template.components[0].parameters[0].text, 'לשלם ארנונה');
});

test('a weekly reminder moves on to next week after it is sent', async () => {
    reset();
    await store.noteInbound(PHONE, { at: NOW });
    const dueAt = time.localToInstant('2026-11-15T19:00');
    await store.addReminder(PHONE, { text: 'להוציא את הפח', dueAt, repeat: 'weekly' });
    await sendDueReminders(dueAt);
    const [moved] = await store.listReminders(PHONE);
    assert.equal(time.instantToLocal(moved.dueAt), '2026-11-22T19:00');
    // Overlapping scheduler runs at the same moment: handled once.
    await store.noteInbound(PHONE, { at: moved.dueAt - 60_000 });
    const runs = await Promise.all([sendDueReminders(moved.dueAt), sendDueReminders(moved.dueAt)]);
    assert.equal(runs[0].sent + runs[1].sent, 1);
    assert.equal(runs[0].skipped + runs[1].skipped, 0);
});

test('lists persist between messages', async () => {
    reset();
    claude.replies.push(
        { content: [toolUse('t1', 'add_to_list', { list: 'קניות', items: ['חלב', 'ביצים', 'חלב'] })], stop_reason: 'tool_use' },
        say('🛒 הוספתי חלב וביצים.'),
        { content: [toolUse('t2', 'remove_from_list', { list: 'קניות', items: ['חלב'] })], stop_reason: 'tool_use' },
        say('מחקתי חלב.')
    );
    await handleMessage(text('תוסיף חלב וביצים לקניות'), { now: NOW });
    await handleMessage(text('קניתי חלב'), { now: NOW });
    const lists = await store.getLists(PHONE);
    assert.deepEqual(lists['קניות'].map((i) => i.text), ['ביצים']);

    // The second message sees the first exchange as history.
    const second = claude.requests[2].messages;
    assert.deepEqual(second.slice(0, 2), [
        { role: 'user', content: 'תוסיף חלב וביצים לקניות' },
        { role: 'assistant', content: '🛒 הוספתי חלב וביצים.' }
    ]);
});

test('voice notes are transcribed and photos are passed to Claude as images', async () => {
    reset();
    graph.media.set('voice1', { bytes: Buffer.from('OggS-fake'), mimeType: 'audio/ogg' });
    graph.media.set('photo1', { bytes: Buffer.from('fake-jpeg'), mimeType: 'image/jpeg' });

    // No speech-to-text key: a polite answer, no Claude call.
    await handleMessage(message({ type: 'audio', mediaId: 'voice1', mimeType: 'audio/ogg' }), { now: NOW });
    assert.match(texts().at(-1), /זיהוי דיבור/);
    assert.equal(claude.requests.length, 0);

    process.env.ELEVENLABS_API_KEY = 'el-key';
    claude.replies.push(say('בסדר'), say('חשבון חשמל, לתשלום עד 28.11.'));
    await handleMessage(message({ type: 'audio', mediaId: 'voice1', mimeType: 'audio/ogg' }), { now: NOW });
    assert.equal(eleven.requests, 1);
    assert.match(claude.requests[0].messages.at(-1).content[0].text, /voice note, transcribed\]: תזכיר לי לקנות חלב/);

    await handleMessage(message({ type: 'image', mediaId: 'photo1', mimeType: 'image/jpeg', caption: 'מה זה?' }), { now: NOW });
    const [image, caption] = claude.requests[1].messages.at(-1).content;
    assert.equal(image.type, 'image');
    assert.equal(Buffer.from(image.source.data, 'base64').toString(), 'fake-jpeg');
    assert.equal(caption.text, 'מה זה?');
    // The photo itself is not kept in history, only a note of it.
    const user = await store.getUser(PHONE);
    assert.ok(user.history.some((t) => t.text === '📷 [photo] מה זה?'));
});

test('retries of the same delivery are answered once', async () => {
    reset();
    claude.replies.push(say('שלום!'));
    const m = text('מה שלומך?');
    assert.equal(await handleMessage(m, { now: NOW }), 'answered');
    assert.equal(await handleMessage(m, { now: NOW }), 'duplicate');
    assert.equal(texts().length, 1);
});

test('the allow-list and the daily limit are enforced', async () => {
    reset();
    process.env.WHATSAPP_ALLOWED_NUMBERS = '972500000000, 972 52-111-1111';
    assert.equal(await handleMessage(text('שלום'), { now: NOW }), 'not-allowed');
    assert.equal(graph.sent.length, 0);

    delete process.env.WHATSAPP_ALLOWED_NUMBERS;
    process.env.WHATSAPP_DAILY_LIMIT = '1';
    claude.replies.push(say('אהלן'));
    assert.equal(await handleMessage(text('מה קורה'), { now: NOW }), 'answered');
    assert.equal(await handleMessage(text('ועוד משהו'), { now: NOW }), 'over-limit');
    assert.match(texts().at(-1), /מכסת/);
});

test('a failed Claude call keeps the message for the next reply', async () => {
    reset();
    // No scripted reply: the fixture answers 500 (the SDK retries, then gives up).
    const failed = await handleMessage(text('תזכיר לי משהו'), { now: NOW });
    assert.equal(failed, 'failed');
    assert.match(texts().at(-1), /השתבש/);

    claude.replies.push(say('על מה להזכיר?'));
    await handleMessage(text('הלו?'), { now: NOW });
    const last = claude.requests.at(-1).messages;
    assert.equal(last.length, 1, 'the unanswered message is folded into the new one');
    assert.deepEqual(last[0].content.map((b) => b.text), ['תזכיר לי משהו', 'הלו?']);
});

test('a person cannot cancel someone else\'s reminder', async () => {
    reset();
    const reminder = await store.addReminder('972509999999', { text: 'x', dueAt: NOW + 3_600_000 });
    assert.equal(await store.cancelReminder(PHONE, reminder.id), false);
    assert.equal((await store.listReminders('972509999999')).length, 1);
});
