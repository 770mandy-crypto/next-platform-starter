import { NextResponse } from 'next/server';
import { withTenant } from 'lib/sales/db';
import { requireBusiness, route } from 'lib/sales/http';
import { dashboard } from 'lib/sales/metrics';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const { businessId } = await requireBusiness(request);
    const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get('days')) || 30));
    return NextResponse.json(await withTenant(businessId, (db) => dashboard(db, businessId, { days })));
});
