import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { GlobalFonts } from '../styles/global';

interface RewardsScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface UserReward {
  id: string;
  reward_type: string;
  reward_amount: number;
  description: string;
  created_at: string;
  status: string;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({ visible, onClose }) => {
  const [userId, setUserId] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      
      // Generate referral code (using first 8 chars of user ID)
      const code = user.id.substring(0, 8).toUpperCase();
      setReferralCode(code);

      // Load user rewards (mock data for now - you can create a rewards table later)
      setRewards([]);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const referralUrl = `https://leadsong.com/referral/${referralCode}`;
      
      // iOS handles url separately, Android includes it in message
      const shareContent = Platform.OS === 'ios' 
        ? {
            message: `Join me on Leadsong! Use my referral code ${referralCode} to get started.`,
            url: referralUrl,
            title: 'Join Leadsong',
          }
        : {
            message: `Join me on Leadsong! Use my referral code ${referralCode} to get started.\n\n${referralUrl}`,
            title: 'Join Leadsong',
          };

      const result = await Share.share(shareContent);

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared via:', result.activityType);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to share: ' + error.message);
    }
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
          <Text style={styles.title}>Rewards</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Referral Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Refer a Friend</Text>
            <Text style={styles.sectionDescription}>
              Share Leadsong with friends and earn rewards when they join!
            </Text>

            {referralCode && (
              <View style={styles.referralCodeContainer}>
                <Text style={styles.referralCodeLabel}>Your Referral Code:</Text>
                <Text style={styles.referralCode}>{referralCode}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share with Friends</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                <Text style={styles.boldText}>How it works:</Text>
                {'\n\n'}
                • Share your unique referral code
                {'\n'}
                • Your friend signs up using your code
                {'\n'}
                • You both earn rewards!
              </Text>
            </View>
          </View>

          {/* Your Rewards Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Rewards</Text>
            
            {rewards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No Rewards Yet</Text>
                <Text style={styles.emptyStateText}>
                  Start earning rewards by referring friends and completing activities!
                </Text>
              </View>
            ) : (
              <View style={styles.rewardsList}>
                {rewards.map((reward) => (
                  <View key={reward.id} style={styles.rewardItem}>
                    <View style={styles.rewardHeader}>
                      <Text style={styles.rewardType}>{reward.reward_type}</Text>
                      <Text style={styles.rewardAmount}>+{reward.reward_amount} credits</Text>
                    </View>
                    <Text style={styles.rewardDescription}>{reward.description}</Text>
                    <Text style={styles.rewardDate}>
                      {new Date(reward.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  referralCodeContainer: {
    backgroundColor: '#F5F0FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#7C3AED',
    borderStyle: 'dashed',
  },
  referralCodeLabel: {
    fontSize: 12,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  referralCode: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
    letterSpacing: 2,
  },
  shareButton: {
    backgroundColor: '#7C3AED',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
  infoBox: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  infoText: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#333',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  rewardsList: {
    marginTop: 8,
  },
  rewardItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardType: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#333',
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
  },
  rewardDescription: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 4,
  },
  rewardDate: {
    fontSize: 12,
    fontFamily: GlobalFonts.regular,
    color: '#999',
  },
  bottomPadding: {
    height: 20,
    marginTop: 20,
  },
});

