// The Recall.ai meeting-bot API: the service that actually joins a Google
// Meet, Zoom or Teams call as a participant. Everything here follows
// https://docs.recall.ai — one bot per meeting, created with a webhook that
// receives the live transcript, and driven with three calls: send a chat
// message, play an mp3, leave.
//
// RECALL_HOST can point at a fixture server, which is how the tests run this
// file without a key or network access.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { SILENT_MP3_B64 } from './silence.js';

const TIMEOUT_MS = 20_000;
// Recall's cap on one mp3, as base64 characters.
export const MAX_AUDIO_B64 = 1_835_008;

export const REGIONS = ['us-west-2', 'us-east-1', 'eu-central-1', 'ap-northeast-1'];

// Languages a meeting's own captions can be switched to (Recall's enum).
export const CAPTION_LANGUAGES = [
    'cs', 'de', 'en', 'es', 'fil', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl',
    'pl', 'pt', 'pt-BR', 'ro', 'ru', 'sv', 'th', 'tr', 'uk', 'vi', 'zh'
];

export const REALTIME_EVENTS = ['transcript.data', 'participant_events.chat_message'];

export class RecallError extends Error {
    constructor(message, { status = 502, detail = null } = {}) {
        super(message);
        this.status = status;
        this.detail = detail;
    }
}

export function isRecallConfigured() {
    return Boolean(process.env.RECALL_API_KEY);
}

export function recallHost() {
    if (process.env.RECALL_HOST) return process.env.RECALL_HOST.replace(/\/$/, '');
    const region = REGIONS.includes(process.env.RECALL_REGION) ? process.env.RECALL_REGION : 'us-west-2';
    return `https://${region}.recall.ai`;
}

// Which meeting platform a link belongs to, or null if it is not a meeting
// link this bot can join.
export function meetingPlatform(url) {
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (host === 'meet.google.com') return 'google_meet';
    if (host === 'zoom.us' || host.endsWith('.zoom.us')) return 'zoom';
    if (host === 'teams.microsoft.com' || host === 'teams.live.com') return 'teams';
    return null;
}

// How the meeting is transcribed live. The meeting's own captions are the
// default: free, a second or two behind, and they support Hebrew. Recall's
// built-in engine is only real-time in English; ElevenLabs and Deepgram work
// in any language but need that provider's key added in the Recall dashboard.
export function transcriptProvider(language, choice = process.env.RECALL_TRANSCRIPT) {
    switch (choice) {
        case 'elevenlabs':
            return { elevenlabs_streaming: { model_id: 'scribe_v2_realtime' } };
        case 'deepgram':
            return { deepgram_streaming: { model: 'nova-3' } };
        case 'recallai':
            return { recallai_streaming: { mode: 'prioritize_low_latency', language_code: 'en' } };
        default:
            return { meeting_captions: CAPTION_LANGUAGES.includes(language) ? { language_code: language } : {} };
    }
}

