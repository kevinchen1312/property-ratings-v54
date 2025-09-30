-- Check which revenue sharing tables exist
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'purchases',
    'purchase_items', 
    'revenue_distributions',
    'contributor_payouts'
  )
ORDER BY table_name;
