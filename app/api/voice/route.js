import { NextResponse } from 'next/server';
import { toMessages } from 'lib/agents/conversation';
import { isVoiceAgentConfigured, runVoiceAgent } from 'lib/voice/agent';
import { HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { consumeAiQuota } from 'lib/pilot/workspace';

export const dynamic = 'force-dynamic';

// One voice turn: the browser sends what was said (as text) plus the chat so
// far, and gets back the agent's reply as text, which the browser reads aloud.
// Signed-in users only, and each turn counts against the account's AI quota.
export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!body || typeof body !== 'object') throw new HttpError('גוף הבקשה אינו JSON תקין.', 400);

    const messages = toMessages(body.history, body.message);
    if (!messages) throw new HttpError('ההודעה ריקה.', 400);

    if (!isVoiceAgentConfigured()) {
        throw new HttpError('הסוכן הקולי עדיין לא מחובר: חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    }

    await consumeAiQuota(user.id);
    const { text, toolCalls } = await runVoiceAgent({ messages });
    return NextResponse.json({ reply: text || 'לא הצלחתי לנסח תשובה. נסו שוב.', toolCalls });
});
