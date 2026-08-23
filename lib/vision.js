// Reads a stock screenshot with Claude and returns a structured result.
//
// Kept out of the route so the guards and the schema can be tested without
// standing up Next.

import Anthropic, { AnthropicError } from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// Netlify caps a function's request body well below this, and the client
// downscales before upload; this is the backstop for a caller that does not.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export class ImageInputError extends Error {
    constructor(message, { status = 400 } = {}) {
        super(message);
        this.name = 'ImageInputError';
        this.status = status;
    }
}

export function validateImage({ mediaType, data } = {}) {
    if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
        throw new ImageInputError(
            `סוג הקובץ אינו נתמך. אפשר להעלות PNG, JPEG, WEBP או GIF.`
        );
    }
    if (typeof data !== 'string' || !data) {
        throw new ImageInputError('לא התקבלה תמונה.');
    }
    // Base64 carries about a third more bytes than the binary it encodes.
    const approximateBytes = Math.floor((data.length * 3) / 4);
    if (approximateBytes > MAX_IMAGE_BYTES) {
        throw new ImageInputError('התמונה גדולה מדי. נסה צילום קטן יותר.', { status: 413 });
    }
    return { mediaType, data, bytes: approximateBytes };
}

const VisionSchema = z.object({
    symbol: z
        .string()
        .nullable()
        .describe('The ticker symbol visible in the image, without any exchange prefix. Null if not identifiable.'),
    companyName: z.string().nullable().describe('The company name if visible or clearly implied by the ticker.'),
    exchange: z.string().nullable().describe('The exchange if visible, e.g. NASDAQ, NYSE, TASE.'),
    market: z
        .enum(['us', 'israel', 'other', 'unknown'])
        .describe('Which market the instrument trades on, inferred from the app, currency or exchange shown.'),
    confidence: z
        .enum(['high', 'medium', 'low'])
        .describe('How certain the ticker identification is. Use low if it is a guess.'),
    chartReading: z
        .string()
        .describe('A reading of the chart in Hebrew, 3-5 sentences: trend, patterns, support and resistance.'),
    visibleFigures: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .describe('Numbers legible in the image, such as price or change. Empty if none are readable.')
});

const SYSTEM_PROMPT = `אתה "שוקי", אנליסט שוק הון ותיק שמדבר עברית טבעית וישירה.

מקבלים ממך צילום מסך מאפליקציית מסחר או תמונה של גרף מניה. התפקיד שלך הוא לזהות איזה נייר זה, ולקרוא את הגרף שרואים בתמונה.

כללים:
- זהה את הסימבול רק אם הוא באמת נראה או נגזר בבירור מהתמונה. אם אתה מנחש — סמן confidence כ-low.
- market: קבע לפי האפליקציה, המטבע או הבורסה שמופיעים. מניה שנסחרת בתל אביב היא israel.
- chartReading: תאר מה אתה רואה בגרף עצמו — כיוון המגמה, תבניות, רמות תמיכה והתנגדות, ותנודתיות. שלושה עד חמישה משפטים, בגוף ראשון, בלי כותרות ובלי Markdown.
- אל תמציא מספרים שלא מופיעים בתמונה. visibleFigures הוא רק למה שקריא בפועל.
- אל תיתן המלצת קנייה או מכירה כאן. זו קריאה של תמונה בלבד, והניתוח המספרי נעשה בנפרד.`;

export function isVisionConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function readChartImage({ mediaType, data }) {
    const client = new Anthropic();

    let response;
    try {
        response = await client.messages.parse({
            model: 'claude-opus-5',
            max_tokens: 16000,
            system: SYSTEM_PROMPT,
            thinking: { type: 'adaptive' },
            output_config: { effort: 'low', format: zodOutputFormat(VisionSchema) },
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
                        { type: 'text', text: 'זהה את הנייר בתמונה וקרא את הגרף.' }
                    ]
                }
            ]
        });
    } catch (error) {
        // The SDK throws rather than returning null when the model's output does
        // not satisfy the schema. That is the likely outcome for a blurry or
        // cropped screenshot, so it earns its own message instead of falling
        // through to a generic "try again later".
        if (error instanceof AnthropicError && /parse structured output/i.test(error.message)) {
            throw new ImageInputError('לא הצלחתי לקרוא את התמונה. נסה צילום ברור יותר של הגרף.', { status: 422 });
        }
        throw error;
    }

    // A refusal, or any response carrying no text block, leaves nothing to parse.
    if (!response.parsed_output) {
        if (response.stop_reason === 'refusal') {
            throw new ImageInputError('לא יכולתי לנתח את התמונה הזו.', { status: 422 });
        }
        throw new ImageInputError('לא הצלחתי לקרוא את התמונה. נסה צילום ברור יותר של הגרף.', { status: 422 });
    }

    return response.parsed_output;
}
