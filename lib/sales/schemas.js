// Input validation for everything a business owner submits.

import { z } from 'zod';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');
const day = z.number().int().min(0).max(6); // 0 = Sunday

export const SALES_GOALS = ['sell', 'meeting', 'lead', 'handoff'];
export const KNOWLEDGE_KINDS = ['product', 'service', 'price', 'promotion', 'policy', 'faq', 'other'];
export const LEAD_STATUSES = [
    'new',
    'contacted',
    'interested',
    'not_interested',
    'meeting_booked',
    'handed_off',
    'do_not_call',
    'won',
    'lost'
];

export function isValidTimezone(tz) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

const timezone = z.string().refine(isValidTimezone, 'unknown time zone');

// Opening hours per weekday: { "0": [{"start":"09:00","end":"17:00"}], ... }
const hours = z.partialRecord(
    z.enum(['0', '1', '2', '3', '4', '5', '6']),
    z.array(z.object({ start: time, end: time }).refine((r) => r.start < r.end, 'start must be before end')).max(4)
);

export const BusinessSchema = z.object({
    name: z.string().trim().min(1).max(120),
    industry: z.string().trim().max(120).default(''),
    country: z.string().trim().length(2).toUpperCase().default('IL'),
    timezone: timezone.default('Asia/Jerusalem'),
    language: z.string().trim().min(2).max(12).default('he-IL'),
    voice: z.string().trim().max(80).default(''),
    tone: z.string().trim().max(500).default(''),
    agent_name: z.string().trim().max(60).default(''),
    target_audience: z.string().trim().max(1000).default(''),
    sales_goal: z.enum(SALES_GOALS).default('meeting'),
    business_hours: hours.default({}),
    appointment_minutes: z.number().int().min(5).max(480).default(30),
    contact_phone: z.string().trim().max(40).default(''),
    contact_email: z.union([z.literal(''), z.email()]).default(''),
    handoff_phone: z.string().trim().max(40).default(''),
    handoff_rules: z.string().trim().max(2000).default(''),
    inbound_number: z.string().trim().max(20).nullable().default(null),
    outbound_enabled: z.boolean().default(false),
    calling_window: z
        .object({ start: time, end: time, days: z.array(day).max(7) })
        .refine((w) => w.start < w.end, 'start must be before end')
        .default({ start: '09:00', end: '20:00', days: [0, 1, 2, 3, 4] }),
    max_calls_per_hour: z.number().int().min(0).max(1000).default(20),
    max_attempts_per_lead: z.number().int().min(1).max(20).default(3),
    store_transcripts: z.boolean().default(true),
    retention_days: z.number().int().min(1).max(3650).default(90),
    telephony_cost_per_minute: z.number().min(0).max(10).default(0.014)
});

export const KnowledgeSchema = z.object({
    kind: z.enum(KNOWLEDGE_KINDS),
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().max(8000).default(''),
    price: z.number().min(0).max(1e9).nullable().default(null),
    currency: z.string().trim().length(3).toUpperCase().default('ILS'),
    active: z.boolean().default(true),
    verified: z.boolean().default(false)
});

export const LeadSchema = z.object({
    name: z.string().trim().max(120).default(''),
    phone: z.string().trim().min(5).max(30),
    email: z.union([z.literal(''), z.email()]).default(''),
    timezone: timezone.nullable().default(null),
    source: z.string().trim().max(60).default('manual'),
    consent_call: z.boolean().default(false),
    consent_sms: z.boolean().default(false),
    consent_email: z.boolean().default(false),
    consent_source: z.string().trim().max(200).default(''),
    allowed_context: z.string().trim().max(2000).default(''),
    notes: z.string().trim().max(2000).default('')
});

export const LeadPatchSchema = z.object({
    status: z.enum(LEAD_STATUSES).optional(),
    notes: z.string().trim().max(2000).optional(),
    next_call_at: z.iso.datetime({ offset: true }).nullable().optional(),
    consent_call: z.boolean().optional(),
    consent_sms: z.boolean().optional(),
    consent_email: z.boolean().optional()
});

export function parseOrThrow(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success) {
        const error = new Error(
            result.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ')
        );
        error.status = 400;
        throw error;
    }
    return result.data;
}
