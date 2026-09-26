import { NextResponse } from 'next/server';
import { getWorkspace, saveWorkspace } from 'lib/pilot/workspace';
import { readJson, requireUser, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const user = await requireUser(request);
    return NextResponse.json({ workspace: await getWorkspace(user.id) });
});

export const PUT = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    const saved = await saveWorkspace(user.id, body.workspace);
    return NextResponse.json({ updatedAt: saved.updatedAt });
});
