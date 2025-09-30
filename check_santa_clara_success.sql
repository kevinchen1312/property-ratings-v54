-- Check Santa Clara County import success and completeness

-- 1. Total Santa Clara County properties
SELECT 'Total Santa Clara Properties' as metric, COUNT(*) as count
FROM property 
WHERE address ILIKE '%Santa Clara County%' 
   OR address ILIKE '%San Jose%'
   OR address ILIKE '%Cupertino%'
   OR address ILIKE '%Sunnyvale%'
   OR address ILIKE '%Mountain View%'
   OR address ILIKE '%Palo Alto%'
   OR address ILIKE '%Los Altos%'
   OR address ILIKE '%Campbell%'
   OR address ILIKE '%Saratoga%'
   OR address ILIKE '%Los Gatos%'
   OR address ILIKE '%Milpitas%'
   OR address ILIKE '%Santa Clara%';

-- 2. Properties by Santa Clara cities
SELECT 
    CASE 
        WHEN address ILIKE '%San Jose%' THEN 'San Jose'
        WHEN address ILIKE '%Cupertino%' THEN 'Cupertino'
        WHEN address ILIKE '%Sunnyvale%' THEN 'Sunnyvale'
        WHEN address ILIKE '%Mountain View%' THEN 'Mountain View'
        WHEN address ILIKE '%Palo Alto%' THEN 'Palo Alto'
        WHEN address ILIKE '%Los Altos%' THEN 'Los Altos'
        WHEN address ILIKE '%Campbell%' THEN 'Campbell'
        WHEN address ILIKE '%Saratoga%' THEN 'Saratoga'
        WHEN address ILIKE '%Los Gatos%' THEN 'Los Gatos'
        WHEN address ILIKE '%Milpitas%' THEN 'Milpitas'
        WHEN address ILIKE '%Santa Clara%' THEN 'Santa Clara'
        WHEN address ILIKE '%Santa Clara County%' THEN 'Santa Clara County (Generic)'
        ELSE 'Other CA'
    END as city,
    COUNT(*) as property_count
FROM property 
WHERE address ILIKE '%CA%'
GROUP BY city
ORDER BY property_count DESC;

-- 3. Check coordinate bounds for Santa Clara County
-- Santa Clara County approximate bounds: 37.2-37.5 lat, -122.5 to -121.2 lng
SELECT 'Properties in Santa Clara Bounds' as metric, COUNT(*) as count
FROM property 
WHERE lat BETWEEN 37.2 AND 37.5 
  AND lng BETWEEN -122.5 AND -121.2;

-- 4. Import timeline - when were these properties added?
SELECT 
    DATE(created_at) as import_date,
    COUNT(*) as properties_imported
FROM property 
WHERE address ILIKE '%CA%'
GROUP BY DATE(created_at)
ORDER BY import_date DESC;

-- 5. Check for any gaps or issues
SELECT 
    'Properties with "undefined" names' as metric,
    COUNT(*) as count
FROM property 
WHERE name ILIKE '%undefined%';

-- 6. Sample of different property types
SELECT DISTINCT
    SUBSTRING(name FROM 1 FOR 20) as name_sample,
    COUNT(*) as count
FROM property 
WHERE address ILIKE '%CA%'
GROUP BY SUBSTRING(name FROM 1 FOR 20)
ORDER BY count DESC
LIMIT 10;
