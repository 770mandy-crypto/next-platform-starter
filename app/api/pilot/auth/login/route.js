import { NextResponse } from 'next/server';
import { authenticate, createSession, publicUser, sessionCookie } from 'lib/pilot/auth';
import { clientIp, readJson, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    const body = await readJson(request);
    const user = await authenticate({ email: body.email, password: body.password, ip: clientIp(request) });
    const response = NextResponse.json({ user: publicUser(user) });
    response.cookies.set(sessionCookie(await createSession(user.id)));
    return response;
});
