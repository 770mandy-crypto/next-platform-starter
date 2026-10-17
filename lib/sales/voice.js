// Twilio voice webhooks. Each handler takes the verified form parameters and
// the call id from the URL, and returns TwiML. They never throw: a failure
// still answers with valid TwiML that apologises and hands the caller on.

import { normaliseBusinessRow } from './business.js';
import { customerTurn, finishCall, recordSilence, startCall } from './calls.js';
import { isUuid, withSystem, withTenant } from './db.js';
import { normalisePhone } from './phone.js';
import { linesFor } from './prompt.js';
import { gatherTwiml, hangupTwiml, transferTwiml, twiml } from './twilio.js';

const MAX_SILENCES = 2;

function turnUrl(callId) {
    return `${String(process.env.PUBLIC_BASE_URL).replace(/\/$/, '')}/api/sales/voice/turn?call=${callId}`;
}

// Finds the call a webhook is about. Crosses tenants (the webhook carries no
// session), so it binds the URL's call id to Twilio's CallSid.
async function resolveCall(callId, callSid) {
    if (!isUuid(callId) || !callSid) return null;
    return withSystem(async (db) => {
        const { rows } = await db.query(
            `UPDATE calls SET provider_call_sid = coalesce(provider_call_sid, $2)
             WHERE id = $1 AND (provider_call_sid IS NULL OR provider_call_sid = $2)
             RETURNING id, business_id, status, transfer_to, end_requested`,
            [callId, callSid]
        );
        if (!rows[0]) return null;
        const business = (await db.query('SELECT * FROM businesses WHERE id = $1', [rows[0].business_id])).rows[0];
        return { call: rows[0], business: normaliseBusinessRow(business) };
    });
}

const UNAVAILABLE = twiml(
    '<Say language="en-US">Sorry, this service is not available right now. Please try again later.</Say><Hangup/>'
);

export async function handleInbound(params) {
    try {
        const to = normalisePhone(params.To, 'US') ?? params.To;
        const business = await withSystem(async (db) => {
            const { rows } = await db.query('SELECT id FROM businesses WHERE inbound_number = $1', [to]);
            return rows[0] ?? null;
        });
        if (!business) return UNAVAILABLE;
        const { call, business: full, opening } = await startCall(business.id, {
            direction: 'inbound',
            channel: 'phone',
            from: normalisePhone(params.From, 'US') ?? String(params.From ?? ''),
            to,
            sid: params.CallSid
        });
        return gatherTwiml({ text: opening, business: full, actionUrl: turnUrl(call.id) });
    } catch (error) {
        console.error('sales inbound webhook failed:', error);
        return UNAVAILABLE;
    }
}

// The outbound call was answered (or reached voicemail).
export async function handleOutboundAnswer(callId, params) {
    const found = await resolveCall(callId, params.CallSid).catch(() => null);
    if (!found) return UNAVAILABLE;
    const { call, business } = found;
    try {
        if (String(params.AnsweredBy ?? '').startsWith('machine') || params.AnsweredBy === 'fax') {
            // Never leave an automated message on a voicemail.
            await finishCall(business.id, call.id, { status: 'no_answer' });
            return twiml('<Hangup/>');
        }
        const opening = await withTenant(business.id, async (db) => {
            await db.query("UPDATE calls SET status = 'active', started_at = now() WHERE business_id = $1 AND id = $2 AND status = 'queued'", [
                business.id,
                call.id
            ]);
            const { rows } = await db.query(
                "SELECT content FROM call_turns WHERE call_id = $1 AND business_id = $2 AND role = 'agent' ORDER BY id LIMIT 1",
                [call.id, business.id]
            );
            return rows[0]?.content ?? '';
        });
        return gatherTwiml({ text: opening, business, actionUrl: turnUrl(call.id) });
    } catch (error) {
        console.error('sales outbound webhook failed:', error);
        return hangupTwiml({ text: linesFor(business).error, business });
    }
}

export async function handleTurn(callId, params, { silence = false, client } = {}) {
    const found = await resolveCall(callId, params.CallSid).catch(() => null);
    if (!found) return UNAVAILABLE;
    const { call, business } = found;
    const lines = linesFor(business);
    const speech = String(params.SpeechResult ?? '').trim();
    try {
        if (silence || !speech) {
            const count = await recordSilence(business.id, call.id);
            if (count > MAX_SILENCES) return hangupTwiml({ text: lines.goodbye, business });
            return gatherTwiml({ text: lines.silence, business, actionUrl: turnUrl(call.id) });
        }
        const turn = await customerTurn(business.id, call.id, speech, { client });
        if (turn.transfer) return transferTwiml({ text: turn.reply, business, to: turn.transfer });
        if (turn.end) return hangupTwiml({ text: turn.reply, business });
        return gatherTwiml({ text: turn.reply, business, actionUrl: turnUrl(call.id) });
    } catch (error) {
        console.error('sales turn webhook failed:', error);
        return business.handoff_phone
            ? transferTwiml({ text: lines.error, business, to: business.handoff_phone })
            : hangupTwiml({ text: lines.error, business });
    }
}

const STATUS_MAP = { completed: 'completed', 'no-answer': 'no_answer', busy: 'no_answer', failed: 'failed', canceled: 'failed' };

// Twilio's final status callback: the call is over, whatever happened.
export async function handleStatus(callId, params, { client } = {}) {
    const found = await resolveCall(callId, params.CallSid).catch(() => null);
    if (!found) return;
    const { call, business } = found;
    let status = STATUS_MAP[params.CallStatus];
    if (!status) return; // not a final status
    if (status === 'completed' && call.transfer_to) status = 'transferred';
    if (status === 'completed' && call.status === 'queued') status = 'no_answer';
    await finishCall(business.id, call.id, { status, client });
}
