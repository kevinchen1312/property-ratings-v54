-- Seed data for West Walbrook Drive properties in San Jose, CA
-- This will insert 1 property with real address and coordinates
-- The trigger will automatically populate the geom column from lat/lng

INSERT INTO property (name, address, lat, lng) VALUES 
    ('Cozy Ranch Style', '6013 West Walbrook Drive, San Jose, CA 95129', 37.2943, -121.9732);

-- Verify the properties were inserted with geometry
SELECT 
    id,
    name,
    address,
    lat,
    lng,
    ST_AsText(geom) as geometry_wkt,
    'Successfully inserted ' || COUNT(*) OVER() || ' properties on West Walbrook Drive' as result
FROM property 
WHERE address LIKE '%West Walbrook Drive%'
ORDER BY address;
