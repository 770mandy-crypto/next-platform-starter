// Per-user data: the workspace (project, plan, tasks, memory, chat, actions,
// activity), the approval audit log, and the AI usage quota.

import { randomUUID } from 'node:crypto';
import { consumeLimit, emailIndexKey } from './auth.js';
import { getDb } from './db.js';

export const MAX_WORKSPACE_BYTES = 1_000_000;
export const AI_DAILY_LIMIT = Number(process.env.MASLUL_AI_DAILY_LIMIT) || 150;

const WORKSPACE_FIELDS = ['project', 'plan', 'tasks', 'memory', 'messages', 'actions', 'activity'];

export class WorkspaceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// Keep only the fields the app owns. The account itself (`user`) is never
// taken from the client — it always comes from the session.
export function sanitiseWorkspace(input) {
    const clean = {};
    for (const field of WORKSPACE_FIELDS) {
        const value = input?.[field];
        if (field === 'project' || field === 'plan') clean[field] = value && typeof value === 'object' ? value : null;
        else clean[field] = Array.isArray(value) ? value : [];
    }
    clean.activity = clean.activity.slice(0, 200);
    clean.messages = clean.messages.slice(-300);
    return clean;
}

export async function getWorkspace(userId) {
    const db = await getDb();
    return db.get(`workspaces/${userId}`);
}

export async function saveWorkspace(userId, input) {
    const workspace = sanitiseWorkspace(input);
    if (JSON.stringify(workspace).length > MAX_WORKSPACE_BYTES) {
        throw new WorkspaceError('סביבת העבודה גדולה מדי לשמירה. נסו למחוק היסטוריה ישנה.', 413);
    }
    const db = await getDb();
    const saved = { ...workspace, updatedAt: new Date().toISOString() };
    await db.set(`workspaces/${userId}`, saved);
    return saved;
}

// --- Audit log -------------------------------------------------------------

// One immutable entry per decision or execution. Keys sort by time, so the
// log reads back in order without an index.
export async function recordAudit(userId, entry) {
    const db = await getDb();
    const at = new Date().toISOString();
    const record = { id: randomUUID(), at, ...entry };
    await db.set(`audit/${userId}/${at}_${record.id}`, record);
    return record;
}

export async function listAudit(userId, limit = 100) {
    const db = await getDb();
    const keys = (await db.list(`audit/${userId}/`)).slice(-limit).reverse();
    return Promise.all(keys.map((key) => db.get(key)));
}

// --- AI quota --------------------------------------------------------------

export async function consumeAiQuota(userId) {
    const allowed = await consumeLimit(`ai:${userId}`, { limit: AI_DAILY_LIMIT, windowMs: 86_400_000 });
    if (!allowed) throw new WorkspaceError(`הגעת למכסה היומית (${AI_DAILY_LIMIT} פעולות AI). היא מתחדשת מחר.`, 429);
}

// --- Account deletion ------------------------------------------------------

export async function deleteAccountData(user) {
    const db = await getDb();
    const keys = [
        `workspaces/${user.id}`,
        `users/${user.id}`,
        emailIndexKey(user.email),
        ...(await db.list(`audit/${user.id}/`))
    ];
    await Promise.all(keys.map((key) => db.delete(key)));
}
