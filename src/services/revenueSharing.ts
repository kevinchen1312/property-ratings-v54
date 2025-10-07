import { supabase } from '../lib/supabase';

export interface ContributorStats {
  property_id: string;
  user_id: string;
  total_ratings: number;
  last_rating_at: string;
}

export interface RevenueDistribution {
  purchase_id: string;
  property_id: string;
  total_revenue: number;
  platform_share: number;
  top_contributor_share: number;
  other_contributors_share: number;
  top_contributor_id?: string;
  top_contributor_rating_count?: number;
}

export interface ContributorPayout {
  user_id: string;
  payout_amount: number;
  rating_count: number;
  is_top_contributor: boolean;
}

/**
 * Calculate and distribute revenue for a property purchase
 * New distribution: 50% gold, 20% silver, 10% bronze, 20% platform
 */
export async function calculateRevenueDistribution(
  purchaseId: string,
  propertyId: string,
  totalRevenue: number
): Promise<RevenueDistribution> {
  
  // Revenue split: 50% gold, 20% silver, 10% bronze, 20% platform
  const goldShare = totalRevenue * 0.50;
  const silverShare = totalRevenue * 0.20;
  const bronzeShare = totalRevenue * 0.10;
  const platformShare = totalRevenue * 0.20;

  // Get top 3 contributors for this property
  const { data: topContributorsData, error: topContributorsError } = await supabase
    .rpc('get_top_contributors', { property_uuid: propertyId });

  if (topContributorsError) {
    console.error('Error getting top contributors:', topContributorsError);
    throw new Error('Failed to calculate top contributors');
  }

  const contributors = topContributorsData || [];
  const goldContributor = contributors.find((c: any) => c.rank === 1);

  // Create revenue distribution record
  const revenueDistribution: RevenueDistribution = {
    purchase_id: purchaseId,
    property_id: propertyId,
    total_revenue: totalRevenue,
    platform_share: platformShare,
    top_contributor_share: goldShare,
    other_contributors_share: silverShare + bronzeShare,
    top_contributor_id: goldContributor?.user_id,
    top_contributor_rating_count: goldContributor?.rating_count || 0,
  };

  // Save to database
  const { data, error } = await supabase
    .from('revenue_distribution')
    .insert(revenueDistribution)
    .select()
    .single();

  if (error) {
    console.error('Error saving revenue distribution:', error);
    throw new Error('Failed to save revenue distribution');
  }

  return data;
}

/**
 * Calculate individual contributor payouts for a property
 * New distribution: 50% gold, 20% silver, 10% bronze
 */
export async function calculateContributorPayouts(
  revenueDistributionId: string,
  propertyId: string,
  topContributorShare: number,
  otherContributorsShare: number,
  topContributorId?: string
): Promise<ContributorPayout[]> {
  
  const contributorPayouts: ContributorPayout[] = [];

  // Get top 3 contributors
  const { data: topContributorsData, error: topContributorsError } = await supabase
    .rpc('get_top_contributors', { property_uuid: propertyId });

  if (topContributorsError) {
    console.error('Error getting top contributors:', topContributorsError);
    throw new Error('Failed to get top contributors');
  }

  const contributors = topContributorsData || [];
  const goldContributor = contributors.find((c: any) => c.rank === 1);
  const silverContributor = contributors.find((c: any) => c.rank === 2);
  const bronzeContributor = contributors.find((c: any) => c.rank === 3);

  // Add gold contributor payout (50% of total revenue)
  if (goldContributor) {
    contributorPayouts.push({
      user_id: goldContributor.user_id,
      payout_amount: topContributorShare, // This is 50%
      rating_count: goldContributor.rating_count,
      is_top_contributor: true,
    });
  }

  // Add silver contributor payout (20% of total revenue)
  if (silverContributor) {
    const silverShare = topContributorShare * 0.40; // 20% of total = 40% of topContributorShare (which is 50%)
    contributorPayouts.push({
      user_id: silverContributor.user_id,
      payout_amount: silverShare,
      rating_count: silverContributor.rating_count,
      is_top_contributor: false,
    });
  }

  // Add bronze contributor payout (10% of total revenue)
  if (bronzeContributor) {
    const bronzeShare = topContributorShare * 0.20; // 10% of total = 20% of topContributorShare (which is 50%)
    contributorPayouts.push({
      user_id: bronzeContributor.user_id,
      payout_amount: bronzeShare,
      rating_count: bronzeContributor.rating_count,
      is_top_contributor: false,
    });
  }

  // Save contributor payouts to database
  const payoutRecords = contributorPayouts.map(payout => ({
    revenue_distribution_id: revenueDistributionId,
    user_id: payout.user_id,
    payout_amount: payout.payout_amount,
    rating_count: payout.rating_count,
    is_top_contributor: payout.is_top_contributor,
    status: 'pending',
  }));

  if (payoutRecords.length > 0) {
    const { error: payoutError } = await supabase
      .from('contributor_payouts')
      .insert(payoutRecords);

    if (payoutError) {
      console.error('Error saving contributor payouts:', payoutError);
      throw new Error('Failed to save contributor payouts');
    }
  }

  return contributorPayouts;
}

/**
 * Process revenue sharing for a completed purchase
 */
export async function processRevenueSharing(
  purchaseId: string,
  propertyId: string,
  totalRevenue: number
): Promise<RevenueDistribution> {
  try {
    console.log(`Processing revenue sharing for purchase ${purchaseId}, property ${propertyId}, revenue $${totalRevenue}`);

    // Calculate revenue distribution
    const revenueDistribution = await calculateRevenueDistribution(
      purchaseId,
      propertyId,
      totalRevenue
    );

    // Calculate contributor payouts
    const contributorPayouts = await calculateContributorPayouts(
      revenueDistribution.id,
      propertyId,
      revenueDistribution.top_contributor_share,
      revenueDistribution.other_contributors_share,
      revenueDistribution.top_contributor_id
    );

    console.log(`Revenue sharing processed: ${contributorPayouts.length} contributors will receive payouts`);
    console.log(`Top contributor: ${revenueDistribution.top_contributor_id} gets $${revenueDistribution.top_contributor_share}`);
    console.log(`Platform share: $${revenueDistribution.platform_share}`);

    // Return the revenue distribution data for the UI
    return revenueDistribution;

  } catch (error) {
    console.error('Error processing revenue sharing:', error);
    throw error;
  }
}

/**
 * Get contributor stats for a user
 */
export async function getUserContributorStats(userId?: string): Promise<ContributorStats[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('property_contributors')
    .select('*')
    .eq('user_id', targetUserId)
    .order('total_ratings', { ascending: false });

  if (error) {
    console.error('Error getting contributor stats:', error);
    throw new Error('Failed to get contributor stats');
  }

  return data || [];
}

/**
 * Get pending payouts for a user
 */
export async function getUserPendingPayouts(userId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) {
    throw new Error('User not authenticated');
  }

  console.log('🔍 getUserPendingPayouts - Looking for user:', targetUserId);

  const { data, error } = await supabase
    .from('contributor_payouts')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  console.log('🔍 getUserPendingPayouts - Query result:', { data, error });

  if (error) {
    console.error('Error getting pending payouts:', error);
    throw new Error('Failed to get pending payouts');
  }

  console.log('🔍 getUserPendingPayouts - Returning:', data?.length || 0, 'payouts');
  return data || [];
}
