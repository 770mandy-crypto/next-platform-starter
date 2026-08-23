# Deployment Guide - AM Store

## Deploy to Netlify (5 minutes)

### Step 1: Connect GitHub to Netlify
1. Go to https://netlify.com and sign up (free)
2. Click "Add new site" → "Import an existing project"
3. Select GitHub and authorize
4. Choose repository: `770mandy-crypto/next-platform-starter`
5. Select branch: `claude/clothing-boutique-site-4y5odd`

### Step 2: Build Settings
Netlify will auto-detect Next.js. Confirm these settings:
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Runtime**: Node.js 18.x or higher

### Step 3: Environment Variables (Optional)
In Netlify Settings → Environment:
```
ADMIN_PASSWORD=your-secure-password
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Step 4: Deploy
Click "Deploy site" and wait ~2-3 minutes.

**Your live site URL will appear!** (something like: `https://your-site-name.netlify.app`)

---

## What Works Live:
✅ Product catalog and browsing
✅ Shopping cart (localStorage)
✅ Stripe checkout (test mode)
✅ User signup/signin
✅ Admin panel at `/admin/login`
✅ Hebrew RTL display
✅ All animations and design

## What Needs Database (Phase 4):
❌ Persistent orders (currently lose on refresh)
❌ Saved user profiles
❌ Admin product/order management writes

---

## Test Credentials
- **Admin**: `/admin/login` → password: `admin123`
- **Test Card**: `4242 4242 4242 4242` (any future date, any CVC)
- **Test Email**: `test@example.com`

---

## Next Phase (After Live):
Once you have a live URL, we'll connect Supabase database to make it fully functional with persistent data.

---

## Troubleshooting

**Build fails?**
- Check Node version: `node --version` (should be 18+)
- Run locally: `npm run build`

**Site shows 404s?**
- Check Netlify publish directory is `.next`
- Verify build command ran successfully

**Stripe not working?**
- Add test keys to Netlify environment variables

---

**Support**: Check `AM_PROGRESS.md` for full project status
