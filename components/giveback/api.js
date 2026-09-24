'use client';

export class ApiError extends Error {
    constructor(message, { status, code } = {}) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

export async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api/giveback${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
    });
    let payload = null;
    try {
        payload = await res.json();
    } catch {
        // A non-JSON body means the function itself failed (e.g. body too large).
    }
    if (!res.ok) {
        throw new ApiError(payload?.error ?? (res.status === 413 ? 'הקבצים גדולים מדי' : 'משהו השתבש, נסו שוב'), {
            status: res.status,
            code: payload?.code
        });
    }
    return payload;
}

export { timeAgo } from 'lib/giveback/format';
