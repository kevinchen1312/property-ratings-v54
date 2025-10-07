# Check Your Current Stripe Key Setup

## Option 1: Check in Supabase Dashboard

1. Go to: https://app.supabase.com/project/YOUR_PROJECT/settings/functions
2. Look for `STRIPE_SECRET_KEY` 
3. Click to reveal the last few characters
4. Match it with your Stripe keys:
   - `...VEeM` = Secret key
   - `...rQLZ` = Secret Key 2
   - `...cnsV` = Leadsong Live
   - `...N07Q` = leadsong live 2

## Option 2: Check When Keys Were Last Used

In your Stripe Dashboard:
- Keys that show "Last Used" dates are currently active
- The most recently used key is likely your current one

From your screenshot:
- `Secret Key 2` - Last used Oct 3
- `leadsong live 2` - Last used Oct 6 ✅ (Most recent!)

**This suggests `leadsong live 2` might be your current key.**

## What to Do Next

### If creating a NEW key:
1. Create the key in Stripe
2. Copy the full key (it shows only once!)
3. Update in Supabase secrets
4. Redeploy functions

### If using existing key:
1. Copy `leadsong live 2` key from Stripe
2. Make sure it's in Supabase secrets as `STRIPE_SECRET_KEY`
3. Redeploy functions

## ⚠️ Important Security Notes

- **NEVER** share your secret keys
- **NEVER** commit them to git
- Keep track of which key is used where
- Rotate keys periodically
- Delete unused keys
