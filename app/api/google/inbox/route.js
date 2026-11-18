import { NextResponse } from 'next/server';
import { requireUser, route } from 'lib/pilot/http';
import { checkInbox } from 'lib/google/inbox-flow';
import { listDrafts } from 'lib/google/drafts';

export const dynamic = 'force-dynamic';

// Checks the inbox now: each new message becomes a pending draft.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const report = await checkInbox({ userId: user.id });
    return NextResponse.json(report);
});

// The drafts waiting for the person to read, edit, send or discard.
export const GET = route(async (request) => {
    const user = await requireUser(request);
    return NextResponse.json({ drafts: await listDrafts(user.id) });
});
