// Server-side home of each user's agent chats, so they follow the account to
// any device. One key per agent: using two different agents on two devices at
// once cannot overwrite each other's chats. Everything for a user lives under
// one prefix, which account deletion clears.

import { getDb } from '../pilot/db.js';
import { AGENT_IDS } from './catalog.js';
import { cleanThread, mergeThreads } from './saved-chats.js';

export const userPrefix = (userId) => `agents-chat/${userId}/`;
const threadKey = (userId, agentId) => `${userPrefix(userId)}threads/${agentId}`;

// A save that keeps losing the compare-and-set race gives up after this many
// tries rather than looping; the page retries it later.
const MAX_SAVE_ATTEMPTS = 5;

export class SaveConflictError extends Error {
    constructor() {
        super('השיחה עודכנה במקביל. נסו שוב.');
        this.status = 409;
    }
}

// Every agent's chat with its version, the number a save must build on.
export async function loadThreads(userId) {
    const db = await getDb();
    const entries = await Promise.all(AGENT_IDS.map(async (agentId) => [agentId, await db.get(threadKey(userId, agentId))]));
    const threads = {};
    const versions = {};
    for (const [agentId, saved] of entries) {
        if (!saved) continue;
        versions[agentId] = versionOf(saved);
        const turns = cleanThread(saved.turns);
        if (turns.length) threads[agentId] = turns;
    }
    return { threads, versions };
}

const versionOf = (saved) => (Number.isSafeInteger(saved?.version) ? saved.version : 0);

// Saves one agent's chat. Saving an empty chat ("new chat") clears it.
//
// `base` is the version the page's copy was built on. When the chat has moved
// on since (another device saved), the page's changes are merged into the
// saved chat instead of replacing it, using `seen` (the turn ids the page's
// copy started from) to tell added turns from removed ones. Without a base
// (a page from before versions existed) the save replaces the chat.
//
// `writer` identifies the page that sent the save ({ id, seq }, seq counting up
// within that page). Two saves from the same page can arrive out of order (a
// normal save and one sent as the page closes), so an older save from a page
// that already saved a newer version is ignored. Each record also keeps the
// turn ids its writer sent: if that page's reply got lost, its next save still
// builds on the older version, but it had those turns, so they count as seen
// (a "new chat" then really clears them).
//
// The chat is never deleted, only emptied, so its version keeps counting up and
// an old base can never match again.
export async function saveThread(userId, agentId, turns, { writer = null, base = null, seen = [] } = {}) {
    const db = await getDb();
    const key = threadKey(userId, agentId);
    for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt += 1) {
        const { value: saved, etag } = await db.getVersioned(key);
        const version = versionOf(saved);
        if (writer && saved?.writer?.id === writer.id && saved.writer.seq >= writer.seq) {
            return { turns: cleanThread(saved.turns), version, stale: true, merged: false };
        }
        const incoming = cleanThread(turns);
        let next = incoming;
        const merged = base !== null && base !== version && Boolean(saved);
        if (merged) {
            const ownEarlier = writer && saved.writer?.id === writer.id && Array.isArray(saved.sent) ? saved.sent : [];
            next = cleanThread(mergeThreads(cleanThread(saved.turns), incoming, [...seen, ...ownEarlier]));
        }
        const record = {
            turns: next,
            version: version + 1,
            writer,
            sent: incoming.map((turn) => turn.id),
            savedAt: new Date().toISOString()
        };
        if (await db.setIfUnchanged(key, record, etag)) return { turns: next, version: version + 1, stale: false, merged };
    }
    throw new SaveConflictError();
}
