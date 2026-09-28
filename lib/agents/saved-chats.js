// The shape a saved agent chat is kept in. Chats are stored on the server per
// user and per agent (see chat-store.js), and they arrive there from the
// browser, so every turn is rebuilt field by field rather than trusted. The
// browser uses the same function to trim a chat before sending it.

export const MAX_SAVED_TURNS = 60;
// Well under the API's 1.2 MB request cap, so a trimmed chat always fits.
export const MAX_THREAD_CHARS = 800_000;

const REPLY_STATES = ['done', 'truncated', 'stopped', 'refused', 'error'];
export const INTERRUPTED_NOTE = 'התשובה נקטעה לפני שנשמרה במלואה.';

export function cleanThread(turns) {
    const cleaned = (Array.isArray(turns) ? turns : []).map(cleanTurn).filter(Boolean).slice(-MAX_SAVED_TURNS);
    // Very long replies can still add up: drop the oldest turns until it fits.
    while (cleaned.length && JSON.stringify(cleaned).length > MAX_THREAD_CHARS) cleaned.shift();
    return cleaned;
}

function cleanTurn(turn, index) {
    if (!turn || typeof turn.content !== 'string') return null;
    const id = typeof turn.id === 'string' && turn.id ? turn.id.slice(0, 64) : `saved-${index}`;
    if (turn.role === 'user') return turn.content ? { id, role: 'user', content: turn.content } : null;
    if (turn.role !== 'assistant') return null;

    const reply = { id, role: 'assistant', content: turn.content };
    if (turn.state === 'streaming') {
        // Saved while the reply was still arriving (a reload, a closed tab, or
        // another device reading it mid-reply).
        reply.state = turn.content ? 'stopped' : 'error';
        reply.note = INTERRUPTED_NOTE;
    } else {
        reply.state = REPLY_STATES.includes(turn.state) ? turn.state : 'done';
        if (typeof turn.note === 'string' && turn.note) reply.note = turn.note.slice(0, 500);
    }
    const sources = Array.isArray(turn.sources) ? turn.sources.filter(isSafeSource).slice(0, 50) : [];
    if (sources.length) {
        reply.sources = sources.map(({ url, title, host }) => ({
            url,
            title: typeof title === 'string' && title ? title.slice(0, 300) : null,
            host
        }));
    }
    return reply;
}

function isSafeSource(source) {
    try {
        const { protocol } = new URL(source?.url);
        return (protocol === 'https:' || protocol === 'http:') && typeof source.host === 'string';
    } catch {
        return false;
    }
}

// Combines two copies of one chat that were changed apart, for example on two
// devices at once. `ours` is the copy being saved, `theirs` the one already
// saved, and `seenIds` the turns `ours` started from. A turn missing from one
// copy was added by the other unless that copy had already seen it, in which
// case it was removed there (a new chat). Turns added on both sides are kept,
// theirs first. Each reply is written by the one device that asked for it: a
// copy snapshotted mid-reply never beats one that was not (a refusal can
// empty a reply), and otherwise the longer copy wins, as replies only grow.
export function mergeThreads(theirs, ours, seenIds) {
    const seen = new Set(seenIds);
    const ourById = new Map(ours.map((turn) => [turn.id, turn]));
    const theirIds = new Set(theirs.map((turn) => turn.id));
    const merged = [];
    for (const turn of theirs) {
        const mine = ourById.get(turn.id);
        if (mine) merged.push(fuller(mine, turn));
        else if (!seen.has(turn.id)) merged.push(turn);
    }
    for (const turn of ours) if (!theirIds.has(turn.id) && !seen.has(turn.id)) merged.push(turn);
    return merged;
}

function fuller(mine, theirs) {
    const mineCut = mine.note === INTERRUPTED_NOTE;
    const theirsCut = theirs.note === INTERRUPTED_NOTE;
    if (mineCut !== theirsCut) return mineCut ? theirs : mine;
    return theirs.content.length > mine.content.length ? theirs : mine;
}
