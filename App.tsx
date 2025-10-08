import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { useFonts, Comfortaa_400Regular, Comfortaa_700Bold } from '@expo-google-fonts/comfortaa';
import { RootNavigator } from './src/navigation';

const linking = {
  prefixes: [
    'leadsong://', // Deep link scheme (updated for credit purchase)
    'property-ratings://', // Legacy deep link scheme
    'exp://192.168.12.238:8088', // Expo Go development
    'exp://localhost:8088', // Local development
  ],
  config: {
    screens: {
      Auth: 'auth',
      EmailConfirm: 'auth/callback',
      Map: 'map',
      ReportPreview: 'report/:propertyId',
      Earnings: 'earnings',
      Analytics: 'analytics',
      PurchaseSuccess: 'purchase/success', // Handle credit purchase return
    },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Comfortaa_400Regular,
    Comfortaa_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}