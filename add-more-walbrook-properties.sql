-- Add more West Walbrook Drive properties for survey testing
-- We'll add properties near the existing 6013 West Walbrook Drive

-- First, let's see what we currently have
SELECT id, name, address, lat, lng 
FROM property 
WHERE address LIKE '%West Walbrook Drive%' 
ORDER BY address;

-- Add more properties along West Walbrook Drive with realistic spacing
-- Each property will be about 50-100 meters apart for easy testing

INSERT INTO property (name, address, lat, lng) VALUES 
    ('Modern Family Home', '6041 West Walbrook Drive, San Jose, CA 95129', 37.30106, -122.00869),
    ('Contemporary Villa', '5985 West Walbrook Drive, San Jose, CA 95129', 37.29906, -122.01069),
    ('Traditional Colonial', '5943 West Walbrook Drive, San Jose, CA 95129', 37.29806, -122.01169),
    ('Victorian Style House', '6075 West Walbrook Drive, San Jose, CA 95129', 37.30206, -122.00769),
    ('Ranch Style Home', '5911 West Walbrook Drive, San Jose, CA 95129', 37.29706, -122.01269);

-- Verify the new properties were added
SELECT id, name, address, lat, lng 
FROM property 
WHERE address LIKE '%West Walbrook Drive%' 
ORDER BY lat DESC;
