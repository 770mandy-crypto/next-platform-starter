// Everything MENDI AI keeps per user, on the same key-value store as the rest
// of the site (Netlify Blobs in production, files locally, memory in tests):
//
//   mendi/{user}/missions/{id}  one request to an agent, its live steps and its answer
//   mendi/{user}/actions/{id}   an outside action (mail, WhatsApp) and its approval
//   mendi/{user}/files/{id}     a file an agent made (presentation, invite, table)
//   mendi/{user}/tasks/{id}     the secretary's to-do list
//   mendi/{user}/log/{id}       the activity log ("what each agent did")
//   mendi/{user}/settings       autonomy settings
//   mendi/{user}/running        the one-mission-at-a-time lock
//   mendi-files/{id}            a file's contents, outside the user prefix so its
//                               link works for WhatsApp, which downloads by URL
//
// Ids start with the time, so a prefix listing is already in order.

import { randomUUID } from 'node:crypto';
import { getDb } from '../pilot/db.js';

// Strictly increasing within this process, so two records made in the same
// millisecond still list in the order they were made.
let lastStamp = 0;
export function newId(now = Date.now()) {
    lastStamp = Math.max(now, lastStamp + 1);
    return `${lastStamp.toString(36).padStart(9, '0')}-${randomUUID()}`;
}

const prefix = (userId, kind) => `mendi/${userId}/${kind}/`;

async function listRecent(userId, kind, limit) {
    const db = await getDb();
    const keys = (await db.list(prefix(userId, kind))).slice(-limit).reverse();
    return (await Promise.all(keys.map((key) => db.get(key)))).filter(Boolean);
}

async function put(userId, kind, record) {
    const db = await getDb();
    await db.set(`${prefix(userId, kind)}${record.id}`, record);
    return record;
}

async function getOne(userId, kind, id) {
    if (typeof id !== 'string' || !/^[\w-]{10,80}$/.test(id)) return null;
    const db = await getDb();
    return db.get(`${prefix(userId, kind)}${id}`);
}

// --- Settings --------------------------------------------------------------

// By default every outside action waits for approval. A kind can be allowed to
// run by itself, but only towards trusted recipients the user listed: a
// transcript or an email can never talk an agent into mailing a stranger.
export const DEFAULT_SETTINGS = {
    autoApprove: { email: false, whatsapp: false },
    trustedRecipients: []
};

export async function getSettings(userId) {
    const db = await getDb();
    const saved = await db.get(`mendi/${userId}/settings`);
    return {
        autoApprove: { ...DEFAULT_SETTINGS.autoApprove, ...(saved?.autoApprove ?? {}) },
        trustedRecipients: saved?.trustedRecipients ?? []
    };
}

export const normaliseRecipient = (value) => {
    const text = String(value ?? '').trim().toLowerCase();
    return text.includes('@') ? text : text.replace(/[^\d]/g, '');
};

export async function saveSettings(userId, input) {
    const settings = {
        autoApprove: {
            email: Boolean(input?.autoApprove?.email),
            whatsapp: Boolean(input?.autoApprove?.whatsapp)
        },
        trustedRecipients: [
            ...new Set(
                (Array.isArray(input?.trustedRecipients) ? input.trustedRecipients : [])
                    .map(normaliseRecipient)
                    .filter((value) => value.length >= 6 && value.length <= 120)
            )
        ].slice(0, 50)
    };
    const db = await getDb();
    await db.set(`mendi/${userId}/settings`, settings);
    return settings;
}

// --- Activity log ----------------------------------------------------------

export async function logActivity(userId, entry) {
    return put(userId, 'log', { id: newId(), at: new Date().toISOString(), ...entry });
}

export const listActivity = (userId, limit = 60) => listRecent(userId, 'log', limit);

// --- Files -----------------------------------------------------------------

export const MAX_FILE_BYTES = 4_000_000;

export async function saveFile(userId, { name, type, data, agent, kind }) {
    const buffer = Buffer.from(data);
    if (buffer.length > MAX_FILE_BYTES) throw Object.assign(new Error('The file is too large to keep.'), { status: 413 });
    const id = newId();
    const db = await getDb();
    await db.set(`mendi-files/${id}`, { owner: userId, name, type, data: buffer.toString('base64') });
    return put(userId, 'files', {
        id,
        name,
        type,
        kind,
        agent,
        size: buffer.length,
        createdAt: new Date().toISOString()
    });
}

