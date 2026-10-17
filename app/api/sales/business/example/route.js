import { NextResponse } from 'next/server';
import { membershipsOf } from 'lib/sales/auth';
import { createBusiness, createKnowledge } from 'lib/sales/business';
import { withTenant } from 'lib/sales/db';
import { EXAMPLE_BUSINESS, EXAMPLE_KNOWLEDGE } from 'lib/sales/example';
import { HttpError, requireUser, route } from 'lib/sales/http';

export const dynamic = 'force-dynamic';

// Starts the account with the fictional example business, to edit or replace.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    if ((await membershipsOf(user.id)).length) throw new HttpError('business_exists', 409);
    const business = await createBusiness(user.id, EXAMPLE_BUSINESS);
    await withTenant(business.id, async (db) => {
        for (const item of EXAMPLE_KNOWLEDGE) await createKnowledge(db, business.id, item, user.id);
    });
    return NextResponse.json({ business }, { status: 201 });
});
