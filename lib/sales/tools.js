// The actions the agent can take during a call. Each runs in its own short
// tenant transaction, validates its input, and returns a plain result the
// model reads. Nothing here moves money or signs anything: sensitive actions
// only create a pending item that a person approves in the dashboard.

import { z } from 'zod';
import { availableSlots, bookAppointment, SlotUnavailableError } from './calendar.js';
import { audit, searchKnowledge } from './business.js';
import { withTenant } from './db.js';
import { normalisePhone } from './phone.js';

const str = (description) => ({ type: 'string', description });
const bool = (description) => ({ type: 'boolean', description });

function tool(name, description, properties, required = Object.keys(properties)) {
    return {
        name,
        description,
        strict: true,
        input_schema: { type: 'object', properties, required, additionalProperties: false }
    };
}

export const TOOL_DEFINITIONS = [
    tool('search_knowledge', 'Search the business’s verified knowledge (products, prices, policies, FAQ).', {
        query: str('What to look up, in the customer’s words or keywords')
    }),
    tool('check_availability', 'List free meeting slots from the business calendar.', {
        days_ahead: { type: 'integer', description: 'How many days ahead to look (1-14)' }
    }),
    tool(
        'book_appointment',
        'Book a meeting in a slot returned by check_availability, only after the customer agreed to that exact time.',
        {
            starts_at: str('The slot’s starts_at value, exactly as returned by check_availability'),
            customer_name: str('The customer’s name'),
            notes: str('What the meeting is about')
        }
    ),
    tool('save_lead', 'Save or update the customer as a lead with what you learned.', {
        name: str('Customer name, or empty'),
        email: str('Email the customer gave, or empty'),
        callback_phone: str('A different number the customer asked to be called on, or empty'),
        needs: str('Short summary of the need and preferences'),
        interest: { type: 'string', enum: ['high', 'medium', 'low', 'none'] }
    }),
    tool('transfer_to_human', 'Transfer the call to a human representative (or create a call-back if none is available).', {
        reason: str('Why the customer needs a person')
    }),
    tool('schedule_follow_up', 'Schedule a follow-up call at a time the customer chose and agreed to.', {
        when_iso: str('ISO 8601 date-time with offset, e.g. 2026-05-04T17:00:00+03:00'),
        reason: str('What the follow-up is about'),
        customer_agreed: bool('True only if the customer explicitly agreed to be called back')
    }),
    tool('add_to_do_not_call', 'The customer asked not to be called again: add them to the do-not-call list.', {
        note: str('The customer’s words, briefly')
    }),
    tool(
        'request_send_info',
        'Ask to send the customer information by SMS or email. A person at the business approves it before it is sent.',
        {
            channel: { type: 'string', enum: ['sms', 'email'] },
            message: str('The message to send, using only verified information'),
            email: str('Email address if the channel is email, or empty'),
            customer_consented: bool('True only if the customer explicitly agreed to receive it')
        }
    ),
    tool('log_unanswered_question', 'Record a question you could not answer from verified knowledge.', {
        question: str('The customer’s question')
    }),
    tool('end_call', 'End the call after your final sentence.', {
        outcome: {
            type: 'string',
            enum: ['meeting_booked', 'lead_captured', 'transferred', 'not_interested', 'do_not_call', 'follow_up', 'info_only']
        },
        reason: str('One line on why the call ends')
    })
];

const INPUTS = {
    search_knowledge: z.object({ query: z.string().min(1).max(200) }),
    check_availability: z.object({ days_ahead: z.number().int().min(1).max(14) }),
    book_appointment: z.object({
        starts_at: z.string().max(40),
        customer_name: z.string().max(120),
        notes: z.string().max(500)
    }),
    save_lead: z.object({
        name: z.string().max(120),
        email: z.string().max(200),
        callback_phone: z.string().max(30),
        needs: z.string().max(1000),
        interest: z.enum(['high', 'medium', 'low', 'none'])
    }),
    transfer_to_human: z.object({ reason: z.string().max(500) }),
    schedule_follow_up: z.object({
        when_iso: z.string().max(40),
        reason: z.string().max(500),
        customer_agreed: z.boolean()
    }),
    add_to_do_not_call: z.object({ note: z.string().max(500) }),
    request_send_info: z.object({
        channel: z.enum(['sms', 'email']),
        message: z.string().min(1).max(1000),
        email: z.string().max(200),
        customer_consented: z.boolean()
    }),
    log_unanswered_question: z.object({ question: z.string().min(1).max(500) }),
    end_call: z.object({
        outcome: z.enum([
            'meeting_booked',
            'lead_captured',
            'transferred',
            'not_interested',
            'do_not_call',
            'follow_up',
            'info_only'
        ]),
        reason: z.string().max(500)
    })
};

// The phone number that identifies the customer on this call.
export function customerPhone(call) {
    return call.direction === 'outbound' ? call.to_number : call.from_number;
}

