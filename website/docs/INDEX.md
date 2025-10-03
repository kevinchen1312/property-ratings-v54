# Documentation Index

Welcome to the Leadsong Credits Purchase System documentation! This guide will help you navigate all available documentation.

## 🚀 Getting Started

Start here if you're setting up for the first time:

1. **[QUICKSTART.md](../QUICKSTART.md)** ⚡ **START HERE**
   - 10-minute setup guide
   - Step-by-step instructions
   - Perfect for development

2. **[README.md](../README.md)** 📖
   - Complete documentation
   - All features explained
   - Testing strategies
   - Troubleshooting guide

## 📱 Mobile Integration

Setting up the mobile app?

3. **[MOBILE-APP-INTEGRATION.md](../MOBILE-APP-INTEGRATION.md)** 📱
   - React Native integration
   - Deep link setup
   - Auth flow
   - Complete code examples

## 🏗️ Understanding the System

Want to understand how it works?

4. **[ARCHITECTURE.md](../ARCHITECTURE.md)** 🏗️
   - System architecture diagrams
   - Data flow visualization
   - Security layers
   - Technology choices

5. **[PROJECT-SUMMARY.md](../PROJECT-SUMMARY.md)** 📊
   - Feature overview
   - File structure
   - Key concepts
   - Quick reference

## 🚢 Deployment

Ready to go to production?

6. **[DEPLOYMENT.md](../DEPLOYMENT.md)** 🚀
   - Vercel deployment steps
   - Environment variables setup
   - Stripe webhook configuration
   - Production checklist

## 📚 Reference Materials

### Configuration

- **Environment Variables** - See `.env.example`
- **Stripe Price IDs** - `lib/config.ts`
- **Database Schema** - `migrations/001_credit_system.sql`

### Code Reference

- **API Routes**
  - `app/api/checkout/route.ts` - Create checkout session
  - `app/api/webhooks/stripe/route.ts` - Handle webhooks
  - `app/api/me/credits/route.ts` - Get user balance

- **Pages**
  - `app/credits/page.tsx` - Main purchase page
  - `app/return/page.tsx` - Deep link fallback

- **Utilities**
  - `lib/stripe.ts` - Stripe client
  - `lib/supabaseServer.ts` - Supabase utilities
  - `lib/config.ts` - Configuration

## 🧪 Testing

- **Manual Testing** - See README.md § Testing
- **Test Webhook Script** - `scripts/test-webhook.js`
- **Unit Tests** - `__tests__/webhook.test.ts`

## 🔍 Common Tasks

### I want to...

#### ...get this running locally
→ **[QUICKSTART.md](../QUICKSTART.md)**

#### ...understand how webhooks work
→ **[ARCHITECTURE.md](../ARCHITECTURE.md)** § Webhook Processing

#### ...integrate with my mobile app
→ **[MOBILE-APP-INTEGRATION.md](../MOBILE-APP-INTEGRATION.md)**

#### ...change credit prices
→ **[README.md](../README.md)** § Common Customizations

#### ...deploy to production
→ **[DEPLOYMENT.md](../DEPLOYMENT.md)**

#### ...debug webhook issues
→ **[README.md](../README.md)** § Debugging

#### ...set up universal links
→ **[MOBILE-APP-INTEGRATION.md](../MOBILE-APP-INTEGRATION.md)** § Universal Links

#### ...understand security
→ **[ARCHITECTURE.md](../ARCHITECTURE.md)** § Security Layers

## 📞 Getting Help

### Troubleshooting

Check these sections in order:

1. **README.md** § Debugging
2. **QUICKSTART.md** § Troubleshooting
3. **DEPLOYMENT.md** § Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Webhook not firing | See README.md § "Webhook not firing?" |
| Credits not updating | See README.md § "Credits not updating?" |
| Deep link not working | See MOBILE-APP-INTEGRATION.md § Troubleshooting |
| Auth issues | See README.md § "Auth issues?" |

### Support

- **Email**: support@leadsong.com
- **Stripe Dashboard**: [Webhook logs](https://dashboard.stripe.com/webhooks)
- **Supabase Dashboard**: Project logs

## 📋 Checklists

### Development Setup Checklist

- [ ] Read QUICKSTART.md
- [ ] Install dependencies
- [ ] Set up .env.local
- [ ] Run database migration
- [ ] Create Stripe products
- [ ] Start webhook listener
- [ ] Start dev server
- [ ] Test purchase flow

### Deployment Checklist

- [ ] Read DEPLOYMENT.md
- [ ] Deploy to Vercel
- [ ] Set environment variables
- [ ] Configure domain
- [ ] Create production webhook
- [ ] Run migration (production)
- [ ] Create Stripe products (live mode)
- [ ] Test with real payment
- [ ] Set up universal links
- [ ] Update mobile app

### Mobile Integration Checklist

- [ ] Read MOBILE-APP-INTEGRATION.md
- [ ] Configure deep link scheme
- [ ] Add deep link handler
- [ ] Test deep link manually
- [ ] Implement credits refresh
- [ ] Test full purchase flow
- [ ] Set up universal links (optional)
- [ ] Update app store listing

## 🗂️ File Organization

```
website/
├── docs/
│   └── INDEX.md (this file)
├── README.md (main documentation)
├── QUICKSTART.md (setup guide)
├── DEPLOYMENT.md (production guide)
├── MOBILE-APP-INTEGRATION.md (mobile guide)
├── ARCHITECTURE.md (system design)
├── PROJECT-SUMMARY.md (overview)
├── app/ (Next.js app)
├── components/ (React components)
├── lib/ (utilities)
├── migrations/ (database)
└── scripts/ (helper scripts)
```

## 🎯 Quick Commands

```bash
# Development
npm run dev                    # Start dev server
npm run stripe:listen          # Listen for webhooks
npm run test:webhook           # Test webhook handler

# Building
npm run build                  # Build for production
npm run start                  # Start production server

# Deployment
vercel                         # Deploy to Vercel
vercel --prod                  # Deploy to production
vercel logs production         # View production logs
```

## 📖 Reading Path

### For Developers (New to Project)

1. PROJECT-SUMMARY.md (5 min)
2. QUICKSTART.md (10 min)
3. ARCHITECTURE.md (20 min)
4. README.md (reference as needed)

### For DevOps / Deployment

1. PROJECT-SUMMARY.md (5 min)
2. DEPLOYMENT.md (15 min)
3. README.md § Security (10 min)

### For Mobile Developers

1. PROJECT-SUMMARY.md (5 min)
2. MOBILE-APP-INTEGRATION.md (20 min)
3. Test integration (30 min)

### For Product Managers

1. PROJECT-SUMMARY.md (5 min)
2. ARCHITECTURE.md § System Architecture (10 min)
3. README.md § Testing (10 min)

## 🔄 Updates

When updating the system:

1. Update relevant documentation
2. Update version in package.json
3. Add to CHANGELOG (if you create one)
4. Test all flows
5. Deploy

## 📝 Contributing

When adding new features:

1. Update relevant .md files
2. Add tests if applicable
3. Update this INDEX.md
4. Add examples to docs

---

**Last Updated**: October 2024  
**Version**: 1.0.0  
**Maintainer**: Leadsong Team

