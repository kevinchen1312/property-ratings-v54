import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Region, Circle } from 'react-native-maps';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import Supercluster from 'supercluster';
import { Property } from '../lib/types';
import LeadsongPin from './LeadsongPin';

interface ClusteredMapViewProps {
  properties: Property[];
  onPropertyPress?: (property: Property) => void;
  onMapPress?: () => void;
  initialRegion?: Region;
  style?: any;
  userLocation?: { latitude: number; longitude: number } | null;
  selectedProperty?: Property | null;
  enableProximityLoading?: boolean;
  ratedPropertyIds?: Set<string>; // Track which properties user has rated
  autoOrientEnabled?: boolean; // Auto-rotate map to match device direction
  onCenterButtonPress?: () => void; // Called when center button is pressed to re-enable auto-rotation
  lockRotation?: boolean; // Lock map rotation (e.g., when menu is open)
  ref?: React.RefObject<MapView>;
}

interface ClusterPoint {
  type: 'Feature';
  properties: {
    cluster: boolean;
    cluster_id?: number;
    point_count?: number;
    point_count_abbreviated?: string | number;
    property?: Property;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface ClusterMarkerProps {
  point: ClusterPoint;
  onPress: (point: ClusterPoint) => void;
  isRated?: boolean;
}

const ClusterMarker: React.FC<ClusterMarkerProps> = ({ point, onPress, isRated }) => {
  const { cluster, point_count, property } = point.properties;
  const [longitude, latitude] = point.geometry.coordinates;

  if (cluster) {
    return (
      <Marker
        key={`cluster-${point.properties.cluster_id}`}
        coordinate={{ latitude, longitude }}
        onPress={() => onPress(point)}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.clusterContainer}>
          <View style={[
            styles.clusterMarker,
            { backgroundColor: getClusterColor(point_count || 0) }
          ]}>
            <Text style={styles.clusterText}>
              {point_count && point_count < 100 ? point_count : '99+'}
            </Text>
          </View>
        </View>
      </Marker>
    );
  }

  return (
    <Marker
      key={`property-${property?.id}`}
      coordinate={{ latitude, longitude }}
      onPress={() => onPress(point)}
      anchor={{ x: 0.5, y: 1.0 }}
      centerOffset={{ x: 0, y: -20 }}
      flat={false}
      tracksViewChanges={false}
      zIndex={1000}
    >
      <View style={styles.markerTouchArea}>
        <LeadsongPin
          size={40}
          pinColor={isRated ? '#999999' : '#7C3AED'}
          iconColor="#FFFFFF"
          shadow={false}
        />
      </View>
    </Marker>
  );
};

const getClusterColor = (pointCount: number): string => {
  if (pointCount >= 100) return '#ff0000';
  if (pointCount >= 50) return '#ff4500';
  if (pointCount >= 20) return '#ffa500';
  if (pointCount >= 10) return '#ffff00';
  return '#00ff00';
};

export const ClusteredMapView = React.forwardRef<MapView, ClusteredMapViewProps>(({
  properties,
  onPropertyPress,
  onMapPress,
  initialRegion,
  style,
  userLocation,
  selectedProperty,
  enableProximityLoading = false,
  ratedPropertyIds = new Set(),
  autoOrientEnabled = true,
  onCenterButtonPress,
  lockRotation = false
}, ref) => {
  const mapRef = ref as React.RefObject<MapView> || useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(
    initialRegion || {
      latitude: 37.3135,
      longitude: -122.0312,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }
  );

  // VIEWPORT-BASED LOADING: Load properties dynamically based on current view or proximity
  const [viewportProperties, setViewportProperties] = useState<Property[]>([]);
  const [proximityProperties, setProximityProperties] = useState<Property[]>([]);
  
  // Device heading for initial and continuous orientation
  const [initialHeading, setInitialHeading] = useState<number>(0);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [mapHeading, setMapHeading] = useState<number>(0);
  const headingSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const hasManuallyRotatedRef = useRef<boolean>(false);
  const hasInitializedCameraRef = useRef<boolean>(false);
  
  // Load properties for current viewport or proximity
  useEffect(() => {
    const loadProperties = async () => {
      const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
      
      try {
        if (enableProximityLoading && userLocation) {
          // OSM-BASED PROXIMITY LOADING: Query OSM and database for properties within 75m
          const { getPropertiesOSMBased } = await import('../services/properties');
          const proximityProps = await getPropertiesOSMBased(
            userLocation.latitude, 
            userLocation.longitude, 
            75 // 75 meters radius - queries OSM + database
          );
          
          console.log(`📍 Loaded ${proximityProps.length} properties within 75m (OSM + database)`);
          setProximityProperties(proximityProps);
          setViewportProperties([]); // Clear viewport properties when using proximity
        } else {
          // VIEWPORT-BASED LOADING: Load properties based on current view
          
          const bounds = {
            north: region.latitude + region.latitudeDelta,
            south: region.latitude - region.latitudeDelta,
            east: region.longitude + region.longitudeDelta,
            west: region.longitude - region.longitudeDelta,
          };

          // Import the function from services
          const { getPropertiesInBounds } = await import('../services/properties');
          const viewportProps = await getPropertiesInBounds(bounds);
          
          console.log(`📍 Loaded ${viewportProps.length} properties for viewport (zoom ${zoom})`);
          setViewportProperties(viewportProps);
          setProximityProperties([]); // Clear proximity properties when using viewport
        }
      } catch (error) {
        // Silently handle - non-fatal
      }
    };

    loadProperties();
  }, [region, userLocation, enableProximityLoading]);

  // Get initial device heading and set up continuous tracking
  useEffect(() => {
    const setupHeadingTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Get initial heading
        const headingData = await Location.getHeadingAsync();
        const deviceHeading = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
        setInitialHeading(deviceHeading);
        setCurrentHeading(deviceHeading);
        setMapHeading(deviceHeading);
        console.log(`🧭 Initial heading: ${deviceHeading}°`);

        // Automatically center on user location with device heading when first loaded
        if (mapRef.current && autoOrientEnabled && userLocation && !hasInitializedCameraRef.current) {
          hasInitializedCameraRef.current = true;
          mapRef.current.animateCamera({
            center: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            heading: deviceHeading,
            pitch: 45,
            altitude: 350,
            zoom: 18,
          }, { duration: 500 });
          console.log(`🎯 Auto-centered on user location with heading ${deviceHeading}° on initial load`);
        }

        // Set up continuous heading tracking if auto-orient is enabled
        if (autoOrientEnabled) {
          headingSubscriptionRef.current = await Location.watchHeadingAsync(
            (headingUpdate) => {
              const newHeading = headingUpdate.trueHeading >= 0 
                ? headingUpdate.trueHeading 
                : headingUpdate.magHeading;
              
              setCurrentHeading(newHeading);
              
              // Auto-rotate the map if enabled, user hasn't manually rotated, and rotation is not locked
              if (autoOrientEnabled && !hasManuallyRotatedRef.current && !lockRotation && mapRef.current) {
                mapRef.current.getCamera().then(camera => {
                  mapRef.current?.animateCamera({
                    ...camera,
                    heading: newHeading,
                  }, { duration: 300 });
                }).catch(() => {
                  // Silently handle
                });
              }
            }
          );
          console.log('🧭 Started watching device heading');
        }
      } catch (error) {
        // Silently handle - non-fatal
        setInitialHeading(0);
        setCurrentHeading(0);
      }
    };

    setupHeadingTracking();

    // Cleanup on unmount or when autoOrientEnabled or lockRotation changes
    return () => {
      if (headingSubscriptionRef.current) {
        headingSubscriptionRef.current.remove();
        headingSubscriptionRef.current = null;
        console.log('🧭 Stopped watching device heading');
      }
    };
  }, [autoOrientEnabled, lockRotation]); // Re-run when auto-orient setting or lock rotation changes

