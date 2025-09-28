#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// San Jose area boundaries (covering major residential areas)
const SAN_JOSE_AREAS = [
  // Downtown San Jose
  {
    name: "Downtown San Jose",
    north: 37.350,
    south: 37.320,   
    east: -121.870,
    west: -121.910
  },
  // Willow Glen area
  {
    name: "Willow Glen",
    north: 37.320,
    south: 37.290,   
    east: -121.880,
    west: -121.920
  },
  // Almaden area
  {
    name: "Almaden",
    north: 37.290,
    south: 37.260,   
    east: -121.850,
    west: -121.890
  },
  // East San Jose
  {
    name: "East San Jose",
    north: 37.350,
    south: 37.320,   
    east: -121.820,
    west: -121.860
  },
  // North San Jose
  {
    name: "North San Jose",
    north: 37.420,
    south: 37.390,   
    east: -121.900,
    west: -121.940
  }
];

interface OSMNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OSMWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

interface PropertyRecord {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

function calculateCentroid(nodes: OSMNode[]): { lat: number; lng: number } {
  if (nodes.length === 0) {
    throw new Error('Cannot calculate centroid of empty node array');
  }

  const sum = nodes.reduce(
    (acc, node) => ({
      lat: acc.lat + node.lat,
      lng: acc.lng + node.lon,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / nodes.length,
    lng: sum.lng / nodes.length,
  };
}

function processOSMElements(elements: (OSMNode | OSMWay)[]): PropertyRecord[] {
  // Create a map of all nodes for way processing
  const nodeMap = new Map<number, OSMNode>();
  const ways: OSMWay[] = [];
  const processedElements: OSMNode[] = [];

  // Separate nodes and ways
  for (const element of elements) {
    if (element.type === 'node') {
      nodeMap.set(element.id, element);
    } else if (element.type === 'way') {
      ways.push(element);
    }
  }

  console.log(`📍 Found ${nodeMap.size} nodes and ${ways.length} ways`);

  // Process standalone nodes (buildings or entrances with addresses)
  for (const node of nodeMap.values()) {
    if (node.tags?.['addr:housenumber'] && node.tags?.['addr:street']) {
      processedElements.push(node);
    }
  }

  // Process ways (building polygons) - calculate centroids
  for (const way of ways) {
    if (way.tags?.['addr:housenumber'] && way.tags?.['addr:street']) {
      const wayNodes = way.nodes
        .map(nodeId => nodeMap.get(nodeId))
        .filter((node): node is OSMNode => node !== undefined);
      
      if (wayNodes.length > 0) {
        const centroid = calculateCentroid(wayNodes);
        processedElements.push({
          type: 'node' as const,
          id: way.id,
          lat: centroid.lat,
          lon: centroid.lng,
          tags: way.tags,
        });
      }
    }
  }

  // Convert to property records and deduplicate by address
  const propertyMap = new Map<string, PropertyRecord>();
  
  for (const element of processedElements) {
    const housenumber = element.tags?.['addr:housenumber'];
    const street = element.tags?.['addr:street'];
    const city = element.tags?.['addr:city'] || 'San Jose'; // Default to San Jose
    
    if (!housenumber || !street) continue;

    // Normalize the address
    const cleanStreet = street.trim();
    const zipCode = '95129'; // Default San Jose zip code
    const normalizedCity = 'San Jose';
    
    const address = `${housenumber} ${cleanStreet}, ${normalizedCity}, CA ${zipCode}`;
    
    // Skip if we already have this address
    if (propertyMap.has(address)) continue;

    const property: PropertyRecord = {
      name: `${housenumber} ${cleanStreet}`,
      address,
      lat: element.lat,
      lng: element.lon,
    };

    propertyMap.set(address, property);
  }

  return Array.from(propertyMap.values());
}

async function upsertProperties(properties: PropertyRecord[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  const batchSize = 50;

  console.log(`\n💾 Upserting ${properties.length} properties to Supabase in batches of ${batchSize}...`);

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(properties.length/batchSize)} (${batch.length} properties)`);
    
    for (const property of batch) {
      try {
        // Try to find existing property by address
        const { data: existing, error: selectError } = await supabase
          .from('property')
          .select('id')
          .eq('address', property.address)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        if (existing) {
          // Update existing property
          const { error: updateError } = await supabase
            .from('property')
            .update({
              name: property.name,
              lat: property.lat,
              lng: property.lng,
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          updated++;
        } else {
          // Insert new property
          const { error: insertError } = await supabase
            .from('property')
            .insert([property]);

          if (insertError) throw insertError;
          inserted++;
        }
      } catch (error) {
        console.error(`  ✗ Failed to upsert ${property.address}:`, error);
        
        // If RLS is blocking, provide helpful message
        if (error instanceof Error && (error.message.includes('RLS') || error.message.includes('row-level security'))) {
          console.error(`\n🚫 Row Level Security (RLS) is blocking the import for ${property.address}`);
          console.error('Make sure RLS is disabled before running this large import!');
          console.error('Run: ALTER TABLE property DISABLE ROW LEVEL SECURITY;');
          throw error;
        }
      }
    }
    
    console.log(`  ✓ Batch complete: ${inserted + updated} properties processed so far`);
    
    // Small delay between batches
    if (i + batchSize < properties.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { inserted, updated };
}

async function importAreaData(area: typeof SAN_JOSE_AREAS[0]) {
  console.log(`\n🏙️ Importing ${area.name}...`);
  
  const overpassQuery = `
  [out:json][timeout:30];
  (
    way["building"]["addr:housenumber"](${area.south},${area.west},${area.north},${area.east});
    node["building"]["addr:housenumber"](${area.south},${area.west},${area.north},${area.east});
    way["addr:housenumber"](${area.south},${area.west},${area.north},${area.east});
    node["addr:housenumber"](${area.south},${area.west},${area.north},${area.east});
  );
  out body;
  >; out skel qt;
  `.trim();

  console.log('📡 Fetching OSM data...');
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: overpassQuery,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const osmData = await response.json();
  console.log(`📊 Raw OSM elements: ${osmData.elements?.length || 0}`);

  if (!osmData.elements || osmData.elements.length === 0) {
    console.log(`⚠️ No data found for ${area.name}`);
    return [];
  }

  const properties = processOSMElements(osmData.elements);
  console.log(`🏠 Processed properties: ${properties.length}`);

  return properties;
}

async function main() {
  try {
    console.log('🌉 SAN JOSE PROPERTY IMPORT');
    console.log('============================');
    console.log('🚀 Importing residential properties across San Jose\n');

    let allProperties: PropertyRecord[] = [];

    // Import each area
    for (const area of SAN_JOSE_AREAS) {
      try {
        const areaProperties = await importAreaData(area);
        allProperties = allProperties.concat(areaProperties);
        console.log(`✅ ${area.name}: ${areaProperties.length} properties`);
        
        // Delay between areas to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to import ${area.name}:`, error);
        // Continue with other areas
      }
    }

