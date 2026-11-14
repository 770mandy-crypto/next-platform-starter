// What happens to a WhatsApp message, from the webhook to the reply, and what
// the scheduler does when a reminder's time comes.

import * as api from './api.js';
import { BrainError, think } from './brain.js';
import * as store from './store.js';

// Optional settings:
//   WHATSAPP_ALLOWED_NUMBERS  comma-separated numbers (972501234567) that may
//                             use the agent. Unset: anyone who writes.
//   WHATSAPP_DAILY_LIMIT      messages per person per day (default 60), a cap
//                             on what one person can spend.
const dailyLimit = () => Number(process.env.WHATSAPP_DAILY_LIMIT) || 60;
// WhatsApp lets a business send free text only within 24 hours of the
// person's last message; after that only an approved template.
export const WINDOW_MS = 24 * 60 * 60_000;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export function isAllowed(phone) {
    const list = (process.env.WHATSAPP_ALLOWED_NUMBERS || '')
        .split(',')
        .map((n) => n.replace(/\D/g, ''))
        .filter(Boolean);
    return list.length === 0 || list.includes(phone);
}

const WELCOME =
    'היי! 👋 אני העוזר שלך בוואטסאפ.\n\n' +
    '- *תזכורות*: "תזכיר לי מחר ב-8 להתקשר לאמא"\n' +
    '- *רשימות*: "תוסיף חלב וביצים לקניות"\n' +
    '- *תמונות*: שלחו חשבון או מכתב, ואגיד מה חשוב בו ומתי לשלם\n' +
    '- *הודעות קוליות*: אפשר פשוט לדבר\n\n' +
    'מה נעשה?';

// Turns the WhatsApp message into what Claude reads, plus a one-line note of
// it for the stored history (photos are not kept).
async function toContent(message) {
    if (message.type === 'text' || message.type === 'button') {
        const text = message.text.trim().slice(0, 4000);
        return text ? { content: [{ type: 'text', text }], note: text } : null;
    }
    if (message.type === 'audio') {
        if (!api.canTranscribe()) return { say: 'עוד לא הוגדר לי זיהוי דיבור, אז כרגע אני מבין רק הודעות כתובות. אפשר לכתוב לי? 🙏' };
        const text = await api.transcribe(await api.downloadMedia(message.mediaId));
        if (!text) return { say: 'לא הצלחתי לשמוע מה נאמר בהקלטה. אפשר לנסות שוב, או לכתוב?' };
        return { content: [{ type: 'text', text: `[voice note, transcribed]: ${text}` }], note: `🎤 ${text}` };
    }
    if (message.type === 'image' || (message.type === 'document' && IMAGE_TYPES.has(message.mimeType))) {
        const { bytes, mimeType } = await api.downloadMedia(message.mediaId);
        if (!IMAGE_TYPES.has(mimeType)) return { say: 'את סוג הקובץ הזה אני לא יודע לקרוא. אפשר לשלוח צילום מסך?' };
        const caption = message.caption?.trim() || 'What is in this photo? If it has a date or deadline, tell me.';
        return {
            content: [
                { type: 'image', source: { type: 'base64', media_type: mimeType, data: bytes.toString('base64') } },
                { type: 'text', text: caption }
            ],
            note: `📷 [photo] ${message.caption ?? ''}`.trim()
        };
    }
    if (message.type === 'document' && message.mimeType === 'application/pdf') {
        const { bytes } = await api.downloadMedia(message.mediaId);
        return {
            content: [
                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytes.toString('base64') } },
                { type: 'text', text: message.caption?.trim() || 'What is in this document? If it has a date or deadline, tell me.' }
            ],
            note: `📄 [PDF ${message.filename ?? ''}] ${message.caption ?? ''}`.trim()
        };
    }
    return { say: 'את סוג ההודעה הזה אני עוד לא יודע לקרוא. אפשר לכתוב, לשלוח הודעה קולית או תמונה.' };
}

