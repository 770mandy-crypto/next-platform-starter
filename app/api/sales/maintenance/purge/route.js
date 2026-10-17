import { NextResponse } from 'next/server';
import { HttpError, isCronRequest, route } from 'lib/sales/http';
import { purgeExpiredTranscripts } from 'lib/sales/maintenance';

export const dynamic = 'force-dynamic';

// Daily retention job. Requires SALES_CRON_SECRET.
export const POST = route(async (request) => {
    if (!isCronRequest(request)) throw new HttpError('forbidden', 403);
    return NextResponse.json(await purgeExpiredTranscripts());
});
