import assert from 'node:assert/strict';
import test from 'node:test';
import { areas, cities } from './nadlan/areas.js';
import { CITIES } from './nadlan/cities.js';
import { sampleDataset } from './nadlan/dataset.js';
import { priceFor, rankAreas, scoreArea, searchAreas, trendLabel } from './nadlan/score.js';

const base = { id: 'x', city: 'c', cityName: 'עיר', name: 'x', price: 1_000_000, change12m: 0, change36m: null, rentYield: 2.5, signals: [], risks: [] };

test('sample areas belong to known cities, have unique ids, and match the importer city list', () => {
    const cityIds = new Set(cities.map((c) => c.id));
    const importIds = new Set(CITIES.map((c) => c.id));
    const ids = new Set();
    for (const a of areas) {
        assert.ok(cityIds.has(a.city) && importIds.has(a.city), `${a.id} has unknown city ${a.city}`);
        assert.ok(!ids.has(a.id), `duplicate id ${a.id}`);
        ids.add(a.id);
        assert.ok(a.price > 0 && a.cityName);
    }
});

test('scores stay within 0–100', () => {
    for (const a of rankAreas(areas)) assert.ok(a.score >= 0 && a.score <= 100, `${a.id}: ${a.score}`);
    const maxed = { ...base, change12m: 50, change36m: 90, rentYield: 9, signals: Array(9).fill({ kind: 'transport', text: '' }) };
    const cheap = { ...maxed, id: 'y', price: 100_000 };
    assert.equal(scoreArea(cheap, [maxed, cheap]).score, 100);
    const awful = { ...base, change12m: -30, risks: ['a', 'b', 'c'] };
    assert.equal(scoreArea(awful, [awful]).score, 0);
});

test('a better signal never lowers the score', () => {
    const before = scoreArea(base, [base]).score;
    for (const better of [{ change12m: 5 }, { rentYield: 4 }, { change36m: 20 }, { signals: [{ kind: 'renewal', text: '' }] }]) {
        const area = { ...base, ...better };
        assert.ok(scoreArea(area, [area]).score >= before);
    }
});

test('missing data is left out of the score, not counted as zero', () => {
    const full = { ...base, change12m: 8, rentYield: 4.5 };
    const noRent = { ...full, rentYield: null };
    const a = scoreArea(full, [full]);
    const b = scoreArea(noRent, [noRent]);
    assert.ok(!('yield' in b.parts));
    assert.ok(b.coverage < a.coverage);
    // Uncollected growth drivers do not count against an area either.
    const uncollected = scoreArea({ ...full, signalsCollected: false }, [full]);
    assert.ok(uncollected.score > a.score);
});

test('risks are derived from the numbers', () => {
    const falling = { ...base, change12m: -4 };
    assert.ok(scoreArea(falling, [falling]).risks.some((r) => r.includes('ירדו')));
});

test('cheaper than the city median scores higher on gap', () => {
    const pricey = { ...base, id: 'p', price: 2_000_000 };
    const cheap = { ...base, id: 'c2', price: 1_200_000 };
    const list = [pricey, cheap];
    assert.ok(scoreArea(cheap, list).parts.gap > scoreArea(pricey, list).parts.gap);
    assert.equal(scoreArea(pricey, list).parts.gap, 0);
});

test('trend labels follow the score bands', () => {
    assert.equal(trendLabel(80).id, 'strong');
    assert.equal(trendLabel(60).id, 'up');
    assert.equal(trendLabel(45).id, 'stable');
    assert.equal(trendLabel(10).id, 'weak');
});

test('searchAreas respects budget, city, rooms and limit', () => {
    const ranked = sampleDataset().areas;
    const results = searchAreas(ranked, { budget: 1_500_000, limit: 50 });
    assert.ok(results.length > 0 && results.length <= 15);
    for (const a of results) assert.ok(a.estimatedPrice <= 1_500_000);

    const haifa = searchAreas(ranked, { city: 'חיפה' });
    assert.ok(haifa.length > 0 && haifa.every((a) => a.city === 'haifa'));
    assert.deepEqual(searchAreas(ranked, { city: 'haifa' }).map((a) => a.id), haifa.map((a) => a.id));
    assert.equal(searchAreas(ranked, { budget: 10 }).length, 0);
});

test('priceFor picks the nearest room median', () => {
    const a = { price: 2_000_000, perRoom: { 3: 1_600_000, 4: 2_000_000, 5: 2_500_000 } };
    assert.equal(priceFor(a, 3), 1_600_000);
    assert.equal(priceFor(a, 6), 2_500_000);
    assert.equal(priceFor(a, 9), 2_000_000);
    assert.equal(priceFor({ price: 5 }, 4), 5);
});
