import { NextResponse } from 'next/server';
import { consumeLimit } from 'lib/pilot/auth';
import { clientIp } from 'lib/pilot/http';
import { MAX_BODY_BYTES, parseLetterRequest, RequestError } from 'lib/letters/request';
import { isWriterConfigured, writeLetter } from 'lib/letters/writer';
import { ndjsonResponse } from 'lib/research/response';

export const dynamic = 'force-dynamic';

// Letters per address per day: open to anyone, so this caps the cost.
const DAILY_LIMIT = () => Number(process.env.LETTERS_DAILY_LIMIT) || 8;

const fail = (message, status) => NextResponse.json({ error: message }, { status });

// Writes one letter. Everything that can refuse runs first and answers with a
// JSON error; then the research and the letter stream as newline-delimited
// JSON events (see lib/letters/writer.js).
export async function POST(request) {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail('הבקשה גדולה מדי. נסו קובץ מצורף קטן יותר.', 413);
    let input;
    try {
        input = parseLetterRequest(JSON.parse(raw || '{}'));
    } catch (error) {
        if (error instanceof RequestError) return fail(error.message, error.status);
        return fail('הבקשה לא תקינה.', 400);
    }
    if (!isWriterConfigured()) return fail('כותב המכתבים עדיין לא מחובר: חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    try {
        if (!(await consumeLimit(`letters:${clientIp(request)}`, { limit: DAILY_LIMIT(), windowMs: 24 * 60 * 60_000 }))) {
            return fail('הגעתם למכסת המכתבים היומית. אפשר לנסות שוב מחר.', 429);
        }
    } catch (error) {
        console.error('Letters rate limit unavailable:', error);
        return fail('השירות לא זמין כרגע. נסו שוב בעוד כמה דקות.', 503);
    }
    return ndjsonResponse(request, (signal) => writeLetter({ input, signal }), 'Letter writing');
}
