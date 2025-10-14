import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSignIn, useSignUp, useOAuth, useAuth } from '@clerk/clerk-expo';
import { GlobalFonts } from '../styles/global';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export const ClerkAuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForceSignOut, setShowForceSignOut] = useState(false);

  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { signOut: clerkSignOut, isSignedIn } = useAuth();
  
  // OAuth hooks
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({ strategy: 'oauth_facebook' });

  // Show force sign-out button if user is signed in but stuck on auth screen
  useEffect(() => {
    if (isSignedIn) {
      console.log('⚠️ User is signed in but on auth screen - showing force sign out option');
      setShowForceSignOut(true);
    } else {
      setShowForceSignOut(false);
    }
  }, [isSignedIn]);

  const handleForceSignOut = async () => {
    try {
      setLoading(true);
      console.log('🔄 Force signing out...');
      
      // Clear Clerk session
      await clerkSignOut();
      
      // Clear global variables
      (global as any).__supabaseClerkToken = null;
      (global as any).__clerkUserSession = null;
      
      // Clear Clerk tokens from SecureStore
      try {
        await SecureStore.deleteItemAsync('__clerk_client_jwt');
        await SecureStore.deleteItemAsync('__clerk_session_token');
        await SecureStore.deleteItemAsync('__clerk_refresh_token');
      } catch (err) {
        console.warn('Could not clear some Clerk tokens:', err);
      }
      
      console.log('✅ Force sign out complete');
      Alert.alert('Success', 'Session cleared. Please try signing in again.');
      setShowForceSignOut(false);
    } catch (error) {
      console.error('Error during force sign out:', error);
      Alert.alert('Error', 'Could not clear session. Please restart the app.');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (isSignUp) {
      if (!firstName.trim()) {
        Alert.alert('Error', 'First name is required');
        return false;
      }
      if (!lastName.trim()) {
        Alert.alert('Error', 'Last name is required');
        return false;
      }
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Password is required');
      return false;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }
    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleEmailAuth = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isSignUp) {
        // Sign up with email/password
        const result = await signUp!.create({
          emailAddress: email,
          password,
          firstName,
          lastName,
        });

        // Send verification email
        await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
        
        Alert.alert(
          'Verify Your Email',
          'We sent you a verification code. Please check your email and verify your account before signing in.',
          [{ text: 'OK' }]
        );
        
        // Switch to sign in mode
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        // Sign in with email/password
        const result = await signIn!.create({
          identifier: email,
          password,
        });

        await setActiveSignIn!({ session: result.createdSessionId });
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      const errorMsg = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || error.message;
      
      // Check if user is already signed in
      if (errorMsg?.toLowerCase().includes('already signed in')) {
        Alert.alert(
          'Session Stuck',
          'You have an existing session. Please use the "Clear Session" button above to sign out first.',
          [{ text: 'OK' }]
        );
        setShowForceSignOut(true);
        return;
      }
      
      if (errorMsg?.includes('verification strategy')) {
        Alert.alert(
          'Wrong Sign-In Method',
          'This account was created with Google, Apple, or Facebook. Please use the same method to sign in.',
          [{ text: 'OK' }]
        );
      } else if (errorMsg?.includes('Incorrect password') || errorMsg?.includes('password is incorrect')) {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      } else if (errorMsg?.includes('not found') || errorMsg?.includes("Couldn't find your account")) {
        Alert.alert('Error', 'No account found with this email. Please sign up first.');
      } else {
        Alert.alert('Error', errorMsg || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'apple' | 'google' | 'facebook') => {
    setLoading(true);
    try {
      let startOAuth;
      switch (provider) {
        case 'apple':
          startOAuth = startAppleOAuth;
          break;
        case 'google':
          startOAuth = startGoogleOAuth;
          break;
        case 'facebook':
          startOAuth = startFacebookOAuth;
          break;
      }

      // Use custom redirect URL for Clerk
      const { createdSessionId, setActive } = await startOAuth({
        redirectUrl: 'property-ratings://oauth-native-callback'
      });
      
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
      }
    } catch (error: any) {
      console.error(`${provider} OAuth error:`, error);
      const errorMsg = error.errors?.[0]?.longMessage || error.message;
      
      // Check if user is already signed in
      if (errorMsg?.toLowerCase().includes('already signed in')) {
        Alert.alert(
          'Session Stuck',
          'You have an existing session. Please use the "Clear Session" button above to sign out first.',
          [{ text: 'OK' }]
        );
        setShowForceSignOut(true);
        return;
      }
      
      if (!error.message?.includes('user_cancelled') && !error.message?.includes('User cancelled')) {
        if (errorMsg?.includes('redirect url')) {
          Alert.alert(
            'Configuration Error',
            'OAuth redirect URL not configured. Please add "property-ratings://oauth-native-callback" to your Clerk Dashboard under Configure > Native applications > Redirect URLs.'
          );
        } else {
          Alert.alert('Error', `Failed to sign in with ${provider}: ${errorMsg}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>LeadSong</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </Text>
        </View>

        {/* Force Sign Out Warning */}
        {showForceSignOut && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={20} color="#FFA500" />
            <Text style={styles.warningText}>
              You're already signed in but session is stuck.
            </Text>
            <TouchableOpacity
              style={styles.forceSignOutButton}
              onPress={handleForceSignOut}
              disabled={loading}
            >
              <Text style={styles.forceSignOutButtonText}>Clear Session</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.form}>
          {/* OAuth Buttons */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity
              style={styles.oauthButton}
              onPress={() => handleOAuthSignIn('apple')}
              disabled={loading}
            >
              <Ionicons name="logo-apple" size={24} color="#000" />
              <Text style={styles.oauthButtonText}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.oauthButton}
              onPress={() => handleOAuthSignIn('google')}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={24} color="#DB4437" />
              <Text style={styles.oauthButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.oauthButton}
              onPress={() => handleOAuthSignIn('facebook')}
              disabled={loading}
            >
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              <Text style={styles.oauthButtonText}>Continue with Facebook</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password Form */}
          {isSignUp && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="John"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Doe"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {isSignUp && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Type your password again"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.authButton, loading && styles.disabledButton]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authButtonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={switchMode}
            disabled={loading}
          >
            <Text style={styles.switchButtonText}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7C3AED', // Purple background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: GlobalFonts.regular,
    color: '#E9D5FF', // Light purple
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  warningText: {
    fontFamily: GlobalFonts.regular,
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  forceSignOutButton: {
    backgroundColor: '#FFA500',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  forceSignOutButtonText: {
    fontFamily: GlobalFonts.semiBold,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  oauthContainer: {
    gap: 12,
    marginBottom: 20,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  oauthButtonText: {
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#374151',
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#9CA3AF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#7C3AED',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: GlobalFonts.regular,
    color: '#111827',
  },
  authButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: GlobalFonts.bold,
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 14,
    fontFamily: GlobalFonts.regular,
    color: '#7C3AED',
    fontWeight: '600',
  },
});
