-- Quick check: Are there ANY New York properties in the database?

-- 1. Count all NY properties by different methods
SELECT 'NY in Address' as method, COUNT(*) as count 
FROM property 
WHERE address ILIKE '%NY%' OR address ILIKE '%New York%';

-- 2. Check Manhattan coordinate bounds specifically
SELECT 'Manhattan Coordinates' as method, COUNT(*) as count
FROM property 
WHERE lat BETWEEN 40.6816 AND 40.8820 
  AND lng BETWEEN -74.0479 AND -73.9067;

-- 3. Check for any NYC boroughs
SELECT 'NYC Boroughs' as method, COUNT(*) as count
FROM property 
WHERE address ILIKE '%Manhattan%' 
   OR address ILIKE '%Brooklyn%'
   OR address ILIKE '%Queens%' 
   OR address ILIKE '%Bronx%'
   OR address ILIKE '%Staten Island%';

-- 4. Show any NY properties if they exist
SELECT name, address, lat, lng, created_at
FROM property 
WHERE address ILIKE '%NY%' 
   OR address ILIKE '%New York%'
   OR (lat BETWEEN 40.6816 AND 40.8820 AND lng BETWEEN -74.0479 AND -73.9067)
ORDER BY created_at DESC
LIMIT 20;
