-- Check the actual schema of contributor_payouts table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'contributor_payouts'
ORDER BY ordinal_position;

