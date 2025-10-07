# Credit Package Pricing Update

## Summary
Updated all credit package pricing across mobile app, website, and backend to reflect the new $5 base credit value (down from $10).

## What Changed

### New Credit Package Prices

| Package | Credits | Old Price | New Price | Price/Credit | Savings |
|---------|---------|-----------|-----------|--------------|---------|
| Starter | 1 | $10.00 | **$5.00** | $5.00 | - |
| Value | 5 | $45.00 | **$22.50** | $4.50 | $2.50 |
| Pro | 10 | $80.00 | **$40.00** | $4.00 | $10.00 |
| Enterprise | 25 | $175.00 | **$87.50** | $3.50 | $37.50 |

### New Report Costs (Based on Submission Count)

| Property Size | Submissions | Credits Required | Cost |
|--------------|-------------|------------------|------|
| Small | < 100 | 1 credit | $5 |
| Medium | 100-999 | 2 credits | $10 |
| Large | 1000+ | 4 credits | $20 |

## Files Updated

### 1. Mobile App (React Native)
- ✅ `src/services/creditPurchase.ts` - Credit package definitions
- ✅ `src/screens/BuyCreditsScreen.tsx` - Updated explanation text
- ✅ `src/components/CreditPurchaseModal.tsx` - Updated explanation text

### 2. Website (Next.js)
- ✅ `website/lib/config.ts` - Credit package definitions
- ✅ `website/app/credits/page.tsx` - Already uses config (no changes needed)

### 3. Backend (Supabase Edge Functions)
- ✅ `supabase/functions/createCreditCheckout/index.ts` - Credit package pricing
- ✅ `supabase/functions/redeemReports/index.ts` - Already updated with tiered pricing

## User-Facing Changes

### Mobile App "Buy Credits" Screen
**Before:**
```
• Each property report costs 1 credit
• Credits never expire
• Secure payment via Stripe on leadsong.com
• After paying, close the browser and return here
• Credits appear automatically within seconds
```

**After:**
```
• Property reports cost 1-4 credits based on data size
• Small properties (<100 ratings): 1 credit ($5)
• Medium properties (100-999): 2 credits ($10)
• Large properties (1000+): 4 credits ($20)
• Credits never expire
• Secure payment via Stripe on leadsong.com
• Credits appear automatically within seconds
```

### Credit Purchase Modal
**Before:**
```
• Each property report costs 1 credit (normally $10)
• Buy in bulk to save money
• Credits never expire
• Secure payment via Stripe
• Credits added automatically after payment
```

**After:**
```
• Reports cost 1-4 credits based on data size
• Small (<100 ratings): 1 credit, Medium (100-999): 2 credits, Large (1000+): 4 credits
• Buy in bulk to save money
• Credits never expire
• Secure payment via Stripe
• Credits added automatically after payment
```

## Expected UI Changes

### Mobile App
When users open the "Buy Credits" screen, they will see:
- 1 credit = **$5** (was $10)
- 5 credits = **$22.50** (was $45)
- 10 credits = **$80** → **$40** (was $80)
- 25 credits = **$175** → **$87.50** (was $175)

### Website (credits.leadsong.com/credits)
When users visit the credit purchase page, they will see the same updated prices with discount badges:
- $5.00 per credit (1 credit)
- $4.50 per credit (5 credits) - **$2.50 off**
- $4.00 per credit (10 credits) - **$10 off** [MOST POPULAR]
- $3.50 per credit (25 credits) - **$37.50 off**

## Testing Checklist

### Mobile App
- [ ] Open "Buy Credits" screen
- [ ] Verify prices show: $5, $22.50, $40, $87.50
- [ ] Verify explanation text mentions 1-4 credits based on data size
- [ ] Click purchase button
- [ ] Verify Stripe checkout shows correct amount

### Website
- [ ] Navigate to credits.leadsong.com/credits
- [ ] Verify all 4 packages show new prices
- [ ] Verify discount badges are correct
- [ ] Click "Buy Now" on any package
- [ ] Verify Stripe checkout shows correct amount

### Backend
- [ ] Complete a test purchase of 1 credit
- [ ] Verify charged $5 (not $10)
- [ ] Verify 1 credit added to account
- [ ] Try redeeming a small property (<100 ratings)
- [ ] Verify deducts 1 credit
- [ ] Try redeeming a medium property (100-999 ratings)
- [ ] Verify deducts 2 credits
- [ ] Try redeeming a large property (1000+ ratings)
- [ ] Verify deducts 4 credits

## Deployment Steps

### 1. Deploy Backend
```bash
# Deploy updated Edge Function
supabase functions deploy createCreditCheckout
```

### 2. Deploy Website
```bash
cd website
npm run build
# Deploy to your hosting (Vercel, etc.)
```

### 3. Deploy Mobile App
```bash
# For Expo:
eas build --platform all

# Or update via OTA:
eas update --branch production
```

## Impact Analysis

### For Users Buying Credits
- **1 credit:** 50% cheaper ($5 vs $10) ✅ Great!
- **5 credits:** 50% cheaper ($22.50 vs $45) ✅ Great!
- **10 credits:** 50% cheaper ($40 vs $80) ✅ Great!
- **25 credits:** 50% cheaper ($87.50 vs $175) ✅ Great!

### For Users Redeeming Reports
- **Small properties (<100):** 50% cheaper ($5 vs $10) ✅ Great!
- **Medium properties (100-999):** Same price ($10) ⚖️ Neutral
- **Large properties (1000+):** 2x more expensive ($20 vs $10) ⚠️ More expensive

### Revenue Impact
Assuming 50/30/20 distribution of small/medium/large properties:
- **Before:** All reports = $10
- **After:** (50% × $5) + (30% × $10) + (20% × $20) = $2.50 + $3.00 + $4.00 = **$9.50**
- **Net change:** ~5% revenue decrease, but fairer pricing

## Rollback Plan

If issues arise, revert these changes:

1. Revert code changes:
```bash
git revert <commit-hash>
```

2. Redeploy all affected services

3. Old pricing will be restored immediately

## Notes

- ✅ All credit calculations are server-side, so no client updates required for pricing changes
- ✅ Existing users' credit balances are unaffected
- ✅ Bulk purchase discounts maintained (10-30% off)
- ✅ Backward compatible - old redemptions still work

---

**Update Date:** October 6, 2025  
**Status:** ✅ Complete - Ready to Deploy
