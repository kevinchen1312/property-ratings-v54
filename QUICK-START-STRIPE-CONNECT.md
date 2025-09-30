# ⚡ Quick Start - Stripe Connect Express

Get Stripe Connect up and running in 15 minutes.

---

## 🎯 Goal

Enable contributors to receive payouts for rating properties.

---

## ⏱️ 15-Minute Setup

### Step 1: Database (3 minutes)

Run these in Supabase SQL Editor:

```sql
-- Migration 1: Revenue sharing tables
\i revenue-sharing-schema-safe.sql

-- Migration 2: Stripe Connect tables
\i stripe-connect-migration-safe.sql

-- Validation
\i validate-stripe-connect-setup.sql
```

✅ **Expected:** All validation checks show "OK" or "✅"

---

### Step 2: Stripe Setup (5 minutes)

1. **Enable Stripe Connect**
   - Go to https://dashboard.stripe.com/connect
   - Click "Get Started" or "Settings"
   - Enable **Express accounts**

2. **Create Platform Settings**
   - Name: `Leadsong Property Ratings`
   - URL: Your app URL
   - Support email: Your email

3. **Create Webhook**
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripeConnectWebhook`
   - Events: Select all `account.*` events
   - Copy webhook secret (starts with `whsec_`)

---

### Step 3: Environment Variables (2 minutes)

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

---

### Step 4: Deploy Functions (3 minutes)

```bash
# Deploy all three functions
npx supabase functions deploy createStripeConnectAccount
npx supabase functions deploy stripeConnectWebhook
npx supabase functions deploy processPayouts
```

✅ **Expected:** Three successful deployments

---

### Step 5: Test (2 minutes)

1. **Open your app** and go to Earnings screen
2. **Click** "🔗 Stripe Connection"
3. **Complete onboarding** with test data:
   - SSN: `000-00-0000`
   - Bank routing: `110000000`
   - Bank account: `000123456789`
4. **Create test earnings** (run `scripts/createTestEarnings.sql`)
5. **Request payout** - should succeed!

---

## ✅ Success Checklist

- [ ] All migrations run without errors
- [ ] Validation script shows all checks passing
- [ ] Stripe Connect enabled in dashboard
- [ ] Webhook created and secret saved
- [ ] Environment variables set
- [ ] Three functions deployed successfully
- [ ] Test account creation works
- [ ] Test onboarding redirects to Stripe
- [ ] Test payout processes successfully

---

## 📚 Next Steps

Once basic setup works:

1. **Read the full guides:**
   - [STRIPE-CONNECT-DEPLOYMENT-GUIDE.md](STRIPE-CONNECT-DEPLOYMENT-GUIDE.md) - Complete deployment
   - [STRIPE-CONNECT-API-REFERENCE.md](STRIPE-CONNECT-API-REFERENCE.md) - API documentation

2. **Test thoroughly:**
   - Run `node test-stripe-connect-flow.js YOUR_TOKEN`
   - Create multiple test users
   - Test edge cases

3. **Go to production:**
   - Switch to Stripe live mode
   - Update to live API keys
   - Create live webhooks
   - Test with real bank account

---

## 🐛 Troubleshooting

### "Stripe Connect not enabled"
→ Go to Stripe Dashboard → Connect → Enable

### "No Stripe account" error
→ Complete the onboarding flow first

### "Payouts not enabled"
→ Finish Stripe verification steps

### Webhook not received
→ Check URL and webhook secret match

### More help?
→ See [STRIPE-CONNECT-DEPLOYMENT-GUIDE.md](STRIPE-CONNECT-DEPLOYMENT-GUIDE.md) Troubleshooting section

---

## 🎉 You're Done!

Your platform now has a complete Stripe Connect integration:

✅ Users onboard to Stripe Express  
✅ Stripe verifies identities  
✅ Payouts transfer automatically  
✅ No sensitive data on your platform  

**Total setup time:** ~15 minutes  
**Ongoing maintenance:** ~5 minutes/week  

---

*For detailed documentation, see [STRIPE-CONNECT-IMPLEMENTATION-SUMMARY.md](STRIPE-CONNECT-IMPLEMENTATION-SUMMARY.md)*
