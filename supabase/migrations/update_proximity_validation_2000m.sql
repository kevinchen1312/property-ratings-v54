-- Update Proximity Validation to 2000 meters
-- This changes the validation from 100m to 2000m for rating submissions

-- Drop the existing proximity validation trigger
DROP TRIGGER IF EXISTS trigger_validate_rating_proximity ON rating;
DROP FUNCTION IF EXISTS validate_rating_proximity();

-- Create updated function to validate user proximity (within 2000m)
CREATE OR REPLACE FUNCTION validate_rating_proximity()
RETURNS TRIGGER AS $$
DECLARE
    property_geom GEOGRAPHY;
    user_geom GEOGRAPHY;
    distance_meters DOUBLE PRECISION;
BEGIN
    -- Get property location
    SELECT geom INTO property_geom 
    FROM property 
    WHERE id = NEW.property_id;
    
    -- If property not found, let the foreign key constraint handle it
    IF property_geom IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Create user location point
    user_geom := ST_Point(NEW.user_lng, NEW.user_lat)::geography;
    
    -- Calculate distance in meters
    distance_meters := ST_Distance(property_geom, user_geom);
    
    -- Check if user is within 2000 meters (2km)
    IF distance_meters > 2000 THEN
        RAISE EXCEPTION 'User must be within 2000 meters of the property to submit a rating. Current distance: % meters', ROUND(distance_meters);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate proximity on rating insert
CREATE TRIGGER trigger_validate_rating_proximity
    BEFORE INSERT ON rating
    FOR EACH ROW
    EXECUTE FUNCTION validate_rating_proximity();
