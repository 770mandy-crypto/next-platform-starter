// Readers for the official open data behind Matzpen. Endpoint shapes follow
// what the open-source project nadlan-comps (MIT, github.com/mikey641/nadlan-comps,
// docs/sources.md) documents and last verified in October 2026:
//
//   data.nadlan.gov.il (Israel Tax Authority deals, published as medians)
//     /api/pages/settlement/{buy|rent}/{settlementCode}.json
//     /api/pages/neighborhood/{buy|rent}/{neighborhoodId}.json
//   Each file: settlementName, neighborhoodName, otherNeighborhoods [{ title, id }]
//   (on city files), and trends.rooms[] = { numRooms: '3'|'4'|'5'|'all',
//   graphData: [{ year, month, settlementPrice | neighborhoodPrice }] } of
//   whole-apartment medians. Files start with a UTF-8 BOM. The rent series
//   stopped updating around 2021, so rents are rolled forward with the CBS
//   rent index.
//
//   api.cbs.gov.il (Central Bureau of Statistics price indices)
//     /index/data/price?id={series}&format=json&download=false&last={months}
//   40010 = dwellings price index, 120460 = rent price index. Response:
//   month[0].date[] = { year, month, currBase: { value, baseDesc } }; the base
//   changes every few years, so the segments are chained into one series.

export const NADLAN_BASE = 'https://data.nadlan.gov.il/api/pages';
export const CBS_SERIES = { homePrices: 40010, rent: 120460 };

const TIMEOUT_MS = 8_000;

export async function fetchJson(url, { fetchImpl = fetch } = {}) {
    const res = await fetchImpl(url, {
        headers: { accept: 'application/json', 'user-agent': 'Matzpen/1.0 (real-estate research)' },
        signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    const text = await res.text();
    return JSON.parse(text.replace(/^﻿/, ''));
}

// --- nadlan.gov.il -----------------------------------------------------------

const monthKey = (p) => (p?.year && p?.month ? `${p.year}-${String(p.month).padStart(2, '0')}` : null);
const monthsBetween = (a, b) => {
    const [ya, ma] = a.split('-').map(Number);
    const [yb, mb] = b.split('-').map(Number);
    return (yb - ya) * 12 + (mb - ma);
};

// One room bucket's series as [{ month: 'YYYY-MM', value }], oldest first.
function seriesOf(bucket, field) {
    return (bucket?.graphData ?? [])
        .map((p) => ({ month: monthKey(p), value: Number(p?.[field]) }))
        .filter((p) => p.month && Number.isFinite(p.value) && p.value > 0)
        .sort((a, b) => (a.month < b.month ? -1 : 1));
}

// Percent change from about `months` before the latest point (the closest
// point within 3 months of that date), or null when the series is too short.
export function changeOver(series, months) {
    if (series.length < 2) return null;
    const latest = series.at(-1);
    let best = null;
    for (const p of series) {
        const gap = Math.abs(monthsBetween(p.month, latest.month) - months);
        if (gap <= 3 && (!best || gap < best.gap)) best = { p, gap };
    }
    if (!best) return null;
    return Math.round(((latest.value / best.p.value - 1) * 100) * 10) / 10;
}

// Turns one nadlan.gov.il page into medians and trends. field is
// 'settlementPrice' for city files and 'neighborhoodPrice' for neighborhoods.
export function summarizePage(page, field) {
    const buckets = page?.trends?.rooms ?? [];
    const all = buckets.find((b) => String(b.numRooms).toLowerCase() === 'all');
    const perRoom = {};
    for (const b of buckets) {
        if (b === all) continue;
        const s = seriesOf(b, field);
        const rooms = Number(b.numRooms);
        if (s.length && Number.isFinite(rooms)) perRoom[rooms] = s.at(-1).value;
    }
    // Trends come from the all-rooms series, or the fullest room series.
    const main = all ? seriesOf(all, field) : buckets.map((b) => seriesOf(b, field)).sort((a, b) => b.length - a.length)[0] ?? [];
    if (!main.length && !Object.keys(perRoom).length) return null;
    return {
        price: main.at(-1)?.value ?? Object.values(perRoom)[0],
        perRoom,
        asOf: main.at(-1)?.month ?? null,
        change12m: changeOver(main, 12),
        change36m: changeOver(main, 36),
        // A light history for charts: the last 5 years.
        history: main.filter((p) => !main.length || monthsBetween(p.month, main.at(-1).month) <= 60)
    };
}

export async function fetchSettlement(code, kind = 'buy', opts) {
    return fetchJson(`${NADLAN_BASE}/settlement/${kind}/${code}.json`, opts);
}

export async function fetchNeighborhood(id, kind = 'buy', opts) {
    return fetchJson(`${NADLAN_BASE}/neighborhood/${kind}/${id}.json`, opts);
}

// --- CBS -------------------------------------------------------------------

// Chains index segments with different bases onto the latest base: the factor
// from one base to the next is 100 / (the old base's average over the new
// base's reference year).
export function chainIndex(rows) {
    const groups = [];
    for (const r of rows) {
        const last = groups.at(-1);
        if (!last || last.base !== r.base) groups.push({ base: r.base, refYear: parseInt(r.base, 10), items: [r] });
        else last.items.push(r);
    }
    const factors = groups.map(() => 1);
    for (let k = groups.length - 2; k >= 0; k -= 1) {
        const ref = groups[k].items.filter((x) => x.year === groups[k + 1].refYear).map((x) => x.value);
        const step = ref.length ? 100 / (ref.reduce((a, b) => a + b, 0) / ref.length) : 1;
        factors[k] = factors[k + 1] * step;
    }
    return groups.flatMap((g, i) => g.items.map((it) => ({ month: it.month, value: Math.round(it.value * factors[i] * 1e4) / 1e4 })));
}

export function parseCbs(json) {
    const dates = json?.month?.[0]?.date ?? [];
    const rows = dates
        .filter((d) => d?.year && d?.month && d?.currBase?.value != null)
        .map((d) => ({
            month: `${d.year}-${String(d.month).padStart(2, '0')}`,
            year: Number(d.year),
            value: Number(d.currBase.value),
            base: String(d.currBase.baseDesc ?? '')
        }))
        .sort((a, b) => (a.month < b.month ? -1 : 1));
    return chainIndex(rows);
}

export async function fetchCbsIndex(id, months = 120, opts) {
    const json = await fetchJson(`https://api.cbs.gov.il/index/data/price?id=${id}&format=json&download=false&last=${months}`, opts);
    return parseCbs(json);
}

// Index value in force at a month (the latest point at or before it).
export function indexAt(series, month) {
    let value = null;
    for (const p of series) {
        if (p.month <= month) value = p.value;
        else break;
    }
    return value ?? series[0]?.value ?? null;
}

// An amount measured at `month`, restated at the index's latest level.
export function rollForward(amount, month, series) {
    if (!(amount > 0) || !series?.length || !month) return null;
    const from = indexAt(series, month);
    return from ? Math.round((amount * series.at(-1).value) / from) : null;
}
