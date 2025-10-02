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
  const normalizedTerm = searchTerm.trim().toLowerCase();
  
  // Search in database - use the full search term
  const { data, error } = await supabase
    .from('property')
    .select(`
      id, name, address, lat, lng, created_at,
      rating(id)
    `)
    .or(`name.ilike.%${normalizedTerm}%,address.ilike.%${normalizedTerm}%`)
    .order('address')
    .limit(20);

  if (error) {
    throw new Error(`Failed to search properties: ${error.message}`);
  }

  // Format results with rating count
  let dbResults = (data || []).map((prop: any) => {
    // Count actual ratings (filter out null entries)
    const ratings = prop.rating || [];
    const count = ratings.filter((r: any) => r && r.id).length;
    
    // Remove rating data and add count
    const { rating, ...propertyData } = prop;
    
    return {
      ...propertyData,
      rating_count: count
    };
  });
  
  // If we have database results, return them
  if (dbResults.length > 0) {
    return dbResults;
  }
  
  // If no exact phrase match, try matching ALL individual words
  const words = normalizedTerm.split(/\s+/).filter(w => w.length > 1);
  
  if (words.length > 1) {
    // Get properties
    const { data: allData } = await supabase
      .from('property')
      .select(`
        id, name, address, lat, lng, created_at,
        rating(id)
      `)
      .limit(100);
    
    if (allData) {
      // Filter client-side for properties that contain ALL words
      dbResults = allData
        .filter((prop: any) => {
          const searchableText = `${prop.name} ${prop.address}`.toLowerCase();
          return words.every(word => searchableText.includes(word));
        })
        .map((prop: any) => {
          // Count actual ratings (filter out null entries)
          const ratings = prop.rating || [];
          const count = ratings.filter((r: any) => r && r.id).length;
          
          // Remove rating data and add count
          const { rating, ...propertyData } = prop;
          
          // Calculate match score (how many words matched)
          const searchableText = `${prop.name} ${prop.address}`.toLowerCase();
          const matchScore = words.filter(word => searchableText.includes(word)).length;
          
          return {
            ...propertyData,
            rating_count: count,
            _matchScore: matchScore
          };
        })
        .sort((a: any, b: any) => b._matchScore - a._matchScore) // Sort by best match first
        .map(({_matchScore, ...prop}) => prop) // Remove score field
        .slice(0, 20);
    }
  }

  // If we have database results from word matching, return them
  if (dbResults.length > 0) {
    return dbResults;
  }

  // Otherwise, search worldwide using Google Places API
  try {
    const GOOGLE_MAPS_API_KEY = 'AIzaSyBZr1V5laBcjeoGFE0iafU73k6ebD1hza8';
    
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
      `query=${encodeURIComponent(searchTerm)}&` +
      `key=${GOOGLE_MAPS_API_KEY}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(placesUrl, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const placesResults = await response.json();
    
    if (!placesResults.results || !Array.isArray(placesResults.results)) {
      return [];
    }
    
    // Convert Google Places results to Property format
    const worldwideResults: Property[] = placesResults.results
      .map((result: any) => {
        const fullText = `${result.name} ${result.formatted_address}`.toLowerCase();
        
        // Calculate match score: how many search words are in this result?
        const words = normalizedTerm.split(/\s+/).filter((w: string) => w.length > 1);
        const matchScore = words.filter((word: string) => fullText.includes(word)).length;
        
        return {
          id: `google-${result.place_id}`,
          name: result.name,
          address: result.formatted_address,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          created_at: new Date().toISOString(),
          rating_count: 0,
          isNew: true,
          _matchScore: matchScore
        };
      })
      .sort((a: any, b: any) => b._matchScore - a._matchScore) // Best matches first
      .map(({_matchScore, ...prop}) => prop) // Remove score field
      .slice(0, 10);

    return worldwideResults;
  } catch (error) {
    // If worldwide search fails, just return empty
    return [];
  }
};

/**
 * Upsert a property from OSM data
 * If osm_id exists, update the property. Otherwise, insert new property.
 * @param osmProperty Partial property with OSM data (must include osm_id)
 * @returns Promise<Property> The created or updated property
 */
export const upsertOSMProperty = async (
  osmProperty: Partial<Property> & { osm_id: string }
): Promise<Property> => {
  const { data, error } = await supabase.rpc('upsert_osm_property', {
    p_osm_id: osmProperty.osm_id,
    p_name: osmProperty.name || 'Unknown',
    p_address: osmProperty.address || 'Unknown',
    p_lat: osmProperty.lat!,
    p_lng: osmProperty.lng!,
  });

  if (error) {
    throw new Error(`Failed to upsert OSM property: ${error.message}`);
  }

  // Fetch the complete property record
  const propertyId = data;
  const property = await getProperty(propertyId);
  
  if (!property) {
    throw new Error('Failed to fetch upserted property');
  }

  return property;
};

/**
 * Batch upsert multiple OSM properties
 * @param osmProperties Array of partial properties with OSM data
 * @returns Promise<Property[]> Array of created/updated properties
 */
export const upsertOSMProperties = async (
  osmProperties: Array<Partial<Property> & { osm_id: string }>
): Promise<Property[]> => {
  const properties: Property[] = [];

  // Deduplicate by osm_id before processing
  const uniqueProps = new Map<string, Partial<Property> & { osm_id: string }>();
  osmProperties.forEach(prop => {
    uniqueProps.set(prop.osm_id, prop);
  });
  
  const deduplicatedProps = Array.from(uniqueProps.values());
  
  if (deduplicatedProps.length < osmProperties.length) {
    console.log(`🔄 Deduplicated ${osmProperties.length} → ${deduplicatedProps.length} properties`);
  }

  // Process in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < deduplicatedProps.length; i += batchSize) {
    const batch = deduplicatedProps.slice(i, i + batchSize);
    
    // Process batch with error handling for individual properties
    const batchResults = await Promise.allSettled(
      batch.map(osmProp => upsertOSMProperty(osmProp))
    );
    
    // Only keep successful results
    const successfulResults = batchResults
      .filter((result): result is PromiseFulfilledResult<Property> => result.status === 'fulfilled')
      .map(result => result.value);
    
    properties.push(...successfulResults);
    
    const failedCount = batchResults.length - successfulResults.length;
    if (failedCount > 0) {
      console.warn(`⚠️ Batch ${Math.floor(i / batchSize) + 1}: ${successfulResults.length} succeeded, ${failedCount} failed`);
    } else {
      console.log(`📝 Upserted batch ${Math.floor(i / batchSize) + 1}: ${successfulResults.length} properties`);
    }
  }

  return properties;
};

/**
 * Get properties from OSM and database combined
 * First checks database for existing properties, then queries OSM for new ones
 * @param latitude Center latitude
 * @param longitude Center longitude
 * @param radiusMeters Radius in meters (default: 100m)
 * @returns Promise<Property[]> Combined array of properties
 */
export const getPropertiesOSMBased = async (
  latitude: number,
  longitude: number,
  radiusMeters: number = 100
): Promise<Property[]> => {
  try {
    // Step 1: Get existing properties from database within radius
    const existingProperties = await getPropertiesWithinRadius(latitude, longitude, radiusMeters);
    console.log(`📍 Found ${existingProperties.length} existing properties in database`);

    // Step 2: Fetch Google Places data for the same area
    const { fetchNearbyPlaces } = await import('./googlePlaces');
    const googlePlaces = await fetchNearbyPlaces(latitude, longitude, radiusMeters);
    console.log(`🗺️ Found ${googlePlaces.length} properties from Google Places`);

    // Step 3: Find new properties (not in database)
    const existingOSMIds = new Set(
      existingProperties
        .filter(p => p.osm_id)
        .map(p => p.osm_id!)
    );
    
    // Also check by address to prevent duplicates
    const existingAddresses = new Set(
      existingProperties.map(p => p.address.toLowerCase().trim())
    );

    const newGoogleProperties = googlePlaces.filter(
      googleProp => {
        if (!googleProp.osm_id) return false;
        // Skip if ID already exists
        if (existingOSMIds.has(googleProp.osm_id)) return false;
        // Skip if address already exists (prevent duplicates)
        if (googleProp.address && existingAddresses.has(googleProp.address.toLowerCase().trim())) {
          console.log(`⚠️ Skipping duplicate address: ${googleProp.address}`);
          return false;
        }
        return true;
      }
    ) as Array<Partial<Property> & { osm_id: string }>;

    console.log(`🆕 Found ${newGoogleProperties.length} new properties to save`);

    // Step 4: Save new properties to database (with error handling)
    let savedProperties: Property[] = [];
    if (newGoogleProperties.length > 0) {
      try {
        savedProperties = await upsertOSMProperties(newGoogleProperties);
        console.log(`💾 Saved ${savedProperties.length} new properties to database`);
      } catch (error) {
        console.warn(`⚠️ Some properties failed to save, continuing with existing data`, error);
      }
    }

    // Step 5: Combine and return all properties
    const allProperties = [...existingProperties, ...savedProperties];
    console.log(`✅ Returning ${allProperties.length} total properties`);
    
    return allProperties;
  } catch (error) {
    // Silently fallback to database-only if Google Places fails
    try {
      return await getPropertiesWithinRadius(latitude, longitude, radiusMeters);
    } catch (fallbackError) {
      return []; // Return empty array as last resort
    }
  }
};

/**
 * Delete properties within a radius (for testing)
 * @param latitude Center latitude
 * @param longitude Center longitude
 * @param radiusMeters Radius in meters
 * @returns Promise<number> Number of properties deleted
 */
export const deletePropertiesWithinRadius = async (
  latitude: number,
  longitude: number,
  radiusMeters: number
): Promise<number> => {
  const { data, error } = await supabase.rpc('delete_properties_within_radius', {
    center_lat: latitude,
    center_lng: longitude,
    radius_meters: radiusMeters,
  });

  if (error) {
    throw new Error(`Failed to delete properties: ${error.message}`);
  }

  console.log(`🗑️ Deleted ${data} properties within ${radiusMeters}m of (${latitude}, ${longitude})`);
  return data as number;
};