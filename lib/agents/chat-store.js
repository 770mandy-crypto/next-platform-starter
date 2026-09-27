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

// Saving an empty chat ("new chat") removes it.
export async function saveThread(userId, agentId, turns) {
    const db = await getDb();
    const cleaned = cleanThread(turns);
    if (cleaned.length) await db.set(threadKey(userId, agentId), { turns: cleaned, savedAt: new Date().toISOString() });
    else await db.delete(threadKey(userId, agentId));
    return cleaned;
}
