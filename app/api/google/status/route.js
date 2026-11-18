import { NextResponse } from 'next/server';
import { requireUser, route } from 'lib/pilot/http';
import { isConnected, isGoogleConfigured } from 'lib/google/oauth';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const user = await requireUser(request);
    const configured = isGoogleConfigured();
    return NextResponse.json({ configured, connected: configured && (await isConnected(user.id)) });
});
