-- Configure Supabase Email Redirect URLs for Deep Linking
-- You need to do this in the Supabase Dashboard, NOT run this SQL

/*
===========================================
SUPABASE DASHBOARD CONFIGURATION STEPS:
===========================================

1. Go to your Supabase Dashboard
2. Click "Authentication" in the left sidebar
3. Click "URL Configuration"
4. Add these redirect URLs:

REDIRECT URLs TO ADD:
- property-ratings://auth/callback
- exp://192.168.12.238:8088/--/auth/callback  (for development with Expo Go)
- exp://localhost:8088/--/auth/callback        (for local development)

5. Click "Save"

That's it! Email confirmation links will now open your app.

===========================================
EXPO GO DEEP LINK FORMAT:
===========================================

For development with Expo Go, the format is:
exp://YOUR_IP:8088/--/auth/callback

For production builds, it will be:
property-ratings://auth/callback

*/

-- If you want to test the trigger, run this:
SELECT 'Configuration must be done in Supabase Dashboard > Authentication > URL Configuration' as instruction;

