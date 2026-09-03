// Account storage. Users live in a Netlify Blobs store keyed by normalised
// email — one record per person, whether they signed up with a password or
// arrived through Google. A Google user has no passwordHash; a password
// user always does. Either way the record is the single source of truth for
// "who is this", so /dashboard and the portfolio store key off the same
// normalised email.

import { getStore } from '@netlify/blobs';
import bcrypt from 'bcryptjs';

const STORE_NAME = 'users';
const SALT_ROUNDS = 10;

export function usersStore() {
    return getStore({ name: STORE_NAME, consistency: 'strong' });
}

export function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

// Deliberately simple — this gates "is it worth sending a verification
// round-trip to", not RFC 5322 conformance.
export function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8 && password.length <= 200;
}

export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
    if (!password || !hash) return false;
    return bcrypt.compare(password, hash);
}

export async function getUserByEmail(email, store = usersStore()) {
    const key = normalizeEmail(email);
    if (!key) return null;
    return store.get(key, { type: 'json' });
}

// Throws rather than silently overwriting — a caller trying to register an
// email that already exists needs to know that, not get a fresh account
// that quietly drops the old password.
export async function createUser({ email, password, name }, store = usersStore()) {
    const key = normalizeEmail(email);
    if (!isValidEmail(key)) throw new Error('invalid-email');
    if (!isValidPassword(password)) throw new Error('invalid-password');

    const existing = await getUserByEmail(key, store);
    if (existing) throw new Error('email-taken');

    const user = {
        email: key,
        name: (name || '').trim() || key.split('@')[0],
        passwordHash: await hashPassword(password),
        image: null,
        provider: 'credentials',
        createdAt: new Date().toISOString()
    };

    await store.setJSON(key, user);
    return { email: user.email, name: user.name };
}

// Called from the Google sign-in callback. Creates the account on first
// login, and on every later login refreshes the display name/photo Google
// is currently reporting — but never touches passwordHash, so a Google
// login can never overwrite a credentials login for the same address.
export async function upsertOAuthUser({ email, name, image }, store = usersStore()) {
    const key = normalizeEmail(email);
    if (!isValidEmail(key)) throw new Error('invalid-email');

    const existing = await getUserByEmail(key, store);
    const user = {
        email: key,
        name: (name || existing?.name || key.split('@')[0]).trim(),
        passwordHash: existing?.passwordHash ?? null,
        image: image || existing?.image || null,
        provider: existing?.provider ?? 'google',
        createdAt: existing?.createdAt ?? new Date().toISOString()
    };

    await store.setJSON(key, user);
    return { email: user.email, name: user.name };
}

// Returns the public shape of the user on success, or null on any failure —
// wrong email, wrong password, or a Google-only account with no password to
// check. NextAuth's authorize() treats null as "reject the sign-in".
export async function verifyUserCredentials(email, password, store = usersStore()) {
    const user = await getUserByEmail(email, store);
    if (!user?.passwordHash) return null;
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;
    return { id: user.email, email: user.email, name: user.name, image: user.image };
}
