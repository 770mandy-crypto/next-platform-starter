import { getAgent } from 'lib/agents/catalog';
import { isAgentChatConfigured, streamAgentReply } from 'lib/agents/chat';
import { toMessages } from 'lib/agents/conversation';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { consumeAiQuota } from 'lib/pilot/workspace';

export const dynamic = 'force-dynamic';

// Everything that can refuse the request runs before the stream opens, so those
// failures reach the browser as ordinary JSON errors with a status code. After
// that the reply streams as newline-delimited JSON events (see lib/agents/chat).
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);

    const agent = getAgent(body.agent);
    if (!agent) throw new HttpError('הסוכן לא נמצא.', 400);

    const messages = toMessages(body.history, body.message);
    if (!messages) throw new HttpError('ההודעה ריקה.', 400);

    if (!isAgentChatConfigured()) {
        throw new HttpError('הצ׳אט עם הסוכנים עדיין לא מחובר: חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    }

    await consumeAiQuota(user.id);

    const encoder = new TextEncoder();
    // Once the reader has gone, the stream is closed and writes throw; there is
    // no one left to tell, so those are dropped.
    const send = (controller, event) => {
        try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {}
    };

    const reply = new ReadableStream({
        async start(controller) {
            try {
                for await (const event of streamAgentReply({ agentId: agent.id, messages, signal: request.signal })) {
                    send(controller, event);
                }
            } catch (error) {
                // A reader who closed the tab is not an error worth reporting.
                if (!request.signal.aborted) {
                    console.error('Agent chat failed:', error);
                    send(controller, { type: 'error', message: 'הסוכן לא הצליח לענות. נסו שוב.' });
                }
            } finally {
                try {
                    controller.close();
                } catch {}
            }
        }
    });

    return new Response(reply, {
        headers: {
            'content-type': 'application/x-ndjson; charset=utf-8',
            'cache-control': 'no-store'
        }
    });
});