export const listFiles = (userId, limit = 40) => listRecent(userId, 'files', limit);
export const getFileMeta = (userId, id) => getOne(userId, 'files', id);

export async function loadFileData(id) {
    if (typeof id !== 'string' || !/^[\w-]{10,80}$/.test(id)) return null;
    const db = await getDb();
    const file = await db.get(`mendi-files/${id}`);
    return file ? { ...file, data: Buffer.from(file.data, 'base64') } : null;
}

export const fileUrl = (origin, id) => `${origin}/api/mendi/files/${id}`;

// --- Tasks -----------------------------------------------------------------

export async function addTask(userId, { title, due, notes, agent }) {
    return put(userId, 'tasks', {
        id: newId(),
        title,
        due: due ?? null,
        notes: notes ?? null,
        agent: agent ?? null,
        done: false,
        createdAt: new Date().toISOString()
    });
}

export const listTasks = (userId, limit = 100) => listRecent(userId, 'tasks', limit);

export async function updateTask(userId, id, change) {
    const task = await getOne(userId, 'tasks', id);
    if (!task) return null;
    const next = {
        ...task,
        ...(typeof change.done === 'boolean' ? { done: change.done } : {}),
        ...(typeof change.title === 'string' && change.title.trim() ? { title: change.title.trim() } : {}),
        ...(change.due !== undefined ? { due: change.due } : {}),
        updatedAt: new Date().toISOString()
    };
    return put(userId, 'tasks', next);
}

// --- Actions (approvals) ---------------------------------------------------

export async function createAction(userId, action) {
    return put(userId, 'actions', {
        id: newId(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        ...action
    });
}

export const listActions = (userId, limit = 40) => listRecent(userId, 'actions', limit);
export const getAction = (userId, id) => getOne(userId, 'actions', id);

// Moves an action from one status to the next only if nobody else moved it
// first, so a double click (or two devices) can never send a mail twice.
export async function transitionAction(userId, id, from, change) {
    if (typeof id !== 'string' || !/^[\w-]{10,80}$/.test(id)) return null;
    const db = await getDb();
    const key = `${prefix(userId, 'actions')}${id}`;
    const { value, etag } = await db.getVersioned(key);
    if (!value || value.status !== from) return null;
    const next = { ...value, ...change, updatedAt: new Date().toISOString() };
    return (await db.setIfUnchanged(key, next, etag)) ? next : null;
}

export async function saveAction(userId, action) {
    return put(userId, 'actions', action);
}

// --- Missions --------------------------------------------------------------

export async function createMission(userId, mission) {
    return put(userId, 'missions', {
        id: newId(),
        createdAt: new Date().toISOString(),
        status: 'queued',
        reply: '',
        steps: [],
        ...mission
    });
}

export const getMission = (userId, id) => getOne(userId, 'missions', id);
export const saveMission = (userId, mission) => put(userId, 'missions', mission);
export const listMissions = (userId, limit = 60) => listRecent(userId, 'missions', limit);

// --- One mission at a time -------------------------------------------------

// A mission can run for many minutes in the background. Claiming this lock
// (an atomic create-if-absent write) keeps a user to one at a time, which also
// keeps the daily AI quota honest. A lock left by a run that died expires.
export const MISSION_LOCK_TTL_MS = 16 * 60_000;

export async function acquireMissionLock(userId, missionId, now = Date.now()) {
    const db = await getDb();
    const key = `mendi/${userId}/running`;
    if (await db.create(key, { at: now, missionId })) return true;
    const { value, etag } = await db.getVersioned(key);
    if (value && now - value.at < MISSION_LOCK_TTL_MS) return false;
    return db.setIfUnchanged(key, { at: now, missionId }, etag);
}

export async function releaseMissionLock(userId, missionId) {
    const db = await getDb();
    const key = `mendi/${userId}/running`;
    const held = await db.get(key);
    if (held?.missionId === missionId) await db.delete(key);
}

// --- Account deletion ------------------------------------------------------

export async function mendiKeys(userId) {
    const db = await getDb();
    const own = await db.list(`mendi/${userId}/`);
    const files = own
        .filter((key) => key.startsWith(prefix(userId, 'files')))
        .map((key) => `mendi-files/${key.slice(prefix(userId, 'files').length)}`);
    return [...own, ...files];
}
