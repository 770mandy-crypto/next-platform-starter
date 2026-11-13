// The meeting bot's behaviour. Recall delivers what is said and written in the
// meeting as webhooks; this file stores each line, notices when someone is
// talking to the bot, and answers: out loud (text-to-speech played into the
// call) and in the meeting chat.
//
// Everything runs inside short serverless requests. There is no process that
// stays in the meeting: the bot itself lives at Recall, and its memory is the
// stored transcript.

import { isConnected, synthesizeSpeech } from '../studio/providers.js';
import { consumeLimit } from '../pilot/auth.js';
import { consumeAiQuota } from '../pilot/workspace.js';
import { buildDeck, decideReply, isBrainConfigured, summarize, summaryText } from './brain.js';
import {
    CAPTION_LANGUAGES,
    createBot,
    getBot,
    latestStatus,
    leaveCall,
    meetingPlatform,
    outputAudio,
    sendChatMessage
} from './recall.js';
import {
    acquireLock,
    addLine,
    createMeeting,
    getLines,
    linkBot,
    meetingForBot,
    releaseLock,
    saveDeck,
    setAttention,
    takeAttention,
    updateMeeting
} from './store.js';

export const DEFAULT_BOT_NAME = 'קלוד';
export const DAILY_BOT_LIMIT = Number(process.env.MEET_DAILY_BOT_LIMIT) || 10;
// Lines of recent conversation a reply is given. A summary reads everything.
const REPLY_CONTEXT_LINES = 120;
// Longest text sent to text-to-speech: about 45 seconds of speech.
const MAX_SPOKEN_CHARS = 700;
const CHAT_LIMITS = { google_meet: 500 };
const DEFAULT_CHAT_LIMIT = 4000;

export class MeetError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export const isSpeechConfigured = () => isConnected('elevenlabs');
export const LIVE_STATUSES = ['joining', 'waiting_room', 'in_call', 'live'];
const isLive = (meeting) => LIVE_STATUSES.includes(meeting.status);
const inCall = (meeting) => meeting.status === 'in_call' || meeting.status === 'live';

// --- Noticing that someone is talking to the bot -----------------------------

const DEFAULT_WAKE_WORDS = ['קלוד', 'קלאוד', 'claude'];
// Hebrew niqqud and cantillation marks.
const MARKS = /[֑-ׇ]/g;
// One-letter Hebrew prefixes that attach to a name: "לקלוד", "וקלוד", "שקלוד".
const PREFIX = '[והבלמשכ]?';
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function wakeWords(meeting) {
    const extra = (process.env.MEET_BOT_WAKE_WORDS || '').split(',');
    const words = [meeting.botName, ...DEFAULT_WAKE_WORDS, ...extra]
        .map((word) => (word || '').normalize('NFKC').replace(MARKS, '').trim().toLowerCase())
        .filter((word) => word.length >= 2);
    return [...new Set(words)];
}

