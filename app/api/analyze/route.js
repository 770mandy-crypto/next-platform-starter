import { NextResponse } from 'next/server';
import { buildReport } from 'lib/analysis';
import { narrateReport } from 'lib/bot';
import { YahooError, fetchFundamentals, normaliseSymbol } from 'lib/yahoo';
import { fetchHistory } from 'lib/prices';

export const dynamic = 'force-dynamic'; // Prices are live; never serve this from the cache

const STEP_LABELS = {
    cookie: 'Yahoo לא הנפיק cookie של סשן',
    crumb: 'Yahoo לא הנפיק crumb',
    quoteSummary: 'בקשת הנתונים הפונדמנטליים נדחתה'
};

// Yahoo's cookie+crumb handshake is the fragile part of this flow, so the
// report says which stage broke instead of a generic "unavailable" — that is
// what makes a failure in production diagnosable.
function describeFundamentalsFailure(error) {
    const step = error?.step;
    const label = STEP_LABELS[step] || 'שליפת הנתונים הפונדמנטליים נכשלה';
    const detail = error?.message ? ` (${error.message})` : '';
    return `${label}${detail}. הניתוח מבוסס על מחירים בלבד.`;
}

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
            fetchHistory(symbol),
            fetchFundamentals(symbol)
        ]);

        if (historyResult.status === 'rejected') throw historyResult.reason;

        const report = buildReport({
            history: historyResult.value,
            fundamentals: fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null,
            fundamentalsError:
                fundamentalsResult.status === 'rejected' ? describeFundamentalsFailure(fundamentalsResult.reason) : null
        });

        if (withNarration) {
            report.narration = await narrateReport(report);
        }

        return NextResponse.json(report);
    } catch (error) {
        // fetchHistory throws its own error once every provider has been tried,
        // so branch on the status rather than on the Yahoo error class.
        const status = error?.status;
        if (status === 404 || status === 422) {
            return NextResponse.json({ error: `לא מצאתי נתונים עבור ${symbol}.` }, { status: 404 });
        }
        if (status === 502 || error instanceof YahooError) {
            console.error('Price providers failed:', error.attempts ?? error.message);
            return NextResponse.json(
                {
                    error: 'אף ספק נתונים לא הצליח לספק מחירים כרגע.',
                    // The per-provider reasons are what make this debuggable in
                    // production, where the sandbox cannot reach either host.
                    attempts: error.attempts ?? null
                },
                { status: 502 }
            );
        }
        console.error('Analysis failed:', error);
        return NextResponse.json({ error: 'הניתוח נכשל. נסה שוב בעוד רגע.' }, { status: 500 });
    }
}
