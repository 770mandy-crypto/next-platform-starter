// Turns what the model read off a screenshot into a ticker safe to send to a
// provider.
//
// Two jobs. A screenshot shows "TEVA", not "TEVA.TA", so an Israeli listing
// needs its exchange suffix restored. And the model can return anything at all,
// so the result goes through the same validation a typed symbol does — a
// hallucinated string must never reach a provider.

import { normaliseSymbol } from './yahoo.js';

const MARKET_SUFFIX = {
    israel: '.TA'
};

export function resolveSymbol({ symbol, market, confidence } = {}) {
    if (typeof symbol !== 'string' || !symbol.trim()) {
        return { symbol: null, reason: 'no-symbol' };
    }

    // A guess the model itself is unsure of must not silently become a report
    // about the wrong company — better to show the chart reading alone.
    if (confidence === 'low') {
        return { symbol: null, reason: 'low-confidence' };
    }

    let candidate = symbol.trim().toUpperCase();

    // Strip decoration a screenshot often carries: "NASDAQ:AAPL", "$AAPL".
    candidate = candidate.replace(/^\$/, '');
    if (candidate.includes(':')) candidate = candidate.split(':').pop().trim();

    const suffix = MARKET_SUFFIX[market];
    if (suffix && !candidate.includes('.')) candidate += suffix;

    const normalised = normaliseSymbol(candidate);
    if (!normalised) return { symbol: null, reason: 'invalid-symbol' };

    return { symbol: normalised, reason: null };
}
