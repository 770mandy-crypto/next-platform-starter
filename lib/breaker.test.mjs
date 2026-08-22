// Regression tests for the provider circuit breakers.
//
// These exist because the original bug was invisible to the earlier tests: they
// pointed Yahoo at a dead local port, which refuses instantly. A *blocked*
// Yahoo does not refuse — it hangs until the request times out, and paying that
// wait per symbol overran the serverless function budget so the whole request
// died instead of quietly using the fallback. Every test here models a slow
// failure, not a fast one.
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { fetchHistory, priceBreakerState, resetPriceBreaker } from './prices.js';
import { fetchCompanyFundamentals, providerOrder, resetFundamentalsBreaker } from './fundamentals.js';

const realFetch = globalThis.fetch;
const realKey = process.env.FINNHUB_API_KEY;

afterEach(() => {
    globalThis.fetch = realFetch;
    resetPriceBreaker();
    resetFundamentalsBreaker();
    if (realKey === undefined) delete process.env.FINNHUB_API_KEY;
    else process.env.FINNHUB_API_KEY = realKey;
});

const CSV = (() => {
    const rows = ['Date,Open,High,Low,Close,Volume'];
    for (let i = 0; i < 300; i++) {
        const close = (100 * 1.002 ** i).toFixed(2);
        const day = new Date(Date.UTC(2024, 0, 1) + i * 86400000).toISOString().slice(0, 10);
        rows.push(`${day},${close},${close},${close},${close},1000000`);
    }
    return rows.join('\n');
})();

// Models a blocked host: never resolves on its own, only aborts on the signal.
function hangingResponse(signal) {
    return new Promise((_, reject) => {
        if (signal?.aborted) return reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
}

function stubSlowYahoo() {
    const timeline = [];
    globalThis.fetch = async (url, options = {}) => {
        const href = String(url);
        if (href.includes('stooq')) {
            timeline.push('stooq');
            return { ok: true, status: 200, text: async () => CSV };
        }
        timeline.push('yahoo');
        return hangingResponse(options.signal);
    };
    return timeline;
}

test('a hanging Yahoo still yields prices, via the fallback', async () => {
    process.env.YAHOO_TIMEOUT_MS = '150';
    const timeline = stubSlowYahoo();

    const history = await fetchHistory('AAPL');
    assert.equal(history.provider, 'stooq');
    assert.deepEqual(timeline, ['yahoo', 'stooq']);
    delete process.env.YAHOO_TIMEOUT_MS;
});

test('after one hang, later requests skip Yahoo entirely', async () => {
    process.env.YAHOO_TIMEOUT_MS = '150';
    const timeline = stubSlowYahoo();

    await fetchHistory('AAPL');
    assert.equal(priceBreakerState().yahooTripped, true);

    timeline.length = 0;
    await fetchHistory('MSFT');
    await fetchHistory('NVDA');

    // This is the whole point: a market map of seventeen symbols must not pay
    // the Yahoo timeout seventeen times.
    assert.deepEqual(timeline, ['stooq', 'stooq'], 'Yahoo should not be retried while tripped');
    delete process.env.YAHOO_TIMEOUT_MS;
});

test('a scan-sized batch costs at most one Yahoo timeout in total', async () => {
    process.env.YAHOO_TIMEOUT_MS = '150';
    const timeline = stubSlowYahoo();

    const symbols = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'V', 'HD', 'KO', 'PG'];
    for (const symbol of symbols) await fetchHistory(symbol);

    const yahooAttempts = timeline.filter((entry) => entry === 'yahoo').length;
    assert.equal(yahooAttempts, 1, `expected one Yahoo attempt across the batch, got ${yahooAttempts}`);
    assert.equal(timeline.filter((entry) => entry === 'stooq').length, symbols.length);
    delete process.env.YAHOO_TIMEOUT_MS;
});

test('a missing symbol does not trip the breaker', async () => {
    globalThis.fetch = async (url) => {
        const href = String(url);
        if (href.includes('stooq')) return { ok: true, status: 200, text: async () => 'Date,Open\n' };
        return { ok: true, status: 200, text: async () => JSON.stringify({ chart: { result: null } }) };
    };

    await assert.rejects(fetchHistory('NOSUCHTICKER'));
    // Yahoo answered promptly and correctly; it is reachable, just asked about
    // a symbol that does not exist.
    assert.equal(priceBreakerState().yahooTripped, false);
});

test('a successful Yahoo call clears a tripped breaker', async () => {
    process.env.YAHOO_TIMEOUT_MS = '150';
    stubSlowYahoo();
    await fetchHistory('AAPL');
    assert.equal(priceBreakerState().yahooTripped, true);

    resetPriceBreaker(); // stand in for the cooldown elapsing
    const closes = Array.from({ length: 260 }, (_, i) => 100 * 1.002 ** i);
    globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        text: async () =>
            JSON.stringify({
                chart: {
                    result: [
                        {
                            meta: { symbol: 'AAPL', currency: 'USD', regularMarketPrice: closes.at(-1) },
                            timestamp: closes.map((_, i) => 1704067200 + i * 86400),
                            indicators: { quote: [{ close: closes, volume: closes.map(() => 1e6) }] }
                        }
                    ]
                }
            })
    });

    const history = await fetchHistory('AAPL');
    assert.equal(history.provider, 'yahoo');
    assert.equal(priceBreakerState().yahooTripped, false);
    delete process.env.YAHOO_TIMEOUT_MS;
});

test('an explicit provider preference bypasses the breaker', async () => {
    process.env.YAHOO_TIMEOUT_MS = '150';
    stubSlowYahoo();
    await fetchHistory('AAPL');
    assert.equal(priceBreakerState().yahooTripped, true);

    // Pinning is a deliberate override — it must still reach Yahoo, which is
    // what makes the diagnostics page able to probe a tripped provider.
    const timeline = stubSlowYahoo();
    await assert.rejects(fetchHistory('AAPL', { preferred: 'yahoo' }));
    assert.ok(timeline.includes('yahoo'));
    delete process.env.YAHOO_TIMEOUT_MS;
});

test('an untripped Yahoo is the whole chain when no key is configured', () => {
    delete process.env.FINNHUB_API_KEY;
    resetFundamentalsBreaker();
    assert.deepEqual(providerOrder(), ['yahoo']);
});

test('a tripped Yahoo empties the chain rather than paying the handshake again', async () => {
    delete process.env.FINNHUB_API_KEY;
    process.env.YAHOO_TIMEOUT_MS = '150';
    resetFundamentalsBreaker();

    globalThis.fetch = async (url, options = {}) => hangingResponse(options.signal);

    // First call trips the breaker.
    await assert.rejects(fetchCompanyFundamentals('AAPL'));
    assert.deepEqual(providerOrder(), []);

    // Second call must return immediately rather than repeating a handshake
    // that spans three hosts — that cost is what overran the function budget.
    const started = Date.now();
    await assert.rejects(fetchCompanyFundamentals('MSFT'), (error) => {
        assert.equal(error.unconfigured, true);
        assert.match(error.message, /skipped/i);
        return true;
    });
    assert.ok(Date.now() - started < 100, 'a skipped provider must not cost a network wait');
    delete process.env.YAHOO_TIMEOUT_MS;
});