async function ensureLead(db, ctx, fields = {}) {
    const { business, call } = ctx;
    if (ctx.lead) {
        const { rows } = await db.query(
            `UPDATE leads SET
                name = CASE WHEN $3 <> '' THEN $3 ELSE name END,
                email = CASE WHEN $4 <> '' THEN $4 ELSE email END,
                needs = CASE WHEN $5 <> '' THEN $5 ELSE needs END,
                status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
                updated_at = now()
             WHERE business_id = $1 AND id = $2 RETURNING *`,
            [business.id, ctx.lead.id, fields.name ?? '', fields.email ?? '', fields.needs ?? '']
        );
        ctx.lead = rows[0];
        return ctx.lead;
    }
    const phone = customerPhone(call);
    if (!phone) return null;
    const { rows } = await db.query(
        `INSERT INTO leads (business_id, name, phone, email, needs, source, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'contacted')
         ON CONFLICT (business_id, phone) DO UPDATE SET
            name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE leads.name END,
            email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE leads.email END,
            needs = CASE WHEN EXCLUDED.needs <> '' THEN EXCLUDED.needs ELSE leads.needs END,
            updated_at = now()
         RETURNING *`,
        [
            business.id,
            fields.name ?? '',
            phone,
            fields.email ?? '',
            fields.needs ?? '',
            call.channel === 'web_test' ? 'test_call' : `${call.direction}_call`
        ]
    );
    ctx.lead = rows[0];
    await db.query('UPDATE calls SET lead_id = $2 WHERE business_id = $1 AND id = $3', [
        business.id,
        ctx.lead.id,
        call.id
    ]);
    return ctx.lead;
}

async function addTask(db, ctx, kind, description, dueAt = null) {
    await db.query(
        'INSERT INTO tasks (business_id, lead_id, call_id, kind, description, due_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [ctx.business.id, ctx.lead?.id ?? null, ctx.call.id, kind, description, dueAt]
    );
}

