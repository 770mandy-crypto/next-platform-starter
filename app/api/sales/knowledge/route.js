import { NextResponse } from 'next/server';
import { createKnowledge, listKnowledge } from 'lib/sales/business';
import { withTenant } from 'lib/sales/db';
import { readJson, requireBusiness, route } from 'lib/sales/http';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const { businessId } = await requireBusiness(request);
    return NextResponse.json({ items: await withTenant(businessId, (db) => listKnowledge(db, businessId)) });
});

export const POST = route(async (request) => {
    const { user, businessId } = await requireBusiness(request, 'manager');
    const input = await readJson(request);
    const item = await withTenant(businessId, (db) => createKnowledge(db, businessId, input, user.id));
    return NextResponse.json({ item }, { status: 201 });
});
