-- Show just the most recent ratings from the last 5 minutes

SELECT 
    r.attribute,
    r.stars,
    r.created_at,
    u.email as user_email,
    p.name as property_name,
    p.address as property_address,
    ROUND(EXTRACT(EPOCH FROM (NOW() - r.created_at))) as seconds_ago
FROM rating r
JOIN app_user u ON r.user_id = u.id
JOIN property p ON r.property_id = p.id
WHERE r.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY r.created_at DESC
LIMIT 10;