const HANDLERS = {
    async search_knowledge({ query }, ctx, db) {
        const results = await searchKnowledge(db, ctx.business.id, query);
        return results.length
            ? { results }
            : { results: [], note: 'Nothing verified matches. Do not guess; offer to log the question.' };
    },

    async check_availability({ days_ahead }, ctx, db) {
        const slots = await availableSlots(db, ctx.business, { now: ctx.now(), days: days_ahead, limit: 8 });
        ctx.groundingText.push(...slots.map((s) => s.label));
        return slots.length
            ? { slots }
            : { slots: [], note: 'No free slots in that range. Offer a call-back or a human.' };
    },

    async book_appointment({ starts_at, customer_name, notes }, ctx, db) {
        const lead = await ensureLead(db, ctx, { name: customer_name });
        try {
            const appointment = await bookAppointment(db, ctx.business, {
                startsAt: starts_at,
                leadId: lead?.id ?? null,
                callId: ctx.call.id,
                name: customer_name,
                phone: customerPhone(ctx.call),
                notes,
                now: ctx.now()
            });
            if (lead) {
                await db.query(
                    "UPDATE leads SET status = 'meeting_booked', updated_at = now() WHERE business_id = $1 AND id = $2",
                    [ctx.business.id, lead.id]
                );
            }
            ctx.state.outcomes.add('meeting_booked');
            ctx.groundingText.push(appointment.label);
            await audit(db, ctx.business.id, {
                actor: 'agent',
                action: 'appointment.booked',
                detail: { call_id: ctx.call.id, appointment_id: appointment.id }
            });
            return { booked: true, starts_at: appointment.starts_at, label: appointment.label };
        } catch (error) {
            if (error instanceof SlotUnavailableError) {
                return { booked: false, error: error.message, note: 'Call check_availability again and offer a free slot.' };
            }
            throw error;
        }
    },

    async save_lead({ name, email, callback_phone, needs, interest }, ctx, db) {
        const lead = await ensureLead(db, ctx, { name, email: /\S+@\S+\.\S+/.test(email) ? email : '', needs });
        if (!lead) return { saved: false, error: 'no customer phone number on this call' };
        if (interest === 'high' || interest === 'medium') {
            await db.query(
                "UPDATE leads SET status = 'interested' WHERE business_id = $1 AND id = $2 AND status IN ('new', 'contacted')",
                [ctx.business.id, lead.id]
            );
        }
        const callback = normalisePhone(callback_phone, ctx.business.country);
        if (callback && callback !== lead.phone) {
            await addTask(db, ctx, 'other', `Customer asked to be reached on ${callback}`);
        }
        ctx.state.outcomes.add('lead_captured');
        return { saved: true, lead_id: lead.id };
    },

    async transfer_to_human({ reason }, ctx, db) {
        await ensureLead(db, ctx);
        if (ctx.lead) {
            await db.query("UPDATE leads SET status = 'handed_off', updated_at = now() WHERE business_id = $1 AND id = $2", [
                ctx.business.id,
                ctx.lead.id
            ]);
        }
        const live = Boolean(ctx.business.handoff_phone) && ctx.call.channel === 'phone';
        await addTask(db, ctx, 'human_callback', `Hand-off requested: ${reason}`);
        ctx.state.outcomes.add('transferred');
        if (live) {
            ctx.state.transfer = ctx.business.handoff_phone;
            ctx.state.endCall = true;
            return { transferring: true, note: 'Tell the customer you are transferring them now. Do not ask anything else.' };
        }
        return {
            transferring: false,
            callback_task_created: true,
            note: 'No live human line right now. Tell the customer a person will call them back, then wrap up.'
        };
    },

    async schedule_follow_up({ when_iso, reason, customer_agreed }, ctx, db) {
        if (!customer_agreed) return { scheduled: false, error: 'Ask the customer and get explicit agreement first.' };
        const when = new Date(when_iso);
        if (Number.isNaN(when.getTime()) || when <= ctx.now()) return { scheduled: false, error: 'invalid or past time' };
        const lead = await ensureLead(db, ctx);
        if (!lead) return { scheduled: false, error: 'no customer phone number on this call' };
        await db.query('UPDATE leads SET next_call_at = $3, updated_at = now() WHERE business_id = $1 AND id = $2', [
            ctx.business.id,
            lead.id,
            when
        ]);
        await addTask(db, ctx, 'follow_up_call', reason, when);
        ctx.state.outcomes.add('follow_up');
        ctx.groundingText.push(when_iso);
        return { scheduled: true, when: when.toISOString() };
    },

    async add_to_do_not_call({ note }, ctx, db) {
        const phone = customerPhone(ctx.call);
        if (phone) {
            await db.query(
                `INSERT INTO do_not_call (business_id, phone, reason) VALUES ($1, $2, $3)
                 ON CONFLICT (business_id, phone) DO NOTHING`,
                [ctx.business.id, phone, `Requested on call ${ctx.call.id}: ${note}`.slice(0, 500)]
            );
            await db.query(
                `UPDATE leads SET status = 'do_not_call', next_call_at = NULL, updated_at = now()
                 WHERE business_id = $1 AND phone = $2`,
                [ctx.business.id, phone]
            );
        }
        await audit(db, ctx.business.id, { actor: 'agent', action: 'dnc.added', detail: { call_id: ctx.call.id } });
        ctx.state.outcomes.add('do_not_call');
        return { added: Boolean(phone), note: 'Confirm to the customer they will not be called again, then end_call.' };
    },

    async request_send_info({ channel, message, email, customer_consented }, ctx, db) {
        if (!customer_consented) return { requested: false, error: 'The customer must explicitly agree first.' };
        const lead = await ensureLead(db, ctx, { email: channel === 'email' ? email : '' });
        const to = channel === 'sms' ? customerPhone(ctx.call) : email || lead?.email;
        if (!to) return { requested: false, error: `no ${channel === 'sms' ? 'phone number' : 'email address'}` };
        if (lead) {
            await db.query(
                `UPDATE leads SET ${channel === 'sms' ? 'consent_sms' : 'consent_email'} = true,
                    consent_source = 'verbal on call ' || $3, updated_at = now()
                 WHERE business_id = $1 AND id = $2`,
                [ctx.business.id, lead.id, ctx.call.id]
            );
        }
        await db.query(
            `INSERT INTO pending_actions (business_id, call_id, lead_id, kind, payload)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                ctx.business.id,
                ctx.call.id,
                lead?.id ?? null,
                channel === 'sms' ? 'send_sms' : 'send_email',
                JSON.stringify({ to, message })
            ]
        );
        return { requested: true, note: 'Tell the customer the business will send it after a quick review.' };
    },

    async log_unanswered_question({ question }, ctx, db) {
        await ensureLead(db, ctx);
        await addTask(db, ctx, 'answer_question', question);
        return { logged: true };
    },

    async end_call({ outcome, reason }, ctx) {
        ctx.state.endCall = true;
        ctx.state.modelOutcome = outcome;
        ctx.state.endReason = reason;
        return { ending: true, note: 'Say a short goodbye now. Do not ask another question.' };
    }
};

export async function runTool(name, rawInput, ctx) {
    const schema = INPUTS[name];
    if (!schema) return { isError: true, result: { error: `unknown tool ${name}` } };
    const parsed = schema.safeParse(rawInput);
    if (!parsed.success) {
        return { isError: true, result: { error: 'invalid input', issues: parsed.error.issues.map((i) => i.message) } };
    }
    try {
        const result = await withTenant(ctx.business.id, (db) => HANDLERS[name](parsed.data, ctx, db));
        return { isError: false, result };
    } catch (error) {
        console.error(`sales tool ${name} failed:`, error);
        ctx.state.toolErrors += 1;
        return { isError: true, result: { error: 'The action failed. Tell the customer a person will follow up.' } };
    }
}
