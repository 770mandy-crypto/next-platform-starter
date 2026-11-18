import { NextResponse } from 'next/server';
import { HttpError, requireUser, route } from 'lib/pilot/http';
import { buildAuthUrl, createState, isGoogleConfigured } from 'lib/google/oauth';

export const dynamic = 'force-dynamic';

// Returns the Google consent address; the page sends the browser there.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    if (!isGoogleConfigured()) throw new HttpError('החיבור ל-Google עדיין לא מוגדר בהגדרות האתר.', 503);
    const state = await createState(user.id);
    return NextResponse.json({ url: buildAuthUrl(state) });
});
