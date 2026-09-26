import { NextResponse } from 'next/server';
import { createSession, createUser, publicUser, sessionCookie } from 'lib/pilot/auth';
import { saveWorkspace } from 'lib/pilot/workspace';
import { clientIp, readJson, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    const body = await readJson(request);
    const user = await createUser({ name: body.name, email: body.email, password: body.password, ip: clientIp(request) });

    // A visitor who tried the app before signing up keeps what they built.
    if (body.importWorkspace && typeof body.importWorkspace === 'object') {
        await saveWorkspace(user.id, body.importWorkspace);
    }

    const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
    response.cookies.set(sessionCookie(await createSession(user.id)));
    return response;
});
