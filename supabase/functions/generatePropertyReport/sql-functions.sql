-- SQL Functions for Property Report Generation
-- Run these in your Supabase SQL Editor

-- 1. Function to get overall averages by attribute
CREATE OR REPLACE FUNCTION get_overall_averages(property_id_param UUID)
RETURNS TABLE (
  attribute TEXT,
  avg_rating NUMERIC,
  rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.attribute::TEXT,
    ROUND(AVG(r.stars), 2) as avg_rating,
    COUNT(r.stars) as rating_count
  FROM rating r
  WHERE r.property_id = property_id_param
  GROUP BY r.attribute
  ORDER BY r.attribute;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get weekly averages (last 8 weeks)
CREATE OR REPLACE FUNCTION get_weekly_averages(property_id_param UUID)
RETURNS TABLE (
  week_start DATE,
  attribute TEXT,
  avg_rating NUMERIC,
  rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('week', r.created_at)::DATE as week_start,
    r.attribute::TEXT,
    ROUND(AVG(r.stars), 2) as avg_rating,
    COUNT(r.stars) as rating_count
  FROM rating r
  WHERE r.property_id = property_id_param
    AND r.created_at >= CURRENT_DATE - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', r.created_at), r.attribute
  ORDER BY week_start DESC, r.attribute;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get monthly averages (last 12 months)
CREATE OR REPLACE FUNCTION get_monthly_averages(property_id_param UUID)
RETURNS TABLE (
  month_start DATE,
  attribute TEXT,
  avg_rating NUMERIC,
  rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', r.created_at)::DATE as month_start,
    r.attribute::TEXT,
    ROUND(AVG(r.stars), 2) as avg_rating,
    COUNT(r.stars) as rating_count
  FROM rating r
  WHERE r.property_id = property_id_param
    AND r.created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', r.created_at), r.attribute
  ORDER BY month_start DESC, r.attribute;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get rating log with hashed user IDs
CREATE OR REPLACE FUNCTION get_rating_log(property_id_param UUID)
RETURNS TABLE (
  created_at TIMESTAMP WITH TIME ZONE,
  attribute TEXT,
  stars INTEGER,
  user_hash TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.created_at,
    r.attribute::TEXT,
    r.stars,
    SUBSTRING(MD5(r.user_id::TEXT), 1, 8) as user_hash
  FROM rating r
  WHERE r.property_id = property_id_param
  ORDER BY r.created_at DESC
  LIMIT 100; -- Limit to last 100 ratings for performance
END;
$$ LANGUAGE plpgsql;

-- 5. Create storage bucket for reports (run this once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Set up RLS policies for the reports bucket (with IF NOT EXISTS handling)
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read their own reports" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can upload reports" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can read all reports" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Users can read their own reports" ON storage.objects
    FOR SELECT USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

  CREATE POLICY "Service role can upload reports" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'reports');

  CREATE POLICY "Service role can read all reports" ON storage.objects
    FOR SELECT USING (bucket_id = 'reports');
    
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some policies may already exist or there was an error: %', SQLERRM;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_overall_averages(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_weekly_averages(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_monthly_averages(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_rating_log(UUID) TO authenticated, service_role;
