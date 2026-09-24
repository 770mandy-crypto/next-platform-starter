# GiveBack 🎁

> מדריך הפעלה בעברית, צעד אחרי צעד: [SETUP-HE.md](SETUP-HE.md)

**מוסרים ומקבלים חפצים בחינם מהשכנים הכי קרובים.** מצלמים — ה-AI מנסח את המודעה, מי שקרוב
מוצא אותה ראשון, מתכתבים בצ׳אט, והכתובת נשלחת בלחיצה עם ניווט ישיר ב-Waze.

A Hebrew, right-to-left mobile app for iPhone and Android (plus a web build), built with
**Expo / React Native** on a **Supabase** backend (Postgres + PostGIS, Auth, Storage, Realtime,
Edge Functions) and **Claude** for photo-to-listing.

## What's in it

| Feature | How it works | Inspired by |
| --- | --- | --- |
| Sign in with Google, Apple (iPhone), or a 6-digit email code | Supabase Auth; profile created from the Google name and photo | — |
| One account everywhere | Sign in with the same email (or the Google account with that email) on any phone or browser and you land in the same profile, items and chats; the session is remembered until you sign out | — |
| Every listing shows the real item | An offer can't be published without a photo of it, only the owner's own uploads are accepted (checked in the database), and the first photo is what search, chat and the map show. Owners can add, remove and reorder photos | Olio |
| Post in a minute (AI optional, off by default — `EXPO_PUBLIC_AI_ENABLED=true`) | Take or pick photos; Claude drafts the Hebrew title, category, condition and description, and blocks prohibited items (weapons, medicines, alcohol, animals…) | Olio |
| Nearest-first search | PostGIS distance ranking, 1–25 km radius, Hebrew-aware matching ("השידה" finds "שידה", "עגלה" finds "עגלת") | — |
| Offers **and** requests | "מוסרים" / "מחפשים" — ask for what you need | Buy Nothing "Ask", Trash Nothing "Wanted" |
| Map | Items around you on Google Maps (Android) / Apple Maps (iOS), approximate pins only | Olio |
| Chat | Realtime per-item conversations, unread badges, quick replies | — |
| **Address → Waze** | The giver taps "שליחת כתובת + Waze"; the other side gets **Waze** and **Google Maps** buttons that start navigation to the door | — |
| Choose who gets it | Reserve for a specific person, mark as given to them; everyone else is told automatically | Buy Nothing |
| Thanks & reputation | After a hand-over the receiver can send a public thank-you; profiles show given / received / thanks | Buy Nothing gratitude, Olio ratings |
| Alerts | "Tell me when a stroller shows up within 3 km" → push notification | Olio, Trash Nothing |
| Local communities | Public or private (invite code) groups for a neighbourhood, building, kindergarten, kibbutz — with communities inside communities (a building inside its neighbourhood) and a live group chat for members | Buy Nothing groups — the app's differentiator |
| Safety | Report, block (both directions), moderation by AI, account deletion in-app | App Store / Play requirements for user-generated content |

### Privacy model

An item's exact point and street address live in `item_private`, readable only by the owner.
Everyone else sees `items.approx_location` — the real point moved a random 150–450 m, fixed once
at posting — so a listing shows the neighbourhood, never the house, and distances are computed
from that point so they cannot be used to triangulate. The address reaches another person only
when the giver sends it into a chat (`share_pickup_address()`), and only to that person.

## Project layout

```
src/app/            screens (Expo Router): (tabs)/ discover · map · post · messages · profile,
                    item/[id], chat/[id], user/[id], communities/, alerts, notifications, …
src/components/     UI kit (ui.tsx), item card, maps (native + web), pickers
src/lib/            Supabase client, auth, location, photos, push, API calls, Hebrew search
supabase/migrations the whole database: tables, row-level security, search, chat, alerts
supabase/functions  ai-listing (Claude vision) · push (Expo push notifications)
supabase/tests      backend integration tests (10 scenarios, several users)
e2e/                two-browser end-to-end test of the full flow
```

## Run it locally

Requires Node 20+ and Docker.

```bash
npm install
npx supabase start          # local Postgres/Auth/Storage/Realtime in Docker
npx supabase status         # copy API_URL and ANON_KEY into .env (see .env.example)
npx expo start              # scan the QR code with Expo Go, or press w for web
```

Local sign-in codes arrive in Mailpit at http://127.0.0.1:54324. Maps, the camera, Apple
sign-in and push notifications need a development build (`npx expo run:android` or
`eas build --profile development`); everything else works in Expo Go.

### Checks

