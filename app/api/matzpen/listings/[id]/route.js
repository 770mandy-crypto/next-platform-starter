import { NextResponse } from 'next/server';
import { deleteListing } from 'lib/nadlan/listings';
import { getDb } from 'lib/pilot/db';
import { HttpError, readJson, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

// The owner removes a listing with the token from their management link.
export const DELETE = route(async (request, { params }) => {
    const { id } = await params;
    const { token } = (await readJson(request)) ?? {};
    if (!(await deleteListing(await getDb(), id, token))) throw new HttpError('הקישור לא תקין או שהמודעה כבר נמחקה.', 403);
    return NextResponse.json({ ok: true });
});
