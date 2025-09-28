// supabase/functions/devGrantCredits/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const DEV_GRANT_ENABLED = (Deno.env.get("DEV_GRANT_ENABLED") || "false").toLowerCase() === "true";

// Check for required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing required environment variables:", {
    SUPABASE_URL: !!SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE
  });
}

Deno.serve(async (req) => {

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Check if dev grants are enabled
  // Disabled for development - remove this check or set DEV_GRANT_ENABLED=true in production
  if (false) {
    return new Response(JSON.stringify({ 
      error: "FORBIDDEN",
      message: "Dev credit grants are disabled" 
    }), { 
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Check environment variables at runtime
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return new Response(JSON.stringify({ 
        error: "CONFIG_ERROR",
        message: "Missing required environment variables",
        details: {
          SUPABASE_URL: !!SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE
        }
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    const access_token = authHeader.replace("Bearer ", "");
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const { data: userRes, error: userErr } = await admin.auth.getUser(access_token);
    if (userErr || !userRes.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const user = userRes.user;

    // Parse request body
    const { amount } = await req.json();
    const qty = Number(amount) || 0;
    
    // Allow negative amounts for deduction, but limit the range
    if (qty === 0 || qty < -20 || qty > 20) {
      return new Response(JSON.stringify({ 
        error: "BAD_AMOUNT",
        message: "Amount must be between -20 and 20 (excluding 0)" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Increment credits using database function (handles upsert internally)
    const { data: incrementResult, error: incrementErr } = await admin.rpc("increment_credits_if_exists", { 
      p_user: user.id, 
      p_amount: qty 
    });

    if (incrementErr) {
      console.error("Increment credits error:", incrementErr);
      return new Response(JSON.stringify({ 
        error: "DB_ERROR",
        message: "Failed to increment credits",
        details: incrementErr.message 
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!incrementResult) {
      console.error("Increment credits returned false");
      return new Response(JSON.stringify({ 
        error: "DB_ERROR",
        message: "Failed to increment credits - function returned false" 
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get updated credit balance
    const { data: creditsData } = await admin
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    return new Response(JSON.stringify({ 
      ok: true, 
      added: qty,
      total_credits: creditsData?.credits || 0,
      message: qty > 0 ? `Successfully added ${qty} test credits` : `Successfully deducted ${Math.abs(qty)} credits`
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