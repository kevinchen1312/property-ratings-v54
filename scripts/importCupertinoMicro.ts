#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// MICRO area - just a small slice of Cupertino to test
const CUPERTINO_MICRO = {
  north: 37.325,   // Small area
  south: 37.315,   // Small area  
  east: -122.035,  // Small area
  west: -122.045   // Small area
};

interface OSMElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
}

interface OSMResponse {
  elements: OSMElement[];
}

interface PropertyRecord {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

async function importCupertinoMicro() {
  try {
    console.log('🔬 CUPERTINO MICRO IMPORT');
    console.log('=========================');
    console.log('📍 Tiny area to test timeout avoidance');
    console.log(`🌍 Area: ${CUPERTINO_MICRO.north}°N to ${CUPERTINO_MICRO.south}°S`);
    console.log(`🌍       ${CUPERTINO_MICRO.west}°W to ${CUPERTINO_MICRO.east}°E\n`);

    // Very focused query for small area
    const overpassQuery = `
    [out:json][timeout:15];
    (
      way["building"]["addr:housenumber"](${CUPERTINO_MICRO.south},${CUPERTINO_MICRO.west},${CUPERTINO_MICRO.north},${CUPERTINO_MICRO.east});
      node["building"]["addr:housenumber"](${CUPERTINO_MICRO.south},${CUPERTINO_MICRO.west},${CUPERTINO_MICRO.north},${CUPERTINO_MICRO.east});
    );
    out body;
    >; out skel qt;
    `.trim();

    console.log('📡 Querying Overpass API for micro area...');
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: overpassQuery,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const osmData: OSMResponse = await response.json();
    console.log(`✅ Received ${osmData.elements.length} OSM elements\n`);

    // Quick processing - no heavy computation
    const properties: PropertyRecord[] = [];
    
    for (const element of osmData.elements) {
      if (element.type === 'node' && 
          element.lat && element.lon &&
          element.tags?.['addr:housenumber'] && 
          element.tags?.['addr:street']) {
        
        const address = `${element.tags['addr:housenumber']} ${element.tags['addr:street']}, Cupertino, CA 95014`;
        properties.push({
          name: `${element.tags['addr:housenumber']} ${element.tags['addr:street']}`,
          address,
          lat: element.lat,
          lng: element.lon
        });
      }
    }

    console.log(`🏠 Found ${properties.length} properties`);

    if (properties.length === 0) {
      console.log('✅ No new properties to add in this micro area');
      return;
    }

    // Show what we found
    console.log('\n📍 Properties to add:');
    properties.forEach((prop, index) => {
      console.log(`  ${index + 1}. ${prop.address}`);
    });

    // Super fast bulk insert (no individual checking)
    console.log(`\n💾 Bulk inserting ${properties.length} properties...`);
    
    const { data: insertedData, error: insertError } = await supabase
      .from('property')
      .insert(properties)
      .select('id');

    if (insertError) {
      // If bulk insert fails due to duplicates, try one by one
      console.log('⚠️ Bulk insert failed, trying individual inserts...');
      let inserted = 0;
      
      for (const property of properties) {
        try {
          await supabase.from('property').insert([property]);
          inserted++;
        } catch (error) {
          // Skip duplicates silently
        }
      }
      
      console.log(`✅ Individual inserts: ${inserted} new properties`);
    } else {
      console.log(`✅ Bulk insert: ${insertedData?.length || 0} new properties`);
    }

    console.log(`\n🎯 MICRO IMPORT COMPLETE!`);
    console.log('✅ No timeout - script completed successfully');
    console.log('🔄 You can run this multiple times for different areas');

  } catch (error) {
    console.error('\n❌ Import failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

importCupertinoMicro();

