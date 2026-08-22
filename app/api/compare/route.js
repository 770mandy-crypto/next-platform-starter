import { NextResponse } from 'next/server';
import { buildReport } from 'lib/analysis';
import { YahooError, normaliseSymbol } from 'lib/yahoo';
import { fetchCompanyFundamentals } from 'lib/fundamentals';
import { fetchHistory } from 'lib/prices';

export const dynamic = 'force-dynamic';

const MAX_SYMBOLS = 6;

export async function GET(request) {
    const requested = request.nextUrl.searchParams.get('symbols') || '';
    const symbols = [...new Set(requested.split(',').map(normaliseSymbol).filter(Boolean))].slice(0, MAX_SYMBOLS);

    if (symbols.length < 2) {
        return NextResponse.json(
            { error: 'צריך לפחות שני סימבולים תקינים. לדוגמה: /api/compare?symbols=AAPL,MSFT' },
            { status: 400 }
        );
    }

    const settled = await Promise.allSettled(symbols.map(analyseOne));

    const results = [];
    const failures = [];
    settled.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') results.push(outcome.value);
        else failures.push({ symbol: symbols[index], error: describeError(outcome.reason) });
    });

    if (!results.length) {
        return NextResponse.json({ error: 'לא הצלחתי לנתח אף אחד מהניירות שביקשת.', failures }, { status: 502 });
    }

    // Best score first; the UI renders this order as the ranking.
    results.sort((a, b) => (b.overall?.score ?? 0) - (a.overall?.score ?? 0));

    return NextResponse.json({
        ranking: results.map((report, index) => ({ rank: index + 1, ...report })),
        failures,
        generatedAt: new Date().toISOString()
    });
}

async function analyseOne(symbol) {
    const [historyResult, fundamentalsResult] = await Promise.allSettled([
        fetchHistory(symbol),
        fetchCompanyFundamentals(symbol)
    ]);
    if (historyResult.status === 'rejected') throw historyResult.reason;

    const report = buildReport({
        history: historyResult.value,
        fundamentals: fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null,
        fundamentalsError:
            fundamentalsResult.status === 'rejected' ? 'נתונים פונדמנטליים לא זמינים לנייר הזה.' : null
    });

    // The comparison table only needs headline numbers, and dropping the raw
    // fundamentals keeps the payload small for six symbols at once.
    delete report.raw;
    return report;
}

function describeError(error) {
    const status = error?.status;
    if (status === 404 || status === 422) return 'לא נמצאו נתונים';
    if (status === 502 || error instanceof YahooError) return 'שירות הנתונים לא זמין';
    return 'הניתוח נכשל';
}
