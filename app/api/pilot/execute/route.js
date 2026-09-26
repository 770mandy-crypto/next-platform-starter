import { NextResponse } from 'next/server';
import { runInternalAction } from 'lib/pilot/ai';
import { buildIcs, buildMailto, buildShareUrl } from 'lib/pilot/handoff';
import { checkExecutable, validateParams } from 'lib/pilot/policy';
import { readJson } from '../_input';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { body, error } = await readJson(request);
    if (error) return error;

    const action = body.action;
    const blocked = checkExecutable(action);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });

    const params = action.params ?? {};
    const problems = validateParams(action.type, params);
    if (problems.length) return NextResponse.json({ error: problems.join(' · ') }, { status: 422 });

    switch (action.type) {
        case 'research_topic':
        case 'create_content': {
            const result = await runInternalAction({ action, project: body.project, memory: body.memory ?? [] });
            return NextResponse.json({ kind: 'document', ...result });
        }
        case 'send_email':
            return NextResponse.json({
                kind: 'handoff',
                title: 'המייל מוכן לשליחה',
                note: 'בגרסת ה-MVP המייל נפתח בתוכנת הדואר שלך ונשלח רק כשתלחץ/י "שלח" שם.',
                href: buildMailto(params),
                cta: 'פתח בתוכנת המייל'
            });
        case 'schedule_event':
            return NextResponse.json({
                kind: 'file',
                title: 'האירוע מוכן להוספה ליומן',
                note: 'קובץ ‎.ics‎ נפתח בכל יומן — Google, Outlook ו-Apple.',
                filename: 'maslul-event.ics',
                mime: 'text/calendar',
                data: buildIcs(params),
                cta: 'הורד והוסף ליומן'
            });
        case 'publish_post':
            return NextResponse.json({
                kind: 'handoff',
                title: 'הפוסט מוכן לפרסום',
                note: 'הטקסט נפתח בחלון השיתוף של הרשת, והפרסום עצמו נעשה על ידך.',
                href: buildShareUrl(params),
                cta: 'פתח חלון פרסום'
            });
        default:
            return NextResponse.json({ error: 'פעולה לא נתמכת.' }, { status: 400 });
    }
}
