-- Verify that the rating submission actually worked
-- This will show the most recent ratings from your user

-- 1. Check your most recent ratings (last 10)
SELECT 
    r.id,
    r.created_at,
    r.attribute,
    r.stars,
    p.name as property_name,
    p.address as property_address
FROM rating r
JOIN property p ON r.property_id = p.id
WHERE r.user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'  -- Your user ID
ORDER BY r.created_at DESC
LIMIT 10;

-- 2. Count total ratings by you
SELECT COUNT(*) as total_ratings_by_you
FROM rating 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';

-- 3. Check ratings for the specific property you just rated
SELECT 
    r.id,
    r.created_at,
    r.attribute,
    r.stars,
    r.user_lat,
    r.user_lng
FROM rating r
WHERE r.property_id = 'a1f4fe37-c673-4522-b8b6-2137b09f2b8'  -- The property from the logs
ORDER BY r.created_at DESC;

-- 4. Show the most recent rating overall (should be yours)
SELECT 
    r.id,
    r.created_at,
    r.user_id,
    r.attribute,
    r.stars,
    p.name as property_name
FROM rating r
JOIN property p ON r.property_id = p.id
ORDER BY r.created_at DESC
LIMIT 5;
