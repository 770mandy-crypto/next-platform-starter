import { z } from 'zod';
import { createUser, renameUser } from 'lib/giveback/auth';
import { json, route } from 'lib/giveback/http';
import { listInbox } from 'lib/giveback/conversations';

export const dynamic = 'force-dynamic';

const name = z.string().trim().min(2, 'שם קצר מדי').max(30, 'שם ארוך מדי');

export const GET = route(async ({ user }) => {
    if (!user) return json({ user: null, unread: 0 });
    const inbox = await listInbox(user);
    return json({ user, unread: inbox.reduce((sum, c) => sum + c.unread, 0) });
});

export const POST = route(async ({ request, user }) => {
    const body = await request.json();
    const chosen = name.parse(body?.name);
    const saved = user ? await renameUser(user, chosen) : await createUser(chosen);
    return json({ user: saved, unread: 0 });
});
