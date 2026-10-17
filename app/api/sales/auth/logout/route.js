import { NextResponse } from 'next/server';
import { destroySession, SESSION_COOKIE } from 'lib/sales/auth';
import { route, sessionToken } from 'lib/sales/http';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    await destroySession(sessionToken(request));
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
});
