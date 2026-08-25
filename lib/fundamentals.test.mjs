// Offline verification of the Finnhub provider and the fundamentals chain.
// Run with npm test.
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { fetchFinnhubFundamentals, isFinnhubConfigured } from './providers/finnhub.js';
import { fetchCompanyFundamentals, providerOrder } from './fundamentals.js';
import { analyseFundamentals } from './analysis.js';

const realFetch = globalThis.fetch;
const realKey = process.env.FINNHUB_API_KEY;

afterEach(() => {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.FINNHUB_API_KEY;
    else process.env.FINNHUB_API_KEY = realKey;
    delete process.env.FUNDAMENTALS_PROVIDER;
});

// Values as Finnhub actually reports them: margins, growth and ROE already in
// percent, debt-to-equity as a bare ratio, market cap in millions.
const METRIC = {
    peTTM: 32.4,
    pbQuarterly: 46.2,
    beta: 1.24,
    dividendYieldIndicatedAnnual: 0.44,
    payoutRatioTTM: 15.2,
    netProfitMarginTTM: 25.3,
    operatingMarginTTM: 30.1,
    roeTTM: 147.25,
    revenueGrowthTTMYoy: 8.1,
    epsGrowthTTMYoy: 12.4,
    'totalDebt/totalEquityQuarterly': 1.45,
    currentRatioQuarterly: 0.99
};

const PROFILE = { name: 'Apple Inc', finnhubIndustry: 'Technology', country: 'US', marketCapitalization: 3_400_000 };

const RECOMMENDATIONS = [{ strongBuy: 20, buy: 15, hold: 5, sell: 1, strongSell: 0, period: '2026-08-01' }];

function stubFinnhub({ metric = METRIC, profile = PROFILE, recommendation = RECOMMENDATIONS, status = 200 } = {}) {
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        const href = String(url);
        calls.push({ href, token: options.headers?.['X-Finnhub-Token'] });
        const body = href.includes('/stock/metric')
            ? { metric }
            : href.includes('/stock/profile2')
              ? profile
              : recommendation;
        return { ok: status < 400, status, json: async () => body };
    };
    return calls;
}

test('isFinnhubConfigured reflects the environment', () => {
    delete process.env.FINNHUB_API_KEY;
    assert.equal(isFinnhubConfigured(), false);
    process.env.FINNHUB_API_KEY = 'test-key';
    assert.equal(isFinnhubConfigured(), true);
});

test('the API key travels in a header, never in the URL', async () => {
    process.env.FINNHUB_API_KEY = 'secret-key';
    const calls = stubFinnhub();
    await fetchFinnhubFundamentals('AAPL');

    for (const call of calls) {
        assert.equal(call.token, 'secret-key');
        assert.ok(!call.href.includes('secret-key'), 'the key must not appear in the request URL');
    }
});

test('Finnhub percentages pass through unchanged', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    stubFinnhub();
    const fundamentals = await fetchFinnhubFundamentals('AAPL');

    // These arrive as percentages already — scaling them again would inflate
    // every margin by a hundredfold.
    assert.equal(fundamentals.profitMargin, 25.3);
    assert.equal(fundamentals.returnOnEquity, 147.25);
    assert.equal(fundamentals.revenueGrowth, 8.1);
    assert.equal(fundamentals.earningsGrowth, 12.4);
    assert.equal(fundamentals.dividendYield, 0.44);
});

test('debt-to-equity is converted from a ratio to Yahoo percentage scale', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    stubFinnhub();
    const fundamentals = await fetchFinnhubFundamentals('AAPL');

    // 1.45 as a ratio is 145 on the scale analysis.js thresholds against.
    assert.equal(fundamentals.debtToEquity, 145);
});

test('the converted values score the same as the Yahoo-shaped equivalents', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    stubFinnhub();
    const finnhub = await fetchFinnhubFundamentals('AAPL');

    // The same company expressed the way yahoo.js would emit it.
    const yahooShaped = {
        trailingPE: 32.4,
        forwardPE: null,
        pegRatio: null,
        priceToBook: 46.2,
        profitMargin: 25.3,
        operatingMargin: 30.1,
        returnOnEquity: 147.25,
        revenueGrowth: 8.1,
        earningsGrowth: 12.4,
        debtToEquity: 145,
        currentRatio: 0.99,
        dividendYield: 0.44
    };

    assert.equal(analyseFundamentals(finnhub).score, analyseFundamentals(yahooShaped).score);
});