```bash
npm run typecheck && npm run lint && npm test   # TypeScript, ESLint, unit tests
npm run test:backend                            # database rules and flows (needs supabase start)
npm run build:web                               # then put the local URL/key into dist/config.js
node e2e/serve.mjs dist &                       # serves on :8082
npm run test:e2e                                # the whole app A→Z, three browsers
```

## Going live

### 1. Supabase project
1. Create a project at supabase.com (region: Frankfurt is closest to Israel).
2. `npx supabase link --project-ref <ref>` and `npx supabase db push` — applies the schema.
3. **Authentication → Emails**: paste `supabase/templates/code.html` into the *Magic Link* and
   *Confirm signup* templates (the app signs in with the 6-digit code, not a link).
4. **Authentication → URL Configuration → Redirect URLs**: add `giveback://auth/callback` and
   your web URL + `/auth/callback`.
5. Put the project URL and anon/publishable key in `.env` (and as EAS environment variables).

### 2. Sign in with Google
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID → Web
   application**. Authorised redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → **Google**: paste the client ID and secret, enable.
3. Configure the OAuth consent screen (app name GiveBack, logo, privacy policy URL).

### 3. Sign in with Apple (required by Apple when Google sign-in is offered)
Apple Developer → Identifiers → your bundle ID → enable *Sign in with Apple*. In Supabase →
Providers → **Apple**, add the bundle ID (`il.co.giveback.app` by default, set `APP_BUNDLE_ID`)
to *Client IDs*.

### 4. AI listing
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase functions deploy ai-listing
```
Each photo costs roughly two US cents with Claude Opus 5 at low effort. Without the key the app
works normally and simply skips the auto-fill.

### 5. Push notifications
```bash
npx eas-cli@latest init                          # creates the EAS project; set EAS_PROJECT_ID
SECRET=$(openssl rand -hex 24)
npx supabase secrets set PUSH_WEBHOOK_SECRET=$SECRET
npx supabase functions deploy push
```
Then, in the Supabase SQL editor:
```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'giveback_functions_url');
select vault.create_secret('<the same SECRET>', 'giveback_push_secret');
```
Every new message, alert match, status change and thank-you is then pushed to the user's phone.
For iOS, EAS asks for your Apple push key on the first build; for Android, upload an FCM key in
the EAS dashboard (Credentials → FCM V1).

### 6. Google Maps on Android
Google Cloud → enable **Maps SDK for Android** → create an API key restricted to the app's
package and SHA-1, and set it as `GOOGLE_MAPS_ANDROID_KEY`. iOS uses Apple Maps (no key).

### 7. Build and install

**Automatic (recommended):** `.github/workflows/android.yml` builds the APK on GitHub for every push to
`main` and publishes `GiveBack.apk` on the repository's Releases page. Add the repository secrets
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (and optionally
`GOOGLE_MAPS_ANDROID_KEY`). On your own computer: `./scripts/build-android.sh` (Docker).

**With EAS** (needed for the stores and for iPhone builds):
```bash
npx eas-cli@latest build -p android --profile preview   # an .apk you can install on any Android phone
npx eas-cli@latest build -p ios --profile preview       # installs on registered iPhones
npx eas-cli@latest build --profile production           # store builds
npx eas-cli@latest submit -p android / -p ios           # upload to Google Play / App Store
```

### 8. The website
The same app runs as a website. Either:
- **Upload a ready folder**: `npm run build:web`, fill in `dist/config.js` with the Supabase URL
  and anon key, and drag the `dist` folder onto https://app.netlify.com/drop (or any static host;
  `_redirects` makes deep links work on Netlify). Or
- **Connect this repository to Netlify**: `netlify.toml` builds it; set
  `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the site's environment variables.

Add the site's address (and the same with `/auth/callback`) to Supabase's redirect URLs.

### One account on every device
Accounts belong to the email address. Signing in with Google and with an email code for the same
address lands in the same account (Supabase links identities with the same verified email
automatically). The one exception is Apple's "Hide my email", which gives Apple a private relay
address — such a user should sign in the same way on every device.

### Store checklist
- Apple Developer account ($99/year), Google Play Console ($25 once).
- Privacy policy and terms at a public URL (the in-app text in `src/app/legal/` is a starting
  point — have a lawyer review it, especially for the Israeli Privacy Protection Law).
- Content rules for user-generated content are covered: reporting, blocking, AI moderation,
  in-app account deletion. Someone must actually review `public.reports` — plan for it.
- Screenshots in Hebrew, category *Lifestyle* / *Social Networking*, age rating 12+ (chat).

## Costs at launch

Supabase free tier covers the pilot; the Pro plan ($25/month) is enough for tens of thousands of
users. Expo push and EAS free tiers cover the start. Claude is per photo (~$0.02).
