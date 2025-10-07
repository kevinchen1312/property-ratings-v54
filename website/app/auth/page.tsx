'use client';

/**
 * Simple Auth Page for Testing
 * Use this to sign in and test the credits page
 */

import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function AuthPageContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/credits';
  const refParam = searchParams.get('ref');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Handle referral code from URL or localStorage
  useEffect(() => {
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
      localStorage.setItem('referralCode', refParam.toUpperCase());
    } else {
      const storedRef = localStorage.getItem('referralCode');
      if (storedRef) {
        setReferralCode(storedRef);
      }
    }
  }, [refParam]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || null,
              incoming_referral_code: referralCode || null,
            },
          },
        });

        if (error) throw error;

        // Clear stored referral code after successful signup
        localStorage.removeItem('referralCode');
        
        // Show success message
        setError('');
        alert('Account created! Please check your email to verify your account.');
        setIsSignUp(false);
      } else {
        // SIGN IN - Updated for reliability
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Verify session is established
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Use window.location for reliable cookie handling
          // Small delay to ensure cookies are set
          await new Promise(resolve => setTimeout(resolve, 300));
          window.location.href = next;
        } else {
          throw new Error('Session not established. Please try again.');
        }
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{isSignUp ? 'Create Account' : 'Sign In'}</h1>
        <p className={styles.subtitle}>
          {isSignUp ? 'Join Leadsong today' : 'Welcome back to Leadsong'}
        </p>

        <form onSubmit={handleAuth} className={styles.form}>
          {isSignUp && (
            <div className={styles.field}>
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div className={styles.field}>
              <label htmlFor="referralCode">Referral Code (Optional)</label>
              <input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter referral code"
                style={{ textTransform: 'uppercase' }}
              />
              <p className={styles.hint}>
                Have a friend's referral code? Both of you will get bonus credits!
              </p>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading 
              ? (isSignUp ? 'Creating Account...' : 'Signing in...') 
              : (isSignUp ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        <div className={styles.help}>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className={styles.switchButton}
          >
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}