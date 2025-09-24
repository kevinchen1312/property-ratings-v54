import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('PROJECT_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    const { propertyId } = await req.json()

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: 'propertyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating HTML report for property: ${propertyId}`)

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

    // Get overall averages
    const { data: overallData } = await supabaseClient.rpc('get_overall_averages', {
      property_id_param: propertyId
    })

    // Get weekly averages
    const { data: weeklyData } = await supabaseClient.rpc('get_weekly_averages', {
      property_id_param: propertyId
    })

    // Get monthly averages
    const { data: monthlyData } = await supabaseClient.rpc('get_monthly_averages', {
      property_id_param: propertyId
    })

    // Get rating log
    const { data: ratingLog } = await supabaseClient.rpc('get_rating_log', {
      property_id_param: propertyId
    })

    // Generate HTML report
    const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>Property Rating Report - ${propertyData.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .property-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .rating-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .rating-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
        .rating-value { font-size: 24px; font-weight: bold; color: #007AFF; }
        .trend-item { padding: 10px; border-bottom: 1px solid #eee; }
        .log-item { font-family: monospace; font-size: 12px; padding: 5px; border-bottom: 1px solid #f0f0f0; }
        .stars { color: #FFB300; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏠 Property Rating Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>

    <div class="property-info">
        <h2>📍 Property Information</h2>
        <p><strong>Name:</strong> ${propertyData.name}</p>
        <p><strong>Address:</strong> ${propertyData.address}</p>
        <p><strong>Coordinates:</strong> ${propertyData.lat.toFixed(6)}, ${propertyData.lng.toFixed(6)}</p>
    </div>

    <div class="section">
        <h2>⭐ Overall Averages</h2>
        <div class="rating-grid">
            ${overallData && overallData.length > 0 ? overallData.map((rating: any) => `
                <div class="rating-card">
                    <h3>${rating.attribute}</h3>
                    <div class="rating-value">${rating.avg_rating} <span class="stars">⭐</span></div>
                    <p>${rating.rating_count} ratings</p>
                </div>
            `).join('') : '<p>No ratings available</p>'}
        </div>
    </div>

    <div class="section">
        <h2>📈 Weekly Trends (Last 8 Weeks)</h2>
        ${weeklyData && weeklyData.length > 0 ? (() => {
            // Group weekly data by week
            const weeklyGrouped = weeklyData.reduce((acc: any, item: any) => {
                const weekKey = item.week_start;
                if (!acc[weekKey]) {
                    acc[weekKey] = { week_start: weekKey, noise: null, friendliness: null, cleanliness: null };
                }
                acc[weekKey][item.attribute] = { avg_rating: item.avg_rating, rating_count: item.rating_count };
                return acc;
            }, {});
            
            const weeks = Object.values(weeklyGrouped).sort((a: any, b: any) => 
                new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
            );
            
            return `
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Week</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Noise</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Friendliness</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Cleanliness</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${weeks.map((week: any) => `
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 500;">
                                    ${new Date(week.week_start).toLocaleDateString()}
                                </td>
                                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">
                                    ${week.noise ? `${week.noise.avg_rating} ⭐<br><small>(${week.noise.rating_count})</small>` : '-'}
                                </td>
                                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">
                                    ${week.friendliness ? `${week.friendliness.avg_rating} ⭐<br><small>(${week.friendliness.rating_count})</small>` : '-'}
                                </td>
                                <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">
                                    ${week.cleanliness ? `${week.cleanliness.avg_rating} ⭐<br><small>(${week.cleanliness.rating_count})</small>` : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        })() : '<p>No weekly data available</p>'}
    </div>

    <div class="section">
        <h2>📊 Monthly Trends (Last 12 Months)</h2>
        ${monthlyData && monthlyData.length > 0 ? monthlyData.map((month: any) => `
            <div class="trend-item">
                <strong>${new Date(month.month_start).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}:</strong>
                ${month.attribute} = ${month.avg_rating} ⭐ (${month.rating_count} ratings)
            </div>
        `).join('') : '<p>No monthly data available</p>'}
    </div>

    <div class="section">
        <h2>📝 Recent Rating Log</h2>
        ${ratingLog && ratingLog.length > 0 ? ratingLog.slice(0, 20).map((log: any) => `
            <div class="log-item">
                ${new Date(log.created_at).toLocaleDateString()} ${new Date(log.created_at).toLocaleTimeString()} - 
                ${log.attribute}: ${log.stars} ⭐ (User: ${log.user_hash})
            </div>
        `).join('') : '<p>No rating history available</p>'}
    </div>
</body>
</html>
    `.trim()

    return new Response(
      htmlReport,
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="property-${propertyId}-report.html"`
        } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