  // Initialize supercluster with properties (viewport or proximity)
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
      minPoints: 999999, // Disable clustering - always show individual pins
    });

    // Use proximity properties if available, otherwise viewport properties
    const activeProperties = proximityProperties.length > 0 ? proximityProperties : viewportProperties;
    
    // Convert active properties to GeoJSON points
    const points: ClusterPoint[] = activeProperties.map(property => ({
      type: 'Feature',
      properties: {
        cluster: false,
        property,
      },
      geometry: {
        type: 'Point',
        coordinates: [property.lng, property.lat],
      },
    }));

    cluster.load(points);
    return cluster;
  }, [viewportProperties, proximityProperties]);

  // Get clusters for current region
  const clusters = useMemo(() => {
    if (!supercluster) return [];

    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
    const boundingBox = [
      region.longitude - region.longitudeDelta,
      region.latitude - region.latitudeDelta,
      region.longitude + region.longitudeDelta,
      region.latitude + region.latitudeDelta,
    ] as [number, number, number, number];

    return supercluster.getClusters(boundingBox, zoom);
  }, [supercluster, region]);

  const handleMarkerPress = (point: ClusterPoint) => {
    const { cluster, cluster_id, property } = point.properties;

    if (cluster && cluster_id !== undefined) {
      // Zoom into cluster
      const expansionZoom = Math.min(
        supercluster.getClusterExpansionZoom(cluster_id),
        16
      );
      
      const [longitude, latitude] = point.geometry.coordinates;
      
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: region.latitudeDelta / Math.pow(2, expansionZoom - Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2)),
        longitudeDelta: region.longitudeDelta / Math.pow(2, expansionZoom - Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2)),
      }, 500);
    } else if (property && onPropertyPress) {
      onPropertyPress(property);
    }
  };

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
  };
  
  const handleRegionChange = () => {
    // Dismiss keyboard when user starts scrolling/panning
    if (onMapPress) onMapPress();
  };

  // Detect manual rotation by user
  const handlePanDrag = () => {
    // User is manually interacting with the map
    // This will permanently disable auto-rotation until center button is pressed
    hasManuallyRotatedRef.current = true;
    console.log('🔒 Auto-rotation disabled due to manual interaction');
  };

  // Re-enable auto-rotation and center on user when custom button is pressed
  const handleCenterButtonPress = async () => {
    if (userLocation && mapRef.current) {
      // Re-enable auto-rotation
      hasManuallyRotatedRef.current = false;
      console.log('🔓 Auto-rotation re-enabled via center button');
      
      // Get fresh heading immediately when button is pressed
      let headingToUse = currentHeading || 0;
      try {
        const headingData = await Location.getHeadingAsync();
        headingToUse = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
        console.log(`🧭 Fresh heading for recenter: ${headingToUse}°`);
      } catch (error) {
        console.log('🧭 Using cached heading:', headingToUse);
      }
      
      // Animate camera to user location with fresh device heading
      setMapHeading(headingToUse); // Update map heading state
      mapRef.current.animateCamera({
        center: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        pitch: 45,
        heading: headingToUse, // Use fresh device heading
        altitude: 350,
        zoom: 18,
      }, { duration: 500 });
      
      // Notify parent component if callback is provided
      if (onCenterButtonPress) {
        onCenterButtonPress();
      }
    }
  };

  // Trigger region sync on map ready to load all pins immediately
  const handleMapReady = () => {
    if (mapRef.current && !hasInitializedCameraRef.current) {
      // Small delay to ensure map is fully ready
      setTimeout(() => {
        if (mapRef.current && userLocation && !hasInitializedCameraRef.current) {
          // Automatically center on user location with device heading (like pressing center button)
          hasInitializedCameraRef.current = true;
          mapRef.current.animateCamera({
            center: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            pitch: 45,
            heading: currentHeading, // Use device heading from start
            altitude: 350,
            zoom: 18,
          }, { duration: 500 }); // Smooth animation to user location
          console.log('🎯 Auto-centered on user location with device heading on initial load');
        }
      }, 300); // Slightly longer delay to ensure heading is fetched
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="mutedStandard"
        initialRegion={region}
        initialCamera={{
          center: {
            latitude: region.latitude,
            longitude: region.longitude,
          },
          pitch: 45, // 3D tilt angle
          heading: currentHeading, // Use device heading from start
          altitude: 350, // Zoomed in 2 levels closer
          zoom: 18, // 2 zoom levels closer
        }}
        onMapReady={handleMapReady}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={onMapPress}
        onPanDrag={() => {
          handlePanDrag();
          if (onMapPress) onMapPress(); // Also dismiss keyboard when dragging
        }} // Detect manual rotation/panning
        showsUserLocation={false}
        showsMyLocationButton={false} // Hide default button, use custom one
        showsCompass
        showsScale
        loadingEnabled
        rotateEnabled={!lockRotation}  // Disable rotation when locked (menu open)
        pitchEnabled={false}  // Disable 3D tilt/pitch gestures
        scrollEnabled={true}
        zoomEnabled={true}
        zoomTapEnabled={true}
        zoomControlEnabled={true}
        showsBuildings={false}
        showsIndoors={false}
        showsPointsOfInterest={false}
      >
        {/* 75m circle around user location */}
        {userLocation && (
          <Circle
            center={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            radius={75}
            strokeColor="rgba(167, 139, 250, 0.6)"
            fillColor="rgba(167, 139, 250, 0.1)"
            strokeWidth={2}
          />
        )}
        
        {/* Custom user location marker (black) */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            style={{ transform: [{ perspective: 1000 }] }}
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationDot} />
            </View>
          </Marker>
        )}
        
        {clusters.map((point, index) => {
          const isRated = !point.properties.cluster && 
                         point.properties.property?.id && 
                         ratedPropertyIds.has(point.properties.property.id);
          return (
            <ClusterMarker
              key={`marker-${index}`}
              point={point as ClusterPoint}
              onPress={handleMarkerPress}
              isRated={isRated}
            />
          );
        })}
      </MapView>
      
      {/* Custom center/location button */}
      <TouchableOpacity 
        style={styles.centerButton}
        onPress={handleCenterButtonPress}
        activeOpacity={0.7}
      >
        <View style={styles.centerButtonInner}>
          <Text style={styles.centerButtonIcon}>▲</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  clusterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clusterText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markerTouchArea: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonIcon: {
    fontSize: 24,
    color: '#fff',
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scaleY: 0.65 }],
  },
  userLocationDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ClusteredMapView;
