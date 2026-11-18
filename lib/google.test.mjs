// Offline checks for the Google connection and the approval gate. Google and
// Claude are fakes: every test that sends mail or creates an event checks what
// was sent, and that nothing is sent without a confirmed, pending draft.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';

process.env.MASLUL_STORE = 'memory';
process.env.GOOGLE_CLIENT_ID = 'client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
process.env.GOOGLE_REDIRECT_URI = 'https://example.test/api/google/callback';
process.env.GOOGLE_TOKEN_KEY = randomBytes(32).toString('base64');

const { open, seal } = await import('./google/seal.js');
const oauth = await import('./google/oauth.js');
const gmail = await import('./google/gmail.js');
const calendar = await import('./google/calendar.js');
const drafts = await import('./google/drafts.js');
const { checkInbox } = await import('./google/inbox-flow.js');

let userCounter = 0;
const newUser = () => `user-${(userCounter += 1)}-${randomBytes(3).toString('hex')}`;
const b64url = (text) => Buffer.from(text, 'utf8').toString('base64url');

// A fake of the Google endpoints the code calls. `sent` records every send.
function fakeGoogle({ inbox = [], refresh = 'AT-1' } = {}) {
    const sent = [];
    const requests = [];
    const fetchImpl = async (url, options = {}) => {
        requests.push({ url: String(url), options });
        const href = String(url);
        const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
        if (href.includes('/token')) return json({ access_token: refresh, expires_in: 3600 });
        if (href.includes('/users/me/messages/send')) {
            const body = JSON.parse(options.body);
            sent.push(body);
            return json({ id: `sent-${sent.length}` });
        }
        if (href.includes('/users/me/messages?')) return json({ messages: inbox.map((m) => ({ id: m.id })) });
        const single = inbox.find((m) => href.includes(`/messages/${m.id}?`));
        if (single) return json(single.message);
        if (href.includes('/calendar/v3/calendars/primary/events') && options.method === 'POST') return json({ id: 'event-1' });
        if (href.includes('/calendar/v3/calendars/primary/events')) return json({ items: [{ id: 'e1', summary: 'ישיבה', start: { dateTime: '2026-12-01T10:00:00+02:00' }, end: { dateTime: '2026-12-01T11:00:00+02:00' } }] });
        return json({ error: 'not faked' }, 404);
    };
    return { fetchImpl, sent, requests };
}

const plainMessage = (id, { from = 'Dana <dana@client.example>', subject = 'פגישה', text = 'מתאים לי מחר', messageId = `<${id}@mail.example>` } = {}) => ({
    id,
    threadId: `thread-${id}`,
    payload: {
        mimeType: 'multipart/alternative',
        headers: [
            { name: 'From', value: from },
            { name: 'Subject', value: subject },
            { name: 'Message-ID', value: messageId },
            { name: 'Date', value: 'Mon, 16 Nov 2026 09:00:00 +0200' }
        ],
        parts: [
            { mimeType: 'text/plain', body: { data: b64url(text) } },
            { mimeType: 'text/html', body: { data: b64url(`<p>${text}</p>`) } }
        ]
    }
});

// --- Sealing ----------------------------------------------------------------

test('a sealed token opens back to itself and is not readable in storage', () => {
    const sealed = seal('refresh-token-secret');
    assert.equal(open(sealed), 'refresh-token-secret');
    assert.equal(sealed.includes('refresh-token-secret'), false);
});

test('a sealed value that was changed does not open', () => {
    const sealed = seal('refresh-token-secret');
    const [v, iv, tag, data] = sealed.split('.');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 1;
    assert.throws(() => open([v, iv, tag, flipped.toString('base64')].join('.')), /לא הצלחתי לפתוח/);
});

test('sealing is refused without a key', () => {
    assert.throws(() => seal('x', null), /GOOGLE_TOKEN_KEY/);
});

// --- Connecting ---------------------------------------------------------------

test('the consent link asks for the three scopes, offline access and the state', () => {
    const url = new URL(oauth.buildAuthUrl('state-123'));
    assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(url.searchParams.get('state'), 'state-123');
    assert.equal(url.searchParams.get('access_type'), 'offline');
    assert.deepEqual(url.searchParams.get('scope').split(' ').sort(), [...oauth.SCOPES].sort());
    assert.equal(oauth.SCOPES.length, 3);
});

