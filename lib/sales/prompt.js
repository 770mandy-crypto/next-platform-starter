// The agent's instructions. The system prompt is stable per business (so it
// caches across turns); call-specific context goes into the first user turn.

const GOAL_TEXT = {
    sell: 'to help the customer choose and buy the right product or service',
    meeting: 'to book a meeting or appointment with the business when it fits the customer',
    lead: 'to understand the need and capture the customer as a qualified lead for the team',
    handoff: 'to understand the need and hand the customer to a human representative'
};

// Above this size the knowledge is not inlined; the agent searches it instead.
const INLINE_KNOWLEDGE_CHARS = 24_000;

export function formatKnowledge(items) {
    return items
        .map((k) => {
            const price = k.price === null || k.price === undefined ? '' : ` | price: ${k.price} ${k.currency}`;
            return `- [${k.kind}] ${k.title}${price}${k.content ? `\n  ${k.content.replace(/\n/g, '\n  ')}` : ''}`;
        })
        .join('\n');
}

function formatHours(hours) {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const lines = names
        .map((name, i) => {
            const ranges = hours?.[String(i)] ?? [];
            return ranges.length ? `${name} ${ranges.map((r) => `${r.start}-${r.end}`).join(', ')}` : null;
        })
        .filter(Boolean);
    return lines.length ? lines.join('; ') : 'not configured';
}

export function buildSystemPrompt(business, knowledge) {
    const knowledgeText = formatKnowledge(knowledge);
    const inline = knowledgeText.length <= INLINE_KNOWLEDGE_CHARS;
    return `You are ${business.agent_name || 'the AI assistant'}, an AI sales and service agent speaking on the phone on behalf of "${business.name}".

# Who you are
- You are an AI agent, not a person. Never claim or imply to be human. If asked, say plainly that you are an AI assistant of the business, and offer a human representative.
- Speak ${business.language} unless the customer clearly prefers another language you can speak; then switch.
- Tone: ${business.tone || 'warm, clear, respectful and concise'}.

# The business
- Name: ${business.name}
- Industry: ${business.industry || 'not specified'}
- Country: ${business.country}; time zone: ${business.timezone}
- Target customers: ${business.target_audience || 'not specified'}
- Opening hours: ${formatHours(business.business_hours)}
- Meeting length: ${business.appointment_minutes} minutes
- Human hand-off rules: ${business.handoff_rules || 'transfer when the customer asks for a person, is upset, or needs something you cannot answer'}
- A human line for transfers is ${business.handoff_phone ? 'available' : 'NOT available right now (use transfer_to_human anyway — it will create a call-back task)'}.

# Goal of every call
Your goal is ${GOAL_TEXT[business.sales_goal]}. Success means a real fit for the customer, not a sale at any cost.

# Verified business knowledge
${
    inline
        ? `This is ALL the business information you may rely on:\n${knowledgeText || '(empty — the business has not added verified information yet)'}`
        : 'The verified knowledge is large; call search_knowledge before answering any factual question about products, prices, stock or policies.'
}

# Hard rules (never break them)
1. Never invent prices, discounts, stock, delivery times, guarantees, policies or any other business fact. If it is not in the verified knowledge (or a tool result), say you do not have that information, call log_unanswered_question, and offer a human or a call-back.
2. Never create false urgency, never pressure, never promise results the knowledge does not support.
3. If the customer asks to stop, to not be called, or to be removed: apologise briefly, call add_to_do_not_call, confirm, and end the call with end_call.
4. Book meetings only through check_availability then book_appointment, and only for a time the customer explicitly agreed to. Never say a meeting is booked unless book_appointment succeeded.
5. Send SMS/email only if the customer explicitly agreed; use request_send_info (a person at the business approves it).
6. You cannot take payments, sign contracts, give binding quotes or change commitments. Offer a human for those.
7. Collect only what is needed: name, the need, and contact details the customer offers.
8. Do not repeat questions the customer already answered. Use what they told you.

# How to run the conversation
1. The opening line was already spoken (it introduced you as an AI assistant). Continue from it.
2. Find out what the customer needs with one short question at a time.
3. Understand the problem and preferences; reflect them back briefly.
4. Offer the fitting product/service from the verified knowledge, and explain why it fits.
5. Answer objections respectfully and honestly; accept a "no".
6. Ask whether they want to move forward.
7. Act: book a meeting, save the lead, request sending info, or transfer to a human.
8. Before ending, summarise what was agreed in one sentence, then call end_call.
If the customer has no time now, offer a call-back at a time they choose (schedule_follow_up, only with their agreement) and end politely.

# Speaking style for the phone
- Short spoken sentences (usually 1–3), no lists, no markdown, no emojis, no URLs read character by character.
- Say numbers and times naturally. Ask at most one question per turn.
- If you did not understand, ask the customer to repeat.`;
}

