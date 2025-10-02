/**
 * OpenStreetMap Service
 * Handles querying OSM data via Overpass API and converting to Property objects
 */

import { Property } from '../lib/types';

export interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  members?: Array<{ type: string; ref: number; role: string }>;
  center?: { lat: number; lon: number }; // For relations - centroid of the geometry
}

export interface OSMResponse {
  version: number;
  generator: string;
  elements: OSMElement[];
}

/**
 * Query OSM for buildings within a radius using Overpass API
 * @param latitude Center latitude
 * @param longitude Center longitude
 * @param radiusMeters Radius in meters (default: 100m)
 * @returns Array of OSM elements (buildings)
 */
export async function fetchOSMBuildings(
  latitude: number,
  longitude: number,
  radiusMeters: number = 100
): Promise<OSMElement[]> {
  // Overpass QL query for buildings within radius
  // Only get buildings with addresses (actual properties, not generic structures)
  // Include nodes, ways, and relations - some addresses are stored on multipolygon relations
  const query = `
[out:json][timeout:25];
(
  node["building"]["addr:housenumber"](around:${radiusMeters},${latitude},${longitude});
  way["building"]["addr:housenumber"](around:${radiusMeters},${latitude},${longitude});
  relation["building"]["addr:housenumber"](around:${radiusMeters},${latitude},${longitude});
);
out body center;
>;
out skel qt;
  `.trim();

  try {
    console.log(`🌐 Fetching OSM buildings within ${radiusMeters}m of (${latitude}, ${longitude})...`);
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      // Silently handle all HTTP errors - fallback to database will handle it
      console.log(`⏳ Overpass API unavailable (${response.status}), using cached data`);
      return [];
    }

    const data: OSMResponse = await response.json();
    console.log(`📊 Found ${data.elements?.length || 0} OSM elements`);

    return data.elements || [];
  } catch (error) {
    // Silently handle all errors - fallback to database
    return [];
  }
}

/**
 * Convert OSM elements to Property objects
 * @param elements OSM elements from Overpass API
 * @param nodeCache Cache of node coordinates for way processing
 * @returns Array of Property objects
 */
export function convertOSMToProperties(
  elements: OSMElement[],
  nodeCache?: Map<number, { lat: number; lon: number }>
): Partial<Property>[] {
  const properties: Partial<Property>[] = [];
  const cache = nodeCache || new Map();

  // First pass: cache all nodes
  elements.forEach(element => {
    if (element.type === 'node' && element.lat && element.lon) {
      cache.set(element.id, { lat: element.lat, lon: element.lon });
    }
  });

  // Second pass: process buildings
  elements.forEach(element => {
    if (!element.tags?.building) return; // Skip non-building elements
    
    // IMPORTANT: Only process buildings with addresses (actual properties)
    if (!element.tags['addr:housenumber']) {
      return; // Skip generic buildings without addresses
    }

    const tags = element.tags;
    let lat: number | undefined;
    let lon: number | undefined;

    if (element.type === 'node' && element.lat && element.lon) {
      // Node building - use direct coordinates
      lat = element.lat;
      lon = element.lon;
    } else if (element.type === 'way' && element.nodes && element.nodes.length > 0) {
      // Way building - calculate centroid from nodes
      const coords = element.nodes
        .map(nodeId => cache.get(nodeId))
        .filter(coord => coord !== undefined) as Array<{ lat: number; lon: number }>;

      if (coords.length > 0) {
        lat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
        lon = coords.reduce((sum, c) => sum + c.lon, 0) / coords.length;
      }
    } else if (element.type === 'relation' && element.center) {
      // Relation building (e.g. multipolygon) - use provided center point from Overpass
      lat = element.center.lat;
      lon = element.center.lon;
      console.log(`📍 Processing relation ${element.id} at center (${lat}, ${lon})`);
    }

    if (!lat || !lon) {
      // Skip if no coordinates available
      return;
    }

    // Build address from OSM tags
    const addressParts: string[] = [];
    if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
    if (tags['addr:street']) addressParts.push(tags['addr:street']);
    if (tags['addr:city']) addressParts.push(tags['addr:city']);
    if (tags['addr:state']) addressParts.push(tags['addr:state']);
    if (tags['addr:postcode']) addressParts.push(tags['addr:postcode']);

    const address = addressParts.length > 0 
      ? addressParts.join(', ')
      : `${lat.toFixed(6)}, ${lon.toFixed(6)}`; // Fallback to coordinates

    // Build name from OSM tags
    const name = tags.name || 
                 tags['addr:housename'] ||
                 tags['building:name'] ||
                 (tags['addr:housenumber'] && tags['addr:street'] 
                   ? `${tags['addr:housenumber']} ${tags['addr:street']}`
                   : `Building ${element.type}/${element.id}`);

    properties.push({
      osm_id: `${element.type}/${element.id}`,
      name,
      address,
      lat,
      lng: lon,
    });
  });

  console.log(`🏠 Converted ${properties.length} OSM elements to properties`);
  return properties;
}

/**
 * Fetch and convert OSM buildings to properties in one call
 * @param latitude Center latitude
 * @param longitude Center longitude
 * @param radiusMeters Radius in meters (default: 100m)
 * @returns Array of Property objects (without IDs - not yet in database)
 */
export async function getOSMPropertiesNearLocation(
  latitude: number,
  longitude: number,
  radiusMeters: number = 100
): Promise<Partial<Property>[]> {
  const elements = await fetchOSMBuildings(latitude, longitude, radiusMeters);
  return convertOSMToProperties(elements);
}
