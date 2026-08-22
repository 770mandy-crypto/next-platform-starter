// Market-wide view: the major indices plus the eleven SPDR sector ETFs, each
// scored with the same technical engine used for single stocks. Indices and
// ETFs carry no meaningful company fundamentals, so this path is technical-only
// and never touches Yahoo's cookie+crumb handshake.

import { analyseTechnicals, combineScores } from './analysis.js';
import { fetchHistory } from './prices.js';

export const INDICES = [
    { symbol: '^GSPC', label: 'S&P 500' },
    { symbol: '^IXIC', label: 'נאסד״ק' },
    { symbol: '^DJI', label: 'דאו ג׳ונס' },
    { symbol: '^RUT', label: 'ראסל 2000' },
    { symbol: '^TA125.TA', label: 'תל אביב 125' },
    // The VIX measures fear, so a high reading is bearish for everything else.
    // It is reported as a level and deliberately kept out of the breadth maths.
    { symbol: '^VIX', label: 'מדד הפחד (VIX)', role: 'volatility' }
];

export const SECTORS = [
    { symbol: 'XLK', label: 'טכנולוגיה' },
    { symbol: 'XLC', label: 'תקשורת ומדיה' },
    { symbol: 'XLY', label: 'צריכה מחזורית' },
    { symbol: 'XLP', label: 'צריכה בסיסית' },
    { symbol: 'XLV', label: 'בריאות' },
    { symbol: 'XLF', label: 'פיננסים' },
    { symbol: 'XLI', label: 'תעשייה' },
    { symbol: 'XLE', label: 'אנרגיה' },
    { symbol: 'XLB', label: 'חומרי גלם' },
    { symbol: 'XLRE', label: 'נדל״ן' },
    { symbol: 'XLU', label: 'תשתיות' }
];

// Yahoo throttles bursts, so the universe is fetched in small waves rather than
// all at once.
async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;

    async function run() {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await worker(items[index], index);
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return results;
}

async function analyseInstrument(entry) {
    try {
        const history = await fetchHistory(entry.symbol);
        const technical = analyseTechnicals(history.candles);
        const metrics = technical.metrics;

        return {
            symbol: entry.symbol,
            label: entry.label,
            role: entry.role || 'scored',
            ok: true,
            price: history.price,
            currency: history.currency,
            // Indices are quoted in points, so a score only means something for
            // the instruments we actually rank.
            overall: entry.role === 'volatility' ? null : combineScores(technical.score, null),
            score: entry.role === 'volatility' ? null : technical.score,
            returns: metrics.returns,
            rsi: metrics.rsi,
            ma50: metrics.ma50,
            ma200: metrics.ma200,
            aboveMa50: metrics.ma50 === null ? null : metrics.price >= metrics.ma50,
            aboveMa200: metrics.ma200 === null ? null : metrics.price >= metrics.ma200,
            volatility: metrics.volatility,
            provider: history.provider,
            sparkline: sample(history.candles, 48),
            asOf: history.candles[history.candles.length - 1].date
        };
    } catch (error) {
        return { symbol: entry.symbol, label: entry.label, role: entry.role || 'scored', ok: false, error: error.message };
    }
}

function sample(candles, target) {
    if (candles.length <= target) return candles.map((candle) => candle.close);
    const step = candles.length / target;
    const out = [];
    for (let i = 0; i < target; i++) out.push(candles[Math.floor(i * step)].close);
    out.push(candles[candles.length - 1].close);
    return out;
}

// Breadth: how much of the market is actually participating, which is a better
// read on health than any single index level.
export function summariseBreadth(sectors) {
    const scored = sectors.filter((entry) => entry.ok && Number.isFinite(entry.score));
    if (!scored.length) return null;

    const aboveMa50 = scored.filter((entry) => entry.aboveMa50).length;
    const aboveMa200 = scored.filter((entry) => entry.aboveMa200).length;
    const averageScore = Math.round(scored.reduce((sum, entry) => sum + entry.score, 0) / scored.length);
    const positiveQuarter = scored.filter((entry) => (entry.returns?.threeMonths ?? 0) > 0).length;

    return {
        total: scored.length,
        aboveMa50,
        aboveMa200,
        positiveQuarter,
        averageScore,
        participation: Math.round((aboveMa50 / scored.length) * 100)
    };
}

export function marketVerdict(breadth, indices) {
    if (!breadth) return null;

    const benchmark = indices.find((entry) => entry.symbol === '^GSPC' && entry.ok);
    const benchmarkScore = benchmark?.score ?? breadth.averageScore;
    // Weight the benchmark and the breadth of participation equally: a strong
    // index carried by a handful of names is a weaker market than the level
    // alone suggests.
    const blended = Math.round(benchmarkScore * 0.5 + breadth.averageScore * 0.5);
    return combineScores(blended, null);
}

let cache = null;
const CACHE_TTL_MS = 60 * 1000;

export async function fetchMarketMap({ force = false } = {}) {
    if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

    const universe = [...INDICES, ...SECTORS];
    const analysed = await mapWithConcurrency(universe, 5, analyseInstrument);

    const indices = analysed.slice(0, INDICES.length);
    const sectors = analysed.slice(INDICES.length).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

    const breadth = summariseBreadth(sectors);
    const value = {
        indices,
        sectors,
        breadth,
        verdict: marketVerdict(breadth, indices),
        vix: indices.find((entry) => entry.role === 'volatility') || null,
        failures: analysed.filter((entry) => !entry.ok).map((entry) => ({ symbol: entry.symbol, error: entry.error })),
        generatedAt: new Date().toISOString()
    };

    cache = { value, at: Date.now() };
    return value;
}

export function resetMarketCache() {
    cache = null;
}
