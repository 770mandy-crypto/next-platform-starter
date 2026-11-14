// Sends the WhatsApp agent's reminders whose time has come. Runs every minute,
// so a reminder arrives within a minute of when it was set for.
import { sendDueReminders } from '../../lib/whatsapp/engine.js';

export default async () => {
    // Runs even before WhatsApp is connected: simulator reminders go out too.
    const report = await sendDueReminders();
    if (report.sent + report.template + report.skipped + report.failed > 0) {
        console.log('WhatsApp reminders:', JSON.stringify(report));
    }
    return new Response(JSON.stringify(report), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '* * * * *' };
