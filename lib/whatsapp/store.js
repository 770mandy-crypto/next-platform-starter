// What the WhatsApp agent remembers, on the app's key-value storage (Netlify
// Blobs in production, memory in tests). A person is their phone number.
//
//   wa/seen/<messageId>          a delivery already handled (Meta retries)
//   wa/user/<phone>              profile, recent conversation, daily usage
//   wa/lists/<phone>             named lists: shopping, tasks, …
//   wa/reminder/<phone>/<id>     one reminder
//   wa/due/<dueAt ISO>_<id>      index the scheduler walks in time order
//   wa/fired/<id>_<dueAt>        claimed by the scheduler run that sends it
//   wa/lock/<phone>              one reply at a time per person

import { randomBytes } from 'node:crypto';
import { getDb } from '../pilot/db.js';
import { nextOccurrence, instantToLocal } from './time.js';

// Turns of conversation kept for context. Older turns drop off.
export const HISTORY_TURNS = 24;
const HISTORY_CHARS = 3000;
export const MAX_REMINDERS = 200;
export const MAX_LIST_ITEMS = 300;
const LOCK_TTL_MS = 5 * 60_000;

const userKey = (phone) => `wa/user/${phone}`;
const listsKey = (phone) => `wa/lists/${phone}`;
const reminderKey = (phone, id) => `wa/reminder/${phone}/${id}`;
const dueKey = (dueAt, id) => `wa/due/${new Date(dueAt).toISOString()}_${id}`;

export const validPhone = (phone) => typeof phone === 'string' && /^\d{6,16}$/.test(phone);
const newId = () => randomBytes(4).toString('hex');

// Read-modify-write that retries if a parallel request changed the record.
async function update(key, change, fallback) {
    const db = await getDb();
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const { value, etag } = await db.getVersioned(key);
        const { next, result } = change(value ?? structuredClone(fallback));
        if (next === undefined) return result;
        if (await db.setIfUnchanged(key, next, etag)) return result;
    }
    throw new Error(`${key}: too many concurrent writes.`);
}

// --- Deliveries ------------------------------------------------------------

// True the first time a message id is seen, false for Meta's retries.
export async function claimMessage(id) {
    return (await getDb()).create(`wa/seen/${id}`, { at: Date.now() });
}

// --- One reply at a time ---------------------------------------------------

