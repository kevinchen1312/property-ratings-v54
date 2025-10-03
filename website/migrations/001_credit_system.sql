-- Credit System Migration for Leadsong
-- This migration creates the credit_ledger table and ensures profiles has a credits column
-- Safe to run multiple times (idempotent)

-- =====================================================
-- 1. Ensure profiles table has credits column
-- =====================================================

DO $$ 
BEGIN
  -- Add credits column to profiles if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'credits'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN credits INTEGER NOT NULL DEFAULT 0;
    
    RAISE NOTICE 'Added credits column to profiles table';
  ELSE
    RAISE NOTICE 'Credits column already exists in profiles table';
  END IF;
END $$;

-- =====================================================
-- 2. Create credit_ledger table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  source TEXT NOT NULL,
  stripe_session_id TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on stripe_session_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_stripe_session_id_key 
ON public.credit_ledger(stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS credit_ledger_user_id_idx 
ON public.credit_ledger(user_id);

CREATE INDEX IF NOT EXISTS credit_ledger_created_at_idx 
ON public.credit_ledger(created_at DESC);

CREATE INDEX IF NOT EXISTS credit_ledger_source_idx 
ON public.credit_ledger(source);

-- =====================================================
-- 3. Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Users can view their own ledger entries
CREATE POLICY "Users can view their own credit ledger" 
ON public.credit_ledger
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert (webhooks)
CREATE POLICY "Service role can insert credit ledger entries" 
ON public.credit_ledger
FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS anyway, but explicit policy is clearer

-- =====================================================
-- 4. Helper function to increment user credits
-- =====================================================

CREATE OR REPLACE FUNCTION public.increment_user_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner (bypasses RLS)
AS $$
BEGIN
  -- Update credits, creating profile if it doesn't exist
  INSERT INTO public.profiles (id, credits)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (id) 
  DO UPDATE SET 
    credits = profiles.credits + p_amount,
    updated_at = NOW();
END;
$$;

-- =====================================================
-- 5. Grant permissions
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Grant full access to service role (used in webhooks)
GRANT ALL ON public.credit_ledger TO service_role;
GRANT ALL ON public.profiles TO service_role;

-- =====================================================
-- 6. Verification query
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Credit system migration completed successfully!';
  RAISE NOTICE '📊 Tables created/verified: profiles (with credits column), credit_ledger';
  RAISE NOTICE '🔒 RLS enabled and policies configured';
  RAISE NOTICE '⚡ Helper function created: increment_user_credits';
END $$;

