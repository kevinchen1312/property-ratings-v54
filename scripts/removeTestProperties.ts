/**
 * Remove Test Properties Script
 * Deletes all properties within 1km of 1312 Centennial Court, San Jose, CA 95129
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Use the same approach as other scripts in this project
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Geocoded coordinates for 1312 Centennial Court, San Jose, CA 95129
// Approximate location in the Cupertino/San Jose border area
const TARGET_LAT = 37.3220; // Centennial Court area
const TARGET_LNG = -121.9800;
const RADIUS_METERS = 1000; // 1 kilometer

async function removeTestProperties() {
  console.log('🗑️  REMOVING TEST PROPERTIES');
  console.log('━'.repeat(50));
  console.log(`📍 Target: 1312 Centennial Court, San Jose, CA 95129`);
  console.log(`📌 Coordinates: ${TARGET_LAT}, ${TARGET_LNG}`);
  console.log(`📏 Radius: ${RADIUS_METERS}m (1 km)`);
  console.log();

  try {
    // Call the database function to delete properties within radius
    const { data, error } = await supabase.rpc('delete_properties_within_radius', {
      center_lat: TARGET_LAT,
      center_lng: TARGET_LNG,
      radius_meters: RADIUS_METERS,
    });

    if (error) {
      throw new Error(`Failed to delete properties: ${error.message}`);
    }

    const deletedCount = data as number;
    
    console.log('✅ DELETION COMPLETE');
    console.log(`🗑️  Deleted ${deletedCount} properties`);
    console.log();
    
    if (deletedCount > 0) {
      console.log(`💡 ${deletedCount} properties removed from the database`);
      console.log(`🔄 The map will now load fresh OSM data for this area`);
    } else {
      console.log('ℹ️  No properties found in this area');
    }
    
  } catch (error) {
    console.error('❌ Error removing properties:', error);
    throw error;
  }
}

// Run the script
removeTestProperties()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
