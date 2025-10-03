# Deployment Guide

## Deploying to Vercel

### 1. Initial Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd website
vercel
```

### 2. Environment Variables

Add these in Vercel Dashboard (Project Settings → Environment Variables):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx  # Use live keys in production!
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Deep Links
APP_SUCCESS_DEEPLINK_SCHEME=https://leadsong.com/return
APP_CANCEL_DEEPLINK_SCHEME=leadsong://purchase/cancel
SITE_URL=https://leadsong.com

# Stripe Price IDs (PRODUCTION)
STRIPE_PRICE_1_CREDIT=price_xxxxx
STRIPE_PRICE_5_CREDITS=price_xxxxx
STRIPE_PRICE_10_CREDITS=price_xxxxx
STRIPE_PRICE_25_CREDITS=price_xxxxx
```

### 3. Domain Setup

1. **Add custom domain** in Vercel:
   - Settings → Domains → Add
   - Add `leadsong.com`
   - Configure DNS records as shown

2. **Update Supabase redirect URLs**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add `https://leadsong.com/auth/callback` to Redirect URLs

### 4. Stripe Webhook (Production)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)

2. Click "Add endpoint"

3. Configure:
   - **URL**: `https://leadsong.com/api/webhooks/stripe`
   - **Events to send**: Select `checkout.session.completed`
   - **API version**: Latest

4. Copy the **Signing secret** (`whsec_xxx`)

5. Add to Vercel environment variables:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET production
   # Paste the signing secret
   ```

6. Redeploy:
   ```bash
   vercel --prod
   ```

### 5. Database Migration

Run the migration in your **production** Supabase project:

```sql
-- Copy contents of migrations/001_credit_system.sql
-- Execute in Supabase SQL Editor (production project)
```

### 6. Test Production Deployment

1. **Visit production URL**: `https://leadsong.com/credits`

2. **Test with real payment**:
   - Use a real card (charge will go through!)
   - Or use Stripe test mode if still testing

3. **Verify webhook delivery**:
   - Check Stripe Dashboard → Webhooks
   - Should show successful delivery (200 response)

4. **Check database**:
   ```sql
   SELECT * FROM credit_ledger ORDER BY created_at DESC LIMIT 5;
   SELECT id, credits FROM profiles ORDER BY updated_at DESC LIMIT 5;
   ```

5. **Refund test payment** (if needed):
   - Stripe Dashboard → Payments → Find payment → Refund

## Continuous Deployment

Vercel automatically deploys on Git push:

```bash
git add .
git commit -m "Update credit packages"
git push origin main
# Vercel deploys automatically
```

## Monitoring

### Webhook Deliveries

Monitor in Stripe Dashboard:
- Go to Webhooks → Your endpoint
- View recent deliveries
- Check for failed deliveries (retries automatically)

### Supabase Logs

Check for errors:
- Supabase Dashboard → Logs
- Filter by "API" or "Database"

### Vercel Logs

```bash
vercel logs production
```

Or in Vercel Dashboard → Deployments → Click latest → Logs

## Rollback

If something goes wrong:

```bash
# List deployments
vercel list

# Promote previous deployment
vercel promote [deployment-url]
```

## Security Checklist

- [ ] All environment variables set in Vercel
- [ ] Service role key NOT exposed to client
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] RLS policies enabled on all tables
- [ ] Stripe in live mode (not test mode)
- [ ] Universal links / App links configured
- [ ] Error monitoring set up (optional: Sentry)

## Troubleshooting

### Webhook 404 Error

- Verify webhook URL: `https://leadsong.com/api/webhooks/stripe`
- Check deployment completed successfully
- Test endpoint manually: `curl https://leadsong.com/api/webhooks/stripe`

### Credits not updating

- Check webhook received 200 response in Stripe Dashboard
- Check Supabase logs for errors
- Verify `credit_ledger` entry was created
- Check `profiles.credits` was incremented

### Deep link not working

- Verify universal links are set up correctly
- Test fallback page: `https://leadsong.com/return?session_id=test`
- Check app is installed on device
- Try manual deep link test

## Support

- **Vercel Support**: https://vercel.com/support
- **Stripe Support**: https://support.stripe.com
- **Supabase Support**: https://supabase.com/support

