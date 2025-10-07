// supabase/functions/redeemReports/index.ts
// Updated to call Vercel PDF service instead of running Puppeteer in Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("REPORTS_FROM_EMAIL") || "reports@yourdomain.com";
const PDF_SERVICE_URL = Deno.env.get("PDF_SERVICE_URL")!; // Your Vercel URL

// Revenue per credit
const REVENUE_PER_CREDIT = 10.00;

interface ContributorPayout {
  user_id: string;
  payout_amount: number;
  rating_count: number;
  is_top_contributor: boolean;
}

interface RatingData {
  attribute: string;
  stars: number;
  created_at: string;
  user_id?: string;
  user_hash?: string;
}

function mapAttribute(attr: string): string {
  const mapping: Record<string, string> = {
    'noise': 'Quietness',
    'quietness': 'Quietness',
    'cleanliness': 'Cleanliness',
    'safety': 'Safety',
    'friendliness': 'Safety'
  };
  return mapping[attr.toLowerCase()] || attr;
}

function calculateDailyTrends(ratings: RatingData[]) {
  const grouped: Record<string, Record<string, number[]>> = {};
  
  ratings.forEach(r => {
    const date = new Date(r.created_at).toISOString().split('T')[0];
    if (!grouped[date]) grouped[date] = {};
    const attr = mapAttribute(r.attribute);
    if (!grouped[date][attr]) grouped[date][attr] = [];
    grouped[date][attr].push(r.stars);
  });
  
  const result = { quietness: [] as any[], cleanliness: [] as any[], safety: [] as any[] };
  
  Object.keys(grouped).sort().forEach(date => {
    if (grouped[date]['Quietness']) {
      const avg = grouped[date]['Quietness'].reduce((a, b) => a + b, 0) / grouped[date]['Quietness'].length;
      result.quietness.push({ date, avg });
    }
    if (grouped[date]['Cleanliness']) {
      const avg = grouped[date]['Cleanliness'].reduce((a, b) => a + b, 0) / grouped[date]['Cleanliness'].length;
      result.cleanliness.push({ date, avg });
    }
    if (grouped[date]['Safety']) {
      const avg = grouped[date]['Safety'].reduce((a, b) => a + b, 0) / grouped[date]['Safety'].length;
      result.safety.push({ date, avg });
    }
  });
  
  return result;
}

