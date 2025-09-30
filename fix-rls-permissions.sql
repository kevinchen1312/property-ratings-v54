-- Fix RLS Permissions for Payout Processing
-- The service role needs to access contributor_payouts

-- Grant service role access to contributor_payouts
GRANT ALL ON contributor_payouts TO service_role;

-- Add service role policy for contributor_payouts
DROP POLICY IF EXISTS "Service role can manage all payouts" ON contributor_payouts;
CREATE POLICY "Service role can manage all payouts" ON contributor_payouts
  FOR ALL USING (auth.role() = 'service_role');

-- Also make sure service role can access user_stripe_accounts
GRANT ALL ON user_stripe_accounts TO service_role;

DROP POLICY IF EXISTS "Service role can manage stripe accounts" ON user_stripe_accounts;
CREATE POLICY "Service role can manage stripe accounts" ON user_stripe_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Verify the fix worked - check if service role can see payouts
SELECT 
  'Service role test:' as test,
  COUNT(*) as payout_count,
  SUM(payout_amount) as total_amount
FROM contributor_payouts 
WHERE status = 'pending';

SELECT 'RLS permissions updated for service role!' as result;
