-- Reset All Properties
-- This will delete all ratings and properties from the database
-- Next time the map loads, it will fetch fresh OSM data

-- Step 1: Delete all ratings (they reference properties via foreign key)
TRUNCATE rating CASCADE;

-- Step 2: Delete all property contributors (revenue sharing data)
TRUNCATE property_contributors CASCADE;

-- Step 3: Delete all properties
TRUNCATE property CASCADE;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM rating) as remaining_ratings,
  (SELECT COUNT(*) FROM property_contributors) as remaining_contributors,
  (SELECT COUNT(*) FROM property) as remaining_properties;

-- Success! The app will now fetch fresh OSM data when you load the map

