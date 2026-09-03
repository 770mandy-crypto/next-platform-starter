// Offline verification of the account store. Netlify Blobs itself isn't
// exercised — every function accepts an injectable store, so these tests
// swap in a plain in-memory Map and check the business logic around it:
// validation, hashing, and that a Google login never clobbers a password.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    normalizeEmail,
    isValidEmail,
    isValidPassword,
    hashPassword,
    verifyPassword,
    createUser,
    getUserByEmail,
    upsertOAuthUser,
    verifyUserCredentials
} from './users.js';

function fakeStore() {
    const data = new Map();
    return {
        async get(key) {
            return data.has(key) ? data.get(key) : null;
        },
        async setJSON(key, value) {
            data.set(key, value);
        }
    };
}

test('normalizeEmail trims and lowercases', () => {
    assert.equal(normalizeEmail('  Alice@Example.com '), 'alice@example.com');
    assert.equal(normalizeEmail(undefined), '');
});

test('isValidEmail rejects obviously malformed addresses', () => {
    assert.ok(isValidEmail('alice@example.com'));
    assert.ok(!isValidEmail('not-an-email'));
    assert.ok(!isValidEmail('alice@'));
});

test('isValidPassword enforces a minimum length', () => {
    assert.ok(isValidPassword('longenough1'));
    assert.ok(!isValidPassword('short'));
    assert.ok(!isValidPassword(''));
});

test('hashPassword/verifyPassword round-trip, and reject the wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    assert.ok(await verifyPassword('correct horse battery staple', hash));
    assert.ok(!(await verifyPassword('wrong password', hash)));
});

test('createUser stores a hashed password and rejects a duplicate email', async () => {
    const store = fakeStore();
    const user = await createUser({ email: 'Alice@Example.com', password: 'password123', name: 'Alice' }, store);
    assert.equal(user.email, 'alice@example.com');

    const stored = await getUserByEmail('alice@example.com', store);
    assert.equal(stored.passwordHash === 'password123', false);
    assert.ok(stored.passwordHash.length > 0);

    await assert.rejects(
        () => createUser({ email: 'alice@example.com', password: 'password123' }, store),
        /email-taken/
    );
});

test('createUser rejects invalid email or too-short password', async () => {
    const store = fakeStore();
    await assert.rejects(() => createUser({ email: 'not-an-email', password: 'password123' }, store), /invalid-email/);
    await assert.rejects(() => createUser({ email: 'a@b.com', password: 'short' }, store), /invalid-password/);
});

test('verifyUserCredentials accepts the right password and rejects everything else', async () => {
    const store = fakeStore();
    await createUser({ email: 'bob@example.com', password: 'password123' }, store);

    const ok = await verifyUserCredentials('bob@example.com', 'password123', store);
    assert.equal(ok.email, 'bob@example.com');

    assert.equal(await verifyUserCredentials('bob@example.com', 'wrong-password', store), null);
    assert.equal(await verifyUserCredentials('nobody@example.com', 'password123', store), null);
});

test('upsertOAuthUser creates a passwordless account and never overwrites an existing password', async () => {
    const store = fakeStore();

    await upsertOAuthUser({ email: 'carol@example.com', name: 'Carol', image: 'https://img' }, store);
    const oauthOnly = await getUserByEmail('carol@example.com', store);
    assert.equal(oauthOnly.passwordHash, null);
    assert.equal(await verifyUserCredentials('carol@example.com', 'anything', store), null);

    await createUser({ email: 'dana@example.com', password: 'password123' }, store);
    await upsertOAuthUser({ email: 'dana@example.com', name: 'Dana Updated' }, store);
    const merged = await getUserByEmail('dana@example.com', store);
    assert.ok(merged.passwordHash);
    assert.equal(merged.name, 'Dana Updated');
});