test('a state works once, and only for the person who started it', async () => {
    const user = newUser();
    const state = await oauth.createState(user);
    assert.equal(await oauth.consumeState(state), user);
    assert.equal(await oauth.consumeState(state), null, 'a second use is refused');
    assert.equal(await oauth.consumeState('made-up'), null);
});

test('an old state is refused', async () => {
    const user = newUser();
    const state = await oauth.createState(user, Date.now() - oauth.STATE_TTL_MS - 1000);
    assert.equal(await oauth.consumeState(state), null);
});

test('the access token is refreshed from the stored refresh token', async () => {
    const user = newUser();
    await oauth.saveRefreshToken(user, 'REFRESH-XYZ');
    assert.equal(await oauth.isConnected(user), true);
    const google = fakeGoogle({ refresh: 'ACCESS-ABC' });
    assert.equal(await oauth.accessTokenFor(user, google.fetchImpl), 'ACCESS-ABC');
    const body = new URLSearchParams(google.requests[0].options.body);
    assert.equal(body.get('grant_type'), 'refresh_token');
    assert.equal(body.get('refresh_token'), 'REFRESH-XYZ');
    await oauth.disconnect(user);
    assert.equal(await oauth.isConnected(user), false);
});

test('a user who never connected gets a clear refusal', async () => {
    await assert.rejects(oauth.accessTokenFor(newUser(), fakeGoogle().fetchImpl), { status: 409 });
});

// --- Gmail ------------------------------------------------------------------

test('a multipart message reads its plain text part', () => {
    const parsed = gmail.parseMessage(plainMessage('m1', { text: 'שלום, נדבר מחר' }));
    assert.equal(parsed.body, 'שלום, נדבר מחר');
    assert.equal(parsed.to, 'dana@client.example');
    assert.equal(parsed.subject, 'פגישה');
    assert.equal(parsed.messageId, '<m1@mail.example>');
});

test('an HTML-only message is read as text with its tags removed', () => {
    const html = '<style>p{color:red}</style><p>שלום&nbsp;<b>דנה</b></p><div>תודה &amp; להתראות</div>';
    const payload = { mimeType: 'text/html', body: { data: b64url(html) }, headers: [] };
    assert.equal(gmail.extractText(payload), 'שלום דנה\nתודה & להתראות');
});

test('a subject with line breaks cannot add headers to the outgoing mail', () => {
    const raw = gmail.buildRawMessage({ to: 'dana@client.example', subject: 'נושא\r\nBcc: spy@evil.example', body: 'גוף' });
    const head = Buffer.from(raw, 'base64url').toString('utf8').split('\r\n\r\n')[0];
    assert.equal(head.split('\r\n').filter((line) => line.startsWith('Bcc:')).length, 0);
});

test('a Hebrew subject is encoded, and a bad address is refused', () => {
    const raw = gmail.buildRawMessage({ to: 'dana@client.example', subject: 'פגישה', body: 'x' });
    const head = Buffer.from(raw, 'base64url').toString('utf8');
    assert.match(head, /Subject: =\?UTF-8\?B\?/);
    assert.throws(() => gmail.buildRawMessage({ to: 'not an address', subject: 's', body: 'b' }), /אינה תקינה/);
});

test('a reply carries the thread headers', () => {
    const raw = gmail.buildRawMessage({ to: 'a@b.co', subject: 'Re: x', body: 'y', inReplyTo: '<orig@mail>', references: '<orig@mail>' });
    const head = Buffer.from(raw, 'base64url').toString('utf8');
    assert.match(head, /In-Reply-To: <orig@mail>/);
    assert.match(head, /References: <orig@mail>/);
});

test('listing the inbox returns each message parsed, with the token sent', async () => {
    const google = fakeGoogle({ inbox: [{ id: 'a1', message: plainMessage('a1', { text: 'שאלה' }) }] });
    const messages = await gmail.listInbox({ token: 'T', fetchImpl: google.fetchImpl });
    assert.equal(messages.length, 1);
    assert.equal(messages[0].body, 'שאלה');
    assert.equal(google.requests[0].options.headers.authorization, 'Bearer T');
});

