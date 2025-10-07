# 🚀 Deploy Referral Page - Quick Guide

## The Problem
The referral page shows "Page Not Found" because the new referral landing page hasn't been deployed to the live website yet.

## Quick Deploy Steps

### Step 1: Make Sure You Have the Environment Variables

Your website needs these environment variables to build:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://oyphcjbickujybvbeame.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=https://leadsong.com
```

### Step 2: Update App Store Links (IMPORTANT!)

Before deploying, update the app store URLs in `website/lib/appStoreLinks.ts`:

```typescript
export const APP_STORE_LINKS = {
  ios: 'https://apps.apple.com/app/leadsong/id[YOUR_REAL_APP_ID]',
  android: 'https://play.google.com/store/apps/details?id=com.propertyratings.app',
};
```

### Step 3: Deploy to Your Hosting

**If using Vercel (recommended):**

```bash
cd website
vercel --prod
```

**If using Netlify:**

```bash
cd website
npm run build
netlify deploy --prod --dir=.next
```

**If using another host:**
- Build: `cd website && npm run build`
- Upload the `.next` folder to your hosting

### Step 4: Test It

1. Share a referral link from your app
2. Click the link
3. Should now see the beautiful landing page instead of "Page Not Found"!

## Alternative: Quick Test Without Deployment

If you want to test locally before deploying:

```bash
cd website

# Create a .env.local file with your environment variables
echo "NEXT_PUBLIC_SUPABASE_URL=https://oyphcjbickujybvbeame.supabase.co" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here" >> .env.local
# ... add other env vars

# Run locally
npm run dev
```

Then test by visiting: `http://localhost:3000/referral/TEST1234`

## What's Been Fixed

✅ Duplicate links issue - FIXED in RewardsScreen.tsx
✅ Referral landing page - CREATED (needs deployment)
✅ App store download buttons - READY (need URL updates)

## Once Deployed

After deployment, the flow will be:
1. User shares referral link
2. Friend clicks link
3. Beautiful landing page shows (NOT "Page Not Found")
4. Friend downloads app from App Store/Play Store
5. Referral tracked! 🎉
