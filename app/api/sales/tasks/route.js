import { NextResponse } from 'next/server';
import { withTenant } from 'lib/sales/db';
import { requireBusiness, route } from 'lib/sales/http';
import { listTasks } from 'lib/sales/metrics';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const { businessId } = await requireBusiness(request);
    const status = new URL(request.url).searchParams.get('status');
    const tasks = await withTenant(businessId, (db) =>
        listTasks(db, businessId, { status: ['open', 'done', 'cancelled'].includes(status) ? status : 'open' })
    );
    return NextResponse.json({ tasks });
});
