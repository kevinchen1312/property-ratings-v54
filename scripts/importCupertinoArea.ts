#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cGhjamJpY2t1anlidmJlYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTk0OTMsImV4cCI6MjA3NDEzNTQ5M30.68R3Iy4coOrtD74bR0Q9twfz1ohZ_cSJ1N0cuC8p-Dc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for OpenStreetMap data
interface OSMNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: {
    'addr:housenumber'?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    building?: string;
    entrance?: string;
  };
}

interface OSMWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: {
    'addr:housenumber'?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    building?: string;
  };
}

interface OSMElement extends OSMNode {
  // For ways that have been processed into centroids
}

interface OverpassResponse {
  version: number;
  generator: string;
  elements: (OSMNode | OSMWay)[];
}

interface PropertyRecord {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Comprehensive Overpass QL query for Cupertino area (Bollinger/De Anza/Prospect/Lawrence)
const overpassQuery = `
[out:json][timeout:60];
(
  // All residential buildings with addresses in the area
  way["building"]["addr:housenumber"]["addr:street"](37.293,-122.079,37.334,-122.032);
  node["building"]["addr:housenumber"]["addr:street"](37.293,-122.079,37.334,-122.032);
  
  // Apartment/condo buildings
  way["building"~"^(apartments|residential|house|detached)$"]["addr:housenumber"](37.293,-122.079,37.334,-122.032);
  
  // Any building with address (catches commercial/mixed use too)
  way["addr:housenumber"]["addr:street"](37.293,-122.079,37.334,-122.032);
  node["addr:housenumber"]["addr:street"](37.293,-122.079,37.334,-122.032);
);
out body;
>; out skel qt;
`.trim();

/**
 * Fetch data from Overpass API with retry logic and chunking support
 */
async function fetchFromOverpass(query: string, retryCount = 0): Promise<OverpassResponse> {
  const url = 'https://overpass-api.de/api/interpreter';
  
  try {
    console.log('🌍 Querying Overpass API for large Cupertino area...');
    console.log('📦 Area: Bollinger Rd ↔ Prospect Rd, Lawrence Expwy ↔ De Anza Blvd');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as OverpassResponse;
    console.log(`✓ Received ${data.elements.length} OSM elements from large area`);
    return data;
    
  } catch (error) {
    if (retryCount < 2) {
      const waitTime = (retryCount + 1) * 5; // 5s, 10s delays
      console.log(`⚠️ Request failed, retrying in ${waitTime} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      return fetchFromOverpass(query, retryCount + 1);
    }
    
    throw new Error(`Failed to fetch from Overpass API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate centroid for a way (polygon) from its nodes
 */
function calculateCentroid(nodes: OSMNode[]): { lat: number; lng: number } {
  if (nodes.length === 0) {
    throw new Error('Cannot calculate centroid of empty node array');
  }

  let latSum = 0;
  let lngSum = 0;
  
  for (const node of nodes) {
    latSum += node.lat;
    lngSum += node.lon;
  }
  
  return {
    lat: latSum / nodes.length,
    lng: lngSum / nodes.length,
  };
}

/**
 * Process OSM elements into property records
 */
function processOSMElements(elements: (OSMNode | OSMWay)[]): PropertyRecord[] {
  console.log(`🏗️ Processing ${elements.length} OSM elements...`);
  
  // First, create a map of all nodes for way processing
  const nodeMap = new Map<number, OSMNode>();
  const ways: OSMWay[] = [];
  const processedElements: OSMElement[] = [];

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

  console.log(`🏠 Found ${processedElements.length} buildings with addresses`);

  // Convert to property records and deduplicate by address
  const propertyMap = new Map<string, PropertyRecord>();
  
  for (const element of processedElements) {
    const housenumber = element.tags?.['addr:housenumber'];
    const street = element.tags?.['addr:street'];
    const city = element.tags?.['addr:city'] || 'Cupertino'; // Default to Cupertino for this area
    
    if (!housenumber || !street) continue;

    // Normalize the address - keep the original street name but clean it up
    const cleanStreet = street.trim();
    const zipCode = city.toLowerCase().includes('cupertino') ? '95014' : '95129';
    const normalizedCity = city.toLowerCase().includes('cupertino') ? 'Cupertino' : 'San Jose';
    
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

  const uniqueProperties = Array.from(propertyMap.values());
  console.log(`✨ Created ${uniqueProperties.length} unique property records`);
  
  return uniqueProperties;
}

/**
 * Upsert properties into Supabase in batches
 */
async function upsertProperties(properties: PropertyRecord[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  const batchSize = 50; // Process in smaller batches for large datasets

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
          // PGRST116 is "not found", which is expected for new properties
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
    
    // Show progress
    console.log(`  ✓ Batch complete: ${inserted + updated} properties processed so far`);
    
    // Small delay between batches to be nice to the database
    if (i + batchSize < properties.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { inserted, updated };
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🏙️ Cupertino Area Property Importer');
    console.log('=====================================');
    console.log('📍 Area: Bollinger Rd ↔ Prospect Rd, Lawrence Expwy ↔ De Anza Blvd');
    console.log('🗺️ Coverage: Major residential area in Cupertino/San Jose');
    
    // Fetch data from Overpass API
    const overpassData = await fetchFromOverpass(overpassQuery);
    
    // Process OSM elements into property records
    const properties = processOSMElements(overpassData.elements);
    
    console.log(`\n📊 Processing Results:`);
    console.log(`  • Found ${overpassData.elements.length} OSM features`);
    console.log(`  • Processed into ${properties.length} unique properties`);
    
    if (properties.length === 0) {
      console.log('\n⚠️ No properties found in the specified area.');
      console.log('This could indicate an issue with the query or coordinates.');
      return;
    }

    // Show first few addresses from different areas
    console.log('\n📍 Sample addresses found:');
    const sampleSize = Math.min(8, properties.length);
    properties.slice(0, sampleSize).forEach(p => {
      console.log(`  • ${p.address} (${p.lat.toFixed(6)}, ${p.lng.toFixed(6)})`);
    });
    if (properties.length > sampleSize) {
      console.log(`  ... and ${properties.length - sampleSize} more`);
    }

    // Show street distribution
    const streetCounts = new Map<string, number>();
    properties.forEach(p => {
      const street = p.address.split(',')[0].replace(/^\d+\s+/, '');
      streetCounts.set(street, (streetCounts.get(street) || 0) + 1);
    });
    
    console.log('\n🏘️ Top streets by property count:');
    const topStreets = Array.from(streetCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    topStreets.forEach(([street, count], index) => {
      console.log(`  ${index + 1}. ${street}: ${count} properties`);
    });

    // Upsert to Supabase
    const { inserted, updated } = await upsertProperties(properties);
    
    console.log(`\n✅ Import Complete!`);
    console.log(`  • Inserted: ${inserted} new properties`);
    console.log(`  • Updated: ${updated} existing properties`);
    console.log(`  • Total processed: ${inserted + updated} properties`);
    console.log(`  • Coverage: Major Cupertino/San Jose residential area`);
    
    if (inserted + updated < properties.length) {
      const failed = properties.length - inserted - updated;
      console.log(`  • Failed: ${failed} properties (see errors above)`);
    }

    console.log(`\n🎯 Next steps:`);
    console.log(`  1. Re-enable RLS: ALTER TABLE property ENABLE ROW LEVEL SECURITY;`);
    console.log(`  2. Test your app - you should see hundreds of new pins!`);
    console.log(`  3. Zoom out to see the expanded coverage area`);

  } catch (error) {
    console.error('\n❌ Import failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute the main function
main();

