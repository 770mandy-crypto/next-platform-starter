// Reading the inbox and sending mail through the Gmail API. Everything here
// takes an access token and a fetch function, so the tests can stand in for
// Google. Sending is only ever called from the approval path in drafts.js.

const gmailHost = () => (process.env.GOOGLE_GMAIL_HOST || 'https://gmail.googleapis.com').replace(/\/$/, '');
const TIMEOUT_MS = 20_000;
export const MAX_BODY_CHARS = 12_000;
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

export class GmailError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

async function api(path, { token, method = 'GET', body, fetchImpl = fetch }) {
    const response = await fetchImpl(`${gmailHost()}${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!response.ok) throw new GmailError('Gmail לא ענה כמצופה. נסו שוב.', response.status === 401 ? 409 : 502);
    return response.json();
}

// Gmail sends bodies as base64url; this reads them as UTF-8 text.
export function decodeBase64Url(data = '') {
    return Buffer.from(String(data).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

export function stripHtml(html) {
    return String(html)
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/[ \t]*\n[ \t]*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// The readable text of a message: the plain-text part if there is one,
// otherwise the HTML part with its tags removed.
export function extractText(payload) {
    const plain = findPart(payload, 'text/plain');
    if (plain) return decodeBase64Url(plain.body.data);
    const html = findPart(payload, 'text/html');
    if (html) return stripHtml(decodeBase64Url(html.body.data));
    return '';
}

function findPart(part, mimeType) {
    if (!part) return null;
    if (part.mimeType === mimeType && part.body?.data) return part;
    for (const child of part.parts ?? []) {
        const found = findPart(child, mimeType);
        if (found) return found;
    }
    return null;
}

const header = (payload, name) =>
    (payload?.headers ?? []).find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

// The address inside a "Name <address>" header, or the header itself.
export function addressOf(from = '') {
    const match = String(from).match(/<([^>]+)>/);
    return (match ? match[1] : String(from)).trim();
}

export function parseMessage(message) {
    const body = extractText(message.payload).slice(0, MAX_BODY_CHARS);
    return {
        id: message.id,
        threadId: message.threadId,
        from: header(message.payload, 'From'),
        to: addressOf(header(message.payload, 'From')),
        subject: header(message.payload, 'Subject'),
        messageId: header(message.payload, 'Message-ID'),
        date: header(message.payload, 'Date'),
        body
    };
}

// The newest messages in the inbox from the last two days.
export async function listInbox({ token, max = 5, fetchImpl = fetch }) {
    const query = encodeURIComponent('in:inbox newer_than:2d');
    const list = await api(`/gmail/v1/users/me/messages?q=${query}&maxResults=${Math.min(max, 20)}`, { token, fetchImpl });
    const ids = (list.messages ?? []).map((item) => item.id);
    const messages = await Promise.all(
        ids.map((id) => api(`/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`, { token, fetchImpl }))
    );
    return messages.map(parseMessage);
}

// Header values cannot hold line breaks; a newline in a subject would let the
// sender add headers of their own.
const headerSafe = (value) => String(value).replace(/[\r\n]+/g, ' ').trim();

function encodeHeader(value) {
    const clean = headerSafe(value);
    return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
}

// A plain-text message, base64url-encoded as Gmail expects.
export function buildRawMessage({ to, subject, body, inReplyTo = '', references = '' }) {
    const address = headerSafe(to);
    if (!EMAIL.test(address)) throw new GmailError('כתובת הנמען אינה תקינה.', 400);
    const lines = [
        `To: ${address}`,
        `Subject: ${encodeHeader(subject)}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: base64'
    ];
    if (inReplyTo) lines.push(`In-Reply-To: ${headerSafe(inReplyTo)}`, `References: ${headerSafe(references || inReplyTo)}`);
    const encodedBody = Buffer.from(String(body), 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
    return Buffer.from(`${lines.join('\r\n')}\r\n\r\n${encodedBody}`, 'utf8').toString('base64url');
}

export async function sendMessage({ token, to, subject, body, threadId, inReplyTo, references, fetchImpl = fetch }) {
    const raw = buildRawMessage({ to, subject, body, inReplyTo, references });
    const sent = await api('/gmail/v1/users/me/messages/send', {
        token,
        method: 'POST',
        body: threadId ? { raw, threadId } : { raw },
        fetchImpl
    });
    return sent.id;
}

export const isValidAddress = (value) => EMAIL.test(headerSafe(value));
