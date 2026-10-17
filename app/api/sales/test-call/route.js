import { NextResponse } from 'next/server';
import { startCall } from 'lib/sales/calls';
import { isUuid, withTenant } from 'lib/sales/db';
import { readJson, requireBusiness, route } from 'lib/sales/http';
import { QA_PHONE } from 'lib/sales/qa';

export const dynamic = 'force-dynamic';

// Starts a browser test call. A test never touches a real lead: when one is
// chosen, only its allowed context is shown to the agent, and the customer
// number is the test number.
export const POST = route(async (request) => {
    const { businessId } = await requireBusiness(request, 'manager');
    const body = await readJson(request);
    const direction = body.direction === 'outbound' ? 'outbound' : 'inbound';
    let goal = typeof body.goal === 'string' ? body.goal.slice(0, 500) : '';
    if (isUuid(body.leadId)) {
        const lead = await withTenant(businessId, async (db) => {
            const { rows } = await db.query('SELECT name, allowed_context, needs FROM leads WHERE business_id = $1 AND id = $2', [
                businessId,
                body.leadId
            ]);
            return rows[0];
        });
        if (lead) {
            goal = `${goal}\nSimulated customer: ${lead.name || 'unknown'}. Allowed context: ${lead.allowed_context || 'none'}. ${lead.needs ? `Known needs: ${lead.needs}` : ''}`.trim();
        }
    }
    const { call, opening } = await startCall(businessId, {
        direction,
        channel: 'web_test',
        from: direction === 'inbound' ? QA_PHONE : '',
        to: direction === 'outbound' ? QA_PHONE : '',
        goal
    });
    return NextResponse.json({ callId: call.id, reply: opening }, { status: 201 });
});
