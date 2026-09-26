import { NextResponse } from 'next/server';
import { ACTIONS } from 'lib/pilot/policy';
import { clip, HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { listAudit, recordAudit } from 'lib/pilot/workspace';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const user = await requireUser(request);
    return NextResponse.json({ entries: await listAudit(user.id) });
});

// Rejections never reach /execute, so the client reports them here. Approvals
// are recorded by /execute itself and cannot be written through this route.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (body.event !== 'rejected' || !ACTIONS[body.type]) throw new HttpError('רשומה לא תקינה.', 400);
    const record = await recordAudit(user.id, {
        event: 'rejected',
        actionId: clip(body.actionId, 100) || null,
        type: body.type,
        title: clip(body.title, 200) || null,
        rejectedBy: user.email
    });
    return NextResponse.json({ entry: record }, { status: 201 });
});
