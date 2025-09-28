import { supabase } from '../lib/supabase';

export interface ContributorStats {
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
 */
export async function calculateRevenueDistribution(
  purchaseId: string,
  propertyId: string,
  totalRevenue: number
): Promise<RevenueDistribution> {
  
  // Revenue split: 80% platform, 10% top contributor, 10% other contributors
  const platformShare = totalRevenue * 0.80;
  const topContributorShare = totalRevenue * 0.10;
  const otherContributorsShare = totalRevenue * 0.10;

  // Get top contributor for this property in the past month
  const { data: topContributorData, error: topContributorError } = await supabase
    .rpc('get_top_contributor', { property_uuid: propertyId });

  if (topContributorError) {
    console.error('Error getting top contributor:', topContributorError);
    throw new Error('Failed to calculate top contributor');
  }

  const topContributor = topContributorData?.[0];

  // Create revenue distribution record
  const revenueDistribution: RevenueDistribution = {
    purchase_id: purchaseId,
    property_id: propertyId,
    total_revenue: totalRevenue,
    platform_share: platformShare,
    top_contributor_share: topContributorShare,
    other_contributors_share: otherContributorsShare,
    top_contributor_id: topContributor?.user_id,
    top_contributor_rating_count: topContributor?.rating_count || 0,
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
 */
export async function calculateContributorPayouts(
  revenueDistributionId: string,
  propertyId: string,
  topContributorShare: number,
  otherContributorsShare: number,
  topContributorId?: string
): Promise<ContributorPayout[]> {
  
  // Get rating counts for each contributor (excluding top contributor)
  const contributorPayouts: ContributorPayout[] = [];

  // Add top contributor payout (they get exactly 10%)
  if (topContributorId) {
    // Get the actual rating count for top contributor from the function result
    const { data: topContributorData } = await supabase
      .rpc('get_top_contributor', { property_uuid: propertyId });
    
    const topContributorRatingCount = topContributorData?.[0]?.rating_count || 0;
    
    contributorPayouts.push({
      user_id: topContributorId,
      payout_amount: topContributorShare,
      rating_count: topContributorRatingCount,
      is_top_contributor: true,
    });
  }

  // Get all other contributors (excluding the top contributor) with their rating counts
  const { data: otherContributorsData, error: otherContributorsError } = await supabase
    .from('rating')
    .select('user_id')
    .eq('property_id', propertyId)
    .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .not('user_id', 'eq', topContributorId || '');

  if (otherContributorsError) {
    console.error('Error getting other contributors:', otherContributorsError);
    throw new Error('Failed to get other contributors');
  }

  if (otherContributorsData && otherContributorsData.length > 0) {
    // Group by user and count ratings for other contributors
    const userRatingCounts: { [key: string]: number } = {};
    otherContributorsData.forEach(rating => {
      userRatingCounts[rating.user_id] = (userRatingCounts[rating.user_id] || 0) + 1;
    });

    // Calculate total ratings from other contributors
    const totalOtherRatings = Object.values(userRatingCounts).reduce((sum, count) => sum + count, 0);

    // Calculate proportional payouts for other contributors
    if (totalOtherRatings > 0) {
      Object.entries(userRatingCounts).forEach(([userId, ratingCount]) => {
        const proportion = ratingCount / totalOtherRatings;
        const payoutAmount = otherContributorsShare * proportion;

        contributorPayouts.push({
          user_id: userId,
          payout_amount: payoutAmount,
          rating_count: ratingCount,
          is_top_contributor: false,
        });
      });
    }
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
