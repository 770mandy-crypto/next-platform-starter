import { NextResponse } from 'next/server';
import { hashPassword, generateToken, saveUserToBlob, getUserFromBlob } from 'lib/auth';
import { getStore } from '@netlify/blobs';

export async function POST(request) {
    try {
        const { email, password, name, role } = await request.json();

        if (!email || !password || !name || !role) {
            return NextResponse.json(
                { error: 'כל השדות נדרשים' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'הסיסמה חייבת להיות לפחות 6 תווים' },
                { status: 400 }
            );
        }

        const blobc = await getStore('fixnow');
        const existingUser = await getUserFromBlob(blobc, email);

        if (existingUser) {
            return NextResponse.json(
                { error: 'משתמש זה כבר קיים' },
                { status: 409 }
            );
        }

        const passwordHash = hashPassword(password);
        const token = generateToken();
        const userId = `user_${Date.now()}`;

        const userData = {
            id: userId,
            email,
            name,
            role,
            passwordHash,
            token,
            createdAt: new Date().toISOString(),
            profile: {
                bio: '',
                phone: '',
                location: '',
                rating: role === 'professional' ? 5 : null,
                reviews: 0
            }
        };

        await saveUserToBlob(blobc, email, userData);

        const response = NextResponse.json(
            {
                id: userId,
                email,
                name,
                role,
                profile: userData.profile
            },
            { status: 201 }
        );

        response.cookies.set('fixnow_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60
        });

        return response;
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { error: 'שגיאה בהרשמה' },
            { status: 500 }
        );
    }
}
