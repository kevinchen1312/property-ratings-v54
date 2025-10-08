import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, Modal, ScrollView, ActivityIndicator, AppState, TextInput, FlatList, Keyboard, Switch, Animated, Platform, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { Loading } from '../components/Loading';
import { StarRating } from '../components/StarRating';
import ClusteredMapView from '../components/ClusteredMapView';
import { LatLng, Property } from '../lib/types';
import { RatingSubmission } from '../services/ratings';
import { calculateDistance } from '../lib/ratingService';
import { submitRatings, checkHourlyRateLimit } from '../services/ratings';
import { RootStackParamList } from '../navigation';
import { redeemReports, getUserCredits } from '../services/reportsApi';
import { supabase } from '../lib/supabase';
import { syncPendingCredits } from '../services/creditSync';
import { searchProperties } from '../services/properties';
import { sanitizeUsername } from '../lib/profanityFilter';
import { GlobalFonts } from '../styles/global';
import { FloatingMenu } from '../components/FloatingMenu';
import { preloadSounds } from '../services/noteSound';
import { EarningsScreen } from './EarningsScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { RewardsScreen } from './RewardsScreen';
import { BuyCreditsScreen } from './BuyCreditsScreen';
// Properties loaded dynamically by ClusteredMapView

const { width, height } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;

interface MapScreenProps {
  // No props needed anymore - autoOrientEnabled is managed internally
}

