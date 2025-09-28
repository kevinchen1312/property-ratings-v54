-- Simple verification queries to check if ratings were submitted

-- 1. Check your most recent ratings (last 5)
SELECT 
    r.id,
    r.created_at,
    r.attribute,
    r.stars,
    r.property_id
FROM rating r
WHERE r.user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76'
ORDER BY r.created_at DESC
LIMIT 5;

-- 2. Count total ratings by you
SELECT COUNT(*) as total_ratings_by_you
FROM rating 
WHERE user_id = 'd0a25789-37c7-4816-9b5a-0e7f9305da76';

-- 3. Show the most recent 5 ratings overall (any user)
SELECT 
    r.id,
    r.created_at,
    r.user_id,
    r.attribute,
    r.stars
FROM rating r
ORDER BY r.created_at DESC
LIMIT 5;
