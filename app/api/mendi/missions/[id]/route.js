import { NextResponse } from 'next/server';
import { requireUser, route } from 'lib/pilot/http';
import { publicMission } from 'lib/mendi/launch';
import { getMission } from 'lib/mendi/store';

export const dynamic = 'force-dynamic';

export const GET = route(async (request, { params }) => {
    const user = await requireUser(request);
    const { id } = await params;
    const mission = await getMission(user.id, id);
    if (!mission) return NextResponse.json({ error: 'המשימה לא נמצאה.' }, { status: 404 });
    return NextResponse.json({ mission: publicMission(mission) }, { headers: { 'cache-control': 'no-store' } });
});
