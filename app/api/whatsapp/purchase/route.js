import { NextResponse } from 'next/server';
import { consumeLimit } from 'lib/pilot/auth';
import { clientIp, readJson, route, HttpError } from 'lib/pilot/http';
import { decide, publicPurchase } from 'lib/whatsapp/purchases';

export const dynamic = 'force-dynamic';

// Approve or reject a purchase request with the owner's PIN. The link's token
// identifies the request; the PIN proves it is the owner. Attempts are capped
// per request (it locks after a few wrong PINs) and per address.
export const POST = route(async (request) => {
    if (!(await consumeLimit(`wa-approve:${clientIp(request)}`, { limit: 20, windowMs: 15 * 60_000 }))) {
        throw new HttpError('יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.', 429);
    }
    const body = await readJson(request);
    const decided = await decide({
        id: String(body.id ?? ''),
        token: String(body.token ?? ''),
        pin: String(body.pin ?? ''),
        approve: body.approve === true
    });
    return NextResponse.json({ purchase: publicPurchase(decided) });
});
