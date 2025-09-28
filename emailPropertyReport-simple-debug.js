import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  console.log("🚀 SIMPLE DEBUG: Function started!")
  
  if (req.method === 'OPTIONS') {
    console.log("🚀 SIMPLE DEBUG: OPTIONS request")
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    console.log("🚀 SIMPLE DEBUG: Processing request...")
    
    const body = await req.json()
    console.log("🚀 SIMPLE DEBUG: Request body:", JSON.stringify(body))
    
    const { propertyId, userEmail } = body
    console.log("🚀 SIMPLE DEBUG: Property ID:", propertyId)
    console.log("🚀 SIMPLE DEBUG: User Email:", userEmail)
    
    // Just return a simple response for now
    return new Response(
      JSON.stringify({
        success: false,
        message: "DEBUG VERSION WORKING - This is just a test to verify deployment",
        propertyId: propertyId,
        userEmail: userEmail,
        debug: true
      }),
      { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error("🚀 SIMPLE DEBUG: Error:", error)
    return new Response(
      JSON.stringify({ 
        error: "DEBUG VERSION ERROR: " + error.message,
        debug: true 
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
