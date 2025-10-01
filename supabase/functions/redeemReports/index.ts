// supabase/functions/redeemReports/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

// Helper function to clean text for PDF (remove emojis and special characters)
const cleanText = (text: any): string => {
  if (!text) return '';
  return String(text)
    .replace(/⭐/g, 'star')
    .replace(/★/g, 'star')
    .replace(/☆/g, 'star')
    .replace(/✨/g, 'sparkle')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/[^\x00-\x7F\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, '')
    .trim();
};

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
 * Generate PDF report for a property
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
  const { data: overallData } = await admin.rpc('get_overall_averages', {
    property_id_param: propertyId
  });

  const { data: weeklyData } = await admin.rpc('get_weekly_averages', {
    property_id_param: propertyId
  });

  const { data: ratingLog } = await admin.rpc('get_rating_log', {
    property_id_param: propertyId
  });

  // Clean all data
  if (propertyData) {
    propertyData.name = cleanText(propertyData.name);
    propertyData.address = cleanText(propertyData.address);
  }

  // Calculate overall averages from rating log
  const allRatings = ratingLog || [];
  const overallDataCalculated: any[] = [];
  const attributes = ['noise', 'safety', 'cleanliness'];

  attributes.forEach(attr => {
    const attrRatings = allRatings.filter((r: any) => r.attribute === attr);
    if (attrRatings.length > 0) {
      const sum = attrRatings.reduce((total: number, r: any) => total + r.stars, 0);
      const avg = sum / attrRatings.length;
      overallDataCalculated.push({
        attribute: cleanText(attr),
        avg_rating: Math.round(avg * 100) / 100,
        rating_count: attrRatings.length
      });
    }
  });

  // Generate PDF
  const doc = new jsPDF();
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  const checkPageBreak = (spaceNeeded: number = 20) => {
    if (yPosition + spaceNeeded > 270) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 122, 255);
  doc.text('Property Rating Report', margin, yPosition);
  yPosition += 15;

  // Generation date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(108, 117, 125);
  const now = new Date();
  doc.text(`Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, margin, yPosition);
  yPosition += 20;

  // Property Information
  checkPageBreak(40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 122, 255);
  doc.text('Property Information', margin, yPosition);
  yPosition += 10;

  doc.setDrawColor(0, 122, 255);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(margin, yPosition, contentWidth, 25, 3, 3, 'FD');

  yPosition += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(33, 37, 41);
  doc.text(`Name: ${propertyData.name}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`Address: ${propertyData.address}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`Coordinates: ${propertyData.lat.toFixed(6)}, ${propertyData.lng.toFixed(6)}`, margin + 5, yPosition);
  yPosition += 20;

  // Overall Rating Summary
  checkPageBreak(60);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 122, 255);
  doc.text('Overall Rating Summary', margin, yPosition);
  yPosition += 15;

  if (overallDataCalculated.length > 0) {
    const cardWidth = (contentWidth - 20) / 3;
    let xPos = margin;

    overallDataCalculated.forEach((rating: any) => {
      doc.setDrawColor(233, 236, 239);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(xPos, yPosition, cardWidth, 30, 2, 2, 'FD');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(73, 80, 87);
      const attrText = cleanText(rating.attribute.charAt(0).toUpperCase() + rating.attribute.slice(1));
      doc.text(attrText, xPos + cardWidth / 2, yPosition + 8, { align: 'center' });

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 122, 255);
      doc.text(`${rating.avg_rating} stars`, xPos + cardWidth / 2, yPosition + 18, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(108, 117, 125);
      doc.text(`${rating.rating_count} ratings`, xPos + cardWidth / 2, yPosition + 25, { align: 'center' });

      xPos += cardWidth + 10;
    });
    yPosition += 40;
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(108, 117, 125);
    doc.text('No ratings available for this property', margin, yPosition);
    yPosition += 20;
  }

  // Weekly Trends Table
  checkPageBreak(80);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 122, 255);
  doc.text('Weekly Trends (Last 8 Weeks)', margin, yPosition);
  yPosition += 15;

  if (weeklyData && weeklyData.length > 0) {
    const weeklyGrouped = weeklyData.reduce((acc: any, item: any) => {
      const weekKey = item.week_start;
      if (!acc[weekKey]) {
        acc[weekKey] = { week_start: weekKey, noise: null, safety: null, cleanliness: null };
      }
      const cleanAttribute = cleanText(item.attribute);
      acc[weekKey][cleanAttribute] = { avg_rating: item.avg_rating, rating_count: item.rating_count };
      return acc;
    }, {});

    const weeks = Object.values(weeklyGrouped).sort((a: any, b: any) =>
      new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
    );

    // Table header
    const colWidth = contentWidth / 4;
    doc.setFillColor(0, 122, 255);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Week Starting', margin + 2, yPosition + 5);
    doc.text('Noise', margin + colWidth + 2, yPosition + 5);
    doc.text('Safety', margin + colWidth * 2 + 2, yPosition + 5);
    doc.text('Cleanliness', margin + colWidth * 3 + 2, yPosition + 5);
    yPosition += 8;

    // Table rows
    weeks.slice(0, 10).forEach((week: any, index: number) => {
      checkPageBreak(8);

      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, yPosition, contentWidth, 6, 'F');
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 37, 41);

      const weekDate = new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      doc.text(weekDate, margin + 2, yPosition + 4);
      doc.text(week.noise ? `${week.noise.avg_rating}` : '-', margin + colWidth + 2, yPosition + 4);
      doc.text(week.safety ? `${week.safety.avg_rating}` : '-', margin + colWidth * 2 + 2, yPosition + 4);
      doc.text(week.cleanliness ? `${week.cleanliness.avg_rating}` : '-', margin + colWidth * 3 + 2, yPosition + 4);

      yPosition += 6;
    });
    yPosition += 10;
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(108, 117, 125);
    doc.text('No weekly trend data available', margin, yPosition);
    yPosition += 20;
  }

  // Recent Rating Activity
  checkPageBreak(40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 122, 255);
  doc.text('Recent Rating Activity', margin, yPosition);
  yPosition += 15;

  if (ratingLog && ratingLog.length > 0) {
    const recentRatings = (ratingLog as any[]).slice(0, 20);
    for (const rating of recentRatings) {
      checkPageBreak(5);
      const date = new Date(rating.created_at);
      const logDate = date.toLocaleDateString();
      const userHash = rating.user_hash || (rating.user_id ? rating.user_id.toString().substring(0, 8) : 'unknown');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 37, 41);
      doc.text(`${logDate} - ${cleanText(rating.attribute)}: ${rating.stars} stars (User: ${userHash})`, margin, yPosition);
      yPosition += 4;
    }
    yPosition += 15;
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(108, 117, 125);
    doc.text('No rating history available', margin, yPosition);
    yPosition += 20;
  }

  // Footer
  checkPageBreak(20);
  doc.setDrawColor(233, 236, 239);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(108, 117, 125);
  doc.text('This report was generated automatically by the Property Ratings System.', margin, yPosition);
  yPosition += 4;
  doc.text(`Report ID: ${propertyId} | Generated: ${new Date().toISOString()}`, margin, yPosition);

  // Return PDF as ArrayBuffer
  return doc.output('arraybuffer');
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

      // Generate PDF
      const pdfBuffer = await generatePDFReport(admin, propertyId);

      // Send email with PDF attachment
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `Property Ratings <${FROM_EMAIL}>`,
          to: [toEmail],
          subject: `Property Rating Report - ${cleanText(propertyData.name)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #007AFF;">Your Property Rating Report is Ready!</h1>
              
              <p>Hello!</p>
              
              <p>Your requested property rating report for <strong>${cleanText(propertyData.name)}</strong> has been generated and is attached to this email as a PDF.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #007AFF;">Property Details</h3>
                <p><strong>Name:</strong> ${cleanText(propertyData.name)}</p>
                <p><strong>Address:</strong> ${cleanText(propertyData.address)}</p>
                <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>The attached PDF report includes:</p>
              <ul>
                <li>Overall rating averages</li>
                <li>Weekly trends (last 8 weeks)</li>
                <li>Recent rating activity</li>
                <li>Detailed property information</li>
              </ul>
              
              <p>If you have any questions about this report, please don't hesitate to contact us.</p>
              
              <p>Best regards,<br>
              The Property Ratings Team</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e9ecef;">
              <p style="font-size: 12px; color: #6c757d;">
                This email was sent automatically. Please do not reply to this email.
              </p>
            </div>
          `,
          attachments: [
            {
              filename: `${cleanText(propertyData.name).replace(/[^a-zA-Z0-9]/g, '-')}-report.pdf`,
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
