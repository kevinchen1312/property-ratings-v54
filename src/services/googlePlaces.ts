/**
 * Google Places Service
 * Handles querying Google Places API for nearby properties
 */

import { Property } from '../lib/types';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBZr1V5laBcjeoGFE0iafU73k6ebD1hza8';

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
}

/**
 * Query Google Places for properties within a radius using Nearby Search
 * @param latitude Center latitude
 * @param longitude Center longitude
 * @param radiusMeters Radius in meters (default: 75m)
 * @returns Array of properties
 */
export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number = 75
): Promise<Partial<Property>[]> {
  try {
    console.log(`🗺️ Fetching Google Places within ${radiusMeters}m of (${latitude}, ${longitude})...`);
    
    // Use Nearby Search to find properties (addresses, buildings, points of interest)
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${latitude},${longitude}&` +
      `radius=${radiusMeters}&` +
      `type=point_of_interest|street_address&` +
      `key=${GOOGLE_MAPS_API_KEY}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`⏳ Google Places API unavailable (${response.status}), using cached data`);
      return [];
    }

    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    console.log(`📊 Found ${data.results.length} Google Places results`);

    // Convert to Property format
    const properties: Partial<Property>[] = data.results.map((place: GooglePlaceResult) => ({
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      osm_id: `google_${place.place_id}`, // Store Google Place ID in osm_id field
    }));

    return properties;
  } catch (error) {
    // Silently handle errors - fallback to database
    console.log('⏳ Google Places API error, using cached data');
    return [];
  }
}

/**
 * Get place details by place_id
 * @param placeId Google Place ID
 * @returns Place details
 */
export async function getPlaceDetails(placeId: string): Promise<GooglePlaceResult | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${placeId}&` +
      `fields=place_id,name,formatted_address,geometry&` +
      `key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.result || null;
  } catch (error) {
    return null;
  }
}