async function call(path, { method = 'GET', body } = {}) {
    const key = process.env.RECALL_API_KEY;
    if (!key) throw new RecallError('Recall.ai לא מחובר: צריך להגדיר את RECALL_API_KEY בהגדרות האתר.', { status: 503 });

    let response;
    try {
        response = await fetch(`${recallHost()}${path}`, {
            method,
            headers: {
                authorization: `Token ${key}`,
                accept: 'application/json',
                ...(body ? { 'content-type': 'application/json' } : {})
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
    } catch (error) {
        throw new RecallError('Recall.ai לא ענה. נסו שוב בעוד רגע.', { detail: error?.message ?? null });
    }
    const text = await response.text().catch(() => '');
    if (!response.ok) {
        const message =
            response.status === 401 || response.status === 403
                ? 'Recall.ai דחה את המפתח. בדקו ש-RECALL_API_KEY נכון ושה-RECALL_REGION תואם לאזור של החשבון.'
                : response.status === 507
                  ? 'אין כרגע בוט פנוי אצל Recall.ai. נסו שוב בעוד דקה.'
                  : `Recall.ai החזיר שגיאה ${response.status}.`;
        throw new RecallError(message, {
            status: response.status === 429 ? 429 : response.status === 507 ? 503 : 502,
            detail: text.slice(0, 400) || null
        });
    }
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        throw new RecallError('Recall.ai החזיר תשובה לא תקינה.');
    }
}

// The Create Bot request body. Separate from createBot so tests can check it.
export function botRequest({ meetingUrl, botName, hookUrl, language, joinMessage, greetingMp3, metadata }) {
    return {
        meeting_url: meetingUrl,
        bot_name: botName,
        recording_config: {
            transcript: { provider: transcriptProvider(language) },
            realtime_endpoints: [{ type: 'webhook', url: hookUrl, events: REALTIME_EVENTS }]
        },
        // Needed for on-demand speech later; doubles as the spoken greeting.
        automatic_audio_output: {
            in_call_recording: { data: { kind: 'mp3', b64_data: greetingMp3 || SILENT_MP3_B64 } }
        },
        ...(joinMessage ? { chat: { on_bot_join: { send_to: 'everyone', message: joinMessage, pin: false } } } : {}),
        automatic_leave: { waiting_room_timeout: 600, noone_joined_timeout: 600 },
        metadata
    };
}

export async function createBot(options) {
    const bot = await call('/api/v1/bot/', { method: 'POST', body: botRequest(options) });
    if (!bot?.id) throw new RecallError('Recall.ai לא החזיר מזהה בוט.');
    return bot;
}

export async function getBot(botId) {
    return call(`/api/v1/bot/${encodeURIComponent(botId)}/`);
}

export async function sendChatMessage(botId, message) {
    return call(`/api/v1/bot/${encodeURIComponent(botId)}/send_chat_message/`, {
        method: 'POST',
        body: { to: 'everyone', message }
    });
}

export async function outputAudio(botId, mp3) {
    const b64 = Buffer.from(mp3).toString('base64');
    if (b64.length > MAX_AUDIO_B64) throw new RecallError('קטע הדיבור ארוך מדי להשמעה בפגישה.', { status: 413 });
    return call(`/api/v1/bot/${encodeURIComponent(botId)}/output_audio/`, {
        method: 'POST',
        body: { kind: 'mp3', b64_data: b64 }
    });
}

export async function leaveCall(botId) {
    return call(`/api/v1/bot/${encodeURIComponent(botId)}/leave_call/`, { method: 'POST' });
}

// The latest lifecycle code of a bot ('joining_call', 'in_call_recording',
// 'done', 'fatal', ...), from the status history Recall returns with it.
export function latestStatus(bot) {
    const last = bot?.status_changes?.at?.(-1);
    return last?.code ? { code: last.code, subCode: last.sub_code ?? null } : null;
}

// Checks the signature Recall puts on webhooks once a workspace verification
// secret exists (headers webhook-id / webhook-timestamp / webhook-signature;
// older accounts send the same three as svix-*). Returns true or false.
const MAX_SKEW_SECONDS = 5 * 60;

export function verifySignature({ secret, headers, payload, now = Date.now() }) {
    if (!secret?.startsWith('whsec_')) return false;
    const id = headers.get('webhook-id') ?? headers.get('svix-id');
    const timestamp = headers.get('webhook-timestamp') ?? headers.get('svix-timestamp');
    const signatures = headers.get('webhook-signature') ?? headers.get('svix-signature');
    if (!id || !timestamp || !signatures) return false;
    if (!(Math.abs(now / 1000 - Number(timestamp)) <= MAX_SKEW_SECONDS)) return false;

    const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
    const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${payload ?? ''}`).digest();
    // After a secret rotation several signatures arrive; any one may match.
    return signatures.split(' ').some((versioned) => {
        const [version, signature] = versioned.split(',');
        if (version !== 'v1' || !signature) return false;
        const given = Buffer.from(signature, 'base64');
        return given.length === expected.length && timingSafeEqual(given, expected);
    });
}
