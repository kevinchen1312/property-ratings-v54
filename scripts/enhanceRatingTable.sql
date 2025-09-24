-- Enhance Rating Table with Property Information
-- This adds property address, name, and coordinates directly to the rating table
-- for faster queries and easier analysis

-- Add new columns to rating table
ALTER TABLE rating 
ADD COLUMN IF NOT EXISTS property_name TEXT,
ADD COLUMN IF NOT EXISTS property_address TEXT,
ADD COLUMN IF NOT EXISTS property_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS property_lng DOUBLE PRECISION;

-- Create function to auto-populate property info when rating is inserted
CREATE OR REPLACE FUNCTION populate_rating_property_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Get property information and populate the rating record
    SELECT name, address, lat, lng
    INTO NEW.property_name, NEW.property_address, NEW.property_lat, NEW.property_lng
    FROM property 
    WHERE id = NEW.property_id;
    
    -- If property not found, raise an error
    IF NEW.property_name IS NULL THEN
        RAISE EXCEPTION 'Property with ID % not found', NEW.property_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate property info on rating insert
DROP TRIGGER IF EXISTS trigger_populate_rating_property_info ON rating;
CREATE TRIGGER trigger_populate_rating_property_info
    BEFORE INSERT ON rating
    FOR EACH ROW
    EXECUTE FUNCTION populate_rating_property_info();

-- Backfill existing ratings with property information
UPDATE rating 
SET 
    property_name = p.name,
    property_address = p.address,
    property_lat = p.lat,
    property_lng = p.lng
FROM property p 
WHERE rating.property_id = p.id 
AND rating.property_address IS NULL;

-- Create index for faster queries on property address
CREATE INDEX IF NOT EXISTS idx_rating_property_address ON rating (property_address);
CREATE INDEX IF NOT EXISTS idx_rating_property_coordinates ON rating (property_lat, property_lng);

-- Show summary of updated ratings
SELECT 
    COUNT(*) as total_ratings,
    COUNT(property_address) as ratings_with_address,
    COUNT(DISTINCT property_address) as unique_properties_rated
FROM rating;

COMMIT;
