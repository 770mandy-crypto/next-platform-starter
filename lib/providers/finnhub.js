// Finnhub fundamentals provider.
//
// Yahoo blocks datacenter IPs, which leaves the deployed app without company
// data. Finnhub's free tier serves the ratios we score on and is reachable
// from a serverless host. It is fundamentals-only here: the candle endpoint
// moved behind the paid tier, and Stooq already covers prices.
//
// UNITS DIFFER FROM YAHOO. Finnhub returns margins, growth and ROE as ready
// percentages where Yahoo returns fractions, and debt-to-equity as a ratio
// where Yahoo returns a percentage. The scoring thresholds in analysis.js are
// calibrated to Yahoo's scale, so every field is normalised to that scale
// here — a silent mismatch would produce confidently wrong scores rather than
// an obvious failure.

const FINNHUB_HOST = process.env.FINNHUB_HOST || 'https://finnhub.io/api/v1';

export class FinnhubError extends Error {
    constructor(message, { status, symbol, step } = {}) {
        super(message);
        this.name = 'FinnhubError';
        this.status = status;
        this.symbol = symbol;
        this.step = step;
    }
}

export function isFinnhubConfigured() {
    return Boolean(process.env.FINNHUB_API_KEY);
}

async function finnhubGet(path, { symbol, step, timeoutMs = 10000 } = {}) {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) throw new FinnhubError('FINNHUB_API_KEY is not set', { step: 'config' });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${FINNHUB_HOST}${path}`, {
            // The key goes in a header rather than the query string so it does
            // not end up in logs or error messages.
            headers: { 'X-Finnhub-Token': key, Accept: 'application/json' },
            signal: controller.signal,
            cache: 'no-store'
        });

        if (response.status === 401 || response.status === 403) {
            throw new FinnhubError('Finnhub rejected the API key', { status: response.status, symbol, step });
        }
        if (response.status === 429) {
            throw new FinnhubError('Finnhub rate limit reached', { status: 429, symbol, step });
        }
        if (!response.ok) {
            throw new FinnhubError(`Finnhub responded ${response.status}`, { status: response.status, symbol, step });
        }

        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

function num(value) {
    return Number.isFinite(value) ? value : null;
}

// Finnhub already reports these as percentages; Yahoo reports fractions and
// the analysis layer scales those up. Nothing to convert.
function asPercent(value) {
    return num(value);
}

// Finnhub reports debt-to-equity as a ratio (1.45); Yahoo reports it as a
// percentage (145), which is what the scoring thresholds expect.
function ratioToPercent(value) {
    const parsed = num(value);
    return parsed === null ? null : parsed * 100;
}

// Derive a Yahoo-style recommendation key from Finnhub's analyst vote counts.
function toRecommendationKey(row) {
    if (!row) return { recommendationKey: null, numberOfAnalysts: null };

    const strongBuy = row.strongBuy || 0;
    const buy = row.buy || 0;
    const hold = row.hold || 0;
    const sell = row.sell || 0;
    const strongSell = row.strongSell || 0;
    const total = strongBuy + buy + hold + sell + strongSell;
    if (!total) return { recommendationKey: null, numberOfAnalysts: null };

    // Weighted mean on Yahoo's 1..5 scale, where 1 is a strong buy.
    const mean = (strongBuy * 1 + buy * 2 + hold * 3 + sell * 4 + strongSell * 5) / total;
    const recommendationKey =
        mean <= 1.5 ? 'strong_buy' : mean <= 2.5 ? 'buy' : mean <= 3.5 ? 'hold' : mean <= 4.5 ? 'sell' : 'strong_sell';

    return { recommendationKey, numberOfAnalysts: total };
}

export async function fetchFinnhubFundamentals(symbol) {
    const query = `?symbol=${encodeURIComponent(symbol)}`;

    // The metrics are the only required call; a missing profile or an empty
    // recommendation list should not sink the whole report.
    const [metricResult, profileResult, recommendationResult] = await Promise.allSettled([
        finnhubGet(`/stock/metric${query}&metric=all`, { symbol, step: 'metric' }),
        finnhubGet(`/stock/profile2${query}`, { symbol, step: 'profile' }),
        finnhubGet(`/stock/recommendation${query}`, { symbol, step: 'recommendation' })
    ]);

    if (metricResult.status === 'rejected') throw metricResult.reason;

    const metric = metricResult.value?.metric;
    if (!metric || Object.keys(metric).length === 0) {
        throw new FinnhubError(`Finnhub has no fundamentals for ${symbol}`, { status: 404, symbol, step: 'metric' });
    }

    const profile = profileResult.status === 'fulfilled' ? profileResult.value || {} : {};
    const recommendations = recommendationResult.status === 'fulfilled' ? recommendationResult.value : null;
    // Finnhub returns recommendations newest first.
    const { recommendationKey, numberOfAnalysts } = toRecommendationKey(
        Array.isArray(recommendations) ? recommendations[0] : null
    );

    return {
        name: profile.name || null,
        // Finnhub has no sector field; its industry label is the closest thing.
        sector: profile.finnhubIndustry || null,
        industry: profile.finnhubIndustry || null,
        country: profile.country || null,
        employees: null,
        summary: null,
        // profile2 reports market cap in millions.
        marketCap: num(profile.marketCapitalization) === null ? null : profile.marketCapitalization * 1e6,
        trailingPE: num(metric.peTTM) ?? num(metric.peBasicExclExtraTTM) ?? num(metric.peNormalizedAnnual),
        forwardPE: null,
        priceToBook: num(metric.pbQuarterly) ?? num(metric.pbAnnual),
        // Finnhub's free tier does not carry PEG; leaving it null drops the
        // signal from the score rather than counting it as a zero.
        pegRatio: null,
        beta: num(metric.beta),
        dividendYield: asPercent(metric.dividendYieldIndicatedAnnual),
        payoutRatio: asPercent(metric.payoutRatioTTM ?? metric.payoutRatioAnnual),
        profitMargin: asPercent(metric.netProfitMarginTTM),
        operatingMargin: asPercent(metric.operatingMarginTTM),
        returnOnEquity: asPercent(metric.roeTTM),
        revenueGrowth: asPercent(metric.revenueGrowthTTMYoy),
        earningsGrowth: asPercent(metric.epsGrowthTTMYoy),
        debtToEquity: ratioToPercent(metric['totalDebt/totalEquityQuarterly'] ?? metric['totalDebt/totalEquityAnnual']),
        currentRatio: num(metric.currentRatioQuarterly) ?? num(metric.currentRatioAnnual),
        freeCashflow: null,
        totalRevenue: null,
        recommendationKey,
        numberOfAnalysts,
        // Price targets sit behind Finnhub's paid tier, so this stays null and
        // the UI hides the consensus target rather than inventing one.
        targetMeanPrice: null
    };
}
