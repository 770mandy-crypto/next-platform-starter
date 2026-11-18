import { NextResponse } from 'next/server';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { accessTokenFor, isConnected } from 'lib/google/oauth';
import { sendDraft, validDraftId } from 'lib/google/drafts';

export const dynamic = 'force-dynamic';

// Sends one pending draft. The request must say confirm: true, which the page
// only sends after the person clicks the send button and accepts the prompt.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (body.confirm !== true) throw new HttpError('השליחה לא אושרה.', 400);
    if (!validDraftId(body.draftId)) throw new HttpError('הטיוטה לא נמצאה.', 404);
    if (!(await isConnected(user.id))) throw new HttpError('החשבון של Google עדיין לא מחובר.', 409);
    const token = await accessTokenFor(user.id);
    const draft = await sendDraft({ userId: user.id, id: body.draftId, token });
    return NextResponse.json({ draft });
});
