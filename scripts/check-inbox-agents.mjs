// Live check of the inbox agents on three sample emails. Needs ANTHROPIC_API_KEY.
// Prints which agent handled each email and its reply, for a person to read.
//   node scripts/check-inbox-agents.mjs
import { processEmail } from '../lib/agents/inbox.js';

if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY. Set it in the environment, then run this again.');
    process.exit(1);
}

const samples = [
    {
        name: 'חשבונית',
        email: { from: 'billing@supplier.example', subject: 'חשבונית מספר 1042', body: 'מצורפת חשבונית על סך 1,200 ש״ח + מע״מ. לתשלום עד 30.11.2026 לחשבון הקבוע שלנו.' }
    },
    {
        name: 'בקשה לפגישה',
        email: { from: 'dana@client.example', subject: 'נקבע פגישה?', body: 'היי, אפשר להיפגש השבוע לחצי שעה? מתאים לי יום שלישי אחה״צ או חמישי בבוקר. זום בסדר.' }
    },
    {
        name: 'מייל רגיל',
        email: { from: 'friend@example.com', subject: 'שלום', body: 'מה שלומך? התגעגעתי, נדבר בקרוב.' }
    }
];

for (const sample of samples) {
    const result = await processEmail({ email: sample.email });
    console.log(`\n=== ${sample.name} → ${result.label} (${result.reason}) ===`);
    console.log(`שרשרת: ${result.chain.join(' → ')}`);
    console.log(result.text);
}