// Whether a line calls the bot by name. `bare` means the name is nearly all
// there is ("Claude?", "hey Claude"), so the actual request is still coming.
export function detectAddress(text, meeting) {
    const clean = (text || '').normalize('NFKC').replace(MARKS, '').toLowerCase();
    const names = wakeWords(meeting).map(escapeRegex).join('|');
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${PREFIX}(?:${names})(?![\\p{L}\\p{N}])`, 'u');
    if (!pattern.test(clean)) return { addressed: false, bare: false };
    const rest = clean
        .replace(new RegExp(pattern.source, 'gu'), ' ')
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
    return { addressed: true, bare: rest.length <= 1 };
}

// --- Speaking and writing in the meeting -------------------------------------

// Splits a long message at line or word breaks so each part fits the
// platform's chat limit (Google Meet allows 500 characters).
export function chunkMessage(text, limit) {
    const parts = [];
    let rest = text.trim();
    while (rest.length > limit) {
        let cut = rest.lastIndexOf('\n', limit);
        if (cut < limit * 0.4) cut = rest.lastIndexOf(' ', limit);
        if (cut < limit * 0.4) cut = limit;
        parts.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    return parts;
}

async function writeChat(meeting, text) {
    const limit = CHAT_LIMITS[meeting.platform] ?? DEFAULT_CHAT_LIMIT;
    for (const part of chunkMessage(text, limit)) await sendChatMessage(meeting.botId, part);
}

// Says `say` out loud and writes `chat` in the meeting chat. If speech is not
// connected, or fails, what would have been said is written instead, so an
// answer always arrives. Returns how it was delivered.
export async function deliver(meeting, { say = '', chat = '' }) {
    const spoken = say.trim().slice(0, MAX_SPOKEN_CHARS);
    const written = chat.trim();
    let spoke = false;
    let speechError = null;

    if (spoken && isSpeechConfigured()) {
        try {
            const mp3 = await synthesizeSpeech({ text: spoken, voiceId: process.env.MEET_BOT_VOICE_ID });
            await outputAudio(meeting.botId, mp3);
            spoke = true;
        } catch (error) {
            speechError = error?.message ?? 'speech failed';
            console.error('Meet bot speech failed:', error);
        }
    }
    const toWrite = [spoke ? '' : spoken, written].filter(Boolean).join('\n\n');
    if (toWrite) await writeChat(meeting, toWrite);

    const text = [spoken, written].filter(Boolean).join('\n\n');
    if (text) await addLine(meeting.id, { kind: 'bot', speaker: meeting.botName, text });
    return { spoke, wrote: Boolean(toWrite), speechError };
}

// --- Summary and presentation -------------------------------------------------

export async function runSummary(meeting, { announce = false } = {}) {
    const lines = (await getLines(meeting.id)).filter((line) => line.kind !== 'bot' || line.text);
    if (!lines.some((line) => line.kind !== 'bot')) throw new MeetError('עדיין לא נאמר בפגישה שום דבר שאפשר לסכם.', 409);
    const summary = await summarize({ meeting, lines });
    const record = { ...summary, text: summaryText(summary), createdAt: new Date().toISOString(), lineCount: lines.length };
    await updateMeeting(meeting.id, () => ({ summary: record }));
    if (announce && inCall(meeting)) await deliver(meeting, { say: summary.spoken, chat: record.text });
    return record;
}

export async function runDeck(meeting, topic, { announce = false } = {}) {
    const lines = await getLines(meeting.id);
    const deck = await buildDeck({ meeting, lines, topic });
    if (!deck.slides.length) throw new MeetError('לא הצלחתי לבנות מצגת מהבקשה הזאת.', 502);
    const saved = await saveDeck(meeting, { ...deck, topic: topic || null, language: meeting.language });
    const url = `${meeting.publicUrl}/meet/deck/${saved.id}`;
    if (announce && inCall(meeting)) {
        const hebrew = meeting.language === 'he';
        await deliver(meeting, {
            say: hebrew ? 'המצגת מוכנה, שלחתי קישור בצ׳אט.' : 'The presentation is ready. I put the link in the chat.',
            chat: `${deck.title}\n${url}`
        });
    }
    return { ...saved, url };
}

// --- Answering ---------------------------------------------------------------

// Someone addressed the bot: decide what to do and do it. One reply runs at a
// time per meeting; a request that arrives during another is skipped (the
// person can simply ask again), which keeps answers from overlapping.
export async function respond(meeting, { request, speaker, viaChat = false }) {
    if (!isBrainConfigured()) return { skipped: 'no_brain' };
    const lock = await acquireLock(meeting.id);
    if (!lock) return { skipped: 'busy' };
    try {
        await consumeAiQuota(meeting.userId);
        const lines = await getLines(meeting.id, { limit: REPLY_CONTEXT_LINES });
        const decision = await decideReply({ meeting, lines, request, speaker, viaChat });

        if (decision.action === 'ignore') return { action: 'ignore' };
        if (decision.action === 'summary') {
            const summary = await runSummary(meeting, { announce: true });
            return { action: 'summary', summary };
        }
        if (decision.action === 'presentation') {
            const deck = await runDeck(meeting, decision.topic, { announce: true });
            return { action: 'presentation', deck };
        }
        const delivery = await deliver(meeting, { say: decision.say, chat: decision.chat });
        return { action: 'answer', say: decision.say, chat: decision.chat, ...delivery };
    } catch (error) {
        console.error('Meet bot reply failed:', error);
        // Tell the room, in the chat, that no answer is coming, and why.
        const reason = error?.status && error.status < 600 ? error.message : 'משהו השתבש אצלי.';
        await writeChat(meeting, `${meeting.botName}: לא הצלחתי לענות. ${reason}`).catch(() => {});
        return { action: 'error', error: reason };
    } finally {
        await releaseLock(meeting.id, lock).catch((error) => console.error('Meet lock release failed:', error));
    }
}

// --- Webhooks from Recall -----------------------------------------------------

const sameName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// One real-time event: a finished utterance or a chat message. Stores it, and
// answers if it was addressed to the bot. Safe to call twice with the same
// event (Recall retries deliveries it thinks failed).
export async function handleRealtimeEvent(meeting, payload) {
    const inner = payload?.data?.data;
    const participant = inner?.participant ?? {};
    const speaker = participant.name || null;
    let kind;
    let text;
    let dedupeKey;

    if (payload?.event === 'transcript.data') {
        const words = Array.isArray(inner?.words) ? inner.words : [];
        text = words.map((word) => word?.text ?? '').join(' ').replace(/\s+/g, ' ').trim();
        kind = 'speech';
        dedupeKey = `speech:${participant.id}:${words[0]?.start_timestamp?.relative}:${text}`;
    } else if (payload?.event === 'participant_events.chat_message') {
        text = typeof inner?.data?.text === 'string' ? inner.data.text.trim() : '';
        kind = 'chat';
        dedupeKey = `chat:${participant.id}:${inner?.timestamp?.absolute}:${text}`;
    } else {
        return { ignored: 'event' };
    }
    if (!text) return { ignored: 'empty' };
    // The bot hears itself: its own speech comes back as captions.
    if (sameName(speaker, meeting.botName)) return { ignored: 'self' };

    const line = await addLine(meeting.id, { kind, speaker, text: text.slice(0, 4000), dedupeKey });
    if (!line) return { ignored: 'duplicate' };

    const address = detectAddress(text, meeting);
    if (address.addressed && address.bare) {
        // Just the name: wait for the question in this person's next line.
        await setAttention(meeting.id, speaker);
        return { stored: true, waiting: true };
    }
    const followUp = !address.addressed && (await takeAttention(meeting.id, speaker));
    if (!address.addressed && !followUp) return { stored: true };

    const reply = await respond(meeting, { request: text, speaker, viaChat: kind === 'chat' });
    return { stored: true, reply };
}

const STATUS_BY_CODE = {
    joining_call: 'joining',
    in_waiting_room: 'waiting_room',
    in_call_not_recording: 'in_call',
    recording_permission_allowed: 'in_call',
    recording_permission_denied: 'in_call',
    in_call_recording: 'live',
    call_ended: 'ended',
    done: 'ended',
    fatal: 'failed'
};
const TERMINAL = ['ended', 'failed'];

// Records a bot lifecycle change. When the call ends, the final summary is
// written once, by whichever request sees the ending first.
export async function applyStatus(meeting, code, subCode = null) {
    const status = STATUS_BY_CODE[code];
    if (!status || TERMINAL.includes(meeting.status) || status === meeting.status) return meeting;

    let claimedSummary = false;
    const updated = await updateMeeting(meeting.id, (current) => {
        claimedSummary = false;
        if (TERMINAL.includes(current.status)) return {};
        const change = { status, statusDetail: subCode };
        if (status === 'ended') {
            change.endedAt = new Date().toISOString();
            if (!current.finalSummary) {
                change.finalSummary = 'pending';
                claimedSummary = true;
            }
        }
        return change;
    });
    if (claimedSummary && isBrainConfigured()) {
        try {
            await runSummary(updated);
            await updateMeeting(meeting.id, () => ({ finalSummary: 'done' }));
        } catch (error) {
            // An empty meeting has nothing to summarize; anything else can be
            // retried from the page.
            if (!(error instanceof MeetError)) console.error('Meet final summary failed:', error);
            await updateMeeting(meeting.id, () => ({ finalSummary: 'failed' }));
        }
    }
    return (await updateMeeting(meeting.id, () => ({}))) ?? updated;
}

// A bot status webhook ("bot.in_call_recording", "bot.done", ...), configured
// once in the Recall dashboard. Optional: the page also refreshes the status.
export async function handleStatusEvent(payload) {
    const event = typeof payload?.event === 'string' ? payload.event : '';
    if (!event.startsWith('bot.')) return { ignored: 'event' };
    const meeting = await meetingForBot(payload?.data?.bot?.id);
    if (!meeting) return { ignored: 'unknown_bot' };
    const code = payload?.data?.data?.code || event.slice('bot.'.length);
    const updated = await applyStatus(meeting, code, payload?.data?.data?.sub_code ?? null);
    return { status: updated.status };
}

// Asks Recall where the bot stands. Used by the page while a meeting is live,
// so the status is right even without the dashboard webhook.
export async function refreshStatus(meeting) {
    if (!meeting.botId || !isLive(meeting)) return meeting;
    const latest = latestStatus(await getBot(meeting.botId));
    return latest ? applyStatus(meeting, latest.code, latest.subCode) : meeting;
}

// --- Starting and ending -----------------------------------------------------

const joinMessage = (name, language) =>
    language === 'he'
        ? `שלום, אני ${name}, עוזר AI. אני מקשיב לפגישה ומתמלל אותה כדי לסכם ולענות על שאלות. כדי לפנות אליי אמרו או כתבו "${name}" ואת הבקשה.`
        : `Hi, I'm ${name}, an AI assistant. I'm listening to and transcribing this meeting so I can summarize it and answer questions. To talk to me, say or type "${name}" and your request.`;

const spokenGreeting = (name, language) =>
    language === 'he'
        ? `שלום לכולם, אני ${name}, עוזר AI. אני מקשיב ומתמלל את הפגישה. אם תרצו משהו, פשוט תקראו לי בשם.`
        : `Hi everyone, I'm ${name}, an AI assistant. I'm listening to and transcribing this meeting. Just call my name if you need me.`;

export const LANGUAGES = ['he', 'en', 'ar', 'ru', 'fr', 'es'];

export async function startMeeting({ user, meetingUrl, botName, language, publicUrl }) {
    const url = typeof meetingUrl === 'string' ? meetingUrl.trim() : '';
    const platform = meetingPlatform(url);
    if (!platform) throw new MeetError('צריך קישור לפגישה ב-Google Meet, ב-Zoom או ב-Teams (מתחיל ב-https://).');
    const name = (typeof botName === 'string' ? botName.trim() : '').slice(0, 40) || DEFAULT_BOT_NAME;
    const lang = LANGUAGES.includes(language) || CAPTION_LANGUAGES.includes(language) ? language : 'he';
    if (!/^https:\/\//.test(publicUrl || '')) {
        throw new MeetError('הבוט צריך כתובת ציבורית (https) כדי לקבל את התמלול. הגדירו MEET_PUBLIC_URL או הריצו מהאתר החי.', 503);
    }
    const allowed = await consumeLimit(`meet-bots:${user.id}`, { limit: DAILY_BOT_LIMIT, windowMs: 86_400_000 });
    if (!allowed) throw new MeetError(`הגעת למגבלה של ${DAILY_BOT_LIMIT} בוטים ביום.`, 429);

    const meeting = await createMeeting({
        userId: user.id,
        meetingUrl: url,
        platform,
        botName: name,
        language: lang,
        publicUrl: publicUrl.replace(/\/$/, '')
    });

    let greetingMp3 = null;
    if (isSpeechConfigured()) {
        try {
            const mp3 = await synthesizeSpeech({ text: spokenGreeting(name, lang), voiceId: process.env.MEET_BOT_VOICE_ID });
            greetingMp3 = Buffer.from(mp3).toString('base64');
        } catch (error) {
            // The bot still joins; it greets in the chat only.
            console.error('Meet bot greeting speech failed:', error);
        }
    }

    try {
        const bot = await createBot({
            meetingUrl: url,
            botName: name,
            hookUrl: `${meeting.publicUrl}/api/meet/hook/${meeting.id}/${meeting.hookToken}`,
            language: lang,
            joinMessage: joinMessage(name, lang),
            greetingMp3,
            metadata: { meeting_id: meeting.id }
        });
        await linkBot(meeting.id, bot.id);
        return await updateMeeting(meeting.id, () => ({ botId: bot.id, status: 'joining' }));
    } catch (error) {
        await updateMeeting(meeting.id, () => ({ status: 'failed', statusDetail: error?.message ?? null }));
        throw error;
    }
}

export async function endMeeting(meeting) {
    if (!meeting.botId || !isLive(meeting)) return meeting;
    await leaveCall(meeting.botId);
    return applyStatus(meeting, 'call_ended', 'left_by_owner');
}

// What the browser may see of a meeting: never the webhook token.
export function publicMeeting(meeting) {
    const { hookToken, userId, ...rest } = meeting;
    return rest;
}
