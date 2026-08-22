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

export function providerOrder({ preferred = process.env.FUNDAMENTALS_PROVIDER } = {}) {
    if (preferred && FETCHERS[preferred]) return [preferred];
    return isFinnhubConfigured() ? ['finnhub', 'yahoo'] : ['yahoo'];
}

export async function fetchCompanyFundamentals(symbol, options = {}) {
    const order = providerOrder(options);
    const attempts = [];

    for (const provider of order) {
        try {
            const fundamentals = await FETCHERS[provider](symbol);
            return { ...fundamentals, provider, attempts };
        } catch (error) {
            attempts.push({
                provider,
                error: error.message,
                status: error.status ?? null,
                step: error.step ?? null
            });
        }
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
