// Owner accounts and sessions for the sales dashboard, stored in Postgres.
// Passwords: scrypt with a per-user salt. Sessions: a random token in an
// httpOnly cookie; only its SHA-256 is stored.

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getPool, withSystem } from './db.js';

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = 'sales_session';
export const SESSION_TTL_DAYS = 14;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
export const normaliseEmail = (email) => String(email ?? '').trim().toLowerCase();

export function validateSignup({ name, email, password }) {
    const problems = [];
    if (!String(name ?? '').trim() || String(name).trim().length > 80) problems.push('invalid_name');
    if (!EMAIL_PATTERN.test(normaliseEmail(email))) problems.push('invalid_email');
    if (String(password ?? '').length < 8 || String(password).length > 200) problems.push('weak_password');
    return problems;
}

export async function hashPassword(password) {
    const salt = randomBytes(16);
    const key = await scrypt(String(password), salt, 64);
    return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
    const [scheme, saltB64, keyB64] = String(stored ?? '').split('$');
    if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
    const expected = Buffer.from(keyB64, 'base64');
    const actual = await scrypt(String(password), Buffer.from(saltB64, 'base64'), expected.length);
    return timingSafeEqual(actual, expected);
}

// Fixed-window counter in Postgres. Returns true while the call is allowed.
export async function consumeLimit(bucket, { limit, windowMs }) {
    const { rows } = await getPool().query(
        `INSERT INTO sales_rate_limits (bucket, window_start, count) VALUES ($1, now(), 1)
         ON CONFLICT (bucket) DO UPDATE SET
            window_start = CASE WHEN sales_rate_limits.window_start < now() - make_interval(secs => $2)
                                THEN now() ELSE sales_rate_limits.window_start END,
            count = CASE WHEN sales_rate_limits.window_start < now() - make_interval(secs => $2)
                         THEN 1 ELSE sales_rate_limits.count + 1 END
         RETURNING count`,
        [sha256(bucket), windowMs / 1000]
    );
    return rows[0].count <= limit;
}

const AUTH_LIMIT = { limit: 10, windowMs: 15 * 60_000 };

let decoyHash;
const decoy = async () => (decoyHash ??= await hashPassword(randomBytes(12).toString('hex')));

export async function createUser({ name, email, password, ip }) {
    const problems = validateSignup({ name, email, password });
    if (problems.length) throw new AuthError(problems.join(','));
    if (!(await consumeLimit(`signup:${ip || 'unknown'}`, AUTH_LIMIT))) throw new AuthError('rate_limited', 429);
    const passwordHash = await hashPassword(password);
    try {
        const { rows } = await getPool().query(
            'INSERT INTO sales_users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
            [String(name).trim(), normaliseEmail(email), passwordHash]
        );
        return rows[0];
    } catch (error) {
        if (error.code === '23505') throw new AuthError('email_taken', 409);
        throw error;
    }
}

export async function authenticate({ email, password, ip }) {
    const normalised = normaliseEmail(email);
    const allowed = await Promise.all([
        consumeLimit(`login:email:${normalised}`, AUTH_LIMIT),
        consumeLimit(`login:ip:${ip || 'unknown'}`, { ...AUTH_LIMIT, limit: 30 })
    ]);
    if (allowed.includes(false)) throw new AuthError('rate_limited', 429);
    const { rows } = await getPool().query('SELECT * FROM sales_users WHERE email = $1', [normalised]);
    const user = rows[0];
    const ok = await verifyPassword(password, user?.password_hash ?? (await decoy()));
    if (!user || !ok) throw new AuthError('bad_credentials', 401);
    return { id: user.id, name: user.name, email: user.email, created_at: user.created_at };
}

export async function createSession(userId) {
    const token = randomBytes(32).toString('base64url');
    await getPool().query(
        `INSERT INTO sales_sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + make_interval(days => $3))`,
        [sha256(token), userId, SESSION_TTL_DAYS]
    );
    return token;
}

export async function getSessionUser(token) {
    if (!token) return null;
    const { rows } = await getPool().query(
        `SELECT u.id, u.name, u.email FROM sales_sessions s JOIN sales_users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [sha256(token)]
    );
    return rows[0] ?? null;
}

export async function destroySession(token) {
    if (token) await getPool().query('DELETE FROM sales_sessions WHERE token_hash = $1', [sha256(token)]);
}

// The businesses a user may act on, with their role. Crosses tenants by
// design: it is how a signed-in user finds their own business.
export function membershipsOf(userId) {
    return withSystem(async (db) => {
        const { rows } = await db.query(
            `SELECT b.id, b.name, m.role FROM business_members m JOIN businesses b ON b.id = m.business_id
             WHERE m.user_id = $1 ORDER BY m.created_at`,
            [userId]
        );
        return rows;
    });
}

export function sessionCookie(token) {
    return {
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_TTL_DAYS * 86_400
    };
}
