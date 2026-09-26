// Shared plumbing for the Maslul API routes: bounded JSON parsing, the signed-in
// user, and one place that turns thrown errors into responses.

import { NextResponse } from 'next/server';
import { getSessionUser, SESSION_COOKIE } from './auth.js';

// Every Maslul endpoint takes JSON from the browser. Cap its size so a runaway
// client (or a pasted novel) cannot turn into an unbounded paid request.
const MAX_BODY_BYTES = 1_200_000;

export class HttpError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

export async function readJson(request) {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new HttpError('הבקשה גדולה מדי.', 413);
    try {
        return JSON.parse(raw || '{}');
    } catch {
        throw new HttpError('גוף הבקשה אינו JSON תקין.', 400);
    }
}

export function clip(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function sessionToken(request) {
    return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function requireUser(request) {
    const user = await getSessionUser(sessionToken(request));
    if (!user) throw new HttpError('צריך להתחבר כדי להמשיך.', 401);
    return user;
}

export function clientIp(request) {
    return (
        request.headers.get('x-nf-client-connection-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        'unknown'
    );
}

// Wraps a route handler: known errors carry their own status and Hebrew
// message; anything else is logged and reported generically.
export function route(handler) {
    return async (request, context) => {
        try {
            return await handler(request, context);
        } catch (error) {
            if (error?.status && error.status < 600) {
                return NextResponse.json({ error: error.message }, { status: error.status });
            }
            console.error('Maslul route failed:', error);
            return NextResponse.json({ error: 'שגיאה בשרת. נסו שוב.' }, { status: 500 });
        }
    };
}
