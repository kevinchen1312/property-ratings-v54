import { Session } from '@supabase/supabase-js';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  geom?: any;
  created_at: string;
  osm_id?: string | null; // OpenStreetMap ID (e.g., "node/123456" or "way/789012")
  // Optional rating data
  avg_rating?: number;
  rating_count?: number;
  ratings?: {
    safety?: number;
    quietness?: number;
    cleanliness?: number;
  };
  // For search results
  isNew?: boolean; // Flag for properties not yet in database
}

export type RatingAttribute = 'safety' | 'quietness' | 'cleanliness';

export interface Rating {
  id: string;
  user_id: string;
  property_id: string;
  attribute: RatingAttribute;
  stars: number;
  user_lat: number;
  user_lng: number;
  created_at: string;
  
  // Enhanced fields (if using Option 1)
  property_name?: string;
  property_address?: string;
  property_lat?: number;
  property_lng?: number;
}


export type { Session };
