# Leadsong Credits Purchase System - Project Summary

## What Was Built

A complete **Next.js 14 website** for purchasing credits via Stripe Checkout, designed to work seamlessly with the Leadsong React Native mobile app.

## Key Features

✅ **Stripe Checkout Integration**
- Create checkout sessions with custom price IDs
- Support for 4 credit packages (1, 5, 10, 25 credits)
- Idempotent webhook handling for fulfillment
- Signature verification for security

✅ **Supabase Integration**
- Server-side authentication via Supabase Auth
- Credit ledger for transaction tracking
- Automatic credit balance updates
- Row Level Security (RLS) policies

✅ **Deep Link Support**
- Custom scheme: `leadsong://purchase/success`
- Universal links ready (iOS/Android)
- Fallback page for desktop browsers
- Session ID passing for tracking

✅ **Mobile-First Design**
- Beautiful gradient purple UI matching app style
- Responsive package cards
- Real-time balance display
- Loading states and error handling

✅ **Production Ready**
- Idempotent webhook processing (no duplicate credits)
- Comprehensive error handling and logging
- Security best practices (service role key server-only)
- CORS support for mobile API calls

## File Structure

```
website/
├── app/
│   ├── api/
│   │   ├── checkout/route.ts              # Creates Stripe session
│   │   ├── webhooks/stripe/route.ts       # Handles fulfillment ✨
│   │   └── me/credits/route.ts            # Returns user balance
│   ├── credits/
│   │   ├── page.tsx                       # Main purchase page
│   │   └── page.module.css
│   ├── return/
│   │   ├── page.tsx                       # Universal link fallback
│   │   └── page.module.css
│   ├── auth/callback/route.ts             # OAuth callback
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                           # Redirects to /credits
├── components/
│   ├── PackageCard.tsx                    # Credit package UI
│   └── PackageCard.module.css
├── lib/
│   ├── config.ts                          # Environment config ⚙️
│   ├── stripe.ts                          # Stripe client
│   ├── supabaseServer.ts                  # Supabase utilities
│   └── database.types.ts                  # TypeScript types
├── migrations/
│   └── 001_credit_system.sql              # Database schema 🗄️
├── scripts/
│   └── test-webhook.js                    # Testing utility
├── __tests__/
│   └── webhook.test.ts                    # Unit tests
├── middleware.ts                           # Auth middleware
├── .env.example                           # Environment template
├── package.json
├── tsconfig.json
├── next.config.js
├── README.md                              # Full documentation 📖
├── QUICKSTART.md                          # 10-minute setup guide ⚡
├── DEPLOYMENT.md                          # Production deployment 🚀
├── MOBILE-APP-INTEGRATION.md              # Mobile app guide 📱
└── PROJECT-SUMMARY.md                     # This file
```

## How It Works

### Purchase Flow

```
1. User opens /credits from mobile app (authenticated)
2. User selects package → POST /api/checkout
3. Server creates Stripe Checkout Session
4. User redirected to Stripe → completes payment
5. Stripe redirects to: leadsong://purchase/success?session_id=XXX
6. Mobile app opens via deep link
7. App fetches updated balance from /api/me/credits
```

### Webhook Flow (Source of Truth)

```
1. Stripe sends checkout.session.completed webhook
2. Verify signature with STRIPE_WEBHOOK_SECRET
3. Extract user_id, packageKey from session.metadata
4. Check credit_ledger for duplicate session_id (idempotency)
5. Insert into credit_ledger
6. Update profiles.credits (increment)
7. Return 200 to Stripe
```

## Database Schema

### `profiles` table
```sql
- id: uuid (primary key, matches auth.users)
- credits: integer (default 0)
- created_at: timestamptz
- updated_at: timestamptz
```

### `credit_ledger` table
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key → profiles.id)
- delta: integer (positive = purchase, negative = spend)
- source: text ('stripe')
- stripe_session_id: text (unique - for idempotency)
- reason: text ('purchase:10')
- created_at: timestamptz
```

## Environment Variables

### Required for Development
```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_1_CREDIT
STRIPE_PRICE_5_CREDITS
STRIPE_PRICE_10_CREDITS
STRIPE_PRICE_25_CREDITS
```

### Optional
```env
APP_SUCCESS_DEEPLINK_SCHEME (default: leadsong://purchase/success)
APP_CANCEL_DEEPLINK_SCHEME (default: leadsong://purchase/cancel)
SITE_URL (default: https://leadsong.com)
```

## Key Security Features

🔒 **Webhook signature verification** - Prevents fake webhooks
🔒 **Service role key server-only** - Never exposed to client
🔒 **RLS policies** - Database-level security
🔒 **Idempotency** - Unique constraint on `stripe_session_id`
🔒 **Server-side validation** - All auth checks on server
🔒 **HTTPS enforced** - On Vercel automatically

## Testing Strategy

### Local Development
1. Run Stripe CLI webhook forwarding
2. Use Stripe test card `4242 4242 4242 4242`
3. Verify webhook logs in terminal
4. Check database for credit updates

### Idempotency Test
1. Complete purchase
2. Manually replay webhook (Stripe Dashboard)
3. Verify credits only added once

### Mobile Integration Test
1. Open `/credits` from mobile app
2. Complete purchase
3. Verify deep link redirect
4. Check balance updates in app

## Deployment Checklist

- [ ] Deploy to Vercel
- [ ] Configure custom domain (leadsong.com)
- [ ] Add environment variables to Vercel
- [ ] Create production Stripe webhook endpoint
- [ ] Update Stripe webhook secret
- [ ] Run database migration in production
- [ ] Create Stripe products (live mode)
- [ ] Update price IDs to live mode
- [ ] Test with real payment
- [ ] Configure universal links
- [ ] Update deep link URLs to production

## Quick Start Commands

```bash
# Install
cd website && npm install

# Setup environment
cp .env.example .env.local
# Fill in values

# Run migration
# Copy migrations/001_credit_system.sql to Supabase SQL Editor

# Start webhook listener (terminal 1)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Start dev server (terminal 2)
npm run dev

# Test webhook manually
node scripts/test-webhook.js
```

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 10 minutes
- **[README.md](./README.md)** - Complete documentation
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[MOBILE-APP-INTEGRATION.md](./MOBILE-APP-INTEGRATION.md)** - Mobile app setup

## TODO Markers in Code

Search for `TODO` in the codebase:

1. **lib/config.ts** - Update Stripe Price IDs with real values
2. **Database types** - Generate types with `npx supabase gen types`

## Common Customizations

### Change Credit Prices
Edit `lib/config.ts` → `CREDIT_PACKAGES`

### Add New Package
1. Create Stripe product
2. Add to `STRIPE_PRICE_IDS` in config
3. Add to `CREDIT_PACKAGES` in config
4. Update `.env`

### Change UI Colors
Edit `app/globals.css` and component CSS modules

### Add Email Receipts
Add email service in webhook handler after credit fulfillment

## Support & Maintenance

### Monitor
- Stripe webhook deliveries dashboard
- Supabase logs for errors
- Vercel logs for API errors

### Debug
- Check webhook signature matches
- Verify database schema is up to date
- Test idempotency with duplicate webhooks
- Check deep links work on both iOS and Android

## Credits

Built for **Leadsong** property ratings app.

---

**Questions?** Check the docs or email support@leadsong.com

