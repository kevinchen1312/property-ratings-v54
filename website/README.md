# Leadsong Credits Purchase Website

A Next.js 14 website for purchasing credits via Stripe Checkout for the Leadsong mobile app. Users authenticate via Supabase, purchase credits on the web, and return to the app via deep links.

## 🏗️ Architecture

```
Mobile App → leadsong.com/credits → Stripe Checkout → Deep Link → Mobile App
                                           ↓
                                    Webhook Handler
                                           ↓
                                   Supabase (Credits)
```

### Flow

1. User opens `/credits` page (authenticated via Supabase)
2. Selects a credit package → creates Stripe Checkout Session
3. Completes payment on Stripe
4. Redirects to deep link: `leadsong://purchase/success?session_id=XXX`
5. **Webhook** receives `checkout.session.completed` → adds credits to user's balance
6. Mobile app calls `/api/me/credits` to refresh balance

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Payment**: Stripe Checkout + Webhooks
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (PKCE flow)
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Stripe account

### 1. Install Dependencies

```bash
cd website
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Deep Links
APP_SUCCESS_DEEPLINK_SCHEME=leadsong://purchase/success
APP_CANCEL_DEEPLINK_SCHEME=leadsong://purchase/cancel
SITE_URL=https://leadsong.com

# Stripe Price IDs (replace with your actual IDs)
STRIPE_PRICE_1_CREDIT=price_xxxxx
STRIPE_PRICE_5_CREDITS=price_xxxxx
STRIPE_PRICE_10_CREDITS=price_xxxxx
STRIPE_PRICE_25_CREDITS=price_xxxxx
```

### 3. Set Up Database

Run the migration in your Supabase SQL Editor:

```bash
# Copy the contents of migrations/001_credit_system.sql
# and execute it in your Supabase project
```

This creates:
- `profiles.credits` column
- `credit_ledger` table (with idempotency)
- Helper function `increment_user_credits`
- RLS policies

### 4. Create Stripe Products

