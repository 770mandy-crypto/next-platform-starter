import { NextResponse } from 'next/server';
import { isCronRequest, requireBusiness, route } from 'lib/sales/http';
import { dispatchAll, dispatchBusiness } from 'lib/sales/outbound';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// A scheduler (with SALES_CRON_SECRET) dials for every business; a signed-in
// owner dials for their own business.
export const POST = route(async (request) => {
    if (isCronRequest(request)) return NextResponse.json({ results: await dispatchAll() });
    const { businessId } = await requireBusiness(request, 'owner');
    return NextResponse.json(await dispatchBusiness(businessId));
});
