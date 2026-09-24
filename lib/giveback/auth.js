// Lightweight identity for the MVP: a user picks a display name and gets an
// httpOnly cookie holding their id and a random secret. Only a hash of the
// secret is stored, so the database alone cannot be used to impersonate anyone.
//
// Before a public launch this should become phone-number (SMS) verification —
// see the README — but the rest of the app only depends on currentUser().

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { data } from './store.js';

const COOKIE = 'gb_session';
const ONE_YEAR = 60 * 60 * 24 * 365;

function hash(secret) {
    return createHash('sha256').update(secret).digest();
}

export async function currentUser() {
    const jar = await cookies();
    const raw = jar.get(COOKIE)?.value;
    if (!raw || !raw.includes('.')) return null;
    const [id, secret] = raw.split('.');
    if (!/^[a-f0-9-]{36}$/.test(id)) return null;

    const user = await data().get(`user/${id}`, { type: 'json' });
    if (!user) return null;
    const expected = Buffer.from(user.secretHash, 'hex');
    const actual = hash(secret);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return { id: user.id, name: user.name };
}

export async function createUser(name) {
    const id = randomUUID();
    const secret = randomBytes(24).toString('hex');
    const user = { id, name, secretHash: hash(secret).toString('hex'), createdAt: Date.now() };
    await data().setJSON(`user/${id}`, user);

    const jar = await cookies();
    jar.set(COOKIE, `${id}.${secret}`, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: ONE_YEAR
    });
    return { id, name };
}

export async function renameUser(user, name) {
    const stored = await data().get(`user/${user.id}`, { type: 'json' });
    await data().setJSON(`user/${user.id}`, { ...stored, name });
    return { id: user.id, name };
}
