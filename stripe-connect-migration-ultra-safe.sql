-- Stripe Connect Migration (Ultra Safe Version)
-- Add Stripe Connect account tracking and payout processing

-- Add Stripe Connect account info to users
CREATE TABLE IF NOT EXISTS user_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'pending', -- pending, active, restricted, inactive
  details_submitted BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  country TEXT,
  currency TEXT DEFAULT 'usd',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_stripe_accounts_user_id_key'
  ) THEN
    ALTER TABLE user_stripe_accounts ADD CONSTRAINT user_stripe_accounts_user_id_key UNIQUE(user_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE user_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own Stripe accounts" ON user_stripe_accounts;
DROP POLICY IF EXISTS "Users can insert their own Stripe accounts" ON user_stripe_accounts;
DROP POLICY IF EXISTS "Users can update their own Stripe accounts" ON user_stripe_accounts;

-- RLS Policies
CREATE POLICY "Users can view their own Stripe accounts" ON user_stripe_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Stripe accounts" ON user_stripe_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Stripe accounts" ON user_stripe_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Update contributor_payouts table to track payout processing
ALTER TABLE contributor_payouts 
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Update status enum to include more states
ALTER TABLE contributor_payouts 
ALTER COLUMN status TYPE TEXT;

-- Add comment to clarify status values
COMMENT ON COLUMN contributor_payouts.status IS 'pending, processing, completed, failed, cancelled';

-- Create payout_batches table to track weekly payout runs
CREATE TABLE IF NOT EXISTS payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_payouts INTEGER NOT NULL DEFAULT 0,
  successful_payouts INTEGER NOT NULL DEFAULT 0,
  failed_payouts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, failed
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS for payout_batches (admin only)
ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role can manage payout batches" ON payout_batches;

-- Only service role can access payout batches
CREATE POLICY "Service role can manage payout batches" ON payout_batches
  FOR ALL USING (auth.role() = 'service_role');

-- Add batch_id to contributor_payouts to track which batch processed the payout
ALTER TABLE contributor_payouts 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES payout_batches(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stripe_accounts_user_id ON user_stripe_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stripe_accounts_stripe_id ON user_stripe_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_contributor_payouts_status ON contributor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_contributor_payouts_batch ON contributor_payouts(batch_id);
CREATE INDEX IF NOT EXISTS idx_payout_batches_date ON payout_batches(batch_date);

-- Drop existing trigger and function safely (in correct order)
DROP TRIGGER IF EXISTS trigger_update_user_stripe_accounts_updated_at ON user_stripe_accounts;
DROP FUNCTION IF EXISTS update_user_stripe_accounts_updated_at();

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_stripe_connect_status(UUID);
DROP FUNCTION IF EXISTS get_pending_payouts_for_batch();

-- Function to get user's Stripe Connect status
CREATE OR REPLACE FUNCTION get_user_stripe_connect_status(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  has_account BOOLEAN,
  account_status TEXT,
  payouts_enabled BOOLEAN,
  stripe_account_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (usa.stripe_account_id IS NOT NULL) as has_account,
    COALESCE(usa.account_status, 'none') as account_status,
    COALESCE(usa.payouts_enabled, FALSE) as payouts_enabled,
    usa.stripe_account_id
  FROM auth.users u
  LEFT JOIN user_stripe_accounts usa ON u.id = usa.user_id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending payouts ready for processing
CREATE OR REPLACE FUNCTION get_pending_payouts_for_batch()
RETURNS TABLE (
  payout_id UUID,
  user_id UUID,
  stripe_account_id TEXT,
  payout_amount DECIMAL(10,2),
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id as payout_id,
    cp.user_id,
    usa.stripe_account_id,
    cp.payout_amount,
    u.email as user_email
  FROM contributor_payouts cp
  JOIN user_stripe_accounts usa ON cp.user_id = usa.user_id
  JOIN auth.users u ON cp.user_id = u.id
  WHERE cp.status = 'pending'
    AND usa.payouts_enabled = TRUE
    AND usa.account_status = 'active'
    AND cp.payout_amount > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON user_stripe_accounts TO authenticated;
GRANT ALL ON payout_batches TO service_role;
GRANT EXECUTE ON FUNCTION get_user_stripe_connect_status(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_pending_payouts_for_batch() TO service_role;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_stripe_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_user_stripe_accounts_updated_at
  BEFORE UPDATE ON user_stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stripe_accounts_updated_at();

SELECT 'Stripe Connect migration completed successfully!' as result;
