-- Check Berkeley West import status
-- Berkeley West coordinates: north: 37.8800, south: 37.8500, east: -122.2800, west: -122.3100

SELECT 
  COUNT(*) as total_properties,
  MIN(address) as sample_address_1,
  MAX(address) as sample_address_2
FROM property 
WHERE lat BETWEEN 37.8500 AND 37.8800 
  AND lng BETWEEN -122.3100 AND -122.2800
  AND address LIKE '%Berkeley%';

-- Also check for any properties in the Berkeley West coordinate range
SELECT 
  COUNT(*) as total_in_coordinate_range,
  MIN(address) as first_address,
  MAX(address) as last_address
FROM property 
WHERE lat BETWEEN 37.8500 AND 37.8800 
  AND lng BETWEEN -122.3100 AND -122.2800;

-- Check recent imports (last 24 hours)
SELECT 
  COUNT(*) as recent_imports,
  MIN(created_at) as first_import,
  MAX(created_at) as last_import
FROM property 
WHERE lat BETWEEN 37.8500 AND 37.8800 
  AND lng BETWEEN -122.3100 AND -122.2800
  AND created_at > NOW() - INTERVAL '24 hours';

