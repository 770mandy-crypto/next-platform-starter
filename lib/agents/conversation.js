// Turns the conversation the browser sends into the messages Claude sees. The
// history comes from the client, so it is treated as untrusted input: only
// plain text user/assistant turns survive, each is capped, and only the most
// recent turns are kept so one long chat cannot become an unbounded request.

export const MAX_TURNS = 16;
export const MAX_TURN_CHARS = 12_000;

function clipText(value) {
    return typeof value === 'string' ? value.trim().slice(0, MAX_TURN_CHARS) : '';
}

export function toMessages(history, message) {
    const turns = (Array.isArray(history) ? history : [])
        .filter((turn) => turn && (turn.role === 'user' || turn.role === 'assistant'))
        .map((turn) => ({ role: turn.role, content: clipText(turn.content) }))
        .filter((turn) => turn.content)
        .slice(-(MAX_TURNS - 1));

    // The API requires the conversation to open with a user turn.
    while (turns.length && turns[0].role !== 'user') turns.shift();

    const text = clipText(message);
    return text ? [...turns, { role: 'user', content: text }] : null;
}
