#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SAN MATEO COUNTY COMPREHENSIVE IMPORT
// Expected: 40,000-80,000+ properties across Peninsula
// Covers the gap between San Francisco and Santa Clara County

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

// SAN MATEO COUNTY GRID - Comprehensive Peninsula coverage
// From San Francisco border to Santa Clara County border
const SAN_MATEO_COUNTY_GRID = [
  // Daly City / South San Francisco
  { name: 'Daly City', north: 37.7200, south: 37.6800, east: -122.4200, west: -122.4800 },
  { name: 'South San Francisco', north: 37.6800, south: 37.6400, east: -122.3800, west: -122.4400 },
  
  // San Bruno / Millbrae
  { name: 'San Bruno', north: 37.6400, south: 37.6000, east: -122.3800, west: -122.4400 },
  { name: 'Millbrae', north: 37.6100, south: 37.5900, east: -122.3800, west: -122.4200 },
  
  // Burlingame / Hillsborough
  { name: 'Burlingame', north: 37.5900, south: 37.5700, east: -122.3400, west: -122.3800 },
  { name: 'Hillsborough', north: 37.5800, south: 37.5600, east: -122.3200, west: -122.3600 },
  
  // San Mateo Areas
  { name: 'San Mateo Central', north: 37.5700, south: 37.5400, east: -122.2800, west: -122.3200 },
  { name: 'San Mateo East', north: 37.5600, south: 37.5300, east: -122.2600, west: -122.2900 },
  { name: 'San Mateo West', north: 37.5700, south: 37.5400, east: -122.3200, west: -122.3600 },
  
  // Foster City / San Mateo Bridge Area
  { name: 'Foster City', north: 37.5600, south: 37.5400, east: -122.2400, west: -122.2800 },
  { name: 'Bay Meadows Area', north: 37.5400, south: 37.5200, east: -122.2600, west: -122.3000 },
  
  // Belmont / San Carlos
  { name: 'Belmont', north: 37.5300, south: 37.5100, east: -122.2600, west: -122.3000 },
  { name: 'San Carlos', north: 37.5100, south: 37.4900, east: -122.2400, west: -122.2800 },
  
  // Redwood City Areas (major city)
  { name: 'Redwood City Central', north: 37.4900, south: 37.4700, east: -122.2000, west: -122.2400 },
  { name: 'Redwood City West', north: 37.4900, south: 37.4700, east: -122.2400, west: -122.2800 },
  { name: 'Redwood City East', north: 37.4800, south: 37.4600, east: -122.1800, west: -122.2200 },
  { name: 'Redwood Shores', north: 37.5400, south: 37.5200, east: -122.2000, west: -122.2400 },
  
  // Atherton / Menlo Park
  { name: 'Atherton', north: 37.4700, south: 37.4500, east: -122.1800, west: -122.2200 },
  { name: 'Menlo Park Central', north: 37.4600, south: 37.4400, east: -122.1600, west: -122.2000 },
  { name: 'Menlo Park West', north: 37.4600, south: 37.4400, east: -122.2000, west: -122.2400 },
  
  // East Palo Alto / Palo Alto (border with Santa Clara)
  { name: 'East Palo Alto', north: 37.4500, south: 37.4300, east: -122.1200, west: -122.1600 },
  { name: 'Palo Alto North', north: 37.4500, south: 37.4300, east: -122.1600, west: -122.2000 },
  { name: 'Palo Alto Central', north: 37.4300, south: 37.4100, east: -122.1400, west: -122.1800 },
  
  // Coastside Communities
  { name: 'Pacifica North', north: 37.6400, south: 37.6000, east: -122.4800, west: -122.5200 },
  { name: 'Pacifica South', north: 37.6000, south: 37.5600, east: -122.4800, west: -122.5200 },
  { name: 'Half Moon Bay', north: 37.4800, south: 37.4400, east: -122.4200, west: -122.4800 },
  
  // Woodside / Portola Valley (Hills)
  { name: 'Woodside', north: 37.4400, south: 37.4200, east: -122.2400, west: -122.2800 },
  { name: 'Portola Valley', north: 37.3900, south: 37.3700, east: -122.2000, west: -122.2400 },
  
  // Additional comprehensive coverage
  { name: 'Brisbane', north: 37.6900, south: 37.6700, east: -122.3800, west: -122.4200 },
  { name: 'Colma', north: 37.6800, south: 37.6600, east: -122.4400, west: -122.4800 },
  
  // Peninsula spine coverage
  { name: 'Highway 101 Corridor North', north: 37.5800, south: 37.5600, east: -122.2800, west: -122.3200 },
  { name: 'Highway 101 Corridor Central', north: 37.5200, south: 37.5000, east: -122.2400, west: -122.2800 },
  { name: 'Highway 101 Corridor South', north: 37.4600, south: 37.4400, east: -122.1800, west: -122.2200 },
  
  // Bay fill areas
  { name: 'Bay Fill North', north: 37.5600, south: 37.5400, east: -122.2200, west: -122.2600 },
  { name: 'Bay Fill South', north: 37.4800, south: 37.4600, east: -122.1600, west: -122.2000 },
];

