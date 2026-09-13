# הגדרת Authentication ו-Supabase

## שלב 1: Supabase Setup

### 1.1 צור Supabase Project
1. היכנס ל- https://supabase.com
2. לחץ "New Project"
3. בחר שם וסיסמה
4. בחר אזור (Europe או US)
5. לחץ "Create new project"

### 1.2 קבל את ה-Keys
1. בעמוד Project Settings
2. לחץ "API" בצד שמאל
3. העתק את:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 1.3 צור את ה-Tables
בעמוד SQL Editor, הדבק את הקוד הזה:

```sql
-- User Profiles Table
CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  business_name TEXT,
  business_category TEXT,
  target_audience TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#1d4ed8',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaigns Table
CREATE TABLE campaigns (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  campaign_id TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  business_category TEXT,
  offer_description TEXT,
  headline TEXT,
  body TEXT,
  cta TEXT,
  whatsapp TEXT,
  instagram TEXT,
  video_idea TEXT,
  image_url TEXT,
  design JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only see their own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid()::text = user_id);
```

---

## שלב 2: Google OAuth Setup

### 2.1 צור Google OAuth Credentials
1. היכנס ל- https://console.cloud.google.com
2. צור Project חדש (חפש "Adigo")
3. ב-Menu, לחץ "APIs & Services"
4. לחץ "Credentials"
5. לחץ "Create Credentials" → "OAuth client ID"
6. בחר "Web application"
7. ב-"Authorized redirect URIs", הוסף:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (production URL כשתהיה)
8. לחץ "Create"
9. העתק את:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client Secret → `GOOGLE_CLIENT_SECRET`

### 2.2 שנה את .env.local
```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
NEXTAUTH_SECRET=generate-with-this-command
NEXTAUTH_URL=http://localhost:3000
```

### 2.3 Generate NEXTAUTH_SECRET
בTerminal, הרץ:
```bash
openssl rand -hex 32
```
העתק את הפלט ל- `.env.local`

---

## שלב 3: עדכן את ה-.env.local

```bash
# Claude AI
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY

# DALL-E
OPENAI_API_KEY=sk-YOUR_KEY

# Google OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## שלב 4: התחל את השרת

```bash
npm run dev
```

---

## שלב 5: בדוק את זה!

1. פתח http://localhost:3000/api/auth/signin
2. לחץ "Sign in with Google"
3. התחבר עם חשבון Google
4. אתה צריך להיות redirected חזרה לאתר
5. בדוק שהפרופיל שלך נשמר בSupabase

---

## פתרון בעיות

### "Google OAuth not configured"
→ בדוק את `GOOGLE_CLIENT_ID` ו-`GOOGLE_CLIENT_SECRET`

### "Supabase connection failed"
→ בדוק את `NEXT_PUBLIC_SUPABASE_URL` ו-`NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "Invalid redirect_uri"
→ הוסף http://localhost:3000/api/auth/callback/google ב-Google Console

---

## הערות חשובות

- ⚠️ **אל תשתוף את ה-.env.local** - יש בו sensitive keys
- 🔒 **Production** - צריך לעדכן את URLs ב-Google Console
- 💾 **Database** - כל campaigns נשמרים בSupabase, לא ב-localStorage

---

**בעזרה:** ראה https://supabase.com/docs וhttps://next-auth.js.org/
