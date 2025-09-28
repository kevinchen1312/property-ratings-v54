-- Create fake ratings from 15 different users for testing revenue sharing
-- This bypasses RLS by running as a database admin

-- First, let's use the 1312 Centennial Court property
DO $$
DECLARE
    property_id UUID := 'bd9272e6-c1d4-4c53-8846-20e9a41b2013'; -- 1312 Centennial Court
    property_lat DECIMAL := 37.2993999818182;
    property_lng DECIMAL := -122.009636718182;
    
    -- 15 fake users with varying rating counts (Alice=10, Bob=9, Carol=8, etc.)
    fake_users UUID[] := ARRAY[
        '11111111-1111-4111-8111-111111111111'::UUID, -- Alice: 10 ratings
        '22222222-2222-4222-8222-222222222222'::UUID, -- Bob: 9 ratings  
        '33333333-3333-4333-8333-333333333333'::UUID, -- Carol: 8 ratings
        '44444444-4444-4444-8444-444444444444'::UUID, -- David: 7 ratings
        '55555555-5555-4555-8555-555555555555'::UUID, -- Eve: 6 ratings
        '66666666-6666-4666-8666-666666666666'::UUID, -- Frank: 5 ratings
        '77777777-7777-4777-8777-777777777777'::UUID, -- Grace: 4 ratings
        '88888888-8888-4888-8888-888888888888'::UUID, -- Henry: 3 ratings
        '99999999-9999-4999-8999-999999999999'::UUID, -- Ivy: 2 ratings
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::UUID, -- Jack: 1 rating
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::UUID, -- Kate: 1 rating
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::UUID, -- Liam: 1 rating
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::UUID, -- Mia: 1 rating
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::UUID, -- Noah: 1 rating
        'ffffffff-ffff-4fff-8fff-ffffffffffff'::UUID  -- Olivia: 1 rating
    ];
    
    rating_counts INTEGER[] := ARRAY[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1];
    user_names TEXT[] := ARRAY['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia'];
    
    attributes TEXT[] := ARRAY['noise', 'safety', 'cleanliness'];
    
    user_id UUID;
    rating_count INTEGER;
    user_name TEXT;
    i INTEGER;
    j INTEGER;
    attr TEXT;
    stars INTEGER;
    user_lat DECIMAL;
    user_lng DECIMAL;
    created_time TIMESTAMP;
    total_ratings INTEGER := 0;
    
BEGIN
    RAISE NOTICE '🎭 Creating fake ratings for revenue sharing test...';
    RAISE NOTICE 'Property: 1312 Centennial Court, San Jose, CA';
    RAISE NOTICE 'Property ID: %', property_id;
    
    -- Clear existing ratings for this property
    DELETE FROM rating WHERE property_id = property_id;
    RAISE NOTICE '🧹 Cleared existing ratings';
    
    -- Create ratings for each fake user
    FOR i IN 1..15 LOOP
        user_id := fake_users[i];
        rating_count := rating_counts[i];
        user_name := user_names[i];
        
        RAISE NOTICE '👤 Creating % ratings for % (%)', rating_count, user_name, user_id;
        
        -- Create the specified number of ratings for this user
        FOR j IN 1..rating_count LOOP
            -- Cycle through attributes
            attr := attributes[((j - 1) % 3) + 1];
            
            -- Random star rating 1-5
            stars := (random() * 4)::INTEGER + 1;
            
            -- Random coordinates within 100m of property
            user_lat := property_lat + (random() - 0.5) * 0.002;
            user_lng := property_lng + (random() - 0.5) * 0.002;
            
            -- Random time within last 30 days
            created_time := NOW() - (random() * INTERVAL '30 days');
            
            -- Insert the rating
            INSERT INTO rating (
                user_id,
                property_id, 
                attribute,
                stars,
                user_lat,
                user_lng,
                created_at
            ) VALUES (
                user_id,
                property_id,
                attr::rating_attribute,
                stars,
                user_lat,
                user_lng,
                created_time
            );
            
            total_ratings := total_ratings + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Successfully created % total ratings!', total_ratings;
    
    -- Verify the results
    RAISE NOTICE '';
    RAISE NOTICE '📊 VERIFICATION:';
    
    FOR i IN 1..15 LOOP
        user_id := fake_users[i];
        user_name := user_names[i];
        
        SELECT COUNT(*) INTO rating_count 
        FROM rating 
        WHERE property_id = property_id AND user_id = user_id;
        
        RAISE NOTICE '- %: % ratings', user_name, rating_count;
    END LOOP;
    
    -- Get top contributor
    DECLARE
        top_contributor_record RECORD;
    BEGIN
        SELECT * INTO top_contributor_record
        FROM get_top_contributor(property_id);
        
        IF FOUND THEN
            -- Find the user name
            FOR i IN 1..15 LOOP
                IF fake_users[i] = top_contributor_record.user_id THEN
                    user_name := user_names[i];
                    EXIT;
                END IF;
            END LOOP;
            
            RAISE NOTICE '';
            RAISE NOTICE '🏆 TOP CONTRIBUTOR: % (% ratings)', user_name, top_contributor_record.rating_count;
        END IF;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SUCCESS! Revenue sharing test data created!';
    RAISE NOTICE '🧪 Now you can test revenue sharing in your app:';
    RAISE NOTICE '1. Go to Earnings screen';
    RAISE NOTICE '2. Tap "Test Revenue Sharing"';
    RAISE NOTICE '3. Watch the 80/10/10 split in action!';
    
END $$;
