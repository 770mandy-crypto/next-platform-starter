import { NextResponse } from 'next/server';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { accessTokenFor, isConnected } from 'lib/google/oauth';
import { createEvent, listEvents } from 'lib/google/calendar';

export const dynamic = 'force-dynamic';

// Events in a time range, for checking a proposed meeting against the calendar.
export const GET = route(async (request) => {
    const user = await requireUser(request);
    if (!(await isConnected(user.id))) throw new HttpError('החשבון של Google עדיין לא מחובר.', 409);
    const params = new URL(request.url).searchParams;
    const token = await accessTokenFor(user.id);
    const from = new Date(params.get('from') ?? '');
    const to = new Date(params.get('to') ?? '');
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) throw new HttpError('הטווח אינו תקין.', 400);
    return NextResponse.json({ events: await listEvents({ token, from, to }) });
});

// Creates an event, only after the person confirms it.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (body.confirm !== true) throw new HttpError('יצירת האירוע לא אושרה.', 400);
    if (!(await isConnected(user.id))) throw new HttpError('החשבון של Google עדיין לא מחובר.', 409);
    const token = await accessTokenFor(user.id);
    const id = await createEvent({
        token,
        title: body.title,
        start: body.start,
        end: body.end,
        description: body.description
    });
    return NextResponse.json({ id });
});
