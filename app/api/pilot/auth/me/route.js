import { NextResponse } from 'next/server';
import { destroySession, getSessionUser, publicUser, SESSION_COOKIE } from 'lib/pilot/auth';
import { deleteAccountData } from 'lib/pilot/workspace';
import { route, sessionToken } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const user = await getSessionUser(sessionToken(request));
    return NextResponse.json({ user: publicUser(user) });
});

// Deletes the account and everything stored for it, including the email index,
// so the address can be registered again. Sessions on other devices stop
// resolving because their user record is gone.
export const DELETE = route(async (request) => {
    const token = sessionToken(request);
    const user = await getSessionUser(token);
    if (!user) return NextResponse.json({ error: 'צריך להתחבר כדי להמשיך.' }, { status: 401 });
    await deleteAccountData(user);
    await destroySession(token);
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
});
