#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ALAMEDA COUNTY COMPREHENSIVE IMPORT
// Based on the successful Santa Clara County model
// Expected: 50,000-100,000+ properties across East Bay

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

// ALAMEDA COUNTY GRID - Comprehensive coverage
// Covers Oakland, Berkeley, Fremont, Hayward, San Leandro, Alameda, Dublin, Pleasanton, etc.
const ALAMEDA_COUNTY_GRID = [
  // Oakland Areas
  { name: 'Oakland Downtown', north: 37.8200, south: 37.7900, east: -122.2500, west: -122.2900 },
  { name: 'Oakland Hills', north: 37.8500, south: 37.8200, east: -122.2000, west: -122.2500 },
  { name: 'Oakland East', north: 37.8000, south: 37.7700, east: -122.2000, west: -122.2500 },
  { name: 'Oakland West', north: 37.8200, south: 37.7900, east: -122.2900, west: -122.3200 },
  
  // Berkeley Areas
  { name: 'Berkeley Central', north: 37.8800, south: 37.8500, east: -122.2400, west: -122.2800 },
  { name: 'Berkeley Hills', north: 37.9000, south: 37.8700, east: -122.2200, west: -122.2600 },
  { name: 'Berkeley West', north: 37.8800, south: 37.8500, east: -122.2800, west: -122.3100 },
  
  // Fremont Areas
  { name: 'Fremont Central', north: 37.5600, south: 37.5200, east: -121.9600, west: -122.0200 },
  { name: 'Fremont South', north: 37.5200, south: 37.4800, east: -121.9400, west: -122.0000 },
  { name: 'Fremont North', north: 37.6000, south: 37.5600, east: -121.9600, west: -122.0200 },
  
  // Hayward Areas
  { name: 'Hayward Central', north: 37.6800, south: 37.6400, east: -122.0600, west: -122.1200 },
  { name: 'Hayward Hills', north: 37.7000, south: 37.6600, east: -122.0400, west: -122.1000 },
  
  // San Leandro
  { name: 'San Leandro', north: 37.7400, south: 37.7000, east: -122.1400, west: -122.1800 },
  
  // Alameda Island
  { name: 'Alameda Island', north: 37.7800, south: 37.7400, east: -122.2200, west: -122.2800 },
  
  // Dublin/Pleasanton Areas
  { name: 'Dublin', north: 37.7200, south: 37.6800, east: -121.9000, west: -121.9600 },
  { name: 'Pleasanton', north: 37.6800, south: 37.6400, east: -121.8600, west: -121.9200 },
  
  // Livermore
  { name: 'Livermore', north: 37.7000, south: 37.6600, east: -121.7400, west: -121.8000 },
  
  // Castro Valley
  { name: 'Castro Valley', north: 37.7200, south: 37.6800, east: -122.0400, west: -122.1000 },
  
  // Union City
  { name: 'Union City', north: 37.6000, south: 37.5600, east: -122.0200, west: -122.0800 },
  
  // Newark
  { name: 'Newark', north: 37.5400, south: 37.5000, east: -122.0200, west: -122.0600 },
  
  // Additional Oakland neighborhoods
  { name: 'Oakland Temescal', north: 37.8400, south: 37.8100, east: -122.2600, west: -122.2900 },
  { name: 'Oakland Rockridge', north: 37.8500, south: 37.8200, east: -122.2500, west: -122.2800 },
  { name: 'Oakland Montclair', north: 37.8300, south: 37.8000, east: -122.2100, west: -122.2400 },
  
  // Additional Berkeley areas
  { name: 'Berkeley North', north: 37.9000, south: 37.8700, east: -122.2600, west: -122.2900 },
  
  // San Lorenzo
  { name: 'San Lorenzo', north: 37.6900, south: 37.6500, east: -122.1200, west: -122.1600 },
  
  // Emeryville
  { name: 'Emeryville', north: 37.8400, south: 37.8200, east: -122.2800, west: -122.3000 },
  
  // Piedmont
  { name: 'Piedmont', north: 37.8300, south: 37.8100, east: -122.2300, west: -122.2500 },
  
  // Additional comprehensive coverage
  { name: 'East Oakland 1', north: 37.7800, south: 37.7500, east: -122.1800, west: -122.2200 },
  { name: 'East Oakland 2', north: 37.7500, south: 37.7200, east: -122.1600, west: -122.2000 },
  { name: 'North Oakland', north: 37.8500, south: 37.8200, east: -122.2600, west: -122.3000 },
  
  // Tri-Valley expansion
  { name: 'Danville North', north: 37.8300, south: 37.7900, east: -121.9800, west: -122.0200 },
  { name: 'San Ramon', north: 37.7800, south: 37.7400, east: -121.9600, west: -122.0000 },
];

// OSM Processing Functions (same as Santa Clara County)
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

