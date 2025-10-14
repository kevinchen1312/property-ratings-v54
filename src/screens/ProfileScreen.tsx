import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { GlobalFonts } from '../styles/global';
import { getUserProfile, getReferralLink, getReferralStats } from '../lib/credits';
import { signOut } from '../lib/auth';
import type { UserProfile } from '../lib/credits';

export const ProfileScreen: React.FC = () => {
  const { signOut: clerkSignOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [referralStats, setReferralStats] = useState({ referralCount: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await getUserProfile();
      const stats = await getReferralStats();
      setProfile(profileData);
      setReferralStats(stats);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReferralCode = () => {
    if (profile?.referral_code) {
      Clipboard.setString(profile.referral_code);
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    }
  };

  const handleShareReferralLink = () => {
    if (profile?.referral_code) {
      const link = getReferralLink(profile.referral_code);
      Clipboard.setString(link);
      Alert.alert('Link Copied!', 'Share this link with your friends to earn rewards when they sign up!');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out from both Clerk and Supabase
              await signOut(); // Supabase
              await clerkSignOut(); // Clerk
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{profile.full_name || 'Not set'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>
        </View>
      </View>

      {/* Referral Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Referral Code</Text>
        <View style={styles.referralCard}>
          <Text style={styles.referralCode}>{profile.referral_code}</Text>
          <Text style={styles.referralHint}>
            Share your code with friends and earn rewards when they sign up!
          </Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]} 
              onPress={handleCopyReferralCode}
            >
              <Text style={styles.primaryButtonText}>Copy Code</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]} 
              onPress={handleShareReferralLink}
            >
              <Text style={styles.secondaryButtonText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Referral Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Referral Stats</Text>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{referralStats.referralCount}</Text>
            <Text style={styles.statLabel}>Friends Referred</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{referralStats.totalEarned}</Text>
            <Text style={styles.statLabel}>Credits Earned</Text>
          </View>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    fontFamily: GlobalFonts.regular,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#000',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontFamily: GlobalFonts.regular,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    fontFamily: GlobalFonts.bold,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  referralCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  referralCode: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#007AFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  referralHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: GlobalFonts.regular,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: GlobalFonts.regular,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 20,
  },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 30,
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  bottomSpacer: {
    height: 40,
  },
});