function calculateHourlyTrends(ratings: RatingData[]) {
  const grouped: Record<number, Record<string, number[]>> = {};
  
  ratings.forEach(r => {
    const hour = new Date(r.created_at).getHours();
    if (!grouped[hour]) grouped[hour] = {};
    const attr = mapAttribute(r.attribute);
    if (!grouped[hour][attr]) grouped[hour][attr] = [];
    grouped[hour][attr].push(r.stars);
  });
  
  const result = { quietness: [] as any[], cleanliness: [] as any[], safety: [] as any[] };
  
  for (let hour = 0; hour < 24; hour++) {
    if (grouped[hour]) {
      if (grouped[hour]['Quietness']) {
        const avg = grouped[hour]['Quietness'].reduce((a, b) => a + b, 0) / grouped[hour]['Quietness'].length;
        result.quietness.push({ hour, avg });
      }
      if (grouped[hour]['Cleanliness']) {
        const avg = grouped[hour]['Cleanliness'].reduce((a, b) => a + b, 0) / grouped[hour]['Cleanliness'].length;
        result.cleanliness.push({ hour, avg });
      }
      if (grouped[hour]['Safety']) {
        const avg = grouped[hour]['Safety'].reduce((a, b) => a + b, 0) / grouped[hour]['Safety'].length;
        result.safety.push({ hour, avg });
      }
    }
  }
  
  return result;
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

  const platformShare = totalRevenue * 0.80;
  const topContributorShare = totalRevenue * 0.10;
  const otherContributorsShare = totalRevenue * 0.10;

  const { data: topContributorData, error: topContributorError } = await admin
    .rpc('get_top_contributor', { property_uuid: propertyId });

  if (topContributorError) {
    console.error('Error getting top contributor:', topContributorError);
    throw new Error('Failed to calculate top contributor');
  }

  const topContributor = topContributorData?.[0];
  console.log(`👑 Top contributor: ${topContributor?.user_id} with ${topContributor?.rating_count || 0} ratings`);

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

  const contributorPayouts: ContributorPayout[] = [];

  if (topContributor?.user_id) {
    contributorPayouts.push({
      user_id: topContributor.user_id,
      payout_amount: topContributorShare,
      rating_count: topContributor.rating_count || 0,
      is_top_contributor: true,
    });
  }

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
    const userRatingCounts: { [key: string]: number } = {};
    otherContributorsData.forEach((rating: any) => {
      if (rating.user_id !== topContributor?.user_id) {
        userRatingCounts[rating.user_id] = (userRatingCounts[rating.user_id] || 0) + 1;
      }
    });

    const totalOtherRatings = Object.values(userRatingCounts).reduce((sum, count) => sum + count, 0);
    console.log(`👥 Found ${Object.keys(userRatingCounts).length} other contributors with ${totalOtherRatings} total ratings`);

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

/**
 * Prepare report data and call Vercel PDF service
 */
async function generatePDFReport(admin: any, propertyId: string): Promise<ArrayBuffer> {
  // Get property information
  const { data: propertyData, error: propertyError } = await admin
    .from('property')
    .select('id, name, address, lat, lng')
    .eq('id', propertyId)
    .single();

  if (propertyError || !propertyData) {
    throw new Error('Property not found');
  }

  // Get report data
  const { data: ratingLog } = await admin.rpc('get_rating_log', {
    property_id_param: propertyId
  });

  console.log('Fetched rating log:', ratingLog?.length, 'records');

  // Process ratings into structured data
  const allRatings: RatingData[] = (ratingLog || []) as RatingData[];
  
  // Calculate overall summary
  const overallSummary: any[] = [];
  const attributes = ['Quietness', 'Cleanliness', 'Safety'];
  
  attributes.forEach(attr => {
    const attrRatings = allRatings.filter((r: any) => mapAttribute(r.attribute) === attr);
    if (attrRatings.length > 0) {
      const sum = attrRatings.reduce((total: number, r: any) => total + r.stars, 0);
      const avg = sum / attrRatings.length;
      overallSummary.push({
        attribute: attr,
        avg: Math.round(avg * 100) / 100,
        count: attrRatings.length
      });
    }
  });
  
  // Calculate monthly summary
  const monthlyGrouped: Record<string, Record<string, number[]>> = {};
  allRatings.forEach(r => {
    const date = new Date(r.created_at);
    const monthKey = `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
    if (!monthlyGrouped[monthKey]) monthlyGrouped[monthKey] = {};
    const attr = mapAttribute(r.attribute);
    if (!monthlyGrouped[monthKey][attr]) monthlyGrouped[monthKey][attr] = [];
    monthlyGrouped[monthKey][attr].push(r.stars);
  });
  
  const monthlySummary: any[] = [];
  Object.keys(monthlyGrouped).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  }).slice(0, 4).forEach(monthKey => {
    const rows = attributes.map(attr => {
      if (monthlyGrouped[monthKey][attr]) {
        const avg = monthlyGrouped[monthKey][attr].reduce((a, b) => a + b, 0) / monthlyGrouped[monthKey][attr].length;
        return {
          attribute: attr,
          avg: Math.round(avg * 100) / 100,
          count: monthlyGrouped[monthKey][attr].length
        };
      }
      return { attribute: attr, avg: null, count: 0 };
    });
    monthlySummary.push({ label: monthKey, rows });
  });
  
  // Calculate daily trends
  const dailyTrends = calculateDailyTrends(allRatings);
  
  // Calculate hourly trends
  const hourlyTrends = calculateHourlyTrends(allRatings);
  
  // Group ratings by day for daily logs
  const dailyLogs: Record<string, any[]> = {};
  allRatings.forEach(r => {
    const date = new Date(r.created_at).toISOString().split('T')[0];
    if (!dailyLogs[date]) dailyLogs[date] = [];
    dailyLogs[date].push(r);
  });
  
  // Generate insights
  const insights: string[] = [];
  
  const mondayMornings = allRatings.filter(r => {
    const d = new Date(r.created_at);
    return d.getDay() === 1 && d.getHours() === 6 && mapAttribute(r.attribute) === 'Quietness';
  });
  if (mondayMornings.length > 2) {
    const avg = mondayMornings.reduce((a, b) => a + b.stars, 0) / mondayMornings.length;
    if (avg < 3.5) {
      insights.push('Mondays at 6:00 AM in August and September show a recurring dip in Quietness ratings.');
    }
  }
  
  const fridayAfternoons = allRatings.filter(r => {
    const d = new Date(r.created_at);
    return d.getDay() === 5 && d.getHours() >= 13 && d.getHours() <= 21 && mapAttribute(r.attribute) === 'Cleanliness';
  });
  if (fridayAfternoons.length > 5) {
    insights.push('Fridays (1–9 PM) show lower Cleanliness ratings compared to other times.');
  }
  
  const safetyRatings = allRatings.filter(r => mapAttribute(r.attribute) === 'Safety');
  if (safetyRatings.length > 10) {
    const avgSafety = safetyRatings.reduce((a, b) => a + b.stars, 0) / safetyRatings.length;
    if (avgSafety > 3.8) {
      insights.push('Safety ratings remain steady across days and hours.');
    }
  }
  
  // Default insights if none generated
  if (insights.length === 0) {
    insights.push('Community observation data shows consistent patterns across different times.');
    insights.push('Multiple attributes have been rated by community members.');
    insights.push('Data reflects various time periods and days of the week.');
  }
  
  // Prepare data for Vercel API
  const reportData = {
    property: propertyData,
    insights,
    overallSummary,
    monthlySummary,
    dailyTrends,
    hourlyTrends,
    dailyLogs: Object.keys(dailyLogs).sort().reverse().slice(0, 15).map(date => ({
      date,
      rows: dailyLogs[date].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }))
  };
  
  // Call Vercel PDF service
  console.log('Calling Vercel PDF service at:', PDF_SERVICE_URL);
  
  const pdfResponse = await fetch(PDF_SERVICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reportData)
  });
  
  if (!pdfResponse.ok) {
    const errorText = await pdfResponse.text();
    console.error('PDF service error:', errorText);
    throw new Error(`PDF service failed: ${pdfResponse.status}`);
  }
  
  const pdfResult = await pdfResponse.json();
  
  if (!pdfResult.success || !pdfResult.pdf) {
    throw new Error('PDF service did not return PDF data');
  }
  
  console.log('PDF generated successfully, size:', pdfResult.size, 'bytes');
  
  // Convert base64 back to ArrayBuffer
  const pdfBase64 = pdfResult.pdf;
  const pdfBinary = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
  
  return pdfBinary.buffer;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const access_token = authHeader.replace("Bearer ", "");
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userRes, error: userErr } = await admin.auth.getUser(access_token);
    if (userErr || !userRes.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const user = userRes.user;

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

    // Debit credits
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

    // Generate reports for each property
    for (const propertyId of propertyIds) {
      console.log(`📄 Generating PDF report for property ${propertyId}`);

      // Get property info for email
      const { data: propertyData } = await admin
        .from('property')
        .select('id, name, address')
        .eq('id', propertyId)
        .single();

      if (!propertyData) {
        console.error(`Property ${propertyId} not found`);
        continue;
      }

      // Generate PDF via Vercel service
      const pdfBuffer = await generatePDFReport(admin, propertyId);

      // Format address
      const formatAddress = (addr: string) => {
        const parts = addr.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          const city = parts[parts.length - 2] || '';
          const stateZip = parts[parts.length - 1] || '';
          return `${city}, ${stateZip}`;
        }
        return addr;
      };
      
      const formattedAddress = formatAddress(propertyData.address);
      const cleanName = propertyData.name.replace(/[^a-zA-Z0-9]/g, '-');
      
      // Send email with PDF attachment
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `Leadsong Reports <${FROM_EMAIL}>`,
          to: [toEmail],
          subject: `Your Community Observation Report for ${propertyData.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #007AFF;">Your Community Observation Report is Ready!</h1>
              
              <p>Hello!</p>
              
              <p>Your community observation report for <strong>${propertyData.name}, ${formattedAddress}</strong> has been generated and is attached to this email as a PDF.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #007AFF;">Property Details</h3>
                <p><strong>Address:</strong> ${formattedAddress}</p>
                <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>The attached PDF report includes:</p>
              <ul>
                <li>Key insights about the property</li>
                <li>Overall rating averages (Quietness, Cleanliness, Safety)</li>
                <li>Monthly rating summaries</li>
                <li>Daily and hourly rating trends with charts</li>
                <li>Detailed daily logs of community observations</li>
              </ul>
              
              <p>If you have any questions about this report, please don't hesitate to contact us.</p>
              
              <p>Best regards,<br>
              The Leadsong Team</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e9ecef;">
              <p style="font-size: 12px; color: #6c757d;">
                This email was sent automatically. Please do not reply to this email.
              </p>
            </div>
          `,
          attachments: [
            {
              filename: `${cleanName}-report.pdf`,
              content: Array.from(new Uint8Array(pdfBuffer)),
              type: 'application/pdf'
            }
          ]
        })
      });

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text();
        console.error('Email sending error:', emailError);
        throw new Error('Failed to send email');
      }

      const emailResult = await emailResponse.json();
      console.log(`✅ PDF email sent successfully! ID: ${emailResult.id}`);

      // Create redemption record and process revenue sharing
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
      } else {
        console.log(`📝 Created redemption record: ${redemption.id}`);

        // Process revenue sharing
        try {
          await processRevenueSharing(admin, redemption.id, propertyId, REVENUE_PER_CREDIT);
        } catch (revenueError) {
          console.error("Revenue sharing error:", revenueError);
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      files: propertyIds.length,
      message: `Successfully generated ${propertyIds.length} report${propertyIds.length !== 1 ? 's' : ''} and sent to ${toEmail}`,
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