test('market cap is expanded from millions', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    stubFinnhub();
    const fundamentals = await fetchFinnhubFundamentals('AAPL');
    assert.equal(fundamentals.marketCap, 3.4e12);
});

test('analyst votes collapse into a Yahoo-style recommendation key', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    stubFinnhub();
    const fundamentals = await fetchFinnhubFundamentals('AAPL');

    assert.equal(fundamentals.numberOfAnalysts, 41);
    assert.equal(fundamentals.recommendationKey, 'buy');
});

test('a bearish analyst split maps to sell', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    stubFinnhub({ recommendation: [{ strongBuy: 0, buy: 1, hold: 3, sell: 10, strongSell: 6 }] });
    const fundamentals = await fetchFinnhubFundamentals('AAPL');
    assert.equal(fundamentals.recommendationKey, 'sell');
});

test('an empty recommendation list yields no consensus rather than a fake one', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    stubFinnhub({ recommendation: [] });
    const fundamentals = await fetchFinnhubFundamentals('AAPL');

    assert.equal(fundamentals.recommendationKey, null);
    assert.equal(fundamentals.numberOfAnalysts, null);
});

test('a missing profile does not sink the metrics', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    globalThis.fetch = async (url) => {
        const href = String(url);
        if (href.includes('/stock/profile2')) return { ok: false, status: 500, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => (href.includes('/stock/metric') ? { metric: METRIC } : []) };
    };

    const fundamentals = await fetchFinnhubFundamentals('AAPL');
    assert.equal(fundamentals.name, null);
    assert.equal(fundamentals.profitMargin, 25.3);
});

test('an empty metric object is a 404, not an all-null report', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    stubFinnhub({ metric: {} });

    await assert.rejects(fetchFinnhubFundamentals('NOPE'), (error) => {
        assert.equal(error.status, 404);
        return true;
    });
});

test('a rejected key is reported distinctly from a rate limit', async () => {
    process.env.FINNHUB_API_KEY = 'bad';
    stubFinnhub({ status: 401 });
    await assert.rejects(fetchFinnhubFundamentals('AAPL'), (error) => {
        assert.match(error.message, /rejected the API key/);
        return true;
    });

    stubFinnhub({ status: 429 });
    await assert.rejects(fetchFinnhubFundamentals('AAPL'), (error) => {
        assert.match(error.message, /rate limit/);
        return true;
    });
});

test('fetchFinnhubFundamentals refuses to call out without a key', async () => {
    delete process.env.FINNHUB_API_KEY;
    const calls = stubFinnhub();
    await assert.rejects(fetchFinnhubFundamentals('AAPL'), (error) => {
        assert.equal(error.step, 'config');
        return true;
    });
    assert.equal(calls.length, 0);
});

// --- Provider ordering -----------------------------------------------------

test('Finnhub leads when configured, so a blocked Yahoo costs no delay', () => {
    process.env.FINNHUB_API_KEY = 'k';
    assert.deepEqual(providerOrder(), ['finnhub', 'yahoo']);
});

test('without a key the chain is Yahoo alone', () => {
    delete process.env.FINNHUB_API_KEY;
    assert.deepEqual(providerOrder(), ['yahoo']);
});

test('FUNDAMENTALS_PROVIDER pins a single provider', () => {
    process.env.FINNHUB_API_KEY = 'k';
    assert.deepEqual(providerOrder({ preferred: 'yahoo' }), ['yahoo']);
    assert.deepEqual(providerOrder({ preferred: 'finnhub' }), ['finnhub']);
});

test('fetchCompanyFundamentals tags the serving provider', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    stubFinnhub();
    const fundamentals = await fetchCompanyFundamentals('AAPL');

    assert.equal(fundamentals.provider, 'finnhub');
    assert.equal(fundamentals.name, 'Apple Inc');
});

test('a total failure without a key is flagged as unconfigured', async () => {
    delete process.env.FINNHUB_API_KEY;
    globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => 'blocked', json: async () => ({}) });

    await assert.rejects(fetchCompanyFundamentals('AAPL'), (error) => {
        assert.equal(error.unconfigured, true);
        assert.ok(error.attempts.length >= 1);
        return true;
    });
});

test('a total failure with a key set is an outage, not a config problem', async () => {
    process.env.FINNHUB_API_KEY = 'k';
    globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => 'boom', json: async () => ({}) });

    await assert.rejects(fetchCompanyFundamentals('AAPL'), (error) => {
        assert.equal(error.unconfigured, false);
        assert.match(error.message, /finnhub/);
        return true;
    });
});
