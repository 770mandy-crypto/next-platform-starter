import { toMessages } from 'lib/agents/conversation';
import { isNadlanAgentConfigured, streamNadlanReply } from 'lib/nadlan/agent';
import { consumeLimit } from 'lib/pilot/auth';
import { clientIp, HttpError, readJson, route } from 'lib/pilot/http';

export const dynamic = 'force-dynamic';

// The page is public, so each visitor (by IP) gets a limited number of answers
// per hour; every answer is a paid model call.
const LIMIT = { limit: 20, windowMs: 60 * 60_000 };

export const POST = route(async (request) => {
    const body = await readJson(request);
    const messages = toMessages(body?.history, body?.message);
    if (!messages) throw new HttpError('ההודעה ריקה.', 400);

    if (!isNadlanAgentConfigured()) {
        throw new HttpError('הסוכן עדיין לא מחובר: חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    }
    if (!(await consumeLimit(`nadlan-agent:${clientIp(request)}`, LIMIT))) {
        throw new HttpError('הגעתם למספר השאלות המרבי לשעה. נסו שוב מאוחר יותר.', 429);
    }

    const upstream = new AbortController();
    const stop = () => upstream.abort();
    request.signal.addEventListener('abort', stop, { once: true });

    const encoder = new TextEncoder();
    const send = (controller, event) => {
        try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            return true;
        } catch {
            return false;
        }
    };

    const reply = new ReadableStream({
        async start(controller) {
            try {
                for await (const event of streamNadlanReply({ messages, signal: upstream.signal })) {
                    if (!send(controller, event)) {
                        stop();
                        break;
                    }
                }
            } catch (error) {
                if (!upstream.signal.aborted) {
                    console.error('Nadlan agent failed:', error);
                    send(controller, { type: 'error', message: 'הסוכן לא הצליח לענות. נסו שוב.' });
                }
            } finally {
                request.signal.removeEventListener('abort', stop);
                try {
                    controller.close();
                } catch {}
            }
        },
        cancel() {
            stop();
        }
    });

    return new Response(reply, {
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' }
    });
});
