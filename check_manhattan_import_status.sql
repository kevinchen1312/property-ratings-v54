-- Check Manhattan import status and database state
-- This will help us understand what happened with the OSM import

-- 1. Check total property count
SELECT 'Total Properties' as metric, COUNT(*) as count FROM property;

-- 2. Check properties by state to see if Manhattan (NY) properties exist
SELECT 
    CASE 
        WHEN address LIKE '%NY%' OR address LIKE '%New York%' THEN 'New York'
        WHEN address LIKE '%CA%' OR address LIKE '%California%' THEN 'California'  
        WHEN address LIKE '%TX%' OR address LIKE '%Texas%' THEN 'Texas'
        ELSE 'Other'
    END as state_group,
    COUNT(*) as property_count
FROM property 
GROUP BY state_group
ORDER BY property_count DESC;

-- 3. Check for any Manhattan-specific properties
SELECT 
    'Manhattan Properties' as metric,
    COUNT(*) as count 
FROM property 
WHERE address ILIKE '%manhattan%' 
   OR address ILIKE '%new york, ny%'
   OR (lat BETWEEN 40.6816 AND 40.8820 AND lng BETWEEN -74.0479 AND -73.9067);

-- 4. Check recent imports (properties created in last 24 hours)
SELECT 
    'Recent Properties (24h)' as metric,
    COUNT(*) as count
FROM property 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 5. Check for any properties with coordinates in Manhattan bounds
SELECT 
    'Properties in Manhattan Bounds' as metric,
    COUNT(*) as count
FROM property 
WHERE lat BETWEEN 40.6816 AND 40.8820 
  AND lng BETWEEN -74.0479 AND -73.9067;

-- 6. Sample of recent properties to see what was actually imported
SELECT 
    name,
    address,
    lat,
    lng,
    created_at
FROM property 
ORDER BY created_at DESC 
LIMIT 10;
