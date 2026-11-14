import { after, NextResponse } from 'next/server';
import { isWhatsAppConfigured, parseWebhook, verifySignature } from 'lib/whatsapp/api';
import { isBrainConfigured } from 'lib/whatsapp/brain';
import { handleMessage } from 'lib/whatsapp/engine';
import { safeEqual } from 'lib/meet/http';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 512_000;

// Meta's one-time check when the webhook is set up: echo the challenge if the
// verify token matches the one configured on the site.
export async function GET(request) {
    const params = new URL(request.url).searchParams;
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (expected && params.get('hub.mode') === 'subscribe' && safeEqual(params.get('hub.verify_token') ?? '', expected)) {
        return new Response(params.get('hub.challenge') ?? '', { headers: { 'content-type': 'text/plain' } });
    }
    return new Response('forbidden', { status: 403 });
}

// Every incoming WhatsApp message. Meta retries anything that is not a quick
// 200, so the reply goes out at once and the work (a Claude call, maybe a
// voice transcription) runs after it. Retries are dropped by message id.
export async function POST(request) {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'too large' }, { status: 413 });

    // Without the app secret anyone could post fake messages here, so it is
    // required rather than optional.
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret || !verifySignature({ secret, header: request.headers.get('x-hub-signature-256'), payload: raw })) {
        return NextResponse.json({ error: 'bad signature' }, { status: 401 });
    }
    if (!isWhatsAppConfigured() || !isBrainConfigured()) {
        console.error('WhatsApp webhook: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID or ANTHROPIC_API_KEY is missing.');
        return NextResponse.json({ ok: true });
    }
    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: 'bad json' }, { status: 400 });
    }

    const messages = parseWebhook(payload);
    if (messages.length) {
        after(async () => {
            for (const message of messages) {
                try {
                    await handleMessage(message);
                } catch (error) {
                    console.error('WhatsApp message failed:', error);
                }
            }
        });
    }
    return NextResponse.json({ ok: true });
}
