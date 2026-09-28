import { getAgent } from 'lib/agents/catalog';
import { isAgentChatConfigured, streamAgentReply } from 'lib/agents/chat';
import { toMessages } from 'lib/agents/conversation';
import { acquireReplyLock, releaseReplyLock } from 'lib/agents/lock';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { consumeAiQuota } from 'lib/pilot/workspace';

export const dynamic = 'force-dynamic';

// Everything that can refuse the request runs before the stream opens, so those
// failures reach the browser as ordinary JSON errors with a status code. After
// that the reply streams as newline-delimited JSON events (see lib/agents/chat).
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body || typeof body !== 'object') throw new HttpError('גוף הבקשה אינו JSON תקין.', 400);

    const agent = getAgent(body.agent);
    if (!agent) throw new HttpError('הסוכן לא נמצא.', 400);

    const messages = toMessages(body.history, body.message);
    if (!messages) throw new HttpError('ההודעה ריקה.', 400);

    if (!isAgentChatConfigured()) {
        throw new HttpError('הצ׳אט עם הסוכנים עדיין לא מחובר: חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    }

    // The lock comes before the quota, so a request turned away for being
    // concurrent does not spend quota.
    const lock = await acquireReplyLock(user.id);
    if (!lock) throw new HttpError('יש כבר תשובה בדרך. אפשר לשלוח שוב כשהיא תסתיים.', 429);
    try {
        await consumeAiQuota(user.id);
    } catch (error) {
        await releaseReplyLock(user.id, lock);
        throw error;
    }

    // Generation stops as soon as nobody is reading: when the browser cancels
    // the stream (Stop, a closed tab), when the request itself is aborted, or
    // when a write fails because the stream is already gone.
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
                for await (const event of streamAgentReply({ agentId: agent.id, messages, signal: upstream.signal })) {
                    if (!send(controller, event)) {
                        stop();
                        break;
                    }
                }
            } catch (error) {
                // A reader who went away is not an error worth reporting.
                if (!upstream.signal.aborted) {
                    console.error('Agent chat failed:', error);
                    send(controller, { type: 'error', message: 'הסוכן לא הצליח לענות. נסו שוב.' });
                }
            } finally {
                request.signal.removeEventListener('abort', stop);
                try {
                    controller.close();
                } catch {}
                await releaseReplyLock(user.id, lock).catch((error) => console.error('Agent chat lock release failed:', error));
            }
        },
        cancel() {
            stop();
        }
    });

    return new Response(reply, {
        headers: {
            'content-type': 'application/x-ndjson; charset=utf-8',
            'cache-control': 'no-store'
        }
    });
});
