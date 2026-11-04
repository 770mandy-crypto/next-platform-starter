// Runs one MENDI AI mission in the background (Netlify background functions
// answer 202 at once and may run for up to 15 minutes). The Next.js route that
// creates the mission calls this with the mission's one-time dispatch token,
// so nobody else can start or restart a run.

import { getDb } from '../../lib/pilot/db.js';
import { runMission } from '../../lib/mendi/run.js';
import { getMission } from '../../lib/mendi/store.js';
import { timingSafeEqual } from 'node:crypto';

// Inside a Netlify function the Blobs context is always present.
process.env.MASLUL_STORE ||= 'netlify';

const same = (a, b) => {
    const left = Buffer.from(String(a ?? ''));
    const right = Buffer.from(String(b ?? ''));
    return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
};

export default async (request) => {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    let body;
    try {
        body = await request.json();
    } catch {
        return new Response('Bad request', { status: 400 });
    }
    const { userId, missionId, token } = body ?? {};
    if (typeof userId !== 'string' || !/^[\w-]{10,80}$/.test(userId)) return new Response('Bad request', { status: 400 });

    const mission = await getMission(userId, missionId);
    if (!mission || !same(mission.dispatchToken, token)) return new Response('Not found', { status: 404 });

    const db = await getDb();
    const user = await db.get(`users/${userId}`);
    const origin = new URL(request.url).origin;
    await runMission({ userId, missionId, user: user ? { name: user.name, email: user.email } : null, origin });
    return new Response('ok');
};
