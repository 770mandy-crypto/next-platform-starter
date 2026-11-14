// The WhatsApp Business Cloud API (Meta), and the speech-to-text service used
// for voice notes. Everything that talks to the outside world lives here, so the
// engine and its tests deal only in plain objects.
//
// Settings (Netlify → Site configuration → Environment variables):
//   WHATSAPP_TOKEN            permanent access token of a system user
//   WHATSAPP_PHONE_NUMBER_ID  the business number's id (not the number itself)
//   WHATSAPP_VERIFY_TOKEN     any string; typed again in Meta's webhook setup
//   WHATSAPP_APP_SECRET       the app's secret, to check webhook signatures
//   WHATSAPP_REMINDER_TEMPLATE  optional: an approved template with one body
//                             variable, for reminders outside the 24-hour window
//   WHATSAPP_TEMPLATE_LANGUAGE  optional, default "he"
//   ELEVENLABS_API_KEY        optional: turns voice notes into text
//
// Hosts can be pointed at fixture servers (WHATSAPP_GRAPH_HOST,
// ELEVENLABS_HOST), which is how the tests run without network access.

import { createHmac, timingSafeEqual } from 'node:crypto';

const TIMEOUT_MS = 20_000;
// WhatsApp refuses a text body longer than this.
export const MAX_TEXT = 4096;
// Media the agent will download: a voice note or a photo of a document.
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

const graphHost = () => (process.env.WHATSAPP_GRAPH_HOST || 'https://graph.facebook.com').replace(/\/$/, '');
const graphVersion = () => process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
const elevenHost = () => (process.env.ELEVENLABS_HOST || 'https://api.elevenlabs.io').replace(/\/$/, '');

export class WhatsAppError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

export function isWhatsAppConfigured() {
    return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export function canTranscribe() {
    return Boolean(process.env.ELEVENLABS_API_KEY);
}

// --- Webhook ---------------------------------------------------------------

// Meta signs every delivery with the app secret: "sha256=<hex hmac of body>".
export function verifySignature({ secret, header, payload }) {
    if (!secret || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
    const expected = Buffer.from(createHmac('sha256', secret).update(payload).digest('hex'));
    const given = Buffer.from(header.slice('sha256='.length));
    return expected.length === given.length && timingSafeEqual(expected, given);
}

// Flattens a webhook delivery into the messages people sent. Delivery receipts
// ("statuses") and kinds of message the agent does not handle are skipped by
// the caller through `type`.
export function parseWebhook(payload) {
    const messages = [];
    for (const entry of payload?.entry ?? []) {
        for (const change of entry?.changes ?? []) {
            const value = change?.value;
            if (!value || !Array.isArray(value.messages)) continue;
            const names = new Map((value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? null]));
            for (const m of value.messages) {
                if (typeof m?.id !== 'string' || typeof m?.from !== 'string') continue;
                const media = m[m.type] && typeof m[m.type] === 'object' ? m[m.type] : {};
                messages.push({
                    id: m.id,
                    from: m.from,
                    name: names.get(m.from) ?? null,
                    type: m.type,
                    timestamp: Number(m.timestamp) * 1000 || Date.now(),
                    text: m.type === 'text' ? String(m.text?.body ?? '') : m.type === 'button' ? String(m.button?.text ?? '') : null,
                    caption: typeof media.caption === 'string' ? media.caption : null,
                    mediaId: typeof media.id === 'string' ? media.id : null,
                    mimeType: typeof media.mime_type === 'string' ? media.mime_type : null,
                    filename: typeof media.filename === 'string' ? media.filename : null
                });
            }
        }
    }
    return messages;
}

// --- Sending ---------------------------------------------------------------

async function graph(path, { method = 'POST', body } = {}) {
    let response;
    try {
        response = await fetch(`${graphHost()}/${graphVersion()}/${path}`, {
            method,
            headers: {
                authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                ...(body ? { 'content-type': 'application/json' } : {})
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
    } catch (error) {
        throw new WhatsAppError(`WhatsApp is unreachable: ${error.message}`);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = data?.error?.message ?? `HTTP ${response.status}`;
        throw new WhatsAppError(`WhatsApp refused the request: ${detail}`, response.status);
    }
    return data;
}

const messagesPath = () => `${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Long replies are split on paragraph or line breaks so no piece is cut
// mid-sentence where it can be avoided.
export function splitText(text, max = MAX_TEXT) {
    const parts = [];
    let rest = String(text).trim();
    while (rest.length > max) {
        const window = rest.slice(0, max);
        let cut = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('\n'));
        if (cut < max / 2) cut = window.lastIndexOf(' ');
        if (cut < max / 2) cut = max;
        parts.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    return parts;
}

export async function sendText(to, text) {
    for (const body of splitText(text)) {
        await graph(messagesPath(), {
            body: { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body, preview_url: false } }
        });
    }
}

// A message outside the 24-hour customer-service window must be an approved
// template. The reminder template has one body variable: the reminder text.
export async function sendTemplate(to, { name, language, params }) {
    await graph(messagesPath(), {
        body: {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
                name,
                language: { code: language },
                components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }]
            }
        }
    });
}

// Marks the message read (blue ticks) and shows "typing…" while the agent
// works. Cosmetic: a failure here never stops the reply.
export async function markReadAndTyping(messageId) {
    try {
        await graph(messagesPath(), {
            body: { messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } }
        });
    } catch (error) {
        console.warn('WhatsApp typing indicator failed:', error.message);
    }
}

// --- Media -----------------------------------------------------------------

// Two steps: the media id resolves to a short-lived URL, which is then fetched
// with the same token.
export async function downloadMedia(mediaId) {
    if (!/^[\w.-]{1,128}$/.test(mediaId)) throw new WhatsAppError('Bad media id.', 400);
    const info = await graph(mediaId, { method: 'GET' });
    if (!info?.url) throw new WhatsAppError('WhatsApp returned no media URL.');
    if (Number(info.file_size) > MAX_MEDIA_BYTES) throw new WhatsAppError('The file is too large.', 413);
    let response;
    try {
        response = await fetch(info.url, {
            headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
    } catch (error) {
        throw new WhatsAppError(`Media download failed: ${error.message}`);
    }
    if (!response.ok) throw new WhatsAppError(`Media download failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_MEDIA_BYTES) throw new WhatsAppError('The file is too large.', 413);
    return { bytes, mimeType: info.mime_type || response.headers.get('content-type') || 'application/octet-stream' };
}

// Voice note → text, with ElevenLabs Scribe (handles Hebrew well).
export async function transcribe({ bytes, mimeType }) {
    const form = new FormData();
    form.append('model_id', process.env.WHATSAPP_STT_MODEL || 'scribe_v1');
    form.append('file', new Blob([bytes], { type: mimeType }), 'voice.ogg');
    let response;
    try {
        response = await fetch(`${elevenHost()}/v1/speech-to-text`, {
            method: 'POST',
            headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
            body: form,
            signal: AbortSignal.timeout(60_000)
        });
    } catch (error) {
        throw new WhatsAppError(`Transcription failed: ${error.message}`);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new WhatsAppError(`Transcription failed: HTTP ${response.status}`);
    return String(data?.text ?? '').trim();
}
