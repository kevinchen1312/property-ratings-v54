// supabase/functions/redeemReports/index.ts
// Updated to call Vercel PDF service instead of running Puppeteer in Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("REPORTS_FROM_EMAIL") || "reports@yourdomain.com";
const PDF_SERVICE_URL = Deno.env.get("PDF_SERVICE_URL")!; // Your Vercel URL

// Revenue per credit based on submission tiers
// <100 submissions: 1 credit = $5
// 100-999 submissions: 2 credits = $10
// 1000+ submissions: 4 credits = $20
const REVENUE_PER_CREDIT_BASE = 5.00;

function calculateCreditsRequired(submissionCount: number): number {
  if (submissionCount < 100) return 1;
  if (submissionCount < 1000) return 2;
  return 4;
}

function calculateRevenue(creditsRequired: number): number {
  return creditsRequired * REVENUE_PER_CREDIT_BASE;
}

interface ContributorPayout {
  user_id: string;
  payout_amount: number;
  rating_count: number;
  rank: number; // 1=gold, 2=silver, 3=bronze
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
 * New distribution: 50% gold, 20% silver, 10% bronze, 20% platform
 */
async function processRevenueSharing(
  admin: any,
  redemptionId: string,
  propertyId: string,
  totalRevenue: number
): Promise<void> {
  console.log(`💰 Processing revenue sharing for redemption ${redemptionId}, property ${propertyId}, revenue $${totalRevenue}`);

  // New revenue distribution: 50% gold, 20% silver, 10% bronze, 20% platform
  const goldShare = totalRevenue * 0.50;
  const silverShare = totalRevenue * 0.20;
  const bronzeShare = totalRevenue * 0.10;
  const platformShare = totalRevenue * 0.20;

  // Get top 3 contributors
  const { data: topContributorsData, error: topContributorsError } = await admin
    .rpc('get_top_contributors', { property_uuid: propertyId });

  if (topContributorsError) {
    console.error('Error getting top contributors:', topContributorsError);
    throw new Error('Failed to calculate top contributors');
  }

  const contributors = topContributorsData || [];
  const goldContributor = contributors.find((c: any) => c.rank === 1);
  const silverContributor = contributors.find((c: any) => c.rank === 2);
  const bronzeContributor = contributors.find((c: any) => c.rank === 3);

  console.log(`🥇 Gold contributor: ${goldContributor?.user_id} with ${goldContributor?.rating_count || 0} ratings`);
  console.log(`🥈 Silver contributor: ${silverContributor?.user_id} with ${silverContributor?.rating_count || 0} ratings`);
  console.log(`🥉 Bronze contributor: ${bronzeContributor?.user_id} with ${bronzeContributor?.rating_count || 0} ratings`);

  const { data: revenueDistribution, error: distError } = await admin
    .from('revenue_distribution')
    .insert({
      redemption_id: redemptionId,
      property_id: propertyId,
      total_revenue: totalRevenue,
      platform_share: platformShare,
      top_contributor_share: goldShare,
      other_contributors_share: silverShare + bronzeShare,
      top_contributor_id: goldContributor?.user_id,
      top_contributor_rating_count: goldContributor?.rating_count || 0,
    })
    .select()
    .single();

  if (distError) {
    console.error('Error saving revenue distribution:', distError);
    throw new Error('Failed to save revenue distribution');
  }

  console.log(`📊 Revenue distribution created: ${revenueDistribution.id}`);

  const contributorPayouts: ContributorPayout[] = [];

  // Add gold contributor payout (50%)
  if (goldContributor?.user_id) {
    contributorPayouts.push({
      user_id: goldContributor.user_id,
      payout_amount: goldShare,
      rating_count: goldContributor.rating_count || 0,
      rank: 1,
    });
  }

  // Add silver contributor payout (20%)
  if (silverContributor?.user_id) {
    contributorPayouts.push({
      user_id: silverContributor.user_id,
      payout_amount: silverShare,
      rating_count: silverContributor.rating_count || 0,
      rank: 2,
    });
  }

  // Add bronze contributor payout (10%)
  if (bronzeContributor?.user_id) {
    contributorPayouts.push({
      user_id: bronzeContributor.user_id,
      payout_amount: bronzeShare,
      rating_count: bronzeContributor.rating_count || 0,
      rank: 3,
    });
  }

  if (contributorPayouts.length > 0) {
    const payoutRecords = contributorPayouts.map(payout => ({
      revenue_distribution_id: revenueDistribution.id,
      user_id: payout.user_id,
      payout_amount: payout.payout_amount,
      rating_count: payout.rating_count,
      is_top_contributor: payout.rank === 1,
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
    const rankEmojis = ['🥇 GOLD', '🥈 SILVER', '🥉 BRONZE'];
    contributorPayouts.forEach(payout => {
      console.log(`  - ${payout.user_id}: $${payout.payout_amount.toFixed(2)} (${payout.rating_count} ratings) ${rankEmojis[payout.rank - 1]}`);
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
  
  // Generate AI-level insights
  const insights: string[] = [];
  
  // Analyze each attribute for consistent high/low ratings
  attributes.forEach(attr => {
    const attrRatings = allRatings.filter((r: any) => mapAttribute(r.attribute) === attr);
    if (attrRatings.length >= 5) {
      const avg = attrRatings.reduce((total: number, r: any) => total + r.stars, 0) / attrRatings.length;
      
      if (avg >= 4.0) {
        insights.push(`${attr} consistently rates high (${avg.toFixed(1)}/5), indicating strong community satisfaction in this area.`);
      } else if (avg <= 2.0) {
        insights.push(`${attr} consistently rates low (${avg.toFixed(1)}/5), suggesting this may be an area of concern for the community.`);
      }
    }
  });
  
  // Analyze time-of-day patterns for each attribute
  attributes.forEach(attr => {
    const hourlyData: Record<number, number[]> = {};
    allRatings.filter((r: any) => mapAttribute(r.attribute) === attr).forEach(r => {
      const hour = new Date(r.created_at).getHours();
      if (!hourlyData[hour]) hourlyData[hour] = [];
      hourlyData[hour].push(r.stars);
    });
    
    const hourlyAvgs = Object.entries(hourlyData).map(([hour, ratings]) => ({
      hour: parseInt(hour),
      avg: ratings.reduce((a, b) => a + b, 0) / ratings.length
    }));
    
    if (hourlyAvgs.length >= 3) {
      const maxHour = hourlyAvgs.reduce((max, curr) => curr.avg > max.avg ? curr : max);
      const minHour = hourlyAvgs.reduce((min, curr) => curr.avg < min.avg ? curr : min);
      
      if (maxHour.avg - minHour.avg >= 1.0) {
        const formatHour = (h: number) => {
          const period = h >= 12 ? 'PM' : 'AM';
          const hour12 = h % 12 || 12;
          return `${hour12}:00 ${period}`;
        };
        
        insights.push(`${attr} shows a notable pattern: highest at ${formatHour(maxHour.hour)} (${maxHour.avg.toFixed(1)}/5) and lowest at ${formatHour(minHour.hour)} (${minHour.avg.toFixed(1)}/5).`);
      }
    }
  });
  
  // Analyze day-of-week patterns
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  attributes.forEach(attr => {
    const dayData: Record<number, number[]> = {};
    allRatings.filter((r: any) => mapAttribute(r.attribute) === attr).forEach(r => {
      const day = new Date(r.created_at).getDay();
      if (!dayData[day]) dayData[day] = [];
      dayData[day].push(r.stars);
    });
    
    const dayAvgs = Object.entries(dayData).map(([day, ratings]) => ({
      day: parseInt(day),
      avg: ratings.reduce((a, b) => a + b, 0) / ratings.length
    }));
    
    if (dayAvgs.length >= 3) {
      const maxDay = dayAvgs.reduce((max, curr) => curr.avg > max.avg ? curr : max);
      const minDay = dayAvgs.reduce((min, curr) => curr.avg < min.avg ? curr : min);
      
      if (maxDay.avg - minDay.avg >= 0.8) {
        insights.push(`${attr} ratings vary by day of week: ${dayNames[maxDay.day]}s average ${maxDay.avg.toFixed(1)}/5 while ${dayNames[minDay.day]}s average ${minDay.avg.toFixed(1)}/5.`);
      }
    }
  });
  
  // Analyze monthly trends
  attributes.forEach(attr => {
    const attrByMonth = allRatings.filter((r: any) => mapAttribute(r.attribute) === attr);
    if (attrByMonth.length >= 10) {
      const monthlyData: Record<string, number[]> = {};
      attrByMonth.forEach(r => {
        const date = new Date(r.created_at);
        const monthKey = `${date.getMonth()}-${date.getFullYear()}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = [];
        monthlyData[monthKey].push(r.stars);
      });
      
      if (Object.keys(monthlyData).length >= 2) {
        const monthlyAvgs = Object.entries(monthlyData).map(([key, ratings]) => ({
          month: key,
          avg: ratings.reduce((a, b) => a + b, 0) / ratings.length
        }));
        
        const maxMonth = monthlyAvgs.reduce((max, curr) => curr.avg > max.avg ? curr : max);
        const minMonth = monthlyAvgs.reduce((min, curr) => curr.avg < min.avg ? curr : min);
        
        if (maxMonth.avg - minMonth.avg >= 1.0) {
          insights.push(`${attr} shows monthly variation with ratings ranging from ${minMonth.avg.toFixed(1)}/5 to ${maxMonth.avg.toFixed(1)}/5 across different months.`);
        }
      }
    }
  });
  
  // Default insights if none generated
  if (insights.length === 0) {
    insights.push('This property has received community ratings across multiple attributes.');
    insights.push('More ratings over time will reveal clearer patterns and trends.');
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
  console.log('PDF_SERVICE_URL from env:', PDF_SERVICE_URL);
  console.log('Calling Vercel PDF service...');
  
  if (!PDF_SERVICE_URL) {
    throw new Error('PDF_SERVICE_URL environment variable is not set!');
  }
  
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
  
  console.log('PDF service response:', { 
    success: pdfResult.success, 
    haspdf: !!pdfResult.pdf,
    pdfLength: pdfResult.pdf?.length,
    size: pdfResult.size 
  });
  
  if (!pdfResult.success || !pdfResult.pdf) {
    throw new Error('PDF service did not return PDF data');
  }
  
  console.log('PDF generated successfully, size:', pdfResult.size, 'bytes');
  
  // Convert base64 back to ArrayBuffer
  try {
    const pdfBase64 = pdfResult.pdf;
    
    // Validate base64 string
    if (typeof pdfBase64 !== 'string') {
      throw new Error(`PDF is not a string, got ${typeof pdfBase64}`);
    }
    
    console.log('Decoding base64 PDF, length:', pdfBase64.length);
    const binaryString = atob(pdfBase64);
    
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('Successfully converted PDF to ArrayBuffer');
    return bytes.buffer;
  } catch (error) {
    console.error('Error converting PDF:', error);
    console.error('PDF data type:', typeof pdfResult.pdf);
    console.error('PDF preview:', pdfResult.pdf?.toString().substring(0, 100));
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
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

    // Calculate total credits required based on submission counts for all properties
    let totalCreditsRequired = 0;
    const propertyCreditsMap: { [key: string]: { creditsRequired: number; submissionCount: number } } = {};

    for (const propertyId of propertyIds) {
      // Get submission count for this property
      const { count: submissionCount, error: countError } = await admin
        .from('rating')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      if (countError) {
        console.error(`Error counting ratings for property ${propertyId}:`, countError);
      }

      const actualCount = submissionCount || 0;
      const creditsRequired = calculateCreditsRequired(actualCount);
      
      propertyCreditsMap[propertyId] = { creditsRequired, submissionCount: actualCount };
      totalCreditsRequired += creditsRequired;

      console.log(`📊 Property ${propertyId}: ${actualCount} submissions → ${creditsRequired} credit(s) required`);
    }

    console.log(`💳 Total credits required: ${totalCreditsRequired}`);

    // Debit credits
    const { data: ok, error: debitErr } = await admin.rpc("debit_credits", {
      p_user: user.id,
      p_amount: totalCreditsRequired,
    });

    if (debitErr) {
      console.error("Debit credits error:", debitErr);
      return new Response(JSON.stringify({ error: "DB_ERROR" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!ok) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS", required: totalCreditsRequired }), {
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

      // Get credits and revenue for this property
      const { creditsRequired, submissionCount } = propertyCreditsMap[propertyId];
      const revenueValue = calculateRevenue(creditsRequired);

      console.log(`💰 Property ${propertyId}: ${submissionCount} submissions → ${creditsRequired} credits → $${revenueValue} revenue`);

      // Create redemption record and process revenue sharing
      const { data: redemption, error: redemptionError } = await admin
        .from("report_redemption")
        .insert({
          user_id: user.id,
          property_id: propertyId,
          credits_used: creditsRequired,
          revenue_value: revenueValue
        })
        .select()
        .single();

      if (redemptionError) {
        console.error("Redemption record error:", redemptionError);
      } else {
        console.log(`📝 Created redemption record: ${redemption.id}`);

        // Process revenue sharing
        try {
          await processRevenueSharing(admin, redemption.id, propertyId, revenueValue);
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
