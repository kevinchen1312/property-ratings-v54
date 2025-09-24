-- Database Optimization for Large-Scale Property Import
-- This script prepares the database for handling 300K-500K properties

-- 1. Create spatial indexes for efficient coordinate queries
CREATE INDEX IF NOT EXISTS idx_property_coordinates ON property USING GIST (
    ST_Point(lng, lat)
);

-- 2. Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_property_lat ON property (lat);
CREATE INDEX IF NOT EXISTS idx_property_lng ON property (lng);
CREATE INDEX IF NOT EXISTS idx_property_address_text ON property USING gin(to_tsvector('english', address));
CREATE INDEX IF NOT EXISTS idx_property_city ON property ((split_part(address, ', ', 2)));
CREATE INDEX IF NOT EXISTS idx_property_created_at ON property (created_at);

-- 3. Create composite index for viewport queries (lat/lng range queries)
CREATE INDEX IF NOT EXISTS idx_property_bbox ON property (lat, lng);

-- 4. Optimize autovacuum for high-volume inserts
ALTER TABLE property SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_limit = 200
);

-- 5. Create materialized view for city statistics (optional)
CREATE MATERIALIZED VIEW IF NOT EXISTS property_city_stats AS
SELECT 
    split_part(address, ', ', 2) as city,
    COUNT(*) as property_count,
    MIN(lat) as min_lat,
    MAX(lat) as max_lat,
    MIN(lng) as min_lng,
    MAX(lng) as max_lng,
    AVG(lat) as center_lat,
    AVG(lng) as center_lng
FROM property 
WHERE address IS NOT NULL
GROUP BY split_part(address, ', ', 2);

-- 6. Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_city_stats_city 
ON property_city_stats (city);

-- 7. Add helpful database settings for large imports
-- Note: These might need to be run by a superuser
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- 8. Create function to refresh city stats
CREATE OR REPLACE FUNCTION refresh_property_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY property_city_stats;
END;
$$ LANGUAGE plpgsql;

-- 9. Show current property statistics
SELECT 
    'Current Properties' as metric,
    COUNT(*) as count
FROM property
UNION ALL
SELECT 
    'San Jose Properties' as metric,
    COUNT(*) as count
FROM property 
WHERE address ILIKE '%San Jose%'
UNION ALL
SELECT 
    'Cupertino Properties' as metric,
    COUNT(*) as count
FROM property 
WHERE address ILIKE '%Cupertino%';

-- 10. Show table size information
SELECT 
    pg_size_pretty(pg_total_relation_size('property')) as table_size,
    pg_size_pretty(pg_relation_size('property')) as data_size,
    pg_size_pretty(pg_total_relation_size('property') - pg_relation_size('property')) as index_size;

COMMIT;

