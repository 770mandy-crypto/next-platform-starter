// Per-request API keys, supplied by the browser instead of by the host.
//
// This exists because of a failure that repeated three times: a key added to
// Netlify's environment never reached the function. Scopes that exclude
// Functions, a deploy context that excludes this build, the wrong site — they
// all look identical from outside, and each round of guessing cost a redeploy.
//
// So the key can also travel on the request itself, kept in the visitor's own
// browser. That removes the entire class of failure rather than diagnosing it
// again: nothing to configure, nothing to redeploy, and it works on the first
// try or tells you why immediately.
//
// AsyncLocalStorage rather than threading a parameter through every call: the
// providers sit four layers below the route handler, and a key argument would
// have to be added to every function in between, including ones that have
// nothing to do with keys.

import { AsyncLocalStorage } from 'node:async_hooks';

const store = new AsyncLocalStorage();

// Header names are ours, not the providers'. A visitor's key must never be
// forwarded anywhere except the provider it belongs to.
export const KEY_HEADERS = {
    twelvedata: 'x-shuki-twelvedata-key',
    finnhub: 'x-shuki-finnhub-key'
};

// Provider keys are alphanumeric. Anything else is either a paste accident or an
// attempt to smuggle characters into a URL or header, and both should be dropped
// rather than sent onward.
function clean(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 128) return null;
    return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
}

export function keysFromRequest(request) {
    const headers = request?.headers;
    if (!headers) return {};
    return {
        twelvedata: clean(headers.get(KEY_HEADERS.twelvedata)),
        finnhub: clean(headers.get(KEY_HEADERS.finnhub))
    };
}

export function withRequestKeys(request, run) {
    return store.run(keysFromRequest(request), run);
}

// The request's key wins over the environment's. If someone pastes a key into a
// deploy that already has one, the one they can see and change is the one that
// should take effect — otherwise a stale server key would silently override it
// and look like the paste did nothing.
export function resolveKey(provider, envValue) {
    return store.getStore()?.[provider] || envValue || null;
}

// Test seam: run a block as if the request carried these keys.
export function runWithKeys(keys, run) {
    return store.run(keys, run);
}
