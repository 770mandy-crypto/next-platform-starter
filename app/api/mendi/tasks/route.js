import { NextResponse } from 'next/server';
import { HttpError, clip, readJson, requireUser, route } from 'lib/pilot/http';
import { addTask } from 'lib/mendi/store';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    const title = clip(body.title, 300);
    if (!title) throw new HttpError('חסרה כותרת למשימה.', 400);
    const task = await addTask(user.id, { title, due: clip(body.due, 40) || null, agent: null });
    return NextResponse.json({ task }, { status: 201 });
});
