# Simple Testing Steps - Do This First!

**These are the EXACT steps to test your website.** Follow them in order.

---

## ✅ Before You Start - Check These Things

Open a text editor and make this checklist:

- [ ] I installed Node.js (`node --version` shows a number)
- [ ] I have a Supabase account
- [ ] I have a Stripe account (in Test mode)
- [ ] I filled in `.env.local` with my keys
- [ ] I ran the database migration in Supabase

If ANY of these are not checked, go to **BEGINNER-GUIDE.md** first.

---

## Step 1: Open TWO Terminal Windows

You need 2 terminal windows open at the same time.

**Windows Users:**
1. Press `Windows key + R`
2. Type `cmd` and press Enter
3. Do this TWICE to get 2 windows

**Mac Users:**
1. Press `Command + Space`
2. Type `terminal` and press Enter
3. Do this TWICE to get 2 windows

**Arrange them side by side** on your screen so you can see both.

---

## Step 2: Go to the Website Folder (BOTH terminals)

In **BOTH terminal windows**, type this (adjust path if needed):

```bash
cd C:\Users\ucric\leadsong v2.5\property-ratings-v54\website
```

Press Enter.

You should see:
```
C:\Users\ucric\leadsong v2.5\property-ratings-v54\website>
```

---

## Step 3: Terminal #1 - Start Stripe Listener

In the **FIRST terminal**, type:

```bash
stripe login
```

- Press Enter
- Your browser opens
- Click "Allow access"
- Go back to terminal

Now type:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**You should see:**
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef
```

**IMPORTANT:**
1. **Copy that `whsec_xxxxx` part** (the whole thing after "is ")
2. **Open** `.env.local` file
3. **Find the line:** `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
4. **Replace** `whsec_xxxxx` with what you just copied
5. **Save** the file

**Leave this terminal running!** Don't close it or type anything else.

---

## Step 4: Terminal #2 - Start the Website

In the **SECOND terminal**, type:

```bash
npm run dev
```

**You should see:**
```
▲ Next.js 14.2.18
- Local:        http://localhost:3000
- Ready in 2.3s
```

**Leave this terminal running too!**

---

## Step 5: Create a Test User in Supabase

1. **Open your browser**
2. **Go to** [app.supabase.com](https://app.supabase.com)
3. **Click your project** (leadsong-credits or whatever you named it)
4. **Left sidebar → Click "Authentication"** (person icon)
5. **Click "Users" tab**
6. **Click "Add user" dropdown → "Create new user"**
7. **Fill in:**
   - Email: `test@example.com` (or your real email)
   - Password: `TestPassword123!`
   - **CHECK the box:** "Auto Confirm User" ✓
8. **Click "Create user"**

**Now copy the User ID:**
- You'll see your new user in the list
- The ID is a long text like `a1b2c3d4-e5f6-...`
- Click to select it and copy (Ctrl+C)

**Create a profile for this user:**
1. **Left sidebar → Click "SQL Editor"**
2. **Click "New query"**
3. **Paste this** (replace YOUR-USER-ID with what you copied):
   ```sql
   INSERT INTO profiles (id, credits)
   VALUES ('YOUR-USER-ID-HERE', 0);
   ```
4. **Click "Run"** (bottom right)
5. **Should say** "Success. 1 rows"

---

## Step 6: Sign In to Your Website

1. **Open your browser**
2. **Go to:** http://localhost:3000/auth
3. **You should see** a purple sign-in page
4. **Enter:**
   - Email: `test@example.com` (what you used above)
   - Password: `TestPassword123!` (what you used above)
5. **Click "Sign In"**
6. **You should be redirected to** `/credits` page

**If you get an error:**
- Check email/password are correct
- Check you checked "Auto Confirm User" in Supabase
- Check your `.env.local` has correct Supabase keys

---

## Step 7: Make a Test Purchase!

You should now see the Credits page with 4 packages.

1. **Your balance should show:** 0 credits
2. **Click "Buy Now"** on any package (try the $4.99 one)
3. **You'll be redirected** to Stripe's payment page
4. **Use this test card:**
   - Card number: `4242 4242 4242 4242`
   - Expiry: `12/30` (any future date)
   - CVC: `123` (any 3 digits)
   - Name: `Test User`
   - ZIP: `12345` (any 5 digits)
5. **Click "Pay"**

**What happens next:**
- Stripe processes the payment
- You're redirected to a success page
- In **Terminal #1** (Stripe listener), you'll see logs! 🎉
- The webhook processes automatically

---

## Step 8: Check It Worked!

**Check Terminal #1 (Stripe listener):**
You should see something like:
```
checkout.session.completed [evt_xxxxx]
Processing credit purchase...
Successfully added 1 credits to user xxx
```

**Check the Database:**
1. **Go to Supabase** in your browser
2. **Left sidebar → Click "Table Editor"**
3. **Click `credit_ledger` table**
4. **You should see a new row!**
   - `user_id`: Your user ID
   - `delta`: 1 (or whatever package you bought)
   - `source`: stripe
   - `stripe_session_id`: cs_test_xxxxx
5. **Click `profiles` table**
6. **Your credits should be updated!** (was 0, now 1)

**Check the Website:**
1. **Go back to** http://localhost:3000/credits
2. **Refresh the page** (F5)
3. **Your balance should show:** 1 credit (or whatever you bought)

---

## 🎉 Success!

If you got here, **IT WORKS!** You've successfully:
- ✅ Set up the website
- ✅ Connected to Stripe
- ✅ Made a test purchase
- ✅ Saw credits added to the database
- ✅ Verified it all works

---

## What's Next?

Now that it works locally, you can:

1. **Test with your mobile app** - See MOBILE-APP-INTEGRATION.md
2. **Deploy to production** - See DEPLOYMENT.md
3. **Switch to live mode** - Use real Stripe keys (real money!)

---

## Troubleshooting

### "Connection refused" when visiting localhost:3000
→ Terminal #2 not running. Go back to Step 4.

### Stripe payment page doesn't load
→ Check your Stripe keys in `.env.local`
→ Check you created products in Stripe Dashboard
→ Check the Price IDs in `.env.local` are correct

### Webhook doesn't fire
→ Terminal #1 not running. Go back to Step 3.
→ Check `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the terminal

### Credits don't update
→ Check Terminal #1 for errors
→ Check Supabase logs (Supabase Dashboard → Logs)
→ Check you ran the database migration

### Can't sign in
→ Check email/password are correct
→ Check user exists in Supabase → Authentication → Users
→ Check "Auto Confirm User" was checked
→ Check Supabase keys in `.env.local`

### "Invalid signature" error
→ Your webhook secret doesn't match
→ Go back to Step 3 and copy the correct `whsec_xxx` value

---

## Need More Help?

- **Full beginner guide:** BEGINNER-GUIDE.md
- **Detailed docs:** README.md
- **Quick reference:** docs/QUICK-REFERENCE.md
- **Email:** support@leadsong.com

**Remember:** This is complex stuff! It's okay if it takes a few tries. You're doing great! 🌟

