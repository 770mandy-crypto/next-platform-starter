import { getPhotoStore, photoKey, validPhotoId } from 'lib/nadlan/photos';

export const dynamic = 'force-dynamic';

// Serves a listing photo. Photo ids are random and never reused, so the
// response can be cached for a long time.
export async function GET(request, { params }) {
    const { listingId, photoId } = await params;
    if (!validPhotoId(listingId) || !validPhotoId(photoId)) return new Response('Not found', { status: 404 });
    const photo = await (await getPhotoStore()).get(photoKey(listingId, photoId));
    if (!photo) return new Response('Not found', { status: 404 });
    return new Response(photo.bytes, {
        headers: {
            'content-type': photo.type,
            'cache-control': 'public, max-age=31536000, immutable',
            'x-content-type-options': 'nosniff'
        }
    });
}
