import { NextResponse } from 'next/server';
import { readJson, requireUser, route } from 'lib/pilot/http';
import { saveSettings } from 'lib/mendi/store';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    const user = await requireUser(request);
    const settings = await saveSettings(user.id, await readJson(request));
    return NextResponse.json({ settings });
});
