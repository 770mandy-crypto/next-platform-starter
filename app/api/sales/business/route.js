import { NextResponse } from 'next/server';
import { membershipsOf } from 'lib/sales/auth';
import { createBusiness, getBusiness, updateBusiness } from 'lib/sales/business';
import { withTenant } from 'lib/sales/db';
import { HttpError, readJson, requireBusiness, requireUser, route } from 'lib/sales/http';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const { businessId, role } = await requireBusiness(request);
    const business = await withTenant(businessId, (db) => getBusiness(db, businessId));
    return NextResponse.json({ business, role });
});

// One business per account in this version.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    if ((await membershipsOf(user.id)).length) throw new HttpError('business_exists', 409);
    const business = await createBusiness(user.id, await readJson(request));
    return NextResponse.json({ business }, { status: 201 });
});

export const PUT = route(async (request) => {
    const { user, businessId } = await requireBusiness(request, 'owner');
    const input = await readJson(request);
    const business = await withTenant(businessId, (db) => updateBusiness(db, businessId, input, user.id));
    return NextResponse.json({ business });
});
