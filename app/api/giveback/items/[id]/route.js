import { announceStatus } from 'lib/giveback/conversations';
import { json, route } from 'lib/giveback/http';
import { getItem, publicItem, setItemStatus } from 'lib/giveback/items';

export const dynamic = 'force-dynamic';

export const GET = route(async ({ request, params, user }) => {
    const item = await getItem(params.id);
    if (!item) return json({ error: 'הפריט לא נמצא' }, 404);
    const search = new URL(request.url).searchParams;
    const lat = Number.parseFloat(search.get('lat'));
    const lng = Number.parseFloat(search.get('lng'));
    const origin = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    return json({ item: publicItem(item, { viewer: user, origin }) });
});

// Owner-only: mark as available / reserved / given.
export const PATCH = route(
    async ({ request, params, user }) => {
        const { status } = await request.json();
        const item = await setItemStatus(user, params.id, status);
        await announceStatus(item);
        return json({ item: publicItem(item, { viewer: user }) });
    },
    { auth: true }
);
