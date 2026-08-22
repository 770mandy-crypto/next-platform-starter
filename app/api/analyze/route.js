import { NextResponse } from 'next/server';
import { buildReport } from 'lib/analysis';
import { narrateReport } from 'lib/bot';
import { YahooError, fetchFundamentals, fetchPriceHistory, normaliseSymbol } from 'lib/yahoo';

export const dynamic = 'force-dynamic'; // Prices are live; never serve this from the cache

export async function GET(request) {
    const requested = request.nextUrl.searchParams.get('symbol');
    const withNarration = request.nextUrl.searchParams.get('narrate') !== 'false';

    const symbol = normaliseSymbol(requested);
    if (!symbol) {
        return NextResponse.json({ error: 'חסר סימבול תקין. לדוגמה: /api/analyze?symbol=AAPL' }, { status: 400 });
    }

    try {
        // Fundamentals are optional, so settle rather than race-to-reject.
        const [historyResult, fundamentalsResult] = await Promise.allSettled([
            fetchPriceHistory(symbol),
            fetchFundamentals(symbol)
        ]);

        if (historyResult.status === 'rejected') throw historyResult.reason;

        const report = buildReport({
            history: historyResult.value,
            fundamentals: fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null,
            fundamentalsError:
                fundamentalsResult.status === 'rejected'
                    ? 'לא הצלחתי לשלוף נתונים פונדמנטליים מ-Yahoo — הניתוח מבוסס על מחירים בלבד.'
                    : null
        });

        if (withNarration) {
            report.narration = await narrateReport(report);
        }

        return NextResponse.json(report);
    } catch (error) {
        if (error instanceof YahooError) {
            const status = error.status === 404 || error.status === 422 ? 404 : 502;
            return NextResponse.json(
                { error: status === 404 ? `לא מצאתי נתונים עבור ${symbol}.` : 'שירות הנתונים לא זמין כרגע.' },
                { status }
            );
        }
        console.error('Analysis failed:', error);
        return NextResponse.json({ error: 'הניתוח נכשל. נסה שוב בעוד רגע.' }, { status: 500 });
    }
}
