import { NextResponse } from 'next/server';
import { verifyPassword, generateToken, saveUserToBlob, getUserFromBlob } from 'lib/auth';
import { getStore } from '@netlify/blobs';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'דוא"ל וסיסמה נדרשים' },
                { status: 400 }
            );
        }

        const blobc = await getStore('fixnow');
        const user = await getUserFromBlob(blobc, email);

        if (!user || !verifyPassword(password, user.passwordHash)) {
            return NextResponse.json(
                { error: 'דוא"ל או סיסמה שגויים' },
                { status: 401 }
            );
        }

        const token = generateToken();
        const updatedUser = { ...user, token };
        await saveUserToBlob(blobc, email, updatedUser);

        const response = NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profile: user.profile
        });

        response.cookies.set('fixnow_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'שגיאה בהתחברות' },
            { status: 500 }
        );
    }
}
