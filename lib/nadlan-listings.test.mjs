import assert from 'node:assert/strict';
import test from 'node:test';
import { createListing, deleteListing, getListing, listingInput, normalizePhone, publicListing, resetListingsCache, searchListings, whatsappLink } from './nadlan/listings.js';

function memoryDb() {
    const map = new Map();
    return {
        get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : null),
        set: async (k, v) => void map.set(k, structuredClone(v)),
        delete: async (k) => void map.delete(k),
        list: async (p) => [...map.keys()].filter((k) => k.startsWith(p)).sort()
    };
}
const area = { id: 'a1', name: 'הדר', city: 'haifa', cityName: 'חיפה' };
const input = { ownerName: 'דנה', phone: '050-123-4567', areaId: 'a1', rooms: '4', sqm: '90', price: '1500000', floor: '', street: '', description: '', consent: true };

test('normalizePhone accepts Israeli numbers in common formats', () => {
    assert.equal(normalizePhone('050-123-4567'), '0501234567');
    assert.equal(normalizePhone('+972 50 123 4567'), '0501234567');
    assert.equal(normalizePhone('03-1234567'), '031234567');
    assert.equal(normalizePhone('12345'), null);
    assert.equal(whatsappLink('0501234567', 'היי'), 'https://wa.me/972501234567?text=%D7%94%D7%99%D7%99');
});

test('listingInput validates and coerces', () => {
    const ok = listingInput.safeParse(input);
    assert.ok(ok.success);
    assert.equal(ok.data.phone, '0501234567');
    assert.equal(ok.data.price, 1_500_000);
    assert.equal(ok.data.floor, undefined);
    assert.ok(!listingInput.safeParse({ ...input, phone: '123' }).success);
    assert.ok(!listingInput.safeParse({ ...input, consent: false }).success);
    assert.ok(!listingInput.safeParse({ ...input, price: '500' }).success);
});

test('create, search without phone, delete only with the token', async () => {
    resetListingsCache();
    const db = memoryDb();
    const listing = await createListing(db, listingInput.parse(input), area);
    assert.equal(listing.pricePerSqm, 16667);

    const found = await searchListings(db, { city: 'haifa', maxPrice: 2_000_000, minRooms: 3 });
    assert.equal(found.length, 1);
    assert.ok(!('phone' in found[0]) && !('editToken' in found[0]));
    assert.equal((await searchListings(db, { maxPrice: 1_000_000 })).length, 0);
    assert.ok(!('phone' in publicListing(listing)));

    assert.equal(await deleteListing(db, listing.id, 'wrong'), false);
    assert.ok(await getListing(db, listing.id));
    assert.equal(await deleteListing(db, listing.id, listing.editToken), true);
    assert.equal(await getListing(db, listing.id), null);
    assert.equal((await searchListings(db)).length, 0);
});

test('expired listings disappear', async () => {
    resetListingsCache();
    const db = memoryDb();
    const old = await createListing(db, listingInput.parse(input), area, Date.now() - 61 * 24 * 60 * 60_000);
    assert.equal(await getListing(db, old.id), null);
    assert.equal((await searchListings(db)).length, 0);
});
