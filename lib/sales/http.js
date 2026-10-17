// Shared plumbing for the sales API routes: JSON parsing, the signed-in user,
// the business they act on and their role, and error responses.

import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser, membershipsOf, SESSION_COOKIE } from './auth.js';

const MAX_BODY_BYTES = 2_000_000;
const ROLE_RANK = { viewer: 1, manager: 2, owner: 3 };

export class HttpError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

export async function readJson(request) {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new HttpError('payload too large', 413);
    try {
        return JSON.parse(raw || '{}');
    } catch {
        throw new HttpError('invalid JSON', 400);
    }
}

export const sessionToken = (request) => request.cookies.get(SESSION_COOKIE)?.value ?? null;

export function clientIp(request) {
    return (
        request.headers.get('x-nf-client-connection-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        'unknown'
    );
}

export async function requireUser(request) {
    const user = await getSessionUser(sessionToken(request));
    if (!user) throw new HttpError('not_signed_in', 401);
    return user;
}

// The business the user acts on (their first membership in this version)
// and a check that their role is high enough for the action.
export async function requireBusiness(request, minRole = 'viewer') {
    const user = await requireUser(request);
    const [membership] = await membershipsOf(user.id);
    if (!membership) throw new HttpError('no_business', 404);
    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) throw new HttpError('forbidden', 403);
    return { user, businessId: membership.id, role: membership.role };
}

// Scheduled jobs authenticate with SALES_CRON_SECRET as a bearer token.
export function isCronRequest(request) {
    const secret = process.env.SALES_CRON_SECRET;
    const given = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    return Boolean(secret) && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

// Same-origin check for state-changing browser requests (the session cookie
// is SameSite=Lax; this closes the remaining cross-site gaps).
function sameOrigin(request) {
    const origin = request.headers.get('origin');
    if (!origin) return true;
    return origin === new URL(request.url).origin || origin === process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
}

export function route(handler) {
    return async (request, context) => {
        try {
            if (request.method !== 'GET' && !sameOrigin(request)) throw new HttpError('bad_origin', 403);
            return await handler(request, context);
        } catch (error) {
            if (error?.status && error.status < 600) {
                return NextResponse.json({ error: error.message, code: error.code ?? error.reason }, { status: error.status });
            }
            console.error('sales route failed:', error);
            return NextResponse.json({ error: 'server_error' }, { status: 500 });
        }
    };
}
