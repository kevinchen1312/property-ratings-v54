# 📧 Email Confirmation Deep Linking Setup

This guide will help you set up deep linking so email confirmation links open your app on mobile.

---

## ✅ Step 1: Configure Supabase Redirect URLs

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**

2. Add these redirect URLs (add ALL of them):

   **For Development (Expo Go):**
   ```
   exp://192.168.12.238:8088/--/auth/callback
   ```

   **For Production (when you build the app):**
   ```
   property-ratings://auth/callback
   ```

   **For Local Development:**
   ```
   exp://localhost:8088/--/auth/callback
   ```

3. Click **Save**

---

## ✅ Step 2: Configure Email Template (Optional but Recommended)

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**

2. Click **Confirm Signup**

3. Update the "Redirect URL" to use one of the above URLs (use the Expo Go one for development):
   ```
   {{ .ConfirmationURL }}
   ```
   *(This variable will automatically use the correct redirect URL)*

---

## ✅ Step 3: Test Email Confirmation

1. Reload your app (it should reload automatically)

2. Create a new account:
   - First Name: Test
   - Last Name: User  
   - Email: your.email@example.com
   - Password: (your password)

3. Check your email inbox

4. Click the confirmation link in the email

5. **The link should now open your app!** You'll see a screen saying "Confirming your email..."

6. After confirmation, you'll be taken to the map screen

---

## 🔍 Troubleshooting

### **Email link opens browser instead of app:**
- Make sure you added ALL the redirect URLs in Step 1
- Try closing and reopening your app
- Make sure you're clicking the link from the mobile device where the app is installed

### **"This site can't be reached" error:**
- This is normal! The link is actually working - it's just opening the app in the background
- Check your app - it should have opened automatically

### **Still getting localhost:3000:**
- Double-check that you saved the redirect URLs in Supabase
- Make sure the email template is using `{{ .ConfirmationURL }}`
- Wait a few minutes for Supabase to update its cache

---

## 📱 What Happens Now?

When users sign up:

1. ✉️ They receive a confirmation email
2. 📧 They click the link in the email
3. 📲 The link opens your app (not a browser!)
4. ✅ The app automatically confirms their email
5. 🗺️ They're redirected to the map screen

---

## 🚀 For Production (App Store / Google Play)

When you build your app for production, the deep link will be:
```
property-ratings://auth/callback
```

This will work automatically once your app is installed on users' devices!

---

## ✨ Done!

Your email confirmation is now mobile-friendly with deep linking! 🎉

