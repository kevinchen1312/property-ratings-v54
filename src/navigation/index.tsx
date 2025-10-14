import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { MapScreen } from '../screens/MapScreen';
import { ClerkAuthScreen } from '../screens/ClerkAuthScreen';
import { ReportPreviewScreen } from '../screens/ReportPreviewScreen';
import { EmailConfirmScreen } from '../screens/EmailConfirmScreen';
import { PurchaseSuccessScreen } from '../screens/PurchaseSuccessScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CreditsScreen } from '../screens/CreditsScreen';
import { SearchDemoScreen } from '../screens/SearchDemoScreen';
import { Loading } from '../components/Loading';
import { GlobalFonts } from '../styles/global';
import { useClerkSupabaseSync } from '../hooks/useClerkSupabaseSync';

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
  // Use Clerk-Supabase sync hook to manage authentication
  const { supabaseSession, isLoading } = useClerkSupabaseSync();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
    <Stack.Navigator>
      {supabaseSession ? (
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
            component={ClerkAuthScreen}
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
