// One live answer to "is this configured, and if not, what exactly do I do?".
//
// Each provider is actually called, not just checked for a key, because the
// three failure modes need three different fixes and only a real request can
// tell them apart: the variable never reached the function (a Netlify deploy
// context problem), the key was rejected (a wrong value), or the quota is
// spent (wait). Reporting them as one "not working" is what turned earlier
// debugging into repeated guesswork.

import { NextResponse } from 'next/server';
import { fetchTwelveDataHistory, isTwelveDataConfigured } from 'lib/providers/twelvedata';
import { fetchFinnhubFundamentals, isFinnhubConfigured } from 'lib/providers/finnhub';
import { isGoogleConfigured } from 'lib/auth.js';

export const dynamic = 'force-dynamic';

// The card text stays Hebrew-only on purpose. Netlify's menu paths are English
// with arrows, and inline in an RTL sentence they reorder into something hard
// to follow — those belong in the step list, where they sit in code blocks that
// hold their direction.
async function checkProvider({ key, configured, probe, label, missingHint }) {
    if (!configured) {
        return {
            key,
            label,
            state: 'missing',
            headline: `${key} לא הוגדר`,
            detail: `${missingHint} השלבים המדויקים מופיעים למטה.`
        };
    }

    try {
        const result = await probe();
        return { key, label, state: 'ok', headline: `${label} עובד`, detail: result };
    } catch (error) {
        const status = error?.status;
        if (status === 401 || status === 403) {
            return {
                key,
                label,
                state: 'rejected',
                headline: `המפתח הגיע לשרת, אבל ${label} דחה אותו`,
                detail: 'בדוק שהערך הועתק במלואו, בלי רווחים בהתחלה או בסוף, ושהוא מהחשבון הנכון.'
            };
        }
        if (status === 429) {
            return {
                key,
                label,
                state: 'quota',
                headline: `המפתח תקין, אבל נגמרה המכסה ב-${label}`,
                detail: 'המסלול החינמי מוגבל. המתן דקה ולחץ "בדוק שוב".'
            };
        }
        return {
            key,
            label,
            state: 'error',
            headline: `המפתח הגיע לשרת, אבל הקריאה ל-${label} נכשלה`,
            detail: error?.message || 'שגיאה לא ידועה.'
        };
    }
}

// Reports which relevant variable NAMES the function can see — never a value.
// A key that is added, redeployed, and still invisible is usually one of: the
// wrong Netlify site, a deploy context that excludes this one, a scope that
// excludes Functions, or a typo in the name. Those look identical from outside
// and different from in here, so this is what separates them.
function environmentReport() {
    const names = Object.keys(process.env);
    const relevant = names.filter((name) => /TWELVE|FINNHUB|ANTHROPIC|STOOQ|YAHOO|AUTH_SECRET|GOOGLE_CLIENT/i.test(name));

    return {
        // Presence and length only. A length of 0 means the variable exists but
        // is empty, which is a different fix from it being absent.
        relevantVariables: relevant.map((name) => ({ name, length: (process.env[name] || '').length })),
        totalVariables: names.length,
        // Netlify sets these; they confirm which site and context is answering.
        site: process.env.SITE_NAME || null,
        context: process.env.CONTEXT || null,
        branch: process.env.BRANCH || null,
        deployId: process.env.DEPLOY_ID || null
    };
}

export async function GET() {
    const [prices, fundamentals] = await Promise.all([
        checkProvider({
            key: 'TWELVEDATA_API_KEY',
            label: 'Twelve Data',
            configured: isTwelveDataConfigured(),
            missingHint: 'זהו המפתח שמביא את המחירים, ובלעדיו אף דף לא יציג נתונים. מפתח חינמי מ-twelvedata.com.',
            probe: async () => {
                const history = await fetchTwelveDataHistory('AAPL', { outputsize: 30 });
                return `בדיקה על AAPL החזירה ${history.candles.length} ימי מסחר, מחיר אחרון ${history.price.toFixed(2)}.`;
            }
        }),
        checkProvider({
            key: 'FINNHUB_API_KEY',
            label: 'Finnhub',
            configured: isFinnhubConfigured(),
            missingHint: 'זהו המפתח שמביא נתוני חברות. בלעדיו הניתוח עובד, אבל טכני בלבד. מפתח חינמי מ-finnhub.io.',
            probe: async () => {
                const f = await fetchFinnhubFundamentals('AAPL');
                return `בדיקה על AAPL החזירה ${f.name || 'ללא שם'}, מכפיל רווח ${f.trailingPE?.toFixed(1) ?? 'לא זמין'}.`;
            }
        })
    ]);

    // Prices are the blocking dependency; fundamentals only enrich the score.
    const ready = prices.state === 'ok';
    const accounts = {
        secretConfigured: Boolean(process.env.AUTH_SECRET),
        googleConfigured: isGoogleConfigured(),
        headline: process.env.AUTH_SECRET
            ? isGoogleConfigured()
                ? 'התחברות עם אימייל ועם Google פעילות שתיהן'
                : 'התחברות עם אימייל פעילה. AUTH_SECRET מוגדר, אבל Google לא — כפתור ה-Google פשוט מוסתר'
            : 'AUTH_SECRET לא מוגדר — הכרחי בסביבת ייצור, אחרת כל פריסה מנתקת את כל המשתמשים'
    };

    return NextResponse.json({
        ready,
        full: ready && fundamentals.state === 'ok',
        headline: ready
            ? fundamentals.state === 'ok'
                ? 'הכל מוגדר — מחירים ונתוני חברות פעילים'
                : 'המחירים עובדים. נתוני החברות עדיין לא מוגדרים, והניתוח יהיה טכני בלבד'
            : 'המחירים לא מוגדרים — זה מה שחוסם את הכל',
        prices,
        fundamentals,
        accounts,
        environment: environmentReport(),
        checkedAt: new Date().toISOString()
    });
}
