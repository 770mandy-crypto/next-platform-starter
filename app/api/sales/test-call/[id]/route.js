import { NextResponse } from 'next/server';
import { customerTurn, finishCall } from 'lib/sales/calls';
import { isUuid } from 'lib/sales/db';
import { HttpError, readJson, requireBusiness, route } from 'lib/sales/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// { text } is one thing the customer says; { action: "end" } hangs up.
export const POST = route(async (request, context) => {
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError('not found', 404);
    const { businessId } = await requireBusiness(request, 'manager');
    const body = await readJson(request);
    if (body.action === 'end') {
        const call = await finishCall(businessId, id);
        return NextResponse.json({ ended: true, outcome: call?.outcome ?? null, summary: call?.summary ?? '' });
    }
    const text = String(body.text ?? '').trim();
    if (!text) throw new HttpError('empty', 400);
    const turn = await customerTurn(businessId, id, text);
    if (turn.end) {
        const call = await finishCall(businessId, id, { status: turn.transfer ? 'transferred' : 'completed' });
        return NextResponse.json({ ...turn, ended: true, outcome: call?.outcome ?? null, summary: call?.summary ?? '' });
    }
    return NextResponse.json(turn);
});
