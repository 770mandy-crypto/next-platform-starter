// Yahoo Finance data access. The chart endpoint is open, but quoteSummary (the
// fundamentals) requires a cookie + crumb pair, so we acquire one lazily and
// cache it. Fundamentals are best-effort: when the crumb flow fails the caller
// still gets the price history and we report fundamentals as unavailable.

// Hosts are overridable so the app can be pointed at a fixture server in
// development and CI, where Yahoo may be unreachable.
const CHART_HOST = process.env.YAHOO_CHART_HOST || 'https://query1.finance.yahoo.com';
const QUOTE_HOST = process.env.YAHOO_QUOTE_HOST || 'https://query2.finance.yahoo.com';
const COOKIE_HOST = process.env.YAHOO_COOKIE_HOST || 'https://fc.yahoo.com';
const CRUMB_TTL_MS = 30 * 60 * 1000;

// Yahoo rejects requests without a browser-ish user agent.
const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    Accept: 'application/json,text/plain,*/*',
    'Accept-Language': 'en-US,en;q=0.9'
};

const FUNDAMENTAL_MODULES = [
    'price',
    'summaryDetail',
    'defaultKeyStatistics',
    'financialData',
    'assetProfile',
    'summaryProfile'
].join(',');

let crumbCache = null;

export class YahooError extends Error {
    constructor(message, { status, symbol } = {}) {
        super(message);
        this.name = 'YahooError';
        this.status = status;
        this.symbol = symbol;
    }
}

function withTimeout(ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchJson(url, { timeoutMs = 10000, headers = BROWSER_HEADERS } = {}) {
    const { signal, done } = withTimeout(timeoutMs);
    try {
        const response = await fetch(url, { headers, signal, cache: 'no-store' });
        const body = await response.text();
        if (!response.ok) {
            throw new YahooError(`Yahoo responded ${response.status}`, { status: response.status });
        }
        return JSON.parse(body);
    } finally {
        done();
    }
}

// Yahoo hands out a session cookie from fc.yahoo.com, which then authorises a
// crumb from the test endpoint. Both are needed on every quoteSummary call.
async function getCrumb() {
    if (crumbCache && Date.now() - crumbCache.at < CRUMB_TTL_MS) return crumbCache;

    const { signal, done } = withTimeout(10000);
    try {
        const cookieResponse = await fetch(COOKIE_HOST, {
            headers: BROWSER_HEADERS,
            signal,
            redirect: 'follow',
            cache: 'no-store'
        });
        const cookie = cookieResponse.headers.get('set-cookie');
        if (!cookie) throw new YahooError('Yahoo did not issue a session cookie');

        // Only the name=value pair matters; drop the attributes after the first ';'.
        const cookieHeader = cookie
            .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
            .map((part) => part.split(';')[0].trim())
            .join('; ');

        const crumbResponse = await fetch(`${CHART_HOST}/v1/test/getcrumb`, {
            headers: { ...BROWSER_HEADERS, Cookie: cookieHeader },
            signal,
            cache: 'no-store'
        });
        const crumb = (await crumbResponse.text()).trim();
        if (!crumbResponse.ok || !crumb || crumb.includes('<')) {
            throw new YahooError('Yahoo did not issue a crumb', { status: crumbResponse.status });
        }

        crumbCache = { crumb, cookieHeader, at: Date.now() };
        return crumbCache;
    } finally {
        done();
    }
}

// Yahoo wraps most numbers as { raw, fmt }; unwrap to a plain number or null.
function raw(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'object' && Number.isFinite(value.raw)) return value.raw;
    return null;
}

export function normaliseSymbol(input) {
    if (typeof input !== 'string') return null;
    const symbol = input.trim().toUpperCase();
    // Tickers may carry a dot or dash suffix (BRK.B, RY-PA), an exchange suffix
    // (TEVA.TA), a futures marker (ES=F) or a leading caret for an index
    // (^GSPC) — but nothing else, so this doubles as input sanitisation.
    if (!/^\^?[A-Z0-9][A-Z0-9.\-=]{0,14}$/.test(symbol)) return null;
    return symbol;
}

