-- Complete sample data setup for testing property reports
-- Run this in your Supabase SQL Editor

-- 1. Create a test user (bypasses RLS since we're running as service role)
INSERT INTO app_user (id, email, display_name, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test-user@example.com',
  'Sample Test User',
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  display_name = EXCLUDED.display_name;

-- 2. Get some property IDs to work with
-- We'll use the first 3 properties in the database
WITH sample_properties AS (
  SELECT id, name, lat, lng
  FROM property 
  LIMIT 3
),
-- 3. Create sample ratings for multiple time periods (ensuring one per day per attribute)
date_series AS (
  SELECT CURRENT_DATE - interval '1 day' * generate_series(0, 30) as rating_date
),
sample_ratings AS (
  SELECT 
    p.id as property_id,
    '11111111-1111-1111-1111-111111111111' as user_id,
    attr.attribute,
    -- Generate varied ratings (2-5 stars, improving over time)
    GREATEST(2, LEAST(5, 2 + (random() * 3)::int + 
      CASE WHEN d.rating_date > CURRENT_DATE - interval '15 days' THEN 1 ELSE 0 END
    )) as stars,
    p.lat + (random() - 0.5) * 0.0001 as user_lat, -- Within ~10m of property
    p.lng + (random() - 0.5) * 0.0001 as user_lng,
    d.rating_date + interval '1 hour' * (random() * 12)::int as created_at
  FROM sample_properties p
  CROSS JOIN (VALUES ('noise'), ('friendliness'), ('cleanliness')) as attr(attribute)
  CROSS JOIN date_series d
  WHERE random() > 0.7 -- Only create ratings for ~30% of possible date/attribute combinations
)
-- 4. Insert the sample ratings
INSERT INTO rating (user_id, property_id, attribute, stars, user_lat, user_lng, created_at)
SELECT 
  user_id::uuid,
  property_id,
  attribute::rating_attribute,
  stars,
  user_lat,
  user_lng,
  created_at
FROM sample_ratings
ON CONFLICT DO NOTHING; -- Ignore duplicates if they exist

-- 5. Show summary of what was created
SELECT 
  'Sample data created successfully!' as status,
  COUNT(DISTINCT property_id) as properties_with_ratings,
  COUNT(*) as total_ratings,
  MIN(created_at) as oldest_rating,
  MAX(created_at) as newest_rating
FROM rating 
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- 6. Show a breakdown by property and attribute
SELECT 
  p.name as property_name,
  r.attribute,
  ROUND(AVG(r.stars), 2) as avg_rating,
  COUNT(*) as rating_count
FROM rating r
JOIN property p ON r.property_id = p.id
WHERE r.user_id = '11111111-1111-1111-1111-111111111111'
GROUP BY p.name, r.attribute
ORDER BY p.name, r.attribute;
