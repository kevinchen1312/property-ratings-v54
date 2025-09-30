# 🔗 Enable Stripe Connect - Quick Setup

## The Problem

If you're getting redirected to a generic Stripe page, it's likely because **Stripe Connect isn't enabled** in your Stripe account yet.

---

## ✅ How to Enable Stripe Connect

### Step 1: Go to Stripe Dashboard

https://dashboard.stripe.com/connect/accounts/overview

### Step 2: Enable Connect

You might see a button like **"Get started with Connect"** or **"Enable Connect"**

Click it to activate Stripe Connect for your account.

### Step 3: Configure Connect Settings

1. **Platform name**: `Leadsong Property Ratings`
2. **Platform URL**: `https://leadsong.com`
3. **Support email**: Your support email
4. **Account type**: Choose **Express** (this is what we're using)

### Step 4: Accept Terms of Service

Stripe will ask you to accept their Connect Platform Agreement. Read and accept it.

---

## 🧪 Testing in Test Mode

While in **test mode**, you can create Express accounts and test the complete flow:

1. Raters click "Connect Stripe"
2. Fill out the onboarding form
3. Link a **test bank account** (use test credentials like `000123456789`)
4. Complete setup

In test mode, you'll see:
- Test bank institutions (StripeBank, Test Institution, etc.)
- Fake SSN accepted: `000-00-0000`
- Instant verification

---

## 🎯 What You Should See

After enabling Connect and redeploying, when a rater taps **"🔗 Stripe Connection"**, they should see:

### Mobile Onboarding Flow:
1. **Verify login** - SMS verification code
2. **Tell us about your business** - Country, business type
3. **Business details** - Website or product description
4. **Bank details** - Select bank account for payouts
5. **Review and submit** - Final confirmation

This is the EXACT flow shown in your Rocket Rides screenshots - but branded for **Leadsong**!

---

## ✅ After Enabling

Once Connect is enabled:

1. **Restart your app** (stop and `npm start` again)
2. **Test the flow**:
   - Open Earnings screen
   - Tap "🔗 Stripe Connection"
   - You should see the Stripe onboarding form (not a marketing page!)
   - Fill it out with test data
   - Complete setup

---

## 🚨 Common Issues

### "Connect is not enabled"
- Go to Stripe Dashboard → Connect → Enable

### "Platform not verified"
- Complete your Stripe account profile
- Verify your business/email

### "Invalid account type"
- Make sure you selected **Express** accounts in Connect settings

---

## 📞 Need Help?

If you get stuck:
1. Check Stripe's Connect logs: https://dashboard.stripe.com/logs
2. Look for errors in Supabase function logs
3. Check the app console logs when tapping the button

