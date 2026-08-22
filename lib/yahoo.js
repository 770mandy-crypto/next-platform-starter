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

// The crumb cache is module state that would otherwise leak between tests.
export function resetCrumbCache() {
    crumbCache = null;
}

export class YahooError extends Error {
    // `step` names which stage of the fundamentals flow broke (cookie, crumb or
    // quoteSummary) so the failure is diagnosable from the UI rather than only
    // from server logs.
    constructor(message, { status, symbol, step } = {}) {
        super(message);
        this.name = 'YahooError';
        this.status = status;
        this.symbol = symbol;
        this.step = step;
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

// Reads every Set-Cookie on a response and reduces it to a Cookie request
// header. getSetCookie() keeps multiple cookies separate; the fallback split
// has to avoid breaking on the commas inside an Expires date, hence the
// lookahead for a cookie name.
function collectCookies(response) {
    const values =
        typeof response.headers.getSetCookie === 'function'
            ? response.headers.getSetCookie()
            : (response.headers.get('set-cookie') || '').split(/,(?=\s*[A-Za-z0-9_-]+=)/);

    return values
        .map((value) => value.split(';')[0].trim())
        .filter(Boolean)
        .join('; ');
}

// Yahoo issues a session cookie, which then authorises a crumb from the test
// endpoint. Both are needed on every quoteSummary call.
//
// The cookie hosts answer with a redirect (and fc.yahoo.com with a 404 body),
// so this must NOT follow redirects: fetch only exposes the final response's
// headers, and following would discard the Set-Cookie carried on the 30x
// itself. Each host is tried in turn because any one of them may be down or
// may bounce a given region into the consent flow.
const COOKIE_SOURCES = [COOKIE_HOST, 'https://finance.yahoo.com', 'https://login.yahoo.com'];

async function getSessionCookie() {
    const attempts = [];

    for (const source of COOKIE_SOURCES) {
        const { signal, done } = withTimeout(8000);
        try {
            const response = await fetch(source, {
                headers: BROWSER_HEADERS,
                signal,
                redirect: 'manual',
                cache: 'no-store'
            });
            const cookieHeader = collectCookies(response);
            if (cookieHeader) return cookieHeader;
            attempts.push(`${source} → ${response.status} without Set-Cookie`);
        } catch (error) {
            attempts.push(`${source} → ${error.name === 'AbortError' ? 'timeout' : error.message}`);
        } finally {
            done();
        }
    }

    throw new YahooError(`No session cookie from any Yahoo host (${attempts.join('; ')})`, {
        step: 'cookie'
    });
}

async function getCrumb({ force = false } = {}) {
    if (!force && crumbCache && Date.now() - crumbCache.at < CRUMB_TTL_MS) return crumbCache;

    const cookieHeader = await getSessionCookie();

    const { signal, done } = withTimeout(8000);
    try {
        const response = await fetch(`${CHART_HOST}/v1/test/getcrumb`, {
            headers: { ...BROWSER_HEADERS, Cookie: cookieHeader },
            signal,
            cache: 'no-store'
        });
        const crumb = (await response.text()).trim();
        // A rejected crumb request answers with an HTML error page rather than
        // a non-2xx status, so the body has to be checked too.
        if (!response.ok || !crumb || crumb.includes('<')) {
            throw new YahooError(`Crumb request returned ${response.status} (${crumb.slice(0, 40) || 'empty'})`, {
                status: response.status,
                step: 'crumb'
            });
        }

        crumbCache = { crumb, cookieHeader, at: Date.now() };
        return crumbCache;
    } catch (error) {
        if (error instanceof YahooError) throw error;
        throw new YahooError(`Crumb request failed: ${error.name === 'AbortError' ? 'timeout' : error.message}`, {
            step: 'crumb'
        });
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
    // A cached crumb can go stale mid-flight, which Yahoo reports as a 401/403.
    // Retry once against a freshly minted crumb before giving up.
    let payload;
    for (const force of [false, true]) {
        const { crumb, cookieHeader } = await getCrumb({ force });
        const url =
            `${QUOTE_HOST}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
            `?modules=${FUNDAMENTAL_MODULES}&crumb=${encodeURIComponent(crumb)}`;

        try {
            payload = await fetchJson(url, { headers: { ...BROWSER_HEADERS, Cookie: cookieHeader } });
            break;
        } catch (error) {
            const stale = error instanceof YahooError && (error.status === 401 || error.status === 403);
            if (stale && !force) {
                crumbCache = null;
                continue;
            }
            if (error instanceof YahooError) {
                error.step = error.step || 'quoteSummary';
                throw error;
            }
            throw new YahooError(`quoteSummary failed: ${error.message}`, { step: 'quoteSummary', symbol });
        }
    }

    const result = payload?.quoteSummary?.result?.[0];
    if (!result) throw new YahooError(`No fundamentals for ${symbol}`, { status: 404, symbol, step: 'quoteSummary' });

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
