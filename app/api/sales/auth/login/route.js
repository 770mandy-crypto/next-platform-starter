import { NextResponse } from 'next/server';
import { authenticate, createSession, sessionCookie } from 'lib/sales/auth';
import { clientIp, readJson, route } from 'lib/sales/http';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    const body = await readJson(request);
    const user = await authenticate({ email: body.email, password: body.password, ip: clientIp(request) });
    const response = NextResponse.json({ user });
    response.cookies.set(sessionCookie(await createSession(user.id)));
    return response;
});
