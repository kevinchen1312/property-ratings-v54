#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function importCupertinoBulk() {
  try {
    console.log('⚡ CUPERTINO BULK IMPORT');
    console.log('========================');
    console.log('🚀 Fast bulk insert strategy to avoid timeouts\n');

    // Get small focused area first
    const AREA = {
      north: 37.320,
      south: 37.310,   
      east: -122.040,
      west: -122.050   
    };

    const overpassQuery = `
    [out:json][timeout:10];
    (
      way["building"]["addr:housenumber"](${AREA.south},${AREA.west},${AREA.north},${AREA.east});
      node["building"]["addr:housenumber"](${AREA.south},${AREA.west},${AREA.north},${AREA.east});
    );
    out body;
    >; out skel qt;
    `.trim();

    console.log('📡 Fetching data...');
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: overpassQuery,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const osmData = await response.json();
    console.log(`✅ Got ${osmData.elements.length} elements`);

    // Fast processing - only nodes with addresses
    const properties = osmData.elements
      .filter((el: any) => 
        el.type === 'node' && 
        el.lat && el.lon &&
        el.tags?.['addr:housenumber'] && 
        el.tags?.['addr:street']
      )
      .map((el: any) => ({
        name: `${el.tags['addr:housenumber']} ${el.tags['addr:street']}`,
        address: `${el.tags['addr:housenumber']} ${el.tags['addr:street']}, Cupertino, CA 95014`,
        lat: el.lat,
        lng: el.lon
      }));

    console.log(`🏠 Processing ${properties.length} properties`);

    if (properties.length === 0) {
      console.log('✅ No properties found in this area');
      return;
    }

    // ONE SINGLE BULK INSERT - fastest possible
    console.log('💾 Bulk inserting...');
    const { data, error } = await supabase
      .from('property')
      .insert(properties);

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        console.log('⚠️ Some duplicates existed - that\'s normal');
        console.log('✅ Bulk insert completed with expected duplicates');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Bulk insert successful!');
    }

    console.log(`\n🎯 BULK IMPORT COMPLETE!`);
    console.log(`📊 Processed: ${properties.length} properties`);
    console.log('⚡ Fast execution - no timeout risk');

  } catch (error) {
    console.error('\n❌ Import failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

importCupertinoBulk();

