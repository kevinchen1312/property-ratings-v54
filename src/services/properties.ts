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
