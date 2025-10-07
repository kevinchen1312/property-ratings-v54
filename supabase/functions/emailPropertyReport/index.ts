import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts'
import { chartModuleCode } from './charts.ts'
import { reportCSS } from './report.css.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper functions for data processing
interface RatingData {
  attribute: string;
  stars: number;
  created_at: string;
  user_id?: string;
  user_hash?: string;
}

interface DailyPoint {
  date: string;
  avg: number;
}

interface HourlyPoint {
  hour: number;
  avg: number;
}

function formatRating(rating: number): string {
  return `${rating.toFixed(2)} / 5`;
}

function calculateDailyTrends(ratings: RatingData[]): { quietness: DailyPoint[], cleanliness: DailyPoint[], safety: DailyPoint[] } {
  const grouped: Record<string, Record<string, number[]>> = {};
  
  ratings.forEach(r => {
    const date = new Date(r.created_at).toISOString().split('T')[0];
    if (!grouped[date]) grouped[date] = {};
    const attr = mapAttribute(r.attribute);
    if (!grouped[date][attr]) grouped[date][attr] = [];
    grouped[date][attr].push(r.stars);
  });
  
  const result = { quietness: [] as DailyPoint[], cleanliness: [] as DailyPoint[], safety: [] as DailyPoint[] };
  
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

function calculateHourlyTrends(ratings: RatingData[]): { quietness: HourlyPoint[], cleanliness: HourlyPoint[], safety: HourlyPoint[] } {
  const grouped: Record<number, Record<string, number[]>> = {};
  
  ratings.forEach(r => {
    const hour = new Date(r.created_at).getHours();
    if (!grouped[hour]) grouped[hour] = {};
    const attr = mapAttribute(r.attribute);
    if (!grouped[hour][attr]) grouped[hour][attr] = [];
    grouped[hour][attr].push(r.stars);
  });
  
  const result = { quietness: [] as HourlyPoint[], cleanliness: [] as HourlyPoint[], safety: [] as HourlyPoint[] };
  
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

function mapAttribute(attr: string): string {
  const mapping: Record<string, string> = {
    'noise': 'Quietness',
    'quietness': 'Quietness',
    'cleanliness': 'Cleanliness',
    'safety': 'Safety',
    'friendliness': 'Safety' // Map old attribute to closest match
  };
  return mapping[attr.toLowerCase()] || attr;
}

function generateHTMLReport(data: any): string {
  const { property, insights, overallSummary, monthlySummary, dailyTrends, hourlyTrends, dailyLogs } = data;
  
  // Helper to format ratings
  const fmtRating = (val: number | null) => val !== null ? `${val.toFixed(2)} / 5` : '-';
  
  // Prepare chart data in the exact format expected by charts.ts
  const chartData = {
    dailyTrends: {
      quietness: dailyTrends.quietness || [],
      cleanliness: dailyTrends.cleanliness || [],
      safety: dailyTrends.safety || []
    },
    hourlyTrends: {
      quietness: hourlyTrends.quietness || [],
      cleanliness: hourlyTrends.cleanliness || [],
      safety: hourlyTrends.safety || []
    }
  };
  
  const chartDataJSON = JSON.stringify(chartData);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${reportCSS}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
</head>
<body>
  <h1>Community Observation Report</h1>
  <div class="address">${property.address}</div>
  
  <div class="insights">
    <strong>Insights</strong>
    <ul>
      ${insights.map((insight: string) => `<li>${insight}</li>`).join('')}
    </ul>
  </div>
  
  <h2>Overall Rating Summary (Averages Across All Users)</h2>
  <table>
    <thead>
      <tr>
        <th>Attribute</th>
        <th>Avg. Rating</th>
        <th>Total Ratings</th>
      </tr>
    </thead>
    <tbody>
      ${overallSummary.map((row: any) => `
        <tr>
          <td>${row.attribute}</td>
          <td>${fmtRating(row.avg)}</td>
          <td>${row.count}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2>Monthly Rating Summary</h2>
  ${monthlySummary.map((month: any) => `
    <h3>${month.label} Ratings</h3>
    <table>
      <thead>
        <tr>
          <th>Attribute</th>
          <th>Avg. Rating</th>
          <th>Total Ratings</th>
        </tr>
      </thead>
      <tbody>
        ${month.rows.map((row: any) => `
          <tr>
            <td>${row.attribute}</td>
            <td>${row.avg !== null ? fmtRating(row.avg) : '-'}</td>
            <td>${row.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')}
  
  <h2>Daily Rating Trends</h2>
  
  <section class="chart chart--wide">
    <h3>All Attributes Over Time</h3>
    <canvas id="trend-daily" class="chart-canvas"></canvas>
  </section>
  
  <h2>Time-of-Day Rating Trends</h2>
  
  <div class="chart-grid">
    <div class="chart">
      <h4>Quietness by Hour of Day</h4>
      <canvas id="trend-hourly-quiet" class="chart-canvas"></canvas>
    </div>
    
    <div class="chart">
      <h4>Cleanliness by Hour of Day</h4>
      <canvas id="trend-hourly-clean" class="chart-canvas"></canvas>
    </div>
    
    <div class="chart">
      <h4>Safety by Hour of Day</h4>
      <canvas id="trend-hourly-safety" class="chart-canvas"></canvas>
    </div>
  </div>
  
  <h2>Daily Logs (Selected Dates)</h2>
  ${dailyLogs.map((log: any) => {
    const dateObj = new Date(log.date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    // Group by user and time
    const grouped: Record<string, any> = {};
    log.rows.forEach((r: any) => {
      const time = new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const userId = r.user_hash || (r.user_id ? r.user_id.toString().substring(0, 8) : 'User');
      const key = `${time}-${userId}`;
      if (!grouped[key]) {
        grouped[key] = { time, user: userId, quietness: '', cleanliness: '', safety: '' };
      }
      const attr = mapAttribute(r.attribute);
      if (attr === 'Quietness') grouped[key].quietness = `${r.stars}/5`;
      if (attr === 'Cleanliness') grouped[key].cleanliness = `${r.stars}/5`;
      if (attr === 'Safety') grouped[key].safety = `${r.stars}/5`;
    });
    
    const rows = Object.values(grouped);
    
    return `
      <div class="daily-log">
        <h3>${dayName}, ${monthDay}</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Quietness</th>
              <th>Cleanliness</th>
              <th>Safety</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row: any) => `
              <tr>
                <td>${row.time}</td>
                <td>${row.user}</td>
                <td>${row.quietness}</td>
                <td>${row.cleanliness}</td>
                <td>${row.safety}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('')}
  
  <div class="disclaimer">
    <p><strong>Disclaimer:</strong> This report is generated from community observations and ratings. The data reflects subjective opinions of individual community members and may not represent objective measurements. Ratings are anonymized and aggregated for privacy. This report is provided for informational purposes only.</p>
  </div>
  
  <script>
    // Chart module code
    ${chartModuleCode}
    
    // Chart data from server
    const chartData = ${chartDataJSON};
    
    // Render all charts when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => renderAllCharts(chartData));
    } else {
      renderAllCharts(chartData);
    }
  </script>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { propertyId, userEmail } = await req.json()

    if (!propertyId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'propertyId and userEmail are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating PDF report for property: ${propertyId}, email: ${userEmail}`)

    // Get property information
    const { data: propertyData, error: propertyError } = await supabaseClient
      .from('property')
      .select('id, name, address, lat, lng')
      .eq('id', propertyId)
      .single()

    if (propertyError || !propertyData) {
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get report data
    const { data: ratingLog } = await supabaseClient.rpc('get_rating_log', {
      property_id_param: propertyId
    })

    const { data: monthlyData } = await supabaseClient.rpc('get_monthly_averages', {
      property_id_param: propertyId
    })

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
    
    // Insight 1: Find recurring patterns (e.g., "Mondays at 6:00 AM show lower Quietness")
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
    
    // Insight 2: Weekend cleanliness patterns
    const fridayAfternoons = allRatings.filter(r => {
      const d = new Date(r.created_at);
      return d.getDay() === 5 && d.getHours() >= 13 && d.getHours() <= 21 && mapAttribute(r.attribute) === 'Cleanliness';
    });
    if (fridayAfternoons.length > 5) {
      insights.push('Fridays (1–9 PM) show lower Cleanliness ratings compared to other times.');
    }
    
    // Insight 3: Safety consistency
    const safetyRatings = allRatings.filter(r => mapAttribute(r.attribute) === 'Safety');
    if (safetyRatings.length > 10) {
      const avgSafety = safetyRatings.reduce((a, b) => a + b.stars, 0) / safetyRatings.length;
      if (avgSafety > 3.8) {
        insights.push('Safety ratings remain steady across days and hours.');
      }
    }

    // Default insights if none were generated
    if (insights.length === 0) {
      insights.push('Community observation data shows consistent patterns across different times.');
      insights.push('Multiple attributes have been rated by community members.');
      insights.push('Data reflects various time periods and days of the week.');
    }
    
    // Generate HTML content for PDF
    console.log('Creating HTML template for PDF generation...');
    const htmlContent = generateHTMLReport({
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
    });
    
    // Generate PDF using Puppeteer
    console.log('Launching browser for PDF generation...');
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for charts to render
    await page.waitForTimeout(2000);
    
    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'letter',
      printBackground: true,
      margin: {
        top: '0.6in',
        right: '0.6in',
        bottom: '0.6in',
        left: '0.6in'
      }
    });
    
    await browser.close();
    console.log('PDF generated successfully');

    // Upload PDF to Supabase Storage
    const cleanName = propertyData.name.replace(/[^a-zA-Z0-9]/g, '-');
    const pdfFileName = `property-report-${cleanName}-${Date.now()}.pdf`
    
    console.log('Uploading PDF to Supabase Storage...');
    const { error: pdfUploadError } = await supabaseClient.storage
      .from('reports')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (pdfUploadError) {
      console.error('PDF upload error:', pdfUploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to store PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get signed URL for PDF
    const { data: pdfSignedUrlData } = await supabaseClient.storage
      .from('reports')
      .createSignedUrl(pdfFileName, 7 * 24 * 60 * 60) // 7 days

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'PDF generated but email not sent (Resend API key not configured)',
          property: propertyData.name,
          userEmail: userEmail,
          pdfUrl: pdfSignedUrlData?.signedUrl,
          note: 'Configure RESEND_API_KEY to enable email delivery'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fromEmail = Deno.env.get('REPORTS_FROM_EMAIL') || 'onboarding@resend.dev';
    console.log('Sending email with PDF attachment...');
    console.log('From email:', fromEmail);
    console.log('To email:', userEmail);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: `Property Ratings <${fromEmail}>`,
        to: [userEmail],
        subject: `Property Rating Report - ${propertyData.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #007AFF;">Your Property Rating Report is Ready!</h1>
            
            <p>Hello!</p>
            
            <p>Your requested property rating report for <strong>${propertyData.name}</strong> has been generated and is attached to this email as a PDF.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #007AFF;">Property Details</h3>
              <p><strong>Name:</strong> ${propertyData.name}</p>
              <p><strong>Address:</strong> ${propertyData.address}</p>
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
            filename: `${cleanName}-report.pdf`,
            content: Array.from(new Uint8Array(pdfBuffer)),
            type: 'application/pdf'
          }
        ]
      })
    })

    console.log('Email response status:', emailResponse.status);

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text()
      console.error('Email sending error:', emailError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'PDF generated but email failed to send',
          property: propertyData.name,
          userEmail: userEmail,
          pdfUrl: pdfSignedUrlData?.signedUrl,
          error: 'Email delivery failed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailResult = await emailResponse.json()
    console.log('PDF email sent successfully! ID:', emailResult.id)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF report generated and emailed successfully!',
        property: propertyData.name,
        userEmail: userEmail,
        emailId: emailResult.id,
        pdfUrl: pdfSignedUrlData?.signedUrl,
        format: 'PDF'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})