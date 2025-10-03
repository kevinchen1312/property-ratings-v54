# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LEADSONG CREDITS SYSTEM                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Mobile App      │
│  (React Native)  │
│                  │
│  User taps       │
│  "Buy Credits"   │
└────────┬─────────┘
         │
         │ Opens URL: https://leadsong.com/credits
         │ (with Supabase auth cookies/token)
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js Website (leadsong.com)                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  /credits page                                                  │ │
│  │  - Shows current balance                                        │ │
│  │  - Displays package cards (1, 5, 10, 25 credits)               │ │
│  │  - User clicks "Buy Now"                                        │ │
│  └──────────────────────┬──────────────────────────────────────────┘ │
│                         │                                             │
│                         │ POST /api/checkout                          │
│                         ▼                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  API Route: /api/checkout                                       │ │
│  │  1. Validate user session (Supabase)                           │ │
│  │  2. Create Stripe Checkout Session                             │ │
│  │  3. Add metadata: {user_id, packageKey, credits}               │ │
│  │  4. Return session.url                                          │ │
│  └──────────────────────┬──────────────────────────────────────────┘ │
│                         │                                             │
└─────────────────────────┼─────────────────────────────────────────────┘
                          │
                          │ Redirect to Stripe Checkout
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Stripe Checkout                                                     │
│  - Secure payment form                                               │
│  - User enters card details                                          │
│  - Processes payment                                                 │
└────────────┬─────────────────────────────────┬───────────────────────┘
             │                                  │
             │ On Success                       │ Async (webhook)
             ▼                                  ▼
┌────────────────────────┐    ┌──────────────────────────────────────────┐
│  Deep Link Redirect    │    │  Stripe Webhook                          │
│                        │    │  POST /api/webhooks/stripe               │
│  leadsong://purchase/  │    │  ┌────────────────────────────────────┐ │
│  success?session_id=XX │    │  │  1. Verify signature               │ │
│                        │    │  │  2. Extract session metadata       │ │
└────────┬───────────────┘    │  │  3. Check idempotency (ledger)     │ │
         │                    │  │  4. Insert credit_ledger entry     │ │
         │                    │  │  5. Update profiles.credits        │ │
         │                    │  │  6. Return 200 OK                  │ │
         │                    │  └────────────────────────────────────┘ │
         │                    └────────────────┬───────────────────────┘
         │                                     │
         │                                     │ Write to database
         │                                     ▼
         │                    ┌──────────────────────────────────────────┐
         │                    │  Supabase Database                       │
         │                    │  ┌────────────────────────────────────┐ │
         │                    │  │  credit_ledger                     │ │
         │                    │  │  - stripe_session_id (unique)      │ │
         │                    │  │  - delta: +10                      │ │
         │                    │  │  - source: 'stripe'                │ │
         │                    │  └────────────────────────────────────┘ │
         │                    │  ┌────────────────────────────────────┐ │
         │                    │  │  profiles                          │ │
         │                    │  │  - credits: 10 → 20 (incremented) │ │
         │                    │  └────────────────────────────────────┘ │
         │                    └────────────────┬───────────────────────┘
         │                                     │
         ▼                                     │
┌──────────────────────────────────────────┐  │
│  Mobile App (Deep Link Handler)          │  │
│  1. Receives: leadsong://purchase/success│  │
│  2. Calls: GET /api/me/credits           │◄─┘
│  3. Gets updated balance                 │
│  4. Updates UI badge                     │
│  5. Shows success message                │
└──────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────────────┐
│  Mobile App      │
│  (has Supabase   │
│   session)       │
└────────┬─────────┘
         │
         │ Opens browser with Supabase cookies
         │ or ?access_token=XXX in URL
         ▼
┌──────────────────────────────────────┐
│  Next.js Middleware                  │
│  - Reads Supabase cookies            │
│  - Refreshes session if expired      │
│  - Sets new cookies                  │
└────────┬─────────────────────────────┘
         │
         │ Valid session established
         ▼
