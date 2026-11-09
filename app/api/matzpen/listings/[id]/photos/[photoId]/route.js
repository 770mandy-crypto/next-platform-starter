import { NextResponse } from 'next/server';
import { removePhoto } from 'lib/nadlan/listings';
import { getPhotoStore } from 'lib/nadlan/photos';
import { getDb } from 'lib/pilot/db';
import { route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

export const DELETE = route(async (request, { params }) => {
    const { id, photoId } = await params;
    const photos = await removePhoto(await getDb(), await getPhotoStore(), id, request.headers.get('x-edit-token'), photoId);
    return NextResponse.json({ photos });
});
