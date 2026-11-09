import { NextResponse } from 'next/server';
import { confirmUrl, subscribe } from 'lib/nadlan/alerts';
import { getArea } from 'lib/nadlan/dataset';
import { confirmEmail, mailConfigured, sendMail, siteUrl } from 'lib/nadlan/mail';
import { consumeLimit } from 'lib/pilot/auth';
import { getDb } from 'lib/pilot/db';
import { clientIp, HttpError, readJson, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

const LIMIT = { limit: 10, windowMs: 60 * 60_000 };

// Follow a neighborhood by email. New addresses get a confirmation email first.
export const POST = route(async (request) => {
    if (!mailConfigured()) throw new HttpError('ההתראות במייל עוד לא מחוברות באתר. נסו שוב בקרוב.', 503);
    const body = await readJson(request);
    if (body?.website) throw new HttpError('הבקשה נדחתה.', 400);
    const area = await getArea(body?.areaId);
    if (!area) throw new HttpError('השכונה לא נמצאה.', 400);
    if (!(await consumeLimit(`matzpen-alert:${clientIp(request)}`, LIMIT))) throw new HttpError('יותר מדי בקשות. נסו שוב בעוד שעה.', 429);

    let result;
    try {
        result = await subscribe(await getDb(), { email: body.email, areaId: area.id });
    } catch {
        throw new HttpError('כתובת המייל לא תקינה.', 400);
    }
    const { record, sendConfirm } = result;
    if (sendConfirm) {
        const names = (await Promise.all(record.areaIds.map(getArea))).filter(Boolean).map((a) => `${a.name}, ${a.cityName}`);
        await sendMail({ to: record.email, ...confirmEmail({ confirmUrl: confirmUrl(siteUrl(), record), areaNames: names }) });
    }
    return NextResponse.json({ status: record.confirmed ? 'following' : 'confirm-sent' });
});
