import { NextResponse } from 'next/server';
import { clearAdminCookie } from 'app/admin/auth';

export async function POST() {
    await clearAdminCookie();
    return NextResponse.json({ success: true });
}
