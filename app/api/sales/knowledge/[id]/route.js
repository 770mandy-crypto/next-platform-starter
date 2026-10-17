import { NextResponse } from 'next/server';
import { deleteKnowledge, updateKnowledge } from 'lib/sales/business';
import { isUuid, withTenant } from 'lib/sales/db';
import { HttpError, readJson, requireBusiness, route } from 'lib/sales/http';

export const dynamic = 'force-dynamic';

async function target(request, context) {
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError('not found', 404);
    return { id, ...(await requireBusiness(request, 'manager')) };
}

export const PUT = route(async (request, context) => {
    const { id, user, businessId } = await target(request, context);
    const input = await readJson(request);
    await withTenant(businessId, (db) => updateKnowledge(db, businessId, id, input, user.id));
    return NextResponse.json({ ok: true });
});

export const DELETE = route(async (request, context) => {
    const { id, user, businessId } = await target(request, context);
    await withTenant(businessId, (db) => deleteKnowledge(db, businessId, id, user.id));
    return NextResponse.json({ ok: true });
});
