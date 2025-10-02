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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { CREDIT_PACKAGES, createCreditCheckout, CreditPackage } from '../services/creditPurchase';
import { syncPendingCredits } from '../services/creditSync';
import { getUserCredits } from '../services/reportsApi';
import { GlobalFonts } from '../styles/global';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'BuyCredits'>;

export const BuyCreditsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [currentCredits, setCurrentCredits] = useState(0);

  // Refresh credits when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCredits();
    }, [])
  );

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    const credits = await getUserCredits();
    setCurrentCredits(credits);
  };

  const handlePurchase = async (packageId: string) => {
    setLoading(true);
    setSelectedPackage(packageId);

    try {
      const result = await createCreditCheckout(packageId);
      
      if (result.success && result.checkout_url) {
        // Open Stripe checkout in browser
        const supported = await Linking.canOpenURL(result.checkout_url);
        
        if (supported) {
          await Linking.openURL(result.checkout_url);
          
          // Show success message
          Alert.alert(
            'Complete Your Purchase',
            'You will be taken to Stripe to complete payment. After paying, you can close the browser and return to the app. Credits will appear automatically.',
            [
              {
                text: 'Got It',
                onPress: () => {
                  // Stay on this screen so they can see updated credits when they return
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Cannot open checkout URL');
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to create checkout session');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to initiate purchase');
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
      
      <Text style={styles.packageCredits}>{pkg.credits} Credits</Text>
      <Text style={styles.packagePrice}>${pkg.price}</Text>
      <Text style={styles.packagePricePerCredit}>
        ${(pkg.price / pkg.credits).toFixed(2)} per credit
      </Text>
      
      {loading && selectedPackage === pkg.id && (
        <ActivityIndicator style={styles.packageLoader} size="small" color="#7C3AED" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.currentCreditsContainer}>
        <Text style={styles.currentCreditsText}>
          Current Balance: {currentCredits} credits
        </Text>
      </View>

      <ScrollView style={styles.packagesContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Choose a credit package:</Text>
        
        {CREDIT_PACKAGES.map(renderPackage)}
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>💡 How it works:</Text>
          <Text style={styles.infoText}>
            • Each property report costs 1 credit (normally $10){'\n'}
            • Buy in bulk to save money{'\n'}
            • Credits never expire{'\n'}
            • Secure payment via Stripe{'\n'}
            • After paying, close the browser and return here{'\n'}
            • Credits appear automatically within seconds
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  currentCreditsContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  currentCreditsText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    textAlign: 'center',
  },
  packagesContainer: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
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
    top: -10,
    right: 10,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  packageCredits: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#333',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#7C3AED',
    marginBottom: 4,
  },
  packagePricePerCredit: {
    fontSize: 14,
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
    marginTop: 20,
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

