import { NextResponse } from 'next/server';
import { runInternalAction } from 'lib/pilot/ai';
import { buildIcs, buildMailto, buildShareUrl } from 'lib/pilot/handoff';
import { checkExecutable, requiresApproval, validateParams } from 'lib/pilot/policy';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { consumeAiQuota, recordAudit } from 'lib/pilot/workspace';

export const dynamic = 'force-dynamic';

function handoff(action) {
    const params = action.params ?? {};
    switch (action.type) {
        case 'send_email':
            return {
                kind: 'handoff',
                title: 'המייל מוכן לשליחה',
                note: 'בגרסת ה-MVP המייל נפתח בתוכנת הדואר שלך ונשלח רק כשתלחץ/י "שלח" שם.',
                href: buildMailto(params),
                cta: 'פתח בתוכנת המייל'
            };
        case 'schedule_event':
            return {
                kind: 'file',
                title: 'האירוע מוכן להוספה ליומן',
                note: 'קובץ ‎.ics‎ נפתח בכל יומן — Google, Outlook ו-Apple.',
                filename: 'maslul-event.ics',
                mime: 'text/calendar',
                data: buildIcs(params),
                cta: 'הורד והוסף ליומן'
            };
        case 'publish_post':
            return {
                kind: 'handoff',
                title: 'הפוסט מוכן לפרסום',
                note: 'הטקסט נפתח בחלון השיתוף של הרשת, והפרסום עצמו נעשה על ידך.',
                href: buildShareUrl(params),
                cta: 'פתח חלון פרסום'
            };
        default:
            throw new HttpError('פעולה לא נתמכת.', 400);
    }
}

export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);

    const action = body.action;
    const blocked = checkExecutable(action);
    if (blocked) throw new HttpError(blocked, 403);

    const problems = validateParams(action.type, action.params ?? {});
    if (problems.length) throw new HttpError(problems.join(' · '), 422);

    if (!requiresApproval(action.type)) {
        await consumeAiQuota(user.id);
        const result = await runInternalAction({ action, project: body.project, memory: body.memory ?? [] });
        return NextResponse.json({ kind: 'document', ...result });
    }

    const result = handoff(action);
    // The record of what was approved — the exact parameters, by whom, when —
    // is written before the hand-off is returned, so no approved action can
    // exist without its audit entry.
    await recordAudit(user.id, {
        event: 'approved',
        actionId: action.id ?? null,
        type: action.type,
        title: action.title ?? null,
        params: action.params,
        approvedAt: action.approval.at,
        approvedBy: user.email
    });
    return NextResponse.json(result);
});
