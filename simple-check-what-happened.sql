-- Simple check: What happened with your recent purchase?

-- Check 1: Was it a credit redemption or direct purchase?
SELECT 
  '=== YOUR RECENT TRANSACTIONS ===' as section;

-- Check credit redemptions
SELECT 
  'CREDIT REDEMPTION' as type,
  rr.created_at,
  p.address,
  rr.credits_used,
  rr.revenue_value
FROM report_redemption rr
JOIN property p ON rr.property_id = p.id
WHERE rr.user_id = auth.uid()
ORDER BY rr.created_at DESC
LIMIT 3;

-- Check 2: Any direct purchases in the purchase table?
SELECT 
  '=== DIRECT PURCHASES ===' as section;

SELECT 
  'DIRECT PURCHASE' as type,
  pur.created_at,
  pur.email,
  pur.total_amount,
  pur.status,
  pi.property_id
FROM purchase pur
LEFT JOIN purchase_item pi ON pi.purchase_id = pur.id
WHERE pur.email = (SELECT email FROM auth.users WHERE id = auth.uid())
ORDER BY pur.created_at DESC
LIMIT 3;

-- Check 3: Any revenue distributions at all?
SELECT 
  '=== REVENUE DISTRIBUTIONS (ALL) ===' as section;

SELECT 
  rd.created_at,
  CASE 
    WHEN rd.redemption_id IS NOT NULL THEN 'Credit Redemption'
    WHEN rd.purchase_id IS NOT NULL THEN 'Direct Purchase'
  END as source,
  rd.total_revenue,
  rd.top_contributor_share,
  rd.other_contributors_share,
  p.address
FROM revenue_distribution rd
LEFT JOIN property p ON rd.property_id = p.id
ORDER BY rd.created_at DESC
LIMIT 5;

-- Check 4: Simple answer - do the tables exist?
SELECT 
  '=== DO THE TABLES EXIST? ===' as section;

SELECT 
  table_name,
  CASE WHEN table_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (VALUES 
  ('report_redemption'),
  ('revenue_distribution'),
  ('contributor_payouts')
) AS t(table_name);

