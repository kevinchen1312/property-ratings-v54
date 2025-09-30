-- ================================================
-- CLEAN DATABASE FOR LIVE MODE
-- Run this in Supabase SQL Editor before going live
-- ================================================

-- Remove all test Stripe accounts
DELETE FROM user_stripe_accounts;

-- Remove completed/failed payouts (keep pending earnings)
DELETE FROM contributor_payouts 
WHERE status IN ('completed', 'failed');

-- Optional: Remove test purchases if you want a clean slate
-- Uncomment the lines below if you want to start fresh:
-- DELETE FROM purchase_items;
-- DELETE FROM revenue_distributions;
-- DELETE FROM purchases;

-- Verify cleanup
SELECT 'Stripe accounts remaining:' as check_name, COUNT(*) as count FROM user_stripe_accounts
UNION ALL
SELECT 'Pending payouts remaining:', COUNT(*) FROM contributor_payouts WHERE status = 'pending'
UNION ALL
SELECT 'Total payouts remaining:', COUNT(*) FROM contributor_payouts;
