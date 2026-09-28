// Server-side home of each user's agent chats, so they follow the account to
// any device. One key per agent: using two different agents on two devices at
// once cannot overwrite each other's chats. Everything for a user lives under
// one prefix, which account deletion clears.

import { getDb } from '../pilot/db.js';
import { AGENT_IDS } from './catalog.js';
import { cleanThread } from './saved-chats.js';

export const userPrefix = (userId) => `agents-chat/${userId}/`;
const threadKey = (userId, agentId) => `${userPrefix(userId)}threads/${agentId}`;

export async function loadThreads(userId) {
    const db = await getDb();
    const entries = await Promise.all(AGENT_IDS.map(async (agentId) => [agentId, await db.get(threadKey(userId, agentId))]));
    const threads = {};
    for (const [agentId, saved] of entries) {
        const turns = cleanThread(saved?.turns);
        if (turns.length) threads[agentId] = turns;
    }
    return threads;
}

// Saving an empty chat ("new chat") clears it.
//
// `writer` identifies the page that sent the save ({ id, seq }, seq counting up
// within that page). Two saves from the same page can arrive out of order (a
// normal save and one sent as the page closes), so an older save from a page
// that already saved a newer version is ignored. Saves from different pages or
// devices are not compared: their clocks and counters are unrelated.
export async function saveThread(userId, agentId, turns, writer = null) {
    const db = await getDb();
    const key = threadKey(userId, agentId);
    if (writer) {
        const saved = await db.get(key);
        if (saved?.writer?.id === writer.id && saved.writer.seq >= writer.seq) return { turns: saved.turns, stale: true };
    }
    const cleaned = cleanThread(turns);
    if (cleaned.length) await db.set(key, { turns: cleaned, writer, savedAt: new Date().toISOString() });
    // An empty chat keeps a marker, not the turns, so a late older save from the
    // same page cannot bring the cleared chat back.
    else if (writer) await db.set(key, { turns: [], writer, savedAt: new Date().toISOString() });
    else await db.delete(key);
    return { turns: cleaned, stale: false };
}
