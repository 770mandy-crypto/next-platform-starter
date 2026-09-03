import { NextResponse } from 'next/server';
import { auth } from 'lib/auth.js';
import { addHolding, getPortfolio, removeHolding } from 'lib/portfolio.js';

const ERROR_MESSAGES = {
    'invalid-symbol': 'הסימבול לא תקין.',
    'invalid-shares': 'כמות המניות לא תקינה.',
    'invalid-price': 'מחיר הקנייה הממוצע לא תקין.',
    'already-tracked': 'הנייר הזה כבר ברשימה שלך.',
    'list-full': 'הגעת למגבלה של 200 ניירות ברשימה.'
};

async function requireSession() {
    const session = await auth();
    if (!session?.user?.email) return null;
    return session;
}

export async function GET() {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'צריך להתחבר קודם.' }, { status: 401 });

    const holdings = await getPortfolio(session.user.email);
    return NextResponse.json({ holdings });
}

export async function POST(request) {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'צריך להתחבר קודם.' }, { status: 401 });

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 400 });
    }

    try {
        const holdings = await addHolding(session.user.email, body);
        return NextResponse.json({ holdings });
    } catch (error) {
        const message = ERROR_MESSAGES[error.message] || 'לא הצלחתי להוסיף את הנייר.';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(request) {
    const session = await requireSession();
    if (!session) return NextResponse.json({ error: 'צריך להתחבר קודם.' }, { status: 401 });

    const symbol = new URL(request.url).searchParams.get('symbol');
    if (!symbol) return NextResponse.json({ error: 'חסר סימבול.' }, { status: 400 });

    const holdings = await removeHolding(session.user.email, symbol);
    return NextResponse.json({ holdings });
}
