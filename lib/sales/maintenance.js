// Data retention and approval of agent-proposed actions.

import { audit, getBusiness } from './business.js';
import { withSystem, withTenant } from './db.js';
import { isTwilioConfigured, sendSms } from './twilio.js';

// Removes transcripts older than each business's retention period. Call
// summaries and outcomes stay; the words of the conversation do not.
export function purgeExpiredTranscripts(now = new Date()) {
    return withSystem(async (db) => {
        const { rows } = await db.query(
            `WITH expired AS (
                SELECT c.id FROM calls c JOIN businesses b ON b.id = c.business_id
                WHERE NOT c.transcript_purged AND c.ended_at IS NOT NULL
                  AND c.ended_at < $1::timestamptz - make_interval(days => b.retention_days)
             ), gone AS (
                DELETE FROM call_turns WHERE call_id IN (SELECT id FROM expired) RETURNING call_id
             )
             UPDATE calls SET model_messages = '[]'::jsonb, transcript_purged = true
             WHERE id IN (SELECT id FROM expired) RETURNING id`,
            [now]
        );
        await db.query('DELETE FROM sales_sessions WHERE expires_at < $1', [now]);
        await db.query("DELETE FROM sales_rate_limits WHERE window_start < $1::timestamptz - interval '1 day'", [now]);
        return { purgedCalls: rows.length };
    });
}

export async function listPendingActions(db, businessId) {
    const { rows } = await db.query(
        `SELECT p.*, l.name AS lead_name FROM pending_actions p
         LEFT JOIN leads l ON l.id = p.lead_id AND l.business_id = p.business_id
         WHERE p.business_id = $1 ORDER BY (p.status = 'pending') DESC, p.created_at DESC LIMIT 100`,
        [businessId]
    );
    return rows;
}

// A person approves or rejects. Approved SMS go out through Twilio when it is
// configured; email has no sending provider in this version, so an approved
// email is marked for the team to send by hand — never reported as sent.
export async function decideAction(businessId, actionId, { decision, userId, edits }) {
    if (!['approve', 'reject'].includes(decision)) throw Object.assign(new Error('invalid decision'), { status: 400 });
    const action = await withTenant(businessId, async (db) => {
        const { rows } = await db.query(
            `UPDATE pending_actions SET status = $3, decided_by = $4, decided_at = now(),
                payload = CASE WHEN $5::text IS NULL THEN payload ELSE jsonb_set(payload, '{message}', to_jsonb($5::text)) END
             WHERE business_id = $1 AND id = $2 AND status = 'pending' RETURNING *`,
            [businessId, actionId, decision === 'approve' ? 'approved' : 'rejected', userId, edits?.message ?? null]
        );
        if (!rows[0]) throw Object.assign(new Error('not pending'), { status: 409 });
        await audit(db, businessId, { actor: 'user', userId, action: `action.${decision}d`, detail: { id: actionId } });
        return { ...rows[0], business: await getBusiness(db, businessId) };
    });
    if (decision === 'reject') return { status: 'rejected' };

    let status = 'approved';
    let result = '';
    if (action.kind === 'send_sms') {
        if (!isTwilioConfigured() || !action.business.inbound_number) {
            result = 'Approved. SMS provider not configured — send it manually.';
        } else {
            try {
                const sent = await sendSms({ to: action.payload.to, from: action.business.inbound_number, body: action.payload.message });
                status = 'sent';
                result = `Twilio message ${sent.sid}`;
            } catch (error) {
                status = 'failed';
                result = error.message;
            }
        }
    } else {
        result = 'Approved. No email provider in this version — send it manually.';
    }
    await withTenant(businessId, (db) =>
        db.query('UPDATE pending_actions SET status = $3, result = $4 WHERE business_id = $1 AND id = $2', [
            businessId,
            actionId,
            status,
            result
        ])
    );
    return { status, result };
}
