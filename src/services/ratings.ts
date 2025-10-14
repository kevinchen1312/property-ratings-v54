import { supabase } from '../lib/supabase';
import { Alert, Platform } from 'react-native';
import { generateDeviceFingerprint, isHighRiskDevice } from '../lib/deviceAttestation';

export interface RatingSubmission {
  propertyId: string;
  safety: number;
  quietness: number;
  cleanliness: number;
  userLat: number;
  userLng: number;
  accuracy?: number; // GPS accuracy in meters
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
    // Silently handle - non-fatal
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
    // Silently handle - non-fatal
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
  
  // Enhanced auth debugging
  console.log('🔐 Checking authentication...');
  
  // Method 1: Get user via getUser()
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('📱 getUser() result:', { user: user?.id, error: userError });
  
  // Method 2: Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('📱 getSession() result:', { 
    session: session?.user?.id, 
    accessToken: session?.access_token ? 'present' : 'missing',
    error: sessionError 
  });
  
  if (!user && !session?.user) {
    console.error('❌ No user found via either method');
    Alert.alert(
      'Authentication Error',
      'You are not logged in. Please sign out and sign back in.',
      [{ text: 'OK' }]
    );
    throw new Error('User not authenticated');
  }
  
  const userId = user?.id || session?.user?.id;
  console.log('✅ Using user ID:', userId);

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
  
  if (submission.safety > 0) {
    ratings.push({
      user_id: userId,
      property_id: submission.propertyId,
      attribute: 'safety',
      stars: submission.safety,
      user_lat: submission.userLat,
      user_lng: submission.userLng,
    });
  }
  
  if (submission.quietness > 0) {
    ratings.push({
      user_id: userId,
      property_id: submission.propertyId,
      attribute: 'quietness',
      stars: submission.quietness,
      user_lat: submission.userLat,
      user_lng: submission.userLng,
    });
  }
  
  if (submission.cleanliness > 0) {
    ratings.push({
      user_id: userId,
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
  console.log('🔑 Current auth state before insert:', {
    hasUser: !!user,
    hasSession: !!session,
    userId: userId
  });
  
  // 🆕 NEW: Submit through anti-spoofing endpoint for trust scoring
  // Set to true to enable anti-spoofing trust scoring
  // TEMPORARILY DISABLED: Edge Function can't verify custom Clerk JWT (HS256 vs RS256)
  const USE_EDGE_FUNCTION = false;
  
  let data, error;
  
  if (USE_EDGE_FUNCTION) {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oyphcjbickujybvbeame.supabase.co';
      console.log('🌐 Calling Edge Function:', `${supabaseUrl}/functions/v1/submit-rating-legacy`);
      
      // Collect device fingerprint for attestation
      let deviceFingerprint = null;
      try {
        deviceFingerprint = await generateDeviceFingerprint();
        console.log('✅ Device fingerprint collected:', {
          platform: deviceFingerprint.platform,
          isDevice: deviceFingerprint.isDevice,
          isEmulator: deviceFingerprint.isEmulator,
          model: deviceFingerprint.modelName,
        });
        console.log('📍 GPS accuracy:', submission.accuracy ? `${submission.accuracy}m` : 'not available');
        
        // Warn if high-risk device detected
        if (isHighRiskDevice(deviceFingerprint)) {
          console.warn('⚠️ High-risk device detected');
        }
      } catch (fpError) {
        console.error('❌ Failed to collect device fingerprint:', fpError);
      }
      
      const response = await fetch(
      `${supabaseUrl}/functions/v1/submit-rating-legacy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: submission.propertyId,
          ratings: ratings.map(r => ({
            attribute: r.attribute,
            stars: r.stars
          })),
          lat: submission.userLat,
          lng: submission.userLng,
          accuracy: submission.accuracy || 999, // Use real accuracy or 999 if unavailable
          timestamp: Date.now(),
          device_context: deviceFingerprint || {
            platform: Platform.OS
          }
        })
      }
    );

    const result = await response.json();
    
    console.log('🔍 Edge Function response:', { 
      status: response.status, 
      result 
    });

    if (!response.ok) {
      console.error('❌ Edge Function error:', result);
      error = { message: result.error || 'Submission failed', code: response.status.toString() };
      data = null;
    } else {
      console.log('✅ Submitted with trust score:', result.trust_score);
      if (result.flags && result.flags.length > 0) {
        console.warn('⚠️ Fraud flags detected:', result.flags);
      }
      data = result;
      error = null;
    }
  } catch (fetchError: any) {
    console.error('❌ Fetch error:', fetchError);
    console.error('❌ Fetch error details:', JSON.stringify(fetchError));
    error = { message: fetchError.message || 'Network error', code: 'FETCH_ERROR' };
    data = null;
  }
  } else {
    // Direct database insert (original code)
    console.log('📝 Using direct database insert...');
    const result = await supabase
      .from('rating')
      .insert(ratings)
      .select();
    
    data = result.data;
    error = result.error;
  }

  console.log('📊 Insert result:', { data, error });
  console.log('🔍 Detailed error info:', {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint
  });

  if (error) {
    console.error('❌ Database error:', error);
    
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
      console.error('🚫 Permission denied - this suggests auth context is lost during insert');
      
      Alert.alert(
        'Authentication Issue',
        'Your session may have expired. Please sign out and sign back in to fix this issue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign Out', 
            style: 'destructive',
            onPress: () => {
              supabase.auth.signOut();
            }
          }
        ]
      );
      throw new Error('Permission denied - session expired');
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
};

