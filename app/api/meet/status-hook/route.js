import { after, NextResponse } from 'next/server';
import { handleStatusEvent } from 'lib/meet/engine';
import { verifySignature } from 'lib/meet/recall';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64_000;

// Bot lifecycle webhooks (joined, recording, ended), set up once in the Recall
// dashboard. Optional: without it the page refreshes the status itself, and
// the end-of-meeting summary is written the next time the meeting is opened.
// This URL has no per-meeting token, so the signature is mandatory.
export async function POST(request) {
    const secret = process.env.RECALL_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: 'RECALL_WEBHOOK_SECRET is not set' }, { status: 503 });
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'too large' }, { status: 413 });
    if (!verifySignature({ secret, headers: request.headers, payload: raw })) {
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
            await handleStatusEvent(payload);
        } catch (error) {
            console.error('Meet status hook failed:', error);
        }
    });
    return NextResponse.json({ ok: true });
}
