import { NextResponse } from 'next/server';
import { getBusiness } from 'lib/sales/business';
import { withTenant } from 'lib/sales/db';
import { readJson, requireBusiness, route } from 'lib/sales/http';
import { importLeadsCsv, listLeads, upsertLead } from 'lib/sales/leads';
import { LEAD_STATUSES } from 'lib/sales/schemas';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const { businessId } = await requireBusiness(request);
    const status = new URL(request.url).searchParams.get('status');
    const leads = await withTenant(businessId, (db) =>
        listLeads(db, businessId, { status: LEAD_STATUSES.includes(status) ? status : undefined })
    );
    return NextResponse.json({ leads });
});

// Either one lead (JSON fields) or a CSV file's text as { csv }.
export const POST = route(async (request) => {
    const { user, businessId } = await requireBusiness(request, 'manager');
    const body = await readJson(request);
    const result = await withTenant(businessId, async (db) => {
        const business = await getBusiness(db, businessId);
        return typeof body.csv === 'string'
            ? importLeadsCsv(db, business, body.csv, user.id)
            : upsertLead(db, business, body, 'manual');
    });
    return NextResponse.json(result, { status: 201 });
});
