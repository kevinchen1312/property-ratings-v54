#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixReportFunctions() {
  console.log('🔧 Checking Report Functions Status\n');

  const propertyId = '364607cd-69fb-4e8a-9b20-4ff4ce6758e7';

  try {
    // Test each function
    console.log('🧪 Testing report functions...\n');

    // Test get_overall_averages
    console.log('1. Testing get_overall_averages...');
    try {
      const { data, error } = await supabase.rpc('get_overall_averages', {
        property_id_param: propertyId
      });
      if (error) {
        console.log(`❌ get_overall_averages FAILED: ${error.message}`);
      } else {
        console.log(`✅ get_overall_averages works - found ${data?.length || 0} results`);
      }
    } catch (err) {
      console.log(`❌ get_overall_averages ERROR: ${err}`);
    }

    // Test get_weekly_averages
    console.log('2. Testing get_weekly_averages...');
    try {
      const { data, error } = await supabase.rpc('get_weekly_averages', {
        property_id_param: propertyId
      });
      if (error) {
        console.log(`❌ get_weekly_averages FAILED: ${error.message}`);
      } else {
        console.log(`✅ get_weekly_averages works - found ${data?.length || 0} results`);
      }
    } catch (err) {
      console.log(`❌ get_weekly_averages ERROR: ${err}`);
    }

    // Test get_monthly_averages
    console.log('3. Testing get_monthly_averages...');
    try {
      const { data, error } = await supabase.rpc('get_monthly_averages', {
        property_id_param: propertyId
      });
      if (error) {
        console.log(`❌ get_monthly_averages FAILED: ${error.message}`);
      } else {
        console.log(`✅ get_monthly_averages works - found ${data?.length || 0} results`);
      }
    } catch (err) {
      console.log(`❌ get_monthly_averages ERROR: ${err}`);
    }

    // Test get_rating_log
    console.log('4. Testing get_rating_log...');
    try {
      const { data, error } = await supabase.rpc('get_rating_log', {
        property_id_param: propertyId
      });
      if (error) {
        console.log(`❌ get_rating_log FAILED: ${error.message}`);
      } else {
        console.log(`✅ get_rating_log works - found ${data?.length || 0} results`);
      }
    } catch (err) {
      console.log(`❌ get_rating_log ERROR: ${err}`);
    }

    console.log('\n📊 Comparing with raw data...');
    
    // Check raw ratings directly
    const { data: rawRatings, error: rawError } = await supabase
      .from('rating')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (rawError) {
      console.log(`❌ Raw data query failed: ${rawError.message}`);
    } else {
      console.log(`✅ Raw ratings table has ${rawRatings?.length || 0} entries`);
      
      if (rawRatings && rawRatings.length > 0) {
        console.log('\n📅 Sample raw data (first 5 entries):');
        rawRatings.slice(0, 5).forEach((rating: any, index: number) => {
          const date = new Date(rating.created_at).toLocaleDateString();
          const time = new Date(rating.created_at).toLocaleTimeString();
          console.log(`   ${index + 1}. ${date} ${time} - ${rating.attribute}: ${rating.stars} stars`);
        });

        // Calculate manual averages
        console.log('\n🧮 Manual average calculations:');
        const attributes = ['noise', 'friendliness', 'cleanliness'];
        attributes.forEach(attr => {
          const attrRatings = rawRatings.filter((r: any) => r.attribute === attr);
          if (attrRatings.length > 0) {
            const avg = attrRatings.reduce((sum: number, r: any) => sum + r.stars, 0) / attrRatings.length;
            console.log(`   ${attr}: ${avg.toFixed(2)} stars (${attrRatings.length} ratings)`);
          }
        });
      }
    }

    console.log('\n🔧 DIAGNOSIS:');
    console.log('If any functions failed above, you need to run the SQL functions script.');
    console.log('Go to Supabase Dashboard → SQL Editor and run the contents of:');
    console.log('supabase/functions/generatePropertyReport/sql-functions.sql');

  } catch (error) {
    console.error('❌ Function check failed:', error);
  }
}

fixReportFunctions().catch(console.error);

