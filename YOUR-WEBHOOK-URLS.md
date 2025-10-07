# ✅ Your Actual Webhook URLs

## 🔗 Stripe Connect Webhook (for payouts)

**Use this URL when creating the webhook in Stripe Dashboard:**

```
https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeConnectWebhook
```

**Events to select:**
- ✅ `account.updated`
- ✅ `account.application.authorized`
- ✅ `account.application.deauthorized`
- ✅ `account.external_account.created`
- ✅ `account.external_account.updated`
- ✅ `account.external_account.deleted`
- ✅ `capability.updated`

---

## 💳 Payment Webhook (for purchases)

**If you also need the payment webhook:**

```
https://oyphcjbickujybvbeame.supabase.co/functions/v1/stripeWebhook
```

**Events to select:**
- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`

---

## 📋 Your Supabase Project Info

**Project URL:**
```
https://oyphcjbickujybvbeame.supabase.co
```

**Project Ref:**
```
oyphcjbickujybvbeame
```

**Dashboard:**
```
https://app.supabase.com/project/oyphcjbickujybvbeame
```

---

## 🚀 Quick Deploy Commands

When you need to redeploy functions:

```powershell
# Link to your project (one-time setup)
npx supabase link --project-ref oyphcjbickujybvbeame

# Deploy payout processing
npx supabase functions deploy processPayouts --project-ref oyphcjbickujybvbeame

# Deploy Connect webhook
npx supabase functions deploy stripeConnectWebhook --project-ref oyphcjbickujybvbeame

# Deploy account creation
npx supabase functions deploy createStripeConnectAccount --project-ref oyphcjbickujybvbeame
```

---

## 📍 Where to Use These URLs

### In Stripe Dashboard (Live Mode):
1. Go to: https://dashboard.stripe.com/webhooks
2. Make sure toggle says **"Live mode"**
3. Click **"Add endpoint"**
4. Paste webhook URL
5. Select events
6. Save and copy the signing secret

### In Supabase Dashboard:
1. Go to: https://app.supabase.com/project/oyphcjbickujybvbeame/settings/functions
2. Update secrets with your live Stripe keys
3. Redeploy functions using commands above

---

## ✅ Verification

After setup, test the webhook:
1. In Stripe Dashboard → Webhooks → Your webhook
2. Click "Send test webhook"
3. Select any event type
4. Check Supabase function logs for the event

---

**✨ These are your actual, working URLs - no placeholders!**
