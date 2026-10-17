import { NextResponse } from 'next/server';
import { withTenant } from 'lib/sales/db';
import { requireBusiness, route } from 'lib/sales/http';
import { listPendingActions } from 'lib/sales/maintenance';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const { businessId } = await requireBusiness(request);
    return NextResponse.json({ actions: await withTenant(businessId, (db) => listPendingActions(db, businessId)) });
});
