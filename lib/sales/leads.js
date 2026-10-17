// Leads: CSV import, listing, updates, and the do-not-call list.

import { audit } from './business.js';
import { normalisePhone } from './phone.js';
import { LeadPatchSchema, LeadSchema, parseOrThrow } from './schemas.js';

// RFC 4180-style parsing: quoted fields, escaped quotes, CRLF.
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    const input = String(text ?? '').replace(/^﻿/, '');
    for (let i = 0; i < input.length; i += 1) {
        const c = input[i];
        if (quoted) {
            if (c === '"' && input[i + 1] === '"') {
                field += '"';
                i += 1;
            } else if (c === '"') quoted = false;
            else field += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') {
            row.push(field);
            field = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && input[i + 1] === '\n') i += 1;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else field += c;
    }
    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows.filter((r) => r.some((cell) => cell.trim()));
}

const HEADER_ALIASES = {
    name: ['name', 'full name', 'שם', 'שם מלא'],
    phone: ['phone', 'mobile', 'telephone', 'טלפון', 'נייד'],
    email: ['email', 'e-mail', 'אימייל', 'מייל', 'דוא"ל'],
    timezone: ['timezone', 'time zone', 'אזור זמן'],
    consent_call: ['consent_call', 'consent call', 'call consent', 'הסכמה לשיחה'],
    consent_sms: ['consent_sms', 'sms consent', 'הסכמה ל-sms', 'הסכמה לסמס'],
    consent_email: ['consent_email', 'email consent', 'הסכמה למייל'],
    consent_source: ['consent_source', 'consent source', 'מקור הסכמה'],
    allowed_context: ['allowed_context', 'context', 'מידע מותר'],
    notes: ['notes', 'הערות']
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', 'כן', 'v', '✓']);

export function mapCsvRows(rows) {
    if (rows.length < 2) return { leads: [], errors: [{ line: 1, error: 'no data rows' }] };
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const index = {};
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        const at = header.findIndex((h) => aliases.includes(h));
        if (at >= 0) index[field] = at;
    }
    if (index.phone === undefined) return { leads: [], errors: [{ line: 1, error: 'missing phone column' }] };
    const leads = [];
    const errors = [];
    rows.slice(1).forEach((cells, i) => {
        const get = (f) => (index[f] === undefined ? '' : String(cells[index[f]] ?? '').trim());
        leads.push({
            line: i + 2,
            name: get('name'),
            phone: get('phone'),
            email: get('email'),
            timezone: get('timezone') || null,
            consent_call: TRUE_VALUES.has(get('consent_call').toLowerCase()),
            consent_sms: TRUE_VALUES.has(get('consent_sms').toLowerCase()),
            consent_email: TRUE_VALUES.has(get('consent_email').toLowerCase()),
            consent_source: get('consent_source'),
            allowed_context: get('allowed_context'),
            notes: get('notes')
        });
    });
    return { leads, errors };
}

export async function upsertLead(db, business, input, source = 'manual') {
    const lead = parseOrThrow(LeadSchema, { ...input, source });
    const phone = normalisePhone(lead.phone, business.country);
    if (!phone) throw Object.assign(new Error('phone: invalid number'), { status: 400 });
    const { rows } = await db.query(
        `INSERT INTO leads (business_id, name, phone, email, timezone, source, consent_call, consent_sms, consent_email,
                            consent_source, allowed_context, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (business_id, phone) DO UPDATE SET
            name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE leads.name END,
            email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE leads.email END,
            timezone = coalesce(EXCLUDED.timezone, leads.timezone),
            consent_call = EXCLUDED.consent_call, consent_sms = EXCLUDED.consent_sms,
            consent_email = EXCLUDED.consent_email, consent_source = EXCLUDED.consent_source,
            allowed_context = EXCLUDED.allowed_context,
            notes = CASE WHEN EXCLUDED.notes <> '' THEN EXCLUDED.notes ELSE leads.notes END,
            updated_at = now()
         RETURNING id, (xmax = 0) AS inserted`,
        [
            business.id,
            lead.name,
            phone,
            lead.email,
            lead.timezone,
            lead.source,
            lead.consent_call,
            lead.consent_sms,
            lead.consent_email,
            lead.consent_source,
            lead.allowed_context,
            lead.notes
        ]
    );
    return rows[0];
}

export async function importLeadsCsv(db, business, csvText, userId) {
    const { leads, errors } = mapCsvRows(parseCsv(csvText));
    if (leads.length > 5000) throw Object.assign(new Error('too many rows (max 5000)'), { status: 413 });
    let inserted = 0;
    let updated = 0;
    for (const { line, ...lead } of leads) {
        await db.query('SAVEPOINT lead_row');
        try {
            const result = await upsertLead(db, business, lead, 'csv');
            if (result.inserted) inserted += 1;
            else updated += 1;
            await db.query('RELEASE SAVEPOINT lead_row');
        } catch (error) {
            await db.query('ROLLBACK TO SAVEPOINT lead_row');
            errors.push({ line, error: error.status ? error.message : 'could not save' });
        }
    }
    await audit(db, business.id, { actor: 'user', userId, action: 'leads.imported', detail: { inserted, updated, errors: errors.length } });
    return { inserted, updated, errors };
}

export async function listLeads(db, businessId, { status, limit = 200 } = {}) {
    const { rows } = await db.query(
        `SELECT l.*, EXISTS (SELECT 1 FROM do_not_call d WHERE d.business_id = l.business_id AND d.phone = l.phone) AS on_dnc
         FROM leads l WHERE l.business_id = $1 AND l.source <> 'test_call' AND ($2::text IS NULL OR l.status = $2)
         ORDER BY l.updated_at DESC LIMIT $3`,
        [businessId, status ?? null, Math.min(limit, 1000)]
    );
    return rows;
}

export async function patchLead(db, businessId, leadId, input, userId) {
    const patch = parseOrThrow(LeadPatchSchema, input);
    const fields = Object.keys(patch);
    if (!fields.length) return;
    const sets = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const { rows } = await db.query(
        `UPDATE leads SET ${sets}, updated_at = now() WHERE business_id = $1 AND id = $2 RETURNING phone`,
        [businessId, leadId, ...fields.map((f) => patch[f])]
    );
    if (!rows[0]) throw Object.assign(new Error('not found'), { status: 404 });
    if (patch.status === 'do_not_call') await addDoNotCall(db, businessId, rows[0].phone, 'set by user', userId);
    await audit(db, businessId, { actor: 'user', userId, action: 'lead.updated', detail: { id: leadId, fields } });
}

export async function addDoNotCall(db, businessId, phone, reason, userId) {
    await db.query(
        `INSERT INTO do_not_call (business_id, phone, reason) VALUES ($1, $2, $3)
         ON CONFLICT (business_id, phone) DO NOTHING`,
        [businessId, phone, reason]
    );
    await db.query(
        "UPDATE leads SET status = 'do_not_call', next_call_at = NULL, updated_at = now() WHERE business_id = $1 AND phone = $2",
        [businessId, phone]
    );
    await audit(db, businessId, { actor: 'user', userId, action: 'dnc.added' });
}

export async function removeDoNotCall(db, businessId, phone, userId) {
    await db.query('DELETE FROM do_not_call WHERE business_id = $1 AND phone = $2', [businessId, phone]);
    await audit(db, businessId, { actor: 'user', userId, action: 'dnc.removed' });
}

export async function listDoNotCall(db, businessId) {
    const { rows } = await db.query(
        'SELECT phone, reason, created_at FROM do_not_call WHERE business_id = $1 ORDER BY created_at DESC',
        [businessId]
    );
    return rows;
}
