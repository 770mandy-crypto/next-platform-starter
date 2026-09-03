// סיסמת המנהל. ניתן להגדיר דרך משתנה סביבה ADMIN_PASSWORD (מומלץ לפרודקשן),
// אחרת נעשה שימוש בסיסמת ברירת המחדל שלמטה.
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'מנדי המלך';

export const ADMIN_COOKIE = 'admin_session';

// עוגיית הסשן מקודדת ל-base64 כדי שתהיה תקינה גם כשהסיסמה מכילה עברית
// (ערכי עוגייה חייבים להיות ASCII). משתמש ב-btoa/TextEncoder כי הפונקציה
// הזו רצה גם ב-middleware (Edge runtime), שם אין Buffer.
export function sessionToken() {
    const bytes = new TextEncoder().encode(ADMIN_PASSWORD);
    return btoa(String.fromCharCode(...bytes));
}
