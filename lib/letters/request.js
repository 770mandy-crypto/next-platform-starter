// What the letters page may send, checked before any paid work starts.

import { KINDS } from './writer.js';

// Netlify functions take request bodies up to 6 MB; base64 adds a third.
export const MAX_BODY_BYTES = 5_500_000;
export const MAX_ATTACHMENT_BYTES = 3_500_000;
const ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

export class RequestError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export function parseLetterRequest(body) {
    if (!body || typeof body !== 'object') throw new RequestError('הבקשה לא תקינה.');
    const situation = text(body.situation, 6000);
    if (situation.length < 15) throw new RequestError('ספרו בכמה משפטים מה קרה ומה אתם רוצים להשיג.');

    let attachment = null;
    if (body.attachment) {
        const { name, type, data } = body.attachment;
        if (!ATTACHMENT_TYPES.has(type)) throw new RequestError('אפשר לצרף רק תמונה (JPG, PNG) או PDF.');
        if (typeof data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new RequestError('הקובץ המצורף לא תקין.');
        if ((data.length * 3) / 4 > MAX_ATTACHMENT_BYTES) throw new RequestError('הקובץ המצורף גדול מדי (עד 3.5MB).', 413);
        attachment = { name: text(name, 120), type, data };
    }

    return {
        kind: Object.hasOwn(KINDS, body.kind) ? body.kind : 'other',
        situation,
        recipientHint: text(body.recipientHint, 200),
        // Only the name goes to Claude, for context. The rest of the sender
        // block is laid out by the page and never leaves the browser.
        senderName: text(body.senderName, 80),
        attachment
    };
}
