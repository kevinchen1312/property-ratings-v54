import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUserPendingPayouts, getUserContributorStats } from '../services/revenueSharing';
import { getPayoutHistory } from '../services/stripeConnect';

interface PendingPayout {
  id: string;
  payout_amount: number;
  rating_count: number;
  is_top_contributor: boolean;
  created_at: string;
  status: string;
}

interface ContributorStats {
  user_id: string;
  total_ratings: number;
  last_rating_at: string;
}

export const EarningsScreen: React.FC = () => {
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [contributorStats, setContributorStats] = useState<ContributorStats[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      console.log('🔄 Loading earnings data...');
      
      const [payoutsData, statsData, historyData] = await Promise.all([
        getUserPendingPayouts().catch(err => {
          console.error('Error loading pending payouts:', err);
          return [];
        }),
        getUserContributorStats().catch(err => {
          console.error('Error loading contributor stats:', err);
          return [];
        }),
        getPayoutHistory().catch(err => {
          console.error('Error loading payout history:', err);
          return [];
        }),
      ]);

      console.log('📊 Loaded data:', {
        payouts: payoutsData.length,
        stats: statsData.length,
        history: historyData.length
      });

      setPendingPayouts(payoutsData);
      setContributorStats(statsData);
      setPayoutHistory(historyData);
    } catch (error) {
      console.error('Error loading earnings data:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadData();
      }
    }, [loading])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCashOutSetup = () => {
    Alert.alert(
      'Cash Out Setup',
      'Bank account setup will be available soon. Your earnings are safe and will be paid once setup is complete.',
      [{ text: 'OK' }]
    );
  };

  const calculateTotalEarnings = () => {
    return pendingPayouts.reduce((total, payout) => total + payout.payout_amount, 0);
  };

  const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

  const totalEarnings = calculateTotalEarnings();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Earnings</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {totalEarnings > 0 ? 'EARNINGS READY' : 'NO EARNINGS'}
          </Text>
        </View>
      </View>

      {/* Earnings Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Available Balance</Text>
        <Text style={styles.availableAmount}>{formatAmount(totalEarnings)}</Text>
        <Text style={styles.payoutCountText}>
          {pendingPayouts.length} pending payout{pendingPayouts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Cash Out Setup */}
      {totalEarnings > 0 && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.setupButton} onPress={handleCashOutSetup}>
            <Text style={styles.setupButtonText}>Set Up Bank Account</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* How Earnings Work */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💰 How You Earn Money</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.boldText}>Top Contributor</Text>: Get 10% of report revenue when you're the #1 rater for a property{'\n'}
          • <Text style={styles.boldText}>Other Contributors</Text>: Share 10% of revenue proportionally based on your ratings{'\n'}
          • <Text style={styles.boldText}>Revenue Split</Text>: 80% platform, 10% top contributor, 10% other contributors
        </Text>
      </View>

      {/* Pending Payouts */}
      {pendingPayouts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Payouts</Text>
          {pendingPayouts.map((payout) => (
            <View key={payout.id} style={styles.payoutItem}>
              <View style={styles.payoutHeader}>
                <Text style={styles.payoutAmount}>{formatAmount(payout.payout_amount)}</Text>
                <View style={[
                  styles.contributorBadge,
                  payout.is_top_contributor ? styles.topContributorBadge : styles.otherContributorBadge
                ]}>
                  <Text style={[
                    styles.contributorBadgeText,
                    payout.is_top_contributor ? styles.topContributorText : styles.otherContributorText
                  ]}>
                    {payout.is_top_contributor ? '🏆 TOP' : '👥 CONTRIBUTOR'}
                  </Text>
                </View>
              </View>
              <Text style={styles.payoutDetails}>
                Based on {payout.rating_count} rating{payout.rating_count !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.payoutDate}>
                Earned: {formatDate(payout.created_at)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Contributor Stats */}
      {contributorStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Contributions</Text>
          {contributorStats.slice(0, 5).map((stat, index) => (
            <View key={`${stat.user_id}-${index}`} style={styles.statItem}>
              <Text style={styles.statProperty}>Property {stat.user_id.substring(0, 8)}...</Text>
              <View style={styles.statDetails}>
                <Text style={styles.statRatings}>{stat.total_ratings} ratings</Text>
                <Text style={styles.statDate}>
                  Last: {formatDate(stat.last_rating_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Payout History */}
      {payoutHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout History</Text>
          {payoutHistory.slice(0, 5).map((payout, index) => (
            <View key={payout.id || index} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyAmount}>{formatAmount(payout.payout_amount || 0)}</Text>
                <Text style={[styles.historyStatus, styles.completedStatus]}>
                  {payout.status || 'completed'}
                </Text>
              </View>
              <Text style={styles.historyDate}>
                {formatDate(payout.processed_at || payout.created_at)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {totalEarnings === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Start Earning Money! 💰</Text>
          <Text style={styles.emptyText}>
            Rate properties to become a top contributor and earn money when reports are purchased.
          </Text>
          <Text style={styles.emptySubtext}>
            The more you rate, the higher your chances of being the top contributor for a property!
          </Text>
        </View>
      )}
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  availableAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  payoutCountText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  setupButton: {
    backgroundColor: '#1976D2',
    borderRadius: 8,
    padding: 16,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#E8F5E8',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  payoutItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
  },
  contributorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topContributorBadge: {
    backgroundColor: '#FFD700',
  },
  otherContributorBadge: {
    backgroundColor: '#E3F2FD',
  },
  contributorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  topContributorText: {
    color: '#B8860B',
  },
  otherContributorText: {
    color: '#1976D2',
  },
  payoutDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 12,
    color: '#999',
  },
  statItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statProperty: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statDetails: {
    alignItems: 'flex-end',
  },
  statRatings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  statDate: {
    fontSize: 12,
    color: '#999',
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedStatus: {
    backgroundColor: '#E8F5E8',
    color: '#2E7D32',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});