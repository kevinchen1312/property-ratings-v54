# 🚀 Switch to LIVE Stripe Mode - Step by Step

## Overview
You're currently in **demo mode**. This guide will help you switch to **real Stripe payouts**.

---

## ✅ Step 1: Get Live Stripe API Keys

### 1.1 Go to Stripe Dashboard
Visit: https://dashboard.stripe.com/apikeys

### 1.2 Toggle to LIVE Mode
- Look for the toggle in the top-left corner
- Switch from **"Test mode"** to **"Live mode"**

### 1.3 Get Your Live Keys
You'll need:
- **Secret key**: Starts with `sk_live_...`
- **Publishable key**: Starts with `pk_live_...` (optional for now)

⚠️ **IMPORTANT**: Keep these keys secret! Don't commit them to git.

---

## ✅ Step 2: Create Live Webhooks

### 2.1 Go to Webhooks Section
Visit: https://dashboard.stripe.com/webhooks

Make sure you're in **LIVE mode** (check the toggle).

### 2.2 Create Connect Webhook

Click **"Add endpoint"** and configure:

**Endpoint URL:**
```
https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/stripeConnectWebhook
```

**Description:**
```
Stripe Connect account events (LIVE)
```

**Events to send:**
- ✅ `account.updated`
- ✅ `account.application.authorized`
- ✅ `account.application.deauthorized`
- ✅ `account.external_account.created`
- ✅ `account.external_account.updated`
- ✅ `account.external_account.deleted`
- ✅ `capability.updated`

**API version:** Use the latest (or 2023-10-16)

Click **"Add endpoint"**

### 2.3 Copy the Webhook Signing Secret
- After creating, click on the webhook
- Click **"Reveal"** next to "Signing secret"
- Copy it (starts with `whsec_`)
- Save it for Step 3

---

## ✅ Step 3: Update Supabase Environment Variables

### 3.1 Go to Supabase Dashboard
Visit: https://app.supabase.com/project/YOUR_PROJECT/settings/functions

### 3.2 Update These Secrets

Click on each secret and update with your LIVE values:

**STRIPE_SECRET_KEY**
```
sk_live_your_live_secret_key_here
```

**STRIPE_CONNECT_WEBHOOK_SECRET**
```
whsec_your_live_webhook_secret_here
```

⚠️ **IMPORTANT**: After updating, you need to redeploy your functions!

### 3.3 Redeploy Edge Functions

Open PowerShell in your project directory and run:

```powershell
# Deploy the payout processing function
npx supabase functions deploy processPayouts

# Deploy the Connect webhook handler
npx supabase functions deploy stripeConnectWebhook

# Deploy the Connect account creation function
npx supabase functions deploy createStripeConnectAccount
```

---

## ✅ Step 4: Clean Up Demo Accounts

### 4.1 Run the Cleanup Script

I've created a SQL script for you: `clean-demo-accounts.sql`

Run it in Supabase SQL Editor:
1. Go to: https://app.supabase.com/project/YOUR_PROJECT/sql
2. Open `clean-demo-accounts.sql`
3. Click **"Run"**

This will:
- Remove demo Stripe accounts from your database
- Keep all other user data intact
- Allow users to create real Stripe accounts

---

## ✅ Step 5: Enable Stripe Connect (If Not Already)

### 5.1 Go to Connect Settings
Visit: https://dashboard.stripe.com/settings/connect

### 5.2 Configure Platform
- **Platform name**: `Leadsong Property Ratings`
- **Platform URL**: Your production URL
- **Support email**: Your support email

### 5.3 Enable Express Accounts
Make sure **Express accounts** are enabled (they should be by default).

---

## ✅ Step 6: Test with Real Account

### 6.1 In Your App
1. Open the Earnings screen
2. Click **"🔗 Stripe Connection"**
3. You'll be taken to Stripe's LIVE onboarding

### 6.2 Complete Onboarding
You'll need to provide **REAL information**:
- ✅ Real name
- ✅ Real date of birth
- ✅ Real SSN (or EIN for business)
- ✅ Real bank account details
- ✅ Real address

### 6.3 Verification
- Stripe will verify your identity (usually instant)
- Bank verification may take 1-2 business days
- You'll receive micro-deposits to verify (or instant verification if available)

---

## ✅ Step 7: Test Real Payout

### 7.1 Create Test Earnings
Use the app to:
1. Rate some properties
2. Have someone purchase a report (or test purchase)
3. Earnings will appear in your Earnings screen

### 7.2 Request Payout
1. Click **"💰 Request Payout"**
2. Confirm the amount
3. Wait 1-2 business days

### 7.3 Verify Transfer in Stripe
Go to: https://dashboard.stripe.com/connect/transfers

You should see:
- Transfer ID starting with `tr_` (not `tr_demo_`)
- Status: "Paid" or "In transit"
- Destination: Your connected account

### 7.4 Check Your Bank Account
- Wait 1-2 business days
- You should see the money deposited
- Description will be "Payout for X property rating contribution(s)"

---

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] Stripe Dashboard shows "Live mode" toggle is ON
- [ ] Live API keys are set in Supabase secrets
- [ ] Live webhook endpoint is created and active
- [ ] Edge functions are redeployed
- [ ] Demo accounts are removed from database
- [ ] Users can complete real Stripe onboarding
- [ ] Real transfers appear in Stripe Dashboard (not demo transfers)
- [ ] Money arrives in bank account within 1-2 business days

---

## 🚨 Important Notes

### Security
- **NEVER** commit live API keys to git
- **NEVER** share your secret keys
- Use environment variables for all secrets

### Compliance
- You must comply with Stripe's terms of service
- Ensure your platform has proper terms & privacy policy
- Follow all financial regulations in your jurisdiction

### Testing
- Test with small amounts first ($1-5)
- Verify the complete flow before announcing to users
- Monitor the first few payouts closely

### Support
- Provide clear instructions to users
- Monitor failed payouts
- Have a support process for account issues

---

## 🐛 Troubleshooting

### "Stripe Connect not enabled"
- Go to https://dashboard.stripe.com/settings/connect
- Complete the Connect platform setup

### "Account not verified"
- Complete Stripe's identity verification
- Provide requested documents
- May take 1-2 business days

### "Transfer failed"
- Check Stripe Dashboard for error details
- Verify bank account is connected
- Ensure account has payouts enabled

### Webhook not working
- Verify webhook URL is correct
- Check signing secret matches Supabase secret
- Look at webhook logs in Stripe Dashboard

---

## 📞 Need Help?

If you run into issues:
1. Check Supabase function logs
2. Check Stripe Dashboard logs
3. Verify all environment variables are set
4. Ensure functions are redeployed after secret changes

---

## ✅ You're Ready!

Once you complete all steps, your app will be processing **real money** through Stripe! 💰

Users will receive actual payouts to their bank accounts. Make sure you:
- Monitor payouts regularly
- Handle failed transfers
- Provide support for users with account issues
- Keep accurate financial records

**Good luck with your launch! 🚀**
