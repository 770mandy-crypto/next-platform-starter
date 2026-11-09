import assert from 'node:assert/strict';
import test from 'node:test';
import { confirm, notifyNewListing, notifyScoreChanges, scoreChanges, subscribe, unsubscribe } from './nadlan/alerts.js';
import { confirmEmail, escapeHtml, newListingEmail, scoreChangeEmail } from './nadlan/mail.js';

function memoryDb() {
    const map = new Map();
    return {
        get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : null),
        set: async (k, v) => void map.set(k, structuredClone(v)),
        delete: async (k) => void map.delete(k),
        list: async (p) => [...map.keys()].filter((k) => k.startsWith(p)).sort()
    };
}
const base = 'https://example.org';

test('subscribe → confirm → unsubscribe, with one record per address', async () => {
    const db = memoryDb();
    const first = await subscribe(db, { email: ' Dana@Example.com ', areaId: 'a1' }, 1000);
    assert.equal(first.record.email, 'dana@example.com');
    assert.ok(first.sendConfirm);

    // Same address again: same record, area added, no second email within 10 minutes.
    const again = await subscribe(db, { email: 'dana@example.com', areaId: 'a2' }, 2000);
    assert.equal(again.record.id, first.record.id);
    assert.deepEqual(again.record.areaIds, ['a1', 'a2']);
    assert.equal(again.sendConfirm, false);

    assert.equal(await confirm(db, first.record.id, 'wrong'), null);
    assert.ok((await confirm(db, first.record.id, first.record.token)).confirmed);
    assert.equal((await subscribe(db, { email: 'dana@example.com', areaId: 'a3' }, 10 ** 9)).sendConfirm, false);

    assert.equal(await unsubscribe(db, first.record.id, 'wrong'), false);
    assert.ok(await unsubscribe(db, first.record.id, first.record.token));
    assert.equal((await db.list('matzpen/alert/')).length, 0);
    await assert.rejects(subscribe(db, { email: 'not-an-email', areaId: 'a1' }));
});

const area = (id, extra) => ({ id, city: 'c', cityName: 'עיר', name: id, price: 1_000_000, change12m: 2, change36m: null, rentYield: 3, signals: [], risks: [], ...extra });

test('scoreChanges reports real moves only', () => {
    const before = [area('a'), area('b'), area('c', { price: 1_500_000 })];
    const after = [area('a', { change12m: 9 }), area('b', { change12m: 2.2 }), area('c', { price: 1_500_000 }), area('new')];
    const changes = scoreChanges(before, after);
    assert.deepEqual(changes.map((c) => c.areaId), ['a']);
    assert.ok(changes[0].to > changes[0].from);
    assert.deepEqual(scoreChanges(null, after), []);
});

test('notifications go only to confirmed followers of the area', async () => {
    const db = memoryDb();
    const a = await subscribe(db, { email: 'a@x.org', areaId: 'a1' });
    await confirm(db, a.record.id, a.record.token);
    await subscribe(db, { email: 'pending@x.org', areaId: 'a1' }); // never confirmed
    const b = await subscribe(db, { email: 'b@x.org', areaId: 'other' });
    await confirm(db, b.record.id, b.record.token);

    const sent = [];
    const send = async (m) => void sent.push(m);
    const changes = [{ areaId: 'a1', name: 'הדר', cityName: 'חיפה', from: 50, to: 62, trendFrom: 'יציב', trendTo: 'מגמת עלייה' }];
    assert.equal(await notifyScoreChanges(db, changes, { send, base, buildEmail: scoreChangeEmail }), 1);
    assert.equal(sent[0].to, 'a@x.org');
    assert.match(sent[0].html, /unsubscribe\?id=/);
    assert.match(sent[0].subject, /עלה/);

    const listing = { id: 'L1', areaId: 'a1', areaName: 'הדר', cityName: 'חיפה', rooms: 3, sqm: 70, street: '' };
    assert.equal(await notifyNewListing(db, listing, { send, base, buildEmail: (x) => newListingEmail({ ...x, priceText: '1 מיליון ₪' }) }), 1);
    assert.match(sent[1].html, /matzpen\/listings\/L1/);

    // A failing send does not stop the others.
    let calls = 0;
    const flaky = async () => {
        calls += 1;
        throw new Error('boom');
    };
    assert.equal(await notifyScoreChanges(db, changes, { send: flaky, base, buildEmail: scoreChangeEmail }), 0);
    assert.equal(calls, 1);
});

test('emails escape user content', () => {
    assert.equal(escapeHtml('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
    const mail = newListingEmail({ listing: { id: 'L', areaName: '<script>', cityName: 'x', rooms: 3, sqm: 70, street: '<img>' }, priceText: '1', unsubscribeUrl: `${base}/u`, base });
    assert.ok(!mail.html.includes('<script>') && !mail.html.includes('<img>'));
    assert.match(confirmEmail({ confirmUrl: `${base}/c`, areaNames: ['הדר, חיפה'] }).html, /אישור ההרשמה/);
});
