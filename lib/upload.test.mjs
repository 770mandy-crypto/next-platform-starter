// Offline checks for the screenshot-upload path: the input guards and the
// symbol resolution around the vision call. The Claude call itself is not
// exercised here — what matters is that nothing unsafe reaches a provider and
// that a bad image is rejected before any paid request is made.
import assert from 'node:assert/strict';
import test from 'node:test';

import { ALLOWED_MEDIA_TYPES, ImageInputError, MAX_IMAGE_BYTES, validateImage } from './vision.js';
import { resolveSymbol } from './resolve-symbol.js';
import { toTwelveDataSymbol } from './providers/twelvedata.js';

const TINY_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// --- Input guards ----------------------------------------------------------

test('validateImage accepts every declared media type', () => {
    for (const mediaType of ALLOWED_MEDIA_TYPES) {
        const result = validateImage({ mediaType, data: TINY_PNG_BASE64 });
        assert.equal(result.mediaType, mediaType);
        assert.ok(result.bytes > 0);
    }
});

test('validateImage rejects a non-image media type', () => {
    // A PDF or SVG would be sent to a paid vision call and charged for, so it
    // has to be turned away before the request is made.
    for (const mediaType of ['application/pdf', 'image/svg+xml', 'text/html', undefined]) {
        assert.throws(() => validateImage({ mediaType, data: TINY_PNG_BASE64 }), ImageInputError);
    }
});

test('validateImage rejects an empty or missing payload', () => {
    assert.throws(() => validateImage({ mediaType: 'image/png', data: '' }), ImageInputError);
    assert.throws(() => validateImage({ mediaType: 'image/png' }), ImageInputError);
});

test('validateImage rejects an oversized payload with 413', () => {
    // Base64 carries ~4 chars per 3 bytes, so this clears the cap.
    const huge = 'A'.repeat(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024);
    assert.throws(
        () => validateImage({ mediaType: 'image/png', data: huge }),
        (error) => {
            assert.equal(error.status, 413);
            return true;
        }
    );
});

test('validateImage accepts a payload just under the cap', () => {
    const justUnder = 'A'.repeat(Math.floor((MAX_IMAGE_BYTES * 4) / 3) - 8);
    const result = validateImage({ mediaType: 'image/jpeg', data: justUnder });
    assert.ok(result.bytes <= MAX_IMAGE_BYTES);
});

// --- Symbol resolution -----------------------------------------------------

test('a US ticker passes through unchanged', () => {
    assert.deepEqual(resolveSymbol({ symbol: 'AAPL', market: 'us', confidence: 'high' }), {
        symbol: 'AAPL',
        reason: null
    });
});

test('an Israeli listing regains its exchange suffix', () => {
    // A screenshot shows "TEVA"; only Yahoo's ".TA" form resolves it.
    assert.equal(resolveSymbol({ symbol: 'TEVA', market: 'israel', confidence: 'high' }).symbol, 'TEVA.TA');
    assert.equal(resolveSymbol({ symbol: 'poli', market: 'israel', confidence: 'medium' }).symbol, 'POLI.TA');
});

test('an Israeli ticker that already carries a suffix is not double-suffixed', () => {
    assert.equal(resolveSymbol({ symbol: 'TEVA.TA', market: 'israel', confidence: 'high' }).symbol, 'TEVA.TA');
});

test('screenshot decoration is stripped', () => {
    assert.equal(resolveSymbol({ symbol: 'NASDAQ:NVDA', market: 'us', confidence: 'high' }).symbol, 'NVDA');
    assert.equal(resolveSymbol({ symbol: '$TSLA', market: 'us', confidence: 'high' }).symbol, 'TSLA');
    assert.equal(resolveSymbol({ symbol: '  msft  ', market: 'us', confidence: 'high' }).symbol, 'MSFT');
});

test('a low-confidence read never becomes a report', () => {
    // Showing a confident analysis of the wrong company is worse than showing
    // only the chart reading.
    const result = resolveSymbol({ symbol: 'AAPL', market: 'us', confidence: 'low' });
    assert.equal(result.symbol, null);
    assert.equal(result.reason, 'low-confidence');
});

test('a missing symbol is reported as such', () => {
    assert.equal(resolveSymbol({ symbol: null, market: 'unknown', confidence: 'high' }).reason, 'no-symbol');
    assert.equal(resolveSymbol({ symbol: '   ', market: 'us', confidence: 'high' }).reason, 'no-symbol');
    assert.equal(resolveSymbol({}).reason, 'no-symbol');
});

test('a hallucinated string never reaches a provider', () => {
    for (const symbol of ['not a ticker', '../../etc/passwd', 'A'.repeat(40), 'AAPL; DROP TABLE']) {
        const result = resolveSymbol({ symbol, market: 'us', confidence: 'high' });
        assert.equal(result.symbol, null, `${symbol} should not resolve`);
        assert.equal(result.reason, 'invalid-symbol');
    }
});

// --- Provider coverage for Tel Aviv ----------------------------------------

test('Twelve Data declines a Tel Aviv ticker rather than mis-requesting it', () => {
    // It addresses TASE as SYMBOL:TASE; sending the Yahoo form produced a
    // confusing provider error instead of falling through to Yahoo.
    assert.equal(toTwelveDataSymbol('TEVA.TA'), null);
    assert.equal(toTwelveDataSymbol('teva.ta'), null);
    // US tickers are unaffected.
    assert.equal(toTwelveDataSymbol('TEVA'), 'TEVA');
    assert.equal(toTwelveDataSymbol('BRK-B'), 'BRK.B');
});
