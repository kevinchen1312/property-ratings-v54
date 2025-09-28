// Debug script to test rating submission directly
// Run this with: node debug-rating-submission.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugRatingSubmission() {
  console.log('🔍 Starting rating submission debug...');
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('\n1. Testing Supabase connection...');
    const { data: properties, error: propError } = await supabase
      .from('property')
      .select('id, name')
      .limit(1);
    
    if (propError) {
      console.error('❌ Property fetch error:', propError);
      return;
    }
    console.log('✅ Supabase connection works, found property:', properties[0]);
    
    // Test 2: Check current user authentication
    console.log('\n2. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    if (!user) {
      console.log('❌ No user authenticated - this might be the issue!');
      console.log('💡 The app needs to be signed in to submit ratings');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Test 3: Try to insert a test rating
    console.log('\n3. Testing rating insertion...');
    const testRating = {
      user_id: user.id,
      property_id: properties[0].id,
      attribute: 'noise',
      stars: 4,
      user_lat: 37.313964,
      user_lng: -122.069473,
    };
    
    console.log('Attempting to insert:', testRating);
    
    const { data: insertData, error: insertError } = await supabase
      .from('rating')
      .insert([testRating])
      .select();
    
    if (insertError) {
      console.error('❌ Rating insertion error:', insertError);
      console.error('Error code:', insertError.code);
      console.error('Error message:', insertError.message);
      console.error('Error details:', insertError.details);
      console.error('Error hint:', insertError.hint);
    } else {
      console.log('✅ Rating inserted successfully:', insertData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugRatingSubmission();
