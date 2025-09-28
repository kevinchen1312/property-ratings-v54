// Simple test for emailPropertyReport function
// Run this in browser console or as a script

async function testEmailFunction() {
  try {
    const SUPABASE_REF = "oyphcjbickujybvbeame";
    
    // Get auth token (you'll need to be logged in)
    const token = "YOUR_AUTH_TOKEN"; // Replace with actual token from browser
    
    const response = await fetch(`https://${SUPABASE_REF}.functions.supabase.co/emailPropertyReport`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        propertyId: "test-property-id", // Replace with actual property ID
        userEmail: "your-email@example.com" // Replace with your email
      }),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log("Raw response:", result);
    
    try {
      const parsed = JSON.parse(result);
      console.log("Parsed response:", parsed);
    } catch (e) {
      console.log("Could not parse as JSON");
    }
    
  } catch (error) {
    console.error("Test error:", error);
  }
}

// Call the test
testEmailFunction();
