import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export interface RatingSubmission {
  propertyId: string;
  noise: number;
  safety: number;
  cleanliness: number;
  userLat: number;
  userLng: number;
}

/**
 * Check if user has already rated this property today
 */
export const checkDailyRatingLimit = async (propertyId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
  
  const { data, error } = await supabase
    .from('rating')
    .select('id')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`)
    .limit(1);

  if (error) {
    console.error('Error checking daily rating limit:', error);
    return false;
  }

  return (data && data.length > 0);
};

/**
 * Check if user has rated this property within the last hour (any attribute)
 * Returns both the rate limit status and the timestamp of the last rating
 */
export const checkHourlyRateLimit = async (propertyId: string): Promise<{
  isRateLimited: boolean;
  lastRatingTime?: string;
}> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { isRateLimited: false };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('rating')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error checking hourly rate limit:', error);
    return { isRateLimited: false };
  }

  const hasRecentRating = data && data.length > 0;
  return {
    isRateLimited: hasRecentRating,
    lastRatingTime: hasRecentRating ? data[0].created_at : undefined
  };
};

/**
 * Submit ratings for a property (only non-zero ratings)
 * Handles proximity validation and duplicate rating errors with user-friendly messages
 */
export const submitRatings = async (submission: RatingSubmission): Promise<void> => {
  console.log('🔍 Starting rating submission...', submission);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ No user found');
    throw new Error('User not authenticated');
  }
  
  console.log('✅ User authenticated:', user.id);

  // Check if user has rated this property within the last hour
  const rateLimitCheck = await checkHourlyRateLimit(submission.propertyId);
  if (rateLimitCheck.isRateLimited) {
    Alert.alert(
      'Rate Limit Reached',
      'You can only rate each property once per hour. Please wait before submitting another rating for this property.',
      [{ text: 'OK' }]
    );
    throw new Error('Property rate limited');
  }

  // Prepare rating records - only include non-zero ratings
  const ratings = [];
  
  if (submission.noise > 0) {
    ratings.push({
      user_id: user.id,
      property_id: submission.propertyId,
      attribute: 'noise',
      stars: submission.noise,
      user_lat: submission.userLat,
      user_lng: submission.userLng,
    });
  }
  
  if (submission.safety > 0) {
    ratings.push({
      user_id: user.id,
      property_id: submission.propertyId,
      attribute: 'safety',
      stars: submission.safety,
      user_lat: submission.userLat,
      user_lng: submission.userLng,
    });
  }
  
  if (submission.cleanliness > 0) {
    ratings.push({
      user_id: user.id,
      property_id: submission.propertyId,
      attribute: 'cleanliness',
      stars: submission.cleanliness,
      user_lat: submission.userLat,
      user_lng: submission.userLng,
    });
  }

  // Ensure at least one rating is provided
  if (ratings.length === 0) {
    Alert.alert(
      'No Ratings Selected',
      'Please select at least one star rating before submitting.',
      [{ text: 'OK' }]
    );
    throw new Error('No ratings provided');
  }

  console.log('📝 Attempting to insert ratings:', ratings);
  
  const { data, error } = await supabase
    .from('rating')
    .insert(ratings)
    .select();

  console.log('📊 Insert result:', { data, error });

  if (error) {
    console.error('❌ Database error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    
    // Handle specific database constraint errors with user-friendly messages
    
    // Proximity validation error (from trigger)
    if (error.message.includes('within 200 meters')) {
      Alert.alert(
        'Too Far Away',
        'You must be within 200 meters of the property to submit a rating. Please get closer and try again.',
        [{ text: 'OK' }]
      );
      throw new Error('Not within required proximity');
    }
    
    // Duplicate rating error (from unique constraint)
    if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('already exists')) {
      Alert.alert(
        'Already Rated Today',
        'You have already rated this property today. You can only rate each property once per day.',
        [{ text: 'OK' }]
      );
      throw new Error('Already rated today');
    }
    
    // Authentication/permission errors
    if (error.code === '42501' || error.message.includes('permission denied')) {
      Alert.alert(
        'Permission Error',
        'You do not have permission to submit ratings. Please make sure you are logged in.',
        [{ text: 'OK' }]
      );
      throw new Error('Permission denied');
    }
    
    // Invalid property ID
    if (error.code === '23503' || error.message.includes('foreign key')) {
      Alert.alert(
        'Property Not Found',
        'The selected property could not be found. Please try selecting a different property.',
        [{ text: 'OK' }]
      );
      throw new Error('Invalid property');
    }
    
    // Network/connection errors
    if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('fetch')) {
      Alert.alert(
        'Connection Error',
        'Unable to submit ratings due to network issues. Please check your internet connection and try again.',
        [{ text: 'Retry', style: 'default' }, { text: 'Cancel', style: 'cancel' }]
      );
      throw new Error('Network error');
    }
    
    // Generic database error
    console.error('Database error submitting ratings:', error);
    Alert.alert(
      'Submission Failed',
      'Unable to submit your ratings at this time. Please try again in a moment.',
      [{ text: 'OK' }]
    );
    throw new Error(`Database error: ${error.message}`);
  }

  // Success toast
  Alert.alert(
    'Success! 🎉',
    'Your ratings have been submitted successfully. Thank you for your feedback!',
    [{ text: 'OK' }]
  );
};

