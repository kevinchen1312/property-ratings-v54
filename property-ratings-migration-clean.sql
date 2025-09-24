-- Property Ratings App - Complete Database Migration
-- Run this entire script in Supabase SQL Editor

-- Enable PostGIS extension for spatial functionality
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum for rating attributes
CREATE TYPE rating_attribute AS ENUM ('noise', 'friendliness', 'cleanliness');

-- Create app_user table
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property table with spatial data
CREATE TABLE property (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOGRAPHY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rating table with proximity validation
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

-- Function to auto-populate geometry from lat/lng
CREATE OR REPLACE FUNCTION update_property_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_Point(NEW.lng, NEW.lat)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update geometry on insert/update
CREATE TRIGGER trigger_update_property_geom
    BEFORE INSERT OR UPDATE ON property
    FOR EACH ROW
    EXECUTE FUNCTION update_property_geom();

-- Function to validate user proximity (within 100m)
CREATE OR REPLACE FUNCTION validate_rating_proximity()
RETURNS TRIGGER AS $$
DECLARE
    property_geom GEOGRAPHY;
    user_geom GEOGRAPHY;
    distance_meters DOUBLE PRECISION;
BEGIN
    SELECT geom INTO property_geom 
    FROM property 
    WHERE id = NEW.property_id;
    
    user_geom = ST_Point(NEW.user_lng, NEW.user_lat)::geography;
    
    IF NOT ST_DWithin(property_geom, user_geom, 100) THEN
        RAISE EXCEPTION 'User must be within 100 meters of the property to submit a rating';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for proximity validation
CREATE TRIGGER trigger_validate_rating_proximity
    BEFORE INSERT ON rating
    FOR EACH ROW
    EXECUTE FUNCTION validate_rating_proximity();

-- Unique index: one rating per user/property/attribute per day
CREATE UNIQUE INDEX idx_rating_unique_daily 
ON rating (user_id, property_id, attribute, DATE(created_at));

-- Performance indexes
CREATE INDEX idx_rating_property_created ON rating (property_id, created_at);
CREATE INDEX idx_rating_property_attribute_created ON rating (property_id, attribute, created_at);
CREATE INDEX idx_property_geom ON property USING GIST (geom);
CREATE INDEX idx_app_user_email ON app_user (email);

-- Enable Row Level Security
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE property ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_user
CREATE POLICY "Users can view their own profile" ON app_user
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON app_user
    FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for property (public read)
CREATE POLICY "Anyone can view properties" ON property
    FOR SELECT USING (true);

-- RLS Policies for rating
CREATE POLICY "Users can view all ratings" ON rating
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own ratings" ON rating
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own ratings" ON rating
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own ratings" ON rating
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON property TO anon, authenticated;
GRANT ALL ON app_user TO authenticated;
GRANT ALL ON rating TO authenticated;

-- Helper view for property ratings summary
CREATE VIEW property_ratings_summary AS
SELECT 
    p.id,
    p.name,
    p.address,
    p.lat,
    p.lng,
    ra.attribute,
    ROUND(AVG(ra.stars), 2) as avg_rating,
    COUNT(ra.stars) as rating_count
FROM property p
LEFT JOIN rating ra ON p.id = ra.property_id
GROUP BY p.id, p.name, p.address, p.lat, p.lng, ra.attribute;

-- Function to find nearby properties
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

-- Insert sample data
INSERT INTO app_user (email, display_name) VALUES 
    ('test@example.com', 'Test User'),
    ('demo@example.com', 'Demo User');

INSERT INTO property (name, address, lat, lng) VALUES 
    ('Downtown Apartments', '123 Main St, Downtown', 40.7128, -74.0060),
    ('Riverside Complex', '456 River Ave, Riverside', 40.7580, -73.9855),
    ('Park View Condos', '789 Park Blvd, Midtown', 40.7505, -73.9934);
