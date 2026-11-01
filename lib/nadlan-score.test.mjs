import assert from 'node:assert/strict';
import test from 'node:test';
import { areas, cities } from './nadlan/areas.js';
import { rankedAreas, scoreArea, searchAreas, trendLabel } from './nadlan/score.js';

const base = { id: 'x', city: 'c', name: 'x', pricePerSqm: 10000, change12m: 0, rentYield: 2.5, transactions12m: 50, signals: [], risks: [] };

test('every area belongs to a known city and has a unique id', () => {
    const cityIds = new Set(cities.map((c) => c.id));
    const ids = new Set();
    for (const a of areas) {
        assert.ok(cityIds.has(a.city), `${a.id} has unknown city ${a.city}`);
        assert.ok(!ids.has(a.id), `duplicate id ${a.id}`);
        ids.add(a.id);
    }
});

test('scores stay within 0–100', () => {
    for (const a of rankedAreas()) assert.ok(a.score >= 0 && a.score <= 100, `${a.id}: ${a.score}`);
    const maxed = { ...base, change12m: 50, rentYield: 9, transactions12m: 900, signals: Array(9).fill({ kind: 'transport', text: '' }) };
    const cheap = { ...maxed, id: 'y', pricePerSqm: 1000 };
    assert.equal(scoreArea(cheap, [maxed, cheap]).score, 100);
    const awful = { ...base, change12m: -30, risks: ['a', 'b', 'c'] };
    assert.equal(scoreArea(awful, [awful]).score, 0);
});

test('a better signal never lowers the score', () => {
    const list = [base];
    const before = scoreArea(base, list).score;
    for (const better of [{ change12m: 5 }, { rentYield: 4 }, { transactions12m: 200 }, { signals: [{ kind: 'renewal', text: '' }] }]) {
        const area = { ...base, ...better };
        assert.ok(scoreArea(area, [area]).score >= before);
    }
});

test('cheaper than the city average scores higher on gap', () => {
    const pricey = { ...base, id: 'p', pricePerSqm: 20000 };
    const cheap = { ...base, id: 'c2', pricePerSqm: 12000 };
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

test('searchAreas respects budget, city and limit', () => {
    const results = searchAreas({ budget: 1_500_000, sqm: 90, limit: 50 });
    assert.ok(results.length > 0);
    for (const a of results) assert.ok(a.estimatedPrice <= 1_500_000);
    assert.ok(results.length <= 15);

    const haifa = searchAreas({ city: 'חיפה' });
    assert.ok(haifa.length > 0 && haifa.every((a) => a.city === 'haifa'));
    assert.deepEqual(searchAreas({ city: 'haifa' }).map((a) => a.id), haifa.map((a) => a.id));

    assert.equal(searchAreas({ budget: 10 }).length, 0);
});
