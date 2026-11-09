// Email alerts: people follow neighborhoods and hear when a score moves or an
// owner lists an apartment there. Every address is confirmed first (double
// opt-in), so nobody can sign someone else up, and every email carries a
// one-click way out.
//
// Storage: matzpen/alert/{id} = { id, email, areaIds, confirmed, token, ... }
// where id is a hash of the address, so one person has one record.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { scoreArea } from './score.js';

const MAX_AREAS = 20;
const RESEND_CONFIRM_MS = 10 * 60_000;
export const SCORE_STEP = 5; // smaller moves are noise, not news

export const emailSchema = z.string().trim().toLowerCase().email().max(200);

export const alertId = (email) => createHash('sha256').update(email).digest('hex').slice(0, 20);
const key = (id) => `matzpen/alert/${id}`;

function same(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
}

// Adds an area to the address's alerts. Returns the record and whether a
// confirmation email should go out now.
export async function subscribe(db, { email, areaId }, now = Date.now()) {
    const address = emailSchema.parse(email);
    const id = alertId(address);
    const existing = await db.get(key(id));
    const record = existing ?? { id, email: address, areaIds: [], confirmed: false, token: randomBytes(18).toString('base64url'), createdAt: now };
    if (areaId && !record.areaIds.includes(areaId)) record.areaIds = [...record.areaIds, areaId].slice(-MAX_AREAS);
    const sendConfirm = !record.confirmed && (!record.confirmSentAt || now - record.confirmSentAt > RESEND_CONFIRM_MS);
    if (sendConfirm) record.confirmSentAt = now;
    await db.set(key(id), record);
    return { record, sendConfirm };
}

export async function confirm(db, id, token, now = Date.now()) {
    const record = /^[a-f0-9]{20}$/.test(id ?? '') ? await db.get(key(id)) : null;
    if (!record || !same(record.token, token)) return null;
    if (!record.confirmed) await db.set(key(id), { ...record, confirmed: true, confirmedAt: now });
    return { ...record, confirmed: true };
}

export async function unsubscribe(db, id, token) {
    const record = /^[a-f0-9]{20}$/.test(id ?? '') ? await db.get(key(id)) : null;
    if (!record || !same(record.token, token)) return false;
    await db.delete(key(id));
    return true;
}

export const confirmUrl = (base, r) => `${base}/matzpen/alerts/confirm?id=${r.id}&t=${r.token}`;
export const unsubscribeUrl = (base, r) => `${base}/matzpen/alerts/unsubscribe?id=${r.id}&t=${r.token}`;

// Neighborhoods whose score moved by SCORE_STEP or more, or changed trend
// band, between two imports of the same city.
export function scoreChanges(previous, next) {
    if (!previous?.length) return [];
    const before = new Map(previous.map((a) => [a.id, scoreArea(a, previous)]));
    const changes = [];
    for (const area of next) {
        const old = before.get(area.id);
        if (!old) continue;
        const now = scoreArea(area, next);
        if (Math.abs(now.score - old.score) >= SCORE_STEP || now.trend.id !== old.trend.id) {
            changes.push({ areaId: area.id, name: area.name, cityName: area.cityName, from: old.score, to: now.score, trendFrom: old.trend.label, trendTo: now.trend.label });
        }
    }
    return changes;
}

async function confirmedAlerts(db) {
    const keys = await db.list('matzpen/alert/');
    return (await Promise.all(keys.map((k) => db.get(k)))).filter((r) => r?.confirmed);
}

// One email per follower, covering every followed area that changed.
export async function notifyScoreChanges(db, changes, { send, base, buildEmail }) {
    if (!changes.length) return 0;
    let sent = 0;
    for (const alert of await confirmedAlerts(db)) {
        const mine = changes.filter((c) => alert.areaIds.includes(c.areaId));
        if (!mine.length) continue;
        try {
            await send({ to: alert.email, ...buildEmail({ changes: mine, unsubscribeUrl: unsubscribeUrl(base, alert), base }) });
            sent += 1;
        } catch (error) {
            console.error('Matzpen score alert failed:', error?.message ?? error);
        }
    }
    return sent;
}

export async function notifyNewListing(db, listing, { send, base, buildEmail }) {
    let sent = 0;
    for (const alert of await confirmedAlerts(db)) {
        if (!alert.areaIds.includes(listing.areaId)) continue;
        try {
            await send({ to: alert.email, ...buildEmail({ listing, unsubscribeUrl: unsubscribeUrl(base, alert), base }) });
            sent += 1;
        } catch (error) {
            console.error('Matzpen listing alert failed:', error?.message ?? error);
        }
    }
    return sent;
}
