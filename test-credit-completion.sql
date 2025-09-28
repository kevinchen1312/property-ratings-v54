-- Test script to manually complete a credit purchase
-- Run this in your Supabase SQL Editor

-- First, let's see if there are any pending credit purchases
SELECT * FROM credit_purchase WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5;

-- If you see a pending purchase, copy its stripe_session_id and run:
-- SELECT complete_credit_purchase('cs_test_XXXXXXXXX');
-- Replace 'cs_test_XXXXXXXXX' with the actual stripe_session_id

-- Check your current credits
SELECT * FROM user_credits WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';
