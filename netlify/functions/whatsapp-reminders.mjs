// Sends the WhatsApp agent's reminders whose time has come. Runs every minute,
// so a reminder arrives within a minute of when it was set for.
import { isWhatsAppConfigured } from '../../lib/whatsapp/api.js';
import { sendDueReminders } from '../../lib/whatsapp/engine.js';

export default async () => {
    if (!isWhatsAppConfigured()) return new Response('WhatsApp is not configured.', { status: 200 });
    const report = await sendDueReminders();
    if (report.sent + report.template + report.skipped + report.failed > 0) {
        console.log('WhatsApp reminders:', JSON.stringify(report));
    }
    return new Response(JSON.stringify(report), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '* * * * *' };
