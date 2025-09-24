-- Create a test user directly in the database
-- Run this in your Supabase SQL Editor

-- Insert a test user
INSERT INTO app_user (id, email, display_name, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test@example.com',
  'Test User',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name;

SELECT 'Test user created successfully!' as result;

