import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  StatusBar,
} from 'react-native';
import { CREDIT_PACKAGES, createCreditCheckout, CreditPackage } from '../services/creditPurchase';
import { syncPendingCredits } from '../services/creditSync';

interface CreditPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
  currentCredits: number;
}

export const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({
  visible,
  onClose,
  onPurchaseComplete,
  currentCredits,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

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
          
          // Show success message and close modal
          Alert.alert(
            'Checkout Opened',
            'Complete your purchase in the browser. Your credits will be added automatically after payment.',
            [
              {
                text: 'OK',
                onPress: () => {
                  onClose();
                  // Auto-sync credits after payment completion (multiple attempts)
                  const attemptSync = async (attempt = 1, maxAttempts = 6) => {
                    try {
                      console.log(`🔄 Auto-sync attempt ${attempt}/${maxAttempts}...`);
                      const syncResult = await syncPendingCredits();
                      if (syncResult.creditsAdded > 0) {
                        console.log(`✅ Auto-synced ${syncResult.creditsAdded} credits on attempt ${attempt}`);
                        onPurchaseComplete();
                        return;
                      }
                      
                      // If no credits found and we haven't reached max attempts, try again
                      if (attempt < maxAttempts) {
                        setTimeout(() => attemptSync(attempt + 1, maxAttempts), 5000);
                      } else {
                        console.log('⏰ Max sync attempts reached, calling onPurchaseComplete anyway');
                        onPurchaseComplete();
                      }
                    } catch (error) {
                      console.error(`Auto-sync attempt ${attempt} failed:`, error);
                      if (attempt < maxAttempts) {
                        setTimeout(() => attemptSync(attempt + 1, maxAttempts), 5000);
                      } else {
                        onPurchaseComplete();
                      }
                    }
                  };
                  
                  // Start first attempt after 3 seconds
                  setTimeout(() => attemptSync(), 3000);
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Cannot open checkout URL');
        }
      } else {
        Alert.alert('Error', 'Failed to create checkout session');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start checkout process');
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
        pkg.popular && styles.popularPackage,
        loading && selectedPackage === pkg.id && styles.loadingPackage
      ]}
      onPress={() => handlePurchase(pkg.id)}
      disabled={loading}
    >
      {pkg.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}
      
      <Text style={styles.packageName}>{pkg.name}</Text>
      <Text style={styles.packageCredits}>{pkg.credits} Credit{pkg.credits > 1 ? 's' : ''}</Text>
      <Text style={styles.packagePrice}>${pkg.price.toFixed(2)}</Text>
      <Text style={styles.packagePricePerCredit}>
        ${pkg.pricePerCredit.toFixed(2)} per credit
        {pkg.pricePerCredit < 10 && (
          <Text style={styles.savingsText}> (Save ${((10 - pkg.pricePerCredit) * pkg.credits).toFixed(0)}!)</Text>
        )}
      </Text>
      <Text style={styles.packageDescription}>{pkg.description}</Text>
      
      {loading && selectedPackage === pkg.id ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Opening checkout...</Text>
        </View>
      ) : (
        <View style={styles.purchaseButton}>
          <Text style={styles.purchaseButtonText}>Purchase</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  console.log('CreditPurchaseModal render - visible:', visible);
  
  if (!visible) return null;
  
  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <View style={styles.fullScreenContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>💳 Buy Credits</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => {
            console.log('Close button pressed!');
            onClose();
          }}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.currentCreditsContainer}>
          <Text style={styles.currentCreditsText}>
            Current Balance: {currentCredits} credits
          </Text>
        </View>

        <ScrollView style={styles.packagesContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Choose a credit package:</Text>
          
          {CREDIT_PACKAGES.map(renderPackage)}
          
          <View style={styles.newBox}>
            <Text style={styles.newBoxText}>📦 New Box - Add Your Content Here</Text>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>💡 How it works:</Text>
            <Text style={styles.infoText}>
              • Each property report costs 1 credit (normally $10){'\n'}
              • Buy in bulk to save money{'\n'}
              • Credits never expire{'\n'}
              • Secure payment via Stripe{'\n'}
              • Credits added automatically after payment
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  currentCreditsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentCreditsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976d2',
  },
  packagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  popularPackage: {
    borderWidth: 2,
    borderColor: '#FF6B35',
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  packageCredits: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  packagePricePerCredit: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  savingsText: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingPackage: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
  },
  newBox: {
    backgroundColor: '#FFE5B4',
    padding: 20,
    borderRadius: 12,
    margin: 8,
    borderWidth: 3,
    borderColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 80,
  },
  newBoxText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
