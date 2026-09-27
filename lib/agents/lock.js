// One agent reply at a time per user. The daily AI quota counter is a plain
// read-then-write, so parallel requests could all pass it together and run many
// paid replies at once; claiming this lock first (an atomic create-if-absent
// write) makes a user's chat requests take turns, which keeps the quota honest.
// A lock left behind by a function that died mid-reply expires after the TTL,
// which is longer than any reply can run.

import { randomUUID } from 'node:crypto';
import { getDb } from '../pilot/db.js';

export const LOCK_TTL_MS = 10 * 60_000;

export const lockKey = (userId) => `agents-chat/${userId}/lock`;

// Returns a token identifying this holder, or null if another reply is running.
export async function acquireReplyLock(userId, now = Date.now()) {
    const db = await getDb();
    const token = randomUUID();
    if (await db.create(lockKey(userId), { at: now, token })) return token;

    const held = await db.get(lockKey(userId));
    if (held && now - held.at < LOCK_TTL_MS) return null;

    // Expired, or released between the two calls: clear it and claim it again.
    // If several requests race here, only one create succeeds.
    await db.delete(lockKey(userId));
    return (await db.create(lockKey(userId), { at: now, token })) ? token : null;
}

// Releases the lock only if it is still this holder's. A reply that outlived
// the TTL must not remove the lock a newer request has since taken.
export async function releaseReplyLock(userId, token) {
    const db = await getDb();
    const held = await db.get(lockKey(userId));
    if (held?.token === token) await db.delete(lockKey(userId));
}
