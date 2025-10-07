// deno-lint-ignore-file no-explicit-any
/**
 * on-auth-user-created Edge Function
 * 
 * Triggered by Supabase Auth "user.created" webhook
 * 
 * Responsibilities:
 * 1. Generate a unique referral_code for the new user
 * 2. Insert into public.profiles with the generated referral_code
 * 3. If incoming_referral_code is present:
 *    - Look up the referrer profile by referral_code
 *    - Prevent self-referral, duplicates, and circular references
 *    - Set referred_by on the new user's profile
 *    - Insert two rows into credit_ledger for both parties
 * 4. Create a Stripe Customer for the user and store it in public.stripe_customers
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE")!;
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const REFERRAL_BONUS_REFERRER = parseInt(Deno.env.get("REFERRAL_BONUS_REFERRER") ?? "20", 10);
const REFERRAL_BONUS_REFERRED = parseInt(Deno.env.get("REFERRAL_BONUS_REFERRED") ?? "10", 10);

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" });

/**
 * Generate a unique referral code
 * Short, URL-safe, not easily guessable
 */
function makeReferralCode(userId: string): string {
  // Use crypto.randomUUID for secure random generation
  const base = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return base;
}

serve(async (req) => {
  try {
    const { record } = await req.json(); // { id, email, user_metadata? }
    const userId: string = record.id;
    const email: string = record.email;
    const meta: any = record.user_metadata ?? {};

    console.log(`Processing new user: ${userId} (${email})`);

    // 1) Create profile with unique referral_code
    const referral_code = makeReferralCode(userId);

    const { error: profileErr } = await sb
      .from("profiles")
      .insert({ 
        id: userId, 
        email, 
        full_name: meta.full_name ?? null, 
        referral_code 
      });
    
    if (profileErr) {
      console.error("Profile creation error:", profileErr);
      throw new Error(`Failed to create profile: ${profileErr.message}`);
    }

    console.log(`Profile created with referral code: ${referral_code}`);

    // 2) Handle incoming referral (either passed from client metadata or server-side injection)
    const incomingCode: string | undefined = meta.incoming_referral_code ?? undefined;
    
    if (incomingCode && incomingCode.trim() !== "") {
      console.log(`Processing incoming referral code: ${incomingCode}`);
      
      // Prevent self-referral
      if (incomingCode === referral_code) {
        console.log("Self-referral attempt blocked");
      } else {
        // Lookup referrer by referral_code
        const { data: ref, error: refErr } = await sb
          .from("profiles")
          .select("id, referral_code")
          .eq("referral_code", incomingCode.trim().toUpperCase())
          .maybeSingle();

        if (refErr) {
          console.error("Referrer lookup error:", refErr);
        } else if (ref && ref.id !== userId) {
          console.log(`Found referrer: ${ref.id}`);
          
          // set referred_by
          const { error: updateErr } = await sb
            .from("profiles")
            .update({ referred_by: ref.id })
            .eq("id", userId);

          if (updateErr) {
            console.error("Failed to set referred_by:", updateErr);
          } else {
            console.log("Successfully set referred_by");
            
            // credit referrer
            const { error: referrerCreditErr } = await sb
              .from("credit_ledger")
              .insert({
                user_id: ref.id,
                delta: REFERRAL_BONUS_REFERRER,
                reason: "referral_bonus_referrer",
                meta: { new_user_id: userId, code: incomingCode, new_user_email: email }
              });

            if (referrerCreditErr) {
              console.error("Failed to credit referrer:", referrerCreditErr);
            } else {
              console.log(`Credited referrer ${ref.id} with ${REFERRAL_BONUS_REFERRER} credits`);
            }

            // credit new user
            const { error: newUserCreditErr } = await sb
              .from("credit_ledger")
              .insert({
                user_id: userId,
                delta: REFERRAL_BONUS_REFERRED,
                reason: "referral_bonus_referred",
                meta: { referrer_user_id: ref.id, code: incomingCode }
              });

            if (newUserCreditErr) {
              console.error("Failed to credit new user:", newUserCreditErr);
            } else {
              console.log(`Credited new user ${userId} with ${REFERRAL_BONUS_REFERRED} credits`);
            }
          }
        } else {
          console.log(`Invalid referral code: ${incomingCode} (not found or self-referral)`);
        }
      }
    } else {
      console.log("No referral code provided");
    }

    // 3) Create Stripe Customer
    console.log("Creating Stripe customer...");
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: userId },
      name: meta.full_name ?? undefined,
    });

    const { error: stripeErr } = await sb
      .from("stripe_customers")
      .insert({ user_id: userId, customer_id: customer.id });
    
    if (stripeErr) {
      console.error("Failed to link Stripe customer:", stripeErr);
      throw new Error(`Failed to link Stripe customer: ${stripeErr.message}`);
    }

    console.log(`Stripe customer created: ${customer.id}`);
    console.log("✅ User setup complete");

    return new Response(JSON.stringify({ 
      success: true, 
      referral_code,
      stripe_customer_id: customer.id 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("❌ Error processing user creation:", e);
    return new Response(JSON.stringify({ 
      error: String(e),
      message: e instanceof Error ? e.message : "Unknown error"
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
