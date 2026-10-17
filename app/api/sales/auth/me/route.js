import { NextResponse } from 'next/server';
import { getSessionUser, membershipsOf } from 'lib/sales/auth';
import { route, sessionToken } from 'lib/sales/http';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const user = await getSessionUser(sessionToken(request));
    if (!user) return NextResponse.json({ user: null });
    const [membership] = await membershipsOf(user.id);
    return NextResponse.json({ user, business: membership ?? null });
});
