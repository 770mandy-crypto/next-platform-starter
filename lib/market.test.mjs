// Offline verification of the market-map aggregation. Run with npm test.
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { INDICES, SECTORS, fetchMarketMap, marketVerdict, resetMarketCache, summariseBreadth } from './market.js';
import { fallbackMarketNarration } from './bot.js';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
    resetMarketCache();
});

function sector(label, { score, aboveMa50 = true, aboveMa200 = true, threeMonths = 5 }) {
    return { symbol: label, label, ok: true, score, aboveMa50, aboveMa200, returns: { threeMonths } };
}

test('summariseBreadth counts participation across scored sectors', () => {
    const breadth = summariseBreadth([
        sector('a', { score: 70 }),
        sector('b', { score: 60 }),
        sector('c', { score: 40, aboveMa50: false, threeMonths: -3 }),
        sector('d', { score: 30, aboveMa50: false, aboveMa200: false, threeMonths: -8 }),
        { symbol: 'x', ok: false }
    ]);

    assert.equal(breadth.total, 4); // the failed entry is excluded
    assert.equal(breadth.aboveMa50, 2);
    assert.equal(breadth.aboveMa200, 3);
    assert.equal(breadth.positiveQuarter, 2);
    assert.equal(breadth.averageScore, 50);
    assert.equal(breadth.participation, 50);
});

test('summariseBreadth returns null when nothing could be scored', () => {
    assert.equal(summariseBreadth([{ symbol: 'x', ok: false }]), null);
    assert.equal(summariseBreadth([]), null);
});

test('marketVerdict blends the benchmark with breadth', () => {
    const breadth = summariseBreadth([sector('a', { score: 30 }), sector('b', { score: 30 })]);
    const indices = [{ symbol: '^GSPC', ok: true, score: 90 }];

    // A strong index carried by weak breadth must not read as a strong market.
    const verdict = marketVerdict(breadth, indices);
    assert.equal(verdict.score, 60);
    assert.ok(verdict.score < 90);
});

test('marketVerdict falls back to breadth when the benchmark is missing', () => {
    const breadth = summariseBreadth([sector('a', { score: 70 }), sector('b', { score: 70 })]);
    assert.equal(marketVerdict(breadth, []).score, 70);
});

// --- Full map over a stubbed Yahoo -----------------------------------------

const RISING = Array.from({ length: 260 }, (_, i) => 100 * 1.002 ** i);
const FALLING = Array.from({ length: 260 }, (_, i) => 300 * 0.998 ** i);

function stubChart({ failing = [] } = {}) {
    let calls = 0;
    globalThis.fetch = async (url) => {
        calls += 1;
        const href = String(url);
        const symbol = decodeURIComponent(href.split('/chart/')[1].split('?')[0]);
        if (failing.includes(symbol)) {
            return { ok: true, status: 200, text: async () => JSON.stringify({ chart: { result: null, error: null } }) };
        }
        // Half the sectors fall so breadth is genuinely mixed.
        const closes = symbol.charCodeAt(symbol.length - 1) % 2 === 0 ? RISING : FALLING;
        return {
            ok: true,
            status: 200,
            text: async () =>
                JSON.stringify({
                    chart: {
                        result: [
                            {
                                meta: { symbol, currency: 'USD', regularMarketPrice: closes.at(-1) },
                                timestamp: closes.map((_, i) => 1704067200 + i * 86400),
                                indicators: { quote: [{ close: closes, volume: closes.map(() => 1e6) }] }
                            }
                        ]
                    }
                })
        };
    };
    return () => calls;
}

test('fetchMarketMap scores every index and sector', async () => {
    stubChart();
    const map = await fetchMarketMap({ force: true });

    assert.equal(map.indices.length, INDICES.length);
    assert.equal(map.sectors.length, SECTORS.length);
    assert.ok(map.breadth);
    assert.ok(Number.isFinite(map.verdict.score));
    assert.equal(map.failures.length, 0);
});

test('sectors come back ranked strongest first', async () => {
    stubChart();
    const { sectors } = await fetchMarketMap({ force: true });

    const scores = sectors.map((entry) => entry.score);
    const sorted = [...scores].sort((a, b) => b - a);
    assert.deepEqual(scores, sorted);
});

test('the VIX is reported as a level and kept out of the scoring', async () => {
    stubChart();
    const map = await fetchMarketMap({ force: true });

    assert.equal(map.vix.role, 'volatility');
    assert.equal(map.vix.score, null);
    assert.equal(map.vix.overall, null);
    assert.ok(Number.isFinite(map.vix.price));
    // Breadth is drawn from sectors only, so the VIX cannot skew it.
    assert.equal(map.breadth.total, SECTORS.length);
});

test('a failed instrument is reported without sinking the whole map', async () => {
    stubChart({ failing: ['XLE', '^DJI'] });
    const map = await fetchMarketMap({ force: true });

    assert.equal(map.failures.length, 2);
    assert.ok(map.breadth.total < SECTORS.length);
    assert.ok(Number.isFinite(map.verdict.score));
    assert.equal(map.sectors.find((entry) => entry.symbol === 'XLE').ok, false);
});

test('results are cached until forced', async () => {
    const countCalls = stubChart();
    await fetchMarketMap({ force: true });
    const afterFirst = countCalls();

    await fetchMarketMap();
    assert.equal(countCalls(), afterFirst, 'second call should be served from cache');

    await fetchMarketMap({ force: true });
    assert.ok(countCalls() > afterFirst, 'force should bypass the cache');
});

test('fallbackMarketNarration describes breadth without an API key', async () => {
    stubChart();
    const map = await fetchMarketMap({ force: true });
    const text = fallbackMarketNarration(map);

    assert.ok(text.includes(map.verdict.verdict));
    assert.ok(text.includes('סקטורים'));
    assert.ok(text.includes('אינה המלצת השקעה'));
});
