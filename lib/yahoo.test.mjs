// Verifies the Yahoo response parsers against realistic payload shapes without
// touching the network. Run with: node --test lib/yahoo.test.mjs
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { YahooError, fetchPriceHistory, normaliseSymbol } from './yahoo.js';
import { buildReport } from './analysis.js';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

function stubFetch(body, { status = 200 } = {}) {
    globalThis.fetch = async () => ({
        ok: status >= 200 && status < 300,
        status,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
    });
}

// Mirrors the v8/finance/chart shape, including the null padding Yahoo emits
// for halted sessions.
function chartPayload({ closes, withNulls = false } = {}) {
    const timestamps = closes.map((_, i) => 1704067200 + i * 86400);
    const close = [...closes];
    if (withNulls) {
        close[5] = null;
        close[6] = null;
    }
    return {
        chart: {
            result: [
                {
                    meta: {
                        symbol: 'TEST',
                        currency: 'USD',
                        fullExchangeName: 'NasdaqGS',
                        instrumentType: 'EQUITY',
                        regularMarketPrice: closes[closes.length - 1],
                        chartPreviousClose: closes[closes.length - 2],
                        fiftyTwoWeekHigh: Math.max(...closes),
                        fiftyTwoWeekLow: Math.min(...closes)
                    },
                    timestamp: timestamps,
                    indicators: {
                        quote: [{ close, volume: closes.map(() => 1_000_000) }],
                        adjclose: [{ adjclose: close }]
                    }
                }
            ],
            error: null
        }
    };
}

const CLOSES = Array.from({ length: 260 }, (_, i) => 100 * 1.002 ** i);

test('normaliseSymbol accepts real ticker shapes and rejects junk', () => {
    assert.equal(normaliseSymbol('aapl'), 'AAPL');
    assert.equal(normaliseSymbol('  msft '), 'MSFT');
    assert.equal(normaliseSymbol('BRK.B'), 'BRK.B');
    assert.equal(normaliseSymbol('TEVA.TA'), 'TEVA.TA');
    assert.equal(normaliseSymbol('^GSPC'), '^GSPC');

    assert.equal(normaliseSymbol(''), null);
    assert.equal(normaliseSymbol('   '), null);
    assert.equal(normaliseSymbol(null), null);
    assert.equal(normaliseSymbol('AAPL; DROP TABLE'), null);
    assert.equal(normaliseSymbol('../../etc/passwd'), null);
    assert.equal(normaliseSymbol('A'.repeat(40)), null);
});

test('fetchPriceHistory maps a chart payload into candles and meta', async () => {
    stubFetch(chartPayload({ closes: CLOSES }));
    const history = await fetchPriceHistory('TEST');

    assert.equal(history.symbol, 'TEST');
    assert.equal(history.currency, 'USD');
    assert.equal(history.exchange, 'NasdaqGS');
    assert.equal(history.candles.length, CLOSES.length);
    assert.equal(history.candles[0].date, '2024-01-01');
    assert.ok(Math.abs(history.price - CLOSES[CLOSES.length - 1]) < 1e-9);
});

test('fetchPriceHistory drops null closes rather than carrying stale prices', async () => {
    stubFetch(chartPayload({ closes: CLOSES, withNulls: true }));
    const history = await fetchPriceHistory('TEST');

    assert.equal(history.candles.length, CLOSES.length - 2);
    assert.ok(history.candles.every((candle) => Number.isFinite(candle.close)));
});

test('fetchPriceHistory rejects an unknown symbol as a 404 YahooError', async () => {
    stubFetch({ chart: { result: null, error: { description: 'No data found, symbol may be delisted' } } });

    await assert.rejects(fetchPriceHistory('NOPE'), (error) => {
        assert.ok(error instanceof YahooError);
        assert.equal(error.status, 404);
        return true;
    });
});

test('fetchPriceHistory rejects a series too short to analyse', async () => {
    stubFetch(chartPayload({ closes: CLOSES.slice(0, 10) }));

    await assert.rejects(fetchPriceHistory('TEST'), (error) => {
        assert.equal(error.status, 422);
        return true;
    });
});

test('fetchPriceHistory surfaces an upstream HTTP failure', async () => {
    stubFetch('gateway timeout', { status: 503 });
    await assert.rejects(fetchPriceHistory('TEST'), YahooError);
});

test('buildReport survives missing fundamentals and still scores', async () => {
    stubFetch(chartPayload({ closes: CLOSES }));
    const history = await fetchPriceHistory('TEST');

    const report = buildReport({
        history,
        fundamentals: null,
        fundamentalsError: 'unavailable'
    });

    assert.equal(report.fundamental, null);
    assert.equal(report.fundamentalsError, 'unavailable');
    assert.ok(Number.isFinite(report.overall.score));
    assert.equal(report.overall.score, report.technical.score); // no fundamentals to blend
    assert.ok(report.sparkline.length <= 81);
    assert.equal(report.analystConsensus, null);
});

test('buildReport blends both sides and exposes analyst consensus', async () => {
    stubFetch(chartPayload({ closes: CLOSES }));
    const history = await fetchPriceHistory('TEST');

    const report = buildReport({
        history,
        fundamentals: {
            name: 'Test Corp',
            sector: 'Technology',
            trailingPE: 20,
            pegRatio: 1.1,
            revenueGrowth: 12,
            earningsGrowth: 15,
            profitMargin: 18,
            returnOnEquity: 22,
            debtToEquity: 60,
            currentRatio: 1.8,
            dividendYield: 0.8,
            priceToBook: 5,
            recommendationKey: 'buy',
            numberOfAnalysts: 42,
            targetMeanPrice: history.price * 1.2
        }
    });

    assert.equal(report.name, 'Test Corp');
    assert.ok(Number.isFinite(report.fundamental.score));
    assert.notEqual(report.overall.score, report.technical.score);
    assert.equal(report.analystConsensus.recommendation, 'buy');
    assert.ok(Math.abs(report.analystConsensus.upside - 20) < 0.001);
});
