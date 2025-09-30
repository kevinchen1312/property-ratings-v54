-- Get the actual total property count - no sampling, just the real numbers

-- 1. Total properties in entire database
SELECT 'Total Properties in Database' as metric, COUNT(*) as count FROM property;

-- 2. Total California properties  
SELECT 'Total California Properties' as metric, COUNT(*) as count 
FROM property 
WHERE address ILIKE '%CA%';

-- 3. Total properties in Santa Clara County coordinate bounds
-- Santa Clara County bounds: roughly 37.2-37.5 lat, -122.5 to -121.2 lng
SELECT 'Properties in Santa Clara County Bounds' as metric, COUNT(*) as count
FROM property 
WHERE lat BETWEEN 37.2 AND 37.5 
  AND lng BETWEEN -122.5 AND -121.2;

-- 4. Recent imports (last 7 days)
SELECT 'Properties Added Last 7 Days' as metric, COUNT(*) as count
FROM property 
WHERE created_at > NOW() - INTERVAL '7 days';
