// The inbox flow: an incoming email is read by the email agent, which hands it
// to the specialist that owns that kind of mail (invoices, meeting requests),
// or answers it itself. Nothing is sent: the result is a summary and a draft
// for the user to review. Routing is by plain rules, so the same email always
// goes to the same agent and the choice can be read in the tests.

import { askAgent, delegate, RelayError } from './relay.js';

export const MAX_EMAIL_CHARS = 12_000;

// The first rule that matches wins, so invoices come before meetings: a bill
// that mentions a call is still a bill.
const RULES = [
    {
        agentId: 'invoices',
        reason: 'נראה כמו חשבונית או קבלה',
        pattern: /חשבונית|קבלה|חיוב|invoice|receipt|amount due|payment due/i
    },
    {
        agentId: 'calendar',
        reason: 'נראה כמו בקשה לפגישה או זימון',
        pattern: /פגישה|זימון|יומן|meeting|invitation|invite|calendar|schedule a call/i
    }
];

export function routeEmail({ subject = '', body = '' }) {
    const text = `${subject}\n${body}`;
    const rule = RULES.find((item) => item.pattern.test(text));
    return rule ? { agentId: rule.agentId, reason: rule.reason } : { agentId: 'email', reason: 'לא זוהה סוג מיוחד' };
}

export function cleanEmail(email) {
    const from = String(email?.from ?? '').trim().slice(0, 200);
    const subject = String(email?.subject ?? '').trim().slice(0, 300);
    let body = String(email?.body ?? '').trim();
    if (!subject && !body) throw new RelayError('המייל ריק.');
    if (body.length > MAX_EMAIL_CHARS) body = `${body.slice(0, MAX_EMAIL_CHARS)}\n[המייל קוצר]`;
    return { from, subject, body };
}

export function formatEmail({ from, subject, body }) {
    return `מייל נכנס\nמאת: ${from || 'לא ידוע'}\nנושא: ${subject || '(בלי נושא)'}\n\n${body}`;
}

// Returns the agent that handled the email, its reply (a summary and a draft),
// why it was routed there, and the chain of agents it passed through.
export async function processEmail({ email, client, signal }) {
    const clean = cleanEmail(email);
    const route = routeEmail(clean);
    const task = formatEmail(clean);

    if (route.agentId === 'email') {
        const text = await askAgent({ agentId: 'email', messages: [{ role: 'user', content: task }], client, signal });
        return { agentId: 'email', label: 'מיילים', text, chain: ['email'], reason: route.reason };
    }
    const handled = await delegate({ fromAgentId: 'email', toAgentId: route.agentId, task, client, signal });
    return { ...handled, reason: route.reason };
}
