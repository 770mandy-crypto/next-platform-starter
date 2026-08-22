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

export const PROVIDERS = ['yahoo', 'stooq'];

const FETCHERS = {
    yahoo: fetchPriceHistory,
    stooq: fetchStooqHistory
};

// A symbol that genuinely does not exist should not trigger a fallback: only
// transport-level refusals are worth retrying against another provider.
function isNotFound(error) {
    return error?.status === 404 || error?.status === 422;
}

export async function fetchHistory(symbol, { preferred = process.env.PRICE_PROVIDER } = {}) {
    // An explicit preference pins a single provider, which is what the
    // diagnostics page and any future per-instrument override need.
    const order = preferred && FETCHERS[preferred] ? [preferred] : PROVIDERS;
    const attempts = [];

    for (const provider of order) {
        try {
            const history = await FETCHERS[provider](symbol);
            return { ...history, provider, attempts };
        } catch (error) {
            attempts.push({ provider, error: error.message, status: error.status ?? null });
            // A missing symbol is the same answer everywhere — stop asking.
            if (isNotFound(error) && provider === order[order.length - 1]) break;
            if (isNotFound(error) && order.length === 1) break;
        }
    }

    const summary = attempts.map((attempt) => `${attempt.provider}: ${attempt.error}`).join('; ');
    const failure = new Error(`No price provider could serve ${symbol} (${summary})`);
    // Preserve a not-found across the chain so routes still answer 404 rather
    // than a misleading 502 for a symbol that simply does not exist.
    failure.status = attempts.every((attempt) => attempt.status === 404 || attempt.status === 422) ? 404 : 502;
    failure.attempts = attempts;
    failure.symbol = symbol;
    throw failure;
}
