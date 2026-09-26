// Accounts and sessions for Maslul.
//
// Passwords are hashed with scrypt and a per-user salt. A session is a random
// token held in an httpOnly cookie; only its SHA-256 hash is stored, so a leaked
// database does not hand out live sessions. Login and signup are rate limited
// per email and per IP to slow down password guessing.

import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getDb } from './db.js';

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = 'maslul_session';
export const SESSION_TTL_DAYS = 30;
const SCRYPT_KEYLEN = 64;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

export function emailIndexKey(email) {
    return `users/by-email/${sha256(normaliseEmail(email))}`;
}

export function normaliseEmail(email) {
    return String(email ?? '').trim().toLowerCase();
}

export function validateSignup({ name, email, password }) {
    const problems = [];
    if (!String(name ?? '').trim()) problems.push('חסר שם');
    if (String(name ?? '').trim().length > 80) problems.push('השם ארוך מדי');
    if (!EMAIL_PATTERN.test(normaliseEmail(email))) problems.push('כתובת האימייל אינה תקינה');
    if (String(password ?? '').length < 8) problems.push('הסיסמה צריכה להכיל לפחות 8 תווים');
    if (String(password ?? '').length > 200) problems.push('הסיסמה ארוכה מדי');
    return problems;
}

export async function hashPassword(password) {
    const salt = randomBytes(16);
    const key = await scrypt(String(password), salt, SCRYPT_KEYLEN);
    return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
    const [scheme, saltB64, keyB64] = String(stored ?? '').split('$');
    if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
    const expected = Buffer.from(keyB64, 'base64');
    const actual = await scrypt(String(password), Buffer.from(saltB64, 'base64'), expected.length);
    return timingSafeEqual(actual, expected);
}

// A hash to compare against when the email does not exist, so a failed login
// takes the same time whether or not the account is real.
let decoyHash;
async function decoy() {
    return (decoyHash ??= await hashPassword(randomUUID()));
}

// --- Rate limiting ---------------------------------------------------------

// Fixed-window counter. Returns true when the call is allowed.
export async function consumeLimit(bucket, { limit, windowMs }, now = Date.now()) {
    const db = await getDb();
    const key = `ratelimit/${sha256(bucket)}`;
    const current = await db.get(key);
    const fresh = !current || now - current.start >= windowMs;
    const next = fresh ? { start: now, count: 1 } : { ...current, count: current.count + 1 };
    await db.set(key, next);
    return next.count <= limit;
}

const AUTH_LIMIT = { limit: 10, windowMs: 15 * 60_000 };

async function guardAuthAttempt({ email, ip }) {
    const allowed = await Promise.all([
        consumeLimit(`auth:email:${email}`, AUTH_LIMIT),
        consumeLimit(`auth:ip:${ip || 'unknown'}`, { limit: 30, windowMs: AUTH_LIMIT.windowMs })
    ]);
    if (allowed.includes(false)) throw new AuthError('יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.', 429);
}

// --- Users -----------------------------------------------------------------

export function publicUser(user) {
    return user ? { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } : null;
}

export async function createUser({ name, email, password, ip }) {
    const problems = validateSignup({ name, email, password });
    if (problems.length) throw new AuthError(problems.join(' · '));

    const normalised = normaliseEmail(email);
    await guardAuthAttempt({ email: normalised, ip });

    const db = await getDb();
    const user = {
        id: randomUUID(),
        name: String(name).trim(),
        email: normalised,
        passwordHash: await hashPassword(password),
        createdAt: new Date().toISOString()
    };
    // The email index is claimed with a create-if-absent write, so two signups
    // racing on the same address cannot both succeed.
    const claimed = await db.create(emailIndexKey(normalised), { userId: user.id });
    if (!claimed) throw new AuthError('כבר קיים חשבון עם האימייל הזה. אפשר להתחבר.', 409);
    await db.set(`users/${user.id}`, user);
    return user;
}

export async function authenticate({ email, password, ip }) {
    const normalised = normaliseEmail(email);
    await guardAuthAttempt({ email: normalised, ip });

    const db = await getDb();
    const index = await db.get(emailIndexKey(normalised));
    const user = index ? await db.get(`users/${index.userId}`) : null;
    const ok = await verifyPassword(password, user?.passwordHash ?? (await decoy()));
    if (!user || !ok) throw new AuthError('האימייל או הסיסמה שגויים.', 401);
    return user;
}

// --- Sessions --------------------------------------------------------------

export async function createSession(userId, now = Date.now()) {
    const token = randomBytes(32).toString('base64url');
    const db = await getDb();
    await db.set(`sessions/${sha256(token)}`, {
        userId,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + SESSION_TTL_DAYS * 86_400_000).toISOString()
    });
    return token;
}

export async function getSessionUser(token, now = Date.now()) {
    if (!token || typeof token !== 'string' || token.length > 200) return null;
    const db = await getDb();
    const key = `sessions/${sha256(token)}`;
    const session = await db.get(key);
    if (!session) return null;
    if (Date.parse(session.expiresAt) <= now) {
        await db.delete(key);
        return null;
    }
    return db.get(`users/${session.userId}`);
}

export async function destroySession(token) {
    if (!token) return;
    const db = await getDb();
    await db.delete(`sessions/${sha256(token)}`);
}

export function sessionCookie(token) {
    return {
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL_DAYS * 86_400
    };
}
