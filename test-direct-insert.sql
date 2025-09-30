-- Test inserting a rating directly in the database
-- This will tell us if the database itself can accept inserts

-- First, get a valid user_id and property_id
DO $$
DECLARE
  test_user_id UUID;
  test_property_id UUID;
BEGIN
  -- Get the first user
  SELECT id INTO test_user_id FROM app_user LIMIT 1;
  
  -- Get the first property
  SELECT id INTO test_property_id FROM property LIMIT 1;
  
  RAISE NOTICE 'Testing with user_id: %, property_id: %', test_user_id, test_property_id;
  
  -- Try to insert a test rating
  INSERT INTO rating (user_id, property_id, attribute, stars, user_lat, user_lng)
  VALUES (
    test_user_id,
    test_property_id,
    'noise',
    4,
    37.3,
    -122.0
  );
  
  RAISE NOTICE 'SUCCESS! Rating inserted successfully!';
  
  -- Clean up the test rating
  DELETE FROM rating 
  WHERE user_id = test_user_id 
    AND property_id = test_property_id 
    AND attribute = 'noise' 
    AND stars = 4;
    
  RAISE NOTICE 'Test rating cleaned up.';
END $$;

