# Credit Pricing and Payout System Update Summary

## Overview
This document summarizes the major updates to the credit pricing and contributor payout systems implemented on October 6, 2025.

## Credit Pricing System Changes

### Old System
- Fixed pricing: 1 credit per report ($10)
- All reports cost the same regardless of data volume

### New System
Reports are now priced based on the number of submissions (ratings) for that property:

| Submission Count | Credits Required | Price |
|-----------------|------------------|-------|
| < 100 submissions | 1 credit | $5 |
| 100-999 submissions | 2 credits | $10 |
| 1000+ submissions | 4 credits | $20 |

### Implementation Details
- Base credit value: $5 (REVENUE_PER_CREDIT_BASE)
- Dynamic credit calculation based on submission count
- Credits are calculated per property when redeeming reports
- Users are charged the total credits required for all properties in their request

## Contributor Payout System Changes

### Old System
- Platform: 80%
- Top contributor (gold): 10%
- Other contributors: 10% (split proportionally among all remaining contributors)

### New System
Revenue is distributed to the **top 3 contributors only**:

| Rank | Badge | Share of Revenue | Example ($20 report) |
|------|-------|------------------|---------------------|
| 1st (Gold) | 🥇 | 50% | $10.00 |
| 2nd (Silver) | 🥈 | 20% | $4.00 |
| 3rd (Bronze) | 🥉 | 10% | $2.00 |
| Platform | - | 20% | $4.00 |

### Key Changes
- **Only top 3 contributors** receive payouts (gold, silver, bronze)
- Contributors ranked 4th and below receive no payout
- Much higher rewards for top contributors (gold gets 50% vs old 10%)
- Incentivizes quality contributions and competition

## Examples

### Example 1: Small Property (75 submissions)
- **Credits required:** 1 credit
- **Price:** $5
- **Gold contributor (40 submissions):** $2.50 (50%)
- **Silver contributor (20 submissions):** $1.00 (20%)
- **Bronze contributor (10 submissions):** $0.50 (10%)
- **Platform:** $1.00 (20%)

### Example 2: Medium Property (500 submissions)
- **Credits required:** 2 credits
- **Price:** $10
- **Gold contributor (250 submissions):** $5.00 (50%)
- **Silver contributor (125 submissions):** $2.00 (20%)
- **Bronze contributor (75 submissions):** $1.00 (10%)
- **Platform:** $2.00 (20%)

### Example 3: Large Property (1500 submissions)
- **Credits required:** 4 credits
- **Price:** $20
- **Gold contributor (600 submissions):** $10.00 (50%)
- **Silver contributor (350 submissions):** $4.00 (20%)
- **Bronze contributor (200 submissions):** $2.00 (10%)
- **Platform:** $4.00 (20%)

## Files Modified

### Database Functions
1. **update-contributor-ranking-system.sql** (NEW)
   - `get_top_contributors()` - Returns top 3 contributors with rank
   - `calculate_credits_required()` - Calculates credits based on submission count
   - `get_top_contributor()` - Kept for backward compatibility

2. **revenue-sharing-schema.sql** (UPDATED)
3. **revenue-sharing-schema-safe.sql** (UPDATED)
4. **revenue-sharing-schema-ultra-safe.sql** (UPDATED)

### Supabase Edge Functions
1. **supabase/functions/redeemReports/index.ts**
   - Added `calculateCreditsRequired()` function
   - Added `calculateRevenue()` function
   - Updated `processRevenueSharing()` to distribute to top 3 contributors
   - Modified main handler to calculate credits dynamically per property
   - Updated revenue distribution: 50% gold, 20% silver, 10% bronze, 20% platform

2. **supabase/functions/stripeWebhook/index.ts**
   - Updated revenue sharing logic to use `get_top_contributors()`
   - Changed distribution to 50/20/10/20 model
   - Added gold/silver/bronze contributor tracking

### React Native Services
1. **src/services/revenueSharing.ts**
   - Updated `calculateRevenueDistribution()` to use new percentages
   - Updated `calculateContributorPayouts()` to handle top 3 contributors
   - Removed proportional distribution for other contributors
   - Now uses `get_top_contributors()` function

## Database Changes Required

To deploy these changes, run one of the following SQL scripts on your Supabase database:

```bash
# Option 1: New dedicated script (recommended)
psql -f update-contributor-ranking-system.sql

# Option 2: Updated schema files
psql -f revenue-sharing-schema-ultra-safe.sql
```

## Backward Compatibility

- The old `get_top_contributor()` function is maintained for backward compatibility
- It now uses a 1-year lookback instead of 30 days (to match new system)
- Existing code that calls this function will continue to work

## Testing Recommendations

1. **Test Credit Calculation:**
   - Create properties with <100, 100-999, and 1000+ submissions
   - Verify correct credit amounts are charged
   - Check that insufficient credits are properly handled

2. **Test Payout Distribution:**
   - Verify gold contributor receives 50%
   - Verify silver contributor receives 20%
   - Verify bronze contributor receives 10%
   - Verify 4th+ ranked contributors receive nothing
   - Check edge cases (properties with 1, 2, or 3 contributors)

3. **Test Database Functions:**
   ```sql
   -- Test get_top_contributors
   SELECT * FROM get_top_contributors('property-uuid-here');
   
   -- Test calculate_credits_required
   SELECT calculate_credits_required('property-uuid-here');
   ```

## Migration Notes

- No data migration required
- Changes are forward-compatible
- Old redemptions/payouts remain unchanged
- New pricing applies to all future redemptions automatically

## Impact on Users

### For Report Buyers
- Small properties (< 100 ratings): **50% cheaper** ($5 vs $10)
- Medium properties (100-999 ratings): **Same price** ($10)
- Large properties (1000+ ratings): **100% more expensive** ($20 vs $10)

### For Contributors
- Top contributor: **5x more earnings** (50% vs 10%)
- 2nd contributor: **2x more earnings** (20% vs ~2-5%)
- 3rd contributor: **Similar or better** (10% vs ~1-3%)
- 4th+ contributors: **No earnings** (0% vs ~1%)

## Benefits

1. **Fair Pricing:** Properties with more data cost more
2. **Incentivizes Quality:** Top contributors earn significantly more
3. **Competitive:** Creates competition among contributors for top spots
4. **Sustainable:** Platform maintains 20% revenue share
5. **Simple:** Clear, transparent reward structure

## Questions & Support

For questions about this update, please contact the development team or refer to the implementation files listed above.

---

**Update Date:** October 6, 2025  
**Updated By:** AI Assistant  
**Status:** ✅ Complete and Ready to Deploy
