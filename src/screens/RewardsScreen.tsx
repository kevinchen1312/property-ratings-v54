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

interface PendingReward {
  id: string;
  reward_type: string;
  reward_amount: number;
  description: string;
  created_at: string;
  status: string;
  metadata?: any;
}

interface ClaimedReward {
  id: string;
  reward_type: string;
  reward_amount: number;
  description: string;
  claimed_at: string;
}

interface AvailableAchievement {
  id: string;
  milestone_key: string;
  title: string;
  description: string;
  reward_amount: number;
  required_submissions: number;
  icon: string;
}

interface MilestoneProgress {
  total_submissions: number;
  milestone_100_claimed: boolean;
  milestone_5000_claimed: boolean;
  progress_to_100: number;
  progress_to_5000: number;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({ visible, onClose }) => {
  const [userId, setUserId] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState<AvailableAchievement[]>([]);
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

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
      
      // Get referral code from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setReferralCode(profile.referral_code);
      }

      // Load pending rewards
      const { data: pending, error: pendingError } = await supabase
        .from('pending_rewards')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Error loading pending rewards:', pendingError);
      } else {
        setPendingRewards(pending || []);
      }

      // Load claimed rewards (last 10)
      const { data: claimed, error: claimedError } = await supabase
        .from('pending_rewards')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'claimed')
        .order('claimed_at', { ascending: false })
        .limit(10);

      if (claimedError) {
        console.error('Error loading claimed rewards:', claimedError);
      } else {
        setClaimedRewards(claimed || []);
      }

      // Load available achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('available_achievements')
        .select('*')
        .order('required_submissions', { ascending: true });

      if (achievementsError) {
        console.error('Error loading available achievements:', achievementsError);
      } else {
        setAvailableAchievements(achievements || []);
      }

      // Load milestone progress
      const { data: progress, error: progressError } = await supabase
        .rpc('get_user_milestone_progress', { p_user_id: user.id })
        .single();

      if (progressError) {
        console.error('Error loading milestone progress:', progressError);
      } else {
        setMilestoneProgress(progress);
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (rewardId: string) => {
    try {
      setClaiming(rewardId);

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be logged in to claim rewards');
        return;
      }

      // Call the edge function to claim the reward
      const { data, error } = await supabase.functions.invoke('claimReward', {
        body: { reward_id: rewardId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error claiming reward:', error);
        Alert.alert('Error', 'Failed to claim reward. Please try again.');
        return;
      }

      if (data && data.success) {
        Alert.alert(
          'Success!',
          data.message || `You claimed ${data.credits_added} credits!`,
          [{ text: 'OK' }]
        );

        // Reload rewards to update the UI
        await loadUserData();
      } else {
        Alert.alert('Error', 'Failed to claim reward');
      }
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      Alert.alert('Error', error.message || 'Failed to claim reward');
    } finally {
      setClaiming(null);
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
                • Share your unique referral code with 1 new user
                {'\n'}
                • When they sign up with your code, you both get 1 free credit
                {'\n'}
                • Your friend also gets 1 free credit for using your code
                {'\n'}
                • Start earning credits today!
              </Text>
            </View>
          </View>

          {/* Pending Rewards Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Claimable Rewards</Text>
            
            {pendingRewards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No Pending Rewards</Text>
                <Text style={styles.emptyStateText}>
                  Start earning rewards by referring friends or completing milestones!
                </Text>
              </View>
            ) : (
              <View style={styles.rewardsList}>
                {pendingRewards.map((reward) => (
                  <TouchableOpacity
                    key={reward.id}
                    style={styles.pendingRewardItem}
                    onPress={() => handleClaimReward(reward.id)}
                    disabled={claiming === reward.id}
                  >
                    <View style={styles.rewardHeader}>
                      <Text style={styles.rewardType}>
                        {reward.reward_type === 'referral_referrer' ? 'Referral Bonus' : 
                         reward.reward_type === 'referral_new_user' ? 'Referral Reward' :
                         reward.reward_type === 'achievement' ? 'Achievement' : 'Welcome Bonus'}
                      </Text>
                      <Text style={styles.rewardAmount}>+{reward.reward_amount} credits</Text>
                    </View>
                    <Text style={styles.rewardDescription}>{reward.description}</Text>
                    <View style={styles.claimButtonContainer}>
                      <View style={styles.claimButton}>
                        <Text style={styles.claimButtonText}>
                          {claiming === reward.id ? 'Claiming...' : 'Tap to Claim'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Available Achievements Section */}
          {availableAchievements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Milestone Achievements</Text>
              <Text style={styles.sectionDescription}>
                Complete Leadsong submissions to unlock credits!
              </Text>
              
              <View style={styles.rewardsList}>
                {availableAchievements.map((achievement) => {
                  const isMilestone100 = achievement.milestone_key === '100_submissions';
                  const isMilestone5000 = achievement.milestone_key === '5000_submissions';
                  
                  const claimed = isMilestone100 
                    ? milestoneProgress?.milestone_100_claimed 
                    : isMilestone5000 
                      ? milestoneProgress?.milestone_5000_claimed 
                      : false;
                  
                  const progress = isMilestone100
                    ? milestoneProgress?.progress_to_100 || 0
                    : isMilestone5000
                      ? milestoneProgress?.progress_to_5000 || 0
                      : 0;

                  const currentCount = milestoneProgress?.total_submissions || 0;

                  return (
                    <View 
                      key={achievement.id} 
                      style={[
                        styles.achievementItem,
                        claimed && styles.achievementItemClaimed
                      ]}
                    >
                      <View style={styles.achievementContent}>
                        <View style={styles.rewardHeader}>
                          <Text style={styles.achievementTitle}>{achievement.title}</Text>
                          <Text style={styles.achievementReward}>
                            {achievement.reward_amount} credit{achievement.reward_amount > 1 ? 's' : ''}
                          </Text>
                        </View>
                        <Text style={styles.achievementDescription}>
                          {achievement.description}
                        </Text>
                        
                        {claimed ? (
                          <View style={styles.achievementClaimedBadge}>
                            <Text style={styles.achievementClaimedText}>Completed</Text>
                          </View>
                        ) : (
                          <>
                            <View style={styles.progressBarContainer}>
                              <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
                            </View>
                            <Text style={styles.progressText}>
                              {currentCount} / {achievement.required_submissions} submissions ({progress}%)
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Claimed Rewards History */}
          {claimedRewards.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Claims</Text>
              <View style={styles.rewardsList}>
                {claimedRewards.map((reward) => (
                  <View key={reward.id} style={styles.claimedRewardItem}>
                    <View style={styles.rewardHeader}>
                      <Text style={styles.rewardTypeSmall}>
                        {reward.reward_type === 'referral_referrer' ? 'Referral Bonus' : 
                         reward.reward_type === 'referral_new_user' ? 'Referral Reward' :
                         reward.reward_type === 'achievement' ? 'Achievement' : 'Welcome'}
                      </Text>
                      <Text style={styles.rewardAmountSmall}>+{reward.reward_amount}</Text>
                    </View>
                    <Text style={styles.rewardDateSmall}>
                      Claimed {new Date(reward.claimed_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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
  pendingRewardItem: {
    backgroundColor: '#F5F0FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  claimedRewardItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
    flex: 1,
  },
  rewardTypeSmall: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#666',
  },
  rewardAmount: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
  },
  rewardAmountSmall: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
  },
  rewardDescription: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  rewardDate: {
    fontSize: 12,
    fontFamily: GlobalFonts.regular,
    color: '#999',
  },
  rewardDateSmall: {
    fontSize: 11,
    fontFamily: GlobalFonts.regular,
    color: '#999',
    marginTop: 4,
  },
  claimButtonContainer: {
    marginTop: 8,
  },
  claimButton: {
    backgroundColor: '#7C3AED',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
  bottomPadding: {
    height: 20,
    marginTop: 20,
  },
  achievementItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  achievementItemClaimed: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    flex: 1,
  },
  achievementReward: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
  },
  achievementDescription: {
    fontSize: 13,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: GlobalFonts.regular,
    color: '#666',
  },
  achievementClaimedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  achievementClaimedText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#fff',
  },
});

