// Starting a mission from a request, and handing it to whatever runs it.
//
// On Netlify a mission runs in a background function (up to 15 minutes, see
// netlify/functions/mendi-run-background.mjs), so a long multi-agent job
// never hits the time limit of an ordinary request and keeps running when the
// user closes the page. Anywhere else (local `npm run dev`), it runs in the
// same server process after the response is sent.

import { randomBytes } from 'node:crypto';
import { getDb } from '../pilot/db.js';
import { consumeAiQuota } from '../pilot/workspace.js';
import { getAgent } from './agents.js';
import { acquireMissionLock, createMission, releaseMissionLock, saveMission } from './store.js';

export const BACKGROUND_PATH = '/.netlify/functions/mendi-run-background';
export const MAX_MESSAGE_CHARS = 60_000;

export class MissionError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export function isMendiConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

function onNetlify() {
    return Boolean(
        process.env.NETLIFY || process.env.SITE_ID || globalThis.netlifyBlobsContext || process.env.NETLIFY_BLOBS_CONTEXT
    );
}

export async function createQueuedMission(user, { room, message }) {
    const agent = getAgent(room);
    if (!agent) throw new MissionError('אין סוכן כזה.', 400);
    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) throw new MissionError('ההודעה ריקה.', 400);
    if (text.length > MAX_MESSAGE_CHARS) throw new MissionError('ההודעה ארוכה מדי.', 413);
    if (!isMendiConfigured()) {
        throw new MissionError('MENDI AI עדיין לא מחובר: חסר מפתח ANTHROPIC_API_KEY בהגדרות האתר.', 503);
    }

    // The lock is claimed under a provisional id, then moved to the real one,
    // so two quick sends cannot both create a mission.
    const claim = `claim-${randomBytes(8).toString('hex')}`;
    if (!(await acquireMissionLock(user.id, claim))) {
        throw new MissionError('הצוות עדיין עובד על המשימה הקודמת. אפשר לשלוח כשהיא תסתיים.', 429);
    }
    let mission;
    try {
        await consumeAiQuota(user.id);
        mission = await createMission(user.id, {
            room: agent.id,
            agentId: agent.id,
            message: text,
            dispatchToken: randomBytes(24).toString('hex')
        });
        const db = await getDb();
        await db.set(`mendi/${user.id}/running`, { at: Date.now(), missionId: mission.id });
    } catch (error) {
        await releaseMissionLock(user.id, claim);
        throw error;
    }
    return mission;
}

// Hands the mission to the background function. Returns true when Netlify
// accepted it (202); false means the caller should run it in-process.
export async function dispatchToBackground(mission, { userId, origin }) {
    if (!onNetlify()) return false;
    try {
        const response = await fetch(`${origin}${BACKGROUND_PATH}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ userId, missionId: mission.id, token: mission.dispatchToken })
        });
        return response.status === 202;
    } catch (error) {
        console.error('MENDI background dispatch failed:', error);
        return false;
    }
}

export async function markFailed(userId, mission, error) {
    await saveMission(userId, { ...mission, status: 'failed', error, endedAt: new Date().toISOString() });
    await releaseMissionLock(userId, mission.id);
}

// What the browser sees of a mission.
export function publicMission(mission) {
    if (!mission) return null;
    const { dispatchToken, ...rest } = mission;
    return rest;
}
