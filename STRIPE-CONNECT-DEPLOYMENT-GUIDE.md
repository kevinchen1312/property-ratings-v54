# 🚀 Stripe Connect Express - Complete Deployment Guide

Complete guide to deploying Stripe Connect Express for contributor payouts in your property ratings platform.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Stripe Configuration](#stripe-configuration)
4. [Environment Variables](#environment-variables)
5. [Deploy Edge Functions](#deploy-edge-functions)
6. [Testing the Integration](#testing-the-integration)
7. [Going to Production](#going-to-production)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

Before you begin, ensure you have:

- ✓ Supabase project created
- ✓ Stripe account created (test mode enabled)
- ✓ Supabase CLI installed (`npm install -g supabase`)
- ✓ Database migrations already applied (property, rating, purchase tables)

---

## 🗄️ Database Setup

### Step 1: Apply Revenue Sharing Schema

Run this migration to create revenue distribution tables:

```bash
# In Supabase SQL Editor, run:
\i revenue-sharing-schema-safe.sql
```

This creates:
- `property_contributors` - Tracks who has rated each property
- `revenue_distribution` - Records how revenue is split
- `contributor_payouts` - Individual payout records

### Step 2: Apply Stripe Connect Schema

Run this migration to create Stripe account tracking:

```bash
# In Supabase SQL Editor, run:
\i stripe-connect-migration-safe.sql
```

This creates:
- `user_stripe_accounts` - Stores Stripe Express account info
- `payout_batches` - Tracks batch payout runs
- Helper functions for account status

### Step 3: Update Payout Status Field

The `contributor_payouts` table needs updated status values:

```sql
-- Update status field to support all required states
ALTER TABLE contributor_payouts 
ALTER COLUMN status TYPE TEXT;

-- Add comment
COMMENT ON COLUMN contributor_payouts.status IS 
  'pending, processing, paid, failed, completed, cancelled';

-- The status field should already be TEXT from the migration
-- This just ensures it supports all values we use
```

### Step 4: Verify Tables

```sql
-- Check that all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'property_contributors',
    'revenue_distribution',
    'contributor_payouts',
    'user_stripe_accounts',
    'payout_batches'
  );

-- Should return 5 rows
```

---

## 🔧 Stripe Configuration

### Step 1: Enable Stripe Connect

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Connect** in the left sidebar
3. Click **Get Started** or **Settings**
4. Enable **Express accounts** (recommended for your use case)

### Step 2: Configure Platform Settings

1. **Platform Name**: `Leadsong Property Ratings`
2. **Platform URL**: Your production URL (e.g., `https://leadsong.com`)
3. **Support Email**: Your support email
4. **Branding**: Upload logo (optional but recommended)

### Step 3: Create Webhook Endpoints

Create **two** webhook endpoints in Stripe Dashboard → Developers → Webhooks:

#### Webhook 1: Connect Events
- **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/stripeConnectWebhook`
- **Description**: Stripe Connect account events
- **Events to send**:
  - `account.updated`
  - `account.application.authorized`
  - `account.application.deauthorized`
  - `account.external_account.created`
  - `account.external_account.updated`
  - `account.external_account.deleted`
  - `capability.updated`
- **Copy the webhook signing secret** (starts with `whsec_`)

#### Webhook 2: Payment Events (if not already created)
- **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/stripeWebhook`
- **Description**: Purchase and payment events
- **Events to send**:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- **Copy the webhook signing secret**

---

## 🔐 Environment Variables

### Step 1: Set Supabase Secrets

Go to Supabase Dashboard → Edge Functions → Secrets and add:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_test_key_here

# Webhook Secrets (different for each webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_your_payment_webhook_secret
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_your_connect_webhook_secret

# Supabase URLs and Keys
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Optional: Email service (if using Resend)
RESEND_API_KEY=re_your_resend_key
```

### Step 2: Get Your Stripe Keys

**Test Mode** (for development):
1. Go to [Stripe Dashboard → API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy **Secret key** (starts with `sk_test_`)

**Live Mode** (for production - do this later):
1. Toggle to **Live mode** in Stripe Dashboard
2. Go to API Keys
3. Copy **Secret key** (starts with `sk_live_`)

---

## 🚀 Deploy Edge Functions

### Step 1: Login to Supabase CLI

```bash
npx supabase login
```

### Step 2: Link Your Project

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Deploy Functions

Deploy all Stripe Connect-related functions:

```bash
# Deploy Stripe Connect account management
npx supabase functions deploy createStripeConnectAccount

# Deploy Stripe Connect webhook handler
npx supabase functions deploy stripeConnectWebhook

# Deploy payout processing
npx supabase functions deploy processPayouts

# Optional: Deploy payment webhook if not already deployed
npx supabase functions deploy stripeWebhook
```

### Step 4: Verify Deployment

Check function logs:

```bash
# View recent logs
npx supabase functions logs createStripeConnectAccount
npx supabase functions logs stripeConnectWebhook
npx supabase functions logs processPayouts
```

---

## 🧪 Testing the Integration

### Test 1: Create Test Stripe Account

1. **In your app**, navigate to Earnings screen
2. Click **"🔗 Stripe Connection"** button
3. You should be redirected to Stripe onboarding
4. Fill out the form with **test data**:
   - **Business type**: Individual
   - **Country**: United States
   - **Email**: Use your test email
   - **SSN**: `000-00-0000` (test mode accepts this)
   - **DOB**: Any date (must be 18+)
   - **Bank Account**:
     - Routing: `110000000`
     - Account: `000123456789`
5. Submit the form

### Test 2: Verify Account Status

Check database:

```sql
SELECT 
  u.email,
  usa.stripe_account_id,
  usa.account_status,
  usa.payouts_enabled,
  usa.details_submitted
FROM user_stripe_accounts usa
JOIN auth.users u ON usa.user_id = u.id
ORDER BY usa.created_at DESC;
```

### Test 3: Simulate Payout

#### Create test earnings:

```sql
-- First, create a test revenue distribution
INSERT INTO revenue_distribution (
  purchase_id,
  property_id,
  total_revenue,
  platform_share,
  top_contributor_share,
  other_contributors_share,
  top_contributor_id
) VALUES (
  (SELECT id FROM purchase LIMIT 1), -- Use an existing purchase
  (SELECT id FROM property LIMIT 1), -- Use an existing property
  10.00,
  7.00,
  1.50,
  1.50,
  (SELECT id FROM auth.users WHERE email = 'YOUR_TEST_EMAIL')
);

-- Create a pending payout
INSERT INTO contributor_payouts (
  revenue_distribution_id,
  user_id,
  payout_amount,
  rating_count,
  is_top_contributor,
  status
) VALUES (
  (SELECT id FROM revenue_distribution ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users WHERE email = 'YOUR_TEST_EMAIL'),
  1.50,
  5,
  true,
  'pending'
);
```

#### Request payout in the app:

1. Open Earnings screen
2. You should see **$1.50** available
3. Click **"💰 Request Payout"**
4. Confirm the payout

#### Verify payout:

```sql
SELECT 
  cp.*,
  rd.total_revenue,
  p.name as property_name
FROM contributor_payouts cp
JOIN revenue_distribution rd ON cp.revenue_distribution_id = rd.id
LEFT JOIN property p ON rd.property_id = p.id
WHERE cp.user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_TEST_EMAIL')
ORDER BY cp.created_at DESC;
```

### Test 4: Check Stripe Dashboard

1. Go to [Stripe Connect → Accounts](https://dashboard.stripe.com/test/connect/accounts/overview)
2. You should see the Express account you created
3. Click on it to view details
4. Check the **Transfers** tab - you should see the test transfer

---

## 🌐 Going to Production

### Step 1: Complete Stripe Verification

Before going live, Stripe requires:

1. **Verify your business**
   - Business type (LLC, Corporation, etc.)
   - EIN or SSN
   - Business address
   - Bank account for platform fees

2. **Activate your account**
   - Complete identity verification
   - Add payment details

### Step 2: Switch to Live Mode

1. In Stripe Dashboard, toggle to **Live mode**
2. Get your **live API keys**:
   - Secret key: `sk_live_...`
3. Create **live webhook endpoints** (same URLs, but in live mode)
4. Get new webhook secrets

### Step 3: Update Production Secrets

In Supabase Dashboard → Settings → Secrets, update:

```bash
STRIPE_SECRET_KEY=sk_live_your_live_key_here
STRIPE_WEBHOOK_SECRET=whsec_live_webhook_secret
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_live_connect_webhook_secret
```

### Step 4: Test Live Onboarding

1. Have a test user go through the onboarding flow
2. Use **real** bank account information
3. Verify account gets approved by Stripe (usually 1-2 days)

### Step 5: Process First Live Payout

1. Wait for real earnings to accumulate
2. User requests payout
3. Verify money arrives in their bank account (1-2 business days)

---

## 🐛 Troubleshooting

### Issue: "Stripe Connect not enabled"

**Solution:**
1. Go to Stripe Dashboard → Connect
2. Click "Enable Connect" or "Get Started"
3. Complete the platform setup wizard

### Issue: "No Stripe Account" error when requesting payout

**Symptoms:** User sees error message about connecting bank account

**Solution:**
1. User needs to complete Stripe onboarding
2. Click "🔗 Stripe Connection" button
3. Complete all steps in Stripe form

### Issue: "Payouts Not Enabled" error

**Symptoms:** Account created but payouts fail

**Solution:**
1. Check Stripe Dashboard → Connect → Accounts
2. Find the user's account
3. Look for **Requirements** tab
4. Complete any missing verification steps

### Issue: Webhook not receiving events

**Symptoms:** Account status doesn't update automatically

**Solution:**
1. Check webhook URL is correct
2. Verify webhook secret matches environment variable
3. Check Stripe Dashboard → Webhooks → [Your webhook] → Events
4. Look for failed deliveries
5. Check function logs: `npx supabase functions logs stripeConnectWebhook`

### Issue: Transfer fails with "Insufficient funds"

**Symptoms:** Payout fails with Stripe error

**Solution:**
1. In test mode, you might need to create a charge first to have funds
2. In production, ensure your platform has received payment before distributing
3. Revenue sharing happens AFTER successful purchase

### Issue: Database errors when creating account

**Symptoms:** Function returns 500 error

**Check:**
1. RLS policies are enabled correctly
2. User is authenticated
3. Function logs for specific error: `npx supabase functions logs createStripeConnectAccount`

---

## 📊 Monitoring & Maintenance

### Daily Checks

Monitor:
1. **Failed payouts**: Check `contributor_payouts` table for `status = 'failed'`
2. **Webhook deliveries**: Stripe Dashboard → Webhooks → Check failure rate
3. **Function errors**: Supabase Dashboard → Edge Functions → Logs

### Weekly Checks

Review:
1. **Pending account verifications**: Reach out to users with stuck accounts
2. **Payout totals**: Ensure revenue distribution is working correctly
3. **Stripe fees**: Monitor Connect fees in Stripe Dashboard

### SQL Monitoring Queries

```sql
-- Check failed payouts
SELECT 
  u.email,
  cp.payout_amount,
  cp.payout_reference,
  cp.updated_at
FROM contributor_payouts cp
JOIN auth.users u ON cp.user_id = u.id
WHERE cp.status = 'failed'
ORDER BY cp.updated_at DESC;

-- Check accounts needing verification
SELECT 
  u.email,
  usa.stripe_account_id,
  usa.account_status,
  usa.payouts_enabled
FROM user_stripe_accounts usa
JOIN auth.users u ON usa.user_id = u.id
WHERE usa.account_status != 'active'
ORDER BY usa.created_at DESC;

-- Total platform revenue vs. payouts
SELECT 
  SUM(platform_share) as platform_revenue,
  SUM(top_contributor_share + other_contributors_share) as total_payouts,
  COUNT(*) as total_sales
FROM revenue_distribution;
```

---

## 🔗 Resources

- **Stripe Connect Docs**: https://stripe.com/docs/connect
- **Stripe Express Accounts**: https://stripe.com/docs/connect/express-accounts
- **Stripe Transfers**: https://stripe.com/docs/connect/charges-transfers
- **Stripe Testing**: https://stripe.com/docs/testing
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

---

## ✅ Deployment Checklist

Use this checklist to ensure everything is set up correctly:

- [ ] Revenue sharing schema applied
- [ ] Stripe Connect schema applied
- [ ] Tables verified in database
- [ ] Stripe Connect enabled in Stripe Dashboard
- [ ] Platform settings configured
- [ ] Webhook endpoints created (2 endpoints)
- [ ] Webhook secrets saved
- [ ] Environment variables set in Supabase
- [ ] All edge functions deployed
- [ ] Test account creation works
- [ ] Test payout works
- [ ] Webhook events received and processed
- [ ] Production Stripe account verified (when going live)
- [ ] Live API keys configured (when going live)

---

## 🎉 Success!

Once you've completed all steps:

✅ Users can onboard to Stripe Connect Express  
✅ Stripe handles all sensitive PII and banking data  
✅ Account status syncs automatically via webhooks  
✅ Users can access their Express Dashboard  
✅ Payouts process automatically to bank accounts  
✅ No manual intervention required  

**Your platform is now ready to handle contributor payouts!** 🚀
