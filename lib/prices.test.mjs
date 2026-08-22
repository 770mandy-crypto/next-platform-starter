// Offline verification of the Stooq provider and the fallback chain.
// Run with npm test.
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { fetchStooqHistory, toStooqSymbol } from './providers/stooq.js';
import { fetchHistory, resetPriceBreaker } from './prices.js';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
    // The breaker is module state and would otherwise carry a tripped Yahoo
    // into the next test.
    resetPriceBreaker();
});

function csv(rows) {
    return ['Date,Open,High,Low,Close,Volume', ...rows].join('\n');
}

const YEAR = Array.from({ length: 300 }, (_, i) => {
    const close = (100 * 1.002 ** i).toFixed(2);
    const day = new Date(Date.UTC(2024, 0, 1) + i * 86400000).toISOString().slice(0, 10);
    return `${day},${close},${close},${close},${close},1000000`;
});

function stubText(body, { status = 200 } = {}) {
    const calls = [];
    globalThis.fetch = async (url) => {
        calls.push(String(url));
        return { ok: status >= 200 && status < 300, status, text: async () => body };
    };
    return calls;
}

test('toStooqSymbol maps plain tickers and known indices', () => {
    assert.equal(toStooqSymbol('AAPL'), 'aapl.us');
    assert.equal(toStooqSymbol('xlk'), 'xlk.us');
    assert.equal(toStooqSymbol('^GSPC'), '^spx');
    assert.equal(toStooqSymbol('^IXIC'), '^ndq');
    assert.equal(toStooqSymbol('^VIX'), '^vix');
});

test('toStooqSymbol declines symbols it has no mapping for', () => {
    // Guessing an equivalent would silently return the wrong instrument.
    assert.equal(toStooqSymbol('TEVA.TA'), null);
    assert.equal(toStooqSymbol('^TA125.TA'), null);
    assert.equal(toStooqSymbol('^UNKNOWN'), null);
});

test('fetchStooqHistory parses the CSV into candles', async () => {
    const calls = stubText(csv(YEAR));
    const history = await fetchStooqHistory('AAPL');

    assert.ok(calls[0].includes('s=aapl.us'));
    assert.equal(history.candles.length, 260); // trimmed to the trailing year
    assert.equal(history.symbol, 'AAPL');
    assert.ok(Number.isFinite(history.price));
    assert.equal(history.price, history.candles.at(-1).close);
    assert.ok(history.fiftyTwoWeekHigh >= history.fiftyTwoWeekLow);
});

test('fetchStooqHistory skips rows with unparseable closes', async () => {
    const withGaps = [...YEAR];
    withGaps[5] = '2024-01-06,N/A,N/A,N/A,N/A,N/A';
    withGaps[6] = '2024-01-07,N/A,N/A,N/A,N/A,N/A';
    stubText(csv(withGaps));

    const history = await fetchStooqHistory('AAPL');
    assert.ok(history.candles.every((candle) => Number.isFinite(candle.close)));
});

test('fetchStooqHistory rejects an HTML body rather than parsing it', async () => {
    stubText('<!DOCTYPE html><html>blocked</html>');
    await assert.rejects(fetchStooqHistory('AAPL'), (error) => {
        assert.equal(error.status, 502);
        return true;
    });
});

test('fetchStooqHistory rejects a series too short to analyse', async () => {
    stubText(csv(YEAR.slice(0, 10)));
    await assert.rejects(fetchStooqHistory('AAPL'), (error) => {
        assert.equal(error.status, 422);
        return true;
    });
});

test('fetchStooqHistory rejects an unmapped symbol without a request', async () => {
    const calls = stubText(csv(YEAR));
    await assert.rejects(fetchStooqHistory('TEVA.TA'), (error) => {
        assert.equal(error.status, 404);
        return true;
    });
    assert.equal(calls.length, 0, 'should not call out for a symbol it cannot map');
});

// --- Fallback chain --------------------------------------------------------

function stubProviders({ yahoo, stooq }) {
    const seen = [];
    globalThis.fetch = async (url) => {
        const href = String(url);
        const which = href.includes('stooq') ? 'stooq' : 'yahoo';
        seen.push(which);
        const handler = which === 'stooq' ? stooq : yahoo;
        return handler();
    };
    return seen;
}

function yahooOk() {
    const closes = Array.from({ length: 260 }, (_, i) => 100 * 1.002 ** i);
    return {
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
    };
}

const yahooBlocked = () => ({ ok: false, status: 403, text: async () => 'Forbidden' });
const stooqOk = () => ({ ok: true, status: 200, text: async () => csv(YEAR) });

test('fetchHistory prefers Yahoo when it answers', async () => {
    const seen = stubProviders({ yahoo: yahooOk, stooq: stooqOk });
    const history = await fetchHistory('AAPL');

    assert.equal(history.provider, 'yahoo');
    assert.equal(history.currency, 'USD'); // metadata Stooq cannot supply
    assert.deepEqual(seen, ['yahoo'], 'Stooq should not be called when Yahoo works');
});

test('fetchHistory falls back to Stooq when Yahoo is blocked', async () => {
    const seen = stubProviders({ yahoo: yahooBlocked, stooq: stooqOk });
    const history = await fetchHistory('AAPL');

    assert.equal(history.provider, 'stooq');
    assert.ok(history.candles.length >= 30);
    assert.deepEqual(seen, ['yahoo', 'stooq']);
    assert.equal(history.attempts[0].provider, 'yahoo');
});

test('fetchHistory reports a 502 when every provider refuses', async () => {
    stubProviders({ yahoo: yahooBlocked, stooq: () => ({ ok: false, status: 403, text: async () => 'no' }) });

    await assert.rejects(fetchHistory('AAPL'), (error) => {
        assert.equal(error.status, 502);
        assert.equal(error.attempts.length, 2);
        // Both reasons must survive — that is what makes production debuggable.
        assert.match(error.message, /yahoo/);
        assert.match(error.message, /stooq/);
        return true;
    });
});

test('a symbol missing everywhere reports 404, not a provider outage', async () => {
    stubProviders({
        yahoo: () => ({ ok: true, status: 200, text: async () => JSON.stringify({ chart: { result: null } }) }),
        stooq: () => ({ ok: true, status: 200, text: async () => csv([]) })
    });

    await assert.rejects(fetchHistory('NOPE'), (error) => {
        assert.equal(error.status, 404);
        return true;
    });
});

test('PRICE_PROVIDER pins a single provider', async () => {
    const seen = stubProviders({ yahoo: yahooOk, stooq: stooqOk });
    const history = await fetchHistory('AAPL', { preferred: 'stooq' });

    assert.equal(history.provider, 'stooq');
    assert.deepEqual(seen, ['stooq'], 'a pinned provider must not fall through to Yahoo');
});
