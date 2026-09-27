// Turns the conversation the browser sends into the messages Claude sees. The
// history comes from the client, so it is treated as untrusted input: only
// plain text user/assistant turns survive, each is capped, and only the most
// recent turns are kept so one long chat cannot become an unbounded request.

export const MAX_TURNS = 16;
export const MAX_TURN_CHARS = 12_000;
// A full-length reply (the 16k-token output cap) runs to tens of thousands of
// characters. Assistant turns get more room, and when one is still longer its
// end is kept rather than its start, so "continue" picks up where it stopped.
export const MAX_ASSISTANT_CHARS = 60_000;

function clipUser(value) {
    return typeof value === 'string' ? value.trim().slice(0, MAX_TURN_CHARS) : '';
}

function clipAssistant(value) {
    return typeof value === 'string' ? value.trim().slice(-MAX_ASSISTANT_CHARS) : '';
}

export function toMessages(history, message) {
    const turns = [];
    for (const turn of Array.isArray(history) ? history : []) {
        if (!turn || (turn.role !== 'user' && turn.role !== 'assistant')) continue;
        const content = turn.role === 'user' ? clipUser(turn.content) : clipAssistant(turn.content);
        if (!content) continue;
        // Two user turns in a row mean the first went unanswered (refused,
        // failed or cut off); only the later one, usually a rephrasing, counts.
        if (turn.role === 'user' && turns.at(-1)?.role === 'user') turns.pop();
        turns.push({ role: turn.role, content });
    }

    const text = clipUser(message);
    if (!text) return null;
    if (turns.at(-1)?.role === 'user') turns.pop();
    turns.push({ role: 'user', content: text });

    const recent = turns.slice(-MAX_TURNS);
    // The API requires the conversation to open with a user turn.
    while (recent.length && recent[0].role !== 'user') recent.shift();
    return recent;
}
