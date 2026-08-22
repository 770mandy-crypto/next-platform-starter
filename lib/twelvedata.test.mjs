// Offline verification of the Twelve Data provider and its place in the chain.
// Run with npm test.
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { fetchTwelveDataHistory, isTwelveDataConfigured, toTwelveDataSymbol } from './providers/twelvedata.js';
import { fetchHistory, providerOrder, resetPriceBreaker } from './prices.js';

const realFetch = globalThis.fetch;
const realKey = process.env.TWELVEDATA_API_KEY;

afterEach(() => {
    globalThis.fetch = realFetch;
    resetPriceBreaker();
    if (realKey === undefined) delete process.env.TWELVEDATA_API_KEY;
    else process.env.TWELVEDATA_API_KEY = realKey;
    delete process.env.PRICE_PROVIDER;
});

// Twelve Data returns newest first, with every number as a string.
const VALUES = Array.from({ length: 260 }, (_, i) => {
    const close = (100 * 1.002 ** (259 - i)).toFixed(2);
    const day = new Date(Date.UTC(2024, 0, 1) + (259 - i) * 86400000).toISOString().slice(0, 10);
    return { datetime: day, open: close, high: close, low: close, close, volume: '1000000' };
});

function stubTwelveData(body, { status = 200 } = {}) {
    const calls = [];
    globalThis.fetch = async (url) => {
        calls.push(String(url));
        return { ok: status < 400, status, json: async () => body };
    };
    return calls;
}

const OK_BODY = { meta: { symbol: 'AAPL', currency: 'USD', exchange: 'NASDAQ', type: 'Common Stock' }, values: VALUES, status: 'ok' };

test('isTwelveDataConfigured reflects the environment', () => {
    delete process.env.TWELVEDATA_API_KEY;
    assert.equal(isTwelveDataConfigured(), false);
    process.env.TWELVEDATA_API_KEY = 'k';
    assert.equal(isTwelveDataConfigured(), true);
});

test('toTwelveDataSymbol maps indices and class shares', () => {
    assert.equal(toTwelveDataSymbol('AAPL'), 'AAPL');
    assert.equal(toTwelveDataSymbol('^GSPC'), 'SPX');
    assert.equal(toTwelveDataSymbol('^VIX'), 'VIX');
    // Class shares use a dot here where Yahoo and Stooq use a dash.
    assert.equal(toTwelveDataSymbol('BRK-B'), 'BRK.B');
    // An unmapped index would silently resolve to something else.
    assert.equal(toTwelveDataSymbol('^TA125.TA'), null);
});

test('history is reversed into oldest-first order', async () => {
    process.env.TWELVEDATA_API_KEY = 'k';
    stubTwelveData(OK_BODY);
    const history = await fetchTwelveDataHistory('AAPL');

    assert.equal(history.candles.length, 260);
    // The provider sends newest first; the indicators need the opposite.
    assert.ok(history.candles[0].date < history.candles.at(-1).date);
    assert.equal(history.price, history.candles.at(-1).close);
    assert.equal(history.currency, 'USD');
    assert.equal(history.exchange, 'NASDAQ');
});

test('string numbers are parsed rather than concatenated', async () => {
    process.env.TWELVEDATA_API_KEY = 'k';
    stubTwelveData(OK_BODY);
    const history = await fetchTwelveDataHistory('AAPL');

    for (const candle of history.candles.slice(0, 5)) {
        assert.equal(typeof candle.close, 'number');
        assert.ok(Number.isFinite(candle.close));
    }
});

test('the key is sent and the symbol is mapped in the request', async () => {
    process.env.TWELVEDATA_API_KEY = 'secret';
    const calls = stubTwelveData(OK_BODY);
    await fetchTwelveDataHistory('^GSPC');

    assert.ok(calls[0].includes('symbol=SPX'));
    assert.ok(calls[0].includes('apikey=secret'));
});

// Twelve Data reports failures as HTTP 200 with status:"error" in the body,
// so each of these would otherwise be parsed as a successful empty response.
test('a rejected key is surfaced despite an HTTP 200', async () => {
    process.env.TWELVEDATA_API_KEY = 'bad';
    stubTwelveData({ code: 401, message: 'Invalid API key', status: 'error' });

    await assert.rejects(fetchTwelveDataHistory('AAPL'), (error) => {
        assert.equal(error.status, 401);
        assert.match(error.message, /rejected the API key/);
        return true;
    });
});

test('a quota error is surfaced despite an HTTP 200', async () => {
    process.env.TWELVEDATA_API_KEY = 'k';
    stubTwelveData({ code: 429, message: 'You have run out of API credits', status: 'error' });

    await assert.rejects(fetchTwelveDataHistory('AAPL'), (error) => {
        assert.equal(error.status, 429);
        return true;
    });
});

test('an unknown symbol is a 404, not an outage', async () => {
    process.env.TWELVEDATA_API_KEY = 'k';
    stubTwelveData({ code: 404, message: 'symbol not found', status: 'error' });

    await assert.rejects(fetchTwelveDataHistory('NOPE'), (error) => {
        assert.equal(error.status, 404);
        return true;
    });
});

test('too short a series is rejected rather than scored', async () => {
    process.env.TWELVEDATA_API_KEY = 'k';
    stubTwelveData({ ...OK_BODY, values: VALUES.slice(0, 10) });

    await assert.rejects(fetchTwelveDataHistory('AAPL'), (error) => {
        assert.equal(error.status, 422);
        return true;
    });
});

test('no key means no request is made', async () => {
    delete process.env.TWELVEDATA_API_KEY;
    const calls = stubTwelveData(OK_BODY);
    await assert.rejects(fetchTwelveDataHistory('AAPL'));
    assert.equal(calls.length, 0);
});

// --- Chain ordering --------------------------------------------------------

test('a configured Twelve Data leads the chain', () => {
    process.env.TWELVEDATA_API_KEY = 'k';
    resetPriceBreaker();
    // It is the only provider expected to survive a datacenter IP, so it must
    // be tried before the two that /diag showed failing there.
    assert.deepEqual(providerOrder(), ['twelvedata', 'yahoo', 'stooq']);
});

test('without a key the chain is unchanged from before', () => {
    delete process.env.TWELVEDATA_API_KEY;
    resetPriceBreaker();
    assert.deepEqual(providerOrder(), ['yahoo', 'stooq']);
});

test('Twelve Data serves the report when the keyless providers fail', async () => {
    process.env.TWELVEDATA_API_KEY = 'k';
    const seen = [];
    globalThis.fetch = async (url) => {
        const href = String(url);
        if (href.includes('twelvedata')) {
            seen.push('twelvedata');
            return { ok: true, status: 200, json: async () => OK_BODY };
        }
        seen.push('other');
        return { ok: false, status: 429, text: async () => 'Too Many Requests' };
    };

    const history = await fetchHistory('AAPL');
    assert.equal(history.provider, 'twelvedata');
    assert.deepEqual(seen, ['twelvedata'], 'a working leader must not fall through');
});

test('the failure names an unconfigured provider distinctly from an unreachable one', async () => {
    delete process.env.TWELVEDATA_API_KEY;
    resetPriceBreaker();
    globalThis.fetch = async () => ({ ok: false, status: 429, text: async () => 'Too Many Requests', json: async () => ({}) });

    await assert.rejects(fetchHistory('AAPL'), (error) => {
        // "not configured" and "unreachable" call for different fixes, so the
        // message has to tell them apart.
        assert.match(error.message, /twelvedata: skipped \(no TWELVEDATA_API_KEY\)/);
        return true;
    });
});
