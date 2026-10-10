import { acquireReplyLock, releaseReplyLock } from 'lib/agents/lock';
import { toMessages } from 'lib/agents/conversation';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { consumeAiQuota } from 'lib/pilot/workspace';
import { isStudioChatConfigured, streamStudioReply } from 'lib/studio/chat';

export const dynamic = 'force-dynamic';

// The studio chat. Same shape as the agents chat: everything that can refuse
// the request runs before the stream opens; then the reply, tool activity and
// started jobs stream as newline-delimited JSON events (see lib/studio/chat).
// The reply lock is shared with the agents chat, so a user has one paid reply
// running at a time across both.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body || typeof body !== 'object') throw new HttpError('גוף הבקשה אינו JSON תקין.', 400);

    const messages = toMessages(body.history, body.message);
    if (!messages) throw new HttpError('ההודעה ריקה.', 400);

    if (!isStudioChatConfigured()) {
        throw new HttpError('הסטודיו עדיין לא מחובר: חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    }

    const lock = await acquireReplyLock(user.id);
    if (!lock) throw new HttpError('יש כבר תשובה בדרך. אפשר לשלוח שוב כשהיא תסתיים.', 429);
    try {
        await consumeAiQuota(user.id);
    } catch (error) {
        await releaseReplyLock(user.id, lock);
        throw error;
    }

    const upstream = new AbortController();
    const stop = () => upstream.abort();
    request.signal.addEventListener('abort', stop, { once: true });
    const context = { userId: user.id, origin: new URL(request.url).origin };

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
                for await (const event of streamStudioReply({ messages, context, signal: upstream.signal })) {
                    if (!send(controller, event)) {
                        stop();
                        break;
                    }
                }
            } catch (error) {
                if (!upstream.signal.aborted) {
                    console.error('Studio chat failed:', error);
                    send(controller, { type: 'error', message: 'הסטודיו לא הצליח לענות. נסו שוב.' });
                }
            } finally {
                request.signal.removeEventListener('abort', stop);
                try {
                    controller.close();
                } catch {}
                await releaseReplyLock(user.id, lock).catch((error) =>
                    console.error('Studio chat lock release failed:', error)
                );
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
