// The header path is the whole point of this feature, so it is tested at the
// level that matters: a key that exists ONLY on the request must reach the
// provider, and a malformed one must never leave the process.

import test from 'node:test';
import assert from 'node:assert/strict';
import { keysFromRequest, resolveKey, runWithKeys } from './request-key.js';

function req(headers) {
    return { headers: { get: (name) => headers[name] ?? null } };
}

test('a key on the request is visible to the provider', () => {
    runWithKeys({ twelvedata: 'abc123' }, () => {
        assert.equal(resolveKey('twelvedata', undefined), 'abc123');
    });
});

test('the request key wins over the environment', () => {
    // Otherwise a stale server key silently overrides the one the visitor can
    // see and change, and the paste looks like it did nothing.
    runWithKeys({ twelvedata: 'from-request' }, () => {
        assert.equal(resolveKey('twelvedata', 'from-env'), 'from-request');
    });
});

test('the environment still works when no key is on the request', () => {
    assert.equal(resolveKey('twelvedata', 'from-env'), 'from-env');
    runWithKeys({}, () => assert.equal(resolveKey('twelvedata', 'from-env'), 'from-env'));
});

test('resolveKey outside a request does not throw', () => {
    assert.equal(resolveKey('finnhub', undefined), null);
});

test('malformed keys are dropped rather than forwarded', () => {
    const cases = [
        'abc def',            // a paste that caught surrounding text
        'abc&extra=1',        // would smuggle a second query parameter
        'abc\r\nX-Evil: 1',   // would smuggle a header
        '../../etc/passwd',
        'a'.repeat(129),
        ''
    ];
    for (const value of cases) {
        const { twelvedata } = keysFromRequest(req({ 'x-shuki-twelvedata-key': value }));
        assert.equal(twelvedata, null, `expected ${JSON.stringify(value)} to be rejected`);
    }
});

test('surrounding whitespace is trimmed, since copy-paste adds it', () => {
    const { twelvedata } = keysFromRequest(req({ 'x-shuki-twelvedata-key': '  abc123  ' }));
    assert.equal(twelvedata, 'abc123');
});

test('a request without the header yields no keys', () => {
    assert.deepEqual(keysFromRequest(req({})), { twelvedata: null, finnhub: null });
    assert.deepEqual(keysFromRequest(undefined), {});
});
