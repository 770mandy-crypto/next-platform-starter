import { NextResponse } from 'next/server';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { discardDraft, updateDraftBody } from 'lib/google/drafts';

export const dynamic = 'force-dynamic';

// Edits the text of a pending draft. Nothing is sent by this.
export const PUT = route(async (request, { params }) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (typeof body.body !== 'string') throw new HttpError('חסר גוף ההודעה.', 400);
    const { id } = await params;
    return NextResponse.json({ draft: await updateDraftBody(user.id, id, body.body) });
});

// Throws the draft away without sending it.
export const DELETE = route(async (request, { params }) => {
    const user = await requireUser(request);
    const { id } = await params;
    return NextResponse.json({ draft: await discardDraft(user.id, id) });
});
