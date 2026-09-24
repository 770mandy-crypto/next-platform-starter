// One conversation per (item, interested person). The giver can hand over the
// pickup address from inside the chat, which both sides then see as Waze and
// Google Maps buttons.

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { geocodeAddress } from './geocode.js';
import { InputError, getItem } from './items.js';
import { data, listJSON } from './store.js';

const MAX_MESSAGES = 500;
const text = z.string().trim().min(1, 'הודעה ריקה').max(1000, 'הודעה ארוכה מדי');

const key = (cid) => `conv/${cid}`;
const inboxKey = (userId, cid) => `inbox/${userId}/${cid}`;

function isParticipant(conv, user) {
    return conv.ownerId === user.id || conv.requesterId === user.id;
}

async function save(conv) {
    if (conv.messages.length > MAX_MESSAGES) conv.messages = conv.messages.slice(-MAX_MESSAGES);
    await data().setJSON(key(conv.id), conv);
    const pointer = { id: conv.id, updatedAt: conv.updatedAt };
    await Promise.all([
        data().setJSON(inboxKey(conv.ownerId, conv.id), pointer),
        data().setJSON(inboxKey(conv.requesterId, conv.id), pointer)
    ]);
}

function push(conv, from, message) {
    // Strictly increasing per conversation, so "read up to" timestamps never
    // tie with a message sent in the same millisecond.
    const at = Math.max(Date.now(), (conv.messages.at(-1)?.at ?? 0) + 1);
    conv.messages.push({ id: randomUUID(), from, at, ...message });
    conv.updatedAt = at;
    if (from) conv.lastRead = { ...conv.lastRead, [from]: at };
}

export async function getConversation(cid, user) {
    if (!/^[a-f0-9-]{36}_[a-f0-9-]{36}$/.test(cid)) return null;
    const conv = await data().get(key(cid), { type: 'json' });
    if (!conv || !isParticipant(conv, user)) return null;
    return conv;
}

// The first message from an interested person opens the conversation; later
// messages from them on the same item continue it.
export async function messageAboutItem(user, itemId, body) {
    const message = text.parse(body);
    const item = await getItem(itemId);
    if (!item) throw new InputError('הפריט לא נמצא', 404);
    if (item.ownerId === user.id) throw new InputError('זה הפריט שלך 🙂');

    const cid = `${item.id}_${user.id}`;
    let conv = await data().get(key(cid), { type: 'json' });
    if (!conv) {
        if (item.status === 'given') throw new InputError('הפריט כבר נמסר');
        conv = {
            id: cid,
            itemId: item.id,
            itemTitle: item.title,
            ownerId: item.ownerId,
            ownerName: item.ownerName,
            requesterId: user.id,
            requesterName: user.name,
            messages: [],
            lastRead: {},
            createdAt: Date.now()
        };
    }
    push(conv, user.id, { kind: 'text', text: message });
    await save(conv);
    return conv;
}

export async function sendMessage(user, cid, body) {
    const conv = await getConversation(cid, user);
    if (!conv) throw new InputError('השיחה לא נמצאה', 404);
    push(conv, user.id, { kind: 'text', text: text.parse(body) });
    await save(conv);
    return conv;
}

// Only the giver can share the pickup address. If they send the address saved
// on the item and it was pinned precisely, the exact point goes along so Waze
// lands on the door; an edited address is geocoded again, or sent as text.
export async function shareAddress(user, cid, rawAddress) {
    const conv = await getConversation(cid, user);
    if (!conv) throw new InputError('השיחה לא נמצאה', 404);
    if (conv.ownerId !== user.id) throw new InputError('רק מי שמוסר/ת את הפריט יכול/ה לשלוח כתובת', 403);

    const item = await getItem(conv.itemId);
    const address =
        z
            .string()
            .trim()
            .max(160)
            .parse(rawAddress ?? '') || item?.address;
    if (!address) throw new InputError('יש לכתוב כתובת');

    const fullAddress = item && !address.includes(item.city) ? `${address}, ${item.city}` : address;
    let point = null;
    if (item && address === item.address && item.precise) point = item.location;
    else point = await geocodeAddress(fullAddress);

    push(conv, user.id, { kind: 'address', text: fullAddress, address: fullAddress, ...(point ?? {}) });
    await save(conv);
    return conv;
}

export async function markRead(conv, user) {
    const last = conv.messages.at(-1);
    if (!last || (conv.lastRead?.[user.id] ?? 0) >= last.at) return;
    conv.lastRead = { ...conv.lastRead, [user.id]: last.at };
    await data().setJSON(key(conv.id), conv);
}

export function unreadFor(conv, user) {
    const seen = conv.lastRead?.[user.id] ?? 0;
    return conv.messages.filter((m) => m.at > seen && m.from !== user.id).length;
}

// Posted into every chat about an item when its status changes, so people who
// asked about it learn it is gone without having to be told one by one.
export async function announceStatus(item) {
    const note = { available: 'הפריט שוב זמין 🙌', reserved: 'הפריט שמור כרגע למישהו', given: 'הפריט נמסר 🎉 תודה!' };
    const convs = await listJSON(`conv/${item.id}_`);
    await Promise.all(
        convs.map((conv) => {
            push(conv, null, { kind: 'system', text: note[item.status] });
            return save(conv);
        })
    );
}

export async function listInbox(user) {
    const pointers = await listJSON(`inbox/${user.id}/`);
    const convs = await Promise.all(pointers.map((p) => data().get(key(p.id), { type: 'json' })));
    return convs
        .filter(Boolean)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((conv) => summarize(conv, user));
}

export function summarize(conv, user) {
    const iAmOwner = conv.ownerId === user.id;
    const last = conv.messages.at(-1);
    return {
        id: conv.id,
        itemId: conv.itemId,
        itemTitle: conv.itemTitle,
        otherName: iAmOwner ? conv.requesterName : conv.ownerName,
        role: iAmOwner ? 'giver' : 'taker',
        lastText: last ? (last.kind === 'address' ? '📍 כתובת לאיסוף' : last.text) : '',
        updatedAt: conv.updatedAt,
        unread: unreadFor(conv, user)
    };
}

export function viewConversation(conv, user) {
    return {
        ...summarize(conv, user),
        messages: conv.messages.map((m) => ({ ...m, mine: m.from === user.id }))
    };
}
