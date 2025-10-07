/**
 * Credit Balance Helper Functions
 * Computes credit balance from ledger and provides profile info
 */

import { supabase } from './supabase';

export interface CreditLedgerEntry {
  id: number;
  user_id: string;
  delta: number;
  reason: 'referral_bonus_referrer' | 'referral_bonus_referred' | 'purchase' | 'admin_adjustment' | 'spend';
  meta: any;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
}

/**
 * Get current user's credit balance by summing ledger deltas
 */
export async function getCreditBalance(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('credit_ledger')
      .select('delta');
    
    if (error) {
      console.error('Error fetching credit balance:', error);
      return 0;
    }
    
    return data.reduce((sum, row) => sum + row.delta, 0);
  } catch (error) {
    console.error('Error computing credit balance:', error);
    return 0;
  }
}

/**
 * Get current user's credit ledger (recent transactions)
 */
export async function getCreditLedger(limit: number = 50): Promise<CreditLedgerEntry[]> {
  try {
    const { data, error } = await supabase
      .from('credit_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching credit ledger:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching credit ledger:', error);
    return [];
  }
}

/**
 * Get current user's profile with referral code
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Get referral stats (how many people used your code)
 */
export async function getReferralStats(): Promise<{ referralCount: number; totalEarned: number }> {
  try {
    const profile = await getUserProfile();
    
    if (!profile) {
      return { referralCount: 0, totalEarned: 0 };
    }
    
    // Count how many users have this user as their referred_by
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', profile.id);
    
    if (countError) {
      console.error('Error counting referrals:', countError);
    }
    
    // Sum up referral bonus earnings
    const { data: earnings, error: earningsError } = await supabase
      .from('credit_ledger')
      .select('delta')
      .eq('user_id', profile.id)
      .eq('reason', 'referral_bonus_referrer');
    
    if (earningsError) {
      console.error('Error fetching referral earnings:', earningsError);
    }
    
    const totalEarned = earnings?.reduce((sum, row) => sum + row.delta, 0) || 0;
    
    return {
      referralCount: count || 0,
      totalEarned,
    };
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return { referralCount: 0, totalEarned: 0 };
  }
}

/**
 * Format credit reason for display
 */
export function formatCreditReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    referral_bonus_referrer: 'Referral Bonus (You referred someone)',
    referral_bonus_referred: 'Referral Bonus (Welcome gift)',
    purchase: 'Credit Purchase',
    admin_adjustment: 'Admin Adjustment',
    spend: 'Credit Used',
  };
  
  return reasonMap[reason] || reason;
}

/**
 * Get shareable referral link
 */
export function getReferralLink(referralCode: string): string {
  // For mobile app, use deep link format
  return `https://leadsong.com/referral/${referralCode}`;
}
