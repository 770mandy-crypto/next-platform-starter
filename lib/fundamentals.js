// Fundamentals access with a provider fallback.
//
// The ordering here is the opposite of prices, deliberately. For prices Yahoo
// goes first because it carries metadata Stooq lacks. For fundamentals Finnhub
// goes first *whenever a key is configured*, because Yahoo is blocked from
// this host and its cookie+crumb handshake takes seconds to fail — putting it
// first would add that delay to every single report before falling through.
//
// Without a key there is only Yahoo, which is the pre-existing behaviour.

import { fetchFundamentals as fetchYahooFundamentals } from './yahoo.js';
import { fetchFinnhubFundamentals, isFinnhubConfigured } from './providers/finnhub.js';

const FETCHERS = {
    finnhub: fetchFinnhubFundamentals,
    yahoo: fetchYahooFundamentals
};

// Same reasoning as the price breaker: a blocked Yahoo hangs rather than
// refusing, and its cookie+crumb handshake is three sequential requests. Paying
// that on every report would eat the serverless budget the rest of the request
// needs, so one failure takes it out of rotation.
const BREAKER_COOLDOWN_MS = 10 * 60 * 1000;
let yahooDownSince = null;

function isYahooTripped() {
    if (yahooDownSince === null) return false;
    if (Date.now() - yahooDownSince < BREAKER_COOLDOWN_MS) return true;
    yahooDownSince = null;
    return false;
}

export function resetFundamentalsBreaker() {
    yahooDownSince = null;
}

export function providerOrder({ preferred = process.env.FUNDAMENTALS_PROVIDER } = {}) {
    if (preferred && FETCHERS[preferred]) return [preferred];
    const order = isFinnhubConfigured() ? ['finnhub', 'yahoo'] : ['yahoo'];
    // The chain may legitimately empty out. Retrying a tripped Yahoo costs the
    // cookie handshake across three hosts — enough on its own to overrun the
    // serverless budget — and the caller still gets a clear error saying it was
    // skipped, which is more useful than a timeout.
    return order.filter((provider) => !(provider === 'yahoo' && isYahooTripped()));
}

export async function fetchCompanyFundamentals(symbol, options = {}) {
    const order = providerOrder(options);
    const attempts = [];

    for (const provider of order) {
        try {
            const fundamentals = await FETCHERS[provider](symbol);
            if (provider === 'yahoo') yahooDownSince = null; // recovered
            return { ...fundamentals, provider, attempts };
        } catch (error) {
            const missingSymbol = error.status === 404;
            if (provider === 'yahoo' && !missingSymbol) yahooDownSince = Date.now();
            attempts.push({
                provider,
                error: error.message,
                status: error.status ?? null,
                step: error.step ?? null
            });
        }
    }

    if (!order.length) {
        const skipped = new Error(
            `Fundamentals skipped for ${symbol}: Yahoo was recently unreachable and no Finnhub key is configured.`
        );
        skipped.attempts = [{ provider: 'yahoo', error: 'skipped (recently unreachable)', status: null }];
        skipped.symbol = symbol;
        skipped.unconfigured = true;
        throw skipped;
    }

    const summary = attempts.map((attempt) => `${attempt.provider}: ${attempt.error}`).join('; ');
    const failure = new Error(`No fundamentals provider could serve ${symbol} (${summary})`);
    failure.attempts = attempts;
    failure.symbol = symbol;
    // A key that is simply absent is a configuration state, not an outage, and
    // the UI phrases it differently.
    failure.unconfigured = !isFinnhubConfigured();
    throw failure;
}
