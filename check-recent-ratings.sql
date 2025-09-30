-- Check if your rating was successfully submitted in the last few minutes

-- 1. Check the most recent ratings (last 10 minutes)
SELECT 
    r.id,
    r.attribute,
    r.stars,
    r.created_at,
    u.email as user_email,
    p.name as property_name,
    p.address as property_address,
    EXTRACT(EPOCH FROM (NOW() - r.created_at)) as seconds_ago
FROM rating r
JOIN app_user u ON r.user_id = u.id
JOIN property p ON r.property_id = p.id
WHERE r.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY r.created_at DESC;

-- 2. Check property_contributors to see if the trigger updated it
SELECT 
    pc.property_id,
    pc.user_id,
    pc.total_ratings,
    pc.last_rating_at,
    u.email,
    p.name as property_name,
    EXTRACT(EPOCH FROM (NOW() - pc.last_rating_at)) as seconds_ago
FROM property_contributors pc
JOIN app_user u ON pc.user_id = u.id
JOIN property p ON pc.property_id = p.id
WHERE pc.last_rating_at > NOW() - INTERVAL '10 minutes'
ORDER BY pc.last_rating_at DESC;

-- 3. Count total ratings in the database
SELECT 
    COUNT(*) as total_ratings,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT property_id) as rated_properties
FROM rating;

