import { NextResponse } from 'next/server';
import { getAllUsersFromBlob } from 'lib/auth';
import { getStore } from '@netlify/blobs';

export async function GET(request) {
    try {
        const token = request.cookies.get('fixnow_token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const blobc = await getStore('fixnow');
        const users = await getAllUsersFromBlob(blobc);

        for (const [email, user] of Object.entries(users)) {
            if (user.token === token) {
                return NextResponse.json({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    profile: user.profile
                });
            }
        }

        return NextResponse.json(
            { error: 'Token invalid' },
            { status: 401 }
        );
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json(
            { error: 'שגיאה בבדיקת התחברות' },
            { status: 500 }
        );
    }
}
