// supabase/functions/redeemReports/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@3.2.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("REPORTS_FROM_EMAIL") || "reports@yourdomain.com";

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
    const { propertyIds, email } = await req.json();
    
    if (!Array.isArray(propertyIds) || propertyIds.length < 1 || propertyIds.length > 10) {
      return new Response(JSON.stringify({ error: "BAD_INPUT" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const toEmail = (email || user.email || "").trim();
    if (!toEmail) {
      return new Response(JSON.stringify({ error: "NO_EMAIL" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Debit credits atomically
    const { data: ok, error: debitErr } = await admin.rpc("debit_credits", {
      p_user: user.id,
      p_amount: propertyIds.length,
    });

    if (debitErr) {
      console.error("Debit credits error:", debitErr);
      return new Response(JSON.stringify({ error: "DB_ERROR" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!ok) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS" }), { 
        status: 402,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Generate reports for each property
    const now = new Date();
    const from = new Date(now);
    from.setFullYear(now.getFullYear() - 1);

    const paths: string[] = [];
    const links: string[] = [];

    for (const propertyId of propertyIds) {
      // Get property report data
      const { data: report, error: rpcErr } = await admin.rpc("get_property_report", {
        p_property_id: propertyId,
        p_from: from.toISOString().slice(0, 10),
        p_to: now.toISOString().slice(0, 10),
      });

      if (rpcErr) {
        console.error("Report generation error:", rpcErr);
        throw new Error(`Failed to generate report for property ${propertyId}`);
      }

      // Create report content (JSON for now, can be enhanced to PDF later)
      const reportContent = JSON.stringify(report, null, 2);
      const bytes = new TextEncoder().encode(reportContent);
      const path = `${user.id}/${propertyId}-${Date.now()}.json`;

      // Upload to private reports bucket
      const { error: uploadErr } = await admin.storage
        .from("reports")
        .upload(path, bytes, {
          contentType: "application/json",
          upsert: false,
        });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        throw new Error(`Failed to upload report for property ${propertyId}`);
      }

      // Create signed URL (7 days expiry)
      const { data: signedData, error: signErr } = await admin.storage
        .from("reports")
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      if (signErr || !signedData?.signedUrl) {
        console.error("Signed URL error:", signErr);
        throw new Error(`Failed to create signed URL for property ${propertyId}`);
      }

      paths.push(path);
      links.push(signedData.signedUrl);

      // Log redemption (optional tracking)
      await admin.from("report_redemption").insert({
        user_id: user.id,
        property_id: propertyId
      }).catch(() => {}); // Ignore errors for optional logging
    }

    // Send email with report links
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Your Property Reports (${propertyIds.length} properties)`,
      html: `
        <h2>Your Property Reports</h2>
        <p>Thank you for your purchase! Here are your property report links:</p>
        <ul>
          ${links.map((url, index) => `
            <li>
              <a href="${url}" target="_blank">
                Property Report ${index + 1}
              </a>
            </li>
          `).join('')}
        </ul>
        <p><small>These links will expire in 7 days.</small></p>
      `,
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      files: paths.length,
      message: `Successfully generated ${paths.length} reports and sent to ${toEmail}`
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