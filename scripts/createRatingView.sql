-- Create Enhanced Rating View
-- This creates a view that automatically includes property information with ratings
-- without modifying the original table structure

CREATE OR REPLACE VIEW rating_with_property AS
SELECT 
    r.id,
    r.user_id,
    r.property_id,
    r.attribute,
    r.stars,
    r.user_lat,
    r.user_lng,
    r.created_at,
    -- Property information
    p.name as property_name,
    p.address as property_address,
    p.lat as property_lat,
    p.lng as property_lng,
    -- Distance between user and property (in meters)
    ST_Distance(
        ST_Point(r.user_lng, r.user_lat)::geography,
        ST_Point(p.lng, p.lat)::geography
    ) as distance_meters
FROM rating r
JOIN property p ON r.property_id = p.id;

-- Create index on the underlying tables for better view performance
CREATE INDEX IF NOT EXISTS idx_rating_property_id ON rating (property_id);
CREATE INDEX IF NOT EXISTS idx_rating_created_at ON rating (created_at);

-- Grant access to the view (adjust role as needed)
-- GRANT SELECT ON rating_with_property TO authenticated;

-- Test the view
SELECT 
    property_address,
    attribute,
    stars,
    distance_meters,
    created_at
FROM rating_with_property 
ORDER BY created_at DESC 
LIMIT 10;

COMMIT;
