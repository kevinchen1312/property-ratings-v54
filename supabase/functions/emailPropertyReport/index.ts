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

    // Create PDF-ready HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Property Rating Report - ${propertyData.name}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 40px; 
            line-height: 1.6; 
            color: #333;
            background: white;
        }
        .header { 
            text-align: center;
            border-bottom: 3px solid #007AFF; 
            padding-bottom: 30px; 
            margin-bottom: 40px; 
        }
        .header h1 {
            color: #007AFF;
            font-size: 28px;
            margin: 0 0 10px 0;
        }
        .property-info { 
            background: #f8f9fa; 
            padding: 25px; 
            border-radius: 12px; 
            margin-bottom: 40px;
            border-left: 5px solid #007AFF;
        }
        .property-info h2 {
            margin-top: 0;
            color: #007AFF;
        }
        .section { 
            margin-bottom: 40px; 
            page-break-inside: avoid;
        }
        .section h2 { 
            color: #007AFF; 
            border-bottom: 2px solid #e9ecef; 
            padding-bottom: 10px;
            font-size: 20px;
        }
        .rating-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            margin: 25px 0;
        }
        .rating-card { 
            background: white; 
            border: 2px solid #e9ecef; 
            padding: 20px; 
            border-radius: 12px; 
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .rating-card h3 {
            margin: 0 0 10px 0;
            color: #495057;
            text-transform: capitalize;
        }
        .rating-value { 
            font-size: 28px; 
            font-weight: bold; 
            color: #007AFF;
            margin: 10px 0;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 25px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th, td { 
            padding: 15px; 
            text-align: left; 
            border: 1px solid #dee2e6;
        }
        th { 
            background-color: #007AFF; 
            color: white;
            font-weight: 600;
            text-align: center;
        }
        td {
            text-align: center;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
        }
        @page { margin: 0.75in; }
        @media print {
            .section { page-break-inside: avoid; }
            table { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏠 Property Rating Report</h1>
        <p style="font-size: 14px; color: #6c757d; margin: 0;">
            Generated on ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })} at ${new Date().toLocaleTimeString()}
        </p>
    </div>

    <div class="property-info">
        <h2>📍 Property Information</h2>
        <p><strong>Name:</strong> ${propertyData.name}</p>
        <p><strong>Address:</strong> ${propertyData.address}</p>
        <p><strong>Coordinates:</strong> ${propertyData.lat.toFixed(6)}, ${propertyData.lng.toFixed(6)}</p>
    </div>

    <div class="section">
        <h2>⭐ Overall Rating Summary</h2>
        <div class="rating-grid">
            ${overallData && overallData.length > 0 ? overallData.map((rating: any) => `
                <div class="rating-card">
                    <h3>${rating.attribute}</h3>
                    <div class="rating-value">${rating.avg_rating} ⭐</div>
                    <p style="margin: 0; color: #6c757d;">${rating.rating_count} total ratings</p>
                </div>
            `).join('') : '<p style="text-align: center; color: #6c757d; font-style: italic;">No ratings available for this property</p>'}
        </div>
    </div>

    <div class="section">
        <h2>📈 Weekly Trends (Last 8 Weeks)</h2>
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
                            <th>Week Starting</th>
                            <th>Noise</th>
                            <th>Friendliness</th>
                            <th>Cleanliness</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${weeks.map((week: any) => `
                            <tr>
                                <td style="text-align: left; font-weight: 500;">
                                    ${new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </td>
                                <td>${week.noise ? `${week.noise.avg_rating} ⭐` : '-'}</td>
                                <td>${week.friendliness ? `${week.friendliness.avg_rating} ⭐` : '-'}</td>
                                <td>${week.cleanliness ? `${week.cleanliness.avg_rating} ⭐` : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        })() : '<p style="text-align: center; color: #6c757d; font-style: italic;">No weekly trend data available</p>'}
    </div>

    <div class="footer">
        <p>This report was generated automatically by the Property Ratings System.</p>
        <p>Report ID: ${propertyId} | Generated: ${new Date().toISOString()}</p>
    </div>
</body>
</html>
    `

    // Convert HTML to PDF using htmlcsstoimage.com API (they have PDF endpoint)
    const htmlCssToImageApiKey = Deno.env.get('HTMLCSS_API_KEY')
    
    if (!htmlCssToImageApiKey) {
      // Fallback: Save HTML and return preview URL
      const fileName = `property-report-${propertyData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.html`
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('reports')
        .upload(fileName, htmlContent, {
          contentType: 'text/html',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return new Response(
          JSON.stringify({ error: 'Failed to generate report' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: signedUrlData } = await supabaseClient.storage
        .from('reports')
        .createSignedUrl(fileName, 24 * 60 * 60) // 24 hours

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Report generated (HTML format - PDF service not configured)',
          property: propertyData.name,
          userEmail: userEmail,
          htmlUrl: signedUrlData?.signedUrl,
          note: 'To enable PDF generation and email delivery, configure HTMLCSS_API_KEY and RESEND_API_KEY secrets'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate PDF using htmlcsstoimage.com
    console.log('Converting HTML to PDF...')
    
    const pdfResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(htmlCssToImageApiKey + ':')}`
      },
      body: JSON.stringify({
        html: htmlContent,
        format: 'pdf',
        device_scale: 2,
        viewport_width: 1024,
        viewport_height: 768
      })
    })

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text()
      console.error('PDF generation error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to generate PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pdfResult = await pdfResponse.json() as any
    
    if (!pdfResult.url) {
      console.error('No PDF URL returned')
      return new Response(
        JSON.stringify({ error: 'PDF generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Download the PDF
    const pdfDownload = await fetch(pdfResult.url)
    const pdfBuffer = await pdfDownload.arrayBuffer()

    // Upload PDF to Supabase Storage
    const pdfFileName = `property-report-${propertyData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`
    
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

    console.log('Sending email with PDF attachment...')

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Property Ratings <reports@yourdomain.com>',
        to: [userEmail],
        subject: `Property Rating Report - ${propertyData.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #007AFF;">🏠 Your Property Rating Report is Ready!</h1>
            
            <p>Hello!</p>
            
            <p>Your requested property rating report for <strong>${propertyData.name}</strong> has been generated and is attached to this email.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #007AFF;">📍 Property Details</h3>
              <p><strong>Name:</strong> ${propertyData.name}</p>
              <p><strong>Address:</strong> ${propertyData.address}</p>
              <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>The attached PDF report includes:</p>
            <ul>
              <li>📊 Overall rating averages</li>
              <li>📈 Weekly and monthly trends</li>
              <li>📝 Recent rating activity</li>
              <li>📍 Property information</li>
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
            filename: `${propertyData.name.replace(/[^a-zA-Z0-9]/g, '-')}-report.pdf`,
            content: Array.from(new Uint8Array(pdfBuffer)),
            type: 'application/pdf'
          }
        ]
      })
    })

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text()
      console.error('Email sending error:', emailError)
      return new Response(
        JSON.stringify({
          success: true,
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
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'PDF report generated and emailed successfully!',
        property: propertyData.name,
        userEmail: userEmail,
        emailId: emailResult.id,
        pdfUrl: pdfSignedUrlData?.signedUrl
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