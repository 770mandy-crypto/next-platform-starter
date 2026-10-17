import { NextResponse } from 'next/server';
import { isUuid } from 'lib/sales/db';
import { HttpError, readJson, requireBusiness, route } from 'lib/sales/http';
import { decideAction } from 'lib/sales/maintenance';

export const dynamic = 'force-dynamic';

// Only the owner approves what goes out to customers.
export const POST = route(async (request, context) => {
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError('not found', 404);
    const { user, businessId } = await requireBusiness(request, 'owner');
    const body = await readJson(request);
    const message = typeof body.message === 'string' && body.message.trim() ? body.message.slice(0, 1000) : undefined;
    return NextResponse.json(await decideAction(businessId, id, { decision: body.decision, userId: user.id, edits: { message } }));
});
