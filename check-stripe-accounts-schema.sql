-- Check the actual schema of user_stripe_accounts table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_stripe_accounts'
ORDER BY ordinal_position;

