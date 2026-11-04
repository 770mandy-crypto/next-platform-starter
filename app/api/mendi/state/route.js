import { NextResponse } from 'next/server';
import { requireUser, route } from 'lib/pilot/http';
import { connectorStatus } from 'lib/mendi/connectors';
import { isMendiConfigured } from 'lib/mendi/launch';
import { getSettings, listActions, listActivity, listFiles, listTasks } from 'lib/mendi/store';
import { getDb } from 'lib/pilot/db';

export const dynamic = 'force-dynamic';

// Everything the command room shows beside the chat: connections, approvals,
// files, tasks, the activity log and the autonomy settings.
export const GET = route(async (request) => {
    const user = await requireUser(request);
    const db = await getDb();
    const [actions, files, tasks, activity, settings, running] = await Promise.all([
        listActions(user.id),
        listFiles(user.id),
        listTasks(user.id),
        listActivity(user.id),
        getSettings(user.id),
        db.get(`mendi/${user.id}/running`)
    ]);
    return NextResponse.json(
        {
            ai: isMendiConfigured(),
            connectors: connectorStatus(),
            actions,
            files,
            tasks,
            activity,
            settings,
            running: running?.missionId?.startsWith('claim-') ? null : (running?.missionId ?? null)
        },
        { headers: { 'cache-control': 'no-store' } }
    );
});
