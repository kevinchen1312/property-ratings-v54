import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, AppState } from 'react-native';
import { MapScreen } from '../screens/MapScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { ReportPreviewScreen } from '../screens/ReportPreviewScreen';
import { EmailConfirmScreen } from '../screens/EmailConfirmScreen';
import { PurchaseSuccessScreen } from '../screens/PurchaseSuccessScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CreditsScreen } from '../screens/CreditsScreen';
import { SearchDemoScreen } from '../screens/SearchDemoScreen';
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
  Profile: undefined;
  Credits: undefined;
  SearchDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

    // Restore session when app comes to foreground (after returning from browser)
    const appStateListener = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App came to foreground, restoring session...');
        const restoredSession = await getInitialSession();
        if (restoredSession) {
          setSession(restoredSession);
          console.log('✅ Session restored');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateListener.remove();
    };
  }, []);

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
            component={MapScreen}
            options={{
              headerShown: false,
            }}
          />
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
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Credits"
            component={CreditsScreen}
            options={{
              title: 'My Credits',
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
            name="SearchDemo"
            component={SearchDemoScreen}
            options={{
              title: 'Search Demo',
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
