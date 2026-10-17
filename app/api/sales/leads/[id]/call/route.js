import { NextResponse } from 'next/server';
import { isUuid } from 'lib/sales/db';
import { HttpError, readJson, requireBusiness, route } from 'lib/sales/http';
import { placeOutboundCall } from 'lib/sales/outbound';

export const dynamic = 'force-dynamic';

// Dials one lead now. Every contact rule is checked first; a blocked call
// answers 409 with the reason.
export const POST = route(async (request, context) => {
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError('not found', 404);
    const { user, businessId } = await requireBusiness(request, 'manager');
    const body = await readJson(request);
    const goal = typeof body.goal === 'string' ? body.goal.slice(0, 500) : '';
    const result = await placeOutboundCall(businessId, id, { userId: user.id, goal });
    return NextResponse.json(result, { status: 201 });
});
