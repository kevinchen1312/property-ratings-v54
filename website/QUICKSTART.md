# Quick Start Guide

Get the credits purchase system running in 10 minutes!

## Step 1: Install Dependencies (1 min)

```bash
cd website
npm install
```

## Step 2: Set Up Environment (2 min)

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your credentials
# You'll need:
# - Supabase URL and keys (from your Supabase project settings)
# - Stripe test keys (from Stripe Dashboard → Developers → API keys)
```

## Step 3: Set Up Database (2 min)

1. Open your Supabase project
2. Go to SQL Editor
3. Copy all contents from `migrations/001_credit_system.sql`
4. Paste and run it

✅ This creates the `credit_ledger` table and adds `credits` to `profiles`

## Step 4: Create Stripe Products (3 min)

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
2. Create 4 products with these prices:
   - 1 Credit → $4.99
   - 5 Credits → $19.99
   - 10 Credits → $34.99
   - 25 Credits → $74.99
3. **Copy the Price IDs** (start with `price_xxx`)
4. Update `.env.local` with your Price IDs:
   ```env
   STRIPE_PRICE_1_CREDIT=price_xxxxx
   STRIPE_PRICE_5_CREDITS=price_xxxxx
   STRIPE_PRICE_10_CREDITS=price_xxxxx
   STRIPE_PRICE_25_CREDITS=price_xxxxx
   ```

## Step 5: Start Webhook Listener (1 min)

**Terminal 1** - Start Stripe webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

💡 Copy the webhook secret (starts with `whsec_`) and add to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

## Step 6: Run Development Server (1 min)

**Terminal 2** - Start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000/credits](http://localhost:3000/credits)

## Step 7: Test Purchase!

1. You'll need to be signed in (see "Quick Auth Setup" below)
2. Click "Buy Now" on any package
3. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
4. Complete payment
5. Watch Terminal 1 for webhook event! 🎉
6. Check Supabase → Table Editor → `credit_ledger` (new row should appear)
7. Check `profiles` table → your credits should be updated

## Quick Auth Setup

**Option A**: Create a test user in Supabase

1. Supabase Dashboard → Authentication → Users → Add User
2. Enter email and password
3. Copy the User ID
4. Create a profile:
   ```sql
   INSERT INTO profiles (id, credits)
   VALUES ('paste-user-id-here', 0);
   ```

**Option B**: Use Supabase Auth UI (recommended)

Install:
```bash
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
```

Create `app/auth/page.tsx`:
```tsx
'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthPage() {
  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        redirectTo="http://localhost:3000/credits"
      />
    </div>
  );
}
```

Then visit [http://localhost:3000/auth](http://localhost:3000/auth) to sign up!

## Troubleshooting

### "Missing signature" error

Make sure Stripe CLI is running and webhook secret is in `.env.local`

### Credits not updating

1. Check Terminal 1 for webhook logs
2. Check Supabase logs
3. Verify `credit_ledger` table exists
4. Check `profiles.credits` column exists

### Can't see credits page

You need to be authenticated. Follow "Quick Auth Setup" above.

### TypeScript errors

```bash
npm install --save-dev @types/node
```

## Next Steps

- Read the full [README.md](./README.md) for production deployment
- Set up universal links for mobile app
- Test with your mobile app
- Deploy to Vercel

## Need Help?

- Check [README.md](./README.md) for detailed docs
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- Open an issue or contact support@leadsong.com

