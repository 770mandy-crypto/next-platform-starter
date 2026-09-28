import { NextResponse } from 'next/server';
import { getAgent } from 'lib/agents/catalog';
import { loadThreads, saveThread } from 'lib/agents/chat-store';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

// The signed-in user's saved agent chats, one per agent.
export const GET = route(async (request) => {
    const user = await requireUser(request);
    return NextResponse.json({ threads: await loadThreads(user.id) });
});

// Saves one agent's chat. The browser sends the whole chat each time; it is
// cleaned and trimmed on the way in, and an empty chat removes the saved one.
export const PUT = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body || typeof body !== 'object') throw new HttpError('גוף הבקשה אינו JSON תקין.', 400);

    const agent = getAgent(body.agent);
    if (!agent) throw new HttpError('הסוכן לא נמצא.', 400);
    if (!Array.isArray(body.turns)) throw new HttpError('השיחה חסרה.', 400);

    const writer =
        typeof body.writer?.id === 'string' && Number.isSafeInteger(body.writer?.seq)
            ? { id: body.writer.id.slice(0, 64), seq: body.writer.seq }
            : null;
    const { turns, stale } = await saveThread(user.id, agent.id, body.turns, writer);
    return NextResponse.json({ saved: turns.length, stale });
});
