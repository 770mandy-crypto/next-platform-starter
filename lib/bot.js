// The bot's voice. Given a finished report, produce a short Hebrew narration.
// Claude writes it when an API key is configured; otherwise we fall back to a
// deterministic summary so the feature never hard-depends on the key.

import Anthropic from '@anthropic-ai/sdk';
import { fallbackMarketNarration, fallbackNarration, formatNumber } from './narration.js';

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

const MARKET_SYSTEM_PROMPT = `אתה "${BOT_NAME}", אנליסט שוק הון ותיק שמדבר עברית טבעית וישירה.

מקבלים ממך תמונת מצב מספרית של השוק כולו — מדדים מרכזיים, ביצועי סקטורים, ורוחב שוק — שכבר חושבה במלואה. התפקיד שלך הוא רק להסביר אותה, לא לחשב מחדש ולא להמציא נתונים.

כללים:
- כתוב 3 עד 5 משפטים, בגוף ראשון, בטון של אנליסט מנוסה.
- פתח באמירה על מצב השוק, ואז נמק בשניים-שלושה נתונים ספציפיים.
- התייחס לרוחב השוק: האם העלייה רחבה או נשענת על מעט סקטורים.
- ציין איזה סקטור מוביל ואיזה פיגר.
- אל תשתמש בכותרות, ברשימות או ב-Markdown. פסקה אחת רציפה.
- אל תבטיח תשואה. סיים במשפט שמבהיר שזו אינה המלצת השקעה אישית.`;

export async function narrateMarket(map) {
    const payload = {
        מצב_שוק: map.verdict?.verdict ?? null,
        ציון_שוק: map.verdict?.score ?? null,
        רוחב_שוק: map.breadth
            ? `${map.breadth.aboveMa50} מתוך ${map.breadth.total} סקטורים מעל ממוצע 50, ${map.breadth.aboveMa200} מעל ממוצע 200`
            : null,
        ציון_ממוצע_סקטורים: map.breadth?.averageScore ?? null,
        מדדים: map.indices
            .filter((entry) => entry.ok && entry.role !== 'volatility')
            .map((entry) => `${entry.label}: ציון ${entry.score}, שנה ${formatNumber(entry.returns?.oneYear, 1)}%`),
        VIX: map.vix?.ok ? formatNumber(map.vix.price, 1) : null,
        סקטור_מוביל: map.sectors.find((entry) => entry.ok)?.label ?? null,
        סקטור_מפגר: [...map.sectors].reverse().find((entry) => entry.ok)?.label ?? null,
        סקטורים: map.sectors
            .filter((entry) => entry.ok)
            .map((entry) => `${entry.label}: ציון ${entry.score}, 3 חודשים ${formatNumber(entry.returns?.threeMonths, 1)}%`)
    };

    if (!isClaudeConfigured()) return { text: fallbackMarketNarration(map), source: 'rules' };

    try {
        const client = new Anthropic();
        const response = await client.messages.create({
            model: 'claude-opus-5',
            max_tokens: 16000,
            system: MARKET_SYSTEM_PROMPT,
            thinking: { type: 'adaptive' },
            output_config: { effort: 'low' },
            messages: [
                {
                    role: 'user',
                    content: `הנה תמונת המצב של השוק. נסח את חוות הדעת שלך:\n\n${JSON.stringify(payload, null, 2)}`
                }
            ]
        });

        const text = response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
            .trim();

        return text ? { text, source: 'claude' } : { text: fallbackMarketNarration(map), source: 'rules' };
    } catch (error) {
        console.error('Claude market narration failed:', error);
        return { text: fallbackMarketNarration(map), source: 'rules', error: error.message };
    }
}


// Re-exported so existing importers keep working unchanged.
export { fallbackNarration, fallbackMarketNarration };
