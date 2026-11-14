// Where the agent's messages go. A real number gets them through WhatsApp; a
// simulator number (starting 999, which no country uses) gets them in an
// outbox the /whatsapp/simulator page reads. The engine does not know which:
// the same code path answers both, which is what makes the simulator a real
// test of the agent.

import { randomBytes } from 'node:crypto';
import { getDb } from '../pilot/db.js';
import * as api from './api.js';

export const SIMULATOR_PREFIX = '999';
export const isSimulated = (phone) => typeof phone === 'string' && phone.startsWith(SIMULATOR_PREFIX);

// A stable simulator number for a signed-in site user.
export function simulatorPhone(userId) {
    let hash = 0;
    for (const ch of String(userId)) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_000_000;
    return `${SIMULATOR_PREFIX}${String(hash).padStart(9, '0')}`;
}

const OUTBOX_KEEP = 200;

async function pushOutbox(phone, text, me = false) {
    const db = await getDb();
    const at = Date.now();
    await db.set(`wa/outbox/${phone}/${String(at).padStart(15, '0')}-${randomBytes(3).toString('hex')}`, { text, at, ...(me ? { me: true } : {}) });
    const keys = await db.list(`wa/outbox/${phone}/`);
    await Promise.all(keys.slice(0, Math.max(0, keys.length - OUTBOX_KEEP)).map((key) => db.delete(key)));
}

// The person's own message, so the simulator shows both sides after a reload.
export const recordSimulatorMessage = (phone, text) => pushOutbox(phone, text, true);

// Messages for a simulator number, oldest first, after the cursor `since`
// (the key of the last message already shown).
export async function readOutbox(phone, since = '') {
    const db = await getDb();
    const keys = (await db.list(`wa/outbox/${phone}/`)).filter((key) => key > since);
    const items = await Promise.all(keys.map(async (key) => ({ key, ...(await db.get(key)) })));
    return items.filter((item) => item.text);
}

export async function clearOutbox(phone) {
    const db = await getDb();
    await Promise.all((await db.list(`wa/outbox/${phone}/`)).map((key) => db.delete(key)));
}

export function outbound(phone) {
    if (isSimulated(phone)) {
        return {
            simulated: true,
            text: (text) => pushOutbox(phone, text),
            template: ({ params }) => pushOutbox(phone, `⏰ תזכורת: ${params[0]}`),
            typing: async () => {}
        };
    }
    return {
        simulated: false,
        text: (text) => api.sendText(phone, text),
        template: (options) => api.sendTemplate(phone, options),
        typing: (messageId) => api.markReadAndTyping(messageId)
    };
}
