# Quick Deploy: Referral System

Fast deployment guide for the Supabase Auth + Referral system.

## 🚀 5-Minute Setup

### Step 1: Database Migration (2 min)

```bash
# Option A: Using Supabase CLI
supabase db push supabase/migrations/referral_system.sql

# Option B: Manual
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/migrations/referral_system.sql
# 3. Paste and click "Run"
```

### Step 2: Deploy Edge Function (2 min)

```bash
# Set environment variables
supabase secrets set \
  SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
  SUPABASE_SERVICE_ROLE="YOUR_SERVICE_ROLE_KEY" \
  STRIPE_SECRET_KEY="sk_test_YOUR_KEY" \
  REFERRAL_BONUS_REFERRER="20" \
  REFERRAL_BONUS_REFERRED="10"

# Deploy function
supabase functions deploy on-auth-user-created
```

### Step 3: Configure Webhook (1 min)

1. Go to: **Supabase Dashboard → Authentication → Webhooks**
2. Click **"Add Webhook"**
3. Fill in:
   - **Event**: `user.created`
   - **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/on-auth-user-created`
   - **HTTP Headers**: `Authorization: Bearer YOUR_ANON_KEY`
4. Click **"Create"**

### Step 4: Install & Test (30 sec)

```bash
# Install dependencies
npm install

# Test sign-up
# 1. Run app: npm start
# 2. Sign up as User A
# 3. Note referral code
# 4. Sign up as User B with User A's code
# 5. Check both have credits!
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] Migration ran successfully (check tables exist)
- [ ] Edge Function deployed (check logs)
- [ ] Webhook configured (test sign-up)
- [ ] Credits appear after referral sign-up
- [ ] Profile screen shows referral code
- [ ] Credits screen shows transaction history

## 🧪 Quick Test

### SQL Test

```sql
-- 1. Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'credit_ledger', 'stripe_customers');

-- Should return 3 rows
```

### Sign-Up Test

1. **User A**: Sign up (no referral code)
   - Check: Profile has unique referral code
   
2. **User B**: Sign up with User A's referral code
   - Check: Both users have credits in Credits screen
   
3. **Verify in DB**:
   ```sql
   SELECT email, get_credit_balance(id) FROM profiles;
   -- User A: 20 credits
   -- User B: 10 credits
   ```

## 🐛 Quick Fixes

### "Function failed to deploy"
```bash
# Check you're logged in
supabase login

# Link to project
supabase link --project-ref YOUR_REF

# Retry deploy
supabase functions deploy on-auth-user-created
```

### "Webhook not firing"
1. Check webhook is enabled in Dashboard
2. Verify URL is correct
3. Check Authorization header is set
4. View Edge Function logs: `supabase functions logs on-auth-user-created`

### "Credits not appearing"
```sql
-- Check credit_ledger directly
SELECT * FROM credit_ledger ORDER BY created_at DESC LIMIT 10;

-- If empty, check Edge Function logs
```

## 📱 Mobile App Quick Deploy

```bash
# Install dependencies
npm install

# Update env vars (create .env file)
echo "EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co" > .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY" >> .env

# Run
npm start
```

## 🌐 Website Quick Deploy

```bash
cd website

# Install dependencies
npm install

# Update env vars (create .env.local file)
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
EOF

# Run locally
npm run dev

# Deploy to Vercel
vercel --prod
```

## 🎯 What You Get

After deployment:

✅ **Users can**:
- Sign up with optional referral codes
- View their unique referral code
- Share referral links
- Track referral stats (count & earnings)
- See credit balance and transaction history

✅ **System handles**:
- Automatic profile creation
- Referral code generation
- Credit rewards for both parties
- Stripe customer creation
- Anti-abuse (self-referral prevention)

✅ **Screens**:
- Mobile: AuthScreen, ProfileScreen, CreditsScreen
- Web: /auth, /profile, /credits

## 📊 Monitor

```bash
# Watch Edge Function logs live
supabase functions logs on-auth-user-created --follow

# Check recent sign-ups
SELECT email, referral_code, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

# Check recent credits
SELECT p.email, cl.reason, cl.delta, cl.created_at
FROM credit_ledger cl
JOIN profiles p ON p.id = cl.user_id
ORDER BY cl.created_at DESC
LIMIT 20;
```

## 🔄 Update

To update Edge Function after changes:

```bash
# Make changes to supabase/functions/on-auth-user-created/index.ts
# Then redeploy
supabase functions deploy on-auth-user-created

# Check logs
supabase functions logs on-auth-user-created
```

To update referral bonus amounts:

```bash
supabase secrets set REFERRAL_BONUS_REFERRER="30"
supabase secrets set REFERRAL_BONUS_REFERRED="15"

# Redeploy for changes to take effect
supabase functions deploy on-auth-user-created
```

## 🎉 Done!

Your referral system is live! Users can now:
- Sign up with referral codes
- Earn credits for referrals
- Track their referral performance

---

**Need more details?** See `REFERRAL-SYSTEM-DEPLOYMENT-GUIDE.md` for comprehensive documentation.
