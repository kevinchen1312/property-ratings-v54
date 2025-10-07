# Supabase Auth + Referral System

Complete implementation of user authentication with referral tracking, credit rewards, and Stripe integration.

## ✅ What's Implemented

### 1. Database Schema (`supabase/migrations/referral_system.sql`)

- **profiles** - User profiles with unique referral codes
- **credit_ledger** - Append-only transaction log for all credit movements
- **stripe_customers** - Links Supabase users to Stripe customer IDs
- **RLS policies** - Secure row-level security (users read own data, Edge Functions write)
- **Helper functions** - `get_credit_balance(user_id)` for computing balances

### 2. Edge Function (`supabase/functions/on-auth-user-created/index.ts`)

Webhook handler that triggers on new user sign-ups:

1. ✅ Generates unique referral code
2. ✅ Creates profile record
3. ✅ Processes incoming referral code (if provided)
4. ✅ Credits both referrer and new user
5. ✅ Creates Stripe customer
6. ✅ Prevents self-referral and duplicates

### 3. Mobile App (React Native / Expo)

**Updated Files:**
- `package.json` - Moved @supabase/supabase-js to dependencies
- `src/lib/supabase.ts` - Added PKCE flow for mobile auth
- `src/lib/auth.ts` - Added referral code parameter to signUp
- `src/lib/credits.ts` - Credit balance and ledger helpers
- `src/screens/AuthScreen.tsx` - Added referral code input
- `src/screens/ProfileScreen.tsx` - NEW: Display referral code & stats
- `src/screens/CreditsScreen.tsx` - NEW: Show balance & transaction history
- `src/navigation/index.tsx` - Added Profile and Credits routes

**Features:**
- ✅ Sign up with optional referral code
- ✅ View your unique referral code
- ✅ Copy/share referral link
- ✅ Track referral stats (count & earnings)
- ✅ View credit balance
- ✅ See transaction history
- ✅ Deep link support for referrals

### 4. Website (Next.js)

**Updated Files:**
- `website/app/auth/page.tsx` - Added sign-up mode with referral code
- `website/app/auth/page.module.css` - Added styles for sign-up form
- `website/app/profile/page.tsx` - NEW: Profile page with referral code
- `website/app/profile/page.module.css` - NEW: Profile page styles
- `website/lib/credits.ts` - NEW: Credit helper functions for web
- `website/lib/supabaseServer.ts` - Already has getCurrentUser, etc.

**Features:**
- ✅ Sign up / Sign in page with referral code support
- ✅ Deep link support: `/auth?ref=CODE` pre-fills referral
- ✅ Profile page showing referral code and stats
- ✅ Credits page showing balance and transaction history
- ✅ Copy referral code and share link
- ✅ Server-side auth with @supabase/ssr

### 5. Documentation

- `REFERRAL-SYSTEM-DEPLOYMENT-GUIDE.md` - Complete setup instructions
- `EDGE-FUNCTION-ENV-VARS.md` - Environment variable configuration
- This README

## 🚀 Quick Start

### 1. Run Database Migration

```bash
# Using Supabase CLI
supabase db push supabase/migrations/referral_system.sql

# Or copy/paste into Supabase SQL Editor
```

### 2. Deploy Edge Function

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login and link to project
supabase login
supabase link --project-ref your-project-ref

# Set environment variables (see EDGE-FUNCTION-ENV-VARS.md)
supabase secrets set SUPABASE_URL="..." SUPABASE_SERVICE_ROLE="..." STRIPE_SECRET_KEY="..." REFERRAL_BONUS_REFERRER="20" REFERRAL_BONUS_REFERRED="10"

# Deploy
supabase functions deploy on-auth-user-created
```

### 3. Configure Webhook

1. Go to Supabase Dashboard → **Authentication → Webhooks**
2. Add webhook:
   - Event: `user.created`
   - URL: `https://your-project.supabase.co/functions/v1/on-auth-user-created`
   - Headers: `Authorization: Bearer YOUR_ANON_KEY`

### 4. Install Dependencies

```bash
# Mobile app
npm install

# Website
cd website && npm install
```

### 5. Test It!

1. Sign up a new user (User A)
2. Note User A's referral code in Profile screen
3. Sign up another user (User B) with User A's code
4. Check both users' credit balances - both should have credits!

