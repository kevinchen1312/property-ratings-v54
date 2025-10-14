-- Create a mapping table to link Clerk user IDs to UUID user IDs
-- This approach avoids changing existing table schemas

-- Create the mapping table
CREATE TABLE IF NOT EXISTS clerk_user_mapping (
  clerk_user_id TEXT PRIMARY KEY,
  supabase_user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clerk_user_mapping ENABLE ROW LEVEL SECURITY;

-- Users can view their own mapping
CREATE POLICY "Users can view their own clerk mapping"
  ON clerk_user_mapping
  FOR SELECT
  USING (clerk_user_id = auth.uid()::text OR supabase_user_id = auth.uid());

-- Function to get or create UUID for a Clerk user
CREATE OR REPLACE FUNCTION get_uuid_for_clerk_user(p_clerk_user_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uuid UUID;
BEGIN
  -- Try to get existing mapping
  SELECT supabase_user_id INTO v_uuid
  FROM clerk_user_mapping
  WHERE clerk_user_id = p_clerk_user_id;
  
  -- If not found, create new mapping with generated UUID
  IF v_uuid IS NULL THEN
    v_uuid := gen_random_uuid();
    INSERT INTO clerk_user_mapping (clerk_user_id, supabase_user_id)
    VALUES (p_clerk_user_id, v_uuid)
    ON CONFLICT (clerk_user_id) DO NOTHING
    RETURNING supabase_user_id INTO v_uuid;
    
    -- If concurrent insert happened, fetch the existing one
    IF v_uuid IS NULL THEN
      SELECT supabase_user_id INTO v_uuid
      FROM clerk_user_mapping
      WHERE clerk_user_id = p_clerk_user_id;
    END IF;
    
    -- Also ensure app_user record exists with this UUID
    INSERT INTO app_user (id, email, created_at, updated_at)
    VALUES (v_uuid, '', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN v_uuid;
END;
$$;

-- Grant execute permission to all roles including service_role for Edge Functions
GRANT EXECUTE ON FUNCTION get_uuid_for_clerk_user(TEXT) TO authenticated, anon, service_role;

-- Also grant permissions on the table
GRANT ALL ON clerk_user_mapping TO service_role;
GRANT SELECT, INSERT ON clerk_user_mapping TO authenticated, anon;

SELECT '✅ Clerk user mapping table and function created successfully!' as status;

