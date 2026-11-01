// The refresh job: pulls official data for each city and its neighborhoods
// and stores a ready-to-serve summary per city. It runs on a schedule (see
// netlify/functions/matzpen-refresh.mjs) and works through the city list a few
// cities per run, so the whole country is refreshed every day without any run
// getting near the function time limit.
//
// Storage keys:
//   matzpen/city/{code}  { city, stats, areas, fetchedAt }
//   matzpen/geo/{id}     { lat, lng } or { miss: true }, per neighborhood
//   matzpen/cbs          { homePrices, rent, fetchedAt }
//   matzpen/meta         { cursor, lastRun, status: { [code]: {...} } }

import { CITIES } from './cities.js';
import { geocodeNeighborhood } from './geocode.js';
import { SIGNALS } from './signals.js';
import { CBS_SERIES, fetchCbsIndex, fetchNeighborhood, fetchSettlement, rollForward, summarizePage } from './sources.js';

const MAX_NEIGHBORHOODS = 80;
const CONCURRENCY = 6;
const GEOCODES_PER_RUN = 25;
const DAY = 24 * 60 * 60_000;

async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (next < items.length) {
                const i = next++;
                out[i] = await fn(items[i], i);
            }
        })
    );
    return out;
}

// Annual rent over price, %, comparing like with like (same room count) when
// both sides publish it. Rent medians are rolled forward with the CBS rent
// index because nadlan.gov.il stopped updating them.
export function rentYield(buy, rent, rentIndex) {
    if (!buy || !rent) return null;
    const rooms = [4, 3, 5].find((r) => buy.perRoom[r] && rent.perRoom[r]);
    const price = rooms ? buy.perRoom[rooms] : buy.price;
    const monthly = rooms ? rent.perRoom[rooms] : rent.price;
    const current = rentIndex?.length ? rollForward(monthly, rent.asOf, rentIndex) : monthly;
    if (!(price > 0) || !(current > 0)) return null;
    const pct = ((current * 12) / price) * 100;
    return pct >= 0.5 && pct <= 10 ? Math.round(pct * 10) / 10 : null;
}

export async function refreshCbs(db, { fetchImpl } = {}) {
    const [homePrices, rent] = await Promise.all([
        fetchCbsIndex(CBS_SERIES.homePrices, 120, { fetchImpl }).catch(() => []),
        fetchCbsIndex(CBS_SERIES.rent, 120, { fetchImpl }).catch(() => [])
    ]);
    const cbs = { homePrices, rent, fetchedAt: Date.now() };
    if (homePrices.length || rent.length) await db.set('matzpen/cbs', cbs);
    return cbs;
}

export async function refreshCity(city, { db, cbs, fetchImpl, geocode = geocodeNeighborhood, geocodeBudget = { left: GEOCODES_PER_RUN } }) {
    const opts = { fetchImpl };
    const page = await fetchSettlement(city.code, 'buy', opts);
    if (!page) throw new Error(`no nadlan.gov.il page for ${city.name} (${city.code})`);
    const stats = summarizePage(page, 'settlementPrice');
    const cityRent = summarizePage(await fetchSettlement(city.code, 'rent', opts).catch(() => null), 'settlementPrice');

    const list = (page.otherNeighborhoods ?? []).filter((n) => n?.id && n?.title).slice(0, MAX_NEIGHBORHOODS);
    const curated = SIGNALS[city.id] ?? {};

    const areas = await mapLimit(list, CONCURRENCY, async (n) => {
        const [buyPage, rentPage] = await Promise.all([
            fetchNeighborhood(n.id, 'buy', opts).catch(() => null),
            fetchNeighborhood(n.id, 'rent', opts).catch(() => null)
        ]);
        const buy = summarizePage(buyPage, 'neighborhoodPrice');
        if (!buy) return null;
        const rent = summarizePage(rentPage, 'neighborhoodPrice') ?? cityRent;

        const geoKey = `matzpen/geo/${n.id}`;
        let point = await db.get(geoKey);
        if (!point && geocodeBudget.left > 0) {
            geocodeBudget.left -= 1;
            point = (await geocode(n.title, city, { fetchImpl })) ?? { miss: true };
            await db.set(geoKey, point);
        }

        const signals = curated[n.title];
        return {
            id: `n${n.id}`,
            nadlanId: n.id,
            city: city.id,
            cityName: city.name,
            name: n.title,
            price: buy.price,
            perRoom: buy.perRoom,
            asOf: buy.asOf,
            change12m: buy.change12m,
            change36m: buy.change36m,
            history: buy.history,
            rentYield: rentYield(buy, rent, cbs?.rent),
            cityMedian: stats?.price ?? null,
            lat: point?.lat ?? null,
            lng: point?.lng ?? null,
            signals: signals ?? [],
            signalsCollected: Boolean(signals),
            risks: [],
            source: 'nadlan.gov.il'
        };
    });

    const record = { city, stats, areas: areas.filter(Boolean), fetchedAt: Date.now() };
    await db.set(`matzpen/city/${city.code}`, record);
    return record;
}

// One scheduled run: refresh the CBS indices once a day, then as many cities
// as fit in the time budget, continuing from where the last run stopped.
export async function refreshCycle({ db, fetchImpl, budgetMs = 20_000, now = Date.now, cities = CITIES, geocode } = {}) {
    const started = now();
    const meta = (await db.get('matzpen/meta')) ?? { cursor: 0, status: {} };
    let cbs = await db.get('matzpen/cbs');
    if (!cbs || now() - cbs.fetchedAt > DAY) cbs = await refreshCbs(db, { fetchImpl });

    const geocodeBudget = { left: GEOCODES_PER_RUN };
    const done = [];
    for (let i = 0; i < cities.length; i += 1) {
        if (i > 0 && now() - started > budgetMs) break;
        const city = cities[(meta.cursor + i) % cities.length];
        try {
            const record = await refreshCity(city, { db, cbs, fetchImpl, geocode, geocodeBudget });
            meta.status[city.code] = { ok: true, areas: record.areas.length, at: now() };
        } catch (error) {
            meta.status[city.code] = { ok: false, error: String(error?.message ?? error), at: now() };
        }
        done.push(city.code);
    }
    meta.cursor = (meta.cursor + done.length) % cities.length;
    meta.lastRun = now();
    await db.set('matzpen/meta', meta);
    return { refreshed: done, status: done.map((code) => ({ code, ...meta.status[code] })) };
}
