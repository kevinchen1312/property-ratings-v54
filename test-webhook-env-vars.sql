-- Check if webhook can access necessary environment variables
-- This will help debug if the issue is with Supabase configuration

-- Check what environment variables are configured for Edge Functions
-- Go to: https://supabase.com/dashboard/project/oyphcjbickujybvbeame/settings/functions
-- You should see these environment variables:

-- Required variables:
-- ✅ STRIPE_SECRET_KEY (starts with sk_live_ or sk_test_)
-- ✅ STRIPE_WEBHOOK_SECRET (starts with whsec_)
-- ✅ SUPABASE_URL (your Supabase URL)
-- ✅ SUPABASE_SERVICE_ROLE_KEY (service role key)

-- If any are missing, the webhook will fail silently
