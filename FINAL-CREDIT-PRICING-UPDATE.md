# Final Credit Pricing & Payout System Update

## ✅ Complete System Update

### New Credit Packages (1, 10, 20, 50)

| Package | Credits | Price | Price/Credit | Savings |
|---------|---------|-------|--------------|---------|
| Starter | **1** | $5.00 | $5.00 | - |
| Value | **10** | $45.00 | $4.50 | $5 off |
| Pro | **20** | $80.00 | $4.00 | $20 off |
| Enterprise | **50** | $175.00 | $3.50 | $75 off |

### Report Costs (Based on Rating Count)

| Ratings | Credits | Cost |
|---------|---------|------|
| < 100 | 1 | $5 |
| 100-999 | 2 | $10 |
| 1000+ | 4 | $20 |

## Updated Files

### ✅ Mobile App (React Native)
1. **src/services/creditPurchase.ts**
   - Changed packages: 1, 10, 20, 50 credits
   - Prices: $5, $45, $80, $175

2. **src/screens/BuyCreditsScreen.tsx**
   - Simplified explanation: "Property reports cost 1-4 credits based on the amount of ratings"

3. **src/components/CreditPurchaseModal.tsx**
   - Simplified explanation: "Property reports cost 1-4 credits based on the amount of ratings"

### ✅ Website (Next.js)
1. **website/lib/config.ts**
   - Updated STRIPE_PRICE_IDS: 1, 10, 20, 50
   - Updated CREDIT_PACKAGES: same pricing as mobile

### ✅ Backend (Supabase Edge Functions)
1. **supabase/functions/createCreditCheckout/index.ts**
   - Updated packages: 1, 10, 20, 50 credits
   - Prices: $5, $45, $80, $175

2. **supabase/functions/redeemReports/index.ts**
   - Dynamic credit calculation (1-4 credits based on submission count)
   - Revenue sharing: 50% gold, 20% silver, 10% bronze, 20% platform

3. **supabase/functions/stripeWebhook/index.ts**
   - Updated revenue distribution model

### ✅ Database
1. **update-contributor-ranking-system.sql**
   - New function: `get_top_contributors()` (returns top 3)
   - New function: `calculate_credits_required()` (calculates credits)
   - Updated schemas: revenue-sharing-schema.sql, revenue-sharing-schema-safe.sql, revenue-sharing-schema-ultra-safe.sql

## User-Facing Changes

### Mobile App "Buy Credits" Screen
```
Credit system explained
• Property reports cost 1-4 credits based on the amount of ratings
• Credits never expire
• Secure payment via Stripe on leadsong.com
• After paying, close the browser and return here
• Credits appear automatically within seconds
```

### Credit Purchase Modal
```
💡 How it works:
• Property reports cost 1-4 credits based on the amount of ratings
• Buy in bulk to save money
• Credits never expire
• Secure payment via Stripe
• Credits added automatically after payment
```

## What Users See

### Credit Purchase Options:
- **1 credit** = $5.00
- **10 credits** = $45.00 (save $5) 🌟 MOST POPULAR
- **20 credits** = $80.00 (save $20)
- **50 credits** = $175.00 (save $75)

### When Redeeming Reports:
- Properties are charged **1-4 credits** based on how many ratings they have
- Exact cost is calculated automatically when you select a property

## Revenue Sharing

### New Contributor Payout Model:
- 🥇 **Gold (1st place):** 50% of report revenue
- 🥈 **Silver (2nd place):** 20% of report revenue
- 🥉 **Bronze (3rd place):** 10% of report revenue
- 🏢 **Platform:** 20% of report revenue
- **4th+ contributors:** 0%

### Examples:
**Small property (50 ratings) - 1 credit = $5:**
- Gold: $2.50
- Silver: $1.00
- Bronze: $0.50
- Platform: $1.00

**Medium property (500 ratings) - 2 credits = $10:**
- Gold: $5.00
- Silver: $2.00
- Bronze: $1.00
- Platform: $2.00

**Large property (1500 ratings) - 4 credits = $20:**
- Gold: $10.00
- Silver: $4.00
- Bronze: $2.00
- Platform: $4.00

## Deployment Commands

### 1. Deploy Database Functions
```bash
psql -h <project-ref>.supabase.co -U postgres -d postgres -f update-contributor-ranking-system.sql
```

### 2. Deploy Edge Functions
```bash
supabase functions deploy createCreditCheckout
supabase functions deploy redeemReports
supabase functions deploy stripeWebhook
```

### 3. Deploy Website
```bash
cd website
npm run build
vercel deploy --prod
```

### 4. Deploy Mobile App
```bash
# For OTA update:
eas update --branch production

# For full build:
eas build --platform all
```

## Benefits of New System

### For Users Buying Credits:
✅ Flexible packages (1, 10, 20, 50) fit different needs  
✅ Bulk discounts up to 30% off  
✅ Clear, simple pricing at $5 base per credit  

### For Users Redeeming Reports:
✅ Fair pricing - pay based on data volume  
✅ Small properties are affordable ($5)  
✅ Large properties reflect their value ($20)  

### For Contributors:
✅ Top contributor earns 50% (was 10%)  
✅ 2nd place earns 20% (was ~2-5%)  
✅ 3rd place earns 10% (was ~1-3%)  
✅ Clear incentive to be a top contributor  

### For Platform:
✅ Sustainable 20% revenue share  
✅ Fair pricing model  
✅ Encourages quality contributions  

---

## Summary

✅ **All files updated**  
✅ **Packages changed to 1, 10, 20, 50 credits**  
✅ **Pricing: $5, $45, $80, $175**  
✅ **Explanation simplified**  
✅ **Revenue sharing: 50/20/10/20**  
✅ **Ready to deploy**  

**Update Date:** October 6, 2025  
**Status:** 🚀 Complete - Ready to Deploy
