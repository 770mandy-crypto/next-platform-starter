import { NextResponse } from 'next/server';
import { buildReport } from 'lib/analysis';
import { narrateReport } from 'lib/bot';
import { YahooError, normaliseSymbol } from 'lib/yahoo';
import { fetchCompanyFundamentals } from 'lib/fundamentals';
import { fetchHistory } from 'lib/prices';
import { withRequestKeys } from 'lib/request-key';

export const dynamic = 'force-dynamic'; // Prices are live; never serve this from the cache

// A missing key is a configuration state, not a fault, so it reads as a setup
// instruction rather than an error. Anything else names the provider and the
// stage that broke — a generic "unavailable" gives nothing to debug from.
function describeFundamentalsFailure(error) {
    if (error?.unconfigured) {
        return (
            'נתונים פונדמנטליים אינם זמינים: Yahoo חוסם את השרת, ולא הוגדר מפתח Finnhub. ' +
            'הוסף FINNHUB_API_KEY במשתני הסביבה כדי להפעיל אותם. הניתוח מבוסס על מחירים בלבד.'
        );
    }

    const attempts = error?.attempts?.length
        ? error.attempts.map((attempt) => `${attempt.provider}: ${attempt.error}`).join(' | ')
        : error?.message;

    return `שליפת הנתונים הפונדמנטליים נכשלה (${attempts}). הניתוח מבוסס על מחירים בלבד.`;
}

async function handleGET(request) {
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
            fetchCompanyFundamentals(symbol)
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

// A key pasted into the site arrives on the request rather than from the
// host's environment, so every handler runs inside the store that carries it.
export const GET = (request) => withRequestKeys(request, () => handleGET(request));
