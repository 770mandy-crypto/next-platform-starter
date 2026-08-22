// Verifies the Yahoo response parsers against realistic payload shapes without
// touching the network. Run with: node --test lib/yahoo.test.mjs
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { YahooError, fetchFundamentals, fetchPriceHistory, normaliseSymbol, resetCrumbCache } from './yahoo.js';
import { buildReport } from './analysis.js';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
    // Module-level crumb state would otherwise carry into the next test and
    // skip the handshake being exercised.
    resetCrumbCache();
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

// --- Cookie + crumb handshake ---------------------------------------------
//
// This is the flow that failed in production. Each test drives fetch through a
// scripted sequence of responses so the handshake can be exercised offline.

// Routes by path, not by substring: the crumb URL is itself on
// query1.finance.yahoo.com, so host matching would misroute it to the cookie
// handler.
function scriptFetch({ cookie, crumb, summary }) {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        const href = String(url);
        calls.push({ url: href, redirect: options.redirect, cookie: options.headers?.Cookie });

        let response;
        if (href.includes('/v1/test/getcrumb')) response = crumb?.(calls.length);
        else if (href.includes('/v10/finance/quoteSummary')) response = summary?.(calls.length);
        else response = cookie?.(href);

        if (!response) throw new Error(`unscripted fetch: ${href}`);
        return {
            ok: (response.status ?? 200) >= 200 && (response.status ?? 200) < 300,
            status: response.status ?? 200,
            headers: {
                get: (name) =>
                    name.toLowerCase() === 'set-cookie' ? (response.setCookie || []).join(', ') || null : null,
                getSetCookie: () => response.setCookie || []
            },
            text: async () => (typeof response.body === 'string' ? response.body : JSON.stringify(response.body))
        };
    };
    return calls;
}

const SUMMARY_BODY = {
    quoteSummary: {
        result: [
            {
                price: { longName: 'Test Corp' },
                assetProfile: { sector: 'Technology' },
                summaryDetail: { trailingPE: { raw: 20 }, dividendYield: { raw: 0.012 } },
                defaultKeyStatistics: {},
                financialData: { profitMargins: { raw: 0.2 }, revenueGrowth: { raw: 0.1 } }
            }
        ]
    }
};

test('the cookie request must not follow redirects', async () => {
    // fc.yahoo.com answers 302 and carries Set-Cookie on the redirect itself.
    // Following it would hand back the final response's headers and lose the
    // cookie — which is exactly how fundamentals broke in production.
    const calls = scriptFetch({
        cookie: () => ({ status: 302, setCookie: ['A1=abc; Path=/; Expires=Thu, 01 Jan 2027'] }),
        crumb: () => ({ body: 'crumb123' }),
        summary: () => ({ body: SUMMARY_BODY })
    });

    const fundamentals = await fetchFundamentals('TEST');

    assert.equal(calls[0].redirect, 'manual');
    assert.equal(fundamentals.name, 'Test Corp');
    // The Expires comma must not split the cookie into two.
    assert.equal(calls[1].cookie, 'A1=abc');
});

test('multiple Set-Cookie headers are all forwarded', async () => {
    const calls = scriptFetch({
        cookie: () => ({ status: 302, setCookie: ['A1=one; Path=/', 'A3=two; Path=/'] }),
        crumb: () => ({ body: 'crumb123' }),
        summary: () => ({ body: SUMMARY_BODY })
    });

    await fetchFundamentals('TEST');
    assert.equal(calls[1].cookie, 'A1=one; A3=two');
});

test('a cookie host with no Set-Cookie falls through to the next host', async () => {
    const calls = scriptFetch({
        // Only the second host hands back a cookie.
        cookie: (href) =>
            href.includes('fc.yahoo.com') ? { status: 404 } : { status: 302, setCookie: ['A1=fallback; Path=/'] },
        crumb: () => ({ body: 'crumb123' }),
        summary: () => ({ body: SUMMARY_BODY })
    });

    const fundamentals = await fetchFundamentals('TEST');
    assert.equal(fundamentals.name, 'Test Corp');
    assert.ok(calls.some((call) => call.url.includes('finance.yahoo.com')));
});

test('an HTML body from the crumb endpoint is rejected despite a 200', async () => {
    scriptFetch({
        cookie: () => ({ status: 302, setCookie: ['A1=abc'] }),
        crumb: () => ({ status: 200, body: '<!DOCTYPE html><html>error</html>' })
    });

    await assert.rejects(fetchFundamentals('TEST'), (error) => {
        assert.equal(error.step, 'crumb');
        return true;
    });
});

test('a stale crumb is retried once against a fresh one', async () => {
    let summaryCalls = 0;
    scriptFetch({
        cookie: () => ({ status: 302, setCookie: ['A1=abc'] }),
        crumb: () => ({ body: 'crumb123' }),
        summary: () => {
            summaryCalls += 1;
            return summaryCalls === 1 ? { status: 401, body: 'Unauthorized' } : { body: SUMMARY_BODY };
        }
    });

    const fundamentals = await fetchFundamentals('TEST');
    assert.equal(summaryCalls, 2);
    assert.equal(fundamentals.name, 'Test Corp');
});

test('a total cookie failure reports the step so the UI can show it', async () => {
    scriptFetch({ cookie: () => ({ status: 404 }) });

    await assert.rejects(fetchFundamentals('TEST'), (error) => {
        assert.ok(error instanceof YahooError);
        assert.equal(error.step, 'cookie');
        assert.match(error.message, /No session cookie/);
        return true;
    });
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
