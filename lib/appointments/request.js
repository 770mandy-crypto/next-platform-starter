// What the appointments page may send, checked before any paid work starts.

import { PROVIDERS } from './planner.js';

export const MAX_BODY_BYTES = 20_000;

export class RequestError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const text = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');

export function parseAppointmentRequest(body) {
    if (!body || typeof body !== 'object') throw new RequestError('הבקשה לא תקינה.');
    const need = text(body.need, 600);
    if (need.length < 4) throw new RequestError('כתבו לאיזה תור אתם צריכים, למשל "אורתופד" או "חידוש דרכון".');
    return {
        need,
        provider: Object.hasOwn(PROVIDERS, body.provider) ? body.provider : null,
        city: text(body.city, 60),
        when: text(body.when, 200)
    };
}
