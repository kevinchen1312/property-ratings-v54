# Troubleshooting Guide

## Issue: Login button doesn't work / Screen blinks and clears form

### Symptoms
- Click "Sign In" button
- Form fields clear
- Screen blinks
- No error message appears
- Nothing happens

### Common Causes

#### 1. Missing Environment Variables

**Solution:** Check that your `.env.local` file exists and contains all required variables.

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your actual Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

3. Restart the development server:
   ```bash
   npm run dev
   ```

**How to find your Supabase credentials:**
1. Go to your Supabase project dashboard
2. Click "Settings" → "API"
3. Copy the URL and keys from there

#### 2. Browser Console Errors

**Solution:** Check browser console for errors

1. Open browser DevTools (F12 or right-click → Inspect)
2. Go to Console tab
3. Try signing in again
4. Look for error messages (especially ones with ❌)

Common console errors:
- "Missing Supabase environment variables" → See solution #1 above
- "Invalid API key" → Your Supabase keys are incorrect
- "Network error" → Check internet connection or Supabase project status

#### 3. Cookie Issues

**Solution:** Clear browser cookies and cache

1. Open DevTools → Application tab (Chrome) or Storage tab (Firefox)
2. Clear all cookies for `localhost:3000` or your domain
3. Try signing in again

#### 4. Supabase Authentication Settings

**Solution:** Check Supabase Auth configuration

1. Go to Supabase dashboard → Authentication → Settings
2. Ensure "Enable email signups" is turned ON
3. Check "Site URL" matches your development URL (e.g., `http://localhost:3000`)
4. Add `http://localhost:3000/*` to "Redirect URLs" list

#### 5. Network Issues

**Solution:** Check network connectivity to Supabase

1. Open Network tab in DevTools
2. Try signing in
3. Look for failed requests to Supabase
4. Check if requests are blocked by firewall/VPN

## Debugging Steps

### Step 1: Enable Verbose Logging

The auth page now includes console logging. Watch the browser console for these messages:

- 🔐 Auth form submitted
- 🔑 Attempting sign in...
- ✅ Sign in successful
- 🔄 Session check attempts
- ✅ Session established
- ❌ Any errors will be logged with details

### Step 2: Verify Environment Variables

Create a test page to verify env vars are loaded:

```typescript
// Test in browser console:
console.log({
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});
```

### Step 3: Test Supabase Connection

Try this in browser console on the auth page:

```javascript
// This should return your Supabase client
console.log(supabase);
```

## Still Having Issues?

If none of these solutions work:

1. Check Supabase project status: https://status.supabase.com
2. Verify your Supabase project is not paused (free tier pauses after inactivity)
3. Try creating a new user account instead of signing in
4. Check for any AdBlockers or security extensions blocking requests
5. Try in a different browser or incognito mode

## Getting Help

When reporting issues, please include:
- Browser console logs (especially ❌ errors)
- Network tab showing failed requests
- Your Supabase project region
- Whether environment variables are set (don't share the actual values!)