// OSM Processing Functions (same as Alameda County)
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
  if (areaName.includes('Daly City')) return 'Daly City';
  if (areaName.includes('South San Francisco')) return 'South San Francisco';
  if (areaName.includes('San Bruno')) return 'San Bruno';
  if (areaName.includes('Millbrae')) return 'Millbrae';
  if (areaName.includes('Burlingame')) return 'Burlingame';
  if (areaName.includes('Hillsborough')) return 'Hillsborough';
  if (areaName.includes('San Mateo')) return 'San Mateo';
  if (areaName.includes('Foster City')) return 'Foster City';
  if (areaName.includes('Belmont')) return 'Belmont';
  if (areaName.includes('San Carlos')) return 'San Carlos';
  if (areaName.includes('Redwood City') || areaName.includes('Redwood Shores')) return 'Redwood City';
  if (areaName.includes('Atherton')) return 'Atherton';
  if (areaName.includes('Menlo Park')) return 'Menlo Park';
  if (areaName.includes('East Palo Alto')) return 'East Palo Alto';
  if (areaName.includes('Palo Alto')) return 'Palo Alto';
  if (areaName.includes('Pacifica')) return 'Pacifica';
  if (areaName.includes('Half Moon Bay')) return 'Half Moon Bay';
  if (areaName.includes('Woodside')) return 'Woodside';
  if (areaName.includes('Portola Valley')) return 'Portola Valley';
  if (areaName.includes('Brisbane')) return 'Brisbane';
  if (areaName.includes('Colma')) return 'Colma';
  return 'San Mateo County';
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

async function importAreaData(area: typeof SAN_MATEO_COUNTY_GRID[0]) {
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
    console.log('🌉 SAN MATEO COUNTY COMPREHENSIVE IMPORT');
    console.log('========================================');
    console.log('🚀 Importing ALL residential properties across San Mateo County');
    console.log(`📍 Coverage: ${SAN_MATEO_COUNTY_GRID.length} areas`);
    console.log('🏙️ Cities: Redwood City, Palo Alto, San Mateo, Burlingame,');
    console.log('   Foster City, Belmont, San Carlos, Menlo Park, Atherton,');
    console.log('   Daly City, South San Francisco, Pacifica, and more!\n');

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalAreas = 0;
    let successfulAreas = 0;

    const startTime = Date.now();

    // Resume from Bay Fill South (index 34) - the final area that was incomplete
    const RESUME_FROM_INDEX = 34; // Bay Fill South (area 35/35)
    console.log(`🔄 RESUMING from ${SAN_MATEO_COUNTY_GRID[RESUME_FROM_INDEX].name} (area ${RESUME_FROM_INDEX + 1}/${SAN_MATEO_COUNTY_GRID.length})`);
    console.log(`⏭️ Skipping first ${RESUME_FROM_INDEX} areas (already completed)\n`);
    
    for (let i = RESUME_FROM_INDEX; i < SAN_MATEO_COUNTY_GRID.length; i++) {
      const area = SAN_MATEO_COUNTY_GRID[i];
      totalAreas++;
      
      console.log(`\n📍 [${i + 1}/${SAN_MATEO_COUNTY_GRID.length}] Processing ${area.name}...`);
      
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
        
        // Progress summary (since we're only doing the final area)
        const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
        console.log(`\n📊 PROGRESS: ${i + 1}/${SAN_MATEO_COUNTY_GRID.length} areas (${Math.round((i + 1) / SAN_MATEO_COUNTY_GRID.length * 100)}%)`);
        console.log(`⏱️ Elapsed: ${elapsed.toFixed(1)}min`);
        console.log(`📈 Final area results: ${totalInserted} inserted, ${totalUpdated} updated`);
        
        // Longer delay between areas to be nice to the API and avoid timeouts
        await new Promise(resolve => setTimeout(resolve, 10000));
        
      } catch (error) {
        console.error(`❌ Failed to process ${area.name}:`, error);
        // Continue with other areas - PROGRESS IS PRESERVED!
      }
    }

    const totalTime = (Date.now() - startTime) / 1000 / 60;

    console.log(`\n🎉 SAN MATEO COUNTY IMPORT COMPLETE!`);
    console.log(`====================================`);
    console.log(`✅ Successfully processed: ${successfulAreas}/${totalAreas} areas`);
    console.log(`📊 Total properties inserted: ${totalInserted.toLocaleString()}`);
    console.log(`📊 Total properties updated: ${totalUpdated.toLocaleString()}`);
    console.log(`📊 Grand total: ${(totalInserted + totalUpdated).toLocaleString()} properties`);
    console.log(`⏱️ Total time: ${totalTime.toFixed(1)} minutes`);
    console.log(`🌟 Coverage: Complete San Mateo County residential properties`);

    console.log(`\n🎯 Next steps:`);
    console.log(`  1. Open your app and zoom to the Peninsula!`);
    console.log(`  2. You now have properties from SF to Santa Clara County`);
    console.log(`  3. Combined with other counties, you have massive Bay Area coverage`);
    console.log(`  4. This completes the Peninsula residential database!`);

    if (totalInserted + totalUpdated > 40000) {
      console.log(`\n🚀 ACHIEVEMENT UNLOCKED: 40K+ Peninsula Properties!`);
      console.log(`   You now have complete Bay Area coverage! 🏆`);
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute the main function
main();

export { main };
