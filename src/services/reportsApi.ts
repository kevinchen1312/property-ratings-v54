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
    
    const reportRes = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/generatePropertyReport`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        propertyId: propertyIds[0]
      }),
    });

    let reportResult;
    try {
      const reportText = await reportRes.text();
      reportResult = JSON.parse(reportText);
    } catch (parseError) {
      throw new Error("Invalid response from report generation service");
    }
    
    if (!reportResult.success) {
      throw new Error(reportResult.error || "Failed to generate report");
    }

    // Deduct credits after successful report generation
    const { data: deductSuccess, error: deductError } = await supabase.rpc('debit_credits', {
      p_user: session.session.user.id,
      p_amount: propertyIds.length
    });

    if (deductError) {
      throw new Error(`Failed to deduct credits: ${deductError.message}`);
    }

    if (!deductSuccess) {
      throw new Error("Insufficient credits or credit deduction failed");
    }

    // Send email with report link

    const emailRes = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/emailPropertyReport`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        propertyId: propertyIds[0],
        userEmail: userEmail
      }),
    });

    let emailResult;
    try {
      const emailText = await emailRes.text();
      emailResult = JSON.parse(emailText);
    } catch (emailError) {
      emailResult = { success: false, error: "Email parsing failed" };
    }

    const result = {
      ok: true,
      message: `Report generated successfully`,
      propertyId: propertyIds[0],
      reportUrl: reportResult.reportUrl,
      emailSent: emailResult.success,
      files: 1
    };
    
    return result;
  } catch (error) {
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
