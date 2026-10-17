import { NextResponse } from 'next/server';
import { isUuid, withTenant } from 'lib/sales/db';
import { HttpError, requireBusiness, route } from 'lib/sales/http';
import { callDetail } from 'lib/sales/metrics';

export const dynamic = 'force-dynamic';

export const GET = route(async (request, context) => {
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError('not found', 404);
    const { businessId } = await requireBusiness(request);
    const detail = await withTenant(businessId, (db) => callDetail(db, businessId, id));
    if (!detail) throw new HttpError('not found', 404);
    return NextResponse.json(detail);
});
