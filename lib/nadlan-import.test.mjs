import assert from 'node:assert/strict';
import test from 'node:test';
import { loadFromDb } from './nadlan/dataset.js';
import { refreshCycle, rentYield } from './nadlan/importer.js';
import { changeOver, chainIndex, parseCbs, rollForward, summarizePage } from './nadlan/sources.js';

// A series of monthly points ending 2026-09, growing `monthly` % per month.
function graph(field, start, monthly, months = 48) {
    const out = [];
    for (let i = 0; i < months; i += 1) {
        const d = new Date(Date.UTC(2026, 8 - (months - 1 - i), 1));
        out.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, [field]: Math.round(start * (1 + monthly / 100) ** i) });
    }
    return out;
}
const page = (field, extra, base, monthly) => ({
    ...extra,
    trends: {
        rooms: [
            { numRooms: 'all', graphData: graph(field, base, monthly) },
            { numRooms: '3', graphData: graph(field, base * 0.8, monthly) },
            { numRooms: '4', graphData: graph(field, base, monthly) },
            { numRooms: '5', graphData: graph(field, base * 1.25, monthly) }
        ]
    }
});

function memoryDb() {
    const map = new Map();
    return {
        map,
        get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : null),
        set: async (k, v) => void map.set(k, structuredClone(v)),
        list: async (p) => [...map.keys()].filter((k) => k.startsWith(p)).sort()
    };
}

// Serves fake nadlan.gov.il / CBS responses, with a BOM like the real files.
function fakeFetch(routes) {
    const calls = [];
    const impl = async (url) => {
        calls.push(url);
        const hit = Object.entries(routes).find(([k]) => url.includes(k));
        if (!hit) return new Response('not found', { status: 404 });
        return new Response(`﻿${JSON.stringify(hit[1])}`, { status: 200 });
    };
    impl.calls = calls;
    return impl;
}

test('summarizePage reads medians, per-room prices and changes', () => {
    const s = summarizePage(page('neighborhoodPrice', {}, 2_000_000, 0.5), 'neighborhoodPrice');
    assert.equal(s.asOf, '2026-09');
    assert.ok(s.price > 2_000_000);
    assert.deepEqual(Object.keys(s.perRoom).sort(), ['3', '4', '5']);
    assert.ok(Math.abs(s.change12m - (1.005 ** 12 - 1) * 100) < 0.2);
    assert.ok(s.change36m > s.change12m);
    assert.equal(summarizePage(null, 'neighborhoodPrice'), null);
    assert.equal(summarizePage({ trends: { rooms: [] } }, 'x'), null);
});

test('changeOver needs a point near the target date', () => {
    assert.equal(changeOver([{ month: '2026-01', value: 100 }, { month: '2026-09', value: 110 }], 12), null);
    assert.equal(changeOver([{ month: '2025-09', value: 100 }, { month: '2026-09', value: 110 }], 12), 10);
});

test('CBS: parses, chains rebased segments and rolls amounts forward', () => {
    const json = {
        month: [
            {
                date: [
                    { year: 2023, month: 12, currBase: { value: 200, baseDesc: '2020' } },
                    { year: 2024, month: 6, currBase: { value: 210, baseDesc: '2020' } },
                    { year: 2025, month: 1, currBase: { value: 101, baseDesc: '2024 average = 100' } }
                ]
            }
        ]
    };
    const s = parseCbs(json);
    assert.equal(s.length, 3);
    // The 2020-base points are restated on the 2024 base: 2024 average there is 210.
    assert.ok(Math.abs(s[1].value - 100) < 0.01);
    assert.equal(rollForward(1000, '2024-06', s), 1010);
    assert.equal(chainIndex([]).length, 0);
});

test('rentYield compares the same room count and stays in a sane range', () => {
    const buy = { price: 2_000_000, perRoom: { 4: 2_400_000 } };
    const rent = { price: 5000, perRoom: { 4: 6000 }, asOf: '2021-01' };
    assert.equal(rentYield(buy, rent, null), 3);
    assert.equal(rentYield(buy, { price: 999_999, perRoom: {}, asOf: '2021-01' }, null), null);
    assert.equal(rentYield(null, rent, null), null);
});

test('refreshCycle imports a city, geocodes once, and the dataset serves it', async () => {
    const db = memoryDb();
    const routes = {
        'settlement/buy/4000.json': page('settlementPrice', { settlementName: 'חיפה', otherNeighborhoods: [{ title: 'הדר', id: 11 }, { title: 'כרמל', id: 12 }, { title: 'ריק', id: 13 }] }, 1_800_000, 0.3),
        'settlement/rent/4000.json': page('settlementPrice', {}, 4500, 0),
        'neighborhood/buy/11.json': page('neighborhoodPrice', { neighborhoodName: 'הדר' }, 1_100_000, 0.8),
        'neighborhood/buy/12.json': page('neighborhoodPrice', { neighborhoodName: 'כרמל' }, 2_800_000, 0.1),
        'neighborhood/rent/11.json': page('neighborhoodPrice', {}, 4000, 0),
        'id=40010': { month: [{ date: [{ year: 2026, month: 9, currBase: { value: 100, baseDesc: '2024' } }] }] }
    };
    const fetchImpl = fakeFetch(routes);
    let geocodes = 0;
    const geocode = async (name) => {
        geocodes += 1;
        return name === 'הדר' ? { lat: 32.81, lng: 35.0 } : null;
    };
    const cities = [{ code: '4000', id: 'haifa', name: 'חיפה', lat: 32.8, lng: 35.0 }];

    const result = await refreshCycle({ db, fetchImpl, cities, geocode });
    assert.deepEqual(result.status.map((s) => [s.code, s.ok, s.areas]), [['4000', true, 2]]);
    assert.ok(fetchImpl.calls.every((u) => u.startsWith('https://data.nadlan.gov.il/api/pages/') || u.startsWith('https://api.cbs.gov.il/')));

    const data = await loadFromDb(db);
    assert.equal(data.isSample, false);
    assert.equal(data.areas.length, 2);
    const hadar = data.areas.find((a) => a.name === 'הדר');
    assert.equal(hadar.lat, 32.81);
    assert.ok(hadar.rentYield > 2.5 && hadar.rentYield < 3.5);
    assert.ok(hadar.gapPercent > 15);
    assert.equal(data.areas[0].name, 'הדר'); // cheaper, faster growth, better yield
    assert.equal(data.cities[0].areaCount, 2);

    // A second run reuses cached geocodes (including misses).
    await refreshCycle({ db, fetchImpl, cities, geocode });
    assert.equal(geocodes, 2);
});

test('a failing city is recorded and the cycle moves on', async () => {
    const db = memoryDb();
    const cities = [
        { code: '1', id: 'a', name: 'א', lat: 32, lng: 35 },
        { code: '2', id: 'b', name: 'ב', lat: 32, lng: 35 }
    ];
    const result = await refreshCycle({ db, fetchImpl: fakeFetch({}), cities, geocode: async () => null });
    assert.equal(result.status.length, 2);
    assert.ok(result.status.every((s) => !s.ok));
    assert.equal(await loadFromDb(db), null);
});
