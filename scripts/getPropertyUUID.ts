#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getPropertyUUID() {
  console.log('🔍 Finding Property UUID\n');

  try {
    // Get the test property (same one used in reports)
    const { data: properties, error: propertiesError } = await supabase
      .from('property')
      .select('id, name, address')
      .eq('name', '10634 Merriman Road')
      .single();

    if (propertiesError || !properties) {
      console.error('❌ Property not found:', propertiesError);
      return;
    }

    console.log('🏠 PROPERTY UUID INFORMATION:');
    console.log('');
    console.log(`📄 Property Name: ${properties.name}`);
    console.log(`📍 Property Address: ${properties.address}`);
    console.log('');
    console.log('🎯 UUID (for Supabase queries):');
    console.log(`   ${properties.id}`);
    console.log('');
    console.log('💡 HOW TO USE THIS UUID:');
    console.log('');
    console.log('   1. In Supabase Dashboard → Table Editor → "rating" table');
    console.log(`   2. Filter by: property_id = ${properties.id}`);
    console.log('');
    console.log('   3. In SQL Editor, use this UUID in queries like:');
    console.log(`   SELECT * FROM get_overall_averages('${properties.id}');`);
    console.log(`   SELECT * FROM get_weekly_averages('${properties.id}');`);
    console.log('');
    console.log('✅ This UUID should also appear in the footer of your PDF report!');

  } catch (error) {
    console.error('❌ Failed to get UUID:', error);
  }
}

getPropertyUUID().catch(console.error);

