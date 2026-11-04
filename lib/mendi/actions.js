// Runs an approved outside action: sends the mail or the WhatsApp message it
// describes, and records the outcome on the action, in the activity log and in
// the site's audit log. Called from the approvals route, and from a tool when
// the user allowed that kind of action to run by itself.

import { recordAudit } from '../pilot/workspace.js';
import { sendEmail, sendWhatsApp } from './connectors.js';
import { fileUrl, getFileMeta, loadFileData, logActivity, normaliseRecipient, saveAction, transitionAction } from './store.js';

export function recipientsOf(action) {
    return action.kind === 'email' ? [...action.to, ...(action.cc ?? [])] : action.to;
}

export function canRunByItself(action, settings) {
    if (!settings.autoApprove?.[action.kind]) return false;
    const trusted = new Set(settings.trustedRecipients ?? []);
    return recipientsOf(action).every((value) => trusted.has(normaliseRecipient(value)));
}

async function attachmentsOf(userId, ids = []) {
    const files = [];
    for (const id of ids) {
        const meta = await getFileMeta(userId, id);
        const stored = meta && (await loadFileData(id));
        if (!stored) throw new Error(`הקובץ המצורף ${id} לא נמצא.`);
        files.push({ id, name: meta.name, type: meta.type, data: stored.data });
    }
    return files;
}

// `action` must already be in the "sending" state (claimed with
// transitionAction), so it runs once however many times approve is pressed.
export async function executeAction(userId, action, { origin, approvedBy }) {
    try {
        const files = await attachmentsOf(userId, action.attachments);
        let result;
        if (action.kind === 'email') {
            result = await sendEmail({
                to: action.to,
                cc: action.cc ?? [],
                subject: action.subject,
                body: action.body,
                attachments: files
            });
        } else if (action.kind === 'whatsapp') {
            result = await sendWhatsApp({
                to: action.to,
                text: action.body,
                documents: files.map((file) => ({ name: file.name, url: fileUrl(origin, file.id) }))
            });
        } else {
            throw new Error(`Unknown action kind ${action.kind}`);
        }
        const done = { ...action, status: 'sent', sentAt: new Date().toISOString(), providerId: result.providerId };
        await saveAction(userId, done);
        await Promise.all([
            logActivity(userId, {
                agent: action.agent,
                kind: 'sent',
                summary: `${action.kind === 'email' ? 'מייל' : 'WhatsApp'} נשלח אל ${recipientsOf(action).join(', ')}`
            }),
            recordAudit(userId, {
                type: `mendi.${action.kind}`,
                decision: approvedBy,
                actionId: action.id,
                recipients: recipientsOf(action),
                outcome: 'sent'
            })
        ]);
        return done;
    } catch (error) {
        const detail = [error.message, error.detail].filter(Boolean).join(' ').slice(0, 400);
        const failed = { ...action, status: 'failed', error: detail };
        await saveAction(userId, failed);
        await logActivity(userId, { agent: action.agent, kind: 'failed', summary: `השליחה נכשלה: ${detail}` });
        return failed;
    }
}

export async function approveAction(userId, id, { origin, edits = {} }) {
    const change = { status: 'sending' };
    if (typeof edits.subject === 'string' && edits.subject.trim()) change.subject = edits.subject.trim().slice(0, 300);
    if (typeof edits.body === 'string' && edits.body.trim()) change.body = edits.body.trim().slice(0, 20_000);
    const claimed = await transitionAction(userId, id, 'pending', change);
    if (!claimed) return null;
    return executeAction(userId, claimed, { origin, approvedBy: 'approved' });
}

export async function rejectAction(userId, id) {
    const rejected = await transitionAction(userId, id, 'pending', { status: 'rejected' });
    if (rejected) {
        await Promise.all([
            logActivity(userId, { agent: rejected.agent, kind: 'rejected', summary: `דחית ${rejected.kind === 'email' ? 'מייל' : 'הודעה'}: ${rejected.subject ?? rejected.body.slice(0, 60)}` }),
            recordAudit(userId, { type: `mendi.${rejected.kind}`, decision: 'rejected', actionId: id })
        ]);
    }
    return rejected;
}
