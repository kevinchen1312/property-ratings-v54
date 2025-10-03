import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapScreen } from '../screens/MapScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { ReportPreviewScreen } from '../screens/ReportPreviewScreen';
import { EmailConfirmScreen } from '../screens/EmailConfirmScreen';
import { PurchaseSuccessScreen } from '../screens/PurchaseSuccessScreen';
import { getInitialSession, onAuthStateChange } from '../lib/auth';
import { Session } from '../lib/types';
import { Loading } from '../components/Loading';
import { GlobalFonts } from '../styles/global';

export type RootStackParamList = {
  Map: undefined;
  Auth: undefined;
  EmailConfirm: undefined;
  ReportPreview: {
    propertyId: string;
    propertyName?: string;
  };
  PurchaseSuccess: {
    session_id?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoOrientEnabled, setAutoOrientEnabled] = useState(true); // Default to ON

  useEffect(() => {
    // Get initial session
    getInitialSession().then((session) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((session) => {
      setSession(session);
    });

    // Load auto-orient setting
    loadAutoOrientSetting();

    return () => subscription.unsubscribe();
  }, []);

  const loadAutoOrientSetting = async () => {
    try {
      const value = await AsyncStorage.getItem('autoOrientEnabled');
      if (value !== null) {
        setAutoOrientEnabled(value === 'true');
      }
    } catch (error) {
      // Silently handle - use default value
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
    <Stack.Navigator>
      {session ? (
        <>
          <Stack.Screen
            name="Map"
            options={{
              headerShown: false,
            }}
          >
            {(props) => <MapScreen {...props} autoOrientEnabled={autoOrientEnabled} />}
          </Stack.Screen>
          <Stack.Screen
            name="ReportPreview"
            component={ReportPreviewScreen}
            options={{
              title: 'Property Report',
              headerStyle: {
                backgroundColor: '#007AFF',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
                fontFamily: GlobalFonts.bold,
              },
            }}
          />
          <Stack.Screen
            name="PurchaseSuccess"
            component={PurchaseSuccessScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="EmailConfirm"
            component={EmailConfirmScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
    </>
  );
};

const styles = StyleSheet.create({
  // No styles needed - settings moved to MapScreen
});
