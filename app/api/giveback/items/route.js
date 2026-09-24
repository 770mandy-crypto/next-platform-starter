import { json, route } from 'lib/giveback/http';
import { createItem, listItems, publicItem } from 'lib/giveback/items';
import { rankItems } from 'lib/giveback/search';

export const dynamic = 'force-dynamic';

const MAX_RESULTS = 60;

// GET /api/giveback/items?lat=&lng=&q=&category=&radius=&mine=1
export const GET = route(async ({ request, user }) => {
    const params = new URL(request.url).searchParams;
    const lat = Number.parseFloat(params.get('lat'));
    const lng = Number.parseFloat(params.get('lng'));
    const origin = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    const radius = Number.parseFloat(params.get('radius'));
    const all = await listItems();

    if (params.get('mine') === '1') {
        const mine = user ? all.filter((i) => i.ownerId === user.id).sort((a, b) => b.createdAt - a.createdAt) : [];
        return json({ items: mine.map((item) => publicItem(item, { viewer: user })) });
    }

    const ranked = rankItems(all, {
        origin,
        query: params.get('q') ?? '',
        category: params.get('category') ?? '',
        radiusKm: Number.isFinite(radius) && radius > 0 ? radius : null
    });
    return json({
        total: ranked.length,
        items: ranked
            .slice(0, MAX_RESULTS)
            .map(({ item, distanceKm }) => publicItem(item, { viewer: user, distance: distanceKm }))
    });
});

export const POST = route(
    async ({ request, user }) => {
        const item = await createItem(user, await request.json());
        return json({ item: publicItem(item, { viewer: user }) }, 201);
    },
    { auth: true }
);
