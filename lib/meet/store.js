// Meeting records, on the same key-value storage as the rest of the app
// (Netlify Blobs in production, memory in tests).
//
// A meeting's transcript is one small record per line rather than one growing
// document: webhooks for the same meeting arrive in parallel on different
// serverless instances, and separate keys need no locking. Keys sort by time.

import { createHash, randomBytes } from 'node:crypto';
import { getDb } from '../pilot/db.js';

const meetingKey = (id) => `meet/meeting/${id}`;
const userIndexKey = (userId, meeting) => `meet/user/${userId}/${meeting.createdAt}-${meeting.id}`;
const botKey = (botId) => `meet/bot/${botId}`;
const linePrefix = (id) => `meet/line/${id}/`;
const deckKey = (id) => `meet/deck/${id}`;
const lockKey = (id) => `meet/lock/${id}`;
const attentionKey = (id) => `meet/attention/${id}`;

export const newId = (bytes = 8) => randomBytes(bytes).toString('hex');
const validId = (id) => typeof id === 'string' && /^[a-f0-9]{8,64}$/.test(id);

export async function createMeeting(fields) {
    const db = await getDb();
    const meeting = {
        id: newId(),
        hookToken: newId(16),
        createdAt: new Date().toISOString(),
        status: 'creating',
        statusDetail: null,
        botId: null,
        summary: null,
        deckIds: [],
        docIds: [],
        ...fields
    };
    await db.set(meetingKey(meeting.id), meeting);
    await db.set(userIndexKey(meeting.userId, meeting), { id: meeting.id });
    return meeting;
}

export async function getMeeting(id) {
    if (!validId(id)) return null;
    return (await getDb()).get(meetingKey(id));
}

// Read-modify-write that retries if another handler changed the record in
// between (a status webhook and a summary can land at the same moment).
export async function updateMeeting(id, change) {
    const db = await getDb();
    for (let attempt = 0; attempt < 6; attempt += 1) {
        const { value, etag } = await db.getVersioned(meetingKey(id));
        if (!value) return null;
        const next = { ...value, ...change(value) };
        if (await db.setIfUnchanged(meetingKey(id), next, etag)) return next;
    }
    throw new Error(`Meeting ${id} could not be updated: too many concurrent writes.`);
}

export async function linkBot(meetingId, botId) {
    await (await getDb()).set(botKey(botId), { id: meetingId });
}

export async function meetingForBot(botId) {
    if (typeof botId !== 'string' || !/^[\w-]{1,80}$/.test(botId)) return null;
    const link = await (await getDb()).get(botKey(botId));
    return link ? getMeeting(link.id) : null;
}

export async function listMeetings(userId, limit = 20) {
    const db = await getDb();
    const keys = (await db.list(`meet/user/${userId}/`)).slice(-limit).reverse();
    const meetings = await Promise.all(keys.map(async (key) => getMeeting((await db.get(key))?.id)));
    return meetings.filter(Boolean);
}

// --- Transcript lines --------------------------------------------------------

// kind: 'speech' (a participant spoke), 'chat' (a participant wrote),
// 'bot' (something the bot said or wrote).
// With a dedupeKey, a line that was already stored is not stored again and
// null is returned: Recall retries a webhook it thinks failed.
export async function addLine(meetingId, { kind, speaker, text, at = Date.now(), dedupeKey = null }) {
    const db = await getDb();
    if (dedupeKey) {
        const seen = createHash('sha256').update(dedupeKey).digest('hex').slice(0, 24);
        if (!(await db.create(`meet/seen/${meetingId}/${seen}`, { at }))) return null;
    }
    const key = `${String(at).padStart(14, '0')}-${newId(4)}`;
    const line = { key, kind, speaker: speaker || null, text, at };
    await db.set(`${linePrefix(meetingId)}${key}`, line);
    return line;
}

// Lines in time order (keys start with the time they were stored). `limit`
// keeps the most recent ones; `after` returns only lines newer than that key.
export async function getLines(meetingId, { limit = Infinity, after = null } = {}) {
    const db = await getDb();
    let keys = await db.list(linePrefix(meetingId));
    if (after) keys = keys.filter((key) => key.slice(linePrefix(meetingId).length) > after);
    if (Number.isFinite(limit)) keys = keys.slice(-limit);
    const lines = [];
    for (let index = 0; index < keys.length; index += 40) {
        lines.push(...(await Promise.all(keys.slice(index, index + 40).map((key) => db.get(key)))));
    }
    return lines.filter(Boolean);
}

// --- Reply lock and attention -------------------------------------------------

const LOCK_TTL_MS = 90_000;

// One spoken reply at a time per meeting, so answers never overlap.
export async function acquireLock(meetingId, now = Date.now()) {
    const db = await getDb();
    const token = newId(6);
    if (await db.create(lockKey(meetingId), { at: now, token })) return token;
    const { value: held, etag } = await db.getVersioned(lockKey(meetingId));
    if (held && now - held.at < LOCK_TTL_MS) return null;
    return (await db.setIfUnchanged(lockKey(meetingId), { at: now, token }, etag)) ? token : null;
}

export async function releaseLock(meetingId, token) {
    const db = await getDb();
    if ((await db.get(lockKey(meetingId)))?.token === token) await db.delete(lockKey(meetingId));
}

// "Claude…" on its own, with the question in the next sentence: remember who
// called, briefly, so their next line counts as addressed to the bot.
const ATTENTION_MS = 20_000;

export async function setAttention(meetingId, speaker, now = Date.now()) {
    await (await getDb()).set(attentionKey(meetingId), { speaker: speaker || null, at: now });
}

export async function takeAttention(meetingId, speaker, now = Date.now()) {
    const db = await getDb();
    const held = await db.get(attentionKey(meetingId));
    if (!held) return false;
    await db.delete(attentionKey(meetingId));
    return now - held.at < ATTENTION_MS && (held.speaker ?? null) === (speaker || null);
}

// --- Presentations -----------------------------------------------------------

export async function saveDeck(meeting, deck) {
    const id = newId(12);
    const record = { id, meetingId: meeting.id, createdAt: new Date().toISOString(), ...deck };
    await (await getDb()).set(deckKey(id), record);
    await updateMeeting(meeting.id, (current) => ({ deckIds: [...(current.deckIds ?? []), id] }));
    return record;
}

export async function getDeck(id) {
    if (!validId(id)) return null;
    return (await getDb()).get(deckKey(id));
}

// --- Worksheets --------------------------------------------------------------

const docKey = (id) => `meet/doc/${id}`;

export async function saveDoc(meeting, doc) {
    const id = newId(12);
    const record = { id, meetingId: meeting.id, createdAt: new Date().toISOString(), ...doc };
    await (await getDb()).set(docKey(id), record);
    await updateMeeting(meeting.id, (current) => ({ docIds: [...(current.docIds ?? []), id] }));
    return record;
}

export async function getDoc(id) {
    if (!validId(id)) return null;
    return (await getDb()).get(docKey(id));
}