┌──────────────────────────────────────┐
│  Page/API Route                      │
│  - Calls getCurrentUser()            │
│  - Validates session server-side     │
│  - Proceeds with authenticated logic │
└──────────────────────────────────────┘
```

## Data Flow

### Purchase Flow (Happy Path)

| Step | Component | Action | Data |
|------|-----------|--------|------|
| 1 | Mobile App | Opens URL | `https://leadsong.com/credits` |
| 2 | Next.js Page | Renders packages | Current balance from `profiles.credits` |
| 3 | User | Clicks "Buy 10 Credits" | `packageKey: '10'` |
| 4 | API Route | Creates Checkout | `metadata: {user_id, packageKey: '10'}` |
| 5 | Stripe | Processes payment | Card details |
| 6 | Stripe | Redirects | `leadsong://purchase/success?session_id=cs_xxx` |
| 7 | Stripe | Sends webhook | `checkout.session.completed` event |
| 8 | Webhook Handler | Verifies & processes | Adds 10 credits to user |
| 9 | Database | Updates | `profiles.credits += 10` |
| 10 | Mobile App | Fetches balance | New balance: 20 credits |

### Webhook Processing (Detailed)

```javascript
POST /api/webhooks/stripe
├─ 1. Verify signature
│   └─ stripe.webhooks.constructEvent(body, signature, secret)
├─ 2. Check event type
│   └─ event.type === 'checkout.session.completed'
├─ 3. Extract metadata
│   ├─ user_id: '123e4567-e89b-12d3-a456-426614174000'
│   ├─ packageKey: '10'
│   └─ credits: 10
├─ 4. Check payment status
│   └─ session.payment_status === 'paid'
├─ 5. Idempotency check
│   └─ SELECT * FROM credit_ledger WHERE stripe_session_id = 'cs_xxx'
├─ 6. Insert ledger entry
│   └─ INSERT INTO credit_ledger (user_id, delta, stripe_session_id, ...)
├─ 7. Update user credits
│   └─ UPDATE profiles SET credits = credits + 10 WHERE id = user_id
└─ 8. Return 200 OK
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Security Layer 1: Transport Security                       │
│  - HTTPS enforced (Vercel)                                   │
│  - TLS 1.3                                                   │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  Security Layer 2: Authentication                           │
│  - Supabase JWT validation                                   │
│  - Server-side session checks                                │
│  - No client-side auth trust                                 │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  Security Layer 3: Webhook Verification                     │
│  - Stripe signature validation                               │
│  - STRIPE_WEBHOOK_SECRET (never exposed)                     │
│  - Prevents replay attacks                                   │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  Security Layer 4: Database Security                        │
│  - Row Level Security (RLS) policies                         │
│  - Service role key for webhooks only                        │
│  - Prepared statements (SQL injection prevention)            │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  Security Layer 5: Idempotency                              │
│  - Unique constraint on stripe_session_id                    │
│  - Prevents duplicate credit additions                       │
│  - Safe webhook retries                                      │
└─────────────────────────────────────────────────────────────┘
```

## Idempotency Mechanism

### Problem: Webhook Retries
Stripe may send the same webhook multiple times if:
- Your server doesn't respond quickly
- Network issues occur
- Server returns non-200 status

### Solution: Database-Level Idempotency

```sql
-- credit_ledger table has unique constraint on stripe_session_id
CREATE UNIQUE INDEX credit_ledger_stripe_session_id_key 
ON credit_ledger(stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;
```

### Processing Flow

```
Webhook #1 arrives
├─ Check: SELECT * FROM credit_ledger WHERE stripe_session_id = 'cs_xxx'
├─ Not found → Process
├─ INSERT INTO credit_ledger (..., stripe_session_id = 'cs_xxx')
├─ UPDATE profiles SET credits = credits + 10
└─ Return 200 ✅

Webhook #2 arrives (duplicate)
├─ Check: SELECT * FROM credit_ledger WHERE stripe_session_id = 'cs_xxx'
├─ Found! → Skip processing
└─ Return 200 ✅ (no credits added)
```

## Error Handling

### Checkout API Errors

| Error | HTTP | Cause | Solution |
|-------|------|-------|----------|
| Unauthorized | 401 | No user session | Redirect to auth |
| Invalid package | 400 | Bad packageKey | Validate input |
| Stripe error | 500 | Stripe API failed | Log & retry |

