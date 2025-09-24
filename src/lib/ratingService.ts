import { supabase } from './supabase';
import { Property, RatingSubmission } from './types';

export const fetchProperties = async (): Promise<Property[]> => {
  const { data, error } = await supabase
    .from('property')
    .select('*')
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch properties: ${error.message}`);
  }

  // Remove duplicates based on coordinates to avoid overlapping markers
  // Allow multiple properties on same street with different coordinates
  const uniqueProperties = data?.filter((property, index, self) => 
    index === self.findIndex(p => 
      Math.abs(p.lat - property.lat) < 0.0001 && 
      Math.abs(p.lng - property.lng) < 0.0001
    )
  ) || [];

  return uniqueProperties;
};

export const submitRatings = async (submission: RatingSubmission): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Submit all three ratings
  const ratings = [
    {
      user_id: user.id,
      property_id: submission.propertyId,
      attribute: 'noise',
      stars: submission.noise,
      user_lat: submission.userLat,
      user_lng: submission.userLng,
    },
    {
      user_id: user.id,
      property_id: submission.propertyId,
      attribute: 'friendliness',
      stars: submission.friendliness,
      user_lat: submission.userLat,
      user_lng: submission.userLng,
    },
    {
      user_id: user.id,
      property_id: submission.propertyId,
      attribute: 'cleanliness',
      stars: submission.cleanliness,
      user_lat: submission.userLat,
      user_lng: submission.userLng,
    },
  ];

  const { error } = await supabase
    .from('rating')
    .insert(ratings);

  if (error) {
    throw new Error(`Failed to submit ratings: ${error.message}`);
  }
};

export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const fetchPropertyRatings = async (propertyIds: string[]): Promise<Record<string, NonNullable<Property['ratings']>>> => {
  if (propertyIds.length === 0) return {};

  const { data, error } = await supabase
    .from('property_ratings_summary')
    .select('id, attribute, avg_rating, rating_count')
    .in('id', propertyIds);

  if (error) {
    console.error('Error fetching property ratings:', error);
    return {};
  }

  // Group ratings by property ID
  const ratingsMap: Record<string, NonNullable<Property['ratings']>> = {};
  
  data?.forEach(rating => {
    if (!ratingsMap[rating.id]) {
      ratingsMap[rating.id] = {};
    }
    if (rating.attribute && rating.avg_rating) {
      const ratingMap = ratingsMap[rating.id];
      const attribute = rating.attribute as 'noise' | 'friendliness' | 'cleanliness';
      if (attribute === 'noise' || attribute === 'friendliness' || attribute === 'cleanliness') {
        ratingMap[attribute] = rating.avg_rating;
      }
    }
  });

  return ratingsMap;
};