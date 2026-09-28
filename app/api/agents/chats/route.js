import { NextResponse } from 'next/server';
import { getAgent } from 'lib/agents/catalog';
import { loadThreads, saveThread } from 'lib/agents/chat-store';
import { MAX_SAVED_TURNS } from 'lib/agents/saved-chats';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

// The signed-in user's saved agent chats, one per agent, with their versions.
// `?versions=1` returns only the versions, for an open page to check cheaply
// whether another device changed anything.
export const GET = route(async (request) => {
    const user = await requireUser(request);
    const { threads, versions } = await loadThreads(user.id);
    if (new URL(request.url).searchParams.get('versions') === '1') return NextResponse.json({ versions });
    return NextResponse.json({ threads, versions });
});

// Saves one agent's chat. The browser sends the whole chat each time, with the
// version it built on; it is cleaned and trimmed on the way in, and merged with
// changes from another device if there were any (see lib/agents/chat-store).
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
    const base = Number.isSafeInteger(body.base) && body.base >= 0 ? body.base : null;
    const seen = Array.isArray(body.seen)
        ? body.seen.filter((id) => typeof id === 'string').slice(-MAX_SAVED_TURNS * 2).map((id) => id.slice(0, 64))
        : [];

    const { turns, version, stale, merged } = await saveThread(user.id, agent.id, body.turns, { writer, base, seen });
    // The merged chat goes back to the page so it can show the other device's turns.
    return NextResponse.json({ saved: turns.length, version, stale, merged, ...(merged ? { turns } : {}) });
});
