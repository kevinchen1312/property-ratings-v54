-- Debug: Why didn't 1312 Centennial Court get revenue sharing?

-- Find the property
SELECT 
  '=== FIND 1312 CENTENNIAL COURT ===' as section;

SELECT 
  id,
  name,
  address,
  latitude,
  longitude
FROM property
WHERE address ILIKE '%1312%centennial%'
   OR name ILIKE '%1312%centennial%';

-- Check its ratings
SELECT 
  '=== RATINGS FOR 1312 CENTENNIAL ===' as section;

WITH property_info AS (
  SELECT id FROM property 
  WHERE address ILIKE '%1312%centennial%' 
     OR name ILIKE '%1312%centennial%'
  LIMIT 1
)
SELECT 
  COUNT(*) as total_ratings,
  COUNT(DISTINCT user_id) as unique_contributors,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '365 days' THEN 1 END) as last_365_days
FROM rating
WHERE property_id = (SELECT id FROM property_info);

-- Show contributors
SELECT 
  '=== TOP CONTRIBUTORS ===' as section;

WITH property_info AS (
  SELECT id FROM property 
  WHERE address ILIKE '%1312%centennial%' 
     OR name ILIKE '%1312%centennial%'
  LIMIT 1
)
SELECT 
  au.email,
  COUNT(*) as rating_count,
  MAX(r.created_at) as last_rating
FROM rating r
JOIN auth.users au ON r.user_id = au.id
WHERE r.property_id = (SELECT id FROM property_info)
GROUP BY au.email
ORDER BY rating_count DESC;

-- Check if redemption was created
SELECT 
  '=== YOUR REDEMPTIONS FOR THIS PROPERTY ===' as section;

WITH property_info AS (
  SELECT id FROM property 
  WHERE address ILIKE '%1312%centennial%' 
     OR name ILIKE '%1312%centennial%'
  LIMIT 1
)
SELECT 
  rr.id,
  rr.created_at,
  rr.credits_used,
  rr.revenue_value,
  CASE 
    WHEN rd.id IS NOT NULL THEN '✅ Revenue distribution exists'
    ELSE '❌ NO revenue distribution'
  END as status
FROM report_redemption rr
LEFT JOIN revenue_distribution rd ON rd.redemption_id = rr.id
WHERE rr.property_id = (SELECT id FROM property_info)
  AND rr.user_id = auth.uid()
ORDER BY rr.created_at DESC;

-- Check get_top_contributor function works
SELECT 
  '=== TEST get_top_contributor FUNCTION ===' as section;

WITH property_info AS (
  SELECT id FROM property 
  WHERE address ILIKE '%1312%centennial%' 
     OR name ILIKE '%1312%centennial%'
  LIMIT 1
)
SELECT 
  user_id,
  rating_count
FROM get_top_contributor((SELECT id FROM property_info));

