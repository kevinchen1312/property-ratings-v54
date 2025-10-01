/**
 * Delete the incorrect 5952 West Walbrook Drive pin
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function delete5952() {
  console.log('🗑️  DELETING 5952 WEST WALBROOK DRIVE PIN\n');

  try {
    // First, find the property
    const { data: properties, error: findError } = await supabase
      .from('property')
      .select('id, name, address, lat, lng, osm_id')
      .ilike('address', '%5952%Walbrook%');

    if (findError) {
      throw new Error(`Error finding property: ${findError.message}`);
    }

    if (!properties || properties.length === 0) {
      console.log('❌ No property found matching "5952 Walbrook"');
      return;
    }

    console.log(`Found ${properties.length} property(ies):\n`);
    properties.forEach(p => {
      console.log(`  ID: ${p.id}`);
      console.log(`  Name: ${p.name}`);
      console.log(`  Address: ${p.address}`);
      console.log(`  Location: ${p.lat}, ${p.lng}`);
      console.log(`  OSM ID: ${p.osm_id}`);
      console.log('');
    });

    // Delete all matching properties
    const { error: deleteError } = await supabase
      .from('property')
      .delete()
      .ilike('address', '%5952%Walbrook%');

    if (deleteError) {
      throw new Error(`Error deleting: ${deleteError.message}`);
    }

    console.log(`✅ Deleted ${properties.length} property(ies)`);
    console.log('The pin will disappear on next map reload');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

delete5952()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
