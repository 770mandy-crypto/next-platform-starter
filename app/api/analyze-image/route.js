import { NextResponse } from 'next/server';
import { buildReport } from 'lib/analysis';
import { fetchCompanyFundamentals } from 'lib/fundamentals';
import { fetchHistory } from 'lib/prices';
import { resolveSymbol } from 'lib/resolve-symbol';
import { ImageInputError, isVisionConfigured, readChartImage, validateImage } from 'lib/vision';

export const dynamic = 'force-dynamic';

// The two halves of this page have different dependencies. The chart reading
// needs only an Anthropic key; the full report additionally needs a price
// provider. Reporting them separately is what lets the page show one when the
// other is unavailable, rather than failing whole.
const NO_REPORT_REASONS = {
    'no-symbol': 'לא הצלחתי לזהות סימבול בתמונה, אז יש כאן קריאת גרף בלבד.',
    'low-confidence':
        'זיהיתי סימבול אפשרי אבל לא בוודאות מספקת, ולא רציתי להציג ניתוח של חברה אחרת. יש כאן קריאת גרף בלבד.',
    'invalid-symbol': 'מה שזיהיתי לא נראה כמו סימבול תקין, אז יש כאן קריאת גרף בלבד.'
};

export async function POST(request) {
    if (!isVisionConfigured()) {
        return NextResponse.json(
            {
                error: 'unconfigured',
                headline: 'ניתוח תמונה דורש מפתח Claude',
                detail:
                    'הוסף ANTHROPIC_API_KEY במשתני הסביבה כדי להפעיל את קריאת התמונות. שאר הדפים עובדים בלעדיו.'
            },
            { status: 503 }
        );
    }

    let image;
    try {
        const body = await request.json();
        image = validateImage({ mediaType: body?.mediaType, data: body?.data });
    } catch (error) {
        if (error instanceof ImageInputError) {
            return NextResponse.json({ error: 'bad-image', detail: error.message }, { status: error.status });
        }
        return NextResponse.json({ error: 'bad-request', detail: 'הבקשה לא תקינה.' }, { status: 400 });
    }

    let vision;
    try {
        // The image is held only for this call — never written to disk or logged.
        vision = await readChartImage(image);
    } catch (error) {
        if (error instanceof ImageInputError) {
            return NextResponse.json({ error: 'unreadable', detail: error.message }, { status: error.status });
        }
        console.error('Vision call failed:', error.message);
        return NextResponse.json(
            { error: 'vision-failed', detail: 'קריאת התמונה נכשלה. נסה שוב בעוד רגע.' },
            { status: 502 }
        );
    }

    const { symbol, reason } = resolveSymbol(vision);
    if (!symbol) {
        return NextResponse.json({ vision, report: null, dataError: NO_REPORT_REASONS[reason] });
    }

    // From here the pipeline is exactly the typed-symbol path.
    const [historyResult, fundamentalsResult] = await Promise.allSettled([
        fetchHistory(symbol),
        fetchCompanyFundamentals(symbol)
    ]);

    if (historyResult.status === 'rejected') {
        const notFound = historyResult.reason?.status === 404;
        return NextResponse.json({
            vision,
            resolvedSymbol: symbol,
            report: null,
            dataError: notFound
                ? `זיהיתי את ${symbol}, אבל לא מצאתי עבורו נתוני מחיר אצל אף ספק.`
                : `זיהיתי את ${symbol}, אבל אף ספק מחירים לא זמין כרגע. יש כאן קריאת גרף בלבד.`
        });
    }

    const report = buildReport({
        history: historyResult.value,
        fundamentals: fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null,
        fundamentalsError:
            fundamentalsResult.status === 'rejected' ? 'נתונים פונדמנטליים לא זמינים — הניתוח טכני בלבד.' : null
    });

    return NextResponse.json({ vision, resolvedSymbol: symbol, report, dataError: null });
}
