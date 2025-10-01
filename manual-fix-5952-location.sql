-- Manual fix for 5952 West Walbrook Drive location
-- Move to the large rectangle building indicated by the arrow
-- Run this directly in Supabase SQL Editor

-- Update the location to the correct building (where the arrow points)
UPDATE property 
SET 
  lat = 37.29968,
  lng = -122.00875
WHERE address ILIKE '%5952%Walbrook%';

-- Check the result
SELECT id, name, address, lat, lng, osm_id 
FROM property 
WHERE address ILIKE '%5952%Walbrook%';
