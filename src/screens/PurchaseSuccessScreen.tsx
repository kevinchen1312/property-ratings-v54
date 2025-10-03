import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getUserCredits } from '../services/reportsApi';
import { GlobalFonts } from '../styles/global';

export const PurchaseSuccessScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    handlePurchaseSuccess();
  }, []);

  const handlePurchaseSuccess = async () => {
    // Wait a moment for webhook to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Refresh credits (this will update the badge in the map screen)
    await getUserCredits();

    // Navigate back to map
    navigation.navigate('Map' as never);
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7C3AED" />
      <Text style={styles.text}>Processing your purchase...</Text>
      <Text style={styles.subtext}>You'll be redirected shortly</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 10,
    textAlign: 'center',
  },
});

