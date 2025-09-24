import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, Modal, ScrollView, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { Loading } from '../components/Loading';
import { StarRating } from '../components/StarRating';
import ClusteredMapView from '../components/ClusteredMapView';
import { LatLng, Property } from '../lib/types';
import { RatingSubmission } from '../services/ratings';
import { calculateDistance } from '../lib/ratingService';
import { submitRatings, checkDailyRatingLimit } from '../services/ratings';
// Properties loaded dynamically by ClusteredMapView

const { width, height } = Dimensions.get('window');

export const MapScreen: React.FC = () => {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [permissionDenied, setPermissionDenied] = useState(false);
  // Properties are now loaded dynamically by ClusteredMapView
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [ratings, setRatings] = useState({
    noise: 0,
    friendliness: 0,
    cleanliness: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [hasRatedToday, setHasRatedToday] = useState(false);

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
    setRatings({ noise: 0, friendliness: 0, cleanliness: 0 });
    
    if (location) {
      const dist = calculateDistance(
        location.latitude,
        location.longitude,
        property.lat,
        property.lng
      );
      setDistance(dist);
    }

    // Check if user has already rated this property today
    const hasRated = await checkDailyRatingLimit(property.id);
    setHasRatedToday(hasRated);
    
    setModalVisible(true);
  }, [location]);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setSelectedProperty(null);
    setRatings({ noise: 0, friendliness: 0, cleanliness: 0 });
    setDistance(0);
    setHasRatedToday(false);
  }, []);


  const handleRatingChange = useCallback((attribute: string, rating: number) => {
    setRatings(prev => ({ ...prev, [attribute]: rating }));
  }, []);

  const handleSubmitRatings = useCallback(async () => {
    if (!selectedProperty || !location) return;

    const submission: RatingSubmission = {
      propertyId: selectedProperty.id,
      noise: ratings.noise,
      friendliness: ratings.friendliness,
      cleanliness: ratings.cleanliness,
      userLat: location.latitude,
      userLng: location.longitude,
    };

    setSubmitting(true);
    try {
      await submitRatings(submission);
      handleModalClose();
    } catch (error: any) {
      // Error handling is done in the service with user-friendly alerts
      console.error('Rating submission error:', error);
    } finally {
      setSubmitting(false);
    }
  }, [selectedProperty, location, ratings, handleModalClose]);


  const isWithinRange = distance <= 2000;
  const hasAtLeastOneRating = ratings.noise > 0 || ratings.friendliness > 0 || ratings.cleanliness > 0;
  const canSubmit = isWithinRange && hasAtLeastOneRating && !submitting && !hasRatedToday;

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
      
      {/* 2000m circle around selected property - overlay on clustered map */}
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
              radius={2000} // 2000 meters
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
                  Distance: {Math.round(distance)}m {!isWithinRange && '(Must be within 2000m to rate)'}
                </Text>
                
                {hasRatedToday && (
                  <Text style={styles.alreadyRatedText}>
                    ✅ You have already rated this property today
                  </Text>
                )}
                
                {!hasRatedToday && (
                  <Text style={styles.instructionText}>
                    Tap stars to rate • Tap the same star again to remove rating • At least one rating required
                  </Text>
                )}

                <View style={styles.ratingsContainer}>
                  <StarRating
                    label="Noise Level"
                    rating={ratings.noise}
                    onRatingChange={(rating) => handleRatingChange('noise', rating)}
                    disabled={!isWithinRange || hasRatedToday}
                  />
                  <StarRating
                    label="Friendliness"
                    rating={ratings.friendliness}
                    onRatingChange={(rating) => handleRatingChange('friendliness', rating)}
                    disabled={!isWithinRange || hasRatedToday}
                  />
                  <StarRating
                    label="Cleanliness"
                    rating={ratings.cleanliness}
                    onRatingChange={(rating) => handleRatingChange('cleanliness', rating)}
                    disabled={!isWithinRange || hasRatedToday}
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
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  alreadyRatedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 20,
    textAlign: 'center',
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
});
