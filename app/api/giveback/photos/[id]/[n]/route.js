import { getPhoto } from 'lib/giveback/items';

export async function GET(request, { params }) {
    const { id, n } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id) || !/^[0-3]$/.test(n)) return new Response('Not found', { status: 404 });
    const photo = await getPhoto(id, n);
    if (!photo) return new Response('Not found', { status: 404 });
    return new Response(photo.bytes, {
        headers: {
            'Content-Type': photo.contentType,
            // Photos never change once uploaded.
            'Cache-Control': 'public, max-age=31536000, immutable'
        }
    });
}
