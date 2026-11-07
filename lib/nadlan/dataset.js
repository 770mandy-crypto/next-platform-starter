// What the site and the agent read: every imported neighborhood, scored. Real
// data comes from the refresh job's storage; until the first import has run
// (or when storage is unreachable) the sample data is served instead, flagged
// so every page says so.

import { getDb } from '../pilot/db.js';
import { areas as sampleAreas } from './areas.js';
import { CITIES, cityById } from './cities.js';
import { rankAreas } from './score.js';

const CACHE_MS = 10 * 60_000;
let cached = null;

function cbsSummary(cbs) {
    const s = cbs?.homePrices;
    if (!s?.length) return null;
    const latest = s.at(-1);
    const yearAgo = s.find((p) => p.month === `${Number(latest.month.slice(0, 4)) - 1}${latest.month.slice(4)}`);
    return { month: latest.month, change12m: yearAgo ? Math.round((latest.value / yearAgo.value - 1) * 1000) / 10 : null };
}

function build(areas, { isSample, updatedAt = null, national = null, cityStats = {} }) {
    const ranked = rankAreas(areas);
    const present = new Set(ranked.map((a) => a.city));
    const cities = CITIES.filter((c) => present.has(c.id)).map((c) => {
        const inCity = ranked.filter((a) => a.city === c.id);
        return {
            ...c,
            areaCount: inCity.length,
            avgScore: Math.round(inCity.reduce((s, a) => s + a.score, 0) / inCity.length),
            stats: cityStats[c.id] ?? null
        };
    });
    return { areas: ranked, cities, isSample, updatedAt, national };
}

export async function loadFromDb(db) {
    const keys = await db.list('matzpen/city/');
    const records = (await Promise.all(keys.map((k) => db.get(k)))).filter((r) => r?.areas?.length);
    if (!records.length) return null;
    const cityStats = Object.fromEntries(records.map((r) => [r.city.id, r.stats]));
    return build(
        records.flatMap((r) => r.areas),
        {
            isSample: false,
            updatedAt: Math.max(...records.map((r) => r.fetchedAt)),
            national: cbsSummary(await db.get('matzpen/cbs')),
            cityStats
        }
    );
}

export function sampleDataset() {
    return build(sampleAreas, { isSample: true });
}

export async function loadDataset({ fresh = false } = {}) {
    if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.data;
    let data = null;
    try {
        data = await loadFromDb(await getDb());
    } catch (error) {
        console.error('Matzpen data load failed, serving sample data:', error?.message ?? error);
    }
    data ??= sampleDataset();
    cached = { at: Date.now(), data };
    return data;
}

export async function getArea(id) {
    const data = await loadDataset();
    return data.areas.find((a) => a.id === id) ?? null;
}

export { cityById };