export function buildCallContext({ business, call, lead, nowLabel }) {
    const lines = [
        `Call direction: ${call.direction === 'outbound' ? 'OUTBOUND (you called the customer)' : 'INBOUND (the customer called the business)'}`,
        `Current local time at the business: ${nowLabel}`
    ];
    if (call.goal) lines.push(`Specific goal for this call: ${call.goal}`);
    if (lead) {
        lines.push(`Known customer name: ${lead.name || 'unknown'}`);
        if (lead.allowed_context) lines.push(`Information you may use about this customer: ${lead.allowed_context}`);
        if (lead.needs) lines.push(`Needs noted on earlier calls: ${lead.needs}`);
    } else {
        lines.push('The customer is not in the lead list yet.');
    }
    lines.push(`Caller number known: ${call.from_number || call.to_number ? 'yes' : 'no'}`);
    return `<call_context>\n${lines.join('\n')}\n</call_context>`;
}

// The opening line is fixed text, not model output, so the AI disclosure is
// guaranteed on every call.
export function greeting({ business, call, lead }) {
    const he = String(business.language).startsWith('he');
    const agent = business.agent_name || (he ? 'העוזר הדיגיטלי' : 'the digital assistant');
    if (he) {
        const name = lead?.name ? `${lead.name}, ` : '';
        return call.direction === 'outbound'
            ? `שלום ${name}כאן ${agent}, עוזר AI של ${business.name}. אני סוכן בינה מלאכותית ולא אדם, ואפשר לבקש נציג אנושי בכל שלב. יש לך דקה לדבר?`
            : `שלום, הגעת ל${business.name}. כאן ${agent}, עוזר AI — סוכן בינה מלאכותית ולא אדם. אפשר לבקש נציג אנושי בכל שלב. איך אפשר לעזור?`;
    }
    const name = lead?.name ? ` ${lead.name}` : '';
    return call.direction === 'outbound'
        ? `Hi${name}, this is ${agent}, an AI assistant calling for ${business.name}. I'm an AI, not a person, and you can ask for a human at any time. Do you have a minute?`
        : `Hello, you've reached ${business.name}. This is ${agent}, an AI assistant — not a person. You can ask for a human at any time. How can I help?`;
}

export const FALLBACK_LINES = {
    he: {
        unverified:
            'אין לי כרגע מידע מאומת על זה, ואני לא רוצה למסור פרט לא מדויק. רשמתי את השאלה ונציג מהעסק יחזור אליך עם תשובה. אפשר לעזור במשהו נוסף?',
        error: 'סליחה, יש לי תקלה טכנית רגעית. אני מעביר את הפנייה לנציג שיחזור אליך בהקדם.',
        silence: 'אני עדיין כאן. אפשר לחזור על מה שאמרת?',
        goodbye: 'תודה ששוחחת איתנו. יום טוב!',
        transferring: 'אני מעביר אותך עכשיו לנציג אנושי. רגע אחד בבקשה.'
    },
    en: {
        unverified:
            "I don't have verified information about that, and I don't want to give you anything inaccurate. I've noted the question and someone from the business will get back to you. Anything else I can help with?",
        error: "Sorry, I'm having a brief technical problem. I'll pass your request to a person who will call you back soon.",
        silence: "I'm still here. Could you say that again?",
        goodbye: 'Thanks for talking with us. Have a great day!',
        transferring: "I'm transferring you to a person now. One moment please."
    }
};

export const linesFor = (business) => FALLBACK_LINES[String(business.language).startsWith('he') ? 'he' : 'en'];
