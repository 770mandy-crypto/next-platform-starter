import { NextResponse } from 'next/server';
import { analyseTechnicals, combineScores } from 'lib/analysis';
import { fetchHistory } from 'lib/prices';
import { normaliseSymbol } from 'lib/yahoo';
import { SCAN_BATCH_SIZE } from 'lib/universe';

export const dynamic = 'force-dynamic';

// One batch must finish well inside Netlify's ~10s function timeout, so the
// client walks the universe rather than asking for all of it at once.
const MAX_PER_REQUEST = SCAN_BATCH_SIZE;
const CONCURRENCY = 6;

async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;

    async function run() {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await worker(items[index]);
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return results;
}

// Technical-only and deliberately compact: a scan of a hundred names should not
// ship a hundred full reports to the browser.
async function scanOne(symbol) {
    try {
        const history = await fetchHistory(symbol);
        const technical = analyseTechnicals(history.candles);
        const overall = combineScores(technical.score, null);
        const metrics = technical.metrics;

        return {
            symbol,
            ok: true,
            provider: history.provider,
            price: history.price,
            score: technical.score,
            verdict: overall?.verdict ?? null,
            tone: overall?.tone ?? null,
            rsi: metrics.rsi,
            volatility: metrics.volatility,
            aboveMa50: metrics.ma50 === null ? null : metrics.price >= metrics.ma50,
            aboveMa200: metrics.ma200 === null ? null : metrics.price >= metrics.ma200,
            returns: metrics.returns
        };
    } catch (error) {
        return { symbol, ok: false, error: error.status === 404 ? 'לא נמצא' : 'שליפה נכשלה' };
    }
}

export async function GET(request) {
    const requested = request.nextUrl.searchParams.get('symbols') || '';
    const symbols = [...new Set(requested.split(',').map(normaliseSymbol).filter(Boolean))].slice(0, MAX_PER_REQUEST);

    if (!symbols.length) {
        return NextResponse.json({ error: 'לא התקבלו סימבולים תקינים.' }, { status: 400 });
    }

    const results = await mapWithConcurrency(symbols, CONCURRENCY, scanOne);
    return NextResponse.json({ results, generatedAt: new Date().toISOString() });
}
