#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

// Use anon key for now (we'll insert through your app user)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addSampleRatings() {
  console.log('🎭 Adding sample ratings for testing...\n');

  try {
    // Get a few properties to add ratings to
    const { data: properties, error: propsError } = await supabase
      .from('property')
      .select('id, name, address, lat, lng')
      .limit(3);

    if (propsError || !properties || properties.length === 0) {
      console.error('❌ Error fetching properties:', propsError);
      return;
    }

    console.log(`✅ Found ${properties.length} properties to add ratings to`);

    // Check if we have users in app_user table, if not check auth.users
    let { data: users, error: usersError } = await supabase
      .from('app_user')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.error('❌ Error fetching users from app_user:', usersError);
    }

    let testUserId: string;
    let userEmail: string;

    if (!users || users.length === 0) {
      console.log('⚠️ No users found in app_user table');
      console.log('🔍 Checking Supabase Auth users...');
      
      // Try to get auth users (requires service role)
      // For now, let's create a test user directly
      const authTestUserId = '11111111-1111-1111-1111-111111111111';
      const testEmail = 'test@example.com';
      
      console.log('➕ Creating test user in app_user table...');
      const { data: newUser, error: createError } = await supabase
        .from('app_user')
        .insert([
          {
            id: authTestUserId,
            email: testEmail,
            display_name: 'Test User'
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test user:', createError);
        console.log('💡 Let me try a different approach...');
        
        // Use the user that's currently signed in through auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          testUserId = authUser.id;
          userEmail = authUser.email || 'current-user';
          console.log(`👤 Using current authenticated user: ${userEmail}`);
          
          // Create entry in app_user table for this user
          await supabase
            .from('app_user')
            .upsert([
              {
                id: authUser.id,
                email: authUser.email || 'current-user',
                display_name: authUser.email?.split('@')[0] || 'User'
              }
            ]);
        } else {
          console.error('❌ No authenticated user found');
          return;
        }
      } else {
        testUserId = authTestUserId;
        userEmail = testEmail;
        console.log(`✅ Created test user: ${testEmail}`);
      }
    } else {
      testUserId = users[0].id;
      userEmail = users[0].email;
      console.log(`👤 Using existing user: ${userEmail}`);
    }

    // Add sample ratings for each property
    const sampleRatings: Array<{
      user_id: string;
      property_id: string;
      attribute: string;
      stars: number;
      user_lat: number;
      user_lng: number;
      created_at: string;
    }> = [];
    
    for (const property of properties) {
      console.log(`📊 Adding ratings for: ${property.name}`);
      
      // Add ratings for different dates to create trends
      const dates = [
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),  // 7 days ago
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),  // 3 days ago
        new Date(),                                        // Today
      ];

      dates.forEach((date, dateIndex) => {
        // Generate varied ratings (getting better over time)
        const baseRating = 2 + dateIndex; // Ratings improve from 2 to 6 stars over time
        
        ['noise', 'friendliness', 'cleanliness'].forEach(attribute => {
          const variation = Math.random() > 0.5 ? 1 : 0; // Add some variation
          const stars = Math.min(5, Math.max(1, baseRating + variation));
          
          sampleRatings.push({
            user_id: testUserId,
            property_id: property.id,
            attribute: attribute,
            stars: stars,
            user_lat: property.lat + (Math.random() - 0.5) * 0.0001, // Nearby location
            user_lng: property.lng + (Math.random() - 0.5) * 0.0001,
            created_at: date.toISOString()
          });
        });
      });
    }

    console.log(`📝 Inserting ${sampleRatings.length} sample ratings...`);

    const { error: ratingsError } = await supabase
      .from('rating')
      .insert(sampleRatings);

    if (ratingsError) {
      console.error('❌ Error inserting ratings:', ratingsError);
      return;
    }

    console.log('✅ Sample ratings added successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${properties.length} properties rated`);
    console.log(`   • ${sampleRatings.length} total ratings`);
    console.log(`   • 5 different time periods`);
    console.log(`   • 3 rating attributes each`);
    
    console.log('\n🎉 You can now test report generation with:');
    console.log('   npm run test:report');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

addSampleRatings().catch(console.error);
