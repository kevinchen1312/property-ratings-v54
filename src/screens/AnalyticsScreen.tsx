import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { GlobalFonts } from '../styles/global';

interface AnalyticsScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface LeadsongActivity {
  id: string;
  created_at: string;
  property_name: string;
  property_address: string;
  property_id: string;
  leadsong_time: string;
}

interface AnalyticsData {
  totalLeadsongs: number;
  leadsongsToday: number;
  leadsongsThisWeek: number;
  averageStars: number;
  recentActivity: LeadsongActivity[];
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ visible, onClose }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      console.log('📊 Fetching analytics for user:', user.id);

      // Get all ratings to group by submissions
      const { data: allRatings, error: ratingsError } = await supabase
        .from('rating')
        .select(`
          id,
          created_at,
          stars,
          property_id,
          property:property_id (
            name,
            address
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      // Group ratings by Leadsong (same property_id and created_at within 2 seconds)
      const leadsongs = new Map<string, LeadsongActivity>();
      const leadsongStars: number[] = [];

      if (allRatings) {
        allRatings.forEach((rating: any) => {
          const leadsongKey = `${rating.property_id}-${new Date(rating.created_at).toISOString().slice(0, -5)}`;
          
          const property = Array.isArray(rating.property) ? rating.property[0] : rating.property;
          
          if (!leadsongs.has(leadsongKey)) {
            leadsongs.set(leadsongKey, {
              id: rating.id,
              created_at: rating.created_at,
              property_name: property?.name || 'Unknown Property',
              property_address: property?.address || 'Unknown Address',
              property_id: rating.property_id,
              leadsong_time: rating.created_at,
            });
          }
          
          leadsongStars.push(rating.stars);
        });
      }

      const leadsongsArray = Array.from(leadsongs.values());
      const totalLeadsongs = leadsongsArray.length;

      // Calculate Leadsongs today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const leadsongsToday = leadsongsArray.filter(song => 
        new Date(song.created_at) >= today
      ).length;

      // Calculate Leadsongs this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const leadsongsThisWeek = leadsongsArray.filter(song => 
        new Date(song.created_at) >= weekAgo
      ).length;

      // Calculate average stars across all ratings
      const averageStars = leadsongStars.length > 0
        ? leadsongStars.reduce((sum, stars) => sum + stars, 0) / leadsongStars.length
        : 0;

      const analyticsData: AnalyticsData = {
        totalLeadsongs,
        leadsongsToday,
        leadsongsThisWeek,
        averageStars: Math.round(averageStars * 100) / 100, // 2 decimal places
        recentActivity: leadsongsArray,
      };

      setAnalytics(analyticsData);
      setHasMore(leadsongsArray.length > displayLimit);
      console.log('📊 Analytics loaded:', analyticsData);

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setLoading(true);
    fetchAnalytics();
    }
  }, [visible]);

  const loadMore = () => {
    setLoadingMore(true);
    setDisplayLimit(prev => prev + 10);
    setTimeout(() => {
      setLoadingMore(false);
      if (analytics && displayLimit + 10 >= analytics.recentActivity.length) {
        setHasMore(false);
      }
    }, 500);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
      <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
        ) : !analytics ? (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load analytics</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
        ) : (
          <ScrollView
            style={styles.scrollContent}
          >
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{analytics.totalLeadsongs}</Text>
                <Text style={styles.summaryLabel}>Leadsongs{'\n'}All-time</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{analytics.leadsongsThisWeek}</Text>
                <Text style={styles.summaryLabel}>Leadsongs{'\n'}This Week</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{analytics.leadsongsToday}</Text>
                <Text style={styles.summaryLabel}>Leadsongs{'\n'}Today</Text>
              </View>
            </View>

      {/* Recent Activity */}
      <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
        {analytics.recentActivity.length === 0 ? (
          <Text style={styles.noDataText}>No recent activity</Text>
        ) : (
                <>
                  {analytics.recentActivity.slice(0, displayLimit).map((activity, index) => (
                    <View key={`${activity.id}-${index}`} style={styles.activityItem}>
              <Text style={styles.activityProperty}>{activity.property_name}</Text>
              <Text style={styles.activityAddress}>{activity.property_address}</Text>
              <Text style={styles.activityTime}>
                        {formatDate(activity.created_at)}
              </Text>
            </View>
                  ))}
                  
                  {hasMore && displayLimit < analytics.recentActivity.length && (
                    <TouchableOpacity 
                      style={styles.loadMoreButton}
                      onPress={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <ActivityIndicator size="small" color="#7C3AED" />
                      ) : (
                        <Text style={styles.loadMoreText}>Load More</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#7C3AED',
    borderBottomWidth: 1,
    borderBottomColor: '#6B2FD1',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: GlobalFonts.bold,
    color: '#fff',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80,
    justifyContent: 'center',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
  },
  section: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 15,
  },
  activityItem: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  activityProperty: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 4,
  },
  activityAddress: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 6,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: GlobalFonts.regular,
    color: '#999',
  },
  noDataText: {
    textAlign: 'center',
    fontFamily: GlobalFonts.regular,
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  loadMoreButton: {
    backgroundColor: '#7C3AED',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
  bottomPadding: {
    height: 20,
  },
});
