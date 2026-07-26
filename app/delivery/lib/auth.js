import { cookies } from 'next/headers';

// סיסמת המנהל. ניתן להגדיר דרך משתנה סביבה MANAGER_PASSWORD (מומלץ),
// אחרת נעשה שימוש בסיסמת ברירת המחדל שלמטה.
export const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || 'מנדי770';

const MANAGER_COOKIE = 'mgr_auth';
const COURIER_COOKIE = 'courier_name';

// טוקן ההתחברות שנשמר בעוגייה - מקודד ל-base64 כדי שיהיה תקין
// גם כשהסיסמה מכילה עברית (ערכי עוגייה חייבים להיות ASCII).
const managerToken = () => Buffer.from(MANAGER_PASSWORD).toString('base64');

// בדיקה האם המנהל מחובר
export async function isManager() {
    const jar = await cookies();
    return jar.get(MANAGER_COOKIE)?.value === managerToken();
}

export async function setManagerCookie() {
    const jar = await cookies();
    jar.set(MANAGER_COOKIE, managerToken(), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // שבוע
    });
}

export async function clearManagerCookie() {
    const jar = await cookies();
    jar.delete(MANAGER_COOKIE);
}

// שם השליח המחובר (נשמר בעוגייה כדי שכל אחד יוכל להיכנס בקלות)
export async function getCourierName() {
    const jar = await cookies();
    return jar.get(COURIER_COOKIE)?.value || '';
}

export async function setCourierCookie(name) {
    const jar = await cookies();
    jar.set(COURIER_COOKIE, name, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30 // חודש
    });
}

export async function clearCourierCookie() {
    const jar = await cookies();
    jar.delete(COURIER_COOKIE);
}
