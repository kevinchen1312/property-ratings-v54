-- Manually complete the pending purchase
-- Run this in Supabase SQL Editor to test if the function works

SELECT complete_credit_purchase('cs_test_b1mcGhqtOAo5vXtRG4s99HXNx');

-- Then check the results:
SELECT * FROM credit_purchase WHERE stripe_session_id = 'cs_test_b1mcGhqtOAo5vXtRG4s99HXNx';
SELECT * FROM user_credits WHERE user_id = (
  SELECT user_id FROM credit_purchase WHERE stripe_session_id = 'cs_test_b1mcGhqtOAo5vXtRG4s99HXNx'
);

