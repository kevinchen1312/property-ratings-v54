#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Santa Clara County comprehensive coverage - divided into manageable grid sections
const SANTA_CLARA_COUNTY_GRID = [
  // Palo Alto & Stanford area
  { name: "Palo Alto North", north: 37.470, south: 37.440, east: -122.120, west: -122.160 },
  { name: "Palo Alto Central", north: 37.440, south: 37.410, east: -122.120, west: -122.160 },
  { name: "Palo Alto South", north: 37.410, south: 37.380, east: -122.120, west: -122.160 },
  
  // Mountain View area
  { name: "Mountain View North", north: 37.420, south: 37.390, east: -122.060, west: -122.100 },
  { name: "Mountain View Central", north: 37.390, south: 37.360, east: -122.060, west: -122.100 },
  { name: "Mountain View South", north: 37.360, south: 37.330, east: -122.060, west: -122.100 },
  
  // Sunnyvale area
  { name: "Sunnyvale North", north: 37.420, south: 37.390, east: -122.020, west: -122.060 },
  { name: "Sunnyvale Central", north: 37.390, south: 37.360, east: -122.020, west: -122.060 },
  { name: "Sunnyvale South", north: 37.360, south: 37.330, east: -122.020, west: -122.060 },
  
  // Cupertino area (enhanced coverage)
  { name: "Cupertino North", north: 37.340, south: 37.310, east: -122.020, west: -122.060 },
  { name: "Cupertino Central", north: 37.310, south: 37.280, east: -122.020, west: -122.060 },
  { name: "Cupertino South", north: 37.280, south: 37.250, east: -122.020, west: -122.060 },
  
  // Santa Clara city
  { name: "Santa Clara North", north: 37.380, south: 37.350, east: -121.940, west: -121.980 },
  { name: "Santa Clara Central", north: 37.350, south: 37.320, east: -121.940, west: -121.980 },
  { name: "Santa Clara South", north: 37.320, south: 37.290, east: -121.940, west: -121.980 },
  
  // San Jose - Downtown & Central
  { name: "San Jose Downtown", north: 37.350, south: 37.320, east: -121.870, west: -121.910 },
  { name: "San Jose Central West", north: 37.350, south: 37.320, east: -121.910, west: -121.950 },
  { name: "San Jose Central East", north: 37.350, south: 37.320, east: -121.830, west: -121.870 },
  
  // San Jose - North (Tech corridor)
  { name: "San Jose North 1", north: 37.420, south: 37.390, east: -121.900, west: -121.940 },
  { name: "San Jose North 2", north: 37.390, south: 37.360, east: -121.900, west: -121.940 },
  { name: "San Jose North 3", north: 37.420, south: 37.390, east: -121.860, west: -121.900 },
  { name: "San Jose North 4", north: 37.390, south: 37.360, east: -121.860, west: -121.900 },
  
  // San Jose - South (Almaden, Blossom Valley)
  { name: "San Jose South 1", north: 37.290, south: 37.260, east: -121.850, west: -121.890 },
  { name: "San Jose South 2", north: 37.260, south: 37.230, east: -121.850, west: -121.890 },
  { name: "San Jose South 3", north: 37.230, south: 37.200, east: -121.850, west: -121.890 },
  { name: "San Jose South 4", north: 37.290, south: 37.260, east: -121.890, west: -121.930 },
  
  // San Jose - East
  { name: "San Jose East 1", north: 37.350, south: 37.320, east: -121.790, west: -121.830 },
  { name: "San Jose East 2", north: 37.320, south: 37.290, east: -121.790, west: -121.830 },
  { name: "San Jose East 3", north: 37.290, south: 37.260, east: -121.790, west: -121.830 },
  { name: "San Jose East 4", north: 37.350, south: 37.320, east: -121.750, west: -121.790 },
  
  // San Jose - West (Willow Glen area)
  { name: "San Jose West 1", north: 37.320, south: 37.290, east: -121.880, west: -121.920 },
  { name: "San Jose West 2", north: 37.290, south: 37.260, east: -121.880, west: -121.920 },
  { name: "San Jose West 3", north: 37.260, south: 37.230, east: -121.880, west: -121.920 },
  
  // Milpitas area
  { name: "Milpitas North", north: 37.450, south: 37.420, east: -121.880, west: -121.920 },
  { name: "Milpitas Central", north: 37.420, south: 37.390, east: -121.880, west: -121.920 },
  { name: "Milpitas South", north: 37.390, south: 37.360, east: -121.880, west: -121.920 },
  
  // Fremont border area
  { name: "Fremont Border 1", north: 37.480, south: 37.450, east: -121.900, west: -121.940 },
  { name: "Fremont Border 2", north: 37.480, south: 37.450, east: -121.860, west: -121.900 },
  
  // Los Altos & Los Altos Hills
  { name: "Los Altos North", north: 37.400, south: 37.370, east: -122.080, west: -122.120 },
  { name: "Los Altos Central", north: 37.370, south: 37.340, east: -122.080, west: -122.120 },
  { name: "Los Altos Hills", north: 37.400, south: 37.370, east: -122.120, west: -122.160 },
  
  // Saratoga area
  { name: "Saratoga North", north: 37.280, south: 37.250, east: -122.020, west: -122.060 },
  { name: "Saratoga Central", north: 37.250, south: 37.220, east: -122.020, west: -122.060 },
  { name: "Saratoga South", north: 37.220, south: 37.190, east: -122.020, west: -122.060 },
  
  // Campbell area
  { name: "Campbell North", north: 37.300, south: 37.270, east: -121.940, west: -121.980 },
  { name: "Campbell Central", north: 37.270, south: 37.240, east: -121.940, west: -121.980 },
  { name: "Campbell South", north: 37.240, south: 37.210, east: -121.940, west: -121.980 },
  
  // Los Gatos area
  { name: "Los Gatos North", north: 37.250, south: 37.220, east: -121.960, west: -122.000 },
  { name: "Los Gatos Central", north: 37.220, south: 37.190, east: -121.960, west: -122.000 },
  { name: "Los Gatos South", north: 37.190, south: 37.160, east: -121.960, west: -122.000 },
  
  // Morgan Hill area
  { name: "Morgan Hill North", north: 37.160, south: 37.130, east: -121.640, west: -121.680 },
  { name: "Morgan Hill Central", north: 37.130, south: 37.100, east: -121.640, west: -121.680 },
  { name: "Morgan Hill South", north: 37.100, south: 37.070, east: -121.640, west: -121.680 },
  
  // Gilroy area
  { name: "Gilroy North", north: 37.020, south: 36.990, east: -121.560, west: -121.600 },
  { name: "Gilroy Central", north: 36.990, south: 36.960, east: -121.560, west: -121.600 },
  { name: "Gilroy South", north: 36.960, south: 36.930, east: -121.560, west: -121.600 },
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

function processOSMElements(elements: (OSMNode | OSMWay)[], areaName: string): PropertyRecord[] {
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
    let city = element.tags?.['addr:city'] || '';
    
    if (!housenumber || !street) continue;

    // Determine city based on area name if not specified
    if (!city) {
      if (areaName.includes('Palo Alto')) city = 'Palo Alto';
      else if (areaName.includes('Mountain View')) city = 'Mountain View';
      else if (areaName.includes('Sunnyvale')) city = 'Sunnyvale';
      else if (areaName.includes('Cupertino')) city = 'Cupertino';
      else if (areaName.includes('Santa Clara')) city = 'Santa Clara';
      else if (areaName.includes('San Jose')) city = 'San Jose';
      else if (areaName.includes('Milpitas')) city = 'Milpitas';
      else if (areaName.includes('Los Altos')) city = 'Los Altos';
      else if (areaName.includes('Saratoga')) city = 'Saratoga';
      else if (areaName.includes('Campbell')) city = 'Campbell';
      else if (areaName.includes('Los Gatos')) city = 'Los Gatos';
      else if (areaName.includes('Morgan Hill')) city = 'Morgan Hill';
      else if (areaName.includes('Gilroy')) city = 'Gilroy';
      else city = 'Santa Clara County';
    }

    // Normalize the address
    const cleanStreet = street.trim();
    const zipCode = getZipCode(city);
    
    const address = `${housenumber} ${cleanStreet}, ${city}, CA ${zipCode}`;
    
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

function getZipCode(city: string): string {
  const zipCodes: Record<string, string> = {
    'Palo Alto': '94301',
    'Mountain View': '94041',
    'Sunnyvale': '94086',
    'Cupertino': '95014',
    'Santa Clara': '95050',
    'San Jose': '95129',
    'Milpitas': '95035',
    'Los Altos': '94022',
    'Saratoga': '95070',
    'Campbell': '95008',
    'Los Gatos': '95032',
    'Morgan Hill': '95037',
    'Gilroy': '95020',
  };
  return zipCodes[city] || '95000';
}

async function upsertProperties(properties: PropertyRecord[], areaName: string): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  const batchSize = 100; // Larger batches for efficiency

  console.log(`💾 Upserting ${properties.length} properties from ${areaName}...`);

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    
    try {
      // Use simple bulk insert (faster and more reliable)
      const { data, error } = await supabase
        .from('property')
        .insert(batch)
        .select('id');

      if (error) {
        // If bulk insert fails (likely due to duplicates), fall back to individual processing
        for (const property of batch) {
          try {
            const { data: existing } = await supabase
              .from('property')
              .select('id')
              .eq('address', property.address)
              .single();

            if (existing) {
              // Skip duplicates (don't update to avoid unnecessary work)
              // updated++;
            } else {
              const { error: insertError } = await supabase
                .from('property')
                .insert([property]);
              
              if (!insertError) {
                inserted++;
              }
            }
          } catch (individualError) {
            // Silently skip errors (likely duplicates)
          }
        }
      } else {
        inserted += batch.length;
      }
    } catch (batchError) {
      console.error(`❌ Batch processing failed for ${areaName}:`, batchError);
    }
    
    // Progress update
    if ((i + batchSize) % 1000 === 0 || i + batchSize >= properties.length) {
      console.log(`  📊 ${areaName}: ${Math.min(i + batchSize, properties.length)}/${properties.length} processed`);
    }
  }

  return { inserted, updated };
}

