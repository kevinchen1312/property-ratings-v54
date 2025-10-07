-- Referral System Migration
-- Creates profiles, credit_ledger, and stripe_customers tables with RLS

-- USERS live in auth.users
-- 1) PROFILES (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  referral_code TEXT UNIQUE NOT NULL,        -- user's own code they can share
  referred_by UUID REFERENCES auth.users(id), -- who referred this user (auth.users.id)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles (referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles (referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- 2) CREDIT LEDGER (append-only)
-- Use for referral rewards, purchases, manual adjustments, etc.
DO $$ BEGIN
  CREATE TYPE credit_reason AS ENUM (
    'referral_bonus_referrer', 
    'referral_bonus_referred', 
    'purchase', 
    'admin_adjustment', 
    'spend'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL, -- positive or negative integer credits
  reason credit_reason NOT NULL,
  meta JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created ON public.credit_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger (user_id);

-- 3) STRIPE linkage
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_customer_id ON public.stripe_customers (customer_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
DROP POLICY IF EXISTS "read own credits" ON public.credit_ledger;
DROP POLICY IF EXISTS "read own stripe customer" ON public.stripe_customers;

-- RLS: user can read their own profile & ledger; only service role can write
CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "read own credits" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "read own stripe customer" ON public.stripe_customers
  FOR SELECT USING (auth.uid() = user_id);

-- Do not allow direct inserts/updates from client; Edge Function (service role) will write
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stripe_customers FROM anon, authenticated;

-- Grant service role full access
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.credit_ledger TO service_role;
GRANT ALL ON public.stripe_customers TO service_role;
GRANT USAGE ON SEQUENCE public.credit_ledger_id_seq TO service_role;

-- Helper function to compute user credit balance
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(delta) FROM public.credit_ledger WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_credit_balance(UUID) TO authenticated, anon;

COMMENT ON TABLE public.profiles IS 'User profiles with referral codes';
COMMENT ON TABLE public.credit_ledger IS 'Append-only ledger of all credit transactions';
COMMENT ON TABLE public.stripe_customers IS 'Links Supabase users to Stripe customers';
COMMENT ON FUNCTION public.get_credit_balance(UUID) IS 'Computes total credit balance for a user by summing ledger deltas';
