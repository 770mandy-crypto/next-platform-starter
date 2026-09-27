// One agent reply at a time per user. The daily AI quota counter is a plain
// read-then-write, so parallel requests could all pass it together and run many
// paid replies at once; claiming this lock first (an atomic create-if-absent
// write) makes a user's chat requests take turns, which keeps the quota honest.
// A lock left behind by a function that died mid-reply expires after the TTL.

import { getDb } from '../pilot/db.js';

export const LOCK_TTL_MS = 5 * 60_000;

const lockKey = (userId) => `agents-chat/lock/${userId}`;

export async function acquireReplyLock(userId, now = Date.now()) {
    const db = await getDb();
    if (await db.create(lockKey(userId), { at: now })) return true;

    const held = await db.get(lockKey(userId));
    if (held && now - held.at < LOCK_TTL_MS) return false;

    // Expired, or released between the two calls: clear it and claim it again.
    // If several requests race here, only one create succeeds.
    await db.delete(lockKey(userId));
    return db.create(lockKey(userId), { at: now });
}

export async function releaseReplyLock(userId) {
    const db = await getDb();
    await db.delete(lockKey(userId));
}
