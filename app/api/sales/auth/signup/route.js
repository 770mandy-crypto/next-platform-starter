import { NextResponse } from 'next/server';
import { createSession, createUser, sessionCookie } from 'lib/sales/auth';
import { clientIp, readJson, route } from 'lib/sales/http';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    const body = await readJson(request);
    const user = await createUser({ name: body.name, email: body.email, password: body.password, ip: clientIp(request) });
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    response.cookies.set(sessionCookie(await createSession(user.id)));
    return response;
});
