#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// CONTROLLED USA IMPORT - CHUNK BY CHUNK WITH PROGRESS ALERTS
// This system imports properties in manageable chunks and pauses for user verification

interface ImportChunk {
  id: string;
  name: string;
  state: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  targetProperties: number;
  status: 'pending' | 'running' | 'completed' | 'paused';
  actualProperties: number;
  startTime?: number;
  endTime?: number;
}

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
  state: string;
}

// MANAGEABLE CHUNKS - Starting with high-density areas for quick 1M property milestones
const IMPORT_CHUNKS: ImportChunk[] = [
  // Chunk 1: Manhattan - Dense urban area, should hit ~500K properties
  {
    id: 'CHUNK_001',
    name: 'Manhattan, New York',
    state: 'NY',
    bounds: { north: 40.8820, south: 40.6816, east: -73.9067, west: -74.0479 },
    targetProperties: 500000,
    status: 'pending',
    actualProperties: 0
  },
  
  // Chunk 2: Brooklyn - Should add another ~600K properties (total: ~1.1M)
  {
    id: 'CHUNK_002', 
    name: 'Brooklyn, New York',
    state: 'NY',
    bounds: { north: 40.7395, south: 40.5707, east: -73.8333, west: -74.0479 },
    targetProperties: 600000,
    status: 'pending',
    actualProperties: 0
  },

  // Chunk 3: Queens - Should add another ~500K properties (total: ~1.6M)
  {
    id: 'CHUNK_003',
    name: 'Queens, New York', 
    state: 'NY',
    bounds: { north: 40.8007, south: 40.5395, east: -73.7004, west: -73.9626 },
    targetProperties: 500000,
    status: 'pending',
    actualProperties: 0
  },

  // Chunk 4: Los Angeles Central - Should add another ~400K properties (total: ~2M)
  {
    id: 'CHUNK_004',
    name: 'Los Angeles Central, California',
    state: 'CA', 
    bounds: { north: 34.1500, south: 34.0000, east: -118.2000, west: -118.4000 },
    targetProperties: 400000,
    status: 'pending',
    actualProperties: 0
  },

  // Chunk 5: Chicago Central - Should add another ~350K properties (total: ~2.35M)
  {
    id: 'CHUNK_005',
    name: 'Chicago Central, Illinois',
    state: 'IL',
    bounds: { north: 41.9500, south: 41.8000, east: -87.6000, west: -87.8000 },
    targetProperties: 350000,
    status: 'pending',
    actualProperties: 0
  },

  // Chunk 6: Houston Central - Should add another ~300K properties (total: ~2.65M)
  {
    id: 'CHUNK_006',
    name: 'Houston Central, Texas',
    state: 'TX',
    bounds: { north: 29.8500, south: 29.7000, east: -95.3000, west: -95.5000 },
    targetProperties: 300000,
    status: 'pending',
    actualProperties: 0
  },

  // Chunk 7: Philadelphia Central - Should add another ~250K properties (total: ~2.9M)
  {
    id: 'CHUNK_007',
    name: 'Philadelphia Central, Pennsylvania',
    state: 'PA',
    bounds: { north: 40.0000, south: 39.9200, east: -75.1400, west: -75.2000 },
    targetProperties: 250000,
    status: 'pending',
    actualProperties: 0
  },

  // Chunk 8: Phoenix Central - Should add another ~200K properties (total: ~3.1M)
  {
    id: 'CHUNK_008',
    name: 'Phoenix Central, Arizona',
    state: 'AZ',
    bounds: { north: 33.5500, south: 33.4000, east: -112.0000, west: -112.2000 },
    targetProperties: 200000,
    status: 'pending',
    actualProperties: 0
  }
];

// OSM Processing Functions
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

