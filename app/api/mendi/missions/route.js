import { after, NextResponse } from 'next/server';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { createQueuedMission, dispatchToBackground, markFailed, publicMission } from 'lib/mendi/launch';
import { runMission } from 'lib/mendi/run';
import { listMissions } from 'lib/mendi/store';

export const dynamic = 'force-dynamic';

// The chat of one room (the manager, or one agent): its recent missions,
// oldest first.
export const GET = route(async (request) => {
    const user = await requireUser(request);
    const room = new URL(request.url).searchParams.get('room') || 'manager';
    const missions = (await listMissions(user.id, 80)).filter((mission) => mission.room === room).slice(0, 30).reverse();
    return NextResponse.json({ missions: missions.map(publicMission) });
});

// A new request to an agent. It is queued and handed to the background runner;
// the page then polls GET /api/mendi/missions/{id} to watch it.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body || typeof body !== 'object') throw new HttpError('גוף הבקשה אינו JSON תקין.', 400);

    const mission = await createQueuedMission(user, { room: body.room || 'manager', message: body.message });
    const origin = new URL(request.url).origin;

    if (!(await dispatchToBackground(mission, { userId: user.id, origin }))) {
        // Not on Netlify (or the background function is unavailable): run it in
        // this process once the response is sent.
        after(async () => {
            try {
                await runMission({ userId: user.id, missionId: mission.id, user: { name: user.name, email: user.email }, origin });
            } catch (error) {
                console.error('MENDI inline run failed:', error);
                await markFailed(user.id, mission, 'משהו השתבש בזמן העבודה. נסו שוב.').catch(() => {});
            }
        });
    }
    return NextResponse.json({ mission: publicMission(mission) }, { status: 202 });
});
