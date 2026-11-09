import { NextResponse } from 'next/server';
import { addPhoto } from 'lib/nadlan/listings';
import { getPhotoStore, MAX_BYTES } from 'lib/nadlan/photos';
import { getDb } from 'lib/pilot/db';
import { HttpError, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

// The owner uploads one photo as the raw request body, with the listing's
// management token in the x-edit-token header.
export const POST = route(async (request, { params }) => {
    const { id } = await params;
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_BYTES) throw new HttpError('התמונה גדולה מדי.', 413);
    const bytes = await request.arrayBuffer();
    const photos = await addPhoto(await getDb(), await getPhotoStore(), id, request.headers.get('x-edit-token'), bytes);
    return NextResponse.json({ photos });
});
