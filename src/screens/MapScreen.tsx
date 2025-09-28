import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, Modal, ScrollView, ActivityIndicator, AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { CreditPurchaseModal } from '../components/CreditPurchaseModal';
import { syncPendingCredits } from '../services/creditSync';
// Properties loaded dynamically by ClusteredMapView

const { width, height } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;

export const MapScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [permissionDenied, setPermissionDenied] = useState(false);
  // Properties are now loaded dynamically by ClusteredMapView
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [ratings, setRatings] = useState({
    noise: 0,
    safety: 0,
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

  // Map ref
  const mapRef = useRef<MapView>(null);

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
        console.error('Error setting up location:', error);
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
    setRatings({ noise: 0, safety: 0, cleanliness: 0 });
    
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
    setRatings({ noise: 0, safety: 0, cleanliness: 0 });
    setDistance(0);
    setHasRatedRecently(false);
    setLastRatingTime(null);
    setCountdown('');
  }, []);


  const handleRatingChange = useCallback((attribute: string, rating: number) => {
    setRatings(prev => ({ ...prev, [attribute]: rating }));
  }, []);

  const handleSubmitRatings = useCallback(async () => {
    if (!selectedProperty || !location) return;

    const submission: RatingSubmission = {
      propertyId: selectedProperty.id,
      noise: ratings.noise,
      safety: ratings.safety,
      cleanliness: ratings.cleanliness,
      userLat: location.latitude,
      userLng: location.longitude,
    };

    setSubmitting(true);
    try {
      await submitRatings(submission);
      
      // Update rate limit status after successful submission
      const rateLimitCheck = await checkHourlyRateLimit(selectedProperty.id);
      setHasRatedRecently(rateLimitCheck.isRateLimited);
      setLastRatingTime(rateLimitCheck.lastRatingTime || null);
      
      handleModalClose();
    } catch (error: any) {
      // Error handling is done in the service with user-friendly alerts
      console.error('Rating submission error:', error);
    } finally {
      setSubmitting(false);
    }
  }, [selectedProperty, location, ratings, handleModalClose]);

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
                  { attribute: 'noise', stars: 4 },
                  { attribute: 'safety', stars: 5 },
                  { attribute: 'cleanliness', stars: 3 }
                ];
                
                for (const rating of testRatings) {
                  const submission: RatingSubmission = {
                    propertyId: propertyId,
                    noise: rating.attribute === 'noise' ? rating.stars : 0,
                    safety: rating.attribute === 'safety' ? rating.stars : 0,
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
      console.error('Auto-sync failed:', error);
    }
  };

  // Load user credits on mount and sync pending purchases
  useEffect(() => {
    const loadCredits = async () => {
      const credits = await getUserCredits();
      setUserCredits(credits);
      
      // Auto-sync pending credits on app load (safe version)
      try {
        const syncResult = await syncPendingCredits();
        if (syncResult.creditsAdded > 0) {
          const updatedCredits = await getUserCredits();
          setUserCredits(updatedCredits);
          console.log(`🎉 Auto-synced ${syncResult.creditsAdded} credits on app load`);
          // Show subtle notification instead of alert
          setTimeout(() => {
            Alert.alert(
              'Credits Added! 🎉',
              `${syncResult.creditsAdded} credit${syncResult.creditsAdded === 1 ? '' : 's'} from recent purchases ${syncResult.creditsAdded === 1 ? 'has' : 'have'} been added to your account!`,
              [{ text: 'OK' }]
            );
          }, 1000);
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    };
    loadCredits();
  }, []);

  // Auto-refresh when app comes back into focus (safe - only refreshes UI)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active - refreshing credit balance');
        try {
          // First, try to sync any pending credits (this is the key fix!)
          const syncResult = await syncPendingCredits();
          if (syncResult.creditsAdded > 0) {
            console.log(`🎉 Auto-synced ${syncResult.creditsAdded} credits on app focus`);
            const updatedCredits = await getUserCredits();
            setUserCredits(updatedCredits);
            Alert.alert(
              'Credits Added! 🎉',
              `${syncResult.creditsAdded} credit${syncResult.creditsAdded === 1 ? '' : 's'} from recent purchases ${syncResult.creditsAdded === 1 ? 'has' : 'have'} been added to your account!`,
              [{ text: 'OK' }]
            );
          } else {
            // No pending credits, just refresh the UI from database
            const currentCredits = await getUserCredits();
            setUserCredits(currentCredits);
          }
        } catch (error) {
          console.error('Auto-sync/refresh failed:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [userCredits]);

  // Periodic credit sync check (every 30 seconds when app is active)
  useEffect(() => {
    const periodicSync = async () => {
      try {
        const syncResult = await syncPendingCredits();
        if (syncResult.creditsAdded > 0) {
          console.log(`🔄 Periodic sync added ${syncResult.creditsAdded} credits`);
          const updatedCredits = await getUserCredits();
          setUserCredits(updatedCredits);
          Alert.alert(
            'Credits Added! 🎉',
            `${syncResult.creditsAdded} credit${syncResult.creditsAdded === 1 ? '' : 's'} from recent purchases ${syncResult.creditsAdded === 1 ? 'has' : 'have'} been added to your account!`,
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Periodic sync failed:', error);
      }
    };

    // Run periodic sync every 30 seconds
    const interval = setInterval(periodicSync, 30000);
    
    return () => clearInterval(interval);
  }, []);

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
  const hasAtLeastOneRating = ratings.noise > 0 || ratings.safety > 0 || ratings.cleanliness > 0;
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
      {/* Credit Controls */}
      <View style={styles.creditControls}>
        <Text style={styles.creditsText}>Credits: {userCredits}</Text>
        <TouchableOpacity 
          style={[styles.creditButton, styles.buyCreditsButton]} 
          onPress={() => setCreditPurchaseModalVisible(true)}
        >
          <Text style={styles.creditButtonText}>
            💳 Buy Credits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.testButton, styles.earningsButton]} 
          onPress={() => navigation.navigate('Earnings')}
        >
          <Text style={styles.testButtonText}>
            💰 Earnings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.testButton, styles.analyticsButton]} 
          onPress={() => navigation.navigate('Analytics')}
        >
          <Text style={styles.testButtonText}>
            📊 Analytics
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.testButton, styles.testRatingsButton]} 
          onPress={createTestRatings}
          disabled={creatingTestRatings}
        >
          <Text style={styles.testButtonText}>
            {creatingTestRatings ? 'Creating...' : '🧪 Add Test Ratings'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.testButton, styles.syncButton]} 
          onPress={syncPendingCreditsAndUpdate}
        >
          <Text style={styles.testButtonText}>
            🔄 Sync Credits
          </Text>
        </TouchableOpacity>
      </View>
      
      <ClusteredMapView
        properties={[]} // Empty array - properties loaded dynamically by viewport
        onPropertyPress={handleMarkerPress}
        initialRegion={{
          latitude: 37.320, // Centered between Cupertino and San Jose
          longitude: -122.040, // Centered between Cupertino and San Jose  
          latitudeDelta: 0.08, // Wider view to show both cities
          longitudeDelta: 0.08, // Wider view to show both cities
        }}
        style={styles.map}
      />
      
      {/* 200m circle around selected property - overlay on clustered map */}
      {selectedProperty && (
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
            <Text style={styles.modalTitle}>Rate Property</Text>
            <TouchableOpacity onPress={handleModalClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedProperty && (
              <>
                <Text style={styles.propertyName}>{selectedProperty.name}</Text>
                <Text style={styles.propertyAddress}>{selectedProperty.address}</Text>
                <Text style={[styles.distanceText, !isWithinRange && styles.distanceWarning]}>
                  Distance: {Math.round(distance)}m {!isWithinRange && '(Must be within 200m to rate)'}
                </Text>
                
                {hasRatedRecently && (
                  <View style={styles.rateLimitContainer}>
                    <Text style={styles.alreadyRatedText}>
                      ✅ You have already rated this property within the hour
                    </Text>
                    {countdown && (
                      <Text style={styles.countdownText}>
                        ⏱️ You can rate again in: {countdown}
                      </Text>
                    )}
                  </View>
                )}

                
                {!hasRatedRecently && (
                  <Text style={styles.instructionText}>
                    Tap stars to rate • Tap the same star again to remove rating • At least one rating required
                  </Text>
                )}

                <View style={styles.ratingsContainer}>
                  <StarRating
                    label="Noise Level"
                    rating={ratings.noise}
                    onRatingChange={(rating) => handleRatingChange('noise', rating)}
                    disabled={!isWithinRange || hasRatedRecently}
                  />
                  <StarRating
                    label="Safety"
                    rating={ratings.safety}
                    onRatingChange={(rating) => handleRatingChange('safety', rating)}
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
                      <Text style={styles.submitButtonText}>Submitting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Ratings</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={handleTestReports}
                  disabled={testingReports}
                >
                  <Text style={styles.previewButtonText}>
                    {testingReports ? '📊 Generating Report...' : '📊 Generate Report'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <CreditPurchaseModal
        visible={creditPurchaseModalVisible}
        onClose={() => setCreditPurchaseModalVisible(false)}
        onPurchaseComplete={handleCreditPurchaseComplete}
        currentCredits={userCredits}
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
    color: '#333',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  propertyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  propertyAddress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 20,
  },
  distanceWarning: {
    color: '#FF3B30',
  },
  rateLimitContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  alreadyRatedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 8,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9500',
    textAlign: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ratingsContainer: {
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Credit controls styles
  creditControls: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  creditsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  testButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  reportsButton: {
    backgroundColor: '#34C759',
  },
  earningsButton: {
    backgroundColor: '#FF9500',
  },
  analyticsButton: {
    backgroundColor: '#007AFF',
  },
  testRatingsButton: {
    backgroundColor: '#9C27B0',
  },
  syncButton: {
    backgroundColor: '#17A2B8',
  },
  creditButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  creditButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  buyCreditsButton: {
    backgroundColor: '#28a745',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
