import { NextResponse } from 'next/server';
import { createUser, isValidEmail, isValidPassword } from 'lib/users.js';

const ERROR_MESSAGES = {
    'invalid-email': 'כתובת האימייל לא תקינה.',
    'invalid-password': 'הסיסמה חייבת להיות באורך 8 תווים לפחות.',
    'email-taken': 'כבר יש חשבון עם האימייל הזה — נסה להתחבר במקום.'
};

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 400 });
    }

    const { email, password, name } = body || {};

    if (!isValidEmail(email) || !isValidPassword(password)) {
        return NextResponse.json(
            { error: ERROR_MESSAGES[!isValidEmail(email) ? 'invalid-email' : 'invalid-password'] },
            { status: 400 }
        );
    }

    try {
        const user = await createUser({ email, password, name });
        return NextResponse.json({ user });
    } catch (error) {
        const message = ERROR_MESSAGES[error.message] || 'ההרשמה נכשלה. נסה שוב.';
        const status = error.message === 'email-taken' ? 409 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