export async function handleMessage(message, { now = Date.now(), brain = think } = {}) {
    const phone = message.from;
    if (!store.validPhone(phone)) return 'ignored';
    if (!(await store.claimMessage(message.id))) return 'duplicate';
    if (!isAllowed(phone)) return 'not-allowed';
    // Reactions, stickers in reply to nothing, location pins…: nothing to answer.
    if (['reaction', 'unsupported', 'system', 'ephemeral'].includes(message.type)) return 'ignored';

    const firstTime = (await store.getUser(phone)).lastInboundAt === 0;
    if (!(await store.noteInbound(phone, { name: message.name, at: message.timestamp, dailyLimit: dailyLimit() }))) {
        await api.sendText(phone, 'הגעת למכסת ההודעות היומית. נמשיך מחר 🙂 התזכורות שלך ימשיכו להגיע כרגיל.');
        return 'over-limit';
    }
    await api.markReadAndTyping(message.id);

    return store.withLock(phone, async () => {
        let input;
        try {
            input = await toContent(message);
        } catch (error) {
            console.error('WhatsApp media failed:', error);
            await api.sendText(phone, 'לא הצלחתי לפתוח את הקובץ. אפשר לנסות לשלוח אותו שוב?');
            return 'media-failed';
        }
        if (!input) return 'ignored';
        if (input.say) {
            await api.sendText(phone, input.say);
            return 'answered';
        }
        if (firstTime && /^(היי|הי|שלום|hi|hello|hey)[\s!.?]*$/i.test(input.note)) {
            await api.sendText(phone, WELCOME);
            await store.appendHistory(phone, [
                { role: 'user', text: input.note },
                { role: 'assistant', text: WELCOME }
            ]);
            return 'welcomed';
        }

        const user = await store.getUser(phone);
        let result;
        try {
            result = await brain({ phone, name: user.name, history: user.history, content: input.content, now });
        } catch (error) {
            console.error('WhatsApp brain failed:', error);
            const busy = error instanceof BrainError && error.status === 429;
            // The message is kept so the next reply can pick it up.
            await store.appendHistory(phone, [{ role: 'user', text: input.note }]);
            await api.sendText(phone, busy ? 'אני עמוס רגע. אפשר לשלוח שוב בעוד דקה?' : 'משהו השתבש אצלי. אפשר לנסות שוב?');
            return 'failed';
        }
        await api.sendText(phone, result.reply);
        await store.appendHistory(phone, result.forgot ? [] : [
            { role: 'user', text: input.note },
            { role: 'assistant', text: result.reply }
        ]);
        return 'answered';
    });
}

// --- Reminders ---------------------------------------------------------------

export async function sendDueReminders(now = Date.now()) {
    const due = await store.claimDueReminders(now);
    const report = { sent: 0, template: 0, skipped: 0, failed: 0 };
    for (const reminder of due) {
        try {
            const user = await store.getUser(reminder.phone);
            if (now - (user.lastInboundAt ?? 0) < WINDOW_MS) {
                await api.sendText(reminder.phone, `⏰ *תזכורת*\n${reminder.text}`);
                report.sent += 1;
            } else if (process.env.WHATSAPP_REMINDER_TEMPLATE) {
                await api.sendTemplate(reminder.phone, {
                    name: process.env.WHATSAPP_REMINDER_TEMPLATE,
                    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'he',
                    // Template variables may not contain line breaks or runs of spaces.
                    params: [reminder.text.replace(/\s+/g, ' ').trim()]
                });
                report.template += 1;
            } else {
                // Outside the window with no template, WhatsApp would refuse.
                console.warn(`Reminder ${reminder.id} not sent: outside the 24-hour window and no WHATSAPP_REMINDER_TEMPLATE.`);
                report.skipped += 1;
            }
            // Kept in history so "what did you remind me about?" works.
            await store.appendHistory(reminder.phone, [{ role: 'assistant', text: `⏰ תזכורת: ${reminder.text}` }]);
        } catch (error) {
            console.error(`Reminder ${reminder.id} failed:`, error);
            report.failed += 1;
        }
        await store.finishReminder(reminder, now);
    }
    return report;
}
