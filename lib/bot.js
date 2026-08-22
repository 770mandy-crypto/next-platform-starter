// The bot's voice. Given a finished report, produce a short Hebrew narration.
// Claude writes it when an API key is configured; otherwise we fall back to a
// deterministic summary so the feature never hard-depends on the key.

import Anthropic from '@anthropic-ai/sdk';

export const BOT_NAME = 'שוקי';

const SYSTEM_PROMPT = `אתה "${BOT_NAME}", אנליסט שוק הון ותיק שמדבר עברית טבעית וישירה.

מקבלים ממך דוח ניתוח מספרי שכבר חושב במלואו. התפקיד שלך הוא רק להסביר אותו — לא לחשב מחדש ולא להמציא נתונים שלא הופיעו בדוח.

כללים:
- כתוב 3 עד 5 משפטים, בגוף ראשון, בטון של אנליסט מנוסה שמדבר עם חבר.
- פתח בשורה התחתונה, ואז נמק אותה בשניים-שלושה נתונים ספציפיים מהדוח.
- ציין תמיד את הסיכון או החולשה המרכזית, גם כשהציון גבוה.
- אל תשתמש בכותרות, ברשימות או ב-Markdown. פסקה אחת רציפה.
- אל תבטיח תשואה ואל תשתמש בביטויים כמו "בטוח" או "מובטח".
- סיים במשפט אחד שמבהיר שזו אינה המלצת השקעה אישית.`;

function formatNumber(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : 'לא זמין';
}

// Only the fields the narration actually needs — keeps the prompt small and
// stops Claude from inventing detail from unrelated raw data.
function toPromptPayload(report) {
    return {
        סימבול: report.symbol,
        שם: report.name,
        סקטור: report.sector,
        מחיר: formatNumber(report.price),
        מטבע: report.currency,
        ציון_כולל: report.overall?.score ?? null,
        המלצה: report.overall?.verdict ?? null,
        ציון_טכני: report.technical?.score ?? null,
        ציון_פונדמנטלי: report.fundamental?.score ?? null,
        תשואה_שנה: formatNumber(report.technical?.metrics?.returns?.oneYear, 1),
        תשואה_3_חודשים: formatNumber(report.technical?.metrics?.returns?.threeMonths, 1),
        RSI: formatNumber(report.technical?.metrics?.rsi, 1),
        תנודתיות_שנתית: formatNumber(report.technical?.metrics?.volatility, 1),
        ירידה_מקסימלית: formatNumber(report.technical?.metrics?.maxDrawdown, 1),
        סיגנלים_טכניים: report.technical?.signals?.map((s) => `${s.label}: ${s.note}`),
        סיגנלים_פונדמנטליים: report.fundamental?.signals?.map((s) => `${s.label}: ${s.note}`) ?? null,
        קונצנזוס_אנליסטים: report.analystConsensus?.recommendation ?? null,
        מחיר_יעד: formatNumber(report.analystConsensus?.targetPrice)
    };
}

export function isClaudeConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function narrateReport(report) {
    if (!isClaudeConfigured()) {
        return { text: fallbackNarration(report), source: 'rules' };
    }

    try {
        const client = new Anthropic();
        const response = await client.messages.create({
            model: 'claude-opus-5',
            max_tokens: 16000,
            system: SYSTEM_PROMPT,
            thinking: { type: 'adaptive' },
            output_config: { effort: 'low' },
            messages: [
                {
                    role: 'user',
                    content: `הנה דוח הניתוח. נסח את חוות הדעת שלך:\n\n${JSON.stringify(
                        toPromptPayload(report),
                        null,
                        2
                    )}`
                }
            ]
        });

        const text = response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
            .trim();

        if (!text) return { text: fallbackNarration(report), source: 'rules' };
        return { text, source: 'claude' };
    } catch (error) {
        // The numeric report is the product; a missing narration must never
        // take the whole analysis down with it.
        console.error('Claude narration failed:', error);
        return { text: fallbackNarration(report), source: 'rules', error: error.message };
    }
}

// Deterministic Hebrew summary assembled from the strongest signals, used when
// no API key is set or when the API call fails.
export function fallbackNarration(report) {
    const { overall, technical, fundamental } = report;
    if (!overall) return 'לא הצלחתי להפיק ניתוח עבור הנייר הזה.';

    const allSignals = [...(technical?.signals ?? []), ...(fundamental?.signals ?? [])].filter(
        (item) => item.impact !== null
    );
    const positives = allSignals
        .filter((item) => item.impact > 0.25)
        .sort((a, b) => b.impact - a.impact)
        .slice(0, 2);
    const negatives = allSignals
        .filter((item) => item.impact < -0.15)
        .sort((a, b) => a.impact - b.impact)
        .slice(0, 2);

    const oneYear = technical?.metrics?.returns?.oneYear;
    const parts = [`השורה התחתונה על ${report.name} (${report.symbol}): ${overall.verdict}, בציון ${overall.score} מתוך 100.`];

    if (Number.isFinite(oneYear)) {
        parts.push(
            `בשנה האחרונה הנייר ${oneYear >= 0 ? 'עלה' : 'ירד'} ב-${Math.abs(oneYear).toFixed(1)}%.`
        );
    }

    if (positives.length) {
        parts.push(`מה שעובד לטובתו: ${positives.map((item) => item.note).join('; ')}.`);
    }

    if (negatives.length) {
        parts.push(`מה שמדאיג אותי: ${negatives.map((item) => item.note).join('; ')}.`);
    } else {
        parts.push('לא זיהיתי סיגנל שלילי בולט, אבל היעדר דגל אדום הוא לא ערובה לכלום.');
    }

    parts.push('זו אינה המלצת השקעה אישית — קבל החלטות לפי המצב והצרכים שלך.');
    return parts.join(' ');
}
