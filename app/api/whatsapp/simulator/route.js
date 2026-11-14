import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { isBrainConfigured } from 'lib/whatsapp/brain';
import { handleMessage, scrubCardNumbers } from 'lib/whatsapp/engine';
import { clearOutbox, readOutbox, recordSimulatorMessage, simulatorPhone } from 'lib/whatsapp/outbound';
import { forgetHistory } from 'lib/whatsapp/store';

export const dynamic = 'force-dynamic';

// A WhatsApp chat in the browser, for trying the agent before (or without)
// connecting a WhatsApp number. Messages go through exactly the same engine
// as real ones; only the delivery differs (an outbox instead of WhatsApp).
// Signed-in users only, each with their own simulated number.

// New messages from the agent since `since`: replies, reminders, approvals.
export const GET = route(async (request) => {
    const user = await requireUser(request);
    const since = new URL(request.url).searchParams.get('since') ?? '';
    return NextResponse.json({ messages: await readOutbox(simulatorPhone(user.id), since) });
});

export const POST = route(async (request) => {
    const user = await requireUser(request);
    if (!isBrainConfigured()) throw new HttpError('חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    const body = await readJson(request);
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
    if (!text) throw new HttpError('ההודעה ריקה.', 400);
    const phone = simulatorPhone(user.id);
    // A card number typed here is not kept in the chat either.
    await recordSimulatorMessage(phone, scrubCardNumbers(text).clean);
    const status = await handleMessage({
        id: `sim.${randomBytes(8).toString('hex')}`,
        from: phone,
        name: user.name ?? null,
        type: 'text',
        text,
        timestamp: Date.now()
    });
    return NextResponse.json({ status });
});

// Start over: clears the chat and the conversation memory. Reminders, lists
// and remembered details stay, as they would in WhatsApp.
export const DELETE = route(async (request) => {
    const user = await requireUser(request);
    const phone = simulatorPhone(user.id);
    await clearOutbox(phone);
    await forgetHistory(phone);
    return NextResponse.json({ ok: true });
});
