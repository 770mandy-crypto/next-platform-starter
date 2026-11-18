// Drafts are the only way mail leaves the site. An agent or the person writes
// a draft; it stays pending until the person confirms it. Sending moves the
// draft pending → sending → sent, with a compare-and-set at each step, so a
// double click or two open tabs cannot send the same draft twice.

import { randomBytes } from 'node:crypto';
import { getDb } from '../pilot/db.js';
import { isValidAddress, sendMessage } from './gmail.js';

export const MAX_DRAFTS = 100;
const MAX_SUBJECT = 300;
const MAX_BODY = 8_000;

export class DraftError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const draftKey = (userId, id) => `google/drafts/${userId}/${id}`;
export const validDraftId = (id) => typeof id === 'string' && /^[a-f0-9]{24}$/.test(id);

export async function createDraft(userId, fields, now = Date.now()) {
    const to = String(fields.to ?? '').trim();
    if (!isValidAddress(to)) throw new DraftError('כתובת הנמען אינה תקינה.');
    const draft = {
        id: randomBytes(12).toString('hex'),
        status: 'pending',
        to,
        subject: String(fields.subject ?? '').slice(0, MAX_SUBJECT),
        body: String(fields.body ?? '').slice(0, MAX_BODY),
        threadId: typeof fields.threadId === 'string' ? fields.threadId.slice(0, 64) : '',
        inReplyTo: String(fields.inReplyTo ?? '').slice(0, 300),
        references: String(fields.references ?? '').slice(0, 1000),
        sourceFrom: String(fields.sourceFrom ?? '').slice(0, 200),
        sourceSubject: String(fields.sourceSubject ?? '').slice(0, 300),
        agentLabel: String(fields.agentLabel ?? '').slice(0, 40),
        createdAt: now
    };
    await (await getDb()).set(draftKey(userId, draft.id), draft);
    return draft;
}

export async function listDrafts(userId) {
    const db = await getDb();
    const keys = await db.list(`google/drafts/${userId}/`);
    const items = await Promise.all(keys.map((key) => db.get(key)));
    return items.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_DRAFTS);
}

// Moves a draft to its next state only if it is still in the state the change
// expects. Retries when another write got there first.
async function casUpdate(userId, id, change) {
    if (!validDraftId(id)) throw new DraftError('הטיוטה לא נמצאה.', 404);
    const db = await getDb();
    const key = draftKey(userId, id);
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const { value, etag } = await db.getVersioned(key);
        if (!value) throw new DraftError('הטיוטה לא נמצאה.', 404);
        const next = change(value);
        if (await db.setIfUnchanged(key, next, etag)) return next;
    }
    throw new DraftError('הטיוטה השתנתה בזמן העבודה. נסו שוב.', 409);
}

const notPending = () => new DraftError('אפשר לערוך או לשלוח רק טיוטה שממתינה לאישור.', 409);

export async function updateDraftBody(userId, id, body) {
    const text = String(body ?? '').slice(0, MAX_BODY);
    if (!text.trim()) throw new DraftError('הטיוטה ריקה.');
    return casUpdate(userId, id, (draft) => {
        if (draft.status !== 'pending') throw notPending();
        return { ...draft, body: text };
    });
}

export async function discardDraft(userId, id) {
    return casUpdate(userId, id, (draft) => {
        if (draft.status !== 'pending') throw notPending();
        return { ...draft, status: 'discarded' };
    });
}

// The one place mail is sent. Only a pending draft can be sent, and it is sent
// with the recipient and text stored in the draft, never with values the
// request brings in.
export async function sendDraft({ userId, id, token, fetchImpl, now = Date.now() }) {
    const sending = await casUpdate(userId, id, (draft) => {
        if (draft.status !== 'pending') throw notPending();
        return { ...draft, status: 'sending' };
    });
    let messageId;
    try {
        messageId = await sendMessage({
            token,
            to: sending.to,
            subject: sending.subject || 'תשובה',
            body: sending.body,
            threadId: sending.threadId || undefined,
            inReplyTo: sending.inReplyTo,
            references: sending.references,
            fetchImpl
        });
    } catch (error) {
        // Only a failed send goes back to pending. Once Gmail has accepted the
        // mail, the draft is never returned to pending, so it cannot go twice.
        await casUpdate(userId, id, (current) => ({ ...current, status: 'pending', lastError: String(error.message).slice(0, 200) }));
        throw error;
    }
    return casUpdate(userId, id, (current) => ({ ...current, status: 'sent', sentAt: now, gmailId: messageId }));
}
