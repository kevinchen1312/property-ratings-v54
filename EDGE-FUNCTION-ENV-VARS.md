# Edge Function Environment Variables

Configure these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

## Required Secrets

### SUPABASE_URL
- **Value**: Your Supabase project URL
- **Example**: `https://oyphcjbickujybvbeame.supabase.co`
- **Where to find**: Supabase Dashboard → Project Settings → API

### SUPABASE_SERVICE_ROLE
- **Value**: Your Supabase service role key (bypasses RLS)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find**: Supabase Dashboard → Project Settings → API → Service Role Key
- **⚠️ IMPORTANT**: This key has full database access. Keep it secret!

### STRIPE_SECRET_KEY
- **Value**: Your Stripe secret key
- **Test mode**: `sk_test_...`
- **Live mode**: `sk_live_...`
- **Where to find**: Stripe Dashboard → Developers → API Keys

### REFERRAL_BONUS_REFERRER
- **Value**: Number of credits to give to the person who referred
- **Default**: `20`
- **Type**: Integer (no quotes)

### REFERRAL_BONUS_REFERRED
- **Value**: Number of credits to give to the newly referred user
- **Default**: `10`
- **Type**: Integer (no quotes)

## How to Set Secrets

### Using Supabase CLI

```bash
# Set all secrets at once
supabase secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_SERVICE_ROLE="your-service-role-key" \
  STRIPE_SECRET_KEY="sk_test_..." \
  REFERRAL_BONUS_REFERRER="20" \
  REFERRAL_BONUS_REFERRED="10"
```

### Using Supabase Dashboard

1. Go to **Project Settings → Edge Functions**
2. Click **"Secrets"** tab
3. Click **"Add Secret"**
4. Enter name and value
5. Click **"Save"**
6. Repeat for each secret

## Verify Secrets

After setting secrets, verify they're accessible:

```bash
# View all secrets (values are hidden)
supabase secrets list

# Test the Edge Function
curl -X POST \
  https://your-project.supabase.co/functions/v1/on-auth-user-created \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"record":{"id":"test","email":"test@example.com"}}'
```

Check the function logs for any missing environment variables:

```bash
supabase functions logs on-auth-user-created
```

## Production vs Development

### Development/Testing
- Use Stripe test mode keys (`sk_test_...`)
- Use lower referral bonuses for testing
- Test with throwaway email addresses

### Production
- Use Stripe live mode keys (`sk_live_...`)
- Set final referral bonus amounts
- Monitor Edge Function logs for errors
- Set up alerts for failed webhook executions

## Security Best Practices

✅ **DO:**
- Keep service role key secret
- Use different keys for dev/staging/production
- Rotate keys periodically
- Monitor Edge Function logs for unauthorized access
- Use environment-specific Stripe keys

❌ **DON'T:**
- Commit keys to git (use .gitignore)
- Share service role key with clients
- Use production keys in development
- Log sensitive data in Edge Functions
- Store keys in code comments

## Troubleshooting

### "Environment variable not defined"
- Verify secret is set in Supabase Dashboard
- Redeploy Edge Function after adding secrets
- Check spelling matches exactly (case-sensitive)

### "Invalid Stripe API key"
- Ensure using secret key (sk_...), not publishable key (pk_...)
- Verify key matches your Stripe account mode (test/live)
- Check for trailing spaces or newlines

### "Permission denied" errors
- Verify SUPABASE_SERVICE_ROLE is correct
- Ensure service role key hasn't been rotated
- Check RLS policies in database

---

After configuring all secrets, deploy or redeploy the Edge Function:

```bash
supabase functions deploy on-auth-user-created
```
