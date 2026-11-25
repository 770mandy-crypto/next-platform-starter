// The tools the voice agent can call. Each one is a plain function with a
// schema the model sees, so adding a capability means adding one entry to
// VOICE_TOOLS and one executor to TOOL_EXECUTORS.

export const VOICE_TOOLS = [
    {
        name: 'current_time',
        description: 'מחזיר את התאריך והשעה הנוכחיים בישראל. להשתמש בזה כשהמשתמש שואל מה השעה או התאריך.',
        input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
        name: 'calculate',
        description:
            'מחשב ביטוי מתמטי. תומך במספרים, + - * / ^ וסוגריים. להשתמש בזה לכל חישוב מספרי, כדי לא לטעות.',
        input_schema: {
            type: 'object',
            properties: { expression: { type: 'string', description: 'הביטוי לחישוב, למשל (12+3)*4' } },
            required: ['expression'],
            additionalProperties: false
        }
    }
];

const MAX_EXPRESSION_LENGTH = 200;

export function currentTime(now = new Date()) {
    const text = new Intl.DateTimeFormat('he-IL', {
        timeZone: 'Asia/Jerusalem',
        dateStyle: 'full',
        timeStyle: 'short'
    }).format(now);
    return { text };
}

// Arithmetic without eval: a small tokenizer and a recursive-descent parser.
// Grammar: expr := term (("+"|"-") term)*, term := unary (("*"|"/") unary)*,
// unary := "-" unary | power, power := atom ("^" unary)?, atom := number | "(" expr ")".
export function calculate(expression) {
    if (typeof expression !== 'string') throw new Error('הביטוי חייב להיות טקסט.');
    const source = expression.trim();
    if (!source) throw new Error('הביטוי ריק.');
    if (source.length > MAX_EXPRESSION_LENGTH) throw new Error('הביטוי ארוך מדי.');

    const tokens = tokenize(source);
    let position = 0;
    const peek = () => tokens[position];
    const take = () => tokens[position++];

    function parseExpr() {
        let value = parseTerm();
        while (peek() === '+' || peek() === '-') {
            const op = take();
            const right = parseTerm();
            value = op === '+' ? value + right : value - right;
        }
        return value;
    }

    function parseTerm() {
        let value = parseUnary();
        while (peek() === '*' || peek() === '/') {
            const op = take();
            const right = parseUnary();
            if (op === '/' && right === 0) throw new Error('אי אפשר לחלק באפס.');
            value = op === '*' ? value * right : value / right;
        }
        return value;
    }

    function parseUnary() {
        if (peek() === '-') {
            take();
            return -parseUnary();
        }
        return parsePower();
    }

    function parsePower() {
        const base = parseAtom();
        if (peek() === '^') {
            take();
            return base ** parseUnary();
        }
        return base;
    }

    function parseAtom() {
        const token = take();
        if (typeof token === 'number') return token;
        if (token === '(') {
            const value = parseExpr();
            if (take() !== ')') throw new Error('חסר סוגר מסיים.');
            return value;
        }
        throw new Error('הביטוי לא תקין.');
    }

    const result = parseExpr();
    if (position !== tokens.length) throw new Error('הביטוי לא תקין.');
    if (!Number.isFinite(result)) throw new Error('התוצאה אינה מספר סופי.');
    return { result };
}

function tokenize(source) {
    const tokens = [];
    const pattern = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([-+*/^()]))/y;
    let index = 0;
    while (index < source.length) {
        if (/^\s*$/.test(source.slice(index))) break;
        pattern.lastIndex = index;
        const match = pattern.exec(source);
        if (!match) throw new Error('הביטוי מכיל תווים שאינם נתמכים.');
        index = pattern.lastIndex;
        tokens.push(match[1] !== undefined ? Number(match[1]) : match[2]);
    }
    return tokens;
}

export const TOOL_EXECUTORS = {
    current_time: () => currentTime(),
    calculate: (input) => calculate(input?.expression)
};
