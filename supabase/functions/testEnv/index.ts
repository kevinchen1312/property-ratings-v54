import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Skip auth for this test function

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const allEnvKeys = Object.keys(Deno.env.toObject());
  
  console.log('🔧 Environment test:', {
    hasStripeKey: !!stripeKey,
    stripeKeyLength: stripeKey?.length || 0,
    stripeKeyPrefix: stripeKey?.substring(0, 7) || 'none',
    allEnvKeys: allEnvKeys
  });

  return new Response(
    JSON.stringify({
      hasStripeKey: !!stripeKey,
      stripeKeyLength: stripeKey?.length || 0,
      stripeKeyPrefix: stripeKey?.substring(0, 7) || 'none',
      allEnvKeys: allEnvKeys
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
