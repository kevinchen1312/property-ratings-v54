// Simple devGrantCredits function - uses built-in Supabase environment variables
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // Use built-in Supabase environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    const access_token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: userRes, error: userErr } = await supabase.auth.getUser(access_token);
    if (userErr || !userRes.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const user = userRes.user;

    // Parse request body
    const { amount } = await req.json();
    const qty = Number(amount) || 5; // Default to 5 credits
    
    // Allow negative amounts for deductions, positive for grants
    if (qty === 0 || Math.abs(qty) > 20) {
      return new Response(JSON.stringify({ 
        error: "BAD_AMOUNT",
        message: "Amount must be between -20 and 20 (excluding 0)" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Simple approach: Check if user has credits record, then upsert
    const { data: existingCredits } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentCredits = existingCredits?.credits || 0;
    const newCredits = currentCredits + qty;

    // Don't allow negative credits
    if (newCredits < 0) {
      return new Response(JSON.stringify({ 
        error: "INSUFFICIENT_CREDITS",
        message: `Insufficient credits. You have ${currentCredits}, need ${Math.abs(qty)}` 
      }), { 
        status: 402,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Upsert the credits
    const { error: upsertError } = await supabase
      .from("user_credits")
      .upsert({ 
        user_id: user.id,
        credits: newCredits,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ 
        error: "DB_ERROR",
        message: "Failed to update credits" 
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      added: qty,
      total_credits: newCredits,
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