export async function fetchPriceHistory(symbol, { range = '1y', interval = '1d' } = {}) {
    const url = `${CHART_HOST}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    let payload;
    try {
        payload = await fetchJson(url);
    } catch (error) {
        if (error instanceof YahooError && error.status === 404) {
            throw new YahooError(`Unknown symbol: ${symbol}`, { status: 404, symbol });
        }
        throw error;
    }

    const result = payload?.chart?.result?.[0];
    if (!result) {
        const description = payload?.chart?.error?.description;
        throw new YahooError(description || `No price history for ${symbol}`, { status: 404, symbol });
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const adjClose = result.indicators?.adjclose?.[0]?.adjclose;

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
        const close = Number.isFinite(adjClose?.[i]) ? adjClose[i] : quote.close?.[i];
        // Yahoo pads holidays and halts with nulls — skip them rather than
        // carrying a stale price forward into the indicators.
        if (!Number.isFinite(close)) continue;
        candles.push({
            date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
            close,
            volume: Number.isFinite(quote.volume?.[i]) ? quote.volume[i] : null
        });
    }

    if (candles.length < 30) {
        throw new YahooError(`Not enough price history for ${symbol}`, { status: 422, symbol });
    }

    const meta = result.meta || {};
    return {
        symbol: meta.symbol || symbol,
        currency: meta.currency || null,
        exchange: meta.fullExchangeName || meta.exchangeName || null,
        instrumentType: meta.instrumentType || null,
        price: raw(meta.regularMarketPrice) ?? candles[candles.length - 1].close,
        previousClose: raw(meta.chartPreviousClose) ?? raw(meta.previousClose),
        fiftyTwoWeekHigh: raw(meta.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: raw(meta.fiftyTwoWeekLow),
        candles
    };
}

export async function fetchFundamentals(symbol) {
    const { crumb, cookieHeader } = await getCrumb();
    const url =
        `${QUOTE_HOST}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
        `?modules=${FUNDAMENTAL_MODULES}&crumb=${encodeURIComponent(crumb)}`;

    let payload;
    try {
        payload = await fetchJson(url, { headers: { ...BROWSER_HEADERS, Cookie: cookieHeader } });
    } catch (error) {
        // A stale crumb shows up as a 401/403 — drop it so the next call re-authenticates.
        if (error instanceof YahooError && (error.status === 401 || error.status === 403)) crumbCache = null;
        throw error;
    }

    const result = payload?.quoteSummary?.result?.[0];
    if (!result) throw new YahooError(`No fundamentals for ${symbol}`, { status: 404, symbol });

    const { summaryDetail = {}, defaultKeyStatistics = {}, financialData = {}, price = {} } = result;
    const profile = result.assetProfile || result.summaryProfile || {};

    return {
        name: price.longName || price.shortName || null,
        sector: profile.sector || null,
        industry: profile.industry || null,
        country: profile.country || null,
        employees: raw(profile.fullTimeEmployees),
        summary: profile.longBusinessSummary || null,
        marketCap: raw(summaryDetail.marketCap) ?? raw(price.marketCap),
        trailingPE: raw(summaryDetail.trailingPE) ?? raw(defaultKeyStatistics.trailingPE),
        forwardPE: raw(summaryDetail.forwardPE) ?? raw(defaultKeyStatistics.forwardPE),
        priceToBook: raw(defaultKeyStatistics.priceToBook),
        pegRatio: raw(defaultKeyStatistics.pegRatio),
        beta: raw(summaryDetail.beta) ?? raw(defaultKeyStatistics.beta),
        // summaryDetail flip-flops between fractions and percentages, so those two
        // go through the heuristic; financialData is consistently fractional.
        dividendYield: ambiguousPercent(raw(summaryDetail.dividendYield)),
        payoutRatio: ambiguousPercent(raw(summaryDetail.payoutRatio)),
        profitMargin: fractionToPercent(raw(financialData.profitMargins)),
        operatingMargin: fractionToPercent(raw(financialData.operatingMargins)),
        returnOnEquity: fractionToPercent(raw(financialData.returnOnEquity)),
        revenueGrowth: fractionToPercent(raw(financialData.revenueGrowth)),
        earningsGrowth: fractionToPercent(raw(financialData.earningsGrowth)),
        debtToEquity: raw(financialData.debtToEquity),
        currentRatio: raw(financialData.currentRatio),
        freeCashflow: raw(financialData.freeCashflow),
        totalRevenue: raw(financialData.totalRevenue),
        recommendationKey: financialData.recommendationKey || null,
        numberOfAnalysts: raw(financialData.numberOfAnalystOpinions),
        targetMeanPrice: raw(financialData.targetMeanPrice)
    };
}

function fractionToPercent(value) {
    return value === null ? null : value * 100;
}

// Yahoo sometimes reports a ratio already scaled (dividendYield 1.5) and
// sometimes as a fraction (0.015). Values at or under 1 are treated as fractions,
// which is the right call for yields and payout ratios in practice.
function ambiguousPercent(value) {
    if (value === null) return null;
    return Math.abs(value) <= 1 ? value * 100 : value;
}
