import { NextResponse } from 'next/server';
import { audit } from 'lib/sales/business';
import { isUuid, withTenant } from 'lib/sales/db';
import { HttpError, readJson, requireBusiness, route } from 'lib/sales/http';

export const dynamic = 'force-dynamic';

export const PATCH = route(async (request, context) => {
    const { id } = await context.params;
    if (!isUuid(id)) throw new HttpError('not found', 404);
    const { user, businessId } = await requireBusiness(request, 'manager');
    const { status } = await readJson(request);
    if (!['open', 'done', 'cancelled'].includes(status)) throw new HttpError('invalid status', 400);
    await withTenant(businessId, async (db) => {
        const { rowCount } = await db.query('UPDATE tasks SET status = $3 WHERE business_id = $1 AND id = $2', [businessId, id, status]);
        if (!rowCount) throw new HttpError('not found', 404);
        await audit(db, businessId, { actor: 'user', userId: user.id, action: 'task.updated', detail: { id, status } });
    });
    return NextResponse.json({ ok: true });
});