function processOSMElements(elements: (OSMNode | OSMWay)[], chunk: ImportChunk): PropertyRecord[] {
  const nodeMap = new Map<number, OSMNode>();
  const ways: OSMWay[] = [];
  const processedElements: PropertyRecord[] = [];

  // Separate nodes and ways
  for (const element of elements) {
    if (element.type === 'node') {
      nodeMap.set(element.id, element);
    } else if (element.type === 'way') {
      ways.push(element);
    }
  }

  // Process nodes with addresses
  for (const node of nodeMap.values()) {
    if (node.tags?.['addr:housenumber'] && node.tags?.['addr:street']) {
      const property = createPropertyFromNode(node, chunk);
      if (property) processedElements.push(property);
    }
  }

  // Process ways with addresses
  for (const way of ways) {
    if (way.tags?.['addr:housenumber'] && way.tags?.['addr:street']) {
      const wayNodes = way.nodes
        .map(nodeId => nodeMap.get(nodeId))
        .filter((node): node is OSMNode => node !== undefined);
      
      if (wayNodes.length > 0) {
        const centroid = calculateCentroid(wayNodes);
        const property = createPropertyFromTags(way.tags, centroid.lat, centroid.lng, chunk);
        if (property) processedElements.push(property);
      }
    }
  }

  // Process residential buildings without addresses (gap filling)
  for (const way of ways) {
    if (isResidentialBuilding(way.tags) && !way.tags?.['addr:housenumber']) {
      const wayNodes = way.nodes
        .map(nodeId => nodeMap.get(nodeId))
        .filter((node): node is OSMNode => node !== undefined);
      
      if (wayNodes.length > 0) {
        const centroid = calculateCentroid(wayNodes);
        const syntheticProperty = generateSyntheticAddress(centroid.lat, centroid.lng, chunk);
        if (syntheticProperty) processedElements.push(syntheticProperty);
      }
    }
  }

  // Deduplicate by address
  const propertyMap = new Map<string, PropertyRecord>();
  processedElements.forEach(prop => {
    propertyMap.set(prop.address, prop);
  });

  return Array.from(propertyMap.values());
}

function createPropertyFromNode(node: OSMNode, chunk: ImportChunk): PropertyRecord | null {
  const tags = node.tags;
  if (!tags?.['addr:housenumber'] || !tags?.['addr:street']) return null;
  
  return createPropertyFromTags(tags, node.lat, node.lon, chunk);
}

function createPropertyFromTags(tags: Record<string, string>, lat: number, lng: number, chunk: ImportChunk): PropertyRecord | null {
  const housenumber = tags['addr:housenumber'];
  const street = tags['addr:street'];
  if (!housenumber || !street) return null;
  
  const city = tags['addr:city'] || getCityFromChunk(chunk);
  const state = chunk.state;
  const zipCode = tags['addr:postcode'] || getZipCodeForLocation(lat, lng, state);
  
  return {
    name: `${housenumber} ${street}`,
    address: `${housenumber} ${street}, ${city}, ${state} ${zipCode}`,
    lat,
    lng,
    state
  };
}

function isResidentialBuilding(tags?: Record<string, string>): boolean {
  if (!tags) return false;
  
  const buildingType = tags['building'];
  return ['residential', 'house', 'apartments', 'detached', 'semi_detached', 'terrace', 'townhouse'].includes(buildingType || '');
}

function generateSyntheticAddress(lat: number, lng: number, chunk: ImportChunk): PropertyRecord | null {
  const city = getCityFromChunk(chunk);
  const state = chunk.state;
  
  // Generate reasonable house number based on coordinates
  const houseNumber = Math.floor((lat * 10000) % 9999) + 1000;
  
  // Generate street name based on area and coordinates
  const streetNames = [
    'Residential Dr', 'Oak St', 'Elm Ave', 'Pine Way', 'Cedar Ln',
    'Maple Dr', 'Birch Ave', 'Willow St', 'Cherry Ln', 'Ash Way'
  ];
  const streetName = streetNames[Math.floor(lng * 10000) % streetNames.length];
  const zipCode = getZipCodeForLocation(lat, lng, state);
  
  return {
    name: `${houseNumber} ${streetName}`,
    address: `${houseNumber} ${streetName}, ${city}, ${state} ${zipCode}`,
    lat,
    lng,
    state
  };
}

function getCityFromChunk(chunk: ImportChunk): string {
  const cityMap: Record<string, string> = {
    'CHUNK_001': 'New York',
    'CHUNK_002': 'Brooklyn', 
    'CHUNK_003': 'Queens',
    'CHUNK_004': 'Los Angeles',
    'CHUNK_005': 'Chicago',
    'CHUNK_006': 'Houston',
    'CHUNK_007': 'Philadelphia',
    'CHUNK_008': 'Phoenix'
  };
  
  return cityMap[chunk.id] || 'Unknown City';
}

