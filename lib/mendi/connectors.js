// The outside services MENDI AI talks to. Each one is optional: the command
// room shows which are connected, and an agent whose service is missing still
// works on what you paste and says which key to add.
//
//   zoom      — cloud-recording transcripts and participants (Server-to-Server OAuth app)
//   email     — sending mail through Resend
//   whatsapp  — sending messages through the WhatsApp Business Cloud API
//
// Every host can be pointed at a fixture server for tests (*_HOST variables).

export const CONNECTORS = [
    {
        id: 'zoom',
        label: 'Zoom',
        env: ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
        help: 'אפליקציית Server-to-Server OAuth ב-marketplace.zoom.us עם הרשאות cloud_recording:read ו-meeting:read.'
    },
    {
        id: 'email',
        label: 'מייל (Resend)',
        env: ['RESEND_API_KEY', 'MENDI_EMAIL_FROM'],
        help: 'מפתח מ-resend.com ודומיין מאומת. MENDI_EMAIL_FROM הוא השולח, למשל "מנדי <mendi@your-domain.co.il>".'
    },
    {
        id: 'whatsapp',
        label: 'WhatsApp Business',
        env: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
        help: 'מ-developers.facebook.com: אפליקציה עם WhatsApp, טוקן קבוע ו-Phone number ID.'
    }
];

const emailFrom = () => process.env.MENDI_EMAIL_FROM || process.env.EMAIL_FROM;

export function isConnected(id) {
    if (id === 'email') return Boolean(process.env.RESEND_API_KEY && emailFrom());
    const connector = CONNECTORS.find((item) => item.id === id);
    return Boolean(connector && connector.env.every((name) => process.env[name]));
}

export function connectorStatus() {
    return CONNECTORS.map((connector) => ({
        id: connector.id,
        label: connector.label,
        connected: isConnected(connector.id),
        env: connector.env,
        help: connector.help
    }));
}

export class ConnectorError extends Error {
    constructor(message, detail) {
        super(message);
        this.detail = detail;
    }
}

function notConnected(id) {
    const connector = CONNECTORS.find((item) => item.id === id);
    return new ConnectorError(
        `${connector.label} is not connected on this site. The owner must set ${connector.env.join(', ')} in the site's environment variables.`
    );
}

async function failure(response, service) {
    const text = await response.text().catch(() => '');
    let detail = text.slice(0, 300);
    try {
        const data = JSON.parse(text);
        detail = data.message || data.error?.message || data.reason || detail;
    } catch {}
    return new ConnectorError(`${service} answered ${response.status}.`, String(detail).slice(0, 300));
}

// --- Zoom ------------------------------------------------------------------

const zoomApi = () => process.env.ZOOM_API_HOST || 'https://api.zoom.us';
const zoomOauth = () => process.env.ZOOM_OAUTH_HOST || 'https://zoom.us';

let zoomToken = null;

