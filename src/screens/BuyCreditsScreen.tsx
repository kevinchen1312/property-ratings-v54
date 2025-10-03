import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { CREDIT_PACKAGES, CreditPackage } from '../services/creditPurchase';
import { getUserCredits } from '../services/reportsApi';
import { GlobalFonts } from '../styles/global';
import { supabase } from '../lib/supabase';

interface BuyCreditsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const BuyCreditsScreen: React.FC<BuyCreditsScreenProps> = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [currentCredits, setCurrentCredits] = useState(0);

  useEffect(() => {
    if (visible) {
      loadCredits();
      
      // Auto-refresh credits every 1 second for 10 seconds after screen opens
      // This catches credits added by webhook after purchase
      let refreshCount = 0;
      const maxRefreshes = 10; // 10 refreshes × 1 second = 10 seconds
      
      const intervalId = setInterval(() => {
        refreshCount++;
        console.log(`Auto-refreshing credits (${refreshCount}/${maxRefreshes})...`);
        loadCredits();
        
        if (refreshCount >= maxRefreshes) {
          clearInterval(intervalId);
          console.log('Auto-refresh stopped');
        }
      }, 1000); // Every 1 second
      
      // Cleanup interval when screen closes
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [visible]);

  const loadCredits = async () => {
    console.log('🔄 Refreshing credits...');
    const credits = await getUserCredits();
    console.log('💰 Credits fetched:', credits);
    setCurrentCredits(credits);
  };

  const handlePurchase = async (packageId: string) => {
    setLoading(true);
    setSelectedPackage(packageId);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'Please sign in first');
        return;
      }

      // Open credit purchase website with auth token
      const url = `https://leadongs-credits.vercel.app/credits?access_token=${session.access_token}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open credit purchase page');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open website');
    } finally {
      setLoading(false);
      setSelectedPackage(null);
    }
  };

  const renderPackage = (pkg: CreditPackage) => (
    <TouchableOpacity
      key={pkg.id}
      style={[
        styles.packageCard,
        pkg.savings && styles.popularPackage,
      ]}
      onPress={() => handlePurchase(pkg.id)}
      disabled={loading}
    >
      {pkg.savings && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsText}>Save ${pkg.savings}</Text>
        </View>
      )}
      
      <Text style={styles.packageCredits}>
        {pkg.credits} {pkg.credits === 1 ? 'credit' : 'credits'}
      </Text>
      <Text style={styles.packagePrice}>${pkg.price}</Text>
      <Text style={styles.packagePricePerCredit}>
        ${(pkg.price / pkg.credits).toFixed(2)}/ea
      </Text>
      
      {loading && selectedPackage === pkg.id && (
        <ActivityIndicator style={styles.packageLoader} size="small" color="#7C3AED" />
      )}
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>Buy Credits</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.currentCreditsContainer}>
            <Text style={styles.currentCreditsText}>
              Current Balance: {currentCredits} credits
            </Text>
          </View>

          <View style={styles.packagesContainer}>
            <Text style={styles.subtitle}>Choose a credit package:</Text>
            
            <View style={styles.packagesGrid}>
              {CREDIT_PACKAGES.map(renderPackage)}
              <View style={[styles.infoContainer, { width: '100%', margin: 0, marginTop: 8 }]}>
                <Text style={styles.infoTitle}>Credit system explained</Text>
                <Text style={styles.infoText}>
                  • Each property report costs 1 credit{'\n'}
                  • Credits never expire{'\n'}
                  • Secure payment via Stripe on leadsong.com{'\n'}
                  • After paying, close the browser and return here{'\n'}
                  • Credits appear automatically within seconds
                </Text>
              </View>
            </View>
          </View>
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
  scrollContent: {
    flex: 1,
  },
  currentCreditsContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentCreditsText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    textAlign: 'center',
  },
  packagesContainer: {
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 20,
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
    marginBottom: 0,
    padding: 0,
    gap: 0,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    aspectRatio: 1,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularPackage: {
    borderColor: '#7C3AED',
    backgroundColor: '#f5f0ff',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  packageCredits: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
    marginBottom: 2,
  },
  packagePricePerCredit: {
    fontSize: 11,
    fontFamily: GlobalFonts.regular,
    color: '#666',
  },
  packageLoader: {
    marginTop: 10,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 0,
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#666',
    lineHeight: 22,
  },
});
