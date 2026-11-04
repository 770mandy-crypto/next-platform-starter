import { NextResponse } from 'next/server';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { approveAction, rejectAction } from 'lib/mendi/actions';
import { isConnected } from 'lib/mendi/connectors';
import { getAction } from 'lib/mendi/store';

export const dynamic = 'force-dynamic';

// Approve (optionally with an edited subject or text) or reject an outside
// action that an agent prepared. Approving sends it, exactly once.
export const POST = route(async (request, { params }) => {
    const user = await requireUser(request);
    const { id } = await params;
    const body = await readJson(request);

    const action = await getAction(user.id, id);
    if (!action) throw new HttpError('הפעולה לא נמצאה.', 404);

    if (body.decision === 'reject') {
        const rejected = await rejectAction(user.id, id);
        if (!rejected) throw new HttpError('הפעולה כבר טופלה.', 409);
        return NextResponse.json({ action: rejected });
    }
    if (body.decision !== 'approve') throw new HttpError('החלטה לא מוכרת.', 400);
    if (!isConnected(action.kind)) {
        throw new HttpError(
            action.kind === 'email'
                ? 'שליחת מיילים עדיין לא מחוברת (RESEND_API_KEY ו-MENDI_EMAIL_FROM).'
                : 'WhatsApp עדיין לא מחובר (WHATSAPP_TOKEN ו-WHATSAPP_PHONE_NUMBER_ID).',
            503
        );
    }
    const result = await approveAction(user.id, id, {
        origin: new URL(request.url).origin,
        edits: { subject: body.subject, body: body.body }
    });
    if (!result) throw new HttpError('הפעולה כבר טופלה.', 409);
    return NextResponse.json({ action: result }, { status: result.status === 'sent' ? 200 : 502 });
});
