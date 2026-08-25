// Stooq price provider, used as a fallback when Yahoo refuses the request.
//
// Yahoo blocks datacenter IP ranges, which makes it unreliable from a
// serverless host even though it works fine from a laptop. Stooq serves plain
// CSV with no key and no such blocking, so it keeps the price path alive.
// It carries no fundamentals — those remain Yahoo-only.

const STOOQ_HOST = process.env.STOOQ_HOST || 'https://stooq.com';

export class StooqError extends Error {
    constructor(message, { status, symbol } = {}) {
        super(message);
        this.name = 'StooqError';
        this.status = status;
        this.symbol = symbol;
    }
}

// Stooq uses its own tickers: US equities take a .us suffix, and indices have
// short codes rather than Yahoo's caret symbols.
const INDEX_MAP = {
    '^GSPC': '^spx',
    '^IXIC': '^ndq',
    '^DJI': '^dji',
    '^RUT': '^rut',
    '^VIX': '^vix'
};

export function toStooqSymbol(symbol) {
    const upper = symbol.toUpperCase();
    if (INDEX_MAP[upper]) return INDEX_MAP[upper];
    // Anything already carrying an exchange suffix (TEVA.TA) has no clean
    // Stooq equivalent, so it is left unsupported rather than guessed at.
    if (upper.startsWith('^')) return null;
    if (upper.includes('.')) return null;
    return `${upper.toLowerCase()}.us`;
}

// Stooq's daily CSV: Date,Open,High,Low,Close,Volume — oldest row first.
function parseCsv(text, symbol) {
    const lines = text.trim().split(/\r?\n/);
    const header = lines[0]?.toLowerCase() ?? '';

    // Check the shape before the row count: a block page or rate-limit notice
    // is often a single line, and counting rows first would report it as a
    // missing symbol (404) when the real answer is that the provider refused
    // us (502) — which would also stop the fallback chain reporting correctly.
    if (!header.startsWith('date')) {
        throw new StooqError(`Stooq returned an unexpected body: ${text.slice(0, 60)}`, { status: 502, symbol });
    }
    if (lines.length < 2) throw new StooqError(`Stooq returned no rows for ${symbol}`, { status: 404, symbol });

    const closeIndex = header.split(',').indexOf('close');
    const volumeIndex = header.split(',').indexOf('volume');
    const candles = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const close = Number(parts[closeIndex]);
        // Stooq writes 'N/A' for missing sessions; skip rather than carry a
        // stale price into the indicators.
        if (!Number.isFinite(close)) continue;
        const volume = Number(parts[volumeIndex]);
        candles.push({ date: parts[0], close, volume: Number.isFinite(volume) ? volume : null });
    }

    return candles;
}

export async function fetchStooqHistory(symbol, { timeoutMs = 12000 } = {}) {
    const stooqSymbol = toStooqSymbol(symbol);
    if (!stooqSymbol) throw new StooqError(`Stooq has no equivalent for ${symbol}`, { status: 404, symbol });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const url = `${STOOQ_HOST}/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new StooqError(`Stooq responded ${response.status}`, { status: response.status, symbol });

        const candles = parseCsv(await response.text(), symbol);
        // Stooq returns the full available history; the analysis only needs the
        // trailing year, and trimming keeps the indicators comparable to Yahoo's.
        const trimmed = candles.slice(-260);
        if (trimmed.length < 30) {
            throw new StooqError(`Not enough price history for ${symbol}`, { status: 422, symbol });
        }

        const closes = trimmed.map((candle) => candle.close);
        return {
            symbol,
            currency: null, // Stooq's CSV does not carry a currency
            exchange: null,
            instrumentType: null,
            price: closes[closes.length - 1],
            previousClose: closes.length > 1 ? closes[closes.length - 2] : null,
            fiftyTwoWeekHigh: Math.max(...closes),
            fiftyTwoWeekLow: Math.min(...closes),
            candles: trimmed
        };
    } finally {
        clearTimeout(timer);
    }
}