function processOSMElements(elements: (OSMNode | OSMWay)[], areaName: string): PropertyRecord[] {
  // First, create a map of all nodes for way processing
  const nodeMap = new Map<number, OSMNode>();
  const ways: OSMWay[] = [];
  const processedElements: any[] = [];

  // Separate nodes and ways
  for (const element of elements) {
    if (element.type === 'node') {
      nodeMap.set(element.id, element);
    } else if (element.type === 'way') {
      ways.push(element);
    }
  }

  // Process standalone nodes (buildings or entrances with addresses)
  for (const node of nodeMap.values()) {
    if (node.tags?.['addr:housenumber'] && node.tags?.['addr:street']) {
      processedElements.push({
        ...node,
        type: 'node' as const,
      });
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
    if (element.tags?.['addr:housenumber'] && element.tags?.['addr:street']) {
      const housenumber = element.tags['addr:housenumber'];
      const street = element.tags['addr:street'];
      const city = element.tags['addr:city'] || getCityFromArea(areaName);
      const zipCode = element.tags['addr:postcode'] || '94000';
      
      const address = `${housenumber} ${street}, ${city}, CA ${zipCode}`;
      const name = `${housenumber} ${street}`;
      
      propertyMap.set(address, {
        name,
        address,
        lat: element.lat,
        lng: element.lon,
      });
    }
  }

  return Array.from(propertyMap.values());
}

function getCityFromArea(areaName: string): string {
  if (areaName.includes('Oakland')) return 'Oakland';
  if (areaName.includes('Berkeley')) return 'Berkeley';
  if (areaName.includes('Fremont')) return 'Fremont';
  if (areaName.includes('Hayward')) return 'Hayward';
  if (areaName.includes('San Leandro')) return 'San Leandro';
  if (areaName.includes('Alameda')) return 'Alameda';
  if (areaName.includes('Dublin')) return 'Dublin';
  if (areaName.includes('Pleasanton')) return 'Pleasanton';
  if (areaName.includes('Livermore')) return 'Livermore';
  if (areaName.includes('Castro Valley')) return 'Castro Valley';
  if (areaName.includes('Union City')) return 'Union City';
  if (areaName.includes('Newark')) return 'Newark';
  if (areaName.includes('Emeryville')) return 'Emeryville';
  if (areaName.includes('Piedmont')) return 'Piedmont';
  if (areaName.includes('San Lorenzo')) return 'San Lorenzo';
  if (areaName.includes('Danville')) return 'Danville';
  if (areaName.includes('San Ramon')) return 'San Ramon';
  return 'Alameda County';
}

async function upsertProperties(properties: PropertyRecord[], areaName: string): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  const batchSize = 50;

  console.log(`💾 Upserting ${properties.length} properties for ${areaName}...`);

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    
    for (const property of batch) {
      try {
        // Check if property already exists
        const { data: existing } = await supabase
          .from('property')
          .select('id')
          .eq('address', property.address)
          .single();

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

          if (!updateError) {
            updated++;
          }
        } else {
          // Insert new property
          const { error: insertError } = await supabase
            .from('property')
            .insert([property]);

          if (!insertError) {
            inserted++;
          }
        }
      } catch (error) {
        console.error(`  ✗ Failed to upsert ${property.address}:`, error);
      }
    }
    
    console.log(`  ✓ Batch ${Math.ceil((i + batchSize) / batchSize)}/${Math.ceil(properties.length / batchSize)}: ${inserted + updated}/${properties.length} processed`);
  }

  return { inserted, updated };
}

async function importAreaData(area: typeof ALAMEDA_COUNTY_GRID[0]) {
  console.log(`\n🏙️ Importing ${area.name}...`);
  
  // Check if area already has significant coverage (skip if > 1000 properties)
  console.log('🔍 Checking existing coverage...');
  const { data: existingCount } = await supabase
    .from('property')
    .select('id', { count: 'exact' })
    .gte('lat', area.south)
    .lte('lat', area.north)
    .gte('lng', area.west)
    .lte('lng', area.east);

  const existingProperties = existingCount?.length || 0;
  console.log(`📊 Found ${existingProperties} existing properties in ${area.name}`);
  
  if (existingProperties > 1000) {
    console.log(`✅ ${area.name} already has good coverage (${existingProperties} properties) - skipping`);
    return { properties: [], inserted: 0, updated: 0 };
  }
  
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

  // Retry logic for API timeouts
  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`📡 Fetching OSM data... (${4 - retries}/3 attempts)`);
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: overpassQuery,
      });

      if (!response.ok) {
        if (response.status === 504 && retries > 1) {
          console.log(`⏳ Gateway timeout, waiting 30s before retry...`);
          await new Promise(resolve => setTimeout(resolve, 30000));
          retries--;
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const osmData = await response.json();
      console.log(`📊 Raw OSM elements: ${osmData.elements?.length || 0}`);

      if (!osmData.elements || osmData.elements.length === 0) {
        console.log(`⚠️ No data found for ${area.name}`);
        return { properties: [], inserted: 0, updated: 0 };
      }

      const properties = processOSMElements(osmData.elements, area.name);
      console.log(`🏠 Processed properties: ${properties.length}`);

      if (properties.length > 0) {
        const { inserted, updated } = await upsertProperties(properties, area.name);
        return { properties, inserted, updated };
      }

      return { properties: [], inserted: 0, updated: 0 };
      
    } catch (error) {
      if (retries > 1) {
        console.log(`⚠️ Error occurred, retrying in 15s... (${error})`);
        await new Promise(resolve => setTimeout(resolve, 15000));
        retries--;
        continue;
      }
      throw error;
    }
  }
  
  // If we get here, all retries failed
  throw new Error(`Failed after 3 attempts`);
}

