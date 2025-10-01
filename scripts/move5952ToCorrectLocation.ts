/**
 * Move 5952 West Walbrook Drive pin to the correct location
 * Based on visual inspection of the map, the correct location is
 * on the empty rectangle property on West Walbrook Drive
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Correct coordinates for 5952 West Walbrook Drive
// Based on the empty rectangle visible on the map
const CORRECT_LAT = 37.29976;  // Adjusted to be on the property
const CORRECT_LNG = -122.00972;

async function move5952() {
  console.log('📍 MOVING 5952 WEST WALBROOK DRIVE TO CORRECT LOCATION\n');

  try {
    // First, find the current property
    const { data: properties, error: findError } = await supabase
      .from('property')
      .select('id, name, address, lat, lng, osm_id')
      .ilike('address', '%5952%Walbrook%');

    if (findError) {
      throw new Error(`Error finding property: ${findError.message}`);
    }

    if (!properties || properties.length === 0) {
      console.log('❌ No property found matching "5952 Walbrook"');
      console.log('The property may have already been deleted.');
      return;
    }

    console.log(`Found property:\n`);
    const property = properties[0];
    console.log(`  ID: ${property.id}`);
    console.log(`  Name: ${property.name}`);
    console.log(`  Address: ${property.address}`);
    console.log(`  Current Location: ${property.lat}, ${property.lng}`);
    console.log(`  OSM ID: ${property.osm_id}\n`);

    console.log(`Moving to new location:`);
    console.log(`  New Latitude: ${CORRECT_LAT}`);
    console.log(`  New Longitude: ${CORRECT_LNG}\n`);

    // Update the location
    const { error: updateError } = await supabase
      .from('property')
      .update({
        lat: CORRECT_LAT,
        lng: CORRECT_LNG
      })
      .eq('id', property.id);

    if (updateError) {
      throw new Error(`Error updating location: ${updateError.message}`);
    }

    console.log('✅ Successfully moved pin to correct location!');
    console.log('The pin will appear at the correct location on next map reload.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

move5952()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