// --- Drafts and the approval gate ---------------------------------------------

async function newDraft(user, extra = {}) {
    return drafts.createDraft(user, { to: 'dana@client.example', subject: 'Re: פגישה', body: 'מתאים לי מחר בעשר', threadId: 'thread-1', inReplyTo: '<orig@mail>', references: '<orig@mail>', ...extra });
}

test('a draft is sent once, to the address stored in it', async () => {
    const user = newUser();
    const draft = await newDraft(user);
    const google = fakeGoogle();
    const sent = await drafts.sendDraft({ userId: user, id: draft.id, token: 'T', fetchImpl: google.fetchImpl });
    assert.equal(sent.status, 'sent');
    assert.equal(google.sent.length, 1);
    assert.equal(google.sent[0].threadId, 'thread-1');
    const raw = Buffer.from(google.sent[0].raw, 'base64url').toString('utf8');
    assert.match(raw, /To: dana@client\.example/);
});

test('sending the same draft again is refused and nothing else goes out', async () => {
    const user = newUser();
    const draft = await newDraft(user);
    const google = fakeGoogle();
    await drafts.sendDraft({ userId: user, id: draft.id, token: 'T', fetchImpl: google.fetchImpl });
    await assert.rejects(drafts.sendDraft({ userId: user, id: draft.id, token: 'T', fetchImpl: google.fetchImpl }), { status: 409 });
    assert.equal(google.sent.length, 1);
});

test('a draft that fails to send goes back to pending so it can be retried', async () => {
    const user = newUser();
    const draft = await newDraft(user);
    const failing = async () => new Response('{}', { status: 500 });
    await assert.rejects(drafts.sendDraft({ userId: user, id: draft.id, token: 'T', fetchImpl: failing }));
    const again = (await drafts.listDrafts(user)).find((item) => item.id === draft.id);
    assert.equal(again.status, 'pending');
    assert.ok(again.lastError);
});

test('a sent or discarded draft cannot be edited or sent', async () => {
    const user = newUser();
    const draft = await newDraft(user);
    await drafts.discardDraft(user, draft.id);
    await assert.rejects(drafts.updateDraftBody(user, draft.id, 'שינוי'), { status: 409 });
    const google = fakeGoogle();
    await assert.rejects(drafts.sendDraft({ userId: user, id: draft.id, token: 'T', fetchImpl: google.fetchImpl }), { status: 409 });
    assert.equal(google.sent.length, 0);
});

test('an edit to a pending draft is kept, and an empty one is refused', async () => {
    const user = newUser();
    const draft = await newDraft(user);
    await drafts.updateDraftBody(user, draft.id, 'נוסח חדש');
    assert.equal((await drafts.listDrafts(user))[0].body, 'נוסח חדש');
    await assert.rejects(drafts.updateDraftBody(user, draft.id, '   '), /ריקה/);
});

test('a draft to an invalid address is never created', async () => {
    await assert.rejects(drafts.createDraft(newUser(), { to: 'nope', body: 'x' }), /אינה תקינה/);
});

test('one user cannot see or send another user\'s draft', async () => {
    const owner = newUser();
    const other = newUser();
    const draft = await newDraft(owner);
    assert.equal((await drafts.listDrafts(other)).length, 0);
    const google = fakeGoogle();
    await assert.rejects(drafts.sendDraft({ userId: other, id: draft.id, token: 'T', fetchImpl: google.fetchImpl }), { status: 404 });
    assert.equal(google.sent.length, 0);
});

// --- Inbox check ------------------------------------------------------------

function fakeClaude(text = 'סיכום: בקשה לפגישה.\nטיוטה: מתאים לי מחר.') {
    const calls = [];
    return {
        calls,
        messages: {
            create: async (params) => {
                calls.push(params);
                return { content: [{ type: 'text', text }] };
            }
        }
    };
}

