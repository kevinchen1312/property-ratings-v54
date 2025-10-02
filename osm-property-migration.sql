-- OSM Property System Migration
-- Adds OSM ID tracking and creates functions for OSM-based property management

-- Add osm_id field to property table (can be NULL for manually added properties)
ALTER TABLE property ADD COLUMN IF NOT EXISTS osm_id TEXT;

-- Add unique constraint on osm_id (only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS property_osm_id_unique 
    ON property(osm_id) WHERE osm_id IS NOT NULL;

-- Add index on osm_id for faster lookups
CREATE INDEX IF NOT EXISTS property_osm_id_idx ON property(osm_id) WHERE osm_id IS NOT NULL;

-- Function to upsert property from OSM data
-- Returns the property_id (new or existing)
CREATE OR REPLACE FUNCTION upsert_osm_property(
    p_osm_id TEXT,
    p_name TEXT,
    p_address TEXT,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
) RETURNS UUID AS $$
DECLARE
    v_property_id UUID;
BEGIN
    -- Try to find existing property by OSM ID
    SELECT id INTO v_property_id
    FROM property
    WHERE osm_id = p_osm_id;
    
    IF v_property_id IS NOT NULL THEN
        -- Update existing property
        UPDATE property
        SET 
            name = p_name,
            address = p_address,
            lat = p_lat,
            lng = p_lng
        WHERE id = v_property_id;
        
        RETURN v_property_id;
    ELSE
        -- Insert new property
        INSERT INTO property (osm_id, name, address, lat, lng)
        VALUES (p_osm_id, p_name, p_address, p_lat, p_lng)
        RETURNING id INTO v_property_id;
        
        RETURN v_property_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to delete properties within a radius (for testing)
CREATE OR REPLACE FUNCTION delete_properties_within_radius(
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_meters INTEGER
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH properties_to_delete AS (
        SELECT id
        FROM property
        WHERE ST_DWithin(
            geom,
            ST_Point(center_lng, center_lat)::geography,
            radius_meters
        )
    )
    DELETE FROM property
    WHERE id IN (SELECT id FROM properties_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment to clarify OSM ID usage
COMMENT ON COLUMN property.osm_id IS 'OpenStreetMap identifier (e.g., "node/123456" or "way/789012"). NULL for manually added properties.';

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION upsert_osm_property TO authenticated;
GRANT EXECUTE ON FUNCTION delete_properties_within_radius TO authenticated;

