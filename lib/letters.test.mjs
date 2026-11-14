// Offline checks for the official-letter writer. A fixture server streams
// Claude responses (server-sent events, as the real API does), built from
// whole message objects so each test reads as "Claude answered this".
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

const claude = { requests: [], replies: [] };

// One message → the stream of events the Messages API sends for it.
function toEvents(message) {
    const events = [['message_start', { type: 'message_start', message: { ...message, content: [], stop_reason: null } }]];
    message.content.forEach((block, index) => {
        if (block.type === 'text') {
            events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }]);
            events.push(['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } }]);
        } else if (block.type === 'tool_use') {
            events.push(['content_block_start', { type: 'content_block_start', index, content_block: { ...block, input: {} } }]);
            events.push(['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } }]);
        } else {
            events.push(['content_block_start', { type: 'content_block_start', index, content_block: block }]);
        }
        events.push(['content_block_stop', { type: 'content_block_stop', index }]);
    });
    events.push(['message_delta', { type: 'message_delta', delta: { stop_reason: message.stop_reason, stop_sequence: null, ...(message.container ? { container: message.container } : {}) }, usage: { output_tokens: 5 } }]);
    events.push(['message_stop', { type: 'message_stop' }]);
    return events;
}

const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    claude.requests.push(JSON.parse(body));
    const next = claude.replies.shift();
    if (!next) {
        res.writeHead(500, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'no scripted reply' } }));
    }
    const message = { id: 'msg', type: 'message', role: 'assistant', model: 'm', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 }, ...next };
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    for (const [name, data] of toEvents(message)) res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
    res.end();
});
await new Promise((resolve) => server.listen(0, resolve));
process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
process.env.ANTHROPIC_API_KEY = 'test-key';
test.after(() => server.close());

const { writeLetter, buildUserContent } = await import('./letters/writer.js');
const { parseLetterRequest, RequestError } = await import('./letters/request.js');

const LETTER = {
    recipient: { name: 'עיריית חולון', department: 'מחלקת חניה', address: 'ת.ד. 12, חולון' },
    subject: 'ערעור על דוח חניה מס׳ [מספר הדוח]',
    reference: '',
    salutation: 'שלום רב,',
    paragraphs: ['ביום 3.11.2026 חניתי ברחוב הרצל.', 'השלט היה מכוסה בענפים.'],
    requests: ['לבטל את הדוח בתוך 30 יום.'],
    closing: 'בכבוד רב,',
    enclosures: ['צילום השלט'],
    guide: {
        summary: 'שלט שאינו נראה לעין אינו מחייב.',
        howToSend: ['באתר העירייה, בטופס ערעור.'],
        deadline: '90 יום ממסירת הדוח',
        sources: [
            { title: 'כל זכות', url: 'https://www.kolzchut.org.il/he/parking' },
            { title: 'bad', url: 'javascript:alert(1)' }
        ]
    },
    placeholders: ['[מספר הדוח]']
};

const search = (id) => [
    { type: 'server_tool_use', id, name: 'web_search', input: { query: 'ערעור דוח חניה שלט מוסתר' } },
    { type: 'web_search_tool_result', tool_use_id: id, content: [] }
];
const fetched = (id, url, title) => [
    { type: 'server_tool_use', id, name: 'web_fetch', input: { url } },
    { type: 'web_fetch_tool_result', tool_use_id: id, content: { type: 'web_fetch_result', url, content: { type: 'document', title, source: { type: 'text', media_type: 'text/plain', data: '…' } } } }
];
const writeCall = (input = LETTER) => ({ type: 'tool_use', id: 'toolu_1', name: 'write_letter', input });

const INPUT = { kind: 'parking', situation: 'קיבלתי דוח חניה כשהשלט היה מכוסה.', recipientHint: 'עיריית חולון', senderName: 'דנה כהן', attachment: null };

async function run(input = INPUT) {
    const events = [];
    for await (const event of writeLetter({ input, now: Date.UTC(2026, 10, 15, 8) })) events.push(event);
    return events;
}

function reset() {
    claude.requests.length = 0;
    claude.replies.length = 0;
}

