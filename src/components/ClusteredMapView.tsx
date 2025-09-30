import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Region, MapPressEvent } from 'react-native-maps';
import Supercluster from 'supercluster';
import { Property } from '../lib/types';

interface ClusteredMapViewProps {
  properties: Property[];
  onPropertyPress?: (property: Property) => void;
  initialRegion?: Region;
  style?: any;
  userLocation?: { latitude: number; longitude: number } | null;
  enableProximityLoading?: boolean;
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
}

const ClusterMarker: React.FC<ClusterMarkerProps> = ({ point, onPress }) => {
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
      title={property?.name}
      description={property?.address}
    />
  );
};

const getClusterColor = (pointCount: number): string => {
  if (pointCount >= 100) return '#ff0000';
  if (pointCount >= 50) return '#ff4500';
  if (pointCount >= 20) return '#ffa500';
  if (pointCount >= 10) return '#ffff00';
  return '#00ff00';
};

export const ClusteredMapView: React.FC<ClusteredMapViewProps> = ({
  properties,
  onPropertyPress,
  initialRegion,
  style,
  userLocation,
  enableProximityLoading = false
}) => {
  const mapRef = useRef<MapView>(null);
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
  
  // Load properties for current viewport or proximity
  useEffect(() => {
    const loadProperties = async () => {
      const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
      
      try {
        if (enableProximityLoading && userLocation) {
          // PROXIMITY-BASED LOADING: Load properties within 200m of user
          const { getPropertiesWithinRadius } = await import('../services/properties');
          const proximityProps = await getPropertiesWithinRadius(
            userLocation.latitude, 
            userLocation.longitude, 
            200 // 200 meters radius
          );
          
          console.log(`📍 Loaded ${proximityProps.length} properties within 200m of user location`);
          setProximityProperties(proximityProps);
          setViewportProperties([]); // Clear viewport properties when using proximity
        } else {
          // VIEWPORT-BASED LOADING: Load properties based on current view
          // Only load when zoomed in enough (performance optimization)
          if (zoom < 12) {
            setViewportProperties([]);
            setProximityProperties([]);
            return;
          }

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
        console.error('Error loading properties:', error);
      }
    };

    loadProperties();
  }, [region, userLocation, enableProximityLoading]);

  // Initialize supercluster with properties (viewport or proximity)
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
      minPoints: 2,
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

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
        loadingEnabled
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {clusters.map((point, index) => (
          <ClusterMarker
            key={`marker-${index}`}
            point={point as ClusterPoint}
            onPress={handleMarkerPress}
          />
        ))}
      </MapView>
      
           <View style={styles.statsContainer}>
             <Text style={styles.statsText}>
               {enableProximityLoading && proximityProperties.length > 0 
                 ? `Showing: ${clusters.length} markers | Proximity: ${proximityProperties.length} properties (200m)`
                 : `Showing: ${clusters.length} markers | Viewport: ${viewportProperties.length} properties`
               }
             </Text>
           </View>
    </View>
  );
};

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
  statsContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
});

export default ClusteredMapView;
