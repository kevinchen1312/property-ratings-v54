/**
 * Credit and Profile Helper Functions for Web
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface CreditLedgerEntry {
  id: number;
  user_id: string;
  delta: number;
  reason: 'referral_bonus_referrer' | 'referral_bonus_referred' | 'purchase' | 'admin_adjustment' | 'spend';
  meta: any;
  created_at: string;
}

/**
 * Get current user's credit balance by summing ledger deltas
 */
export async function getCreditBalance(): Promise<number> {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .from('credit_ledger')
      .select('delta')
      .eq('user_id', user.id);
    
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
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('credit_ledger')
      .select('*')
      .eq('user_id', user.id)
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
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}
