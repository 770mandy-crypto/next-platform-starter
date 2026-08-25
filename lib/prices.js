// Price access with a provider fallback.
//
// Yahoo is preferred: it carries currency and exchange metadata that Stooq
// does not. But Yahoo blocks datacenter IP ranges, so on a serverless host it
// can refuse every request while working perfectly from a laptop. Stooq serves
// plain CSV without a key and without that blocking, so it stands in when
// Yahoo is unreachable — prices keep working, and only the fundamentals
// (Yahoo-only) are lost.

import { fetchPriceHistory } from './yahoo.js';
import { fetchStooqHistory } from './providers/stooq.js';
import { fetchTwelveDataHistory, isTwelveDataConfigured } from './providers/twelvedata.js';

const FETCHERS = {
    twelvedata: fetchTwelveDataHistory,
    yahoo: fetchPriceHistory,
    stooq: fetchStooqHistory
};

// Ordering follows what actually survives a datacenter IP. /diag showed Yahoo
// answering 429 and Stooq serving a browser-verification page from Netlify, so
// a configured Twelve Data key goes first: it is the only one of the three
// that is expected to work there. The keyless pair stay behind it because they
// need no setup and do work from a normal machine.
export function providerOrder({ preferred = process.env.PRICE_PROVIDER } = {}) {
    if (preferred && FETCHERS[preferred]) return [preferred];
    const order = isTwelveDataConfigured() ? ['twelvedata', 'yahoo', 'stooq'] : ['yahoo', 'stooq'];
    return order.filter((provider) => !(provider === 'yahoo' && isYahooTripped()));
}

export const PROVIDERS = ['twelvedata', 'yahoo', 'stooq'];

// Where Yahoo is blocked it does not refuse quickly — it hangs until the
// request times out. Paying that wait on every symbol before falling through
// blows past the ~10s serverless function limit, so the whole request dies
// instead of quietly using the fallback. One failure therefore takes Yahoo out
// of rotation, and later requests go straight to Stooq.
const BREAKER_COOLDOWN_MS = 10 * 60 * 1000;
let yahooDownSince = null;

function isYahooTripped() {
    if (yahooDownSince === null) return false;
    if (Date.now() - yahooDownSince < BREAKER_COOLDOWN_MS) return true;
    yahooDownSince = null; // cooldown elapsed — allow one probe through
    return false;
}

export function resetPriceBreaker() {
    yahooDownSince = null;
}

export function priceBreakerState() {
    return { yahooTripped: isYahooTripped(), yahooDownSince };
}

// A symbol that genuinely does not exist should not trigger a fallback: only
// transport-level refusals are worth retrying against another provider.
function isNotFound(error) {
    return error?.status === 404 || error?.status === 422;
}

export async function fetchHistory(symbol, options = {}) {
    const order = providerOrder(options);
    const attempts = [];

    for (const provider of order) {
        try {
            const history = await FETCHERS[provider](symbol);
            if (provider === 'yahoo') yahooDownSince = null; // recovered
            return { ...history, provider, attempts };
        } catch (error) {
            // A missing symbol says nothing about reachability, so it must not
            // trip the breaker.
            if (provider === 'yahoo' && !isNotFound(error)) yahooDownSince = Date.now();
            attempts.push({ provider, error: error.message, status: error.status ?? null });
            // A missing symbol is the same answer everywhere — stop asking.
            if (isNotFound(error) && provider === order[order.length - 1]) break;
            if (isNotFound(error) && order.length === 1) break;
        }
    }

    // Name a provider that was skipped rather than tried, so a short attempt
    // list does not read as "we never had a fallback" — and say *why* it was
    // skipped, since "not configured" and "recently unreachable" call for
    // completely different fixes.
    const skipped = PROVIDERS.filter(
        (provider) => !order.includes(provider) && !attempts.some((attempt) => attempt.provider === provider)
    );
    const summary = [
        ...attempts.map((attempt) => `${attempt.provider}: ${attempt.error}`),
        ...skipped.map((provider) =>
            provider === 'twelvedata' && !isTwelveDataConfigured()
                ? 'twelvedata: skipped (no TWELVEDATA_API_KEY)'
                : `${provider}: skipped (recently unreachable)`
        )
    ].join('; ');
    const failure = new Error(`No price provider could serve ${symbol} (${summary})`);
    // Preserve a not-found across the chain so routes still answer 404 rather
    // than a misleading 502 for a symbol that simply does not exist.
    failure.status = attempts.every((attempt) => attempt.status === 404 || attempt.status === 422) ? 404 : 502;
    failure.attempts = attempts;
    failure.symbol = symbol;
    throw failure;
}
