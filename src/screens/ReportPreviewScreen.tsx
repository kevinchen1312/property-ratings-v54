import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { PropertyReport, getPropertyReport } from '../services/reports';

interface ReportPreviewScreenProps {
  route: {
    params: {
      propertyId: string;
      propertyName?: string;
    };
  };
}

export const ReportPreviewScreen: React.FC<ReportPreviewScreenProps> = ({ route }) => {
  const { propertyId, propertyName } = route.params;
  const [report, setReport] = useState<PropertyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [propertyId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      
      // Get last 12 months of data
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      const from = oneYearAgo.toISOString().split('T')[0]; // YYYY-MM-DD
      const to = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const reportData = await getPropertyReport(propertyId, from, to);
      setReport(reportData);
    } catch (error: any) {
      console.error('Error fetching report:', error);
      Alert.alert(
        'Error',
        'Failed to load property report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const formatAttribute = (attr: string) => {
    switch (attr) {
      case 'noise': return 'Noise Level';
      case 'safety': return 'Safety';
      case 'cleanliness': return 'Cleanliness';
      default: return attr;
    }
  };

  const formatStars = (stars: number | null) => {
    if (stars === null) return 'No data';
    return `${stars.toFixed(1)} ⭐`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load report</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Property Report</Text>
          {propertyName && <Text style={styles.subtitle}>{propertyName}</Text>}
          <Text style={styles.dateRange}>Last 12 months</Text>
        </View>

        {/* Overall Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Rating</Text>
          <View style={styles.overallCard}>
            <Text style={styles.overallRating}>
              {formatStars(report.overall.avg_all)}
            </Text>
            <Text style={styles.overallLabel}>Average across all attributes</Text>
          </View>
        </View>

        {/* By Attribute */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Attribute</Text>
          <View style={styles.attributeGrid}>
            {Object.entries(report.avg_by_attribute).map(([attribute, rating]) => (
              <View key={attribute} style={styles.attributeCard}>
                <Text style={styles.attributeName}>{formatAttribute(attribute)}</Text>
                <Text style={styles.attributeRating}>{formatStars(rating)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Trends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Trends</Text>
          <View style={styles.trendsContainer}>
            {report.weekly.length > 0 ? (
              report.weekly.slice(-8).map((week, index) => (
                <View key={index} style={styles.trendItem}>
                  <Text style={styles.trendDate}>{formatDate(week.week_start)}</Text>
                  <Text style={styles.trendRating}>{formatStars(week.avg_stars)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No weekly data available</Text>
            )}
          </View>
        </View>

        {/* Monthly Trends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Trends</Text>
          <View style={styles.trendsContainer}>
            {report.monthly.length > 0 ? (
              report.monthly.slice(-6).map((month, index) => (
                <View key={index} style={styles.trendItem}>
                  <Text style={styles.trendDate}>{formatDate(month.month_start)}</Text>
                  <Text style={styles.trendRating}>{formatStars(month.avg_stars)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No monthly data available</Text>
            )}
          </View>
        </View>

        {/* Recent Activity Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.logContainer}>
            {report.log.length > 0 ? (
              report.log.slice(-20).reverse().map((entry, index) => (
                <View key={index} style={styles.logItem}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logAttribute}>{formatAttribute(entry.attribute)}</Text>
                    <Text style={styles.logDate}>{formatDate(entry.date)}</Text>
                  </View>
                  <Text style={styles.logRating}>{entry.stars} ⭐</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No activity data available</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  overallCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallRating: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  overallLabel: {
    fontSize: 14,
    color: '#666',
  },
  attributeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  attributeCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attributeName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  attributeRating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trendsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trendDate: {
    fontSize: 14,
    color: '#666',
  },
  trendRating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  logContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logAttribute: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  logDate: {
    fontSize: 12,
    color: '#999',
  },
  logRating: {
    fontSize: 14,
    color: '#666',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
