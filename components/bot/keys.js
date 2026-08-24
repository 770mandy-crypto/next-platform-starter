'use client';

// The visitor's own API keys, kept in their browser.
//
// The hosted app needs a keyed price provider because free ones block
// datacenter IPs. Getting that key into Netlify's environment failed three
// times over, in ways indistinguishable from outside. Keeping it here instead
// means there is nothing to configure and nothing to redeploy: paste it once
// and this browser remembers it.
//
// It is the visitor's own free key, it never leaves their browser except to
// reach our function on the way to the provider it belongs to, and it is never
// logged or rendered back.

const STORAGE = { twelvedata: 'shuki.key.twelvedata', finnhub: 'shuki.key.finnhub' };

const HEADERS = {
    twelvedata: 'x-shuki-twelvedata-key',
    finnhub: 'x-shuki-finnhub-key'
};

// Private windows and blocked site data make localStorage throw on access, not
// just return empty — so every read and write is guarded and the page works
// with no stored value at all.
export function readKey(provider) {
    try {
        return localStorage.getItem(STORAGE[provider]) || '';
    } catch {
        return '';
    }
}

export function writeKey(provider, value) {
    try {
        const trimmed = (value || '').trim();
        if (trimmed) localStorage.setItem(STORAGE[provider], trimmed);
        else localStorage.removeItem(STORAGE[provider]);
        return true;
    } catch {
        return false;
    }
}

export function keyHeaders() {
    const headers = {};
    for (const provider of Object.keys(HEADERS)) {
        const value = readKey(provider);
        if (value) headers[HEADERS[provider]] = value;
    }
    return headers;
}

// Every client call to our API goes through here, so a pasted key takes effect
// everywhere at once instead of only on the page it was typed into.
export function apiFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), ...keyHeaders() }
    });
}
