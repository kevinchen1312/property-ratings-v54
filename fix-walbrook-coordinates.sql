-- Fix West Walbrook Drive coordinates using exact coordinates provided by user
-- Focus on 6013 West Walbrook Drive only with correct coordinates

-- Delete all other West Walbrook properties (keep only 6013)
DELETE FROM property 
WHERE address LIKE '%West Walbrook Drive%' 
AND address NOT LIKE '%6013 West Walbrook Drive%';

-- Delete the other sample properties too
DELETE FROM property 
WHERE address IN ('123 Main St, Downtown', '456 River Ave, Riverside', '789 Park Blvd, Midtown');

-- Update 6013 West Walbrook Drive with exact coordinates
UPDATE property 
SET lat = 37.30006, lng = -122.00969 
WHERE address LIKE '%6013 West Walbrook Drive%';

-- Verify the updates
SELECT id, name, address, lat, lng 
FROM property 
WHERE address LIKE '%West Walbrook Drive%' 
ORDER BY address;