## 📱 Mobile App Usage

### Sign Up with Referral Code

```typescript
import { signUp } from './lib/auth';

await signUp(email, password, firstName, lastName, referralCode);
```

### Get Credit Balance

```typescript
import { getCreditBalance } from './lib/credits';

const balance = await getCreditBalance();
```

### Get User Profile

```typescript
import { getUserProfile } from './lib/credits';

const profile = await getUserProfile();
// { id, email, full_name, referral_code, referred_by }
```

### Navigate to Profile/Credits

```typescript
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();
navigation.navigate('Profile');
navigation.navigate('Credits');
```

## 🌐 Website Usage

### Sign Up with Referral Code

URL: `https://yoursite.com/auth?ref=USERCODE`

The referral code will be pre-filled in the sign-up form.

### Profile Page

URL: `https://yoursite.com/profile`

Shows:
- User information
- Referral code with copy/share buttons
- Referral stats (count & earnings)

### Credits Page

URL: `https://yoursite.com/credits`

Shows:
- Current credit balance
- Transaction history (all ledger entries)
- Purchase credits button

## 🔧 Configuration

### Adjust Referral Bonuses

Update Edge Function secrets:

```bash
supabase secrets set REFERRAL_BONUS_REFERRER="30"  # For referrer
supabase secrets set REFERRAL_BONUS_REFERRED="15"  # For new user
```

### Customize Referral Code Format

Edit `supabase/functions/on-auth-user-created/index.ts`:

```typescript
function makeReferralCode(userId: string): string {
  // Customize format here
  const base = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return base;  // Or return `REF-${base}` for prefix
}
```

### Change Credit Reason Types

Edit `supabase/migrations/referral_system.sql`:

```sql
CREATE TYPE credit_reason AS ENUM (
  'referral_bonus_referrer', 
  'referral_bonus_referred', 
  'purchase',
  'admin_adjustment',
  'spend',
  'your_custom_reason'  -- Add custom reasons
);
```

## 🧪 Testing

### Test Complete Flow

1. **Sign up User A**
   ```bash
   # Mobile or web, no referral code
   # Check profiles table - should have referral_code
   ```

2. **Sign up User B with User A's code**
   ```bash
   # Mobile or web, enter User A's referral code
   # Check profiles table - User B should have referred_by = User A's ID
   ```

3. **Check Credit Ledger**
   ```sql
   SELECT * FROM credit_ledger ORDER BY created_at DESC;
   -- Should see two entries:
   -- 1. User A: +20 (referral_bonus_referrer)
   -- 2. User B: +10 (referral_bonus_referred)
   ```

4. **Check Balances**
   ```sql
   SELECT id, email, get_credit_balance(id) as balance FROM profiles;
   -- User A: 20
   -- User B: 10
   ```

### Test Edge Cases

- ✅ Self-referral (should be blocked)
- ✅ Invalid referral code (should be ignored)
- ✅ Duplicate sign-up (webhook should handle gracefully)
- ✅ Missing environment variables (should fail with clear error)

## 📊 Database Queries

### Get Top Referrers

```sql
SELECT 
  p.id,
  p.email,
  p.referral_code,
  COUNT(r.id) as referral_count,
  SUM(cl.delta) as total_earned
FROM profiles p
LEFT JOIN profiles r ON r.referred_by = p.id
LEFT JOIN credit_ledger cl ON cl.user_id = p.id AND cl.reason = 'referral_bonus_referrer'
GROUP BY p.id, p.email, p.referral_code
ORDER BY referral_count DESC
LIMIT 10;
```

### Get User's Referral Stats

```sql
SELECT 
  p.email,
  p.referral_code,
  COUNT(r.id) as referred_count,
  COALESCE(SUM(cl.delta), 0) as total_credits_earned
FROM profiles p
LEFT JOIN profiles r ON r.referred_by = p.id
LEFT JOIN credit_ledger cl ON cl.user_id = p.id AND cl.reason = 'referral_bonus_referrer'
WHERE p.id = 'USER_ID_HERE'
GROUP BY p.id, p.email, p.referral_code;
```

### Audit Credit Ledger

