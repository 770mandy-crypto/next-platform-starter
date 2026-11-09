import { NextResponse } from 'next/server';
import { deleteListing } from 'lib/nadlan/listings';
import { getPhotoStore } from 'lib/nadlan/photos';
import { getDb } from 'lib/pilot/db';
import { HttpError, readJson, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

// The owner removes a listing (and its photos) with the token from their management link.
export const DELETE = route(async (request, { params }) => {
    const { id } = await params;
    const { token } = (await readJson(request)) ?? {};
    if (!(await deleteListing(await getDb(), id, token, await getPhotoStore()))) throw new HttpError('הקישור לא תקין או שהמודעה כבר נמחקה.', 403);
    return NextResponse.json({ ok: true });
});