async function zoomAccessToken(now = Date.now()) {
    if (!isConnected('zoom')) throw notConnected('zoom');
    if (zoomToken && zoomToken.expiresAt - 60_000 > now) return zoomToken.value;
    const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${zoomOauth()}/oauth/token`, {
        method: 'POST',
        headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'account_credentials', account_id: process.env.ZOOM_ACCOUNT_ID })
    });
    if (!response.ok) throw await failure(response, 'Zoom sign-in');
    const data = await response.json();
    zoomToken = { value: data.access_token, expiresAt: now + (data.expires_in ?? 3600) * 1000 };
    return zoomToken.value;
}

async function zoomGet(path) {
    const token = await zoomAccessToken();
    const response = await fetch(`${zoomApi()}/v2${path}`, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) throw await failure(response, 'Zoom');
    return response.json();
}

// A meeting UUID that starts with "/" or contains "//" must be encoded twice
// in a path, as Zoom documents.
export function zoomMeetingPath(uuid) {
    const value = String(uuid);
    return value.startsWith('/') || value.includes('//')
        ? encodeURIComponent(encodeURIComponent(value))
        : encodeURIComponent(value);
}

const isoDay = (time) => new Date(time).toISOString().slice(0, 10);

export async function listZoomRecordings({ days = 7 } = {}, now = Date.now()) {
    const from = isoDay(now - days * 86_400_000);
    const data = await zoomGet(`/users/me/recordings?from=${from}&to=${isoDay(now)}&page_size=30`);
    return (data.meetings ?? []).map((meeting) => ({
        meeting_uuid: meeting.uuid,
        meeting_id: meeting.id,
        topic: meeting.topic,
        start_time: meeting.start_time,
        duration_minutes: meeting.duration,
        has_transcript: (meeting.recording_files ?? []).some(
            (file) => file.file_type === 'TRANSCRIPT' && file.status !== 'processing'
        )
    }));
}

// Zoom transcripts are WebVTT: numbered cues, timings, and "Name: words"
// lines. What the agent needs is who said what, so cue numbers and timings
// go, and consecutive lines by the same speaker join into one.
export function vttToText(vtt) {
    const lines = [];
    for (const raw of String(vtt).split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line === 'WEBVTT' || /^\d+$/.test(line) || line.includes('-->')) continue;
        const match = line.match(/^([^:]{1,60}):\s*(.*)$/);
        const speaker = match ? match[1] : null;
        const words = match ? match[2] : line;
        const last = lines.at(-1);
        if (last && last.speaker === speaker) last.words += ` ${words}`;
        else lines.push({ speaker, words });
    }
    return lines.map((item) => (item.speaker ? `${item.speaker}: ${item.words}` : item.words)).join('\n');
}

export const MAX_TRANSCRIPT_CHARS = 120_000;

export async function getZoomTranscript(uuid) {
    const path = zoomMeetingPath(uuid);
    const meeting = await zoomGet(`/meetings/${path}/recordings`);
    const file = (meeting.recording_files ?? []).find((item) => item.file_type === 'TRANSCRIPT');
    if (!file) {
        throw new ConnectorError(
            'This recording has no transcript. In Zoom, turn on "Audio transcript" under cloud recording settings; transcripts appear a while after the meeting ends.'
        );
    }
    const token = await zoomAccessToken();
    // The download link redirects to storage on another host, which drops an
    // Authorization header; Zoom accepts the token as a query parameter.
    const link = new URL(file.download_url);
    link.searchParams.set('access_token', token);
    const response = await fetch(link);
    if (!response.ok) throw await failure(response, 'Zoom transcript download');
    const text = vttToText(await response.text());

    let participants = [];
    try {
        const data = await zoomGet(`/past_meetings/${path}/participants?page_size=100`);
        const seen = new Set();
        for (const person of data.participants ?? []) {
            const key = person.user_email || person.name;
            if (!key || seen.has(key)) continue;
            seen.add(key);
            participants.push({ name: person.name, email: person.user_email || null });
        }
    } catch {
        // Participant emails need an extra scope (and a paid plan); the
        // transcript is still useful without them.
        participants = null;
    }

    return {
        topic: meeting.topic,
        start_time: meeting.start_time,
        duration_minutes: meeting.duration,
        participants,
        transcript: text.slice(0, MAX_TRANSCRIPT_CHARS),
        truncated: text.length > MAX_TRANSCRIPT_CHARS
    };
}

// Test hook.
export function resetZoomToken() {
    zoomToken = null;
}

// --- Email (Resend) --------------------------------------------------------

function escapeHtml(text) {
    return String(text).replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
}

// The agents write plain text with light Markdown (paragraphs, "- " bullets,
// **bold**). The mail goes out right-to-left, as both HTML and plain text.
export function emailHtml(body) {
    const blocks = String(body).trim().split(/\n{2,}/);
    const inline = (text) => escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const html = blocks
        .map((block) => {
            const lines = block.split('\n');
            if (lines.every((line) => /^\s*[-•*]\s+/.test(line))) {
                const items = lines.map((line) => `<li>${inline(line.replace(/^\s*[-•*]\s+/, ''))}</li>`).join('');
                return `<ul style="margin:0 0 14px;padding-right:20px">${items}</ul>`;
            }
            return `<p style="margin:0 0 14px">${lines.map(inline).join('<br>')}</p>`;
        })
        .join('');
    return `<!DOCTYPE html><html dir="rtl" lang="he"><body style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:15px;line-height:1.6"><div style="max-width:620px;margin:0 auto;padding:24px 18px;text-align:right">${html}</div></body></html>`;
}

export async function sendEmail({ to, cc = [], subject, body, attachments = [] }) {
    if (!isConnected('email')) throw notConnected('email');
    const response = await fetch(`${process.env.RESEND_API_URL || 'https://api.resend.com'}/emails`, {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
            from: emailFrom(),
            to,
            ...(cc.length ? { cc } : {}),
            subject,
            html: emailHtml(body),
            text: body,
            ...(attachments.length
                ? {
                      attachments: attachments.map((file) => ({
                          filename: file.name,
                          content: Buffer.from(file.data).toString('base64')
                      }))
                  }
                : {})
        })
    });
    if (!response.ok) throw await failure(response, 'Resend');
    const data = await response.json().catch(() => ({}));
    return { providerId: data.id ?? null };
}

// --- WhatsApp Business Cloud API -------------------------------------------

const whatsappApi = () => process.env.WHATSAPP_API_HOST || 'https://graph.facebook.com';

async function whatsappSend(payload) {
    const response = await fetch(
        `${whatsappApi()}/v21.0/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID)}/messages`,
        {
            method: 'POST',
            headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', ...payload })
        }
    );
    if (!response.ok) throw await failure(response, 'WhatsApp');
    const data = await response.json().catch(() => ({}));
    return data.messages?.[0]?.id ?? null;
}

// Sends the text, then each attachment as a document WhatsApp downloads from
// its link. Outside the 24 hours after a person last wrote to you, WhatsApp
// delivers only approved template messages, and reports that as an error.
export async function sendWhatsApp({ to, text, documents = [] }) {
    if (!isConnected('whatsapp')) throw notConnected('whatsapp');
    const ids = [];
    for (const number of to) {
        const recipient = number.replace(/[^\d]/g, '');
        ids.push(await whatsappSend({ to: recipient, type: 'text', text: { body: text, preview_url: true } }));
        for (const document of documents) {
            ids.push(
                await whatsappSend({
                    to: recipient,
                    type: 'document',
                    document: { link: document.url, filename: document.name }
                })
            );
        }
    }
    return { providerId: ids.filter(Boolean).join(',') || null };
}
