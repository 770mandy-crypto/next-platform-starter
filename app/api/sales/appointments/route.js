import { NextResponse } from 'next/server';
import { withTenant } from 'lib/sales/db';
import { requireBusiness, route } from 'lib/sales/http';
import { listAppointments } from 'lib/sales/metrics';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const { businessId } = await requireBusiness(request);
    return NextResponse.json({ appointments: await withTenant(businessId, (db) => listAppointments(db, businessId)) });
});