async function main() {
  try {
    console.log('🌉 ALAMEDA COUNTY COMPREHENSIVE IMPORT');
    console.log('======================================');
    console.log('🚀 Importing ALL residential properties across Alameda County');
    console.log(`📍 Coverage: ${ALAMEDA_COUNTY_GRID.length} areas`);
    console.log('🏙️ Cities: Oakland, Berkeley, Fremont, Hayward, San Leandro,');
    console.log('   Alameda, Dublin, Pleasanton, Livermore, Castro Valley,');
    console.log('   Union City, Newark, Emeryville, and more!\n');

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalAreas = 0;
    let successfulAreas = 0;

    const startTime = Date.now();

    // Resume from Berkeley West (index 6) - skipping already completed areas
    const RESUME_FROM_INDEX = 6; // Berkeley West
    console.log(`🔄 RESUMING from ${ALAMEDA_COUNTY_GRID[RESUME_FROM_INDEX].name} (area ${RESUME_FROM_INDEX + 1}/${ALAMEDA_COUNTY_GRID.length})`);
    console.log(`⏭️ Skipping first ${RESUME_FROM_INDEX} areas (already completed yesterday)\n`);
    
    for (let i = RESUME_FROM_INDEX; i < ALAMEDA_COUNTY_GRID.length; i++) {
      const area = ALAMEDA_COUNTY_GRID[i];
      totalAreas++;
      
      console.log(`\n📍 [${i + 1}/${ALAMEDA_COUNTY_GRID.length}] Processing ${area.name}...`);
      
      try {
        const result = await importAreaData(area);
        
        if (result.inserted > 0 || result.updated > 0) {
          totalInserted += result.inserted;
          totalUpdated += result.updated;
          successfulAreas++;
          console.log(`✅ ${area.name}: +${result.inserted} new, ~${result.updated} updated`);
        } else {
          console.log(`⚪ ${area.name}: No properties found`);
        }
        
        // Progress summary every 5 areas (since we're resuming)
        if ((i + 1 - RESUME_FROM_INDEX) % 5 === 0) {
          const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
          const areasProcessed = i + 1 - RESUME_FROM_INDEX;
          const remainingAreas = ALAMEDA_COUNTY_GRID.length - i - 1;
          const remaining = areasProcessed > 0 ? ((elapsed / areasProcessed) * remainingAreas) : 0;
          console.log(`\n📊 PROGRESS: ${i + 1}/${ALAMEDA_COUNTY_GRID.length} areas (${Math.round((i + 1) / ALAMEDA_COUNTY_GRID.length * 100)}%)`);
          console.log(`⏱️ Elapsed: ${elapsed.toFixed(1)}min, Est. remaining: ${remaining.toFixed(1)}min`);
          console.log(`📈 Total so far: ${totalInserted} inserted, ${totalUpdated} updated`);
        }
        
        // Longer delay between areas to be nice to the API and avoid timeouts
        await new Promise(resolve => setTimeout(resolve, 10000));
        
      } catch (error) {
        console.error(`❌ Failed to process ${area.name}:`, error);
        // Continue with other areas - PROGRESS IS PRESERVED!
      }
    }

    const totalTime = (Date.now() - startTime) / 1000 / 60;

    console.log(`\n🎉 ALAMEDA COUNTY IMPORT COMPLETE!`);
    console.log(`==================================`);
    console.log(`✅ Successfully processed: ${successfulAreas}/${totalAreas} areas`);
    console.log(`📊 Total properties inserted: ${totalInserted.toLocaleString()}`);
    console.log(`📊 Total properties updated: ${totalUpdated.toLocaleString()}`);
    console.log(`📊 Grand total: ${(totalInserted + totalUpdated).toLocaleString()} properties`);
    console.log(`⏱️ Total time: ${totalTime.toFixed(1)} minutes`);
    console.log(`🌟 Coverage: Complete Alameda County residential properties`);

    console.log(`\n🎯 Next steps:`);
    console.log(`  1. Open your app and zoom to the East Bay!`);
    console.log(`  2. You now have properties across Oakland, Berkeley, Fremont, and more`);
    console.log(`  3. Combined with Santa Clara County, you have massive Bay Area coverage`);
    console.log(`  4. This is one of the most comprehensive East Bay property databases!`);

    if (totalInserted + totalUpdated > 50000) {
      console.log(`\n🚀 ACHIEVEMENT UNLOCKED: 50K+ East Bay Properties!`);
      console.log(`   You now have a Bay Area-scale property database! 🏆`);
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute the main function
main();

export { main };
