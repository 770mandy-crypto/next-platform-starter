// A single, plain-language answer to "why are fundamentals not working?".
//
// The development sandbox cannot reach the deployed host, so this failure can
// only be diagnosed from inside the running app. This turns the three likely
// causes — variable never reached the function, key rejected, quota spent —
// into one sentence the user can act on, instead of a JSON blob to relay.

import { NextResponse } from 'next/server';
import { fetchFinnhubFundamentals, isFinnhubConfigured } from 'lib/providers/finnhub';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (!isFinnhubConfigured()) {
        return NextResponse.json({
            ok: false,
            cause: 'missing',
            headline: 'המשתנה FINNHUB_API_KEY לא הגיע לפונקציה',
            // Env vars are captured per deploy, and a Deploy Preview only sees a
            // variable whose context includes deploy previews — the usual trap
            // when the value was added as production-only.
            detail:
                'המפתח לא קיים בסביבת ההרצה. שתי סיבות אפשריות: (1) המשתנה מוגדר ל-Production בלבד, ואתה צופה ב-Deploy Preview — ב-Netlify: Site configuration → Environment variables → FINNHUB_API_KEY → Edit → בחר "Same value for all deploy contexts". (2) המשתנה נוסף אחרי הפריסה האחרונה — הרץ Retry deploy כדי שייקלט.'
        });
    }

    try {
        const fundamentals = await fetchFinnhubFundamentals('AAPL');
        return NextResponse.json({
            ok: true,
            cause: 'ok',
            headline: 'Finnhub עובד — הנתונים הפונדמנטליים פעילים',
            detail: `בדיקה על AAPL החזירה: ${fundamentals.name || 'ללא שם'}, מכפיל רווח ${
                fundamentals.trailingPE?.toFixed(1) ?? 'לא זמין'
            }, שולי רווח ${fundamentals.profitMargin?.toFixed(1) ?? 'לא זמין'}%.`
        });
    } catch (error) {
        const status = error?.status;
        const cause = status === 401 || status === 403 ? 'rejected' : status === 429 ? 'quota' : 'error';
        const headline =
            cause === 'rejected'
                ? 'המפתח הגיע לפונקציה אבל Finnhub דחה אותו'
                : cause === 'quota'
                  ? 'המפתח תקין אבל נגמרה מכסת הקריאות'
                  : 'המפתח הגיע לפונקציה אבל הקריאה נכשלה';
        const detail =
            cause === 'rejected'
                ? 'בדוק שהמפתח הועתק במלואו ובלי רווחים, ושהוא המפתח מ-finnhub.io ולא ממקום אחר.'
                : cause === 'quota'
                  ? 'המסלול החינמי מוגבל ל-60 קריאות לדקה. המתן דקה ונסה שוב.'
                  : `פרטי השגיאה: ${error?.message || 'לא ידוע'}`;

        return NextResponse.json({ ok: false, cause, headline, detail, status: status ?? null });
    }
}