// Messages sent in quick succession are answered in order, each seeing the
// previous answer. Waits for the person's previous reply to finish; a lock
// left by a function that died expires.
export async function withLock(phone, work, { waitMs = 40_000, pollMs = 500 } = {}) {
    const db = await getDb();
    const key = `wa/lock/${phone}`;
    const token = newId();
    const deadline = Date.now() + waitMs;
    let held = false;
    while (!held) {
        if (await db.create(key, { at: Date.now(), token })) {
            held = true;
            break;
        }
        const { value, etag } = await db.getVersioned(key);
        if (!value || Date.now() - value.at > LOCK_TTL_MS) {
            if (await db.setIfUnchanged(key, { at: Date.now(), token }, etag)) {
                held = true;
                break;
            }
        }
        if (Date.now() > deadline) break; // answer anyway rather than never
        await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
    try {
        return await work();
    } finally {
        if (held && (await db.get(key))?.token === token) await db.delete(key);
    }
}

// --- People ----------------------------------------------------------------

const blankUser = (phone) => ({ phone, name: null, createdAt: Date.now(), lastInboundAt: 0, history: [], usage: { day: '', count: 0 } });

export async function getUser(phone) {
    return (await (await getDb()).get(userKey(phone))) ?? blankUser(phone);
}

// Records an incoming message: the time (which opens WhatsApp's 24-hour
// window) and the day's count. Returns false once the daily limit is reached.
export async function noteInbound(phone, { name, at = Date.now(), dailyLimit }) {
    const day = instantToLocal(at).slice(0, 10);
    return update(
        userKey(phone),
        (user) => {
            const count = user.usage?.day === day ? user.usage.count : 0;
            const allowed = !dailyLimit || count < dailyLimit;
            return {
                next: {
                    ...user,
                    name: name || user.name,
                    lastInboundAt: Math.max(user.lastInboundAt ?? 0, at),
                    usage: { day, count: count + (allowed ? 1 : 0) }
                },
                result: allowed
            };
        },
        blankUser(phone)
    );
}

export async function appendHistory(phone, turns) {
    const clipped = turns.map(({ role, text }) => ({ role, text: String(text).slice(0, HISTORY_CHARS) }));
    await update(
        userKey(phone),
        (user) => ({ next: { ...user, history: [...(user.history ?? []), ...clipped].slice(-HISTORY_TURNS) } }),
        blankUser(phone)
    );
}

export async function forgetHistory(phone) {
    await update(userKey(phone), (user) => ({ next: { ...user, history: [] } }), blankUser(phone));
}

// --- Reminders -------------------------------------------------------------

export const REPEATS = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

export async function addReminder(phone, { text, dueAt, repeat = 'none' }) {
    const db = await getDb();
    const existing = await db.list(`wa/reminder/${phone}/`);
    if (existing.length >= MAX_REMINDERS) throw new Error(`You already have ${MAX_REMINDERS} reminders; delete some first.`);
    const reminder = {
        id: newId(),
        phone,
        text: String(text).trim().slice(0, 500),
        dueAt,
        repeat: REPEATS.includes(repeat) ? repeat : 'none',
        anchorDay: Number(instantToLocal(dueAt).slice(8, 10)),
        createdAt: Date.now()
    };
    await db.set(reminderKey(phone, reminder.id), reminder);
    await db.set(dueKey(dueAt, reminder.id), { phone, id: reminder.id });
    return reminder;
}

export async function listReminders(phone) {
    const db = await getDb();
    const keys = await db.list(`wa/reminder/${phone}/`);
    const reminders = (await Promise.all(keys.map((key) => db.get(key)))).filter(Boolean);
    return reminders.sort((a, b) => a.dueAt - b.dueAt);
}

export async function cancelReminder(phone, id) {
    if (typeof id !== 'string' || !/^[a-f0-9]{8}$/.test(id)) return false;
    const db = await getDb();
    const reminder = await db.get(reminderKey(phone, id));
    if (!reminder) return false;
    await db.delete(reminderKey(phone, id));
    await db.delete(dueKey(reminder.dueAt, id));
    return true;
}

// Reminders whose time has come, oldest first. Each is claimed with an
// atomic create, so two overlapping scheduler runs never send one twice.
export async function claimDueReminders(now = Date.now(), limit = 50) {
    const db = await getDb();
    const cutoff = `wa/due/${new Date(now).toISOString()}`;
    const keys = (await db.list('wa/due/')).filter((key) => key <= `${cutoff}~`).slice(0, limit);
    const claimed = [];
    for (const key of keys) {
        const pointer = await db.get(key);
        const reminder = pointer && (await db.get(reminderKey(pointer.phone, pointer.id)));
        if (!reminder || reminder.dueAt > now) {
            if (!reminder) await db.delete(key); // cancelled; drop the stale index entry
            continue;
        }
        if (!(await db.create(`wa/fired/${reminder.id}_${reminder.dueAt}`, { at: now }))) continue;
        claimed.push(reminder);
    }
    return claimed;
}

// After sending: a one-off reminder is removed, a repeating one moves on to
// its next time (skipping any it missed while the site was down).
export async function finishReminder(reminder, now = Date.now()) {
    const db = await getDb();
    await db.delete(dueKey(reminder.dueAt, reminder.id));
    let next = reminder.repeat === 'none' ? null : nextOccurrence(reminder.dueAt, reminder.repeat, reminder.anchorDay);
    while (next && next <= now) next = nextOccurrence(next, reminder.repeat, reminder.anchorDay);
    if (!next) {
        await db.delete(reminderKey(reminder.phone, reminder.id));
        return null;
    }
    const moved = { ...reminder, dueAt: next };
    await db.set(reminderKey(reminder.phone, reminder.id), moved);
    await db.set(dueKey(next, reminder.id), { phone: reminder.phone, id: reminder.id });
    return moved;
}

// --- Lists -----------------------------------------------------------------

export const normalizeListName = (name) =>
    String(name ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40) || 'כללי';

export async function getLists(phone) {
    return (await (await getDb()).get(listsKey(phone))) ?? {};
}

export async function addItems(phone, listName, items) {
    const name = normalizeListName(listName);
    const clean = items.map((item) => String(item).trim().slice(0, 200)).filter(Boolean);
    return update(
        listsKey(phone),
        (lists) => {
            const list = lists[name] ?? [];
            const known = new Set(list.map((item) => item.text));
            const added = clean.filter((text) => !known.has(text) && known.add(text));
            const total = Object.values(lists).reduce((sum, l) => sum + l.length, 0);
            if (total + added.length > MAX_LIST_ITEMS) throw new Error(`Lists are limited to ${MAX_LIST_ITEMS} items in all.`);
            const next = { ...lists, [name]: [...list, ...added.map((text) => ({ text, addedAt: Date.now() }))] };
            return { next, result: { list: name, added, items: next[name].map((i) => i.text) } };
        },
        {}
    );
}

// Removes items by their text (as listed), or the whole list when `items` is
// empty.
export async function removeItems(phone, listName, items) {
    const name = normalizeListName(listName);
    return update(
        listsKey(phone),
        (lists) => {
            if (!lists[name]) return { next: undefined, result: { list: name, removed: [], items: [] } };
            const drop = new Set(items.map((item) => String(item).trim()));
            const removeAll = drop.size === 0;
            const kept = removeAll ? [] : lists[name].filter((item) => !drop.has(item.text));
            const removed = lists[name].filter((item) => removeAll || drop.has(item.text)).map((item) => item.text);
            const next = { ...lists };
            if (kept.length) next[name] = kept;
            else delete next[name];
            return { next, result: { list: name, removed, items: kept.map((i) => i.text) } };
        },
        {}
    );
}
