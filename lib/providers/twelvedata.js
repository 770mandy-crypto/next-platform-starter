// Twelve Data price provider.
//
// Added because /diag proved that neither keyless source survives a datacenter
// IP: Yahoo answers 429 Too Many Requests on a shared cloud address, and Stooq
// serves a JavaScript browser-verification page instead of CSV. Twelve Data is
// keyed, which is precisely why it works there — the free tier allows 800
// requests a day and 8 a minute.

import { resolveKey } from '../request-key.js';

// A key pasted into the site travels on the request and beats the host's
// environment; lib/request-key.js explains why that path exists at all.
function twelveDataKey() {
    return resolveKey('twelvedata', process.env.TWELVEDATA_API_KEY);
}

const TWELVEDATA_HOST = process.env.TWELVEDATA_HOST || 'https://api.twelvedata.com';

export class TwelveDataError extends Error {
    constructor(message, { status, symbol } = {}) {
        super(message);
        this.name = 'TwelveDataError';
        this.status = status;
        this.symbol = symbol;
    }
}

export function isTwelveDataConfigured() {
    return Boolean(twelveDataKey());
}

// Twelve Data names indices without Yahoo's leading caret.
const INDEX_MAP = {
    '^GSPC': 'SPX',
    '^IXIC': 'IXIC',
    '^DJI': 'DJI',
    '^RUT': 'RUT',
    '^VIX': 'VIX'
};

export function toTwelveDataSymbol(symbol) {
    const upper = symbol.toUpperCase();
    if (INDEX_MAP[upper]) return INDEX_MAP[upper];
    // An unmapped index would silently resolve to something else, so decline it.
    if (upper.startsWith('^')) return null;
    // Twelve Data addresses Tel Aviv listings as SYMBOL:TASE, not SYMBOL.TA.
    // Passing the Yahoo form through produces a confusing provider error rather
    // than falling through, so decline it and let the chain reach Yahoo — the
    // only provider here with real TASE coverage.
    if (upper.endsWith('.TA')) return null;
    // Class shares use a dot here (BRK.B) where Yahoo and Stooq use a dash.
    return upper.replace('-', '.');
}

export async function fetchTwelveDataHistory(symbol, { timeoutMs = 8000, outputsize = 260 } = {}) {
    const key = twelveDataKey();
    if (!key) throw new TwelveDataError('TWELVEDATA_API_KEY is not set', { symbol });

    const mapped = toTwelveDataSymbol(symbol);
    if (!mapped) throw new TwelveDataError(`No Twelve Data equivalent for ${symbol}`, { status: 404, symbol });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const url =
            `${TWELVEDATA_HOST}/time_series?symbol=${encodeURIComponent(mapped)}` +
            `&interval=1day&outputsize=${outputsize}&apikey=${encodeURIComponent(key)}`;
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        const payload = await response.json();

        // Errors arrive as HTTP 200 with status:"error" in the body, so the
        // status code alone is not enough to tell success from failure.
        if (payload?.status === 'error') {
            const code = payload.code ?? response.status;
            const message = payload.message || 'unknown error';
            if (code === 401 || code === 403) {
                throw new TwelveDataError(`Twelve Data rejected the API key: ${message}`, { status: 401, symbol });
            }
            if (code === 429) {
                throw new TwelveDataError(`Twelve Data rate limit reached: ${message}`, { status: 429, symbol });
            }
            if (code === 404) {
                throw new TwelveDataError(`Twelve Data has no data for ${symbol}: ${message}`, { status: 404, symbol });
            }
            throw new TwelveDataError(`Twelve Data error ${code}: ${message}`, { status: 502, symbol });
        }

        const values = payload?.values;
        if (!Array.isArray(values) || !values.length) {
            throw new TwelveDataError(`Twelve Data returned no rows for ${symbol}`, { status: 404, symbol });
        }

        // Values arrive newest first; the indicators expect oldest first.
        const candles = [];
        for (let i = values.length - 1; i >= 0; i--) {
            const close = Number(values[i].close);
            if (!Number.isFinite(close)) continue;
            const volume = Number(values[i].volume);
            candles.push({
                date: String(values[i].datetime).slice(0, 10),
                close,
                volume: Number.isFinite(volume) ? volume : null
            });
        }

        if (candles.length < 30) {
            throw new TwelveDataError(`Not enough price history for ${symbol}`, { status: 422, symbol });
        }

        const closes = candles.map((candle) => candle.close);
        return {
            symbol,
            currency: payload.meta?.currency || null,
            exchange: payload.meta?.exchange || null,
            instrumentType: payload.meta?.type || null,
            price: closes[closes.length - 1],
            previousClose: closes.length > 1 ? closes[closes.length - 2] : null,
            fiftyTwoWeekHigh: Math.max(...closes),
            fiftyTwoWeekLow: Math.min(...closes),
            candles
        };
    } finally {
        clearTimeout(timer);
    }
}
