-- Debug script to see what's happening with the purchase

-- 1. Check if the purchase record exists and is pending
SELECT 
  id,
  user_id,
  email,
  package_id,
  credits,
  status,
  stripe_session_id,
  created_at
FROM credit_purchase 
WHERE stripe_session_id = 'cs_test_b1mcGhqtOAo5vXtRG4s99HXNx';

-- 2. Check if user exists in user_credits table
SELECT 
  user_id,
  credits,
  created_at,
  updated_at
FROM user_credits
WHERE user_id = (
  SELECT user_id FROM credit_purchase WHERE stripe_session_id = 'cs_test_b1mcGhqtOAo5vXtRG4s99HXNx'
);

-- 3. Try to manually add credits (this will show us the exact error)
DO $$
DECLARE
  v_user_id UUID;
  v_credits INTEGER;
BEGIN
  -- Get purchase details
  SELECT user_id, credits INTO v_user_id, v_credits
  FROM credit_purchase
  WHERE stripe_session_id = 'cs_test_b1mcGhqtOAo5vXtRG4s99HXNx';
  
  RAISE NOTICE 'User ID: %, Credits to add: %', v_user_id, v_credits;
  
  -- Try to update credits
  INSERT INTO user_credits (user_id, credits)
  VALUES (v_user_id, v_credits)
  ON CONFLICT (user_id) DO UPDATE SET 
    credits = user_credits.credits + v_credits,
    updated_at = NOW();
    
  RAISE NOTICE 'Credits updated successfully!';
  
  -- Update purchase status
  UPDATE credit_purchase 
  SET status = 'completed', updated_at = NOW()
  WHERE stripe_session_id = 'cs_test_b1mcGhqtOAo5vXtRG4s99HXNx';
  
  RAISE NOTICE 'Purchase marked as completed!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- 4. Check results
SELECT 'Final status:' as label, status FROM credit_purchase WHERE stripe_session_id = 'cs_test_b1mcGhqtOAo5vXtRG4s99HXNx';
SELECT 'Final credits:' as label, credits FROM user_credits WHERE user_id = (SELECT user_id FROM credit_purchase WHERE stripe_session_id = 'cs_test_b1mcGhqtOAo5vXtRG4s99HXNx');

