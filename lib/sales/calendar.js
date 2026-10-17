// Appointment slots come from the business's opening hours minus what is
// already booked in the database. Booking relies on the table's exclusion
// constraint, so two calls can never take the same slot.

import { addDays, formatLocal, localParts, zonedToUtc } from './time.js';

const MIN_NOTICE_MS = 60 * 60_000;

// Pure: the free slots in [from, from + days) given existing bookings.
export function computeSlots({ business, booked, now = new Date(), days = 7, limit = 12 }) {
    const minutes = business.appointment_minutes;
    const tz = business.timezone;
    const startDate = localParts(now, tz).date;
    const busy = booked.map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()]);
    const slots = [];
    for (let offset = 0; offset < days && slots.length < limit; offset += 1) {
        const date = addDays(startDate, offset);
        const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
        for (const range of business.business_hours?.[String(weekday)] ?? []) {
            let start = zonedToUtc(date, range.start, tz).getTime();
            const close = zonedToUtc(date, range.end, tz).getTime();
            for (; start + minutes * 60_000 <= close && slots.length < limit; start += minutes * 60_000) {
                const end = start + minutes * 60_000;
                if (start < now.getTime() + MIN_NOTICE_MS) continue;
                if (busy.some(([b0, b1]) => start < b1 && end > b0)) continue;
                slots.push({
                    starts_at: new Date(start).toISOString(),
                    ends_at: new Date(end).toISOString(),
                    label: formatLocal(new Date(start), tz, business.language)
                });
            }
        }
    }
    return slots;
}

export async function availableSlots(db, business, { now = new Date(), days = 7, limit = 12 } = {}) {
    const { rows } = await db.query(
        `SELECT starts_at, ends_at FROM appointments
         WHERE business_id = $1 AND status = 'booked' AND ends_at > $2 AND starts_at < $3`,
        [business.id, now, new Date(now.getTime() + (days + 1) * 86_400_000)]
    );
    return computeSlots({ business, booked: rows, now, days, limit });
}

export class SlotUnavailableError extends Error {}

// Books only a slot that is still offered; anything else is refused, so the
// agent cannot book outside opening hours or invent a time.
export async function bookAppointment(db, business, { startsAt, leadId, callId, name, phone, notes, now = new Date() }) {
    const wanted = new Date(startsAt);
    if (Number.isNaN(wanted.getTime())) throw new SlotUnavailableError('invalid_time');
    const slots = await availableSlots(db, business, { now, days: 30, limit: 1000 });
    const slot = slots.find((s) => new Date(s.starts_at).getTime() === wanted.getTime());
    if (!slot) throw new SlotUnavailableError('slot_unavailable');
    await db.query('SAVEPOINT book');
    try {
        const { rows } = await db.query(
            `INSERT INTO appointments (business_id, lead_id, call_id, starts_at, ends_at, customer_name, customer_phone, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [business.id, leadId, callId, slot.starts_at, slot.ends_at, name || '', phone || '', notes || '']
        );
        await db.query('RELEASE SAVEPOINT book');
        return { ...rows[0], label: slot.label };
    } catch (error) {
        await db.query('ROLLBACK TO SAVEPOINT book');
        if (error.code === '23P01') throw new SlotUnavailableError('slot_taken');
        throw error;
    }
}