In your [Stripe Dashboard](https://dashboard.stripe.com/test/products):

1. Create 4 products:
   - **1 Credit** - $4.99 → Copy the Price ID
   - **5 Credits** - $19.99 → Copy the Price ID
   - **10 Credits** - $34.99 → Copy the Price ID
   - **25 Credits** - $74.99 → Copy the Price ID

2. Update your `.env.local` with the actual Price IDs

3. Optionally, adjust prices in `lib/config.ts` (`CREDIT_PACKAGES`)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000/credits](http://localhost:3000/credits)

## 🔌 Webhook Setup

### Development (Stripe CLI)

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   npm run stripe:listen
   # or
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Copy the webhook signing secret (`whsec_xxx`) to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### Production (Vercel)

1. Deploy to Vercel:
   ```bash
   vercel
   ```

2. In [Stripe Dashboard](https://dashboard.stripe.com/webhooks):
   - Click "Add endpoint"
   - URL: `https://leadsong.com/api/webhooks/stripe`
   - Events: Select `checkout.session.completed`
   - Copy the signing secret → Add to Vercel environment variables

3. Add all environment variables to Vercel:
   ```bash
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add STRIPE_SECRET_KEY
   vercel env add STRIPE_WEBHOOK_SECRET
   # ... etc
   ```

## 🧪 Testing

### Manual Testing

1. **Start webhook listener** (in a separate terminal):
   ```bash
   npm run stripe:listen
   ```

2. **Run dev server**:
   ```bash
   npm run dev
   ```

3. **Open credits page**:
   - Visit `http://localhost:3000/credits`
   - You'll need a valid Supabase session (see "Auth Testing" below)

4. **Purchase credits**:
   - Click "Buy Now" on any package
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

5. **Verify webhook**:
   - Check terminal for webhook event logs
   - Check Supabase `credit_ledger` table for new row
   - Check `profiles` table for updated credits

6. **Test mobile app refresh**:
   - Call `/api/me/credits` (with auth header)
   - Should return updated balance

### Auth Testing

**Option 1**: Use Supabase Auth UI (recommended for testing)

Create `app/auth/page.tsx`:

```tsx
'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthPage() {
  return (
    <div style={{ maxWidth: 400, margin: '100px auto' }}>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        redirectTo="http://localhost:3000/credits"
      />
    </div>
  );
}
```

Then visit `/auth` to sign in.

**Option 2**: Pass access token from mobile app

In your mobile app, pass the Supabase session token:

```typescript
const session = await supabase.auth.getSession();
const url = `https://leadsong.com/credits?access_token=${session.access_token}`;
Linking.openURL(url);
```

### Idempotency Testing

Test that duplicate webhooks don't add credits twice:

1. Complete a purchase
2. Manually trigger the same webhook again (using Stripe CLI or Dashboard)
3. Verify credits were only added once

## 📱 Deep Link Setup

### iOS (Universal Links)

1. Create `apple-app-site-association` file:
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         {
           "appID": "TEAMID.com.leadsong.app",
           "paths": ["/return", "/return/*"]
         }
       ]
     }
   }
   ```

2. Host at `https://leadsong.com/.well-known/apple-app-site-association`

3. Update deep link config:
   ```env
   APP_SUCCESS_DEEPLINK_SCHEME=https://leadsong.com/return
   ```

### Android (App Links)

1. Generate `assetlinks.json`:
   ```bash
   keytool -list -v -keystore app.keystore
   ```

2. Host at `https://leadsong.com/.well-known/assetlinks.json`

3. Update AndroidManifest.xml with intent filters

## 🔍 Debugging

### Webhook not firing?

- Check Stripe CLI is running: `stripe listen`
- Check webhook secret matches `.env.local`
- Check logs: `stripe logs tail`

### Credits not updating?

- Check webhook received 200 response
- Check Supabase logs for errors
- Query ledger: `SELECT * FROM credit_ledger ORDER BY created_at DESC LIMIT 10;`
- Check user credits: `SELECT id, credits FROM profiles WHERE id = 'USER_ID';`

### Deep link not working?

- Test manually: `adb shell am start -a android.intent.action.VIEW -d "leadsong://purchase/success?session_id=test"`
- Check app is installed
- Verify URL scheme in app's `app.config.ts` or `AndroidManifest.xml`

### Auth issues?

- Clear cookies
- Check Supabase auth settings (email confirmation, etc.)
- Verify PKCE flow callback URL: `https://leadsong.com/auth/callback`

## 📂 Project Structure

```
website/
├── app/
│   ├── api/
│   │   ├── checkout/route.ts        # Create Stripe session
│   │   ├── webhooks/stripe/route.ts # Handle webhook
│   │   └── me/credits/route.ts      # Get user credits
│   ├── credits/
│   │   ├── page.tsx                 # Main credits page
│   │   └── page.module.css
│   ├── return/
│   │   ├── page.tsx                 # Deep link fallback
│   │   └── page.module.css
│   ├── auth/callback/route.ts       # Auth callback
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── PackageCard.tsx              # Credit package card
│   └── PackageCard.module.css
├── lib/
│   ├── config.ts                    # Environment & constants
│   ├── stripe.ts                    # Stripe client
│   ├── supabaseServer.ts            # Supabase server utils
│   └── database.types.ts            # Database types
├── migrations/
│   └── 001_credit_system.sql        # Database migration
├── middleware.ts                     # Supabase auth middleware
├── .env.example
├── package.json
└── README.md
```

## 🔐 Security

- ✅ Webhook signature verification
- ✅ Service role key used only server-side
- ✅ RLS policies on all tables
- ✅ Idempotency via `stripe_session_id` unique constraint
- ✅ Server-side user validation
- ✅ CORS headers for mobile app API

## 🚢 Deployment Checklist

- [ ] Set all environment variables in Vercel
- [ ] Update `SITE_URL` to production URL
- [ ] Create production Stripe webhook endpoint
- [ ] Run database migration in production Supabase
- [ ] Create Stripe products in live mode
- [ ] Update Price IDs to live mode IDs
- [ ] Test full flow with real payment (then refund)
- [ ] Set up universal links / app links
- [ ] Update deep link URLs to `https://leadsong.com/return`
- [ ] Monitor Stripe webhook deliveries
- [ ] Set up error monitoring (Sentry, etc.)

## 📞 Support

For questions or issues:
- **Email**: support@leadsong.com
- **Stripe Webhook Logs**: [Dashboard](https://dashboard.stripe.com/webhooks)
- **Supabase Logs**: Project Dashboard → Logs

## 📝 License

Proprietary - Leadsong

