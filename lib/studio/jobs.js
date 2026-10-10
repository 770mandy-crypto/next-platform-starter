// The studio's jobs: one record per piece of work handed to a provider (a
// video, a dub into one language, a voice-over, an edit). Records live in the
// same store as Maslul accounts:
//
//   studio-jobs/{jobId}                 the job itself, including its owner
//   studio/{userId}/jobs/{time}-{jobId} the owner's index, newest last
//   studio-audio/{jobId}                voice-over audio (base64), kept apart
//                                       so job listings stay small
//
// A job id is a random UUID and doubles as the address of the job's file
// (/api/studio/files/{id}). That link works without signing in, on purpose:
// the editing service has to fetch voice-overs and dubs by URL, and the link
// is only ever shown to the job's owner. Treat it like a private share link.

import { randomUUID } from 'node:crypto';
import { getDb } from '../pilot/db.js';
import { consumeLimit } from '../pilot/auth.js';
import { checkDub, checkRender, checkReplicate } from './providers.js';

export const JOB_DAILY_LIMIT = Number(process.env.STUDIO_DAILY_JOB_LIMIT) || 40;
// A running job is re-checked with its provider at most this often, however
// many tabs are polling.
export const CHECK_INTERVAL_MS = 4_000;
// After this long a job that never finished is reported as failed.
export const JOB_TIMEOUT_MS = 2 * 60 * 60_000;

const jobKey = (id) => `studio-jobs/${id}`;
const indexPrefix = (userId) => `studio/${userId}/jobs/`;
const fileKey = (id) => `studio-audio/${id}`;
const ID_PATTERN = /^[0-9a-f-]{36}$/;

export class JobLimitError extends Error {
    constructor() {
        super(`הגעת למכסה היומית של הסטודיו (${JOB_DAILY_LIMIT} עבודות). היא מתחדשת בתוך 24 שעות.`);
        this.status = 429;
    }
}

// Every paid provider call is counted per user per day, apart from the chat
// quota: one chat message can start several jobs.
export async function consumeJobQuota(userId) {
    const allowed = await consumeLimit(`studio:${userId}`, { limit: JOB_DAILY_LIMIT, windowMs: 86_400_000 });
    if (!allowed) throw new JobLimitError();
}

export async function createJob(
    userId,
    { kind, provider, title, input, providerId, status = 'running', url = null, error = null },
    now = Date.now()
) {
    const db = await getDb();
    const job = {
        id: randomUUID(),
        owner: userId,
        kind,
        provider,
        title: String(title ?? '').slice(0, 200),
        input,
        providerId: providerId ?? null,
        status,
        url,
        error,
        createdAt: now,
        updatedAt: now,
        checkedAt: now
    };
    await db.set(jobKey(job.id), job);
    await db.set(`${indexPrefix(userId)}${String(now).padStart(15, '0')}-${job.id}`, { id: job.id });
    return job;
}

export async function getJob(id) {
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null;
    const db = await getDb();
    return db.get(jobKey(id));
}

export async function getOwnJob(userId, id) {
    const job = await getJob(id);
    return job?.owner === userId ? job : null;
}

export async function markDone(job, now = Date.now()) {
    const db = await getDb();
    const done = { ...job, status: 'done', updatedAt: now, checkedAt: now };
    await db.set(jobKey(job.id), done);
    return done;
}

// A job's file kept in our own store: voice-overs, and results a model sent
// back inline as a data: URI instead of a link. (The key prefix predates
// non-audio files and is kept so earlier voice-overs still load.)
export async function saveFile(jobId, buffer, type) {
    const db = await getDb();
    await db.set(fileKey(jobId), { type, data: buffer.toString('base64') });
}

export async function loadFile(jobId) {
    const db = await getDb();
    const stored = await db.get(fileKey(jobId));
    return stored ? { type: stored.type, data: Buffer.from(stored.data, 'base64') } : null;
}

export function decodeDataUri(uri) {
    const match = /^data:([\w.+-]+\/[\w.+-]+);base64,(.*)$/s.exec(uri);
    return match ? { type: match[1], data: Buffer.from(match[2], 'base64') } : null;
}

export async function listJobs(userId, limit = 30) {
    const db = await getDb();
    const keys = (await db.list(indexPrefix(userId))).slice(-limit).reverse();
    const entries = await Promise.all(keys.map((key) => db.get(key)));
    const jobs = await Promise.all(entries.map((entry) => (entry?.id ? getJob(entry.id) : null)));
    return jobs.filter((job) => job?.owner === userId);
}

const CHECKERS = {
    replicate: (job) => checkReplicate(job.providerId),
    elevenlabs: (job) => (job.kind === 'dub' ? checkDub(job.providerId) : null),
    shotstack: (job) => checkRender(job.providerId)
};

// Brings a running job up to date with its provider. A provider that cannot
// be reached leaves the job running (it is checked again on the next poll); a
// job that has run past the timeout is given up on.
export async function refreshJob(job, now = Date.now()) {
    if (job.status !== 'running' || now - job.checkedAt < CHECK_INTERVAL_MS) return job;
    const db = await getDb();

    if (now - job.createdAt > JOB_TIMEOUT_MS) {
        const failed = { ...job, status: 'failed', error: 'העבודה לא הסתיימה בזמן.', updatedAt: now, checkedAt: now };
        await db.set(jobKey(job.id), failed);
        return failed;
    }

    let state;
    try {
        state = await CHECKERS[job.provider]?.(job);
    } catch (error) {
        console.error(`Studio job ${job.id} check failed:`, error?.message, error?.detail ?? '');
        state = null;
    }
    const next = { ...job, checkedAt: now };
    if (state?.status === 'done') {
        // An inline file is stored here and served from our file route.
        const inline = state.url?.startsWith('data:') ? decodeDataUri(state.url) : null;
        if (inline) await saveFile(job.id, inline.data, inline.type);
        Object.assign(next, { status: 'done', url: inline ? null : (state.url ?? null), updatedAt: now });
    } else if (state?.status === 'failed') {
        Object.assign(next, { status: 'failed', error: state.error ?? 'העבודה נכשלה.', updatedAt: now });
    }
    await db.set(jobKey(job.id), next);
    return next;
}

// The address of a job's result as the user (and the editing service) sees it:
// the provider's own URL when it gives a public one, otherwise our file route.
export function resultUrl(job, origin = '') {
    if (job.status !== 'done') return null;
    if (job.url) return job.url;
    return `${origin}/api/studio/files/${job.id}`;
}

// What the browser and the model are shown. The owner and provider ids stay
// on the server.
export function publicJob(job, origin = '') {
    return {
        id: job.id,
        kind: job.kind,
        provider: job.provider,
        title: job.title,
        input: job.input,
        status: job.status,
        error: job.error,
        url: resultUrl(job, origin),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
    };
}
