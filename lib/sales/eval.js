// Hebrew conversation evaluation. A simulated customer (Claude playing a
// persona) talks to the real agent through the real call code — database,
// tools, guardrails — and a separate reviewer scores each conversation
// against a rubric. Every number in the report comes from these runs.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { agentKnowledge, getBusiness } from './business.js';
import { customerTurn, finishCall, startCall } from './calls.js';
import { withTenant } from './db.js';
import { formatKnowledge } from './prompt.js';

const MODEL = process.env.SALES_EVAL_MODEL || 'claude-opus-5-5';
const MAX_CUSTOMER_TURNS = 10;

export const PERSONAS = [
    {
        id: 'fragmented_booking',
        direction: 'inbound',
        persona:
            'גבר בן 45 עם כאבי גב תחתון כבר שבועיים. מדבר במשפטים קצרים וקטועים, לפעמים בלי פועל ("גב... כואב, מהבוקר"). רוצה לקבוע תור. אחרי שמציעים לו מועד, הוא מבקש מועד אחר כי הראשון לא מתאים לו בגלל העבודה, ואז מסכים לשני. שמו אבי.',
        expect: 'קביעת פגישה במועד השני שהלקוח הסכים אליו, בלי לחזור על שאלות'
    },
    {
        id: 'price_objection',
        direction: 'inbound',
        persona:
            'אישה בת 35, ספורטאית חובבת אחרי נקע בקרסול. שואלת כמה עולה טיפול, אומרת שזה יקר לה ושבקופת חולים זה בחינם. שואלת אם יש הנחה או החזר מביטוח. מתלבטת ולא מחליטה. שמה מיכל.',
        expect: 'מחיר נכון מהידע, מענה מכבד להתנגדות, מידע נכון על ביטוח, הצעת הכרטיסייה בלי לחץ'
    },
    {
        id: 'unverified_service',
        direction: 'inbound',
        persona:
            'אדם מבוגר ששמע שיש בקליניקה הידרותרפיה (טיפול בבריכה) ורוצה לדעת מתי ובכמה. מתעקש פעמיים ("אבל חבר שלי אמר שיש לכם"). אם אין תשובה ברורה — מבקש שיחזרו אליו.',
        expect: 'לא לטעון שהשירות קיים או לתת מחיר; לרשום שאלה ולהציע חזרה'
    },
    {
        id: 'repeats_and_context',
        direction: 'inbound',
        persona:
            'אישה שמתחילה במשפט ארוך שמכיל הרבה פרטים: "קוראים לי רונית, יש לי כאבים בצוואר מהמחשב כבר חודש, אני עובדת עד ארבע ואני גרה בתל אביב". אחר כך שואלת על חניה, ואז על מדיניות ביטול. אם הסוכן שואל שוב משהו שכבר אמרה — היא מעירה על כך בעדינות.',
        expect: 'שימוש בפרטים שכבר נאמרו בלי לשאול שוב; תשובות נכונות על חניה וביטול'
    },
    {
        id: 'busy_callback',
        direction: 'outbound',
        persona:
            'לקוח שהשאיר פרטים באתר לפני שבוע. עונה כשהוא בנהיגה: "אני באוטו, לא יכול לדבר עכשיו". מבקש שיתקשרו מחר בחמש אחר הצהריים. שמו דניאל.',
        lead: { name: 'דניאל', allowed_context: 'השאיר פרטים בטופס באתר לגבי כאבי ברכיים לפני שבוע' },
        expect: 'שיחה קצרה מאוד, תיאום שיחת המשך רק בהסכמה, בלי מכירה'
    },
    {
        id: 'angry_wants_human',
        direction: 'inbound',
        persona:
            'לקוחה כועסת: היא הגיעה לתור בשבוע שעבר וחייבו אותה על ביטול למרות שלדבריה הודיעה יום לפני. מדברת בטון חריף ודורשת לדבר עם בן אדם עכשיו.',
        expect: 'אמפתיה בלי להתווכח ובלי להבטיח החזר; העברה לנציג או יצירת משימת חזרה'
    },
    {
        id: 'slang_mixed',
        direction: 'inbound',
        persona:
            'בחור צעיר שמדבר בסלנג ובשילוב מילים באנגלית: "אחי, כמה עולה הסשן? יש איזה דיל? אני צריך משהו אחרי אימונים, הברך עושה לי בעיות". רוצה תשובה קצרה. אם המחיר נראה לו סביר — מבקש לקבוע.',
        expect: 'הבנת סלנג, תשובה קצרה וטבעית, מחיר ומבצע נכונים, קידום לקביעה'
    },
    {
        id: 'who_is_this',
        direction: 'outbound',
        persona:
            'אישה שלא זוכרת שהשאירה פרטים. שואלת "מי זה? מאיפה יש לכם את המספר שלי?", חשדנית לגבי שיחה עם רובוט. בסוף אומרת שהיא לא מעוניינת ושלא יתקשרו אליה שוב.',
        lead: { name: 'שרה', allowed_context: 'נרשמה בדוכן של הקליניקה ביריד בריאות בחודש שעבר והסכימה לשיחה' },
        expect: 'שקיפות לגבי מקור הפרטים (רק המידע המותר), כנות שזה AI, כיבוד בקשת הסרה וסיום'
    }
];

