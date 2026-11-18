// Checks a person's Gmail inbox: each new message goes through the inbox
// agents, and the result is kept as a pending draft. Nothing is sent here.
// A message is handled once; the record of that is kept per message id.

import { processEmail } from '../agents/inbox.js';
import { consumeAiQuota } from '../pilot/workspace.js';
import { accessTokenFor, isConnected, GoogleError } from './oauth.js';
import { listInbox } from './gmail.js';
import { createDraft } from './drafts.js';
import { getDb } from '../pilot/db.js';

export const MAX_PER_CHECK = 5;
const AUTOMATED = /no-?reply|do-?not-?reply|mailer-daemon|notifications?@/i;

const seenKey = (userId, messageId) => `google/seen/${userId}/${messageId}`;
const replySubject = (subject) => (/^re:/i.test(subject) ? subject : `Re: ${subject || ''}`.trim());

export async function checkInbox({ userId, fetchImpl, client, max = MAX_PER_CHECK }) {
    if (!(await isConnected(userId))) throw new GoogleError('החשבון של Google עדיין לא מחובר.', 409);
    const token = await accessTokenFor(userId, fetchImpl);
    const messages = await listInbox({ token, max, fetchImpl });
    const db = await getDb();
    const report = { checked: messages.length, drafts: [], skipped: 0, stoppedByQuota: false };

    for (const message of messages) {
        if (await db.get(seenKey(userId, message.id))) {
            report.skipped += 1;
            continue;
        }
        if (AUTOMATED.test(message.to)) {
            await db.set(seenKey(userId, message.id), { at: Date.now(), automated: true });
            report.skipped += 1;
            continue;
        }
        try {
            await consumeAiQuota(userId);
        } catch (error) {
            // Out of AI quota for today: the rest wait for the next check.
            report.stoppedByQuota = true;
            break;
        }
        const result = await processEmail({
            email: { from: message.from, subject: message.subject, body: message.body },
            client
        });
        const draft = await createDraft(userId, {
            to: message.to,
            subject: replySubject(message.subject),
            body: result.draft || result.text,
            threadId: message.threadId,
            inReplyTo: message.messageId,
            references: message.messageId,
            sourceFrom: message.from,
            sourceSubject: message.subject,
            agentLabel: result.label,
            summary: result.summary
        });
        await db.set(seenKey(userId, message.id), { at: Date.now(), draftId: draft.id });
        report.drafts.push(draft);
    }
    return report;
}
