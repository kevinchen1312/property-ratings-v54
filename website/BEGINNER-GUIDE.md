# Complete Beginner's Guide to Setting Up Leadsong Credits

**Welcome!** This guide assumes you've never built a website before. I'll walk you through everything step by step, explaining what each thing means and why we're doing it.

**Time needed:** About 1-2 hours (including account setup)

---

## 📋 What You're Building

You're setting up a website where users can buy credits using their credit card. When someone buys credits:
1. They pay on a secure Stripe payment page
2. The money goes to your Stripe account
3. Credits automatically appear in their app account
4. They return to your mobile app

Think of it like an online store, but just for credits.

---

## Part 1: Get the Required Accounts (30 minutes)

You need 3 free accounts. Let's set them up one by one.

### Step 1.1: Get a Supabase Account (10 min)

**What is Supabase?** It's a free database service. Think of it as an Excel spreadsheet in the cloud that stores user data.

1. **Go to** [supabase.com](https://supabase.com)
2. **Click** "Start your project" (green button, top right)
3. **Sign up** with your GitHub account (or create one first at github.com)
4. **Create a new project:**
   - Click "New project"
   - Name: `leadsong-credits` (or any name you want)
   - Database Password: Create a strong password (SAVE THIS!)
   - Region: Choose closest to you
   - Plan: Free (this is fine for starting)
   - Click "Create new project"
5. **Wait 2-3 minutes** for it to set up

**✅ Done!** Keep this tab open, you'll need it later.

---

### Step 1.2: Get a Stripe Account (10 min)

**What is Stripe?** It processes credit card payments securely. Like a cash register for your website.

1. **Go to** [stripe.com](https://stripe.com)
2. **Click** "Start now" or "Sign up"
3. **Fill in your details:**
   - Email
   - Password
   - Country
4. **Skip the business details for now** (you can fill them later)
5. **Important:** Make sure you're in **Test mode** (there's a toggle switch that says "Test mode" - it should be ON)
   - Test mode = fake money, safe for testing
   - Live mode = real money (we'll switch to this later)

**✅ Done!** Keep this tab open too.

---

### Step 1.3: Install Node.js (10 min)

**What is Node.js?** It's software that lets your computer run the website code.

1. **Go to** [nodejs.org](https://nodejs.org)
2. **Download** the version that says "LTS" (recommended)
   - Windows: Download the .msi file
   - Mac: Download the .pkg file
3. **Run the installer**
   - Click through the setup (all defaults are fine)
   - On Windows: Check "Automatically install necessary tools"
4. **Verify it worked:**
   - **Windows:** Press `Windows key + R`, type `cmd`, press Enter
   - **Mac:** Press `Command + Space`, type `terminal`, press Enter
   - Type: `node --version` and press Enter
   - You should see something like `v20.10.0` (the number might be different)
   - If you see "command not found", restart your computer and try again

**✅ Done!** Close the terminal/command prompt for now.

---

### Step 1.4: Install Stripe CLI (10 min)

**What is Stripe CLI?** It's a tool that lets Stripe talk to your local computer during testing.

**For Windows:**
1. **Go to** [github.com/stripe/stripe-cli/releases](https://github.com/stripe/stripe-cli/releases/latest)
2. **Download** `stripe_X.X.X_windows_x86_64.zip` (X.X.X is the version number)
3. **Extract the zip file** (right-click → Extract All)
4. **Move `stripe.exe` to** `C:\Windows\System32\`
   - You might need to click "Continue" to give permission
5. **Test it:**
   - Open Command Prompt (Windows key + R, type `cmd`)
   - Type: `stripe --version`
   - Should show a version number

**For Mac:**
1. **Open Terminal** (Command + Space, type "terminal")
2. **Install Homebrew first** (if you don't have it):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   - This takes 5-10 minutes
3. **Install Stripe CLI:**
   ```bash
   brew install stripe/stripe-cli/stripe
   ```
4. **Test it:**
   ```bash
   stripe --version
   ```

**If you get stuck:** That's okay! You can do this step later. Skip to Part 2 for now.

**✅ Done!** Keep the terminal/command prompt open.

---

## Part 2: Download and Set Up the Website Code (15 minutes)

### Step 2.1: Find the Code (2 min)

The code is already on your computer! It's in:
```
C:\Users\ucric\leadsong v2.5\property-ratings-v54\website\
```

**To find it easily:**
1. **Open File Explorer** (Windows key + E)
2. **Navigate to:** This PC → Users → ucric → leadsong v2.5 → property-ratings-v54 → website
3. You should see folders like `app`, `components`, `lib`, and files like `package.json`

**✅ Found it!**

---

### Step 2.2: Open the Folder in a Terminal (3 min)

**Windows:**
1. In File Explorer, with the `website` folder open
2. Click in the **address bar** (where it shows the path)
3. Type `cmd` and press Enter
4. A black window (Command Prompt) will open

**Mac:**
1. Open Terminal
2. Type `cd ` (that's cd + space)
3. Drag the `website` folder from Finder into the Terminal window
4. Press Enter

You should now see something like:
```
C:\Users\ucric\leadsong v2.5\property-ratings-v54\website>
```

**✅ Done!** Keep this window open.

---

### Step 2.3: Install Website Dependencies (10 min)

**What are dependencies?** They're pre-built pieces of code that your website needs to work. Like buying ingredients before cooking.

1. **In the terminal, type:**
   ```bash
   npm install
   ```
2. **Press Enter**
3. **Wait** - You'll see a lot of text scrolling by. This is normal!
4. **This takes 5-10 minutes** depending on your internet speed
5. **When done**, you'll see your prompt again (the `C:\...>` line)

**If you see warnings (yellow text):** That's okay, ignore them.

**If you see errors (red text):** 
- Make sure you're in the right folder (it should have `package.json`)
- Make sure Node.js is installed correctly (`node --version`)

**✅ Done!** Now you have all the code pieces needed.

---

## Part 3: Get Your Secret Keys (20 minutes)

These are like passwords that let your website talk to Supabase and Stripe.

### Step 3.1: Get Supabase Keys (5 min)

1. **Go back to your Supabase tab** in your browser
2. **On the left sidebar, click** "Project Settings" (gear icon at bottom)
3. **Click** "API" in the submenu
4. **You'll see two important things:**
   - **Project URL** - looks like `https://abcdefgh.supabase.co`
   - **anon public** key - long text starting with `eyJ...`
   - **service_role** key - another long text (click "Reveal" to see it)

5. **Copy these somewhere safe** - I recommend a text file on your desktop
   ```
   Supabase URL: https://abcdefgh.supabase.co
   Supabase Anon Key: eyJhbGc...
   Supabase Service Role Key: eyJhbGc...
   ```

**⚠️ IMPORTANT:** The service role key is very powerful - don't share it with anyone!

**✅ Done!** Keep this text file open.

---

### Step 3.2: Get Stripe Keys (5 min)

1. **Go back to your Stripe tab** in your browser
2. **Make sure** "Test mode" toggle is ON (top right)
3. **Click** "Developers" (top right)
4. **Click** "API keys" in the menu
5. **You'll see:**
   - **Publishable key** - starts with `pk_test_...`
   - **Secret key** - Click "Reveal test key", starts with `sk_test_...`

6. **Copy these to your text file:**
   ```
   Stripe Publishable Key: pk_test_...
   Stripe Secret Key: sk_test_...
   ```

**✅ Done!** Keep the text file open.

---

### Step 3.3: Create Stripe Products (10 min)

**What is a product?** It's what customers can buy. You need to create 4 products (1, 5, 10, and 25 credits).

1. **In Stripe**, click "Products" (top left menu)
2. **Click** "Add product" (blue button, top right)

**Create Product #1 - 1 Credit:**
1. Name: `1 Credit`
2. Description: `1 property report credit`
3. Click "Add pricing"
4. Price: `4.99`
5. Currency: `USD`
6. Billing: `One time`
7. Click "Save product"
8. **IMPORTANT:** Click on the price you just created
9. **Copy the Price ID** - it looks like `price_1AbC123XyZ...`
10. **Save to your text file:**
    ```
    1 Credit Price ID: price_1AbC...
    ```

**Repeat for the other 3 products:**
- **Product #2:** Name: `5 Credits`, Price: `19.99`
- **Product #3:** Name: `10 Credits`, Price: `34.99`
- **Product #4:** Name: `25 Credits`, Price: `74.99`

**Your text file should now have 4 price IDs:**
```
1 Credit Price ID: price_1AbC...
5 Credits Price ID: price_2DeF...
10 Credits Price ID: price_3GhI...
25 Credits Price ID: price_4JkL...
```

**✅ Done!** Now you have all your keys and price IDs.

---

## Part 4: Configure the Website (10 minutes)

Now we'll put all those keys into your website.

### Step 4.1: Create the Configuration File (2 min)

1. **Open File Explorer** to your website folder
2. **Find the file** `.env.example`
   - If you don't see files starting with a dot, click "View" at the top and check "Hidden items"
3. **Right-click** `.env.example` → "Open with" → "Notepad" (Windows) or "TextEdit" (Mac)
4. **Click** "File" → "Save As"
5. **Save it as** `.env.local` (notice the different name!)
   - Remove the `.example` part
   - Add `.local`
6. **Close the file**

**✅ Done!** Now you have a `.env.local` file.

---

### Step 4.2: Fill in Your Keys (8 min)

1. **Right-click** `.env.local` → "Open with" → "Notepad" or "TextEdit"
2. **You'll see lines like:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   ```

3. **Replace the example values** with your real ones from your text file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key...

# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_...your-secret-key...
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...your-publishable-key...

# Deep Link Configuration (leave as is for now)
APP_SUCCESS_DEEPLINK_SCHEME=leadsong://purchase/success
APP_CANCEL_DEEPLINK_SCHEME=leadsong://purchase/cancel
SITE_URL=http://localhost:3000

# Stripe Price IDs
STRIPE_PRICE_1_CREDIT=price_1AbC...your-1-credit-price-id...
STRIPE_PRICE_5_CREDITS=price_2DeF...your-5-credits-price-id...
STRIPE_PRICE_10_CREDITS=price_3GhI...your-10-credits-price-id...
STRIPE_PRICE_25_CREDITS=price_4JkL...your-25-credits-price-id...
```

**⚠️ IMPORTANT Tips:**
- Don't add quotes around values
- Don't add spaces around the `=` sign
- Leave `STRIPE_WEBHOOK_SECRET=whsec_xxxxx` as is for now (we'll fix it in Step 6)

4. **Save the file** (Ctrl+S or Cmd+S)
5. **Close it**

**✅ Done!** Your website is now configured.

---

## Part 5: Set Up the Database (10 minutes)

The database stores user credits and purchase history.

### Step 5.1: Run the Database Setup Script (5 min)

1. **Go to your Supabase tab** in your browser
2. **On the left sidebar, click** "SQL Editor" (icon looks like `</>`)
3. **Click** "New query" (button at top)
4. **Now open the file** `migrations/001_credit_system.sql` from your website folder:
   - Go to: `website\migrations\001_credit_system.sql`
   - Right-click → Open with Notepad
5. **Copy ALL the text** (Ctrl+A, then Ctrl+C)
6. **Go back to Supabase browser tab**
7. **Paste** into the big text box (Ctrl+V)
8. **Click** "Run" (button at bottom right)
9. **Wait** - should take 2-3 seconds
10. **You should see** green checkmarks and "Success"

**✅ Done!** Your database tables are created.

---

### Step 5.2: Verify It Worked (5 min)

1. **In Supabase, click** "Table Editor" (left sidebar, icon looks like a grid)
2. **You should see two new tables:**
   - `profiles` - stores user information
   - `credit_ledger` - stores credit transactions
3. **Click on** `credit_ledger`
4. **You should see columns** like: `id`, `user_id`, `delta`, `source`, etc.

**If you don't see these tables:**
- Go back to SQL Editor
- Check if there are any red error messages
- Try running the script again

**✅ Done!** Database is ready.

---

## Part 6: Test the Website Locally (30 minutes)

Now the exciting part - seeing it work!

### Step 6.1: Connect Stripe Webhook Listener (10 min)

**What is this?** When someone makes a payment, Stripe needs to tell your website. This tool makes that connection work on your computer.

1. **Open a NEW terminal/command prompt** (keep the old one)
   - **Windows:** Windows key + R, type `cmd`
   - **Mac:** Command + Space, type `terminal`

2. **Navigate to your website folder:**
   ```bash
   cd C:\Users\ucric\leadsong v2.5\property-ratings-v54\website
   ```

3. **Login to Stripe CLI:**
   ```bash
   stripe login
   ```
   - Press Enter
   - Your browser will open
   - Click "Allow access"
   - Go back to terminal

4. **Start the webhook listener:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

5. **IMPORTANT:** You'll see a line that says:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxx
   ```

6. **Copy that `whsec_xxxxxxxxxxxx` part**

7. **Go back to your `.env.local` file:**
   - Find the line: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
   - Replace `whsec_xxxxx` with the real secret you just copied
   - Save the file

**✅ Keep this terminal window open!** It needs to stay running.

---

### Step 6.2: Start the Website (5 min)

1. **Go back to your FIRST terminal** (the one you used for `npm install`)
2. **Type:**
   ```bash
   npm run dev
   ```
3. **Press Enter**
4. **Wait** - you'll see text appear, then:
   ```
   ▲ Next.js 14.x.x
   - Local:        http://localhost:3000
   - Ready in X.Xs
   ```

**✅ Website is running!**

---

### Step 6.3: Create a Test User (10 min)

You need a user account to test with.

1. **Go to Supabase** in your browser
2. **Click** "Authentication" (left sidebar, icon looks like a person)
3. **Click** "Users" tab
4. **Click** "Add user" (dropdown) → "Create new user"
5. **Fill in:**
   - Email: your-email@example.com (use a real email you can access)
   - Password: TestPassword123! (or any password you'll remember)
   - Auto Confirm User: **CHECK THIS BOX** ✓
6. **Click** "Create user"
7. **You'll see your new user** in the list
8. **Copy the User ID** (long text like `123e4567-e89b-12d3...`)

**Now create a profile for this user:**
1. **Click** "SQL Editor" (left sidebar)
2. **Click** "New query"
3. **Paste this** (replace YOUR-USER-ID with the ID you copied):
   ```sql
   INSERT INTO profiles (id, credits)
   VALUES ('YOUR-USER-ID-HERE', 0);
   ```
4. **Click** "Run"
5. **Should say** "Success. 1 rows"

**✅ Test user created!**

---

### Step 6.4: Test a Purchase! (5 min)

🎉 Time to see it work!

1. **Open your browser**
2. **Go to:** `http://localhost:3000/credits`
3. **You'll see** a purple page asking you to sign in

**Sign in:**
1. **Go to:** `http://localhost:3000/auth` (you might need to create this page - see note below)
2. **OR manually sign in** through Supabase:
   - Actually, let me give you an easier way...

**Easier way - Use Supabase test:**
1. **In your terminal** (stop the server first with Ctrl+C)
2. **Install Supabase Auth UI:**
   ```bash
   npm install @supabase/auth-ui-react @supabase/auth-ui-shared
   ```
3. **I'll create a sign-in page for you...**

Actually, let me create that auth page for you right now:

---

**✅ Almost there!** Let me create the auth page...

---

## Part 7: Troubleshooting Common Issues

### "Command not found" errors
- Make sure Node.js is installed
- Restart your terminal
- Restart your computer

### "Port already in use"
- Something else is using port 3000
- Stop it with: `npx kill-port 3000`
- Or change the port: `npm run dev -- -p 3001`

### Website won't load
- Make sure both terminals are running
- Check you're going to `localhost:3000` not just `localhost`
- Try `http://localhost:3000` (include the `http://`)

### Stripe webhook errors
- Make sure `.env.local` has the correct `STRIPE_WEBHOOK_SECRET`
- Make sure the stripe listener terminal is still running

### Database errors
- Check you ran the migration SQL in Supabase
- Check your Supabase keys are correct in `.env.local`

---

## Next Steps After Testing

Once you can successfully make a test purchase:

1. **Test the full flow** with your mobile app
2. **Deploy to production** (see DEPLOYMENT.md)
3. **Switch to Stripe live mode** (real money)
4. **Update your mobile app** to use the production URL

---

## Getting Help

**Stuck?** That's completely normal when you're new to this!

1. **Read the error message carefully** - it often tells you what's wrong
2. **Google the error** - usually others have had the same issue
3. **Check the documentation:**
   - QUICKSTART.md - for quick answers
   - README.md - for detailed info
   - MOBILE-APP-INTEGRATION.md - for mobile app help

4. **Ask for help:**
   - Email: support@leadsong.com
   - Include:
     - What step you're on
     - What you tried
     - The error message (copy/paste it)
     - Screenshots help!

---

**🎉 You're doing great!** This is a lot to learn, but take it one step at a time. Don't worry if it takes a few tries to get everything working - that's totally normal!

