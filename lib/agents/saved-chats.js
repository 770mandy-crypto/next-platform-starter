// Keeps agent chats across page reloads, in this browser only, one entry per
// signed-in user. What comes back from storage may be old, edited or partly
// written, so it is rebuilt field by field rather than trusted.

import { AGENT_IDS } from './catalog.js';

const VERSION = 1;
export const MAX_SAVED_TURNS = 60;
const REPLY_STATES = ['done', 'truncated', 'stopped', 'refused', 'error'];

export function storageKey(userId) {
    return `agents-chat:v${VERSION}:${userId}`;
}

export function serializeChats({ agentId, threads }, maxTurns = MAX_SAVED_TURNS) {
    const saved = {};
    for (const id of AGENT_IDS) {
        const thread = threads?.[id];
        if (thread?.length) saved[id] = thread.slice(-maxTurns).map(({ searching, ...turn }) => turn);
    }
    return JSON.stringify({ version: VERSION, agentId, threads: saved });
}

export function restoreChats(raw) {
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!data || data.version !== VERSION || typeof data.threads !== 'object' || !data.threads) return null;

    const threads = {};
    for (const id of AGENT_IDS) {
        const turns = Array.isArray(data.threads[id]) ? data.threads[id].map(restoreTurn).filter(Boolean) : [];
        if (turns.length) threads[id] = turns.slice(-MAX_SAVED_TURNS);
    }
    return { agentId: AGENT_IDS.includes(data.agentId) ? data.agentId : null, threads };
}

function restoreTurn(turn, index) {
    if (!turn || typeof turn.content !== 'string') return null;
    const id = typeof turn.id === 'string' && turn.id ? turn.id : `restored-${index}`;
    if (turn.role === 'user') return turn.content ? { id, role: 'user', content: turn.content } : null;
    if (turn.role !== 'assistant') return null;

    const reply = { id, role: 'assistant', content: turn.content };
    if (turn.state === 'streaming') {
        // The page was reloaded while this reply was still arriving.
        reply.state = turn.content ? 'stopped' : 'error';
        reply.note = 'התשובה נקטעה כשהדף נטען מחדש.';
    } else {
        reply.state = REPLY_STATES.includes(turn.state) ? turn.state : 'done';
        if (typeof turn.note === 'string' && turn.note) reply.note = turn.note;
    }
    const sources = Array.isArray(turn.sources) ? turn.sources.filter(isSafeSource) : [];
    if (sources.length) reply.sources = sources.map(({ url, title, host }) => ({ url, title: title || null, host }));
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

// Browser wrappers. Storage can be missing, blocked or full; the chat keeps
// working either way, it just forgets on reload.
export function loadChats(userId) {
    try {
        const raw = window.localStorage.getItem(storageKey(userId));
        return raw ? restoreChats(raw) : null;
    } catch {
        return null;
    }
}

export function saveChats(userId, state) {
    const key = storageKey(userId);
    for (const maxTurns of [MAX_SAVED_TURNS, 10]) {
        try {
            window.localStorage.setItem(key, serializeChats(state, maxTurns));
            return;
        } catch {
            // Most likely over the storage quota: retry keeping less history.
        }
    }
    try {
        window.localStorage.removeItem(key);
    } catch {}
}
