import { NextResponse } from 'next/server';
import { unsubscribe } from 'lib/nadlan/alerts';
import { getDb } from 'lib/pilot/db';
import { HttpError, readJson, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    const { id, t } = (await readJson(request)) ?? {};
    if (!(await unsubscribe(await getDb(), id, t))) throw new HttpError('הקישור לא תקין, או שכבר הוסרתם.', 400);
    return NextResponse.json({ ok: true });
});
