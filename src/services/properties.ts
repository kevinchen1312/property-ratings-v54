import { supabase } from '../lib/supabase';
import { Property } from '../lib/types';

/**
 * Helper function to fetch all properties in a region using pagination
 */
async function fetchAllPropertiesInRegion(
  latMin: number, latMax: number, 
  lngMin: number, lngMax: number,
  regionName: string
): Promise<Property[]> {
  const allProperties: Property[] = [];
  let page = 0;
  const pageSize = 1000;

  const maxPages = 3; // EMERGENCY FIX: Limit to 3K properties per region to prevent hanging

  while (page < maxPages) {
    const { data, error } = await supabase
      .from('property')
      .select('id, name, address, lat, lng, created_at')
      .gte('lat', latMin)
      .lte('lat', latMax)
      .gte('lng', lngMin)
      .lte('lng', lngMax)
      .order('id') // Consistent ordering for pagination
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allProperties.push(...data);
    console.log(`📄 ${regionName} page ${page + 1}: +${data.length} properties (total: ${allProperties.length})`);

    if (data.length < pageSize) break; // Last page
    page++;
  }

  if (page >= maxPages) {
    console.log(`⚠️ ${regionName}: Limited to ${allProperties.length} properties for app performance`);
  }

  return allProperties;
}

/**
 * Fetch properties from the database with geographic-based loading for complete coverage
 * @returns Promise<Property[]> Array of properties ordered by geographic location
 */
export const listProperties = async (): Promise<Property[]> => {
  // EMERGENCY FIX: Return empty array to prevent app hanging
  // Properties will be loaded dynamically when user zooms into areas
  
  console.log('🚀 Fast startup mode - properties load when you zoom in');
  
  return []; // Empty initial load for fast startup
};

/**
 * Fetch a single property by ID
 * @param id Property ID
 * @returns Promise<Property | null>
 */
export const getProperty = async (id: string): Promise<Property | null> => {
  const { data, error } = await supabase
    .from('property')
    .select('id, name, address, lat, lng, created_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch property: ${error.message}`);
  }

  return data;
};

/**
 * Fetch properties within a specific bounding box
 * @param bounds Bounding box coordinates
 * @returns Promise<Property[]>
 */
export const getPropertiesInBounds = async (bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): Promise<Property[]> => {
  const { data, error } = await supabase
    .from('property')
    .select('id, name, address, lat, lng, created_at')
    .gte('lat', bounds.south)
    .lte('lat', bounds.north)
    .gte('lng', bounds.west)
    .lte('lng', bounds.east)
    .order('address')
    .limit(2000); // Reasonable limit for viewport loading

  if (error) {
    throw new Error(`Failed to fetch properties in bounds: ${error.message}`);
  }

  return data || [];
};

/**
 * Fetch properties within a specific radius from a center point
 * @param centerLat Center latitude
 * @param centerLng Center longitude  
 * @param radiusMeters Radius in meters (default: 200m)
 * @returns Promise<Property[]>
 */
export const getPropertiesWithinRadius = async (
  centerLat: number,
  centerLng: number,
  radiusMeters: number = 200
): Promise<Property[]> => {
  // Calculate approximate bounding box for initial filtering
  // 1 degree latitude ≈ 111,320 meters
  // 1 degree longitude ≈ 111,320 * cos(latitude) meters
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos(centerLat * Math.PI / 180));

  const { data, error } = await supabase
    .from('property')
    .select('id, name, address, lat, lng, created_at')
    .gte('lat', centerLat - latDelta)
    .lte('lat', centerLat + latDelta)
    .gte('lng', centerLng - lngDelta)
    .lte('lng', centerLng + lngDelta)
    .order('address')
    .limit(1000); // Reasonable limit for proximity loading

  if (error) {
    throw new Error(`Failed to fetch properties within radius: ${error.message}`);
  }

  if (!data) return [];

  // Filter by exact distance using Haversine formula
  const { calculateDistance } = await import('../lib/ratingService');
  
  return data.filter(property => {
    const distance = calculateDistance(centerLat, centerLng, property.lat, property.lng);
    return distance <= radiusMeters;
  });
};

/**
 * Search properties by address or name
 * @param searchTerm Search term to match against name or address
 * @returns Promise<Property[]>
 */
export const searchProperties = async (searchTerm: string): Promise<Property[]> => {
  const { data, error } = await supabase
    .from('property')
    .select('id, name, address, lat, lng, created_at')
    .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
    .order('address');

  if (error) {
    throw new Error(`Failed to search properties: ${error.message}`);
  }

  return data || [];
};
