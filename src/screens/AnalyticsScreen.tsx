import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation';
import { GlobalFonts } from '../styles/global';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Analytics'>;

interface AnalyticsData {
  totalRatings: number;
  ratingsToday: number;
  ratingsThisWeek: number;
  ratingsThisMonth: number;
  averageStars: number;
  topRatedProperties: Array<{
    property_name: string;
    property_address: string;
    avg_stars: number;
    rating_count: number;
  }>;
  recentActivity: Array<{
    id: string;
    created_at: string;
    attribute: string;
    stars: number;
    property_name: string;
    property_address: string;
  }>;
  ratingsByAttribute: {
    safety: number;
    quietness: number;
    cleanliness: number;
  };
  hourlyDistribution: Array<{
    hour: number;
    count: number;
  }>;
}

export const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      console.log('📊 Fetching analytics for user:', user.id);

      // Get total ratings
      const { data: totalData, error: totalError } = await supabase
        .from('rating')
        .select('id')
        .eq('user_id', user.id);

      if (totalError) throw totalError;

      // Get ratings today
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData, error: todayError } = await supabase
        .from('rating')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (todayError) throw todayError;

      // Get ratings this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: weekData, error: weekError } = await supabase
        .from('rating')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      if (weekError) throw weekError;

      // Get ratings this month
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const { data: monthData, error: monthError } = await supabase
        .from('rating')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', monthAgo.toISOString());

      if (monthError) throw monthError;

      // Get average stars
      const { data: avgData, error: avgError } = await supabase
        .from('rating')
        .select('stars')
        .eq('user_id', user.id);

      if (avgError) throw avgError;

      const averageStars = avgData.length > 0 
        ? avgData.reduce((sum, r) => sum + r.stars, 0) / avgData.length 
        : 0;

      // Get recent activity
      const { data: recentData, error: recentError } = await supabase
        .from('rating')
        .select(`
          id,
          created_at,
          attribute,
          stars,
          property:property_id (
            name,
            address
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      // Get ratings by attribute
      const { data: attributeData, error: attributeError } = await supabase
        .from('rating')
        .select('attribute')
        .eq('user_id', user.id);

      if (attributeError) throw attributeError;

      const ratingsByAttribute = {
        safety: attributeData.filter(r => r.attribute === 'safety').length,
        quietness: attributeData.filter(r => r.attribute === 'quietness').length,
        cleanliness: attributeData.filter(r => r.attribute === 'cleanliness').length,
      };

      const analyticsData: AnalyticsData = {
        totalRatings: totalData.length,
        ratingsToday: todayData.length,
        ratingsThisWeek: weekData.length,
        ratingsThisMonth: monthData.length,
        averageStars: Math.round(averageStars * 10) / 10,
        topRatedProperties: [], // We'll implement this later
        recentActivity: recentData.map(r => ({
          id: r.id,
          created_at: r.created_at,
          attribute: r.attribute,
          stars: r.stars,
          property_name: r.property?.name || 'Unknown Property',
          property_address: r.property?.address || 'Unknown Address',
        })),
        ratingsByAttribute,
        hourlyDistribution: [], // We'll implement this later
      };

      setAnalytics(analyticsData);
      console.log('📊 Analytics loaded:', analyticsData);

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load analytics</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>📊 Rating Analytics</Text>
        <Text style={styles.subtitle}>Track your submission activity</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{analytics.totalRatings}</Text>
          <Text style={styles.summaryLabel}>Total Ratings</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{analytics.ratingsToday}</Text>
          <Text style={styles.summaryLabel}>Today</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{analytics.ratingsThisWeek}</Text>
          <Text style={styles.summaryLabel}>This Week</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{analytics.averageStars}</Text>
          <Text style={styles.summaryLabel}>Avg Stars</Text>
        </View>
      </View>

      {/* Ratings by Attribute */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Ratings by Category</Text>
        <View style={styles.attributeContainer}>
          <View style={styles.attributeBar}>
            <Text style={styles.attributeLabel}>🛡️ Safety</Text>
            <View style={styles.attributeBarContainer}>
              <View 
                style={[
                  styles.attributeBarFill, 
                  { 
                    width: `${(analytics.ratingsByAttribute.safety / analytics.totalRatings) * 100}%`,
                    backgroundColor: '#7C3AED'
                  }
                ]} 
              />
            </View>
            <Text style={styles.attributeCount}>{analytics.ratingsByAttribute.safety}</Text>
          </View>
          
          <View style={styles.attributeBar}>
            <Text style={styles.attributeLabel}>🔇 Quietness</Text>
            <View style={styles.attributeBarContainer}>
              <View 
                style={[
                  styles.attributeBarFill, 
                  { 
                    width: `${(analytics.ratingsByAttribute.quietness / analytics.totalRatings) * 100}%`,
                    backgroundColor: '#7C3AED'
                  }
                ]} 
              />
            </View>
            <Text style={styles.attributeCount}>{analytics.ratingsByAttribute.quietness}</Text>
          </View>
          
          <View style={styles.attributeBar}>
            <Text style={styles.attributeLabel}>🧹 Cleanliness</Text>
            <View style={styles.attributeBarContainer}>
              <View 
                style={[
                  styles.attributeBarFill, 
                  { 
                    width: `${(analytics.ratingsByAttribute.cleanliness / analytics.totalRatings) * 100}%`,
                    backgroundColor: '#7C3AED'
                  }
                ]} 
              />
            </View>
            <Text style={styles.attributeCount}>{analytics.ratingsByAttribute.cleanliness}</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🕐 Recent Activity</Text>
        {analytics.recentActivity.length === 0 ? (
          <Text style={styles.noDataText}>No recent activity</Text>
        ) : (
          analytics.recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityHeader}>
                <Text style={styles.activityAttribute}>
                  {activity.attribute === 'noise' ? '🔊' : 
                   activity.attribute === 'safety' ? '🛡️' : '🧹'} {activity.attribute}
                </Text>
                <Text style={styles.activityStars}>
                  {'♪'.repeat(activity.stars)}
                </Text>
              </View>
              <Text style={styles.activityProperty}>{activity.property_name}</Text>
              <Text style={styles.activityAddress}>{activity.property_address}</Text>
              <Text style={styles.activityTime}>
                {new Date(activity.created_at).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginTop: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
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
  attributeContainer: {
    gap: 15,
  },
  attributeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attributeLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    width: 80,
  },
  attributeBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  attributeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  attributeCount: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#666',
    width: 30,
    textAlign: 'right',
  },
  activityItem: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  activityAttribute: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    textTransform: 'capitalize',
  },
  activityStars: {
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#7C3AED',
  },
  activityProperty: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 2,
  },
  activityAddress: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 5,
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
  bottomPadding: {
    height: 20,
  },
});
