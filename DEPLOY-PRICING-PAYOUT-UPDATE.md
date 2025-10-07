# Deployment Guide: Credit Pricing & Payout System Update

## Quick Deploy Steps

### Step 1: Deploy Database Functions
Run the new database functions on your Supabase database:

```bash
# Connect to your Supabase database and run:
psql -h <your-project-ref>.supabase.co -U postgres -d postgres -f update-contributor-ranking-system.sql

# OR use the Supabase SQL Editor:
# Copy and paste the contents of update-contributor-ranking-system.sql
```

**Important:** This adds the new `get_top_contributors()` function that returns top 3 contributors with rankings.

### Step 2: Deploy Supabase Edge Functions

Deploy the updated functions to Supabase:

```bash
# Deploy redeemReports function (handles dynamic credit pricing)
supabase functions deploy redeemReports

# Deploy stripeWebhook function (handles Stripe payments)
supabase functions deploy stripeWebhook
```

### Step 3: Test the Database Functions

Verify the functions work correctly:

```sql
-- Test 1: Check if get_top_contributors exists and works
SELECT * FROM get_top_contributors('your-test-property-uuid');
-- Expected: Returns top 3 contributors with rank (1, 2, 3)

-- Test 2: Check if calculate_credits_required exists and works
SELECT calculate_credits_required('your-test-property-uuid');
-- Expected: Returns 1, 2, or 4 based on submission count

-- Test 3: Verify get_top_contributor still works (backward compatibility)
SELECT * FROM get_top_contributor('your-test-property-uuid');
-- Expected: Returns top 1 contributor (gold)
```

### Step 4: Verify Credit Pricing

Test the new pricing tiers:

1. **Small Property Test (<100 submissions):**
   - Find a property with < 100 ratings
   - Attempt to redeem report
   - Should charge 1 credit ($5)

2. **Medium Property Test (100-999 submissions):**
   - Find a property with 100-999 ratings
   - Attempt to redeem report
   - Should charge 2 credits ($10)

3. **Large Property Test (1000+ submissions):**
   - Find a property with 1000+ ratings
   - Attempt to redeem report
   - Should charge 4 credits ($20)

### Step 5: Verify Payout Distribution

After a test redemption, check the database:

```sql
-- Check revenue distribution
SELECT 
  property_id,
  total_revenue,
  platform_share,
  top_contributor_share,
  other_contributors_share,
  top_contributor_id
FROM revenue_distribution
ORDER BY created_at DESC
LIMIT 5;

-- Check contributor payouts
SELECT 
  cp.user_id,
  cp.payout_amount,
  cp.rating_count,
  cp.is_top_contributor,
  cp.status
FROM contributor_payouts cp
JOIN revenue_distribution rd ON cp.revenue_distribution_id = rd.id
ORDER BY rd.created_at DESC, cp.payout_amount DESC
LIMIT 10;

-- Verify payout percentages
-- Gold should be ~50%, Silver ~20%, Bronze ~10%
```

## Rollback Plan

If you need to rollback to the old system:

### Option 1: Revert Database Functions

```sql
-- Restore old get_top_contributor (30-day lookback, returns 1)
CREATE OR REPLACE FUNCTION get_top_contributor(property_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    COUNT(*) as rating_count
  FROM rating r
  WHERE r.property_id = property_uuid
    AND r.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY r.user_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Remove new functions
DROP FUNCTION IF EXISTS get_top_contributors(UUID);
DROP FUNCTION IF EXISTS calculate_credits_required(UUID);
```

### Option 2: Revert Edge Functions

```bash
# Use git to checkout previous versions
git checkout <previous-commit-hash> supabase/functions/redeemReports/index.ts
git checkout <previous-commit-hash> supabase/functions/stripeWebhook/index.ts

# Redeploy
supabase functions deploy redeemReports
supabase functions deploy stripeWebhook
```

## Monitoring After Deployment

### Key Metrics to Watch

1. **Credit Usage Patterns:**
   ```sql
   -- Average credits per redemption
   SELECT AVG(credits_used) as avg_credits
   FROM report_redemption
   WHERE created_at >= NOW() - INTERVAL '7 days';
   
   -- Distribution of credit amounts
   SELECT 
     credits_used,
     COUNT(*) as redemptions,
     SUM(revenue_value) as total_revenue
   FROM report_redemption
   WHERE created_at >= NOW() - INTERVAL '7 days'
   GROUP BY credits_used;
   ```

2. **Payout Distribution:**
   ```sql
   -- Average payouts by rank
   SELECT 
     CASE 
       WHEN is_top_contributor THEN 'Gold (1st)'
       ELSE 'Silver/Bronze (2nd/3rd)'
     END as rank,
     AVG(payout_amount) as avg_payout,
     COUNT(*) as num_payouts
   FROM contributor_payouts
   WHERE created_at >= NOW() - INTERVAL '7 days'
   GROUP BY is_top_contributor;
   ```

3. **Revenue Impact:**
   ```sql
   -- Compare old vs new revenue per redemption
   SELECT 
     DATE(created_at) as date,
     COUNT(*) as redemptions,
     AVG(revenue_value) as avg_revenue,
     SUM(revenue_value) as total_revenue
   FROM report_redemption
   WHERE created_at >= NOW() - INTERVAL '14 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

## Common Issues & Solutions

### Issue 1: Function Not Found
**Error:** `function get_top_contributors(uuid) does not exist`

**Solution:**
```bash
# Redeploy the database schema
psql -f update-contributor-ranking-system.sql
```

### Issue 2: Wrong Credit Amount Charged
**Error:** User charged 1 credit for large property

**Solution:**
- Check if `calculate_credits_required()` function is deployed
- Verify submission count query is working
- Check Edge Function logs for errors

### Issue 3: Payouts Not Created
**Error:** No records in `contributor_payouts` table

**Solution:**
- Check Edge Function logs for errors
- Verify property has ratings with user_id set
- Ensure `get_top_contributors()` returns data

## Testing Checklist

- [ ] Database functions deployed successfully
- [ ] Edge functions deployed successfully
- [ ] `get_top_contributors()` returns top 3 with ranks
- [ ] `calculate_credits_required()` returns correct amounts
- [ ] Small property (<100) charges 1 credit
- [ ] Medium property (100-999) charges 2 credits
- [ ] Large property (1000+) charges 4 credits
- [ ] Gold contributor receives 50% payout
- [ ] Silver contributor receives 20% payout
- [ ] Bronze contributor receives 10% payout
- [ ] Platform receives 20%
- [ ] 4th+ ranked contributors receive no payout
- [ ] Revenue distribution records created correctly
- [ ] Contributor payout records created correctly

## Support

If you encounter any issues during deployment:

1. Check Supabase Edge Function logs
2. Check database function definitions
3. Verify test data exists (properties with various submission counts)
4. Review the error logs in the Supabase dashboard

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Status:** [ ] In Progress [ ] Completed [ ] Rolled Back