```sql
SELECT 
  p.email,
  cl.reason,
  cl.delta,
  cl.meta,
  cl.created_at
FROM credit_ledger cl
JOIN profiles p ON p.id = cl.user_id
ORDER BY cl.created_at DESC
LIMIT 50;
```

## 🔒 Security

### Implemented

- ✅ RLS policies prevent direct client writes
- ✅ Only Edge Functions can write to profiles/ledger/stripe_customers
- ✅ Users can only read their own data
- ✅ Self-referral prevention
- ✅ Referral code validation
- ✅ Service role key used securely in Edge Function

### Additional Recommendations

- Rate limit sign-ups (IP-based)
- Require email verification before awarding credits
- Monitor for suspicious patterns (many referrals from same IP)
- Add maximum referrals per user limit
- Implement admin dashboard for fraud review

## 🐛 Troubleshooting

### Credits not appearing

1. Check Edge Function logs: `supabase functions logs on-auth-user-created`
2. Verify webhook is firing in Supabase Dashboard
3. Check credit_ledger table directly in SQL Editor
4. Ensure RLS policies allow reading own records

### Referral code not working

1. Verify referral code is uppercase in both places
2. Check that referrer profile exists with that code
3. Look for errors in Edge Function logs
4. Test self-referral (should be blocked)

### Stripe customer not created

1. Check STRIPE_SECRET_KEY is set correctly
2. Review Stripe Dashboard for customer creation
3. Check Edge Function logs for Stripe API errors
4. Verify Stripe key matches mode (test vs live)

## 📚 API Reference

### Edge Function: on-auth-user-created

**Input** (from Supabase Auth webhook):
```json
{
  "record": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "full_name": "John Doe",
      "incoming_referral_code": "ABCD1234"
    }
  }
}
```

**Output** (success):
```json
{
  "success": true,
  "referral_code": "XYZ789",
  "stripe_customer_id": "cus_..."
}
```

### Database Functions

#### `get_credit_balance(user_id UUID) → INTEGER`

Returns total credit balance for a user by summing credit_ledger deltas.

```sql
SELECT get_credit_balance('USER_ID_HERE');
```

## 📦 File Structure

```
.
├── supabase/
│   ├── functions/
│   │   └── on-auth-user-created/
│   │       └── index.ts                    # Edge Function
│   └── migrations/
│       └── referral_system.sql              # Database schema
├── src/
│   ├── lib/
│   │   ├── supabase.ts                      # Mobile: Supabase client
│   │   ├── auth.ts                          # Mobile: Auth helpers
│   │   └── credits.ts                       # Mobile: Credit helpers
│   ├── screens/
│   │   ├── AuthScreen.tsx                   # Mobile: Sign up/in
│   │   ├── ProfileScreen.tsx                # Mobile: Profile & referral
│   │   └── CreditsScreen.tsx                # Mobile: Balance & ledger
│   └── navigation/
│       └── index.tsx                        # Mobile: Navigation setup
├── website/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── page.tsx                     # Web: Sign up/in
│   │   │   └── page.module.css
│   │   ├── profile/
│   │   │   ├── page.tsx                     # Web: Profile & referral
│   │   │   └── page.module.css
│   │   └── credits/
│   │       ├── page.tsx                     # Web: Balance & ledger
│   │       └── page.module.css
│   └── lib/
│       ├── supabaseServer.ts                # Web: Server client
│       └── credits.ts                       # Web: Credit helpers
├── REFERRAL-SYSTEM-DEPLOYMENT-GUIDE.md      # Deployment guide
├── EDGE-FUNCTION-ENV-VARS.md                # Environment variables
└── REFERRAL-SYSTEM-README.md                # This file
```

## 🎉 Success!

Your Supabase Auth + Referral system is now complete and ready to deploy!

### Next Steps

1. ✅ Run migration: `supabase db push`
2. ✅ Deploy Edge Function: `supabase functions deploy on-auth-user-created`
3. ✅ Configure webhook in Supabase Dashboard
4. ✅ Set environment variables
5. ✅ Test sign-up flow with referral codes
6. ✅ Deploy mobile app and website
7. ✅ Monitor Edge Function logs
8. ✅ Celebrate! 🎉

---

**Need Help?** Check the deployment guide or Edge Function logs for detailed troubleshooting steps.
