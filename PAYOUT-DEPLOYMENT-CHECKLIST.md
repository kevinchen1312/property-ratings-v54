# 🚀 Payout System Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Database Migrations
- [ ] Run `revenue-sharing-schema-safe.sql` in Supabase SQL Editor
- [ ] Run `stripe-connect-migration-safe.sql` in Supabase SQL Editor
- [ ] Verify tables exist: `property_contributors`, `revenue_distribution`, `contributor_payouts`, `user_stripe_accounts`

### 2. Stripe Account Setup
- [ ] Enable Stripe Connect in your Stripe Dashboard
- [ ] Configure Express accounts in Stripe Connect settings
- [ ] Get your Stripe Secret Key (test or production)
- [ ] Set up webhook endpoint for `checkout.session.completed` events
- [ ] Save the webhook secret

### 3. Supabase Environment Variables
Set these in **Supabase Dashboard → Edge Functions → Secrets**:

- [ ] `STRIPE_SECRET_KEY` - Your Stripe secret key
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key from Supabase settings
- [ ] `RESEND_API_KEY` - For email notifications (optional)

### 4. Deploy Edge Functions
```bash
# Login to Supabase (if not already)
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
npx supabase functions deploy createStripeConnectAccount
npx supabase functions deploy processPayouts
npx supabase functions deploy stripeWebhook
```

- [ ] `createStripeConnectAccount` deployed successfully
- [ ] `processPayouts` deployed successfully
- [ ] `stripeWebhook` deployed successfully

---

## 🧪 Testing Checklist

### Test Mode (Stripe Test Keys)

#### 1. Test Stripe Connect Onboarding
- [ ] As a rater, go to Earnings screen
- [ ] Click "🔗 Stripe Connection" button
- [ ] Complete Stripe Express onboarding with test data:
  - SSN: `000-00-0000`
  - Bank routing: `110000000`
  - Bank account: `000123456789`
- [ ] Verify account shows as connected in UI

#### 2. Test Revenue Distribution
- [ ] Have a test user rate some properties
- [ ] Use another user to purchase a report for those properties
- [ ] Check database: `SELECT * FROM contributor_payouts WHERE status = 'pending';`
- [ ] Verify pending payouts were created for the rater

#### 3. Test Payout Request
- [ ] As rater with pending payouts, go to Earnings screen
- [ ] Verify available balance is shown correctly
- [ ] Click "💰 Request Payout" button
- [ ] Verify payout is processed (status changes to 'paid')
- [ ] Check Stripe Dashboard → Transfers for the transfer record

#### 4. Test Error Handling
- [ ] Try to request payout without Stripe account connected
- [ ] Try to request payout with balance < $1.00
- [ ] Try to request payout with incomplete Stripe onboarding
- [ ] Verify proper error messages are shown

---

## 📊 Monitoring After Launch

### Key Metrics to Track

1. **Revenue Distribution**
```sql
-- Check total revenue split
SELECT 
  COUNT(*) as total_distributions,
  SUM(platform_share) as platform_revenue,
  SUM(top_contributor_share + other_contributors_share) as rater_payouts
FROM revenue_distribution;
```

2. **Pending Payouts**
```sql
-- Check pending payouts
SELECT 
  COUNT(*) as pending_count,
  SUM(payout_amount) as total_pending
FROM contributor_payouts
WHERE status = 'pending';
```

3. **Payout Success Rate**
```sql
-- Check payout success rate
SELECT 
  status,
  COUNT(*) as count,
  SUM(payout_amount) as total_amount
FROM contributor_payouts
GROUP BY status
ORDER BY status;
```

4. **Stripe Account Status**
```sql
-- Check how many raters have connected accounts
SELECT 
  COUNT(*) as total_accounts,
  SUM(CASE WHEN payouts_enabled THEN 1 ELSE 0 END) as verified_accounts,
  SUM(CASE WHEN account_status = 'pending' THEN 1 ELSE 0 END) as pending_accounts
FROM user_stripe_accounts;
```

---

## 🔧 Common Issues & Solutions

### Issue: "Stripe Connect not enabled"
**Solution:** Go to Stripe Dashboard → Settings → Connect and enable Connect for your account

### Issue: Rater can't complete onboarding
**Solution:** Check if:
- Stripe account is in test mode (for testing)
- User provided valid information
- User is in a supported country (US, UK, EU, etc.)

### Issue: Payouts failing silently
**Solution:** Check Supabase Edge Function logs:
```bash
npx supabase functions logs processPayouts
```

### Issue: Revenue not being distributed
**Solution:** Check Stripe webhook is properly configured and receiving events:
- Go to Stripe Dashboard → Developers → Webhooks
- Verify webhook endpoint is active
- Check webhook logs for errors

---

## 🎯 Production Deployment

### Before Going Live:

1. **Switch to Production Stripe Keys**
   - [ ] Get production Stripe secret key
   - [ ] Update `STRIPE_SECRET_KEY` in Supabase secrets
   - [ ] Create production webhook endpoint
   - [ ] Update `STRIPE_WEBHOOK_SECRET` in Supabase secrets

2. **Update Webhook URLs**
   - [ ] Set production webhook URL in Stripe Dashboard
   - [ ] Test webhook is receiving events

3. **Test with Real Money (Small Amount)**
   - [ ] Make a small test purchase ($1-2)
   - [ ] Verify revenue distribution works
   - [ ] Request a test payout
   - [ ] Verify money arrives in test bank account

4. **Monitor First Week**
   - [ ] Check payout processing daily
   - [ ] Monitor Stripe Dashboard for issues
   - [ ] Check Supabase logs for errors
   - [ ] Verify raters are receiving payments

---

## 📞 Support Resources

- **Stripe Support:** https://support.stripe.com/
- **Stripe Connect Docs:** https://stripe.com/docs/connect
- **Supabase Support:** https://supabase.com/support
- **Edge Functions Logs:** `npx supabase functions logs FUNCTION_NAME`

---

## ✨ Success Criteria

System is working correctly when:
- ✅ Raters can connect Stripe Express accounts
- ✅ Revenue is automatically distributed when reports are purchased
- ✅ Pending payouts appear in raters' Earnings screen
- ✅ Raters can request payouts with one tap
- ✅ Money transfers appear in Stripe Dashboard
- ✅ Raters receive money in their bank accounts
- ✅ All payout statuses are tracked correctly in database

---

## 🎉 You're Ready!

Once all items above are checked, your payout system is production-ready!

