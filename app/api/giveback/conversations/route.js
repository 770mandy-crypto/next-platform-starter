import { listInbox, messageAboutItem } from 'lib/giveback/conversations';
import { json, route } from 'lib/giveback/http';

export const dynamic = 'force-dynamic';

export const GET = route(async ({ user }) => json({ conversations: await listInbox(user) }), { auth: true });

// First contact about an item: { itemId, text }.
export const POST = route(
    async ({ request, user }) => {
        const { itemId, text } = await request.json();
        const conv = await messageAboutItem(user, String(itemId ?? ''), text);
        return json({ id: conv.id }, 201);
    },
    { auth: true }
);
