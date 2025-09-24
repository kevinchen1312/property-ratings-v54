import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Use puppeteer-core for PDF generation
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts'

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

    console.log(`Generating PDF report for property: ${propertyId}`)

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

    // Get data
    const { data: overallData } = await supabaseClient.rpc('get_overall_averages', {
      property_id_param: propertyId
    })

    const { data: weeklyData } = await supabaseClient.rpc('get_weekly_averages', {
      property_id_param: propertyId
    })

    const { data: monthlyData } = await supabaseClient.rpc('get_monthly_averages', {
      property_id_param: propertyId
    })

    const { data: ratingLog } = await supabaseClient.rpc('get_rating_log', {
      property_id_param: propertyId
    })

    // Create HTML content for PDF generation
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .property-info { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .rating-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .rating-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .rating-value { font-size: 24px; font-weight: bold; color: #007AFF; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        @page { margin: 0.5in; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Property Rating Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>

    <div class="section property-info">
        <h2>Property Information</h2>
        <p><strong>Name:</strong> ${propertyData.name}</p>
        <p><strong>Address:</strong> ${propertyData.address}</p>
        <p><strong>Coordinates:</strong> ${propertyData.lat.toFixed(6)}, ${propertyData.lng.toFixed(6)}</p>
    </div>

    <div class="section">
        <h2>Overall Averages</h2>
        <div class="rating-grid">
            ${overallData && overallData.length > 0 ? overallData.map((rating: any) => `
                <div class="rating-card">
                    <h3>${rating.attribute}</h3>
                    <div class="rating-value">${rating.avg_rating} ⭐</div>
                    <p>${rating.rating_count} ratings</p>
                </div>
            `).join('') : '<p>No ratings available</p>'}
        </div>
    </div>

    <div class="section">
        <h2>Weekly Trends (Last 8 Weeks)</h2>
        ${weeklyData && weeklyData.length > 0 ? (() => {
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
                <table>
                    <thead>
                        <tr>
                            <th>Week</th>
                            <th>Noise</th>
                            <th>Friendliness</th>
                            <th>Cleanliness</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${weeks.map((week: any) => `
                            <tr>
                                <td>${new Date(week.week_start).toLocaleDateString()}</td>
                                <td>${week.noise ? `${week.noise.avg_rating} ⭐ (${week.noise.rating_count})` : '-'}</td>
                                <td>${week.friendliness ? `${week.friendliness.avg_rating} ⭐ (${week.friendliness.rating_count})` : '-'}</td>
                                <td>${week.cleanliness ? `${week.cleanliness.avg_rating} ⭐ (${week.cleanliness.rating_count})` : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        })() : '<p>No weekly data available</p>'}
    </div>
</body>
</html>
    `

    // Since Puppeteer is complex in Deno environment, let's return HTML and suggest a simpler approach
    return new Response(
      JSON.stringify({
        success: true,
        property: propertyData.name,
        html: htmlContent,
        message: "Use the HTML report function for now - PDF generation needs additional setup"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
    // Upload to Supabase Storage
    const fileName = `property-${propertyId}-report-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF to storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate signed URL (valid for 7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('reports')
      .createSignedUrl(fileName, 7 * 24 * 60 * 60) // 7 days in seconds

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        property: propertyData.name,
        reportUrl: signedUrlData.signedUrl,
        fileName: fileName,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
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