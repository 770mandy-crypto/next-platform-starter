import { NextResponse } from 'next/server';
import { withTenant } from 'lib/sales/db';
import { requireBusiness, route } from 'lib/sales/http';
import { recentCalls } from 'lib/sales/metrics';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const { businessId } = await requireBusiness(request);
    const channel = new URL(request.url).searchParams.get('channel');
    const calls = await withTenant(businessId, (db) =>
        recentCalls(db, businessId, { channel: ['phone', 'web_test'].includes(channel) ? channel : undefined, limit: 100 })
    );
    return NextResponse.json({ calls });
});
