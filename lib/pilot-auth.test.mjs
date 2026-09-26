// Offline checks for Maslul accounts, sessions, the workspace store and the
// audit log, run against the in-memory backend.
import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MASLUL_STORE = 'memory';
process.env.MASLUL_AI_DAILY_LIMIT = '3';

const { getDb, resetMemoryDb } = await import('./pilot/db.js');
const auth = await import('./pilot/auth.js');
const ws = await import('./pilot/workspace.js');

const ALICE = { name: 'אליס', email: 'Alice@Example.com', password: 'correct horse', ip: '1.1.1.1' };

test.beforeEach(() => resetMemoryDb());

// --- Passwords -------------------------------------------------------------

test('hashPassword salts each hash and verifyPassword checks it', async () => {
    const a = await auth.hashPassword('secret-123');
    const b = await auth.hashPassword('secret-123');
    assert.notEqual(a, b);
    assert.ok(a.startsWith('scrypt$'));
    assert.equal(await auth.verifyPassword('secret-123', a), true);
    assert.equal(await auth.verifyPassword('secret-124', a), false);
    assert.equal(await auth.verifyPassword('secret-123', 'garbage'), false);
});

test('validateSignup rejects short passwords and bad emails', () => {
    assert.equal(auth.validateSignup({ name: 'a', email: 'a@b.co', password: '12345678' }).length, 0);
    assert.equal(auth.validateSignup({ name: '', email: 'nope', password: 'short' }).length, 3);
});

// --- Users -----------------------------------------------------------------

test('createUser stores a hashed password and a normalised email', async () => {
    const user = await auth.createUser(ALICE);
    assert.equal(user.email, 'alice@example.com');
    const stored = await (await getDb()).get(`users/${user.id}`);
    assert.ok(!JSON.stringify(stored).includes('correct horse'));
    assert.deepEqual(Object.keys(auth.publicUser(user)).sort(), ['createdAt', 'email', 'id', 'name']);
});

test('the same email cannot register twice, whatever its case', async () => {
    await auth.createUser(ALICE);
    await assert.rejects(auth.createUser({ ...ALICE, email: 'ALICE@example.com' }), { status: 409 });
});

test('authenticate accepts the right password and rejects others with one message', async () => {
    await auth.createUser(ALICE);
    const user = await auth.authenticate({ email: 'alice@example.com', password: 'correct horse', ip: '2.2.2.2' });
    assert.equal(user.email, 'alice@example.com');

    const wrong = await auth.authenticate({ email: ALICE.email, password: 'nope', ip: '2.2.2.2' }).catch((e) => e);
    const missing = await auth.authenticate({ email: 'ghost@example.com', password: 'nope', ip: '2.2.2.2' }).catch((e) => e);
    assert.equal(wrong.status, 401);
    assert.equal(missing.status, 401);
    assert.equal(wrong.message, missing.message, 'no hint about which emails exist');
});

test('repeated login attempts on one email are rate limited', async () => {
    await auth.createUser(ALICE);
    for (let i = 0; i < 9; i += 1) {
        await auth.authenticate({ email: ALICE.email, password: 'wrong', ip: `10.0.0.${i}` }).catch(() => {});
    }
    await assert.rejects(auth.authenticate({ email: ALICE.email, password: 'correct horse', ip: '10.0.1.1' }), {
        status: 429
    });
});

test('consumeLimit resets after its window', async () => {
    const rule = { limit: 2, windowMs: 1000 };
    assert.equal(await auth.consumeLimit('x', rule, 0), true);
    assert.equal(await auth.consumeLimit('x', rule, 10), true);
    assert.equal(await auth.consumeLimit('x', rule, 20), false);
    assert.equal(await auth.consumeLimit('x', rule, 1500), true);
});

// --- Sessions --------------------------------------------------------------

test('a session token resolves to its user and is stored only as a hash', async () => {
    const user = await auth.createUser(ALICE);
    const token = await auth.createSession(user.id);
    assert.equal((await auth.getSessionUser(token)).id, user.id);

    const keys = await (await getDb()).list('sessions/');
    assert.equal(keys.length, 1);
    assert.ok(!keys[0].includes(token));
});

test('expired, destroyed and malformed sessions resolve to nobody', async () => {
    const user = await auth.createUser(ALICE);
    const now = Date.parse('2026-01-01T00:00:00Z');
    const token = await auth.createSession(user.id, now);
    assert.equal(await auth.getSessionUser(token, now + (auth.SESSION_TTL_DAYS + 1) * 86_400_000), null);

    const live = await auth.createSession(user.id);
    await auth.destroySession(live);
    assert.equal(await auth.getSessionUser(live), null);

    assert.equal(await auth.getSessionUser(null), null);
    assert.equal(await auth.getSessionUser('x'.repeat(500)), null);
});

test('session cookies are httpOnly and SameSite=Lax', () => {
    const cookie = auth.sessionCookie('abc');
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, 'lax');
});

// --- Workspace, audit, quota ------------------------------------------------

test('saveWorkspace drops fields the app does not own, including the user', async () => {
    const saved = await ws.saveWorkspace('u1', {
        user: { id: 'someone-else' },
        project: { goal: 'x' },
        tasks: [{ id: 't' }],
        memory: 'not an array',
        isAdmin: true
    });
    assert.equal(saved.user, undefined);
    assert.equal(saved.isAdmin, undefined);
    assert.deepEqual(saved.memory, []);
    assert.deepEqual((await ws.getWorkspace('u1')).project, { goal: 'x' });
});

test('saveWorkspace refuses oversized workspaces', async () => {
    await assert.rejects(ws.saveWorkspace('u1', { messages: [{ content: 'x'.repeat(ws.MAX_WORKSPACE_BYTES) }] }), {
        status: 413
    });
});

test('audit entries read back newest first and are per user', async () => {
    await ws.recordAudit('u1', { event: 'approved', type: 'send_email' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await ws.recordAudit('u1', { event: 'rejected', type: 'publish_post' });
    await ws.recordAudit('u2', { event: 'approved', type: 'schedule_event' });

    const entries = await ws.listAudit('u1');
    assert.deepEqual(
        entries.map((entry) => entry.event),
        ['rejected', 'approved']
    );
});

test('consumeAiQuota stops a user at the daily limit without affecting others', async () => {
    for (let i = 0; i < 3; i += 1) await ws.consumeAiQuota('u1');
    await assert.rejects(ws.consumeAiQuota('u1'), { status: 429 });
    await ws.consumeAiQuota('u2');
});

test('deleteAccountData removes the user, workspace and audit log', async () => {
    const user = await auth.createUser(ALICE);
    await ws.saveWorkspace(user.id, { project: { goal: 'x' } });
    await ws.recordAudit(user.id, { event: 'approved', type: 'send_email' });
    await ws.deleteAccountData(user);

    const db = await getDb();
    assert.equal(await db.get(`users/${user.id}`), null);
    assert.equal(await ws.getWorkspace(user.id), null);
    assert.deepEqual(await db.list(`audit/${user.id}/`), []);
});

test('a deleted account frees its email and ends sessions on every device', async () => {
    const user = await auth.createUser(ALICE);
    const token = await auth.createSession(user.id);
    await ws.deleteAccountData(user);

    assert.equal(await auth.getSessionUser(token), null);
    const again = await auth.createUser({ ...ALICE, ip: '9.9.9.9' });
    assert.notEqual(again.id, user.id);
});