### Webhook Errors

| Error | HTTP | Cause | Solution |
|-------|------|-------|----------|
| Invalid signature | 400 | Wrong secret or tampered data | Check STRIPE_WEBHOOK_SECRET |
| Missing metadata | 400 | Session missing user_id | Log & investigate |
| Database error | 500 | Insert/update failed | Stripe will retry |
| Already processed | 200 | Duplicate webhook | Return success (idempotent) |

## Monitoring & Observability

### Key Metrics to Track

1. **Checkout Success Rate**
   - `Checkouts Created / Checkouts Completed`
   - Target: > 70%

2. **Webhook Processing Time**
   - Time from webhook received to 200 response
   - Target: < 1 second

3. **Idempotency Hit Rate**
   - Duplicate webhooks detected
   - Expected: 5-10% of webhooks

4. **Credit Update Latency**
   - Time from payment to credits visible in app
   - Target: < 3 seconds

### Logging Strategy

**Checkout API:**
```
✅ Created checkout session {session_id} for user {user_id}, package {packageKey}
❌ Failed to create checkout: {error}
```

**Webhook:**
```
✅ Received webhook event: {event_type}, ID: {event_id}
✅ Processing credit purchase: session {session_id}, user {user_id}, +{credits}
⚠️  Session {session_id} already processed, skipping
❌ Failed to add credits for session {session_id}: {error}
```

## Scalability Considerations

### Current Capacity
- **Vercel**: Scales automatically
- **Supabase**: Handles 500+ concurrent connections
- **Stripe**: No practical limits

### Bottlenecks to Monitor
1. Database connections (Supabase)
2. Webhook processing time
3. Stripe API rate limits

### Future Optimizations
- Add caching for user balances (Redis)
- Batch webhook processing
- Queue system for high-volume scenarios

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Vercel (Edge Network)                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Serverless Functions                                       │ │
│  │  - /api/checkout        (on-demand)                        │ │
│  │  - /api/webhooks/stripe (on-demand)                        │ │
│  │  - /api/me/credits      (on-demand)                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Static Pages (SSR)                                         │ │
│  │  - /credits             (rendered per request)              │ │
│  │  - /return              (rendered per request)              │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Supabase   │  │   Stripe    │  │  CDN Cache  │
│  (Database) │  │   (Payment) │  │  (Static)   │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Technology Choices

### Why Next.js 14?
- ✅ Server Components (no client-side secrets)
- ✅ API Routes (backend + frontend in one)
- ✅ Middleware (automatic auth refresh)
- ✅ TypeScript support
- ✅ Easy Vercel deployment

### Why Stripe Checkout?
- ✅ PCI compliance handled by Stripe
- ✅ Mobile-optimized payment form
- ✅ Built-in fraud prevention
- ✅ Multiple payment methods
- ✅ Automatic VAT/tax handling

### Why Supabase?
- ✅ PostgreSQL (ACID transactions)
- ✅ Built-in auth (JWT tokens)
- ✅ Row Level Security
- ✅ Realtime subscriptions (future)
- ✅ Edge functions (existing integration)

## Related Systems

This website integrates with:

1. **Mobile App** - React Native (Expo)
   - Authentication provider
   - Credit consumption
   - Balance display

2. **Supabase Edge Functions** (existing)
   - `createCreditCheckout` - Alternative checkout method
   - `stripeWebhook` - Existing webhook handler
   - May coexist or be replaced

3. **Stripe Dashboard**
   - Product/Price management
   - Webhook monitoring
   - Payment analytics

## Migration Path

If you have an existing credit system:

1. **Phase 1**: Deploy new website (parallel)
2. **Phase 2**: Update mobile app to use new URL
3. **Phase 3**: Monitor both systems
4. **Phase 4**: Deprecate old system
5. **Phase 5**: Remove old code

## Further Reading

- [README.md](./README.md) - Complete documentation
- [QUICKSTART.md](./QUICKSTART.md) - Setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [MOBILE-APP-INTEGRATION.md](./MOBILE-APP-INTEGRATION.md) - Mobile setup
- [PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md) - Feature summary

