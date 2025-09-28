// Simplified devGrantCredits function for debugging
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
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
    
    if (qty <= 0 || qty > 20) {
      return new Response(JSON.stringify({ 
        error: "BAD_AMOUNT",
        message: "Amount must be between 1 and 20" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Simple approach: directly insert/update using service role
    const { data: existingCredits, error: selectError } = await admin
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) {
      console.error("Select error:", selectError);
      return new Response(JSON.stringify({ 
        error: "DB_ERROR",
        message: "Failed to check existing credits",
        details: selectError.message 
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    let newCredits;
    if (existingCredits) {
      // Update existing record
      const { data: updateData, error: updateError } = await admin
        .from("user_credits")
        .update({ 
          credits: existingCredits.credits + qty,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .select("credits")
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(JSON.stringify({ 
          error: "DB_ERROR",
          message: "Failed to update credits",
          details: updateError.message 
        }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      newCredits = updateData.credits;
    } else {
      // Insert new record
      const { data: insertData, error: insertError } = await admin
        .from("user_credits")
        .insert({ 
          user_id: user.id,
          credits: qty
        })
        .select("credits")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ 
          error: "DB_ERROR",
          message: "Failed to insert credits",
          details: insertError.message 
        }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      newCredits = insertData.credits;
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      added: qty,
      total_credits: newCredits,
      message: `Successfully added ${qty} test credits`
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ 
      error: "SERVER_ERROR",
      message: error.message,
      stack: error.stack
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