export const MapScreen: React.FC<MapScreenProps> = () => {
  const navigation = useNavigation<NavigationProp>();
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [permissionDenied, setPermissionDenied] = useState(false);
  // Properties are now loaded dynamically by ClusteredMapView
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [ratings, setRatings] = useState({
    safety: 0,
    quietness: 0,
    cleanliness: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [testingReports, setTestingReports] = useState(false);
  const [hasRatedRecently, setHasRatedRecently] = useState(false);
  const [lastRatingTime, setLastRatingTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [creatingTestRatings, setCreatingTestRatings] = useState(false);
  const [creditPurchaseModalVisible, setCreditPurchaseModalVisible] = useState(false);
  const [proximityMode, setProximityMode] = useState(true); // Toggle between proximity and exploration mode
  const [menuVisible, setMenuVisible] = useState(false); // Track FloatingMenu visibility to lock map rotation

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isDismissing = useRef(false);
  const keyboardHeight = useRef(new Animated.Value(30)).current;

  // Settings modal state
  const [settingsVisible, setSettingsVisible] = useState(false);
  
  // Auto-orient setting (managed internally)
  const [autoOrientEnabled, setAutoOrientEnabled] = useState(true);
  
  // Earnings modal state
  const [earningsVisible, setEarningsVisible] = useState(false);
  
  // Analytics modal state
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  
  // Rewards modal state
  const [rewardsVisible, setRewardsVisible] = useState(false);
  
  // Buy Credits modal state
  const [buyCreditsVisible, setBuyCreditsVisible] = useState(false);
  
  // Track which properties the user has rated
  const [ratedPropertyIds, setRatedPropertyIds] = useState<Set<string>>(new Set());
  
  // Leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<Array<{
    user_id: string;
    full_name: string;
    rating_count: number;
    rank: number;
  }>>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  
  // Track if Map screen is focused
  const [isMapFocused, setIsMapFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsMapFocused(true);
      return () => {
        setIsMapFocused(false);
      };
    }, [])
  );

  // Swipe-down gesture to dismiss search keyboard
  // Adjust sensitivity here:
  // - translationY: minimum downward pixels (default: 12)
  // - velocityY: minimum swipe speed pixels/sec (default: 800)
  const handleDismissSearch = useCallback(() => {
    if (isDismissing.current) return;
    
    isDismissing.current = true;
    Keyboard.dismiss();
    setShowSearchResults(false);
    setIsSearchFocused(false);
    
    setTimeout(() => {
      isDismissing.current = false;
    }, 150);
  }, []);

  const swipeDownGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 20 || event.velocityY > 1000) {
        if (!isDismissing.current && isSearchFocused) {
          handleDismissSearch();
        }
      }
    })
    .minDistance(15)
    .activeOffsetY([15, 9999])
    .failOffsetY(-10)
    .simultaneousWithExternalGesture();

  // Load auto-orient setting from AsyncStorage on mount
  useEffect(() => {
    const loadAutoOrientSetting = async () => {
      try {
        const value = await AsyncStorage.getItem('autoOrientEnabled');
        if (value !== null) {
          setAutoOrientEnabled(value === 'true');
        }
      } catch (error) {
        // Silently handle - use default value (true)
      }
    };
    loadAutoOrientSetting();
  }, []);

  // Load recently rated properties (within past hour) on mount
  useEffect(() => {
    const loadRecentlyRatedProperties = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
          .from('rating')
          .select('property_id')
          .eq('user_id', user.id)
          .gte('created_at', oneHourAgo);

        if (error) {
          // Silently handle - non-fatal
          return;
        }

        if (data && data.length > 0) {
          const recentPropertyIds = new Set(data.map(r => r.property_id));
          setRatedPropertyIds(recentPropertyIds);
          console.log(`📍 Loaded ${recentPropertyIds.size} recently rated properties`);
        } else {
          // Clear gray pins if no properties rated within the hour
          setRatedPropertyIds(new Set());
        }
      } catch (error) {
        // Silently handle - non-fatal
      }
    };

    loadRecentlyRatedProperties();
    
    // Refresh every 5 minutes to update which properties are still within the hour window
    const refreshInterval = setInterval(loadRecentlyRatedProperties, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Map ref (need to access from ClusteredMapView)
  const mapRef = useRef<MapView>(null);

  // Function to center map on user location with proper zoom
  const centerOnUserLocation = useCallback(() => {
    if (location && mapRef.current) {
      mapRef.current.animateCamera({
        center: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        pitch: 45, // 3D tilt angle
        altitude: 200, // Lower altitude = more zoomed in
        zoom: 19, // Higher zoom = closer view
      }, { duration: 1000 }); // 1 second animation
    }
  }, [location]);

  // Debounce timer and latest query tracking
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestSearchQueryRef = useRef<string>('');

  // Keyboard listeners for search bar positioning with animation
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: Math.max((e.duration || 250) * 0.7, 150), // 70% of keyboard duration, min 150ms
        useNativeDriver: false,
      }).start();
    });
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 30,
        duration: Math.max((e.duration || 250) * 0.7, 150), // 70% of keyboard duration, min 150ms
        useNativeDriver: false,
      }).start();
    });
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: 0,
        useNativeDriver: false,
      }).start();
    });
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardHeight, {
        toValue: 30,
        duration: 0,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [keyboardHeight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Search for properties with debouncing
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    latestSearchQueryRef.current = query;
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    // Show loading
    setIsSearching(true);
    
    // Debounce: wait 200ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      const searchQuery = query; // Capture current query
      
      try {
        const results = await searchProperties(searchQuery);
        
        // Only update if this is still the latest search
        if (searchQuery === latestSearchQueryRef.current) {
          setSearchResults(results);
          setShowSearchResults(true);
        }
      } catch (error) {
        // Only update if this is still the latest search
        if (searchQuery === latestSearchQueryRef.current) {
          setSearchResults([]);
          setShowSearchResults(false);
        }
      } finally {
        // Only update loading if this is still the latest search
        if (searchQuery === latestSearchQueryRef.current) {
          setIsSearching(false);
        }
      }
    }, 300);
  }, []);

  // Handle map press - dismiss keyboard and search
  const handleMapPress = useCallback(() => {
    Keyboard.dismiss();
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
  }, []);

  // Handle selecting a search result
  const handleSelectSearchResult = useCallback((property: Property) => {
    // Close search results
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
    Keyboard.dismiss();

    // Zoom to the property
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: property.lat,
        longitude: property.lng,
        latitudeDelta: 0.0015,
        longitudeDelta: 0.0015,
      }, 1000);
    }

    // Open the property details modal after a short delay
    setTimeout(() => {
      handleMarkerPress(property);
    }, 1100);
  }, [handleMarkerPress]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const setupLocationAndData = async () => {
      try {
        setLoadingMessage('Requesting location permission...');
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setPermissionDenied(true);
          setLoading(false);
          Alert.alert(
            'Permission Denied',
            'Location permission is required to show your position on the map.',
            [{ text: 'OK' }]
          );
          return;
        }

        setLoadingMessage('Getting your location...');
        // Get initial position
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const initialCoords: LatLng = {
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        };

        setLocation(initialCoords);

        // Properties are now loaded dynamically by ClusteredMapView
        setLoadingMessage('Setting up map...');

        // Watch position changes
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 10,
          },
          (newLocation) => {
            const newCoords: LatLng = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };
            setLocation(newCoords);
            
                // Update distance if property is selected
                if (selectedProperty) {
                  const dist = calculateDistance(
                    newCoords.latitude,
                    newCoords.longitude,
                    selectedProperty.lat,
                    selectedProperty.lng
                  );
                  setDistance(dist);
                }
          }
        );

        setLoading(false);
      } catch (error) {
        setLoading(false);
        Alert.alert(
          'Location Error',
          'Failed to get your location. Please try again.',
          [{ text: 'OK' }]
        );
      }
    };

    setupLocationAndData();

    // Cleanup subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [selectedProperty]);

  const handleMarkerPress = useCallback(async (property: Property) => {
    setSelectedProperty(property);
    setRatings({ safety: 0, quietness: 0, cleanliness: 0 });
    setShowLeaderboard(false);
    setLeaderboardData([]);
    
    if (location) {
      const dist = calculateDistance(
        location.latitude,
        location.longitude,
        property.lat,
        property.lng
      );
      setDistance(dist);
    }

    // Check if user has already rated this property within the hour
    const rateLimitCheck = await checkHourlyRateLimit(property.id);
    setHasRatedRecently(rateLimitCheck.isRateLimited);
    setLastRatingTime(rateLimitCheck.lastRatingTime || null);
    
    setModalVisible(true);
  }, [location]);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setSelectedProperty(null);
    setRatings({ safety: 0, quietness: 0, cleanliness: 0 });
    setDistance(0);
    setHasRatedRecently(false);
    setLastRatingTime(null);
    setCountdown('');
    setShowLeaderboard(false);
    setLeaderboardData([]);
  }, []);


  const handleRatingChange = useCallback((attribute: string, rating: number) => {
    setRatings(prev => ({ ...prev, [attribute]: rating }));
  }, []);

  const handleSubmitRatings = useCallback(async () => {
    if (!selectedProperty || !location) return;

    const submission: RatingSubmission = {
      propertyId: selectedProperty.id,
      safety: ratings.safety,
      quietness: ratings.quietness,
      cleanliness: ratings.cleanliness,
      userLat: location.latitude,
      userLng: location.longitude,
    };

    setSubmitting(true);
    try {
      await submitRatings(submission);
      
      // Add property to rated set (turns pin gray)
      setRatedPropertyIds(prev => new Set(prev).add(selectedProperty.id));
      
      // Update rate limit status after successful submission
      const rateLimitCheck = await checkHourlyRateLimit(selectedProperty.id);
      setHasRatedRecently(rateLimitCheck.isRateLimited);
      setLastRatingTime(rateLimitCheck.lastRatingTime || null);
      
      handleModalClose();
    } catch (error: any) {
      // Error handling is done in the service with user-friendly alerts
      // Silently handle - already shown to user
    } finally {
      setSubmitting(false);
    }
  }, [selectedProperty, location, ratings, handleModalClose]);

  // Fetch leaderboard data for selected property
  const fetchLeaderboard = useCallback(async (propertyId: string) => {
    setLoadingLeaderboard(true);
    try {
      const { data, error } = await supabase
        .from('rating')
        .select(`
          user_id,
          app_user!inner(full_name)
        `)
        .eq('property_id', propertyId);

      if (error) throw error;

      // Count ratings per user
      const userCounts: { [userId: string]: { full_name: string; count: number } } = {};
      
      if (data) {
        data.forEach((rating: any) => {
          const userId = rating.user_id;
          const rawName = rating.app_user?.full_name || 'Anonymous';
          // Sanitize username to censor profanity
          const fullName = sanitizeUsername(rawName);
          
          if (!userCounts[userId]) {
            userCounts[userId] = { full_name: fullName, count: 0 };
          }
          userCounts[userId].count += 1;
        });
      }

      // Convert to array and sort by rating count
      const leaderboard = Object.entries(userCounts)
        .map(([userId, data]) => ({
          user_id: userId,
          full_name: data.full_name,
          rating_count: data.count,
          rank: 0,
        }))
        .sort((a, b) => b.rating_count - a.rating_count)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaderboardData(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      Alert.alert('Error', 'Failed to load leaderboard');
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  // Toggle leaderboard view
  const toggleLeaderboard = useCallback(() => {
    if (!showLeaderboard && selectedProperty) {
      fetchLeaderboard(selectedProperty.id);
    }
    setShowLeaderboard(prev => !prev);
  }, [showLeaderboard, selectedProperty, fetchLeaderboard]);

  // Test functions

  const testDebitCredits = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      console.log('Testing debit_credits function...');
      const { data: deductSuccess, error: deductError } = await supabase.rpc('debit_credits', {
        p_user: session.session.user.id,
        p_amount: 1
      });

      console.log('Debit test result:', { deductSuccess, deductError });

      if (deductError) {
        Alert.alert('Debit Test Failed', `Error: ${deductError.message}`);
      } else if (deductSuccess) {
        // Refresh credits
        const updatedCredits = await getUserCredits();
        setUserCredits(updatedCredits);
        Alert.alert('Debit Test Success', `Successfully deducted 1 credit. New balance: ${updatedCredits}`);
      } else {
        Alert.alert('Debit Test Failed', 'Function returned false - insufficient credits or other issue');
      }
    } catch (error: any) {
      Alert.alert('Debit Test Error', error.message);
    }
  }, []);

  const createTestRatings = useCallback(async () => {
    if (creatingTestRatings) return;
    
    try {
      setCreatingTestRatings(true);
      
      // Use the Merriman Road property
      const propertyId = '364607cd-69fb-4e8a-9b20-4ff4ce6758e7';
      const propertyLat = 37.313964;
      const propertyLng = -122.069473;
      
      Alert.alert(
        'Create Test Ratings',
        'This will add some test ratings to the Merriman Road property so you can test the revenue sharing system.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Ratings', 
            onPress: async () => {
              try {
                // Create a few test ratings for the current user
                const testRatings = [
                  { attribute: 'safety', stars: 5 },
                  { attribute: 'quietness', stars: 4 },
                  { attribute: 'cleanliness', stars: 3 }
                ];
                
                for (const rating of testRatings) {
                  const submission: RatingSubmission = {
                    propertyId: propertyId,
                    safety: rating.attribute === 'safety' ? rating.stars : 0,
                    quietness: rating.attribute === 'quietness' ? rating.stars : 0,
                    cleanliness: rating.attribute === 'cleanliness' ? rating.stars : 0,
                    userLat: propertyLat + (Math.random() - 0.5) * 0.001, // Within 100m
                    userLng: propertyLng + (Math.random() - 0.5) * 0.001,
                  };
                  
                  await submitRatings(submission);
                  // Small delay to avoid rate limiting
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                Alert.alert(
                  'Test Ratings Created! ✅',
                  'You now have ratings for the Merriman Road property. Go to the Earnings screen and test the revenue sharing!',
                  [{ text: 'Great!' }]
                );
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to create test ratings');
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start test');
    } finally {
      setCreatingTestRatings(false);
    }
  }, [creatingTestRatings]);

  const handleCreditPurchaseComplete = useCallback(async () => {
    // Refresh credits after purchase
    const updatedCredits = await getUserCredits();
    setUserCredits(updatedCredits);
  }, []);

  const handleTestReports = useCallback(async () => {
    if (!selectedProperty) {
      Alert.alert('Error', 'Please select a property first');
      return;
    }

    setTestingReports(true);
    try {
      const result = await redeemReports([selectedProperty.id]);
      if (result.ok) {
        // Refresh credits after successful report generation
        const updatedCredits = await getUserCredits();
        setUserCredits(updatedCredits);
        
        Alert.alert('Report Generated!', 'Your property report has been generated and will be sent to your email shortly.');
      } else {
        Alert.alert('Error', result.message || 'Failed to generate reports');
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to generate reports: ${error.message}`);
    } finally {
      setTestingReports(false);
    }
  }, [selectedProperty]);

  // Auto-sync pending credits
  const syncPendingCreditsAndUpdate = async () => {
    console.log('🚀 Manual sync triggered');
    try {
      const result = await syncPendingCredits();
      console.log('🔄 Sync result:', result);
      if (result.creditsAdded > 0) {
        console.log(`🎉 Auto-synced ${result.creditsAdded} credits from ${result.completed} purchases`);
        // Refresh credits display
        const credits = await getUserCredits();
        setUserCredits(credits);
        const creditText = result.creditsAdded === 1 ? 'credit' : 'credits';
        Alert.alert(
          'Credits Added! 🎉',
          `${result.creditsAdded} ${creditText} ${result.creditsAdded === 1 ? 'has' : 'have'} been added to your account!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      // Silently handle - non-fatal
    }
  };

  // Load user credits on mount
  useEffect(() => {
    const loadCredits = async () => {
      const credits = await getUserCredits();
      setUserCredits(credits);
      
      // NOTE: Auto-sync disabled to prevent premature credit completion
      // Credits will be added via Stripe webhooks after successful payment
    };
    loadCredits();
    
    // Preload note sounds in the background
    preloadSounds();
  }, []);

  // Auto-refresh when app comes back into focus
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active - refreshing credit balance');
        // Just refresh credits without completing any purchases
        // The webhook is responsible for completing purchases
        try {
          const currentCredits = await getUserCredits();
          setUserCredits(currentCredits);
        } catch (error) {
          console.error('Failed to refresh credits:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // NOTE: Periodic credit sync disabled to prevent premature credit completion
  // Credits will be added via Stripe webhooks after successful payment

  // Countdown timer for rate limiting
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (hasRatedRecently && lastRatingTime) {
      const updateCountdown = () => {
        const lastRating = new Date(lastRatingTime);
        const oneHourLater = new Date(lastRating.getTime() + 60 * 60 * 1000);
        const now = new Date();
        const timeLeft = oneHourLater.getTime() - now.getTime();
        
        if (timeLeft <= 0) {
          setHasRatedRecently(false);
          setLastRatingTime(null);
          setCountdown('');
          if (interval) clearInterval(interval);
        } else {
          const minutes = Math.floor(timeLeft / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          setCountdown(`${minutes}m ${seconds}s`);
        }
      };
      
      updateCountdown(); // Initial call
      interval = setInterval(updateCountdown, 1000);
    } else {
      setCountdown('');
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hasRatedRecently, lastRatingTime]);


  const isWithinRange = distance <= 200;
  const hasAtLeastOneRating = ratings.safety > 0 || ratings.quietness > 0 || ratings.cleanliness > 0;
  const canSubmit = isWithinRange && hasAtLeastOneRating && !submitting && !hasRatedRecently;

  if (loading) {
    return <Loading message={loadingMessage} />;
  }

  if (permissionDenied) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Location permission is required to use this feature.
        </Text>
        <Text style={styles.errorSubtext}>
          Please enable location access in your device settings.
        </Text>
      </View>
    );
  }

  if (!location) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <Animated.View style={[styles.searchContainer, { 
        bottom: Animated.add(keyboardHeight, 10)
      }]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search any address to find a Leadalbum..."
          value={searchQuery}
          onChangeText={handleSearch}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {isSearching && (
          <ActivityIndicator style={styles.searchLoader} size="small" color="#7C3AED" />
        )}
      </Animated.View>
      
      {/* Swipe-down gesture overlay when keyboard is visible */}
      {isSearchFocused && (
        <GestureDetector gesture={swipeDownGesture}>
          <Animated.View style={[styles.swipeOverlay, { 
            bottom: 0,
            height: Animated.add(keyboardHeight, 60)
          }]} />
        </GestureDetector>
      )}

      {/* Search Results Dropdown */}
      {showSearchResults && searchResults.length > 0 && (
        <Animated.View 
          style={[styles.searchResultsContainer, { 
            bottom: Animated.add(keyboardHeight, 54)
          }]}
        >
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.searchResultItem}>
                <TouchableOpacity
                  style={styles.searchResultContent}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <View style={styles.searchResultTextContainer}>
                    <Text style={styles.searchResultName}>{item.name}</Text>
                    <Text style={styles.searchResultAddress}>{item.address}</Text>
                    {item.isNew ? (
                      <Text style={styles.searchResultNew}>
                        🌍 New location - 0 ratings
                      </Text>
                    ) : (
                      <Text style={styles.searchResultRatings}>
                        {item.rating_count || 0} rating{(item.rating_count || 0) !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.searchResultButton}
                  onPress={async () => {
                    setShowSearchResults(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    Keyboard.dismiss();
                    
                    let propertyId = item.id;
                    
                    // If this is a new property from worldwide search, add it to DB first
                    if (item.isNew) {
                      try {
                        const { data, error } = await supabase
                          .from('property')
                          .insert({
                            name: item.name,
                            address: item.address,
                            lat: item.lat,
                            lng: item.lng
                          })
                          .select()
                          .single();
                        
                        if (error) throw error;
                        if (data) {
                          propertyId = data.id;
                        }
                      } catch (error) {
                        Alert.alert('Error', 'Failed to add property to database');
                        return;
                      }
                    }
                    
                    // Purchase report for this property
                    setTestingReports(true);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      const result = await redeemReports([propertyId], user?.email);
                      Alert.alert('Success', `Report sent to ${user?.email}!`);
                    } catch (error: any) {
                      Alert.alert('Error', error.message || 'Failed to purchase report');
                    } finally {
                      setTestingReports(false);
                      const updatedCredits = await getUserCredits();
                      setUserCredits(updatedCredits);
                    }
                  }}
                >
                  <Text style={styles.searchResultButtonText}>📊 Buy (1cr)</Text>
                </TouchableOpacity>
              </View>
            )}
            style={styles.searchResultsList}
            keyboardShouldPersistTaps="handled"
          />
        </Animated.View>
      )}
      
      <ClusteredMapView
        properties={[]} // Empty array - properties loaded dynamically
        onPropertyPress={handleMarkerPress}
        onMapPress={handleMapPress}
        initialRegion={location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0015, // Same zoom as center button - street level view
          longitudeDelta: 0.0015, // Same zoom as center button
        } : {
          latitude: 37.320, // Centered between Cupertino and San Jose
          longitude: -122.040, // Centered between Cupertino and San Jose  
          latitudeDelta: 0.08, // Wider view to show both cities
          longitudeDelta: 0.08, // Wider view to show both cities
        }}
        userLocation={location}
        selectedProperty={selectedProperty}
        enableProximityLoading={proximityMode}
        ratedPropertyIds={ratedPropertyIds}
        autoOrientEnabled={autoOrientEnabled}
        lockRotation={menuVisible || modalVisible || settingsVisible || earningsVisible || analyticsVisible || rewardsVisible || buyCreditsVisible}
        style={styles.map}
        ref={mapRef}
      />
      
      {/* CIRCLES NOW RENDERED INSIDE ClusteredMapView */}
      {/* Center button now handled by ClusteredMapView component */}
      {false && location && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <MapView
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            pointerEvents="none"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Circle
              center={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              radius={75} // 75 meters OSM proximity radius
              strokeColor="rgba(34, 197, 94, 0.6)" // Green color for user proximity
              fillColor="rgba(34, 197, 94, 0.1)"
              strokeWidth={2}
            />
          </MapView>
        </View>
      )}
      
      {/* 200m circle around selected property - NOW INSIDE ClusteredMapView */}
      {false && selectedProperty && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <MapView
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: selectedProperty.lat,
              longitude: selectedProperty.lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            pointerEvents="none"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Circle
              center={{
                latitude: selectedProperty.lat,
                longitude: selectedProperty.lng,
              }}
              radius={200} // 200 meters
              strokeColor="rgba(0, 122, 255, 0.5)"
              fillColor="rgba(0, 122, 255, 0.1)"
              strokeWidth={2}
            />
          </MapView>
        </View>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {showLeaderboard ? 'Billboard' : 'Sing a Leadsong'}
            </Text>
            <TouchableOpacity onPress={handleModalClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedProperty && !showLeaderboard && (
              <>
                <View style={styles.propertyHeaderContainer}>
                  <View style={styles.propertyTitleContainer}>
                    <Text style={styles.propertyName}>{selectedProperty.name}</Text>
                    {!hasRatedRecently && (
                      <TouchableOpacity 
                        onPress={() => Alert.alert(
                          'How to Rate',
                          'Tap stars to rate • Tap the same star again to remove rating • At least one rating required',
                          [{ text: 'Got it' }]
                        )}
                        style={styles.helpButton}
                      >
                        <Text style={styles.helpButtonText}>?</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.propertyAddress}>
                    {(() => {
                      // Format address: "City, State Zip"
                      const parts = selectedProperty.address.split(',').map(p => p.trim());
                      if (parts.length >= 3) {
                        // Assume format: "Number Street, City, State Zip" or "Number Street, City, Zip"
                        const city = parts[parts.length - 2] || '';
                        const stateZip = parts[parts.length - 1] || '';
                        return `${city}, ${stateZip}`;
                      }
                      return selectedProperty.address;
                    })()}
                  </Text>
                </View>
                
                {!isWithinRange && (
                  <Text style={[styles.distanceText, styles.distanceWarning]}>
                    Distance: {Math.round(distance)}m (Must be within 200m to rate)
                  </Text>
                )}
                
                {hasRatedRecently && (
                  <View style={styles.rateLimitContainer}>
                    <Text style={styles.alreadyRatedText}>
                      You have rated this property within the hour
                    </Text>
                    {countdown && (
                      <Text style={styles.countdownText}>
                        You can rate again in: {countdown}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.ratingsContainer}>
                  <StarRating
                    label="Safety"
                    rating={ratings.safety}
                    onRatingChange={(rating) => handleRatingChange('safety', rating)}
                    disabled={!isWithinRange || hasRatedRecently}
                  />
                  <StarRating
                    label="Quietness"
                    rating={ratings.quietness}
                    onRatingChange={(rating) => handleRatingChange('quietness', rating)}
                    disabled={!isWithinRange || hasRatedRecently}
                  />
                  <StarRating
                    label="Cleanliness"
                    rating={ratings.cleanliness}
                    onRatingChange={(rating) => handleRatingChange('cleanliness', rating)}
                    disabled={!isWithinRange || hasRatedRecently}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, !canSubmit && styles.disabledButton]}
                  onPress={handleSubmitRatings}
                  disabled={!canSubmit}
                >
                  {submitting ? (
                    <View style={styles.submittingContainer}>
                      <ActivityIndicator size="small" color="#fff" style={styles.submitLoader} />
                      <Text style={styles.submitButtonText}>Producing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitButtonText}>Produce your song</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={handleTestReports}
                  disabled={testingReports}
                >
                  <Text style={styles.previewButtonText}>
                    {testingReports ? 'Pressing vinyl...' : 'Buy a record (1 credit)'}
                  </Text>
                </TouchableOpacity>

                {/* Leaderboard Button */}
                <TouchableOpacity
                  style={styles.leaderboardToggleButton}
                  onPress={toggleLeaderboard}
                >
                  <Text style={styles.leaderboardToggleButtonText}>
                    Billboard
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Leaderboard View */}
            {selectedProperty && showLeaderboard && (
              <View style={styles.leaderboardContainer}>
                {/* Back to Rating Button */}
                <TouchableOpacity
                  style={styles.backToRatingButton}
                  onPress={toggleLeaderboard}
                >
                  <Text style={styles.backToRatingButtonText}>
                    ← Back to Song
                  </Text>
                </TouchableOpacity>

                {loadingLeaderboard ? (
                  <View style={styles.leaderboardLoading}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.loadingText}>Loading leaderboard...</Text>
                  </View>
                ) : leaderboardData.length === 0 ? (
                  <View style={styles.emptyLeaderboard}>
                    <Text style={styles.emptyLeaderboardText}>🏆</Text>
                    <Text style={styles.emptyLeaderboardTitle}>No Ratings Yet</Text>
                    <Text style={styles.emptyLeaderboardSubtitle}>
                      Be the first to rate this property!
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.leaderboardHeader}>
                      <Text style={styles.leaderboardTitle}>
                        Top Contributors for {selectedProperty.name}
                      </Text>
                      <Text style={styles.leaderboardSubtitle}>
                        {leaderboardData.length} {leaderboardData.length === 1 ? 'contributor' : 'contributors'}
                      </Text>
                    </View>
                    <View style={styles.leaderboardList}>
                      {leaderboardData.map((entry, index) => (
                        <View 
                          key={entry.user_id} 
                          style={[
                            styles.leaderboardItem,
                            index < 3 && styles[`leaderboardTop${index + 1}` as 'leaderboardTop1' | 'leaderboardTop2' | 'leaderboardTop3']
                          ]}
                        >
                          <View style={styles.leaderboardRank}>
                            <Text style={styles.leaderboardRankText}>
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                            </Text>
                          </View>
                          <View style={styles.leaderboardInfo}>
                            <Text style={styles.leaderboardName} numberOfLines={1}>
                              {entry.full_name}
                            </Text>
                            <Text style={styles.leaderboardCount}>
                              {entry.rating_count} {entry.rating_count === 1 ? 'rating' : 'ratings'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.settingsContainer}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.settingsCloseButton}>
              <Text style={styles.settingsCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingsContent}>
            {/* Auto-Orient Toggle */}
            <View style={styles.settingsOption}>
              <View style={styles.settingRow}>
                <Text style={styles.settingsOptionText}>Auto-Orient Map</Text>
                <Switch
                  value={autoOrientEnabled}
                  onValueChange={async (value) => {
                    try {
                      // Update state immediately for instant effect
                      setAutoOrientEnabled(value);
                      // Save to AsyncStorage for persistence
                      await AsyncStorage.setItem('autoOrientEnabled', value.toString());
                    } catch (error) {
                      Alert.alert('Error', 'Failed to save setting');
                    }
                  }}
                  trackColor={{ false: '#d1d1d6', true: '#7C3AED' }}
                  thumbColor="#fff"
                  ios_backgroundColor="#d1d1d6"
                />
              </View>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity 
              style={styles.settingsOption} 
              onPress={async () => {
                setSettingsVisible(false);
                Alert.alert(
                  'Sign Out',
                  'Are you sure you want to sign out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign Out',
                      style: 'destructive',
                      onPress: async () => {
                        const { signOut } = await import('../lib/auth');
                        const { error } = await signOut();
                        if (error) {
                          Alert.alert('Error', 'Failed to sign out');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.settingsOptionText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Earnings Modal */}
      <EarningsScreen
        visible={earningsVisible}
        onClose={() => setEarningsVisible(false)}
      />

      {/* Analytics Modal */}
      <AnalyticsScreen
        visible={analyticsVisible}
        onClose={() => setAnalyticsVisible(false)}
      />

      {/* Rewards Modal */}
      <RewardsScreen
        visible={rewardsVisible}
        onClose={() => setRewardsVisible(false)}
      />

      {/* Buy Credits Modal */}
      <BuyCreditsScreen
        visible={buyCreditsVisible}
        onClose={() => setBuyCreditsVisible(false)}
      />

      {/* Floating Menu Button - Rendered last for highest z-index */}
      <FloatingMenu
        credits={userCredits}
        onBuyCredits={() => {
          console.log('MapScreen: Buy Credits pressed');
          setBuyCreditsVisible(true);
        }}
        onEarnings={() => {
          console.log('MapScreen: Earnings pressed');
          setEarningsVisible(true);
        }}
        onAnalytics={() => {
          console.log('MapScreen: Analytics pressed');
          setAnalyticsVisible(true);
        }}
        onRewards={() => {
          console.log('MapScreen: Rewards pressed');
          setRewardsVisible(true);
        }}
        onSettings={() => {
          console.log('MapScreen: Settings pressed');
          setSettingsVisible(true);
        }}
        onMenuVisibilityChange={setMenuVisible}
        isScreenFocused={isMapFocused}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    width: width,
    height: height,
  },
  redMarker: {
    backgroundColor: '#FF0000',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerEmoji: {
    fontSize: 20,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 18,
    fontFamily: GlobalFonts.regular,
    color: '#7C3AED',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  propertyHeaderContainer: {
    marginBottom: 16,
  },
  propertyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  propertyName: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    flex: 1,
  },
  helpButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  propertyAddress: {
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#666',
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
    marginBottom: 20,
  },
  distanceWarning: {
    color: '#7C3AED',
  },
  rateLimitContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  alreadyRatedText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
    marginBottom: 8,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: GlobalFonts.regular,
    color: '#7C3AED',
    textAlign: 'center',
    backgroundColor: '#F5F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  instructionText: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ratingsContainer: {
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLoader: {
    marginRight: 8,
  },
  previewButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  // Leaderboard toggle button (below purchase button)
  leaderboardToggleButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  leaderboardToggleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  // Leaderboard styles
  leaderboardContainer: {
    flex: 1,
  },
  backToRatingButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  backToRatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
  leaderboardLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#666',
  },
  emptyLeaderboard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyLeaderboardText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyLeaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 8,
  },
  emptyLeaderboardSubtitle: {
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    textAlign: 'center',
  },
  leaderboardHeader: {
    marginBottom: 20,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 8,
  },
  leaderboardSubtitle: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
  },
  leaderboardList: {
    gap: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  leaderboardTop1: {
    backgroundColor: '#F5F0FF',
    borderColor: '#7C3AED',
  },
  leaderboardTop2: {
    backgroundColor: '#F5F5F5',
    borderColor: '#C0C0C0',
  },
  leaderboardTop3: {
    backgroundColor: '#F5F0FF',
    borderColor: '#7C3AED',
  },
  leaderboardRank: {
    width: 50,
    alignItems: 'center',
  },
  leaderboardRankText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 4,
  },
  leaderboardCount: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
  },
  // Settings modal styles
  settingsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#7C3AED',
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#fff',
  },
  settingsCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsCloseButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#fff',
  },
  settingsContent: {
    flex: 1,
    padding: 20,
  },
  settingsOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  settingsOptionText: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: GlobalFonts.bold,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginTop: 4,
  },
  centerButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  centerButtonText: {
    fontSize: 28,
  },
  swipeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 1001,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  searchLoader: {
    position: 'absolute',
    right: 12,
  },
  searchResultsContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    maxHeight: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1002,
  },
  searchResultsList: {
    maxHeight: 400,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchResultContent: {
    flex: 1,
    paddingRight: 12,
  },
  searchResultTextContainer: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 4,
  },
  searchResultRatings: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
    fontFamily: GlobalFonts.regular,
  },
  searchResultNew: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
    fontFamily: GlobalFonts.regular,
  },
  searchResultButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchResultButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
});
