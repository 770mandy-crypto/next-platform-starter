// GiveBack: distance ranking, Hebrew search, deep links, and the item → chat →
// address flow against the in-memory store. Run with: node --test lib/giveback.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { approximate, distanceKm, formatDistance, googleMapsLink, nearestCity, wazeLink } from './giveback/geo.js';
import { matchesQuery, normalize, rankItems } from './giveback/search.js';
import { createItem, getItem, publicItem, setItemStatus } from './giveback/items.js';
import {
    announceStatus,
    getConversation,
    listInbox,
    messageAboutItem,
    sendMessage,
    shareAddress
} from './giveback/conversations.js';

const TLV = { lat: 32.0853, lng: 34.7818 };
const RAMAT_GAN = { lat: 32.0684, lng: 34.8248 };
const HAIFA = { lat: 32.794, lng: 34.9896 };

test('distanceKm matches known city distances', () => {
    assert.ok(Math.abs(distanceKm(TLV, RAMAT_GAN) - 4.4) < 0.5);
    assert.ok(Math.abs(distanceKm(TLV, HAIFA) - 81) < 3);
    assert.equal(distanceKm(TLV, null), null);
});

test('approximate hides the exact point but stays within ~1km', () => {
    const home = { lat: 32.08537, lng: 34.78182 };
    const approx = approximate(home);
    assert.notDeepEqual(approx, home);
    assert.ok(distanceKm(home, approx) < 1);
});

test('nearestCity and formatDistance', () => {
    assert.equal(nearestCity({ lat: 32.07, lng: 34.823 }).name, 'רמת גן');
    assert.equal(formatDistance(0.34), '350 מ׳');
    assert.equal(formatDistance(2.46), '2.5 ק״מ');
    assert.equal(formatDistance(23.4), '23 ק״מ');
});

test('Waze link prefers exact coordinates and falls back to the address', () => {
    assert.equal(wazeLink({ lat: 32.1, lng: 34.8 }), 'https://waze.com/ul?ll=32.1,34.8&navigate=yes');
    assert.equal(
        wazeLink({ address: 'הרצל 5, רחובות' }),
        `https://waze.com/ul?q=${encodeURIComponent('הרצל 5, רחובות')}&navigate=yes`
    );
    assert.equal(wazeLink({}), null);
    assert.match(googleMapsLink({ address: 'הרצל 5' }), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
});

test('Hebrew search ignores final letters, niqqud and the attached article', () => {
    assert.equal(normalize('סְפָרִים'), 'ספרימ');
    const item = { title: 'שידה 3 מגירות', description: 'עץ מלא', category: 'furniture', area: 'רמת גן' };
    assert.ok(matchesQuery(item, 'השידה'));
    assert.ok(matchesQuery(item, 'שידה עץ'));
    assert.ok(matchesQuery(item, 'רהיטים'));
    assert.ok(!matchesQuery(item, 'ספה'));
});

test('rankItems sorts nearest first, applies radius, and drops given items', () => {
    const base = { description: '', category: 'furniture', area: '', createdAt: 1 };
    const items = [
        { ...base, id: 'haifa', title: 'שידה', location: HAIFA, status: 'available' },
        { ...base, id: 'rg', title: 'שידה', location: RAMAT_GAN, status: 'available' },
        { ...base, id: 'tlv-given', title: 'שידה', location: TLV, status: 'given' },
        { ...base, id: 'tlv-sofa', title: 'ספה', location: TLV, status: 'available' }
    ];
    assert.deepEqual(
        rankItems(items, { origin: TLV, query: 'שידה' }).map((r) => r.item.id),
        ['rg', 'haifa']
    );
    assert.deepEqual(
        rankItems(items, { origin: TLV, query: 'שידה', radiusKm: 15 }).map((r) => r.item.id),
        ['rg']
    );
});

test('post → search view → chat → share address → mark given', async () => {
    const giver = { id: '11111111-1111-4111-8111-111111111111', name: 'דנה' };
    const taker = { id: '22222222-2222-4222-8222-222222222222', name: 'יוסי' };

    const item = await createItem(giver, {
        title: 'שידה',
        category: 'furniture',
        condition: 'good',
        city: 'רמת גן',
        address: 'ביאליק 10',
        gps: { lat: 32.07011, lng: 34.82333 }
    });
    assert.equal(item.precise, true);

    // Strangers see the area, never the address or the exact point.
    const seen = publicItem(item, { viewer: taker, origin: TLV });
    assert.equal(seen.address, undefined);
    assert.deepEqual(seen.approx, { lat: 32.07, lng: 34.82 });
    assert.ok(seen.distanceKm > 3 && seen.distanceKm < 6);
    assert.equal(publicItem(item, { viewer: giver }).address, 'ביאליק 10');

    await assert.rejects(messageAboutItem(giver, item.id, 'היי'), /הפריט שלך/);
    const conv = await messageAboutItem(taker, item.id, 'עוד רלוונטי?');
    await sendMessage(giver, conv.id, 'כן! מתי נוח?');

    // Only the giver may share the address; it arrives with exact coordinates.
    await assert.rejects(shareAddress(taker, conv.id, 'x'), /רק מי שמוסר/);
    await shareAddress(giver, conv.id, '');
    const after = await getConversation(conv.id, taker);
    const addr = after.messages.at(-1);
    assert.equal(addr.kind, 'address');
    assert.equal(addr.address, 'ביאליק 10, רמת גן');
    assert.equal(wazeLink(addr), 'https://waze.com/ul?ll=32.07011,34.82333&navigate=yes');

    // An outsider cannot read the conversation.
    assert.equal(await getConversation(conv.id, { id: '33333333-3333-4333-8333-333333333333' }), null);

    const [summary] = await listInbox(taker);
    assert.equal(summary.otherName, 'דנה');
    assert.equal(summary.unread, 2);

    await assert.rejects(setItemStatus(taker, item.id, 'given'), /רק מי שפרסם/);
    const given = await setItemStatus(giver, item.id, 'given');
    await announceStatus(given);
    assert.equal((await getItem(item.id)).status, 'given');
    assert.equal((await getConversation(conv.id, taker)).messages.at(-1).kind, 'system');
    assert.equal(rankItems([given]).length, 0);
});

test('createItem validates input', async () => {
    const user = { id: '44444444-4444-4444-8444-444444444444', name: 'x' };
    await assert.rejects(createItem(user, { title: 'a', category: 'toys', condition: 'good', city: 'חיפה' }), /קצרה/);
    await assert.rejects(
        createItem(user, { title: 'כדור', category: 'toys', condition: 'good', city: 'לונדון' }),
        /עיר/
    );
    const noGps = await createItem(user, { title: 'כדור', category: 'toys', condition: 'good', city: 'חיפה' });
    assert.equal(noGps.precise, false);
});
