import { generateReply } from '../../../data/coach-engine.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    let message = '';
    try {
        const body = await request.json();
        message = typeof body?.message === 'string' ? body.message : '';
    } catch {
        return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    if (!message.trim()) {
        return Response.json({ error: 'לא התקבלה הודעה' }, { status: 400 });
    }

    const result = generateReply(message);
    return Response.json(result);
}
