// supabase/functions/redeemReportsWithRevenue/index.ts
// Updated version with revenue sharing support
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@3.2.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("REPORTS_FROM_EMAIL") || "reports@yourdomain.com";

// Revenue per credit (standard value regardless of package price)
const REVENUE_PER_CREDIT = 10.00;

interface ContributorPayout {
  user_id: string;
  payout_amount: number;
  rating_count: number;
  is_top_contributor: boolean;
}

/**
 * Process revenue sharing for a property redemption
 */
async function processRevenueSharing(
  admin: any,
  redemptionId: string,
  propertyId: string,
  totalRevenue: number
): Promise<void> {
  console.log(`💰 Processing revenue sharing for redemption ${redemptionId}, property ${propertyId}, revenue $${totalRevenue}`);

  // Revenue split: 80% platform, 10% top contributor, 10% other contributors
  const platformShare = totalRevenue * 0.80;
  const topContributorShare = totalRevenue * 0.10;
  const otherContributorsShare = totalRevenue * 0.10;

  // Get top contributor for this property in the past 30 days
  const { data: topContributorData, error: topContributorError } = await admin
    .rpc('get_top_contributor', { property_uuid: propertyId });

  if (topContributorError) {
    console.error('Error getting top contributor:', topContributorError);
    throw new Error('Failed to calculate top contributor');
  }

  const topContributor = topContributorData?.[0];
  console.log(`👑 Top contributor: ${topContributor?.user_id} with ${topContributor?.rating_count || 0} ratings`);

  // Create revenue distribution record
  const { data: revenueDistribution, error: distError } = await admin
    .from('revenue_distribution')
    .insert({
      redemption_id: redemptionId,
      property_id: propertyId,
      total_revenue: totalRevenue,
      platform_share: platformShare,
      top_contributor_share: topContributorShare,
      other_contributors_share: otherContributorsShare,
      top_contributor_id: topContributor?.user_id,
      top_contributor_rating_count: topContributor?.rating_count || 0,
    })
    .select()
    .single();

  if (distError) {
    console.error('Error saving revenue distribution:', distError);
    throw new Error('Failed to save revenue distribution');
  }

  console.log(`📊 Revenue distribution created: ${revenueDistribution.id}`);

  // Calculate contributor payouts
  const contributorPayouts: ContributorPayout[] = [];

  // Add top contributor payout (they get exactly 10%)
  if (topContributor?.user_id) {
    contributorPayouts.push({
      user_id: topContributor.user_id,
      payout_amount: topContributorShare,
      rating_count: topContributor.rating_count || 0,
      is_top_contributor: true,
    });
  }

  // Get all other contributors (excluding the top contributor) with their rating counts
  // Using past 365 days for other contributors to be fair
  const { data: otherContributorsData, error: otherContributorsError } = await admin
    .from('rating')
    .select('user_id')
    .eq('property_id', propertyId)
    .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  if (otherContributorsError) {
    console.error('Error getting other contributors:', otherContributorsError);
    throw new Error('Failed to get other contributors');
  }

  if (otherContributorsData && otherContributorsData.length > 0) {
    // Group by user and count ratings for other contributors (excluding top contributor)
    const userRatingCounts: { [key: string]: number } = {};
    otherContributorsData.forEach((rating: any) => {
      // Skip the top contributor in the "other contributors" pool
      if (rating.user_id !== topContributor?.user_id) {
        userRatingCounts[rating.user_id] = (userRatingCounts[rating.user_id] || 0) + 1;
      }
    });

    // Calculate total ratings from other contributors
    const totalOtherRatings = Object.values(userRatingCounts).reduce((sum, count) => sum + count, 0);
    console.log(`👥 Found ${Object.keys(userRatingCounts).length} other contributors with ${totalOtherRatings} total ratings`);

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
  if (contributorPayouts.length > 0) {
    const payoutRecords = contributorPayouts.map(payout => ({
      revenue_distribution_id: revenueDistribution.id,
      user_id: payout.user_id,
      payout_amount: payout.payout_amount,
      rating_count: payout.rating_count,
      is_top_contributor: payout.is_top_contributor,
      status: 'pending',
    }));

    const { error: payoutError } = await admin
      .from('contributor_payouts')
      .insert(payoutRecords);

    if (payoutError) {
      console.error('Error saving contributor payouts:', payoutError);
      throw new Error('Failed to save contributor payouts');
    }

    console.log(`✅ Created ${contributorPayouts.length} contributor payout records`);
    contributorPayouts.forEach(payout => {
      console.log(`  - ${payout.user_id}: $${payout.payout_amount.toFixed(2)} (${payout.rating_count} ratings)${payout.is_top_contributor ? ' 👑 TOP' : ''}`);
    });
  } else {
    console.log('ℹ️ No contributors found for this property');
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // Get user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    const access_token = authHeader.replace("Bearer ", "");
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const { data: userRes, error: userErr } = await admin.auth.getUser(access_token);
    if (userErr || !userRes.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const user = userRes.user;

    // Parse request body
    const { propertyIds, email } = await req.json();
    
    if (!Array.isArray(propertyIds) || propertyIds.length < 1 || propertyIds.length > 10) {
      return new Response(JSON.stringify({ error: "BAD_INPUT" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const toEmail = (email || user.email || "").trim();
    if (!toEmail) {
      return new Response(JSON.stringify({ error: "NO_EMAIL" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Debit credits atomically
    const { data: ok, error: debitErr } = await admin.rpc("debit_credits", {
      p_user: user.id,
      p_amount: propertyIds.length,
    });

    if (debitErr) {
      console.error("Debit credits error:", debitErr);
      return new Response(JSON.stringify({ error: "DB_ERROR" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!ok) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS" }), { 
        status: 402,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`✅ Debited ${propertyIds.length} credits from user ${user.id}`);

    // Generate reports for each property
    const now = new Date();
    const from = new Date(now);
    from.setFullYear(now.getFullYear() - 1);

    const paths: string[] = [];
    const links: string[] = [];

    for (const propertyId of propertyIds) {
      console.log(`📄 Processing property: ${propertyId}`);

      // Create redemption record
      const { data: redemption, error: redemptionError } = await admin
        .from("report_redemption")
        .insert({
          user_id: user.id,
          property_id: propertyId,
          credits_used: 1,
          revenue_value: REVENUE_PER_CREDIT
        })
        .select()
        .single();

      if (redemptionError) {
        console.error("Redemption record error:", redemptionError);
        // Continue anyway, this is just tracking
      } else {
        console.log(`📝 Created redemption record: ${redemption.id}`);

        // Process revenue sharing for this redemption
        try {
          await processRevenueSharing(admin, redemption.id, propertyId, REVENUE_PER_CREDIT);
        } catch (revenueError) {
          console.error("Revenue sharing error:", revenueError);
          // Don't fail the whole process if revenue sharing fails
          // Just log it for manual review
        }
      }

      // Get property report data
      const { data: report, error: rpcErr } = await admin.rpc("get_property_report", {
        p_property_id: propertyId,
        p_from: from.toISOString().slice(0, 10),
        p_to: now.toISOString().slice(0, 10),
      });

      if (rpcErr) {
        console.error("Report generation error:", rpcErr);
        throw new Error(`Failed to generate report for property ${propertyId}`);
      }

      // Create report content (JSON for now, can be enhanced to PDF later)
      const reportContent = JSON.stringify(report, null, 2);
      const bytes = new TextEncoder().encode(reportContent);
      const path = `${user.id}/${propertyId}-${Date.now()}.json`;

      // Upload to private reports bucket
      const { error: uploadErr } = await admin.storage
        .from("reports")
        .upload(path, bytes, {
          contentType: "application/json",
          upsert: false,
        });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        throw new Error(`Failed to upload report for property ${propertyId}`);
      }

      // Create signed URL (7 days expiry)
      const { data: signedData, error: signErr } = await admin.storage
        .from("reports")
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      if (signErr || !signedData?.signedUrl) {
        console.error("Signed URL error:", signErr);
        throw new Error(`Failed to create signed URL for property ${propertyId}`);
      }

      paths.push(path);
      links.push(signedData.signedUrl);
    }

    // Send email with report links
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Your Property Reports (${propertyIds.length} properties)`,
      html: `
        <h2>Your Property Reports</h2>
        <p>Thank you for your purchase! Here are your property report links:</p>
        <ul>
          ${links.map((url, index) => `
            <li>
              <a href="${url}" target="_blank">
                Property Report ${index + 1}
              </a>
            </li>
          `).join('')}
        </ul>
        <p><small>These links will expire in 7 days.</small></p>
      `,
    });

    console.log(`✅ Successfully processed ${propertyIds.length} reports with revenue sharing`);

    return new Response(JSON.stringify({ 
      ok: true, 
      files: paths.length,
      message: `Successfully generated ${paths.length} reports and sent to ${toEmail}`,
      revenue_shared: true
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ 
      error: "SERVER_ERROR",
      message: error.message 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

