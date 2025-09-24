import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RatingData {
  attribute: string;
  avg_rating: number;
  rating_count: number;
}

interface WeeklyData {
  week_start: string;
  attribute: string;
  avg_rating: number;
  rating_count: number;
}

interface MonthlyData {
  month_start: string;
  attribute: string;
  avg_rating: number;
  rating_count: number;
}

interface RatingLog {
  created_at: string;
  attribute: string;
  stars: number;
  user_hash: string;
}

interface PropertyInfo {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
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
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Generating report for property: ${propertyId}`)

    // 1. Get property information
    const { data: propertyData, error: propertyError } = await supabaseClient
      .from('property')
      .select('id, name, address, lat, lng')
      .eq('id', propertyId)
      .single()

    if (propertyError || !propertyData) {
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const property: PropertyInfo = propertyData

    // 2. Get overall averages by attribute
    const { data: overallData } = await supabaseClient.rpc('get_overall_averages', {
      property_id_param: propertyId
    })

    // 3. Get weekly averages (last 8 weeks)
    const { data: weeklyData } = await supabaseClient.rpc('get_weekly_averages', {
      property_id_param: propertyId
    })

    // 4. Get monthly averages (last 12 months)
    const { data: monthlyData } = await supabaseClient.rpc('get_monthly_averages', {
      property_id_param: propertyId
    })

    // 5. Get rating log with hashed user IDs
    const { data: ratingLog } = await supabaseClient.rpc('get_rating_log', {
      property_id_param: propertyId
    })

    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create()
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
    const { width, height } = page.getSize()

    let yPosition = height - 50

    // Title
    page.drawText('Property Rating Report', {
      x: 50,
      y: yPosition,
      size: 24,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    })

    yPosition -= 40

    // Property info
    page.drawText(`Property: ${property.name}`, {
      x: 50,
      y: yPosition,
      size: 16,
      font: helveticaBold,
    })

    yPosition -= 25
    page.drawText(`Address: ${property.address}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaFont,
    })

    yPosition -= 20
    page.drawText(`Coordinates: ${property.lat.toFixed(6)}, ${property.lng.toFixed(6)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaFont,
    })

    yPosition -= 20
    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    })

    yPosition -= 40

    // Overall Averages Section
    page.drawText('Overall Averages', {
      x: 50,
      y: yPosition,
      size: 18,
      font: helveticaBold,
    })

    yPosition -= 25

    if (overallData && overallData.length > 0) {
      const overallRatings = overallData as RatingData[]
      let totalRating = 0
      let totalCount = 0

      overallRatings.forEach((rating) => {
        page.drawText(`${rating.attribute}: ${rating.avg_rating.toFixed(2)} ⭐ (${rating.rating_count} ratings)`, {
          x: 70,
          y: yPosition,
          size: 12,
          font: helveticaFont,
        })
        yPosition -= 20
        totalRating += rating.avg_rating * rating.rating_count
        totalCount += rating.rating_count
      })

      if (totalCount > 0) {
        const overallAvg = totalRating / totalCount
        page.drawText(`Overall Combined: ${overallAvg.toFixed(2)} ⭐`, {
          x: 70,
          y: yPosition,
          size: 12,
          font: helveticaBold,
        })
        yPosition -= 30
      }
    } else {
      page.drawText('No ratings available', {
        x: 70,
        y: yPosition,
        size: 12,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      })
      yPosition -= 30
    }

    // Weekly Trends (last 8 weeks)
    page.drawText('Weekly Trends (Last 8 Weeks)', {
      x: 50,
      y: yPosition,
      size: 18,
      font: helveticaBold,
    })

    yPosition -= 25

    if (weeklyData && weeklyData.length > 0) {
      const weeklyRatings = weeklyData as WeeklyData[]
      weeklyRatings.forEach((week) => {
        const weekDate = new Date(week.week_start).toLocaleDateString()
        page.drawText(`Week ${weekDate}: ${week.attribute} = ${week.avg_rating.toFixed(2)} ⭐ (${week.rating_count})`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: helveticaFont,
        })
        yPosition -= 15
      })
    } else {
      page.drawText('No weekly data available', {
        x: 70,
        y: yPosition,
        size: 12,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    yPosition -= 20

    // Monthly Trends (last 12 months) - New page if needed
    if (yPosition < 200) {
      const newPage = pdfDoc.addPage([595.28, 841.89])
      page = newPage
      yPosition = height - 50
    }

    page.drawText('Monthly Trends (Last 12 Months)', {
      x: 50,
      y: yPosition,
      size: 18,
      font: helveticaBold,
    })

    yPosition -= 25

    if (monthlyData && monthlyData.length > 0) {
      const monthlyRatings = monthlyData as MonthlyData[]
      monthlyRatings.forEach((month) => {
        const monthDate = new Date(month.month_start).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        page.drawText(`${monthDate}: ${month.attribute} = ${month.avg_rating.toFixed(2)} ⭐ (${month.rating_count})`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: helveticaFont,
        })
        yPosition -= 15
      })
    } else {
      page.drawText('No monthly data available', {
        x: 70,
        y: yPosition,
        size: 12,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    // Rating Log (limited to recent entries)
    yPosition -= 30
    page.drawText('Recent Rating Log', {
      x: 50,
      y: yPosition,
      size: 18,
      font: helveticaBold,
    })

    yPosition -= 25

    if (ratingLog && ratingLog.length > 0) {
      const recentRatings = (ratingLog as RatingLog[]).slice(0, 20) // Show last 20 ratings
      recentRatings.forEach((log) => {
        const date = new Date(log.created_at).toLocaleDateString()
        const time = new Date(log.created_at).toLocaleTimeString()
        page.drawText(`${date} ${time}: ${log.attribute} = ${log.stars} ⭐ (User: ${log.user_hash})`, {
          x: 70,
          y: yPosition,
          size: 9,
          font: helveticaFont,
        })
        yPosition -= 12
        
        if (yPosition < 50) break // Stop if we run out of space
      })
    } else {
      page.drawText('No rating history available', {
        x: 70,
        y: yPosition,
        size: 12,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Upload to Supabase Storage
    const fileName = `property-${propertyId}-report-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('reports')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF to storage' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
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
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        property: property.name,
        reportUrl: signedUrlData.signedUrl,
        fileName: fileName,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