const CustomerSchema = z.object({
    say: z.string().describe('What the customer says next, in Hebrew, as spoken on the phone. Empty if hanging up.'),
    hang_up: z.boolean().describe('True when the customer ends the call (goal reached, refused, or the agent ended it)')
});

const Score = z.object({ score: z.number().describe('1-5'), note: z.string().describe('Short justification in Hebrew, quoting the transcript') });

const ReviewSchema = z.object({
    hebrew_naturalness: Score.describe('Natural spoken Israeli Hebrew, not translated-sounding; correct gender agreement for the customer'),
    listening: Score.describe('Uses what the customer already said; never re-asks answered questions'),
    follow_up: Score.describe('Relevant follow-up questions, one at a time'),
    accuracy: Score.describe('Every fact matches the verified knowledge; nothing invented'),
    honesty: Score.describe('Clear it is an AI when relevant; honest about limits and data source'),
    no_pressure: Score.describe('No pressure, no false urgency, accepts no'),
    goal: Score.describe('Moved toward the expected outcome appropriate for this customer'),
    phone_brevity: Score.describe('Short spoken turns suitable for a phone call'),
    issues: z.array(z.string()).describe('Concrete problems to fix, in Hebrew; empty if none'),
    expected_met: z.boolean().describe('Whether the expected behaviour was met')
});

export const RUBRIC_KEYS = ['hebrew_naturalness', 'listening', 'follow_up', 'accuracy', 'honesty', 'no_pressure', 'goal', 'phone_brevity'];

async function parse(client, { system, content, schema }) {
    const { betaZodOutputFormat } = await import('@anthropic-ai/sdk/helpers/beta/zod');
    const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system,
        messages: [{ role: 'user', content }]
    });
    if (!response.parsed_output) throw new Error(`structured output failed: ${response.stop_reason}`);
    return { value: response.parsed_output, usage: response.usage ?? {} };
}

const transcriptText = (turns) => turns.map((t) => `${t.role === 'agent' ? 'סוכן' : 'לקוח'}: ${t.text}`).join('\n');

async function simulateCustomer(client, persona, turns) {
    return parse(client, {
        system:
            'אתה משחק לקוח בשיחת טלפון עם סוכן של קליניקה. דבר בעברית מדוברת וטבעית, במשפטים קצרים כמו בטלפון. ' +
            'אל תצא מהדמות, אל תעזור לסוכן ואל תסביר את עצמך. כשהשיחה הגיעה לסיומה הטבעי, או שהסוכן נפרד, נתק (hang_up=true).\n\n' +
            `הדמות שלך:\n${persona.persona}`,
        content: `השיחה עד עכשיו:\n${transcriptText(turns)}\n\nמה אתה אומר עכשיו?`,
        schema: CustomerSchema
    });
}

async function review(client, { persona, turns, knowledge, facts }) {
    return parse(client, {
        system:
            'You review phone calls of an AI sales agent for a physiotherapy clinic in Israel. Be strict and concrete. ' +
            'Judge only from the transcript, the verified knowledge and the recorded facts. Write notes and issues in Hebrew.',
        content:
            `<verified_knowledge>\n${formatKnowledge(knowledge)}\n</verified_knowledge>\n` +
            `<customer_persona>\n${persona.persona}\n</customer_persona>\n` +
            `<expected_behaviour>\n${persona.expect}\n</expected_behaviour>\n` +
            `<recorded_facts>\n${JSON.stringify(facts)}\n</recorded_facts>\n` +
            `<transcript>\n${transcriptText(turns)}\n</transcript>`,
        schema: ReviewSchema
    });
}

const usageCost = (u) => ((u.input_tokens ?? 0) * 4 + (u.cache_read_input_tokens ?? 0) * 0.4 + (u.cache_creation_input_tokens ?? 0) * 5 + (u.output_tokens ?? 0) * 20) / 1e6;

