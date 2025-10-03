# Quick Reference Card

## Essential URLs

```
Development:  http://localhost:3000/credits
Production:   https://leadsong.com/credits
Deep Link:    leadsong://purchase/success
Webhook:      https://leadsong.com/api/webhooks/stripe
```

## Environment Variables

```bash
# Required (Development)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# Stripe Price IDs
STRIPE_PRICE_1_CREDIT
STRIPE_PRICE_5_CREDITS
STRIPE_PRICE_10_CREDITS
STRIPE_PRICE_25_CREDITS
```

## Common Commands

```bash
# Setup
cp .env.example .env.local
npm install

# Development (2 terminals)
npm run stripe:listen        # Terminal 1
npm run dev                  # Terminal 2

# Testing
npm run test:webhook         # Test webhook locally
node -e "console.log(process.env.STRIPE_SECRET_KEY)" # Check env var

# Deployment
vercel                       # Deploy to preview
vercel --prod                # Deploy to production
vercel logs production       # View logs
```

## Database Queries

```sql
-- Check recent credit purchases
SELECT * FROM credit_ledger 
ORDER BY created_at DESC 
LIMIT 10;

-- Check user balance
SELECT id, credits 
FROM profiles 
WHERE id = 'USER_ID';

-- Check for duplicate sessions (idempotency test)
SELECT stripe_session_id, COUNT(*) 
FROM credit_ledger 
GROUP BY stripe_session_id 
HAVING COUNT(*) > 1;

-- Total credits purchased by user
SELECT 
  user_id, 
  SUM(delta) as total_credits 
FROM credit_ledger 
WHERE delta > 0 
GROUP BY user_id;
```

## Stripe Test Cards

```
Success:              4242 4242 4242 4242
Decline:              4000 0000 0000 0002
Insufficient Funds:   4000 0000 0000 9995
Requires Auth:        4000 0025 0000 3155

Expiry:  Any future date (e.g., 12/30)
CVC:     Any 3 digits (e.g., 123)
ZIP:     Any 5 digits (e.g., 12345)
```

## API Endpoints

### POST /api/checkout
**Request:**
```json
{
  "packageKey": "10"
}
```
**Response:**
```json
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

### GET /api/me/credits
**Response:**
```json
{
  "credits": 20,
  "userId": "123e4567-..."
}
```

### POST /api/webhooks/stripe
**Headers:**
```
stripe-signature: t=xxx,v1=yyy
```
**Body:** Raw Stripe event JSON

## Webhook Events

```javascript
// Listen for
event.type === 'checkout.session.completed'

// Extract
const { user_id, packageKey } = session.metadata;
const credits = CREDIT_PACKAGES[packageKey].credits;

// Process
1. Verify signature
2. Check payment_status === 'paid'
3. Check idempotency (credit_ledger)
4. Insert ledger entry
5. Update profiles.credits
6. Return 200
```

## Deep Link Formats

```bash
# Custom scheme (iOS/Android)
leadsong://purchase/success?session_id=cs_xxx
leadsong://purchase/cancel

# Universal link (iOS) - Future
https://leadsong.com/return?session_id=cs_xxx
```

## File Locations

```
Config:       lib/config.ts
Stripe:       lib/stripe.ts
Supabase:     lib/supabaseServer.ts
Migration:    migrations/001_credit_system.sql
Checkout:     app/api/checkout/route.ts
Webhook:      app/api/webhooks/stripe/route.ts
Main Page:    app/credits/page.tsx
```

## Debugging Commands

```bash
# Check webhook signature
stripe listen --print-json

# Trigger test webhook
stripe trigger checkout.session.completed

# View Stripe logs
stripe logs tail

# Test deep link (Android)
adb shell am start -a android.intent.action.VIEW \
  -d "leadsong://purchase/success?session_id=test"

# Test deep link (iOS Simulator)
xcrun simctl openurl booted \
  "leadsong://purchase/success?session_id=test"

# Check Supabase connection
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM profiles;"
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing signature` | No webhook secret | Set `STRIPE_WEBHOOK_SECRET` |
| `Invalid signature` | Wrong secret | Get new secret from `stripe listen` |
| `Unauthorized` | No user session | Check Supabase auth |
| `Invalid package key` | Wrong packageKey | Use '1', '5', '10', or '25' |
| `Webhook 404` | Route not found | Check URL: `/api/webhooks/stripe` |

## Monitoring

```bash
# Stripe Dashboard
https://dashboard.stripe.com/webhooks

# Supabase Logs
https://app.supabase.com/project/YOUR_PROJECT/logs

# Vercel Logs
vercel logs production --follow
```

## Credit Package Prices

| Credits | Price | Price/Credit | Savings |
|---------|-------|--------------|---------|
| 1       | $4.99 | $4.99        | -       |
| 5       | $19.99| $3.99        | 20%     |
| 10      | $34.99| $3.49        | 30%     |
| 25      | $74.99| $2.99        | 40%     |

*Edit in `lib/config.ts` → `CREDIT_PACKAGES`*

## Security Checklist

- [ ] HTTPS enabled
- [ ] Webhook signature verified
- [ ] Service role key server-only
- [ ] RLS policies enabled
- [ ] Idempotency implemented
- [ ] Input validation on all endpoints

## Performance Targets

- **Checkout Creation**: < 500ms
- **Webhook Processing**: < 1s
- **Credit Update Latency**: < 3s
- **Page Load**: < 2s

## Support Contacts

```
Email:     support@leadsong.com
Stripe:    https://support.stripe.com
Supabase:  https://supabase.com/support
Vercel:    https://vercel.com/support
```

## Quick Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Documentation Index](./INDEX.md)

---

**💡 Tip**: Bookmark this page for quick reference during development!