test('the writer researches, then delivers the letter with its sources', async () => {
    reset();
    claude.replies.push({
        content: [...search('srv_1'), ...fetched('srv_2', 'https://www.gov.il/he/parking-appeal', 'ערעור על דוח חניה'), writeCall()],
        stop_reason: 'tool_use'
    });
    const events = await run();
    assert.deepEqual(
        events.map((e) => e.type),
        ['searching', 'reading', 'source', 'writing', 'letter']
    );
    const { letter } = events.at(-1);
    assert.equal(letter.recipient.name, 'עיריית חולון');
    // The letter's own sources plus pages read during research; unsafe links dropped.
    assert.deepEqual(
        letter.guide.sources.map((s) => s.url),
        ['https://www.kolzchut.org.il/he/parking', 'https://www.gov.il/he/parking-appeal']
    );

    const [request] = claude.requests;
    assert.deepEqual(request.tools.map((t) => t.name), ['web_search', 'web_fetch', 'write_letter']);
    assert.match(request.system, /15 בנובמבר 2026/);
    const text = request.messages[0].content.at(-1).text;
    assert.match(text, /ערעור על דוח חניה/);
    assert.match(text, /<situation>\nקיבלתי דוח חניה/);
});

test('a paused research turn is resumed in the same sandbox', async () => {
    reset();
    claude.replies.push(
        { content: search('srv_1'), stop_reason: 'pause_turn', container: { id: 'cntr_9', expires_at: '2026-12-01T00:00:00Z' } },
        { content: [writeCall()], stop_reason: 'tool_use' }
    );
    const events = await run();
    assert.equal(events.at(-1).type, 'letter');
    const resumed = claude.requests[1];
    assert.equal(resumed.container, 'cntr_9');
    assert.equal(resumed.messages.length, 2, 'the paused reply is sent back with no extra user turn');
    assert.equal(resumed.messages[1].role, 'assistant');
});

test('a reply that forgets to call write_letter is nudged once', async () => {
    reset();
    claude.replies.push({ content: [{ type: 'text', text: 'הנה המכתב: …' }], stop_reason: 'end_turn' }, { content: [writeCall()], stop_reason: 'tool_use' });
    assert.equal((await run()).at(-1).type, 'letter');
    assert.equal(claude.requests[1].messages.at(-1).content, 'Now write the letter by calling write_letter.');

    reset();
    claude.replies.push({ content: [{ type: 'text', text: 'א' }], stop_reason: 'end_turn' }, { content: [{ type: 'text', text: 'ב' }], stop_reason: 'end_turn' });
    assert.equal((await run()).at(-1).type, 'failed');
    assert.equal(claude.requests.length, 2, 'only one nudge');
});

test('a letter in the wrong shape fails, and a refusal is reported', async () => {
    reset();
    claude.replies.push({ content: [writeCall({ ...LETTER, paragraphs: [] })], stop_reason: 'tool_use' });
    assert.equal((await run()).at(-1).type, 'failed');

    reset();
    claude.replies.push({ content: [], stop_reason: 'refusal' });
    assert.equal((await run()).at(-1).type, 'refused');
});

test('an attached PDF or photo is passed as a document or an image', () => {
    const pdf = buildUserContent({ ...INPUT, attachment: { name: 'דוח.pdf', type: 'application/pdf', data: 'JVBERi0=' } });
    assert.equal(pdf[0].type, 'document');
    assert.equal(pdf[0].source.media_type, 'application/pdf');
    assert.match(pdf.at(-1).text, /Attached: דוח\.pdf/);
    const photo = buildUserContent({ ...INPUT, attachment: { name: 'a.jpg', type: 'image/jpeg', data: '/9j/' } });
    assert.equal(photo[0].type, 'image');
});

test('requests are checked before any paid work, and only the name reaches Claude', () => {
    const parsed = parseLetterRequest({
        kind: 'parking',
        situation: '  קיבלתי דוח חניה כשהשלט היה מכוסה בענפים.  ',
        senderName: 'דנה',
        senderId: '123456789',
        address: 'רחוב 1'
    });
    assert.deepEqual(Object.keys(parsed).sort(), ['attachment', 'kind', 'recipientHint', 'senderName', 'situation']);
    assert.equal(parsed.situation, 'קיבלתי דוח חניה כשהשלט היה מכוסה בענפים.');
    assert.equal(parseLetterRequest({ kind: 'constructor', situation: 'x'.repeat(20) }).kind, 'other', 'unknown kinds fall back');

    const bad = (body, pattern) => assert.throws(() => parseLetterRequest(body), (e) => e instanceof RequestError && pattern.test(e.message));
    bad(null, /לא תקינה/);
    bad({ situation: 'קצר' }, /ספרו/);
    bad({ situation: 'x'.repeat(20), attachment: { type: 'text/html', data: 'aaaa' } }, /תמונה/);
    bad({ situation: 'x'.repeat(20), attachment: { type: 'image/png', data: 'not base64!' } }, /לא תקין/);
    bad({ situation: 'x'.repeat(20), attachment: { type: 'image/png', data: 'A'.repeat(5_000_000) } }, /גדול מדי/);
});