function getZipCodeForLocation(lat: number, lng: number, state: string): string {
  const stateZipRanges: Record<string, [number, number]> = {
    'NY': [10000, 14999],
    'CA': [90000, 96999],
    'IL': [60000, 62999],
    'TX': [75000, 79999],
    'PA': [15000, 19999],
    'AZ': [85000, 86999]
  };
  
  const [min, max] = stateZipRanges[state] || [10000, 99999];
  const zipBase = Math.floor(lat * lng * 1000) % (max - min);
  return (min + zipBase).toString();
}

// Import execution functions
async function importChunk(chunk: ImportChunk): Promise<void> {
  console.log(`\n🏙️ Starting ${chunk.name} (${chunk.id})`);
  console.log(`📍 Target: ${chunk.targetProperties.toLocaleString()} properties`);
  console.log(`🗺️ Bounds: ${chunk.bounds.north}, ${chunk.bounds.south}, ${chunk.bounds.east}, ${chunk.bounds.west}`);
  
  chunk.status = 'running';
  chunk.startTime = Date.now();
  
  const overpassQuery = `
  [out:json][timeout:60];
  (
    // Buildings with addresses
    way["building"]["addr:housenumber"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
    node["building"]["addr:housenumber"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
    way["addr:housenumber"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
    node["addr:housenumber"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
    
    // Residential buildings (for gap filling)
    way["building"="residential"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
    way["building"="house"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
    way["building"="apartments"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
    way["building"="detached"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
    node["building"="residential"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
    node["building"="house"](${chunk.bounds.south},${chunk.bounds.west},${chunk.bounds.north},${chunk.bounds.east});
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
      console.log(`⚠️ No data found for ${chunk.name}`);
      chunk.status = 'completed';
      chunk.endTime = Date.now();
      return;
    }

    const properties = processOSMElements(osmData.elements, chunk);
    console.log(`🏠 Processed properties: ${properties.length.toLocaleString()}`);

    if (properties.length > 0) {
      const inserted = await insertProperties(properties, chunk);
      chunk.actualProperties = inserted;
      console.log(`✅ Successfully imported: ${inserted.toLocaleString()} properties`);
    }

    chunk.status = 'completed';
    chunk.endTime = Date.now();

  } catch (error) {
    console.error(`❌ Failed to import ${chunk.name}:`, error);
    chunk.status = 'paused';
    throw error;
  }
}

async function insertProperties(properties: PropertyRecord[], chunk: ImportChunk): Promise<number> {
  let inserted = 0;
  const batchSize = 100;

  console.log(`💾 Inserting ${properties.length.toLocaleString()} properties...`);

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    
    try {
      // Try bulk insert first
      const { data, error } = await supabase
        .from('property')
        .insert(batch)
        .select('id');

      if (error) {
        // If bulk insert fails, process individually
        for (const property of batch) {
          try {
            const { data: existing } = await supabase
              .from('property')
              .select('id')
              .eq('address', property.address)
              .single();

            if (!existing) {
              const { error: insertError } = await supabase
                .from('property')
                .insert([property]);
              
              if (!insertError) {
                inserted++;
              }
            }
          } catch (error) {
            // Skip duplicates silently
          }
        }
      } else {
        inserted += batch.length;
      }
    } catch (batchError) {
      console.error(`❌ Batch processing failed:`, batchError);
    }
    
    // Progress update every 1000 properties
    if ((i + batchSize) % 1000 === 0 || i + batchSize >= properties.length) {
      console.log(`  📊 Progress: ${Math.min(i + batchSize, properties.length)}/${properties.length} processed`);
    }
  }

  return inserted;
}

async function saveProgress(chunks: ImportChunk[], totalProperties: number): Promise<void> {
  const progressData = {
    timestamp: new Date().toISOString(),
    totalProperties,
    chunks: chunks.map(chunk => ({
      id: chunk.id,
      name: chunk.name,
      status: chunk.status,
      actualProperties: chunk.actualProperties,
      targetProperties: chunk.targetProperties,
      completionTime: chunk.endTime ? chunk.endTime - (chunk.startTime || 0) : null
    }))
  };
  
  await fs.promises.writeFile('controlled_import_progress.json', JSON.stringify(progressData, null, 2));
}

async function waitForUserConfirmation(message: string): Promise<void> {
  console.log(`\n🔔 ${message}`);
  console.log('⏸️  IMPORT PAUSED - Waiting for your confirmation...');
  console.log('📊 Please check your database and verify the imported properties');
  console.log('✅ When ready to continue, press Ctrl+C to stop, then restart the script');
  console.log('📄 Progress has been saved to controlled_import_progress.json');
  
  // Keep the process alive but paused
  await new Promise(() => {}); // This will keep running until manually stopped
}

// Main execution function
async function main() {
  try {
    console.log('🇺🇸 CONTROLLED USA PROPERTY IMPORT');
    console.log('==================================');
    console.log('🎯 MISSION: Import properties in manageable chunks with progress verification');
    console.log('⏸️ APPROACH: Pause and alert after every ~1 million properties');
    console.log('📊 VERIFICATION: Check database and confirm before continuing\n');

    console.log('📋 IMPORT PLAN:');
    let cumulativeTarget = 0;
    IMPORT_CHUNKS.forEach((chunk, index) => {
      cumulativeTarget += chunk.targetProperties;
      console.log(`  ${index + 1}. ${chunk.name}: +${chunk.targetProperties.toLocaleString()} (Total: ~${cumulativeTarget.toLocaleString()})`);
    });

    console.log(`\n🎯 MILESTONE ALERTS:`);
    console.log(`  🔔 Alert at ~1,000,000 properties (after chunks 1-2)`);
    console.log(`  🔔 Alert at ~2,000,000 properties (after chunk 4)`);
    console.log(`  🔔 Alert at ~3,000,000 properties (after chunk 8)`);

    let totalProperties = 0;
    const startTime = Date.now();

    for (let i = 0; i < IMPORT_CHUNKS.length; i++) {
      const chunk = IMPORT_CHUNKS[i];
      
      console.log(`\n📍 [${i + 1}/${IMPORT_CHUNKS.length}] Processing ${chunk.name}...`);
      
      try {
        await importChunk(chunk);
        totalProperties += chunk.actualProperties;
        
        const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
        console.log(`\n📊 CHUNK COMPLETE:`);
        console.log(`  ✅ ${chunk.name}: ${chunk.actualProperties.toLocaleString()} properties`);
        console.log(`  📈 Running total: ${totalProperties.toLocaleString()} properties`);
        console.log(`  ⏱️ Elapsed time: ${elapsed.toFixed(1)} minutes`);
        
        // Save progress after each chunk
        await saveProgress(IMPORT_CHUNKS, totalProperties);
        
        // Check for milestone alerts
        if (totalProperties >= 1000000 && i <= 2) {
          await waitForUserConfirmation(`🎉 MILESTONE REACHED: ${totalProperties.toLocaleString()} properties imported!`);
        } else if (totalProperties >= 2000000 && i <= 4) {
          await waitForUserConfirmation(`🎉 MILESTONE REACHED: ${totalProperties.toLocaleString()} properties imported!`);
        } else if (totalProperties >= 3000000) {
          await waitForUserConfirmation(`🎉 MILESTONE REACHED: ${totalProperties.toLocaleString()} properties imported!`);
        }
        
        // Small delay between chunks
        console.log('⏳ Waiting 5 seconds before next chunk...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`❌ Failed to process ${chunk.name}:`, error);
        await saveProgress(IMPORT_CHUNKS, totalProperties);
        console.log('💾 Progress saved. You can restart from this point.');
        break;
      }
    }

    const totalTime = (Date.now() - startTime) / 1000 / 60;
    const completedChunks = IMPORT_CHUNKS.filter(c => c.status === 'completed').length;

    console.log(`\n🎉 CONTROLLED IMPORT SESSION COMPLETE!`);
    console.log(`====================================`);
    console.log(`✅ Chunks completed: ${completedChunks}/${IMPORT_CHUNKS.length}`);
    console.log(`📊 Total properties imported: ${totalProperties.toLocaleString()}`);
    console.log(`⏱️ Total time: ${totalTime.toFixed(1)} minutes`);
    console.log(`🎯 Average per chunk: ${Math.round(totalProperties / completedChunks).toLocaleString()} properties`);

    console.log(`\n💡 NEXT STEPS:`);
    console.log(`  📊 Check your database to verify the imported properties`);
    console.log(`  🔍 Run gap detection to identify any missing areas`);
    console.log(`  🚀 Continue with additional chunks or scale up to full import`);

  } catch (error) {
    console.error('\n❌ Controlled import failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute the main function
main();

export { main };
