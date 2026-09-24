# איך מעלים את GiveBack לאוויר — מדריך לבעלת האפליקציה

המדריך מסודר לפי הסדר. כל שלב לוקח כמה דקות ולא עולה כסף.

---

## שלב 1 — השרת (Supabase)

זה "המוח" של האפליקציה: שומר את המשתמשים, הפריטים, התמונות וההודעות.

1. נכנסים ל-https://supabase.com ← **Start your project** ← נרשמים עם חשבון ה-Google שלך.
2. **New project**:
   - Name: `giveback`
   - Database Password: לוחצים **Generate** ושומרים את הסיסמה במקום בטוח.
   - Region: **Central EU (Frankfurt)** — הכי קרוב לישראל.
   - לוחצים **Create new project** ומחכים כ-2 דקות.
3. בתפריט מימין/שמאל: **SQL Editor** ← **New query**.
   פותחים את הקובץ [`supabase/setup.sql`](supabase/setup.sql), מעתיקים את **כל** התוכן, מדביקים ולוחצים **Run**.
   צריך להופיע `Success. No rows returned`.
4. **Authentication** ← **Emails** ← **Magic Link**:
   - Subject: `קוד הכניסה שלך ל-GiveBack`
   - Body: מדביקים את התוכן של [`supabase/templates/code.html`](supabase/templates/code.html) ← **Save**.
   - חוזרים על אותו דבר גם ב-**Confirm signup**.
5. **Authentication** ← **URL Configuration** ← **Redirect URLs** ← **Add URL**, ומוסיפים:
   - `giveback://auth/callback`
   - וכשיהיה אתר: `https://הכתובת-של-האתר/auth/callback`

> ⚠️ **חשוב לדעת על כניסה במייל:** שירות המייל החינמי של Supabase שולח קודים **רק לאנשים שהוזמנו לפרויקט**
> (Project Settings ← Team). לכן לבדיקות שלך זה מספיק, אבל לשכנים אמיתיים צריך את **כניסה עם Google**
> (שלב 2), או לחבר שירות מייל (שלב 5, לא חובה).

---

## שלב 2 — כניסה עם Google

**למה צריך את זה ומה זה בכלל?** כדי שהכפתור "המשך עם Google" יעבוד, Google צריכה להכיר את האפליקציה.
זה בעצם **רישום של האפליקציה בחשבון ה-Google שלך** — בחינם, פעם אחת. אני לא יכול לעשות את זה במקומך
כי זה נעשה מתוך החשבון האישי שלך.

1. נכנסים ל-https://console.cloud.google.com עם אותו Gmail.
2. למעלה: **Select a project** ← **New project** ← Name: `GiveBack` ← **Create**.
3. בחיפוש למעלה כותבים **OAuth consent screen** (או **Google Auth Platform**) ← **Get started**:
   - App name: `GiveBack`, User support email: המייל שלך.
   - Audience: **External**.
   - Contact email: המייל שלך ← **Create**.
   - ב-**Audience** לוחצים **Publish app** (כדי שכל אחד יוכל להיכנס, לא רק את).
4. **Clients** (או Credentials) ← **Create client** ← Application type: **Web application**:
   - Name: `GiveBack`
   - **Authorized redirect URIs** ← **Add URI**:
     `https://<הקוד-של-הפרויקט>.supabase.co/auth/v1/callback`
     (את הכתובת המדויקת רואים ב-Supabase ← Authentication ← Sign In / Providers ← Google, בשורה Callback URL.)
   - **Create** ← מופיעים **Client ID** ו-**Client secret**.
5. חוזרים ל-Supabase ← **Authentication** ← **Sign In / Providers** ← **Google** ← מדליקים,
   מדביקים את ה-Client ID וה-Client secret ← **Save**.

זהו — "המשך עם Google" עובד, וכל מי שיש לו Gmail נכנס בלחיצה אחת.

---

## שלב 3 — לחבר את האפליקציה לשרת (GitHub בונה אותה לבד)

האפליקציה צריכה לדעת את כתובת השרת. ב-Supabase ← **Project Settings** ← **API** (או **API Keys**) יש שני ערכים:
**Project URL** ו-**anon public key** (נקרא גם publishable key).

שמים אותם ב-GitHub (לא בצ׳אט):

1. נכנסים למאגר **giveback** ב-GitHub ← **Settings** ← **Secrets and variables** ← **Actions**.
2. **New repository secret** — פעמיים:
   - Name: `EXPO_PUBLIC_SUPABASE_URL` ← Secret: ה-Project URL
   - Name: `EXPO_PUBLIC_SUPABASE_ANON_KEY` ← Secret: ה-anon key
3. לשונית **Actions** ← **Android app** ← **Run workflow**.

אחרי כ-15 דקות GitHub מסיים לבנות את האפליקציה ומפרסם אותה בעמוד **Releases** של המאגר.
מעכשיו כל עדכון שאני מעלה בונה אוטומטית גרסה חדשה.

---

## שלב 4 — להתקין על הטלפון

**אנדרואיד:** בטלפון, נכנסים ל-GitHub (אפליקציית GitHub או הדפדפן, מחוברים לחשבון שלך) ← המאגר **giveback** ←
**Releases** ← הגרסה האחרונה ← **GiveBack.apk** ← מורידים ופותחים ← אם הטלפון שואל, מאשרים
"התקנה ממקורות לא ידועים" ← **התקנה**. האפליקציה מופיעה עם האייקון, כמו כל אפליקציה.
גרסה חדשה? מורידים ומתקינים שוב — היא מתעדכנת מעל הקודמת, בלי לאבד את החשבון.

**אייפון:** אפל לא מאפשרת להתקין קובץ ישירות. עד שיהיה חשבון מפתחים של אפל (99$ לשנה), מתקינים את
**גרסת האתר** כאפליקציה: פותחים את האתר ב-Safari ← כפתור השיתוף ← **הוספה למסך הבית**.
מקבלים אייקון של GiveBack שנפתח במסך מלא, בלי שורת דפדפן.

**האתר:** מעלים את התיקייה מקובץ `GiveBack-website.zip` ל-https://app.netlify.com/drop אחרי שממלאים את
`config.js` באותם שני ערכים. אחר כך מוסיפים את כתובת האתר ב-Supabase (שלב 1, סעיף 5).

---

## שלב 5 (לא חובה) — מייל לכל המשתמשים

כדי שקוד כניסה במייל יגיע לכל אחד (לא רק לצוות), מחברים שירות מייל כמו https://resend.com (חינם עד
3,000 מיילים בחודש, צריך דומיין משלך): Supabase ← **Authentication** ← **Emails** ← **SMTP Settings**.

---

## בהמשך — החנויות

- **Google Play:** חשבון מפתחים (25$ פעם אחת) ← מעלים את אותה אפליקציה.
- **App Store:** Apple Developer (99$ לשנה) ← בונים גרסת אייפון ← TestFlight ← חנות.

הכול כבר מוכן בקוד לשני החנויות (אייקונים, הרשאות בעברית, מחיקת חשבון, דיווח וחסימה).
