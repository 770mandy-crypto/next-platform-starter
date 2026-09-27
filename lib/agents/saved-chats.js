// The shape a saved agent chat is kept in. Chats are stored on the server per
// user and per agent (see chat-store.js), and they arrive there from the
// browser, so every turn is rebuilt field by field rather than trusted. The
// browser uses the same function to trim a chat before sending it.

export const MAX_SAVED_TURNS = 60;
// Well under the API's 1.2 MB request cap, so a trimmed chat always fits.
export const MAX_THREAD_CHARS = 800_000;

const REPLY_STATES = ['done', 'truncated', 'stopped', 'refused', 'error'];

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
        reply.note = 'התשובה נקטעה לפני שנשמרה במלואה.';
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
