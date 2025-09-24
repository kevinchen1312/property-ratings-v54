-- Property Ratings App - Supabase Migration
-- This migration sets up the complete database schema with PostGIS spatial functionality

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create custom enum type for rating attributes
CREATE TYPE rating_attribute AS ENUM ('noise', 'friendliness', 'cleanliness');

-- Create app_user table
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property table
CREATE TABLE property (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOGRAPHY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rating table
CREATE TABLE rating (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
    attribute rating_attribute NOT NULL,
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
    user_lat DOUBLE PRECISION NOT NULL,
    user_lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to automatically populate geom field from lat/lng
CREATE OR REPLACE FUNCTION update_property_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_Point(NEW.lng, NEW.lat)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update geom on insert/update
CREATE TRIGGER trigger_update_property_geom
    BEFORE INSERT OR UPDATE ON property
    FOR EACH ROW
    EXECUTE FUNCTION update_property_geom();

-- Function to validate user proximity to property (within 100m)
CREATE OR REPLACE FUNCTION validate_rating_proximity()
RETURNS TRIGGER AS $$
DECLARE
    property_geom GEOGRAPHY;
    user_geom GEOGRAPHY;
    distance_meters DOUBLE PRECISION;
BEGIN
    -- Get the property's geography
    SELECT geom INTO property_geom 
    FROM property 
    WHERE id = NEW.property_id;
    
    -- Create user's location as geography
    user_geom = ST_Point(NEW.user_lng, NEW.user_lat)::geography;
    
    -- Check if user is within 100 meters of the property
    IF NOT ST_DWithin(property_geom, user_geom, 100) THEN
        RAISE EXCEPTION 'User must be within 100 meters of the property to submit a rating. Current distance: % meters', 
            ST_Distance(property_geom, user_geom);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate proximity before rating insert
CREATE TRIGGER trigger_validate_rating_proximity
    BEFORE INSERT ON rating
    FOR EACH ROW
    EXECUTE FUNCTION validate_rating_proximity();

-- Create unique index to enforce one rating per user, property, attribute per calendar day
CREATE UNIQUE INDEX idx_rating_unique_daily 
ON rating (user_id, property_id, attribute, DATE(created_at));

-- Performance indexes
CREATE INDEX idx_rating_property_created ON rating (property_id, created_at);
CREATE INDEX idx_rating_property_attribute_created ON rating (property_id, attribute, created_at);
CREATE INDEX idx_property_geom ON property USING GIST (geom);
CREATE INDEX idx_app_user_email ON app_user (email);

-- Insert some sample data for testing
INSERT INTO app_user (email, display_name) VALUES 
    ('test@example.com', 'Test User'),
    ('demo@example.com', 'Demo User');

INSERT INTO property (name, address, lat, lng) VALUES 
    ('Downtown Apartments', '123 Main St, Downtown', 40.7128, -74.0060),
    ('Riverside Complex', '456 River Ave, Riverside', 40.7580, -73.9855),
    ('Park View Condos', '789 Park Blvd, Midtown', 40.7505, -73.9934);

-- Sample ratings (these will only work if users are within 100m of properties)
-- Note: These sample ratings may fail due to proximity validation
-- You can comment them out if you want to test the proximity validation

-- INSERT INTO rating (user_id, property_id, attribute, stars, user_lat, user_lng) 
-- SELECT 
--     u.id,
--     p.id,
--     'cleanliness'::rating_attribute,
--     4,
--     p.lat + 0.0001, -- Slightly offset to simulate being near the property
--     p.lng + 0.0001
-- FROM app_user u, property p 
-- WHERE u.email = 'test@example.com' AND p.name = 'Downtown Apartments'
-- LIMIT 1;

-- Create views for easier querying

-- View to get average ratings per property
CREATE VIEW property_ratings_summary AS
SELECT 
    p.id,
    p.name,
    p.address,
    p.lat,
    p.lng,
    ra.attribute,
    ROUND(AVG(ra.stars), 2) as avg_rating,
    COUNT(ra.stars) as rating_count,
    MAX(ra.created_at) as last_rated
FROM property p
LEFT JOIN rating ra ON p.id = ra.property_id
GROUP BY p.id, p.name, p.address, p.lat, p.lng, ra.attribute;

-- View to get recent ratings with user and property info
CREATE VIEW recent_ratings AS
SELECT 
    r.id,
    r.stars,
    r.attribute,
    r.created_at,
    u.display_name as user_name,
    u.email as user_email,
    p.name as property_name,
    p.address as property_address,
    ST_Distance(p.geom, ST_Point(r.user_lng, r.user_lat)::geography) as distance_meters
FROM rating r
JOIN app_user u ON r.user_id = u.id
JOIN property p ON r.property_id = p.id
ORDER BY r.created_at DESC;

-- Function to find nearby properties within a radius
CREATE OR REPLACE FUNCTION find_nearby_properties(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 1000
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.address,
        p.lat,
        p.lng,
        ST_Distance(p.geom, ST_Point(user_lng, user_lat)::geography) as distance_meters
    FROM property p
    WHERE ST_DWithin(p.geom, ST_Point(user_lng, user_lat)::geography, radius_meters)
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) for better security
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE property ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;

-- Create policies for app_user table
CREATE POLICY "Users can view their own profile" ON app_user
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON app_user
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Create policies for property table (public read access)
CREATE POLICY "Anyone can view properties" ON property
    FOR SELECT USING (true);

-- Create policies for rating table
CREATE POLICY "Users can view all ratings" ON rating
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own ratings" ON rating
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own ratings" ON rating
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own ratings" ON rating
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON property TO anon, authenticated;
GRANT SELECT ON property_ratings_summary TO anon, authenticated;
GRANT SELECT ON recent_ratings TO anon, authenticated;
GRANT ALL ON app_user TO authenticated;
GRANT ALL ON rating TO authenticated;

-- Comment with metadata
COMMENT ON TABLE app_user IS 'User profiles for the property ratings app';
COMMENT ON TABLE property IS 'Properties that can be rated by users';
COMMENT ON TABLE rating IS 'User ratings for properties with proximity validation';
COMMENT ON COLUMN rating.stars IS 'Rating from 1-5 stars';
COMMENT ON CONSTRAINT rating_stars_check ON rating IS 'Ensures rating is between 1 and 5 stars';
