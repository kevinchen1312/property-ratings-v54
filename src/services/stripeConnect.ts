import { supabase } from '../lib/supabase';

const SUPABASE_REF = "oyphcjbickujybvbeame";

export interface StripeConnectAccount {
  id: string;
  user_id: string;
  stripe_account_id: string;
  account_status: 'pending' | 'active' | 'restricted' | 'inactive';
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  country: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface StripeConnectStatus {
  has_account: boolean;
  account_status: string;
  payouts_enabled: boolean;
  stripe_account_id: string | null;
}

/**
 * Get user's Stripe Connect account status
 */
export async function getStripeConnectStatus(): Promise<StripeConnectStatus> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.rpc('get_user_stripe_connect_status', {
      p_user_id: session.session.user.id
    });

    if (error) {
      console.error('Error getting Stripe Connect status:', error);
      throw new Error('Failed to get Stripe Connect status');
    }

    return data[0] || {
      has_account: false,
      account_status: 'none',
      payouts_enabled: false,
      stripe_account_id: null
    };
  } catch (error) {
    console.error('Get Stripe Connect status error:', error);
    throw error;
  }
}

/**
 * Create a new Stripe Connect account and get onboarding URL
 */
export async function createStripeConnectAccount(): Promise<{ onboardingUrl: string; accountId: string }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/createStripeConnectAccount`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ action: 'create' }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create Stripe Connect account');
    }

    return {
      onboardingUrl: result.onboardingUrl,
      accountId: result.accountId
    };
  } catch (error) {
    console.error('Create Stripe Connect account error:', error);
    throw error;
  }
}

/**
 * Get account status from Stripe and update database
 */
export async function refreshStripeAccountStatus(accountId: string): Promise<any> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/createStripeConnectAccount`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        action: 'get_status',
        accountId: accountId
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get account status');
    }

    return result.account;
  } catch (error) {
    console.error('Refresh Stripe account status error:', error);
    throw error;
  }
}

/**
 * Create login link for Stripe Express dashboard
 */
export async function createStripeLoginLink(accountId: string): Promise<string> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/createStripeConnectAccount`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        action: 'create_login_link',
        accountId: accountId
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create login link');
    }

    return result.loginUrl;
  } catch (error) {
    console.error('Create Stripe login link error:', error);
    throw error;
  }
}

/**
 * Get user's Stripe Connect account details
 */
export async function getUserStripeAccount(): Promise<StripeConnectAccount | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('user_stripe_accounts')
      .select('*')
      .eq('user_id', session.session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No account found
        return null;
      }
      console.error('Error getting user Stripe account:', error);
      throw new Error('Failed to get Stripe account');
    }

    return data;
  } catch (error) {
    console.error('Get user Stripe account error:', error);
    throw error;
  }
}

/**
 * Get payout history for the user
 */
export async function getPayoutHistory(): Promise<any[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('contributor_payouts')
      .select(`
        *,
        revenue_distribution:revenue_distribution_id (
          property_id,
          property:property_id (
            name,
            address
          )
        )
      `)
      .eq('user_id', session.session.user.id)
      .in('status', ['completed', 'failed'])
      .order('processed_at', { ascending: false });

    if (error) {
      console.error('Error getting payout history:', error);
      throw new Error('Failed to get payout history');
    }

    return data || [];
  } catch (error) {
    console.error('Get payout history error:', error);
    throw error;
  }
}