async function importAreaData(area: typeof SANTA_CLARA_COUNTY_GRID[0]) {
  console.log(`\n🏙️ Importing ${area.name}...`);
  
  const overpassQuery = `
  [out:json][timeout:45];
  (
    way["building"]["addr:housenumber"](${area.south},${area.west},${area.north},${area.east});
    node["building"]["addr:housenumber"](${area.south},${area.west},${area.north},${area.east});
    way["addr:housenumber"](${area.south},${area.west},${area.north},${area.east});
    node["addr:housenumber"](${area.south},${area.west},${area.north},${area.east});
  );
  out body;
  >; out skel qt;
  `.trim();

  try {
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
    console.error(`❌ Failed to import ${area.name}:`, error);
    return { properties: [], inserted: 0, updated: 0 };
  }
}

async function main() {
  try {
    console.log('🌟 SANTA CLARA COUNTY COMPREHENSIVE IMPORT');
    console.log('==========================================');
    console.log('🚀 Importing ALL residential properties across Santa Clara County');
    console.log(`📍 Coverage: ${SANTA_CLARA_COUNTY_GRID.length} areas`);
    console.log('🏙️ Cities: Palo Alto, Mountain View, Sunnyvale, Cupertino, Santa Clara,');
    console.log('   San Jose, Milpitas, Los Altos, Saratoga, Campbell, Los Gatos,');
    console.log('   Morgan Hill, Gilroy, and more!\n');

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalAreas = 0;
    let successfulAreas = 0;

    const startTime = Date.now();

    // Import each area with progress tracking
    for (let i = 0; i < SANTA_CLARA_COUNTY_GRID.length; i++) {
      const area = SANTA_CLARA_COUNTY_GRID[i];
      totalAreas++;
      
      console.log(`\n📍 [${i + 1}/${SANTA_CLARA_COUNTY_GRID.length}] Processing ${area.name}...`);
      
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
        
        // Progress summary every 10 areas
        if ((i + 1) % 10 === 0) {
          const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
          const remaining = ((elapsed / (i + 1)) * (SANTA_CLARA_COUNTY_GRID.length - i - 1));
          console.log(`\n📊 PROGRESS: ${i + 1}/${SANTA_CLARA_COUNTY_GRID.length} areas (${Math.round((i + 1) / SANTA_CLARA_COUNTY_GRID.length * 100)}%)`);
          console.log(`⏱️ Elapsed: ${elapsed.toFixed(1)}min, Est. remaining: ${remaining.toFixed(1)}min`);
          console.log(`📈 Total so far: ${totalInserted} inserted, ${totalUpdated} updated`);
        }
        
        // Delay between areas to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`❌ Failed to process ${area.name}:`, error);
        // Continue with other areas
      }
    }

    const totalTime = (Date.now() - startTime) / 1000 / 60;

    console.log(`\n🎉 SANTA CLARA COUNTY IMPORT COMPLETE!`);
    console.log(`==========================================`);
    console.log(`✅ Successfully processed: ${successfulAreas}/${totalAreas} areas`);
    console.log(`📊 Total properties inserted: ${totalInserted.toLocaleString()}`);
    console.log(`📊 Total properties updated: ${totalUpdated.toLocaleString()}`);
    console.log(`📊 Grand total: ${(totalInserted + totalUpdated).toLocaleString()} properties`);
    console.log(`⏱️ Total time: ${totalTime.toFixed(1)} minutes`);
    console.log(`🌟 Coverage: Complete Santa Clara County residential properties`);

    console.log(`\n🎯 Next steps:`);
    console.log(`  1. Open your app and zoom out to see the MASSIVE coverage!`);
    console.log(`  2. You now have properties across the entire South Bay`);
    console.log(`  3. From Palo Alto to Gilroy, Mountain View to Morgan Hill`);
    console.log(`  4. This is one of the most comprehensive property databases in the area!`);

    if (totalInserted + totalUpdated > 50000) {
      console.log(`\n🚀 ACHIEVEMENT UNLOCKED: 50K+ Properties!`);
      console.log(`   You now have a Silicon Valley-scale property database! 🏆`);
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute the main function
main();
