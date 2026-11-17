// Agent-to-agent messages and broadcasts. These are single, tool-less replies:
// the target agent reads the message, answers it in its own role, and the
// caller gets the text back. Used by the WhatsApp channel and by other server
// code that wants a second opinion from another specialist.
//
// Safety rules for delegation: an agent cannot hand a task to itself, cannot
// hand it back to an agent already in the chain (a loop), and a chain is cut
// off after MAX_HOPS agents, so one request cannot fan out without limit.

import Anthropic from '@anthropic-ai/sdk';
import { AGENT_IDS, getAgent } from './catalog.js';
import { MODEL } from './chat.js';
import { agentSystemPrompt } from './prompts.js';

export const MAX_HOPS = 3;
export const MAX_MESSAGE_CHARS = 8_000;
const MAX_TOKENS = 4_000;

export class RelayError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function checkMessage(text) {
    const clean = String(text ?? '').trim();
    if (!clean) throw new RelayError('ההודעה ריקה.');
    if (clean.length > MAX_MESSAGE_CHARS) throw new RelayError('ההודעה ארוכה מדי.');
    return clean;
}

// One reply from one agent. `messages` is the conversation so far, in the
// Anthropic format; the agent's own role comes from prompts.js.
export async function askAgent({ agentId, messages, client = new Anthropic(), signal }) {
    const agent = getAgent(agentId);
    if (!agent) throw new RelayError('הסוכן לא נמצא.');
    const response = await client.messages.create(
        {
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: agentSystemPrompt(agent.id),
            messages
        },
        { signal }
    );
    return (response.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
}

// Hands a task from one agent to another. `chain` lists the agents already
// involved, starting with the first one, so the target can be checked against
// loops and length. The reply is labeled with where it came from.
export async function delegate({ fromAgentId, toAgentId, task, chain = [fromAgentId], client, signal }) {
    const from = getAgent(fromAgentId);
    const to = getAgent(toAgentId);
    if (!from || !to) throw new RelayError('הסוכן לא נמצא.');
    if (fromAgentId === toAgentId) throw new RelayError('סוכן לא יכול להעביר משימה לעצמו.');
    if (chain.includes(toAgentId)) throw new RelayError(`הסוכן ${to.label} כבר מעורב בשרשרת הזו.`, 409);
    if (chain.length >= MAX_HOPS) throw new RelayError('השרשרת ארוכה מדי.', 409);

    const message = checkMessage(task);
    const text = await askAgent({
        agentId: toAgentId,
        messages: [{ role: 'user', content: `[הועבר אליך מהסוכן ${from.label}]\n${message}` }],
        client,
        signal
    });
    return { agentId: toAgentId, label: to.label, text, chain: [...chain, toAgentId] };
}

// The same message to every agent, in parallel. One agent failing does not
// stop the others: each result says whether it worked.
export async function askEveryAgent({ message, client, ids = AGENT_IDS, signal }) {
    const text = checkMessage(message);
    return Promise.all(
        ids.map(async (agentId) => {
            const label = getAgent(agentId)?.label ?? agentId;
            try {
                const reply = await askAgent({ agentId, messages: [{ role: 'user', content: text }], client, signal });
                return { agentId, label, ok: true, text: reply };
            } catch (error) {
                return { agentId, label, ok: false, error: error?.message || 'הסוכן לא הצליח לענות.' };
            }
        })
    );
}
