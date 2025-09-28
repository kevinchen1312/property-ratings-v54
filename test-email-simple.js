import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    console.log("🧪 EMAIL TEST: Starting email test...")
    
    const { userEmail } = await req.json()
    
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    console.log("🧪 EMAIL TEST: Resend API Key exists:", !!resendApiKey)
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "RESEND_API_KEY not configured",
          debug: true
        }),
        { 
          headers: { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const fromEmail = Deno.env.get('REPORTS_FROM_EMAIL') || 'onboarding@resend.dev';
    console.log("🧪 EMAIL TEST: From email:", fromEmail)
    console.log("🧪 EMAIL TEST: To email:", userEmail)

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: `Property Ratings Test <${fromEmail}>`,
        to: [userEmail],
        subject: "Email Test - Property Ratings",
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h1>Email Test Successful!</h1>
            <p>This is a test email to verify email delivery is working.</p>
            <p>If you receive this, email delivery is configured correctly.</p>
          </div>
        `
      })
    })

    console.log("🧪 EMAIL TEST: Response status:", emailResponse.status)
    
    if (!emailResponse.ok) {
      const emailError = await emailResponse.text()
      console.error("🧪 EMAIL TEST: Error:", emailError)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email sending failed",
          details: emailError,
          status: emailResponse.status
        }),
        { 
          headers: { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const emailResult = await emailResponse.json()
    console.log("🧪 EMAIL TEST: Success! Email ID:", emailResult.id)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Test email sent successfully!",
        emailId: emailResult.id,
        fromEmail: fromEmail,
        toEmail: userEmail
      }),
      { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error("🧪 EMAIL TEST: Error:", error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
