import { after, NextResponse } from 'next/server';
import { handleRealtimeEvent } from 'lib/meet/engine';
import { safeEqual } from 'lib/meet/http';
import { verifySignature } from 'lib/meet/recall';
import { getMeeting } from 'lib/meet/store';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 256_000;

// Where Recall delivers the live transcript and chat of one meeting. The URL
// carries a random token made for that meeting, and if a workspace
// verification secret is configured the signature is checked as well.
//
// Recall retries anything that is not a quick 2xx, once a second, so the reply
// goes out immediately and the work (which may include a spoken answer) runs
// after it. Duplicates from retries are dropped when the line is stored.
export async function POST(request, { params }) {
    const { id, token } = await params;
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'too large' }, { status: 413 });

    const meeting = await getMeeting(id);
    if (!meeting || !safeEqual(token, meeting.hookToken)) {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    const secret = process.env.RECALL_WEBHOOK_SECRET;
    if (secret && !verifySignature({ secret, headers: request.headers, payload: raw })) {
        return NextResponse.json({ error: 'bad signature' }, { status: 401 });
    }
    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: 'bad json' }, { status: 400 });
    }

    after(async () => {
        try {
            await handleRealtimeEvent(meeting, payload);
        } catch (error) {
            console.error('Meet hook failed:', error);
        }
    });
    return NextResponse.json({ ok: true });
}