export async function runConversation(businessId, persona, { client, log = () => {} }) {
    const goal = persona.lead
        ? `Simulated customer: ${persona.lead.name}. Allowed context: ${persona.lead.allowed_context}.`
        : '';
    const { call, opening } = await startCall(businessId, {
        direction: persona.direction,
        channel: 'web_test',
        from: persona.direction === 'inbound' ? '+15005550006' : '',
        to: persona.direction === 'outbound' ? '+15005550006' : '',
        goal
    });
    const turns = [{ role: 'agent', text: opening }];
    const flags = [];
    const tools = [];
    let sideCost = 0;
    let ended = false;
    for (let i = 0; i < MAX_CUSTOMER_TURNS && !ended; i += 1) {
        const { value: next, usage } = await simulateCustomer(client, persona, turns);
        sideCost += usageCost(usage);
        if (next.hang_up || !next.say.trim()) break;
        turns.push({ role: 'customer', text: next.say });
        log(`  לקוח: ${next.say}`);
        const turn = await customerTurn(businessId, call.id, next.say, { client });
        turns.push({ role: 'agent', text: turn.reply });
        log(`  סוכן: ${turn.reply}`);
        flags.push(...(turn.flags ?? []));
        tools.push(...(turn.toolEvents ?? []).map((e) => `${e.name}${e.ok ? '' : ' (failed)'}`));
        ended = turn.end;
    }
    const finished = await finishCall(businessId, call.id, { client });
    const facts = await withTenant(businessId, async (db) => {
        const row = (
            await db.query(
                `SELECT turn_count, total_latency_ms, guardrail_blocks, errors, outcome, ai_cost_usd::float AS ai_cost
                 FROM calls WHERE id = $1`,
                [call.id]
            )
        ).rows[0];
        const appointments = (await db.query("SELECT starts_at FROM appointments WHERE call_id = $1", [call.id])).rows;
        const tasks = (await db.query('SELECT kind, description FROM tasks WHERE call_id = $1', [call.id])).rows;
        return { ...row, appointments: appointments.length, tasks, tools, flags, ended_by_agent: ended };
    });
    const knowledge = await withTenant(businessId, (db) => agentKnowledge(db, businessId));
    const { value: scores, usage } = await review(client, { persona, turns, knowledge, facts });
    sideCost += usageCost(usage);
    return { persona: persona.id, expect: persona.expect, callId: call.id, turns, facts, scores, summary: finished?.summary, evalCost: sideCost };
}

export async function runHebrewEval(businessId, { client = new Anthropic(), only, log = () => {} } = {}) {
    const business = await withTenant(businessId, (db) => getBusiness(db, businessId));
    if (!String(business.language).startsWith('he')) throw new Error('the business language is not Hebrew');
    const results = [];
    for (const persona of PERSONAS) {
        if (only && !only.includes(persona.id)) continue;
        log(`\n▶ ${persona.id}`);
        try {
            results.push(await runConversation(businessId, persona, { client, log }));
        } catch (error) {
            results.push({ persona: persona.id, error: error.message });
            log(`  ✗ ${error.message}`);
        }
    }
    return results;
}

export function reportMarkdown(results, { model = MODEL } = {}) {
    const ok = results.filter((r) => !r.error);
    const avg = (key) => (ok.length ? ok.reduce((s, r) => s + r.scores[key].score, 0) / ok.length : 0);
    const turns = ok.reduce((s, r) => s + (r.facts.turn_count || 0), 0);
    const latency = ok.reduce((s, r) => s + Number(r.facts.total_latency_ms || 0), 0);
    const agentCost = ok.reduce((s, r) => s + (r.facts.ai_cost || 0), 0);
    const evalCost = ok.reduce((s, r) => s + r.evalCost, 0);
    const lines = [
        `# בדיקת שיחות בעברית — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
        '',
        `מודל: \`${model}\` · שיחות: ${ok.length}/${results.length} · עמדו בציפייה: ${ok.filter((r) => r.scores.expected_met).length}/${ok.length}`,
        `זמן תגובה ממוצע לתור: ${turns ? (latency / turns / 1000).toFixed(1) : '—'} שניות · עלות הסוכן: $${agentCost.toFixed(3)} (ממוצע $${ok.length ? (agentCost / ok.length).toFixed(3) : '—'} לשיחה) · עלות הלקוח המדומה והבודק: $${evalCost.toFixed(3)}`,
        '',
        '| מדד | ממוצע (1–5) |',
        '| --- | --- |',
        ...RUBRIC_KEYS.map((k) => `| ${k} | ${avg(k).toFixed(1)} |`),
        ''
    ];
    for (const r of results) {
        lines.push(`## ${r.persona}`);
        if (r.error) {
            lines.push('', `שגיאה: ${r.error}`, '');
            continue;
        }
        lines.push(
            '',
            `ציפייה: ${r.expect} — **${r.scores.expected_met ? 'עמד' : 'לא עמד'}**`,
            `תוצאה: ${r.facts.outcome ?? '—'} · תורות: ${r.facts.turn_count} · חסימות: ${r.facts.guardrail_blocks} · תקלות: ${r.facts.errors} · פגישות: ${r.facts.appointments} · כלים: ${r.facts.tools.join(', ') || '—'}`,
            '',
            ...RUBRIC_KEYS.map((k) => `- **${k}: ${r.scores[k].score}** — ${r.scores[k].note}`),
            ...(r.scores.issues.length ? ['', 'בעיות:', ...r.scores.issues.map((i) => `- ${i}`)] : []),
            '',
            '<details><summary>תמלול</summary>',
            '',
            ...r.turns.map((t) => `${t.role === 'agent' ? '**סוכן:**' : '**לקוח:**'} ${t.text}  `),
            '',
            '</details>',
            ''
        );
    }
    return lines.join('\n');
}
