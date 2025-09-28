import { supabase } from '../lib/supabase';

export interface SyncResult {
  success: boolean;
  creditsAdded: number;
  completed: number;
  errors: string[];
}

/**
 * Manually sync pending credit purchases
 * This can be used as a fallback if webhooks fail
 */
export async function syncPendingCredits(): Promise<SyncResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get pending credit purchases for this user
    const { data: pendingPurchases, error: fetchError } = await supabase
      .from('credit_purchase')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch pending purchases: ${fetchError.message}`);
    }

    if (!pendingPurchases || pendingPurchases.length === 0) {
      return {
        success: true,
        creditsAdded: 0,
        completed: 0,
        errors: []
      };
    }

    console.log(`Found ${pendingPurchases.length} pending credit purchases`);

    let totalCreditsAdded = 0;
    let completedCount = 0;
    const errors: string[] = [];

    // Process each pending purchase
    for (const purchase of pendingPurchases) {
      try {
        console.log(`Processing purchase ${purchase.id} for ${purchase.credits} credits`);

        // Try to complete the purchase using the database function
        const { data: result, error: completeError } = await supabase.rpc('complete_credit_purchase', {
          p_stripe_session_id: purchase.stripe_session_id
        });

        if (completeError) {
          console.error(`Failed to complete purchase ${purchase.id}:`, completeError);
          errors.push(`Purchase ${purchase.id}: ${completeError.message}`);
          continue;
        }

        if (result) {
          totalCreditsAdded += purchase.credits;
          completedCount++;
          console.log(`✅ Completed purchase ${purchase.id}, added ${purchase.credits} credits`);
        } else {
          errors.push(`Purchase ${purchase.id}: Function returned false`);
        }

      } catch (error: any) {
        console.error(`Error processing purchase ${purchase.id}:`, error);
        errors.push(`Purchase ${purchase.id}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      creditsAdded: totalCreditsAdded,
      completed: completedCount,
      errors
    };

  } catch (error: any) {
    console.error('Sync pending credits error:', error);
    return {
      success: false,
      creditsAdded: 0,
      completed: 0,
      errors: [error.message]
    };
  }
}

/**
 * Check if user has any pending credit purchases
 */
export async function hasPendingCredits(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('credit_purchase')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1);

    if (error) {
      console.error('Error checking pending credits:', error);
      return false;
    }

    return (data && data.length > 0);
  } catch (error) {
    console.error('Error in hasPendingCredits:', error);
    return false;
  }
}