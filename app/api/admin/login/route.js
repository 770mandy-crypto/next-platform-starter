import { NextResponse } from 'next/server';
import { ADMIN_PASSWORD, setAdminCookie } from 'app/admin/auth';

export async function POST(request) {
    const { password } = await request.json().catch(() => ({}));

    if (typeof password !== 'string' || password !== ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
    }

    await setAdminCookie();
    return NextResponse.json({ success: true });
}