test('checking the inbox turns each new email into a pending draft and sends nothing', async () => {
    const user = newUser();
    await oauth.saveRefreshToken(user, 'REFRESH');
    const google = fakeGoogle({ inbox: [{ id: 'm-1', message: plainMessage('m-1', { text: 'מתאים לי מחר בעשר?' }) }] });
    const claude = fakeClaude();
    const report = await checkInbox({ userId: user, fetchImpl: google.fetchImpl, client: claude });
    assert.equal(report.drafts.length, 1);
    assert.equal(report.drafts[0].status, 'pending');
    assert.equal(report.drafts[0].to, 'dana@client.example');
    assert.equal(report.drafts[0].subject, 'Re: פגישה');
    assert.equal(report.drafts[0].agentLabel, 'יומן');
    assert.equal(google.sent.length, 0);
    assert.equal(claude.calls.length, 1);
});

test('an email already checked is not turned into a second draft', async () => {
    const user = newUser();
    await oauth.saveRefreshToken(user, 'REFRESH');
    const google = fakeGoogle({ inbox: [{ id: 'm-2', message: plainMessage('m-2') }] });
    const claude = fakeClaude();
    await checkInbox({ userId: user, fetchImpl: google.fetchImpl, client: claude });
    const again = await checkInbox({ userId: user, fetchImpl: google.fetchImpl, client: claude });
    assert.equal(again.drafts.length, 0);
    assert.equal(again.skipped, 1);
    assert.equal(claude.calls.length, 1);
});

test('automated senders are skipped without asking Claude', async () => {
    const user = newUser();
    await oauth.saveRefreshToken(user, 'REFRESH');
    const google = fakeGoogle({ inbox: [{ id: 'm-3', message: plainMessage('m-3', { from: 'noreply@shop.example' }) }] });
    const claude = fakeClaude();
    const report = await checkInbox({ userId: user, fetchImpl: google.fetchImpl, client: claude });
    assert.equal(report.drafts.length, 0);
    assert.equal(claude.calls.length, 0);
});

test('an inbox check is refused for an account that is not connected', async () => {
    await assert.rejects(checkInbox({ userId: newUser(), fetchImpl: fakeGoogle().fetchImpl, client: fakeClaude() }), { status: 409 });
});

// --- Calendar -----------------------------------------------------------------

test('an event must have a real start before its end, and fit in a day', () => {
    const now = Date.parse('2026-11-18T08:00:00Z');
    assert.throws(() => calendar.checkWindow('2026-11-19T10:00:00Z', '2026-11-19T09:00:00Z', now), /אחרי ההתחלה/);
    assert.throws(() => calendar.checkWindow('2026-11-19T08:00:00Z', '2026-11-19T20:00:00Z', now), /ארוך מדי/);
    assert.throws(() => calendar.checkWindow('2026-11-17T08:00:00Z', '2026-11-17T09:00:00Z', now), /בעבר/);
    assert.throws(() => calendar.checkWindow('nope', '2026-11-19T09:00:00Z', now), /אינו תקין/);
    assert.doesNotThrow(() => calendar.checkWindow('2026-11-19T08:00:00Z', '2026-11-19T09:00:00Z', now));
});

test('an event is created with Israel time zone and the given title', async () => {
    const google = fakeGoogle();
    const id = await calendar.createEvent({
        token: 'T',
        title: 'פגישה עם דנה\nBcc: x',
        start: '2026-12-01T08:00:00Z',
        end: '2026-12-01T08:30:00Z',
        now: Date.parse('2026-11-18T08:00:00Z'),
        fetchImpl: google.fetchImpl
    });
    assert.equal(id, 'event-1');
    const body = JSON.parse(google.requests[0].options.body);
    assert.equal(body.start.timeZone, 'Asia/Jerusalem');
    assert.equal(body.summary.includes('\n'), false);
});

test('listing events maps them to title and times', async () => {
    const google = fakeGoogle();
    const events = await calendar.listEvents({ token: 'T', from: '2026-12-01T00:00:00Z', to: '2026-12-02T00:00:00Z', fetchImpl: google.fetchImpl });
    assert.deepEqual(events[0], { id: 'e1', title: 'ישיבה', start: '2026-12-01T10:00:00+02:00', end: '2026-12-01T11:00:00+02:00' });
});
