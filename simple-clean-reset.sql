-- Single simple command to reset for testing
-- Wait a minute after the throttle error, then run this

DELETE FROM user_stripe_accounts 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';
