import { getConversation, markRead, sendMessage, shareAddress, viewConversation } from 'lib/giveback/conversations';
import { json, route } from 'lib/giveback/http';
import { getItem } from 'lib/giveback/items';

export const dynamic = 'force-dynamic';

// Polled by the chat screen every few seconds.
export const GET = route(
    async ({ params, user }) => {
        const conv = await getConversation(params.cid, user);
        if (!conv) return json({ error: 'השיחה לא נמצאה' }, 404);
        await markRead(conv, user);
        const item = await getItem(conv.itemId);
        return json({
            conversation: viewConversation(conv, user),
            item: item
                ? {
                      id: item.id,
                      status: item.status,
                      area: item.area,
                      hasAddress: Boolean(item.address),
                      address: conv.ownerId === user.id ? item.address : undefined
                  }
                : null
        });
    },
    { auth: true }
);

// { text } sends a message; { kind: 'address', address } shares the pickup address.
export const POST = route(
    async ({ request, params, user }) => {
        const body = await request.json();
        const conv =
            body?.kind === 'address'
                ? await shareAddress(user, params.cid, body.address)
                : await sendMessage(user, params.cid, body?.text);
        return json({ conversation: viewConversation(conv, user) });
    },
    { auth: true }
);
