'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
}

interface ReferralStats {
  referralCount: number;
  totalEarned: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ReferralStats>({ referralCount: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth?next=/profile');
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load referral stats
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', user.id);

      const { data: earnings, error: earningsError } = await supabase
        .from('credit_ledger')
        .select('delta')
        .eq('user_id', user.id)
        .eq('reason', 'referral_bonus_referrer');

      const totalEarned = earnings?.reduce((sum, row) => sum + row.delta, 0) || 0;

      setStats({
        referralCount: count || 0,
        totalEarned,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (profile?.referral_code) {
      const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>My Profile</h1>

        {/* Profile Info Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Account Information</h2>
          <div className={styles.infoRow}>
            <span className={styles.label}>Name</span>
            <span className={styles.value}>{profile.full_name || 'Not set'}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.infoRow}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{profile.email}</span>
          </div>
        </div>

        {/* Referral Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Your Referral Code</h2>
          <div className={styles.referralCode}>{profile.referral_code}</div>
          <p className={styles.hint}>
            Share your code with friends and earn rewards when they sign up!
          </p>
          <div className={styles.buttonRow}>
            <button onClick={handleCopyCode} className={styles.primaryButton}>
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
            <button onClick={handleCopyLink} className={styles.secondaryButton}>
              Copy Share Link
            </button>
          </div>
        </div>

        {/* Stats Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Referral Stats</h2>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{stats.referralCount}</div>
              <div className={styles.statLabel}>Friends Referred</div>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <div className={styles.statValue}>{stats.totalEarned}</div>
              <div className={styles.statLabel}>Credits Earned</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className={styles.links}>
          <a href="/credits" className={styles.link}>View My Credits →</a>
        </div>

        {/* Sign Out Button */}
        <button onClick={handleSignOut} className={styles.signOutButton}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
