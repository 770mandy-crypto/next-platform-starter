// Answer control: every reply is checked before the customer hears it.
//
// The model is told not to invent facts; this is the deterministic backstop.
// Any number in a reply must come from somewhere verified — the knowledge
// base, the business profile, a tool result in this call, or the customer's
// own words. A reply that fails is never spoken; a safe line is used instead.

const NUMBER_PATTERN = /\d[\d,]*(?:\.\d+)?/g;

export function extractNumbers(text) {
    // "050-1234567" is one number, not two.
    const joined = String(text ?? '').replace(/(\d)-(?=\d)/g, '$1');
    return (joined.match(NUMBER_PATTERN) ?? [])
        .map((raw) => raw.replace(/,(?=\d{3}\b)/g, '').replace(/,$/, ''))
        .map((n) => String(Number(n)))
        .filter((n) => n !== 'NaN');
}

export function allowedNumbers(sources) {
    const allowed = new Set();
    for (const source of sources) for (const n of extractNumbers(source)) allowed.add(n);
    return allowed;
}

// Small counts ("one or two", "3 sessions") are ordinary speech, not facts
// worth blocking; anything from 10 up must be grounded.
const MIN_CHECKED = 10;

const HUMAN_CLAIMS = [
    /אני\s+(בן|בת)\s+אדם/,
    /אני\s+לא\s+(בוט|רובוט|מחשב|בינה\s+מלאכותית)/,
    /אני\s+(נציג|נציגה)\s+(אנושי|אנושית|אמיתי|אמיתית)/,
    /\bI\s*(am|'m)\s+(a\s+)?(real\s+)?(human|person)\b/i,
    /\bI\s*(am|'m)\s+not\s+(a\s+)?(bot|robot|AI|machine)\b/i
];

export function checkReply(reply, { allowed }) {
    const problems = [];
    const unverified = extractNumbers(reply).filter((n) => Number(n) >= MIN_CHECKED && !allowed.has(n));
    if (unverified.length) problems.push({ type: 'unverified_number', values: [...new Set(unverified)] });
    if (HUMAN_CLAIMS.some((p) => p.test(reply))) problems.push({ type: 'claims_human' });
    return problems;
}

// Spoken replies are kept short; a model that rambles is cut at a sentence end.
export function trimForSpeech(text, max = 600) {
    const clean = String(text ?? '')
        .replace(/[*_#`>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    return end > max / 2 ? cut.slice(0, end + 1) : `${cut}…`;
}
