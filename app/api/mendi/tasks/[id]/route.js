import { NextResponse } from 'next/server';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { updateTask } from 'lib/mendi/store';

export const dynamic = 'force-dynamic';

export const POST = route(async (request, { params }) => {
    const user = await requireUser(request);
    const { id } = await params;
    const body = await readJson(request);
    const task = await updateTask(user.id, id, { done: body.done, title: body.title });
    if (!task) throw new HttpError('המשימה לא נמצאה.', 404);
    return NextResponse.json({ task });
});
