# Referral System Deployment Guide

This guide covers the complete setup and deployment of the Supabase Auth + Referral system for your Leadsong application.

## Overview

The referral system enables users to:
- Sign up with optional referral codes
- Earn credits for referring friends
- Track their referral stats and credit balance
- Share their own unique referral code

## Prerequisites

- Supabase project with Auth enabled
- Stripe account (for Stripe Customer creation)
- Node.js and npm/yarn installed

## 1. Environment Variables

### Mobile App (Expo) - Create/Update `.env`

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Website (Next.js) - Create/Update `.env.local`

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
```

### Edge Functions - Configure in Supabase Dashboard

Go to **Project Settings → Edge Functions → Secrets** and add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
REFERRAL_BONUS_REFERRER=20
REFERRAL_BONUS_REFERRED=10
```

## 2. Database Migration

Run the SQL migration to create the required tables:

```bash
# Using Supabase CLI
supabase db push supabase/migrations/referral_system.sql

# Or manually in Supabase Dashboard SQL Editor
# Copy and paste contents of supabase/migrations/referral_system.sql
```

This creates:
- `profiles` table with referral codes
- `credit_ledger` table for all credit transactions
- `stripe_customers` table linking users to Stripe
- RLS policies for security
- Helper functions for computing balances

## 3. Deploy Edge Function

### Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Login to Supabase

```bash
supabase login
```

### Link to your project

```bash
supabase link --project-ref your-project-ref
```

### Deploy the Edge Function

```bash
supabase functions deploy on-auth-user-created
```

## 4. Configure Auth Webhook

1. Go to Supabase Dashboard → **Authentication → Webhooks**
2. Click **Add Webhook**
3. Configure:
   - **Event**: `user.created`
   - **Webhook URL**: `https://your-project.supabase.co/functions/v1/on-auth-user-created`
   - **HTTP Method**: POST
   - **HTTP Headers**: 
     ```
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     ```
4. Click **Create Webhook**

## 5. Test the System

### Test Sign-Up without Referral Code

1. Sign up a new user via mobile app or website
2. Check Supabase Dashboard:
   - `profiles` table should have new row with unique `referral_code`
   - `stripe_customers` table should have Stripe customer ID
   - No entries in `credit_ledger` yet

### Test Sign-Up with Referral Code

1. Sign up first user (User A) and note their `referral_code`
2. Sign up second user (User B) with User A's referral code
3. Check Supabase Dashboard:
   - User B's profile should have `referred_by` = User A's ID
   - `credit_ledger` should have TWO new rows:
     - User A: +20 credits (referrer bonus)
     - User B: +10 credits (referred bonus)

### Test Credit Balance

1. Open mobile app or website as User A
2. Navigate to Credits screen
3. Should show balance of 20 credits
4. Transaction history should show "Referral Bonus (You referred someone)"

### Test Profile & Referral Sharing

1. Navigate to Profile screen
2. Should display unique referral code
3. Test "Copy Code" and "Share Link" buttons
4. Verify referral stats show correct count

## 6. Mobile App Updates

### Install Dependencies

```bash
npm install
# or
yarn install
```

The package.json has been updated to move `@supabase/supabase-js` to dependencies.

### Test Deep Linking (Optional)

To test deep link referrals:

1. Create a referral link: `https://yourapp.com/auth?ref=USERCODE`
2. Open the link on a device/simulator
3. The referral code should be pre-filled in the sign-up form

## 7. Website Updates

### Install Dependencies

```bash
cd website
npm install
# or
yarn install
```

### Test Website Sign-Up

1. Navigate to `/auth?ref=TESTCODE`
2. Click "Sign Up"
3. Referral code field should be pre-filled with "TESTCODE"
4. Complete sign-up
5. Check that referral was processed correctly

### Test Profile and Credits Pages

1. Navigate to `/profile`
2. Verify referral code display and sharing functionality
3. Navigate to `/credits`
4. Verify transaction history displays correctly

## 8. Monitoring & Debugging

### Check Edge Function Logs

```bash
supabase functions logs on-auth-user-created --follow
```

Or in Supabase Dashboard → **Edge Functions → on-auth-user-created → Logs**

### Common Issues

#### Webhook Not Firing

- Verify webhook is enabled in Supabase Dashboard
- Check Edge Function logs for errors
- Ensure Authorization header is set correctly

#### Credits Not Appearing

- Check `credit_ledger` table directly
- Verify RLS policies allow reading own records
- Check Edge Function logs for insertion errors

#### Referral Code Invalid

- Ensure referral code is uppercase
- Check that referrer profile exists in database
- Verify `referred_by` relationship was created

#### Stripe Customer Not Created

- Verify `STRIPE_SECRET_KEY` is set in Edge Function secrets
- Check Stripe Dashboard for customer creation
- Review Edge Function logs for Stripe API errors

## 9. Production Deployment

### Before Going Live

1. ✅ Test complete sign-up flow with and without referrals
2. ✅ Verify all credit transactions are recorded correctly
3. ✅ Test profile and credits screens on mobile and web
4. ✅ Switch to live Stripe keys (not test mode)
5. ✅ Update referral bonus amounts if needed
6. ✅ Set up monitoring/alerts for Edge Function failures

### Update Environment Variables

Replace all test keys with production keys:
- Stripe keys (sk_live_... and pk_live_...)
- Verify Supabase URL points to production project
- Update referral bonus amounts if different for production

### Deploy

```bash
# Mobile App
expo build:ios
expo build:android

# Website
cd website
npm run build
vercel --prod  # or your deployment platform
```

## 10. Customization

### Change Referral Bonuses

Update Edge Function environment variables:
- `REFERRAL_BONUS_REFERRER`: Credits for the person who referred
- `REFERRAL_BONUS_REFERRED`: Credits for the new user

### Customize Referral Code Format

Edit `supabase/functions/on-auth-user-created/index.ts`:

```typescript
function makeReferralCode(userId: string): string {
  // Current: 12 char uppercase alphanumeric
  // Customize as needed (e.g., add prefix, change length)
  const base = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `REF-${base}`;  // Add prefix example
}
```

### Add Anti-Abuse Checks

The Edge Function includes basic self-referral prevention. Add more checks as needed:
- IP-based throttling
- Email domain validation
- Maximum referrals per user
- Time-based restrictions

## 11. Backup & Rollback

### Backup Current State

```bash
# Export current credit ledger
supabase db dump --schema public --table credit_ledger > backup_ledger.sql

# Export profiles
supabase db dump --schema public --table profiles > backup_profiles.sql
```

### Rollback Migration (if needed)

```sql
-- Run in Supabase SQL Editor
DROP TABLE IF EXISTS public.credit_ledger CASCADE;
DROP TABLE IF EXISTS public.stripe_customers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS credit_reason CASCADE;
DROP FUNCTION IF EXISTS public.get_credit_balance(UUID);
```

## Support & Troubleshooting

If you encounter issues:

1. Check Edge Function logs first
2. Verify all environment variables are set correctly
3. Test webhook configuration in Supabase Dashboard
4. Review RLS policies if data access issues occur
5. Check Stripe Dashboard for customer creation errors

## Security Considerations

✅ **Implemented:**
- RLS policies prevent direct client writes
- Edge Function uses service role for secure writes
- Self-referral prevention
- Input validation on referral codes

⚠️ **Consider Adding:**
- Rate limiting on sign-ups
- Email verification requirement before credits
- IP-based fraud detection
- Maximum referral limits per user
- Admin dashboard for reviewing suspicious activity

---

✅ **Deployment Complete!** 

Your referral system is now live. Users can sign up with referral codes, earn credits, and track their referrals.
