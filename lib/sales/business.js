// Business profile and knowledge base.

import { normalisePhone } from './phone.js';
import { BusinessSchema, KnowledgeSchema, parseOrThrow } from './schemas.js';
import { withSystem } from './db.js';

const BUSINESS_FIELDS = Object.keys(BusinessSchema.shape);

function prepareBusiness(input) {
    const data = parseOrThrow(BusinessSchema, input);
    for (const field of ['contact_phone', 'handoff_phone', 'inbound_number']) {
        if (!data[field]) {
            data[field] = field === 'inbound_number' ? null : '';
            continue;
        }
        const phone = normalisePhone(data[field], data.country);
        if (!phone) {
            const error = new Error(`${field}: invalid phone number`);
            error.status = 400;
            throw error;
        }
        data[field] = phone;
    }
    return data;
}

const asJson = (field, value) => (['business_hours', 'calling_window'].includes(field) ? JSON.stringify(value) : value);

export async function audit(db, businessId, { actor, userId = null, action, detail = {} }) {
    await db.query('INSERT INTO audit_log (business_id, user_id, actor, action, detail) VALUES ($1, $2, $3, $4, $5)', [
        businessId,
        userId,
        actor,
        action,
        JSON.stringify(detail)
    ]);
}

// Creating a business has no tenant yet, so it is a system operation; the
// creator becomes its owner in the same transaction.
export function createBusiness(userId, input) {
    const data = prepareBusiness(input);
    return withSystem(async (db) => {
        const columns = BUSINESS_FIELDS;
        const { rows } = await db.query(
            `INSERT INTO businesses (${columns.join(', ')})
             VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
            columns.map((c) => asJson(c, data[c]))
        );
        const business = rows[0];
        await db.query("INSERT INTO business_members (business_id, user_id, role) VALUES ($1, $2, 'owner')", [
            business.id,
            userId
        ]);
        await audit(db, business.id, { actor: 'user', userId, action: 'business.created' });
        return business;
    }).catch(uniqueNumberError);
}

function uniqueNumberError(error) {
    if (error.code === '23505' && /inbound_number/.test(error.constraint ?? error.detail ?? '')) {
        const conflict = new Error('inbound_number: already used by another business');
        conflict.status = 409;
        throw conflict;
    }
    throw error;
}

export async function getBusiness(db, businessId) {
    const { rows } = await db.query('SELECT * FROM businesses WHERE id = $1', [businessId]);
    if (!rows[0]) {
        const error = new Error('business not found');
        error.status = 404;
        throw error;
    }
    return normaliseBusinessRow(rows[0]);
}

export function normaliseBusinessRow(row) {
    return { ...row, telephony_cost_per_minute: Number(row.telephony_cost_per_minute) };
}

export async function updateBusiness(db, businessId, input, userId) {
    const data = prepareBusiness(input);
    const sets = BUSINESS_FIELDS.map((c, i) => `${c} = $${i + 2}`).join(', ');
    try {
        const { rows } = await db.query(
            `UPDATE businesses SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`,
            [businessId, ...BUSINESS_FIELDS.map((c) => asJson(c, data[c]))]
        );
        await audit(db, businessId, { actor: 'user', userId, action: 'business.updated' });
        return normaliseBusinessRow(rows[0]);
    } catch (error) {
        return uniqueNumberError(error);
    }
}

// --- Knowledge -------------------------------------------------------------

export async function listKnowledge(db, businessId) {
    const { rows } = await db.query(
        `SELECT id, kind, title, content, price, currency, active, verified, updated_at
         FROM knowledge_items WHERE business_id = $1 ORDER BY kind, title`,
        [businessId]
    );
    return rows.map((r) => ({ ...r, price: r.price === null ? null : Number(r.price) }));
}

export async function createKnowledge(db, businessId, input, userId) {
    const k = parseOrThrow(KnowledgeSchema, input);
    const { rows } = await db.query(
        `INSERT INTO knowledge_items (business_id, kind, title, content, price, currency, active, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [businessId, k.kind, k.title, k.content, k.price, k.currency, k.active, k.verified]
    );
    await audit(db, businessId, { actor: 'user', userId, action: 'knowledge.created', detail: { id: rows[0].id } });
    return rows[0];
}

export async function updateKnowledge(db, businessId, id, input, userId) {
    const k = parseOrThrow(KnowledgeSchema, input);
    const { rowCount } = await db.query(
        `UPDATE knowledge_items SET kind = $3, title = $4, content = $5, price = $6, currency = $7,
             active = $8, verified = $9, updated_at = now()
         WHERE business_id = $1 AND id = $2`,
        [businessId, id, k.kind, k.title, k.content, k.price, k.currency, k.active, k.verified]
    );
    if (!rowCount) throw Object.assign(new Error('not found'), { status: 404 });
    await audit(db, businessId, { actor: 'user', userId, action: 'knowledge.updated', detail: { id } });
}

export async function deleteKnowledge(db, businessId, id, userId) {
    const { rowCount } = await db.query('DELETE FROM knowledge_items WHERE business_id = $1 AND id = $2', [
        businessId,
        id
    ]);
    if (!rowCount) throw Object.assign(new Error('not found'), { status: 404 });
    await audit(db, businessId, { actor: 'user', userId, action: 'knowledge.deleted', detail: { id } });
}

// What the agent may use: only items the owner marked active AND verified.
export async function agentKnowledge(db, businessId) {
    const { rows } = await db.query(
        `SELECT id, kind, title, content, price, currency FROM knowledge_items
         WHERE business_id = $1 AND active AND verified ORDER BY kind, title`,
        [businessId]
    );
    return rows.map((r) => ({ ...r, price: r.price === null ? null : Number(r.price) }));
}

// Full-text search over verified knowledge, falling back to a substring match
// (the 'simple' configuration does no Hebrew stemming).
export async function searchKnowledge(db, businessId, query, limit = 5) {
    const text = String(query ?? '').trim().slice(0, 200);
    if (!text) return [];
    const { rows } = await db.query(
        `SELECT id, kind, title, content, price, currency,
                ts_rank(search, plainto_tsquery('simple', $2)) AS rank
         FROM knowledge_items
         WHERE business_id = $1 AND active AND verified
           AND (search @@ plainto_tsquery('simple', $2) OR title ILIKE '%' || $3 || '%' OR content ILIKE '%' || $3 || '%')
         ORDER BY rank DESC, title LIMIT $4`,
        [businessId, text, text.replace(/[%_\\]/g, '\\$&'), limit]
    );
    return rows.map(({ rank, ...r }) => ({ ...r, price: r.price === null ? null : Number(r.price) }));
}
