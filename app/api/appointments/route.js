import { NextResponse } from 'next/server';
import { consumeLimit } from 'lib/pilot/auth';
import { clientIp } from 'lib/pilot/http';
import { isPlannerConfigured, planAppointment } from 'lib/appointments/planner';
import { MAX_BODY_BYTES, parseAppointmentRequest, RequestError } from 'lib/appointments/request';
import { ndjsonResponse } from 'lib/research/response';

export const dynamic = 'force-dynamic';

// Plans per address per day: open to anyone, so this caps the cost.
const DAILY_LIMIT = () => Number(process.env.APPOINTMENTS_DAILY_LIMIT) || 10;

const fail = (message, status) => NextResponse.json({ error: message }, { status });

export async function POST(request) {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail('הבקשה ארוכה מדי.', 413);
    let input;
    try {
        input = parseAppointmentRequest(JSON.parse(raw || '{}'));
    } catch (error) {
        if (error instanceof RequestError) return fail(error.message, error.status);
        return fail('הבקשה לא תקינה.', 400);
    }
    if (!isPlannerConfigured()) return fail('מכין התורים עדיין לא מחובר: חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    try {
        if (!(await consumeLimit(`appointments:${clientIp(request)}`, { limit: DAILY_LIMIT(), windowMs: 24 * 60 * 60_000 }))) {
            return fail('הגעתם למכסה היומית. אפשר לנסות שוב מחר.', 429);
        }
    } catch (error) {
        console.error('Appointments rate limit unavailable:', error);
        return fail('השירות לא זמין כרגע. נסו שוב בעוד כמה דקות.', 503);
    }
    return ndjsonResponse(request, (signal) => planAppointment({ input, signal }), 'Appointment planning');
}
