# 🚀 AM - Quick Deploy Guide

## **Your Website is Ready! Deploy in 2 Minutes**

### **Option 1: Vercel (FREE - Recommended)**

```bash
# 1. Go to: https://vercel.com/new
# 2. Click "Continue with GitHub"
# 3. Select: 770mandy-crypto/next-platform-starter
# 4. Select branch: claude/clothing-boutique-site-4y5odd
# 5. Click "Deploy"
```

**That's it!** You'll get a live URL like: `https://am-xyz.vercel.app`

---

### **Option 2: Netlify (FREE)**

```bash
# 1. Go to: https://netlify.com/drop
# 2. After build: npm run build
# 3. Drag .next folder → Netlify
```

---

## **Features Live:**
✅ Product showcase  
✅ Shopping cart  
✅ Stripe checkout  
✅ User accounts (signup/signin)  
✅ Order history  
✅ Admin dashboard  
✅ Hebrew RTL support  

---

## **Environment Variables (After Deploy):**

Add these in your hosting settings:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
ADMIN_PASSWORD=your-password
```

---

## **Live Checklist:**

- [ ] Deploy to Vercel/Netlify
- [ ] Add environment variables
- [ ] Test signup/signin
- [ ] Test product browsing
- [ ] Test cart + checkout
- [ ] Share URL with friends!

---

**Questions?** Everything is in `DEPLOYMENT.md`
