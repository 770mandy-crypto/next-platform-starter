// Outbound calling. Every dial — one lead from the dashboard or a batch from
// the dispatcher — re-checks the contact rules inside a transaction that
// locks the lead row, so two dispatchers cannot dial the same person twice.

import { audit, getBusiness } from './business.js';
import { checkOutboundAllowed } from './compliance.js';
import { withSystem, withTenant } from './db.js';
import { greeting } from './prompt.js';
import { createOutboundCall, isTwilioConfigured } from './twilio.js';

export class OutboundBlocked extends Error {
    constructor(reason) {
        super(reason);
        this.reason = reason;
        this.status = 409;
    }
}

async function callsInLastHour(db, businessId) {
    const { rows } = await db.query(
        `SELECT count(*)::int AS n FROM calls
         WHERE business_id = $1 AND direction = 'outbound' AND channel = 'phone' AND started_at > now() - interval '1 hour'`,
        [businessId]
    );
    return rows[0].n;
}

// Reserves a call for a lead if every rule allows it. Returns the queued call.
export function reserveOutboundCall(businessId, leadId, { userId = null, goal = '', now = new Date() } = {}) {
    return withTenant(businessId, async (db) => {
        const business = await getBusiness(db, businessId);
        // Serialise reservations per business so the hourly limit holds.
        await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`outbound:${businessId}`]);
        const { rows } = await db.query('SELECT * FROM leads WHERE business_id = $1 AND id = $2 FOR UPDATE', [
            businessId,
            leadId
        ]);
        const lead = rows[0];
        if (!lead) throw Object.assign(new Error('lead not found'), { status: 404 });
        const dnc = await db.query('SELECT 1 FROM do_not_call WHERE business_id = $1 AND phone = $2', [
            businessId,
            lead.phone
        ]);
        const reason = checkOutboundAllowed({
            business,
            lead,
            onDoNotCallList: dnc.rowCount > 0,
            callsLastHour: await callsInLastHour(db, businessId),
            now
        });
        if (reason) throw new OutboundBlocked(reason);
        if (!business.inbound_number) throw new OutboundBlocked('no_caller_id');

        await db.query(
            'UPDATE leads SET attempts = attempts + 1, last_called_at = $3, updated_at = now() WHERE business_id = $1 AND id = $2',
            [businessId, leadId, now]
        );
        const call = (
            await db.query(
                `INSERT INTO calls (business_id, lead_id, direction, channel, status, from_number, to_number, goal)
                 VALUES ($1, $2, 'outbound', 'phone', 'queued', $3, $4, $5) RETURNING *`,
                [businessId, leadId, business.inbound_number, lead.phone, goal]
            )
        ).rows[0];
        await db.query("INSERT INTO call_turns (call_id, business_id, role, content) VALUES ($1, $2, 'agent', $3)", [
            call.id,
            businessId,
            greeting({ business, call, lead })
        ]);
        await audit(db, businessId, { actor: userId ? 'user' : 'system', userId, action: 'call.dialed', detail: { call_id: call.id } });
        return { call, business, lead };
    });
}

export async function placeOutboundCall(businessId, leadId, options = {}) {
    if (!isTwilioConfigured()) throw Object.assign(new Error('telephony_not_configured'), { status: 503 });
    const { call, business, lead } = await reserveOutboundCall(businessId, leadId, options);
    try {
        const created = await createOutboundCall({ to: lead.phone, from: business.inbound_number, callId: call.id });
        await withTenant(businessId, (db) =>
            db.query('UPDATE calls SET provider_call_sid = $3 WHERE business_id = $1 AND id = $2', [
                businessId,
                call.id,
                created.sid
            ])
        );
        return { callId: call.id, sid: created.sid };
    } catch (error) {
        await withTenant(businessId, (db) =>
            db.query(
                "UPDATE calls SET status = 'failed', outcome = 'failed', errors = errors + 1, ended_at = now(), summary = $3 WHERE business_id = $1 AND id = $2",
                [businessId, call.id, String(error.message).slice(0, 300)]
            )
        );
        throw error;
    }
}

// Picks due, consenting leads for one business and dials up to `max` of them.
export async function dispatchBusiness(businessId, { max = 5, now = new Date() } = {}) {
    const candidates = await withTenant(businessId, async (db) => {
        const { rows } = await db.query(
            `SELECT l.id FROM leads l
             WHERE l.business_id = $1 AND l.consent_call
               AND l.status IN ('new', 'contacted', 'interested')
               AND (l.next_call_at IS NULL OR l.next_call_at <= $2)
               AND NOT EXISTS (SELECT 1 FROM do_not_call d WHERE d.business_id = l.business_id AND d.phone = l.phone)
             ORDER BY l.next_call_at NULLS LAST, l.created_at LIMIT $3`,
            [businessId, now, max * 3]
        );
        return rows.map((r) => r.id);
    });
    const placed = [];
    const skipped = [];
    for (const leadId of candidates) {
        if (placed.length >= max) break;
        try {
            placed.push(await placeOutboundCall(businessId, leadId, { now }));
        } catch (error) {
            skipped.push({ leadId, reason: error.reason ?? error.message });
            if (error.reason === 'rate_limited' || error.reason === 'outbound_disabled' || error.status === 503) break;
        }
    }
    return { placed, skipped };
}

// Scheduled entry point: every business with outbound calling switched on.
export async function dispatchAll(options) {
    const ids = await withSystem(async (db) => {
        const { rows } = await db.query('SELECT id FROM businesses WHERE outbound_enabled');
        return rows.map((r) => r.id);
    });
    const results = {};
    for (const id of ids) results[id] = await dispatchBusiness(id, options);
    return results;
}
