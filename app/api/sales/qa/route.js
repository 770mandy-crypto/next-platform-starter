import { NextResponse } from 'next/server';
import { isAgentConfigured } from 'lib/sales/agent';
import { HttpError, readJson, requireBusiness, route } from 'lib/sales/http';
import { runQaSuite } from 'lib/sales/qa';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Runs the pre-launch scenarios against the real model. Each scenario is a
// paid model conversation, so it is run on request only.
export const POST = route(async (request) => {
    const { businessId } = await requireBusiness(request, 'manager');
    if (!isAgentConfigured()) throw new HttpError('ai_not_configured', 503);
    const body = await readJson(request);
    const only = Array.isArray(body.only) ? body.only.map(String) : undefined;
    return NextResponse.json(await runQaSuite(businessId, { only }));
});
