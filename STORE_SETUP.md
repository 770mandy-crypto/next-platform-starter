# הקמת חנות AM Clothing — מה שנשאר לעשות

הקוד של החנות (מסד נתונים, כניסה עם Google, תשלומים, ניהול מלאי, שליחת הזמנות) כבר בנוי תחת `/store`.
מה שנשאר הוא ליצור כמה חשבונות חיצוניים (אני לא יכול ליצור אותם בשבילך) ולהזין את המפתחות שלהם כמשתני סביבה.
עד שזה לא מוגדר, כל עמוד ב-`/store` יציג הודעת "עוד לא מוכן" במקום לקרוס.

## 1. Supabase — מסד הנתונים והכניסה

1. פתחו חשבון ופרויקט חדש ב-[supabase.com](https://supabase.com).
2. בפרויקט: **SQL Editor** → הדביקו והריצו את `supabase/schema.sql` (טבלאות + הרשאות).
3. אחר כך הריצו את `supabase/seed.sql` (מזין את 6 המוצרים עם מלאי התחלתי של 15 יח׳ לכל מידה).
4. **Project Settings → API** — שם תמצאו שלושה ערכים שצריך להעתיק:
   - `Project URL` → משתנה הסביבה `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (סודי, לא לחשוף בצד לקוח לעולם) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. כניסה עם Google

1. ב-[Google Cloud Console](https://console.cloud.google.com/apis/credentials) צרו **OAuth client ID** מסוג "Web application".
2. תחת "Authorized redirect URIs" הוסיפו: `https://<project-ref>.supabase.co/auth/v1/callback` (הכתובת המדויקת מופיעה גם במסך של Supabase בשלב הבא).
3. ב-Supabase: **Authentication → Providers → Google** — הדביקו את ה-Client ID וה-Client Secret מגוגל, ושמרו.
4. אין צורך במשתנה סביבה נוסף בצד שלנו — Supabase מנהל את זרימת ההתחברות מול גוגל.

כדי להפוך את עצמכם למנהלים (כדי לפתוח את `/store/manage`): התחברו פעם אחת עם Google דרך האתר, ואז הריצו ב-SQL Editor:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

## 3. תשלומים — Stripe

עדיין אין לכם חשבון סליקה, אז מומלץ להתחיל במצב **בדיקה (Test mode)** של Stripe — הכל עובד בדיוק אותו דבר, רק עם כרטיסי אשראי פיקטיביים, וללא חיוב אמיתי. כשתהיו מוכנים לקבל כסף אמיתי, מחליפים למפתחות ה-Live.

1. פתחו חשבון ב-[stripe.com](https://stripe.com) (או כל ספק אחר — הקוד כרגע מדבר עם Stripe. אם תעדיפו ספק ישראלי כמו Cardcom/Tranzila/Grow, זה ידרוש התאמה נפרדת של `app/store/api/checkout` ו-`app/store/api/webhooks/stripe`).
2. **Developers → API keys** — העתיקו את ה-`Secret key` (במצב Test) → משתנה הסביבה `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**:
   - כתובת: `https://<הדומיין-שלכם>/store/api/webhooks/stripe`
   - אירוע לבחור: `checkout.session.completed`
   - אחרי היצירה, העתיקו את ה-`Signing secret` → משתנה הסביבה `STRIPE_WEBHOOK_SECRET`
4. **שמירת כרטיס אשראי ללקוחות חוזרים** — כל לקוח מחובר (עם Google) מקבל אוטומטית "לקוח" ב-Stripe בהזמנה הראשונה שלו, והכרטיס נשמר עליו. כדי שכפתור "ניהול אמצעי תשלום" ב-`/store/account` יעבוד, צריך להפעיל פעם אחת ב-Stripe: **Settings → Billing → Customer portal** → Activate. (יש הגדרה נפרדת למצב Test ולמצב Live.) אנחנו לא שומרים מספרי כרטיס בעצמנו בשום מקום — הכל דרך הדף המאובטח של Stripe.

## 4. שליחת אישורי הזמנה — Resend

1. פתחו חשבון ב-[resend.com](https://resend.com).
2. **API Keys → Create API Key** → משתנה הסביבה `RESEND_API_KEY`.
3. אופציונלי בשלב זה: `ORDER_NOTIFICATION_EMAIL` — כתובת המייל שלכם, כדי לקבל התראה בכל הזמנה חדשה.
4. אופציונלי: `ORDER_FROM_EMAIL` — ברירת המחדל היא `AM Clothing <onboarding@resend.dev>` שעובד בלי אימות דומיין; לכתובת משלכם (למשל `orders@amclothing.co.il`) צריך לאמת דומיין תחת **Domains** ב-Resend.

## 5. הזנת משתני הסביבה ב-Netlify

באתר שלכם ב-Netlify: **Site configuration → Environment variables**, הוסיפו:

| משתנה | מאיפה |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (סודי!) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks |
| `RESEND_API_KEY` | Resend → API Keys |
| `ORDER_NOTIFICATION_EMAIL` | כתובת המייל שלכם (אופציונלי) |
| `ORDER_FROM_EMAIL` | כתובת שולח מותאמת (אופציונלי) |

לאחר ההזנה — פריסה (deploy) מחדש כדי שהערכים ייכנסו לתוקף.

## מה כבר בנוי ומוכן

- `/store` — קטלוג, מסונן לפי קטגוריה, עם מלאי אמיתי מה-DB
- `/store/product/[slug]` — עמוד מוצר עם בחירת צבע/מידה, כמות מוגבלת למלאי בפועל
- `/store/cart` — עגלת קניות + עגלה נשלפת מהכותרת
- `/store/login`, `/store/account` — כניסה עם Google, היסטוריית הזמנות אישית
- `/store/manage` — לוח ניהול (רק למי שמסומן `is_admin`): עריכת מלאי, רשימת הזמנות
- תשלום דרך Stripe Checkout, עם אימות מלאי ומחיר מחדש בצד השרת (לא סומכים על מה שהדפדפן שולח)
- Webhook שמסמן הזמנה כ"שולמה", מוריד מלאי, ושולח מייל אישור ללקוח + התראה אליכם
- שמירת כרטיס אשראי ללקוח מחובר, וניהולו דרך Stripe Customer Portal מ-`/store/account`
- הזמנת אורח (בלי התחברות) שמזוהה לפי מייל ומשויכת לחשבון אם ההתחברות מגיעה אחר כך

## בבדיקה לפני מעבר לכסף אמיתי

1. השאירו את Stripe במצב Test, ובצעו הזמנת בדיקה עם כרטיס `4242 4242 4242 4242`, כל תאריך תפוגה עתידי, כל CVC.
2. ודאו שההזמנה מופיעה ב-`/store/manage` בסטטוס "שולם", שהמלאי ירד, ושהגיע מייל אישור.
3. רק אז — במסך Stripe, עברו למצב Live, והחליפו את `STRIPE_SECRET_KEY` ו-`STRIPE_WEBHOOK_SECRET` (יש webhook נפרד למצב Live) בערכי ה-Live המתאימים.
