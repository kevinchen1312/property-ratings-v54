import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export const EmailConfirmScreen: React.FC = () => {
  const navigation = useNavigation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');

  useEffect(() => {
    handleEmailConfirmation();
  }, []);

  const handleEmailConfirmation = async () => {
    try {
      // Get the current session after email confirmation
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus('error');
        setMessage('Email confirmation failed. Please try again.');
        console.error('Email confirmation error:', error);
        
        // Navigate back to auth screen after 3 seconds
        setTimeout(() => {
          navigation.navigate('Auth' as never);
        }, 3000);
        return;
      }

      if (session) {
        setStatus('success');
        setMessage('Email confirmed! Taking you to the app...');
        
        // Navigate to main screen after 1.5 seconds
        setTimeout(() => {
          navigation.navigate('Map' as never);
        }, 1500);
      } else {
        setStatus('error');
        setMessage('Session not found. Please sign in again.');
        
        setTimeout(() => {
          navigation.navigate('Auth' as never);
        }, 3000);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
      console.error('Unexpected error:', error);
      
      setTimeout(() => {
        navigation.navigate('Auth' as never);
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.title}>{message}</Text>
          </>
        )}
        
        {status === 'success' && (
          <>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.title}>{message}</Text>
          </>
        )}
        
        {status === 'error' && (
          <>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.title}>{message}</Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  successIcon: {
    fontSize: 64,
  },
  errorIcon: {
    fontSize: 64,
  },
});

