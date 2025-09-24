#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PropertyRecord {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

async function fillCupertinoGaps() {
  console.log('🎯 EFFICIENT CUPERTINO GAP FILLING\n');
  console.log('Strategy: Use one comprehensive Overpass query instead of 56 grid cells\n');

  // Cupertino bounds (same as app uses)
  const bounds = {
    south: 37.290,
    north: 37.350,
    west: -122.082,
    east: -122.008
  };

  // ONE comprehensive query for the entire Cupertino area
  // This is much faster than 56 separate queries
  const overpassQuery = `
[out:json][timeout:60];
(
  // All residential buildings with any address info
  way["building"~"^(residential|house|detached|apartments|terrace|yes)$"]["addr:street"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["building"~"^(residential|house|detached|apartments|terrace|yes)$"]["addr:housenumber"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  
  // Point buildings with address info
  node["building"~"^(residential|house|detached|apartments|terrace|yes)$"]["addr:street"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["building"~"^(residential|house|detached|apartments|terrace|yes)$"]["addr:housenumber"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  
  // Any building with house number (catch-all)
  way["building"]["addr:housenumber"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["building"]["addr:housenumber"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  
  // Any building with street name (catch-all)
  way["building"]["addr:street"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  node["building"]["addr:street"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out body;
>; out skel qt;
`.trim();

  console.log('🌐 Fetching ALL Cupertino buildings in one request...');
  
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 Found ${data.elements?.length || 0} OSM elements`);

    if (!data.elements || data.elements.length === 0) {
      console.log('⚠️ No OSM elements found in Cupertino area');
      return;
    }

    // Process OSM elements
    const properties: PropertyRecord[] = [];
    const nodeCache = new Map();

    // Cache nodes for way processing
    data.elements.forEach((element: any) => {
      if (element.type === 'node') {
        nodeCache.set(element.id, { lat: element.lat, lon: element.lon });
      }
    });

    console.log('🏗️ Processing buildings...');

    // Process all buildings
    data.elements.forEach((element: any) => {
      let lat: number, lng: number;

      if (element.type === 'node') {
        lat = element.lat;
        lng = element.lon;
      } else if (element.type === 'way' && element.nodes) {
        // Calculate centroid for ways
        let latSum = 0, lonSum = 0, validNodes = 0;
        
        for (const nodeId of element.nodes) {
          const node = nodeCache.get(nodeId);
          if (node) {
            latSum += node.lat;
            lonSum += node.lon;
            validNodes++;
          }
        }
        
        if (validNodes === 0) return;
        lat = latSum / validNodes;
        lng = lonSum / validNodes;
      } else {
        return;
      }

      // Extract address information
      const tags = element.tags || {};
      const housenumber = tags['addr:housenumber'];
      const street = tags['addr:street'];
      const city = tags['addr:city'];
      const building = tags['building'];

      // Create meaningful property name and address
      let name: string, address: string;

      if (housenumber && street) {
        // Full address available
        name = `${housenumber} ${street}`;
        const cityName = city || 'Cupertino';
        const zipCode = cityName.toLowerCase().includes('cupertino') ? '95014' : '95129';
        address = `${housenumber} ${street}, ${cityName}, CA ${zipCode}`;
      } else if (street) {
        // Street only
        name = `Building on ${street}`;
        const cityName = city || 'Cupertino';
        const zipCode = cityName.toLowerCase().includes('cupertino') ? '95014' : '95129';
        address = `Building on ${street}, ${cityName}, CA ${zipCode}`;
      } else if (building && building !== 'yes') {
        // Building type specified
        name = `${building} building`;
        address = `${building} building, Cupertino, CA 95014`;
      } else {
        // Generic building
        name = `Residential building`;
        address = `Residential building, Cupertino, CA 95014`;
      }

      properties.push({ name, address, lat, lng });
    });

    console.log(`🏠 Processed ${properties.length} potential properties`);

    // Import properties with duplicate checking (within 15m radius)
    console.log('💾 Importing new properties (checking for 15m duplicates)...');
    
    let imported = 0;
    let skipped = 0;
    const batchSize = 20; // Process in smaller batches

    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(properties.length/batchSize)}`);
      
      for (const prop of batch) {
        // Check if similar property already exists within 15m
        const { data: existing } = await supabase
          .from('property')
          .select('id')
          .gte('lat', prop.lat - 0.00015)  // ~15m
          .lte('lat', prop.lat + 0.00015)
          .gte('lng', prop.lng - 0.00015)
          .lte('lng', prop.lng + 0.00015)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue; // Skip duplicates
        }

        // Import new property
        const { error } = await supabase
          .from('property')
          .insert([prop]);

        if (!error) {
          imported++;
          if (imported % 10 === 0) {
            console.log(`  ✅ ${imported} properties imported so far...`);
          }
        } else {
          console.error(`  ❌ Error importing property: ${error.message}`);
        }
      }
    }

    console.log(`\n🎉 CUPERTINO GAP FILLING COMPLETE!`);
    console.log(`📊 Results:`);
    console.log(`  • Found: ${properties.length} potential properties`);
    console.log(`  • Imported: ${imported} new properties`);
    console.log(`  • Skipped: ${skipped} duplicates`);
    console.log(`  • Success rate: ${((imported/(imported+skipped))*100).toFixed(1)}%`);
    console.log(`\n🎯 Cupertino should now have much better coverage!`);
    console.log(`💡 Restart your app to see the new pins`);

  } catch (error) {
    console.error('\n❌ Gap filling failed:', error);
    process.exit(1);
  }
}

fillCupertinoGaps();

