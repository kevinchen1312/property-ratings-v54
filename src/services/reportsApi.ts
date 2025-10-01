import { supabase } from "../lib/supabase";

// Replace with your actual Supabase project reference
const SUPABASE_REF = "oyphcjbickujybvbeame";

export async function grantTestCredits(amount: number) {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    
    if (!token) {
      throw new Error("Not authenticated");
    }

    console.log("Granting credits for user:", session.session?.user?.id);

      const res = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/devGrantCredits`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ amount }),
      });

      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));
      
      const result = await res.json();
      console.log("Grant credits response:", result);
      
      if (!res.ok) {
        throw new Error(`Edge Function failed: ${result.error || result.message || 'Unknown error'}`);
      }
    
    // Also check the database directly after granting
    const { data: directCheck, error: directError } = await supabase
      .from("user_credits")
      .select("*")
      .eq("user_id", session.session.user.id);
    
    console.log("Direct database check after granting:", directCheck);
    
    // Add visible debug info
    if (directError) {
      console.error("Database check error:", directError);
    }
    
    // Return both the Edge Function result and database check
    return {
      ...result,
      debug_user_id: session.session?.user?.id,
      debug_db_check: directCheck,
      debug_db_error: directError
    };
  } catch (error) {
    console.error("Grant credits error:", error);
    throw error;
  }
}

export async function redeemReports(propertyIds: string[], email?: string) {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    
    if (!token) {
      throw new Error("Not authenticated");
    }

    const userEmail = email || session.session?.user?.email;
    if (!userEmail) {
      throw new Error("No email address available");
    }

    // Check if user has enough credits
    const currentCredits = await getUserCredits();
    
    if (currentCredits < propertyIds.length) {
      throw new Error(`Insufficient credits. You have ${currentCredits}, need ${propertyIds.length}`);
    }
    
    // Call the redeemReports Edge Function which handles:
    // - Credit deduction
    // - Report generation
    // - Revenue sharing (10% to top contributor, 10% split among others)
    // - Email sending
    const reportRes = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/redeemReports`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        propertyIds: propertyIds,
        email: userEmail
      }),
    });

    if (!reportRes.ok) {
      const errorText = await reportRes.text();
      console.error('Report redemption error:', errorText);
      throw new Error(`Failed to redeem report: ${reportRes.status}`);
    }

    let reportResult;
    try {
      const reportText = await reportRes.text();
      reportResult = JSON.parse(reportText);
    } catch (parseError) {
      throw new Error("Invalid response from report redemption service");
    }
    
    if (!reportResult.ok) {
      throw new Error(reportResult.error || reportResult.message || "Failed to redeem report");
    }

    const result = {
      ok: true,
      message: reportResult.message || `Report generated successfully`,
      propertyId: propertyIds[0],
      files: reportResult.files || propertyIds.length,
      revenue_shared: reportResult.revenue_shared || false
    };
    
    console.log('✅ Report redeemed with revenue sharing:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Report redemption failed:', error);
    throw error;
  }
}

export async function getUserCredits() {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      console.log("No user session found");
      return 0;
    }

    console.log("Getting credits for user:", session.session.user.id);

    const { data, error } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", session.session.user.id)
      .maybeSingle(); // Use maybeSingle instead of single to handle no results

    if (error) {
      console.error("Get credits error:", error);
      return 0;
    }

    if (!data) {
      console.log("No credit record found for user, returning 0");
      return 0;
    }

    console.log("User credits:", data.credits);
    return data.credits || 0;
  } catch (error) {
    console.error("Get credits error:", error);
    return 0;
  }
}
