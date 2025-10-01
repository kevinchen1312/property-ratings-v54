# 💰 Credit-Based Revenue Sharing Setup Guide

## Overview

This system automatically distributes revenue to property contributors when users redeem credits for property reports.

### Revenue Distribution Formula

When a user redeems 1 credit ($10 value) for a property report:
- **80%** ($8.00) goes to the platform
- **10%** ($1.00) goes to the **top contributor** (most ratings in past 30 days)
- **10%** ($1.00) is split **proportionally** among all other contributors (past 365 days)

### Example Calculation

If a property has contributors:
- User A: 50 ratings (TOP contributor in past 30 days) → gets **$1.00** (10% flat)
- User B: 45 ratings → gets **(45/115) × $1.00 = $0.39**
- User C: 40 ratings → gets **(40/115) × $1.00 = $0.35**
- User D: 30 ratings → gets **(30/115) × $1.00 = $0.26**

Total: $1.00 + ($0.39 + $0.35 + $0.26) = $2.00 to contributors, $8.00 to platform

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

Open your Supabase SQL Editor and run:

```bash
# File: credit-revenue-sharing-migration.sql
```

This will:
- ✅ Create `report_redemption` table
- ✅ Update `revenue_distribution` to support credit redemptions
- ✅ Add necessary indexes and constraints

### Step 2: Verify Database Schema

Run this query to verify the migration worked:

```sql
-- Check that tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('report_redemption', 'revenue_distribution', 'contributor_payouts', 'property_contributors');

-- Check that revenue_distribution has the redemption_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'revenue_distribution'
  AND column_name IN ('purchase_id', 'redemption_id');
```

Expected output:
- All 4 tables should exist
- Both `purchase_id` and `redemption_id` should be nullable

### Step 3: Deploy Updated Edge Function

Deploy the updated `redeemReports` function:

```bash
# Using Supabase CLI
supabase functions deploy redeemReports
```

Or copy the contents of `supabase/functions/redeemReports/index.ts` to your Supabase Edge Functions dashboard.

### Step 4: Test the System

1. **Buy credits** through your app (any package)
2. **Redeem a credit** for a property report that has multiple contributors
3. **Check the database** using the test query below

---

## 🧪 Testing & Verification

### Test Query: Check Revenue Distribution

```sql
-- View recent revenue distributions
SELECT 
  rd.id,
  rd.created_at,
  rd.property_id,
  p.name as property_name,
  rd.total_revenue,
  rd.platform_share,
  rd.top_contributor_share,
  rd.other_contributors_share,
  rd.top_contributor_id,
  rd.top_contributor_rating_count,
  CASE 
    WHEN rd.purchase_id IS NOT NULL THEN 'Direct Purchase'
    WHEN rd.redemption_id IS NOT NULL THEN 'Credit Redemption'
  END as revenue_source
FROM revenue_distribution rd
LEFT JOIN property p ON rd.property_id = p.id
ORDER BY rd.created_at DESC
LIMIT 10;
```

### Test Query: Check Contributor Payouts

```sql
-- View pending payouts for contributors
SELECT 
  cp.id,
  cp.created_at,
  cp.user_id,
  au.email as contributor_email,
  cp.payout_amount,
  cp.rating_count,
  cp.is_top_contributor,
  cp.status,
  rd.property_id,
  p.name as property_name
FROM contributor_payouts cp
JOIN revenue_distribution rd ON cp.revenue_distribution_id = rd.id
JOIN auth.users au ON cp.user_id = au.id
LEFT JOIN property p ON rd.property_id = p.id
WHERE cp.status = 'pending'
ORDER BY cp.created_at DESC;
```

### Test Query: Check Your Recent Redemption

```sql
-- Check your recent redemption (replace with your user_id)
SELECT 
  rr.id,
  rr.created_at,
  rr.property_id,
  p.name as property_name,
  rr.credits_used,
  rr.revenue_value,
  rd.id as revenue_distribution_id,
  (
    SELECT COUNT(*) 
    FROM contributor_payouts 
    WHERE revenue_distribution_id = rd.id
  ) as contributor_count,
  (
    SELECT SUM(payout_amount) 
    FROM contributor_payouts 
    WHERE revenue_distribution_id = rd.id
  ) as total_payout_amount
FROM report_redemption rr
LEFT JOIN revenue_distribution rd ON rd.redemption_id = rr.id
LEFT JOIN property p ON rr.property_id = p.id
WHERE rr.user_id = auth.uid()  -- Your user
ORDER BY rr.created_at DESC
LIMIT 5;
```

---

## 📊 How to View Your Earnings

If you're a contributor, you can see your pending payouts:

```sql
-- View your pending earnings
SELECT 
  cp.created_at,
  cp.payout_amount,
  cp.rating_count,
  cp.is_top_contributor,
  p.name as property_name,
  p.address as property_address
FROM contributor_payouts cp
JOIN revenue_distribution rd ON cp.revenue_distribution_id = rd.id
JOIN property p ON rd.property_id = p.id
WHERE cp.user_id = auth.uid()
  AND cp.status = 'pending'
ORDER BY cp.created_at DESC;
```

---

## 🔍 Monitoring & Logs

To check if revenue sharing is working:

1. **Supabase Dashboard → Functions → redeemReports → Logs**
2. Look for these log messages:
   - `💰 Processing revenue sharing for redemption...`
   - `👑 Top contributor: [user_id] with [count] ratings`
   - `📊 Revenue distribution created: [id]`
   - `✅ Created [N] contributor payout records`
   - Each payout with: `- [user_id]: $[amount] ([count] ratings)`

---

## ⚠️ Important Notes

1. **Revenue Value**: The system uses $10.00 per credit as the standard revenue value, regardless of the package price the user paid. This ensures fair and consistent revenue sharing.

2. **Top Contributor Window**: The "top contributor" is determined by the most ratings in the **past 30 days** for that property.

3. **Other Contributors Window**: Other contributors are counted from the **past 365 days** to be inclusive.

4. **Error Handling**: If revenue sharing fails, it won't prevent the user from getting their report. The error is logged for manual review.

5. **Payout Status**: Payouts are created with status `'pending'`. They need to be processed separately using your payout system (Stripe Connect).

---

## 🐛 Troubleshooting

### Problem: No revenue distribution records created

**Solution**: Check function logs for errors. Common issues:
- Database function `get_top_contributor` not found → Run `revenue-sharing-schema-ultra-safe.sql`
- Permission errors → Check RLS policies

### Problem: Contributor payouts show $0.00

**Solution**: The property might not have any ratings. Check:
```sql
SELECT COUNT(*) FROM rating WHERE property_id = '[your-property-id]';
```

### Problem: Only top contributor gets paid, others don't

**Solution**: Make sure there are other contributors (not just the top one):
```sql
SELECT user_id, COUNT(*) as rating_count
FROM rating
WHERE property_id = '[your-property-id]'
  AND created_at >= NOW() - INTERVAL '365 days'
GROUP BY user_id
ORDER BY rating_count DESC;
```

---

## 📞 Support

If you encounter issues:
1. Check Supabase function logs
2. Run the test queries above
3. Verify database migration completed
4. Check that you have ratings for the property you're testing with

---

## 🎉 Success!

Once deployed, every time a user redeems credits for a property report:
- ✅ Revenue is automatically distributed
- ✅ Contributors get pending payouts added to their balance
- ✅ You can track everything in the database
- ✅ The system logs all transactions for transparency

The revenue sharing happens **automatically** and **transparently** - no manual intervention needed!

