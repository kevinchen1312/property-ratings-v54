import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Modal,
} from 'react-native';
import { getUserPendingPayouts, getUserContributorStats } from '../services/revenueSharing';
import { 
  getPayoutHistory, 
  getStripeConnectStatus, 
  createStripeConnectAccount,
  refreshStripeAccountStatus,
  createStripeLoginLink,
  getUserStripeAccount,
  requestPayout
} from '../services/stripeConnect';
import { getProperty } from '../services/properties';
import { GlobalFonts } from '../styles/global';

interface PendingPayout {
  id: string;
  payout_amount: number;
  rating_count: number;
  is_top_contributor: boolean;
  created_at: string;
  status: string;
}

interface ContributorStats {
  property_id: string;
  user_id: string;
  total_ratings: number;
  last_rating_at: string;
}

interface ContributorStatsWithAddress extends ContributorStats {
  address?: string;
}

interface EarningsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const EarningsScreen: React.FC<EarningsScreenProps> = ({ visible, onClose }) => {
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [contributorStats, setContributorStats] = useState<ContributorStatsWithAddress[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<any>(null);
  const [settingUpAccount, setSettingUpAccount] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const loadData = async () => {
    try {
      console.log('🔄 Loading earnings data...');
      
      const [payoutsData, statsData, historyData, connectStatus] = await Promise.all([
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
        getStripeConnectStatus().catch(err => {
          console.error('Error loading Stripe Connect status:', err);
          return { has_account: false, account_status: 'none', payouts_enabled: false, stripe_account_id: null };
        }),
      ]);

      console.log('📊 Loaded data:', {
        payouts: payoutsData.length,
        stats: statsData.length,
        history: historyData.length,
        stripeConnect: connectStatus
      });

      // Fetch property addresses for contributor stats
      const statsWithAddresses = await Promise.all(
        statsData.map(async (stat) => {
          try {
            const property = await getProperty(stat.property_id);
            return {
              ...stat,
              address: property?.address || `Property ${stat.property_id.substring(0, 8)}...`,
            };
          } catch (error) {
            console.error('Error fetching property:', error);
            return {
              ...stat,
              address: `Property ${stat.property_id.substring(0, 8)}...`,
            };
          }
        })
      );

      setPendingPayouts(payoutsData);
      setContributorStats(statsWithAddresses);
      setPayoutHistory(historyData);
      setStripeConnectStatus(connectStatus);
    } catch (error) {
      console.error('Error loading earnings data:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const handleCashOutSetup = async () => {
    if (settingUpAccount) return;

    try {
      setSettingUpAccount(true);

      if (!stripeConnectStatus?.has_account) {
        // Create new Stripe Connect account
        console.log('Creating new Stripe Connect account...');
        console.log('Stripe Connect Status:', stripeConnectStatus);
        const result = await createStripeConnectAccount();
        console.log('Create account result:', result);
        const { onboardingUrl } = result;
        
        Alert.alert(
          'Set Up Bank Account',
          'You\'ll be redirected to Stripe to securely connect your bank account for receiving payments.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue', 
              onPress: async () => {
                try {
                  console.log('Opening Stripe Connect onboarding:', onboardingUrl);
                  const supported = await Linking.canOpenURL(onboardingUrl);
                  if (supported) {
                    await Linking.openURL(onboardingUrl);
                  } else {
                    Alert.alert('Error', 'Cannot open Stripe Connect URL');
                  }
                } catch (error) {
                  console.error('Error opening URL:', error);
                  Alert.alert('Error', 'Failed to open Stripe Connect');
                }
              }
            }
          ]
        );
      } else if (!stripeConnectStatus.payouts_enabled) {
        // Account exists but needs completion
        console.log('Refreshing account status...');
        await refreshStripeAccountStatus(stripeConnectStatus.stripe_account_id);
        
        if (stripeConnectStatus.account_status === 'pending') {
          Alert.alert(
            'Complete Account Setup',
            'Your bank account setup is incomplete. Please complete the setup process.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Complete Setup', 
                onPress: async () => {
                  try {
                    const { onboardingUrl } = await createStripeConnectAccount();
                    console.log('Opening Stripe Connect onboarding:', onboardingUrl);
                    const supported = await Linking.canOpenURL(onboardingUrl);
                    if (supported) {
                      await Linking.openURL(onboardingUrl);
                    } else {
                      Alert.alert('Error', 'Cannot open Stripe Connect URL');
                    }
                  } catch (error) {
                    console.error('Error opening URL:', error);
                    Alert.alert('Error', 'Failed to open Stripe Connect');
                  }
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Account Under Review',
            'Your bank account is being reviewed by Stripe. This usually takes 1-2 business days.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Account is ready - show dashboard
        const loginUrl = await createStripeLoginLink(stripeConnectStatus.stripe_account_id);
        Alert.alert(
          'Manage Bank Account',
          'View your Stripe Express dashboard to manage your bank account and view payout history.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Dashboard', 
              onPress: async () => {
                try {
                  console.log('Opening Stripe dashboard:', loginUrl);
                  const supported = await Linking.canOpenURL(loginUrl);
                  if (supported) {
                    await Linking.openURL(loginUrl);
                  } else {
                    Alert.alert('Error', 'Cannot open Stripe dashboard URL');
                  }
                } catch (error) {
                  console.error('Error opening dashboard URL:', error);
                  Alert.alert('Error', 'Failed to open Stripe dashboard');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Cash out setup error:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', `Failed to set up cash out: ${error.message}`);
    } finally {
      setSettingUpAccount(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!stripeConnectStatus?.payouts_enabled) {
      Alert.alert(
        'Connect to Stripe First',
        'Please connect your bank account using the "Stripe Connection" button above to receive payments.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect Now', onPress: handleCashOutSetup }
        ]
      );
      return;
    }

    const totalEarnings = calculateTotalEarnings();
    if (totalEarnings < 1.00) {
      Alert.alert(
        'Minimum Payout Amount',
        'You need at least $1.00 in earnings to request a payout.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Request Payout',
      `Request payout of ${formatAmount(totalEarnings)}? This will transfer your earnings to your connected bank account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request Payout', 
          onPress: async () => {
            try {
              const result = await requestPayout();
              Alert.alert(
                'Payout Requested',
                result.message || 'Your payout has been requested and will be processed within 1-2 business days.',
                [{ text: 'OK', onPress: loadData }]
              );
            } catch (error) {
              console.error('Payout request error:', error);
              Alert.alert('Error', 'Failed to request payout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const calculateTotalEarnings = () => {
    return pendingPayouts.reduce((total, payout) => total + payout.payout_amount, 0);
  };

  const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const totalEarnings = calculateTotalEarnings();

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
          <Text style={styles.title}>Earnings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Loading earnings...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContent}
          >
          {/* Earnings Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Available Balance</Text>
            <Text style={styles.availableAmount}>{formatAmount(totalEarnings)}</Text>
          </View>

          {/* Bank Account Status & Actions */}
          <View style={styles.actionContainer}>
            {/* Stripe Connection button */}
            <TouchableOpacity 
              style={[styles.setupButton, settingUpAccount && styles.disabledButton]} 
              onPress={handleCashOutSetup}
              disabled={settingUpAccount}
            >
              <Text style={styles.setupButtonText}>
                {settingUpAccount ? 'Setting Up...' : 'Stripe Connection'}
              </Text>
            </TouchableOpacity>

            {/* Request Payout button */}
            <TouchableOpacity 
              style={[styles.setupButton, styles.successButton, { marginTop: 12 }]} 
              onPress={handleRequestPayout}
              disabled={totalEarnings < 1.00}
            >
              <Text style={styles.setupButtonText}>
                Request Payout ({formatAmount(totalEarnings)})
              </Text>
            </TouchableOpacity>

            {/* Status text with help button */}
            {stripeConnectStatus?.payouts_enabled ? (
              <View style={styles.statusRow}>
                <Text style={styles.statusTextWithButton}>Bank account connected and verified</Text>
                <TouchableOpacity 
                  style={styles.helpButton}
                  onPress={() => setShowHowItWorks(true)}
                >
                  <Text style={styles.helpButtonText}>?</Text>
                </TouchableOpacity>
              </View>
            ) : stripeConnectStatus?.has_account ? (
              <Text style={styles.statusTextCentered}>⚠️ Bank setup incomplete</Text>
            ) : (
              <Text style={styles.statusTextCentered}>🏦 Connect your bank account to receive payments</Text>
            )}
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
                        {payout.is_top_contributor ? 'TOP' : '👥 CONTRIBUTOR'}
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
                <View key={`${stat.property_id}-${index}`} style={styles.statItem}>
                  <Text style={styles.statProperty}>{stat.address}</Text>
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
        )}

        {/* How It Works Modal */}
        <Modal
          visible={showHowItWorks}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHowItWorks(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowHowItWorks(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>How You Earn Money</Text>
              <Text style={styles.modalText}>
                • <Text style={styles.boldText}>Top Contributor</Text>: Get 10% of report revenue when you're the #1 rater for a property{'\n\n'}
                • <Text style={styles.boldText}>Other Contributors</Text>: Share 10% of revenue proportionally based on your ratings{'\n\n'}
                • <Text style={styles.boldText}>Revenue Split</Text>: 80% platform, 10% top contributor, 10% other contributors
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowHowItWorks(false)}
              >
                <Text style={styles.modalCloseButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#666',
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
  summaryCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 20,
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
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  availableAmount: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
    textAlign: 'center',
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  setupButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    padding: 16,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  successButton: {
    backgroundColor: '#7C3AED',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  statusTextWithButton: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginRight: 8,
  },
  statusTextCentered: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  helpButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
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
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
  },
  contributorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topContributorBadge: {
    backgroundColor: '#7C3AED',
  },
  otherContributorBadge: {
    backgroundColor: '#F5F0FF',
  },
  contributorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
  topContributorText: {
    color: '#FFFFFF',
  },
  otherContributorText: {
    color: '#7C3AED',
  },
  payoutDetails: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 12,
    fontFamily: GlobalFonts.regular,
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
    fontFamily: GlobalFonts.regular,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statDetails: {
    alignItems: 'flex-end',
  },
  statRatings: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
  },
  statDate: {
    fontSize: 12,
    fontFamily: GlobalFonts.regular,
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
    fontFamily: GlobalFonts.bold,
    color: '#333',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedStatus: {
    backgroundColor: '#F5F0FF',
    color: '#7C3AED',
  },
  historyDate: {
    fontSize: 12,
    fontFamily: GlobalFonts.regular,
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
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#333',
    lineHeight: 20,
    marginBottom: 20,
  },
  boldText: {
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
  modalCloseButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    padding: 12,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    textAlign: 'center',
  },
});
