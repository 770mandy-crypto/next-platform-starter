import { cookies } from 'next/headers';
import { ADMIN_PASSWORD, ADMIN_COOKIE, sessionToken } from 'lib/admin-token';

export { ADMIN_PASSWORD };

export async function isAdmin() {
    const jar = await cookies();
    return jar.get(ADMIN_COOKIE)?.value === sessionToken();
}

export async function setAdminCookie() {
    const jar = await cookies();
    jar.set(ADMIN_COOKIE, sessionToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8 // 8 שעות
    });
}

export async function clearAdminCookie() {
    const jar = await cookies();
    jar.delete(ADMIN_COOKIE);
}
