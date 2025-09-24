#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPropertyReport() {
  console.log('🧪 Testing Property Report Generation\n');

  try {
    // 1. Get a test property ID from the database
    console.log('📋 Fetching available properties...');
    const { data: properties, error: propertiesError } = await supabase
      .from('property')
      .select('id, name, address')
      .limit(5);

    if (propertiesError) {
      console.error('❌ Error fetching properties:', propertiesError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️ No properties found in database');
      return;
    }

    console.log('✅ Found properties:');
    properties.forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.name} (${prop.id})`);
    });

    // Use the first property for testing
    const testProperty = properties[0];
    console.log(`\n🎯 Testing with property: ${testProperty.name}`);

    // 2. Check if the property has any ratings
    console.log('\n📊 Checking existing ratings...');
    const { data: ratings, error: ratingsError } = await supabase
      .from('rating')
      .select('*')
      .eq('property_id', testProperty.id)
      .limit(5);

    if (ratingsError) {
      console.error('❌ Error fetching ratings:', ratingsError);
      return;
    }

    console.log(`✅ Found ${ratings?.length || 0} ratings for this property`);

    // 3. Test the Edge Function
    console.log('\n🚀 Calling generatePropertyReport Edge Function...');

    // Note: Replace this URL with your actual Supabase project URL
    const functionUrl = `${supabaseUrl}/functions/v1/generatePropertyReport`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        propertyId: testProperty.id
      })
    });

    const result = await response.json() as any;

    if (!response.ok) {
      console.error('❌ Edge Function error:', result);
      return;
    }

    console.log('✅ Report generated successfully!');
    console.log(`📄 Property: ${result.property}`);
    console.log(`🔗 Report URL: ${result.reportUrl}`);
    console.log(`📁 File name: ${result.fileName}`);
    console.log(`⏰ Expires at: ${result.expiresAt}`);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\n💡 You can download the PDF report using the URL above');
    console.log('💡 The URL will be valid for 7 days');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Add some sample ratings for testing if needed
async function addSampleRatings(propertyId: string) {
  console.log('\n➕ Adding sample ratings for testing...');

  // You would need to be authenticated to add ratings
  // This is just for reference - you might want to add ratings through your app first

  const sampleRatings = [
    { attribute: 'noise', stars: 4 },
    { attribute: 'friendliness', stars: 5 },
    { attribute: 'cleanliness', stars: 3 },
  ];

  // Note: This requires proper authentication and proximity validation
  // You'll likely need to add ratings through your mobile app first
  console.log('💡 To test with data, add some ratings through your mobile app first');
}

// Run the test
testPropertyReport().catch(console.error);
