// Enhanced rating submission with better auth debugging
// Replace the submitRatings function in src/services/ratings.ts with this version

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
  
  if (submission.noise > 0) {
    ratings.push({
      user_id: userId,
      property_id: submission.propertyId,
      attribute: 'noise',
      stars: submission.noise,
      user_lat: submission.userLat,
      user_lng: submission.userLng,
    });
  }
  
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
  
  // Try the insert with enhanced error logging
  const { data, error } = await supabase
    .from('rating')
    .insert(ratings)
    .select();

  console.log('📊 Insert result:', { data, error });
  console.log('🔍 Detailed error info:', {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint
  });

  if (error) {
    console.error('❌ Database error:', error);
    
    // Enhanced error handling with more specific debugging
    if (error.code === '42501' || error.message?.includes('permission denied')) {
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
    
    // Handle other errors as before...
    if (error.message?.includes('within 200 meters')) {
      Alert.alert(
        'Too Far Away',
        'You must be within 200 meters of the property to submit a rating. Please get closer and try again.',
        [{ text: 'OK' }]
      );
      throw new Error('Not within required proximity');
    }
    
    if (error.code === '23505' || error.message?.includes('duplicate key')) {
      Alert.alert(
        'Already Rated Today',
        'You have already rated this property today. You can only rate each property once per day.',
        [{ text: 'OK' }]
      );
      throw new Error('Already rated today');
    }
    
    // Generic error
    Alert.alert(
      'Submission Failed',
      `Unable to submit ratings: ${error.message}`,
      [{ text: 'OK' }]
    );
    throw new Error(`Database error: ${error.message}`);
  }

  // Success
  Alert.alert(
    'Success! 🎉',
    'Your ratings have been submitted successfully. Thank you for your feedback!',
    [{ text: 'OK' }]
  );
};

