import { NextResponse } from 'next/server';
import { isUuid, withTenant } from 'lib/sales/db';
import { HttpError, readJson, requireBusiness, route } from 'lib/sales/http';
import { patchLead } from 'lib/sales/leads';

export const dynamic = 'force-dynamic';

export const PATCH = route(async (request, context) => {
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError('not found', 404);
    const { user, businessId } = await requireBusiness(request, 'manager');
    const input = await readJson(request);
    await withTenant(businessId, (db) => patchLead(db, businessId, id, input, user.id));
    return NextResponse.json({ ok: true });
});
