# 🚀 Deploy Referral System NOW

## Copy-Paste Commands for Instant Deployment

### Step 1: Database Migration (30 seconds)

```bash
# If using Supabase CLI
supabase db push supabase/migrations/referral_system.sql
```

**OR** manually in Supabase Dashboard:
1. Go to SQL Editor
2. Paste contents of `supabase/migrations/referral_system.sql`
3. Click "Run"

---

### Step 2: Set Environment Variables (1 minute)

Replace YOUR_* placeholders with your actual values:

```bash
supabase secrets set \
  SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
  SUPABASE_SERVICE_ROLE="YOUR_SERVICE_ROLE_KEY_FROM_DASHBOARD" \
  STRIPE_SECRET_KEY="sk_test_YOUR_STRIPE_KEY" \
  REFERRAL_BONUS_REFERRER="20" \
  REFERRAL_BONUS_REFERRED="10"
```

**Where to find these:**
- SUPABASE_URL: Dashboard → Settings → API → Project URL
- SUPABASE_SERVICE_ROLE: Dashboard → Settings → API → service_role key
- STRIPE_SECRET_KEY: Stripe Dashboard → Developers → API Keys

---

### Step 3: Deploy Edge Function (30 seconds)

```bash
supabase functions deploy on-auth-user-created
```

---

### Step 4: Configure Webhook (1 minute)

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/hooks
2. Click **"Add Hook"**
3. Fill in:
   ```
   Hook Name: User Created - Referral System
   Event: user.created
   URL: https://YOUR_PROJECT.supabase.co/functions/v1/on-auth-user-created
   HTTP Method: POST
   HTTP Headers:
     Authorization: Bearer YOUR_ANON_KEY
   ```
4. Click **"Create Hook"**

---

### Step 5: Install Dependencies (1 minute)

```bash
# Mobile app
npm install

# Website
cd website && npm install && cd ..
```

---

### Step 6: Test (2 minutes)

```bash
# Start mobile app
npm start

# In another terminal, start website
cd website && npm run dev
```

**Test Flow:**
1. Sign up as "User A" (mobile or web)
2. Go to Profile screen → note referral code
3. Sign up as "User B" with User A's referral code
4. Check Credits screen for both users
5. User A should have 20 credits
6. User B should have 10 credits

---

## ✅ Verification SQL

Run these in Supabase SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'credit_ledger', 'stripe_customers');
-- Should return 3 rows

-- Check recent profiles
SELECT id, email, referral_code, referred_by, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Check credit ledger
SELECT p.email, cl.reason, cl.delta, cl.created_at
FROM credit_ledger cl
JOIN profiles p ON p.id = cl.user_id
ORDER BY cl.created_at DESC
LIMIT 10;

-- Check balances
SELECT email, get_credit_balance(id) as balance
FROM profiles
ORDER BY balance DESC;
```

---

## 🐛 Quick Troubleshooting

### "Function not deploying"

```bash
# Login and link
supabase login
supabase link --project-ref YOUR_REF

# Try again
supabase functions deploy on-auth-user-created
```

### "Webhook not firing"

```bash
# Check Edge Function logs
supabase functions logs on-auth-user-created --follow

# Then sign up a test user and watch the logs
```

### "Credits not appearing"

```sql
-- Check credit_ledger directly
SELECT * FROM credit_ledger ORDER BY created_at DESC;

-- If empty, check Edge Function logs
```

### "Can't see profile"

```sql
-- Check profiles table
SELECT * FROM profiles ORDER BY created_at DESC;

-- If empty, webhook isn't firing - check configuration
```

---

## 📱 Mobile App Environment

Create `.env` file in root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

---

## 🌐 Website Environment

Create `website/.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
```

---

## 🎯 What You Just Deployed

✅ **Database Tables:**
- profiles (with referral codes)
- credit_ledger (transaction history)
- stripe_customers (Stripe integration)

✅ **Edge Function:**
- Handles user sign-ups
- Generates referral codes
- Awards credits
- Creates Stripe customers

✅ **Mobile Screens:**
- AuthScreen (with referral input)
- ProfileScreen (show/share referral code)
- CreditsScreen (balance & history)

✅ **Website Pages:**
- /auth (sign up/in with referral)
- /profile (show/share referral code)
- /credits (balance & history)

✅ **Security:**
- RLS policies on all tables
- PKCE auth for mobile
- Service role for Edge Function
- Self-referral prevention

---

## 🚀 Production Deployment

When ready for production:

```bash
# 1. Switch to live Stripe keys
supabase secrets set STRIPE_SECRET_KEY="sk_live_YOUR_KEY"

# 2. Adjust referral bonuses if needed
supabase secrets set REFERRAL_BONUS_REFERRER="20"
supabase secrets set REFERRAL_BONUS_REFERRED="10"

# 3. Redeploy Edge Function
supabase functions deploy on-auth-user-created

# 4. Deploy mobile app
expo build:ios
expo build:android

# 5. Deploy website
cd website
vercel --prod
```

---

## 📊 Monitor After Deployment

```bash
# Watch Edge Function logs
supabase functions logs on-auth-user-created --follow

# Check recent activity
# Run the verification SQL queries above
```

---

## 🎉 Success!

If you can:
- ✅ Sign up with a referral code
- ✅ See credits awarded to both users
- ✅ View profile with referral code
- ✅ See transaction history

**Then it's working perfectly! 🎊**

---

**Need more details?** See:
- `QUICK-DEPLOY-REFERRAL-SYSTEM.md` - Quick deployment guide
- `REFERRAL-SYSTEM-DEPLOYMENT-GUIDE.md` - Full deployment guide
- `REFERRAL-SYSTEM-README.md` - Complete documentation
- `REFERRAL-SYSTEM-IMPLEMENTATION-SUMMARY.md` - What was built

✅ **Supabase Auth + Referrals wired.**
