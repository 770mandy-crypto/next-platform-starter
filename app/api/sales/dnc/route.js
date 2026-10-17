import { NextResponse } from 'next/server';
import { getBusiness } from 'lib/sales/business';
import { withTenant } from 'lib/sales/db';
import { HttpError, readJson, requireBusiness, route } from 'lib/sales/http';
import { addDoNotCall, listDoNotCall, removeDoNotCall } from 'lib/sales/leads';
import { normalisePhone } from 'lib/sales/phone';

export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
    const { businessId } = await requireBusiness(request);
    return NextResponse.json({ entries: await withTenant(businessId, (db) => listDoNotCall(db, businessId)) });
});

async function phoneFrom(request, businessId) {
    const body = await readJson(request);
    const country = await withTenant(businessId, async (db) => (await getBusiness(db, businessId)).country);
    const phone = normalisePhone(body.phone, country);
    if (!phone) throw new HttpError('phone: invalid number', 400);
    return { phone, reason: String(body.reason ?? '').slice(0, 300) };
}

export const POST = route(async (request) => {
    const { user, businessId } = await requireBusiness(request, 'manager');
    const { phone, reason } = await phoneFrom(request, businessId);
    await withTenant(businessId, (db) => addDoNotCall(db, businessId, phone, reason || 'added by user', user.id));
    return NextResponse.json({ ok: true });
});

// Removing a number re-allows calls, so only the owner may do it.
export const DELETE = route(async (request) => {
    const { user, businessId } = await requireBusiness(request, 'owner');
    const { phone } = await phoneFrom(request, businessId);
    await withTenant(businessId, (db) => removeDoNotCall(db, businessId, phone, user.id));
    return NextResponse.json({ ok: true });
});