    console.log(`\n📊 TOTAL PROPERTIES FOUND: ${allProperties.length}`);

    if (allProperties.length === 0) {
      console.log('❌ No properties found. Exiting.');
      return;
    }

    // Show top streets
    const streetCounts = new Map<string, number>();
    allProperties.forEach(prop => {
      const street = prop.name.split(' ').slice(1).join(' '); // Remove house number
      streetCounts.set(street, (streetCounts.get(street) || 0) + 1);
    });

    console.log('\n🏘️ Top Streets:');
    const topStreets = Array.from(streetCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    topStreets.forEach(([street, count], index) => {
      console.log(`  ${index + 1}. ${street}: ${count} properties`);
    });

    // Upsert to Supabase
    const { inserted, updated } = await upsertProperties(allProperties);
    
    console.log(`\n✅ San Jose Import Complete!`);
    console.log(`  • Inserted: ${inserted} new properties`);
    console.log(`  • Updated: ${updated} existing properties`);
    console.log(`  • Total processed: ${inserted + updated} properties`);
    console.log(`  • Coverage: Major San Jose residential areas`);
    
    if (inserted + updated < allProperties.length) {
      const failed = allProperties.length - inserted - updated;
      console.log(`  • Failed: ${failed} properties (see errors above)`);
    }

    console.log(`\n🎯 Next steps:`);
    console.log(`  1. Test your app - you should see hundreds of new San Jose pins!`);
    console.log(`  2. Zoom out to see the expanded coverage area`);
    console.log(`  3. The pins should now cover both Cupertino and San Jose`);

  } catch (error) {
    console.error('\n❌ Import failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute the main function
main();
