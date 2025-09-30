# 🔌 Stripe Connect API Reference

Complete API documentation for the Stripe Connect integration in Leadsong Property Ratings.

---

## 📡 Edge Functions

### 1. createStripeConnectAccount

Manages Stripe Connect Express accounts for users.

**Endpoint:** `POST /functions/v1/createStripeConnectAccount`

**Authentication:** Required (Bearer token)

#### Actions

##### Create Account

Creates a new Stripe Connect Express account and returns onboarding URL.

```json
{
  "action": "create"
}
```

**Response:**
```json
{
  "success": true,
  "onboardingUrl": "https://connect.stripe.com/setup/...",
  "accountId": "acct_...",
  "message": "Real Stripe Connect account created!"
}
```

**Error Responses:**
- `401 Unauthorized` - No auth token or invalid token
- `500 Internal Server Error` - Account creation failed

##### Get Account Status

Retrieves current account status from Stripe and updates database.

```json
{
  "action": "get_status",
  "accountId": "acct_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "id": "acct_1234567890",
    "details_submitted": true,
    "charges_enabled": true,
    "payouts_enabled": true,
    "requirements": {
      "currently_due": [],
      "eventually_due": []
    }
  },
  "message": "Real account status retrieved"
}
```

##### Create Login Link

Generates a temporary login URL for the Stripe Express Dashboard.

```json
{
  "action": "create_login_link",
  "accountId": "acct_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "loginUrl": "https://connect.stripe.com/express/...",
  "message": "Real Stripe dashboard login link created"
}
```

---

### 2. stripeConnectWebhook

Receives and processes Stripe Connect webhook events to sync account status.

**Endpoint:** `POST /functions/v1/stripeConnectWebhook`

**Authentication:** Stripe signature verification (not Bearer token)

**Headers Required:**
- `stripe-signature` - Webhook signature from Stripe

#### Supported Events

| Event | Description | Action Taken |
|-------|-------------|--------------|
| `account.updated` | Account details changed | Sync status to database |
| `account.application.authorized` | App authorized | Log event |
| `account.application.deauthorized` | App deauthorized | Mark account inactive |
| `account.external_account.created` | Bank account added | Sync account status |
| `account.external_account.updated` | Bank account updated | Sync account status |
| `account.external_account.deleted` | Bank account removed | Sync account status |
| `capability.updated` | Account capabilities changed | Sync account status |

**Response:**
```json
{
  "received": true,
  "type": "account.updated"
}
```

**Error Responses:**
- `400 Bad Request` - Missing signature or invalid signature
- `500 Internal Server Error` - Processing error

---

### 3. processPayouts

Processes pending payouts for a user via Stripe Transfer.

**Endpoint:** `POST /functions/v1/processPayouts`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully processed 2 payouts totaling $5.00",
  "totalPayouts": 2,
  "successfulPayouts": 2,
  "failedPayouts": 0,
  "totalAmount": 5.00,
  "transferId": "tr_1234567890"
}
```

**Response (No Pending Payouts):**
```json
{
  "success": true,
  "message": "No pending payouts to process",
  "totalPayouts": 0,
  "successfulPayouts": 0,
  "failedPayouts": 0,
  "totalAmount": 0
}
```

**Error Responses:**

```json
// No Stripe account
{
  "success": false,
  "error": "NO_STRIPE_ACCOUNT",
  "message": "Please connect your bank account via Stripe Express first"
}
```

```json
// Payouts not enabled
{
  "success": false,
  "error": "PAYOUTS_NOT_ENABLED",
  "message": "Your Stripe account setup is incomplete. Please complete the onboarding process."
}
```

```json
// Minimum amount not met
{
  "success": false,
  "error": "MINIMUM_AMOUNT",
  "message": "Minimum payout amount is $1.00"
}
```

```json
// Stripe transfer failed
{
  "success": false,
  "error": "STRIPE_TRANSFER_FAILED",
  "message": "Stripe transfer failed: [error details]",
  "details": "card_error"
}
```

---

## 🗄️ Database Schema

### user_stripe_accounts

Stores Stripe Connect Express account information for users.

```sql
CREATE TABLE user_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'pending',
  details_submitted BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  country TEXT,
  currency TEXT DEFAULT 'usd',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**Fields:**
- `id` - Primary key
- `user_id` - Foreign key to `auth.users`
- `stripe_account_id` - Stripe Connect account ID (e.g., `acct_123`)
- `account_status` - One of: `pending`, `active`, `restricted`, `inactive`
- `details_submitted` - Whether user completed onboarding
- `charges_enabled` - Whether account can accept charges
- `payouts_enabled` - Whether account can receive payouts
- `country` - Account country code
- `currency` - Default currency (usually `usd`)
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

**RLS Policies:**
- Users can view their own accounts
- Users can insert their own accounts
- Users can update their own accounts

---

### contributor_payouts

Tracks individual payout records for contributors.

```sql
CREATE TABLE contributor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_distribution_id UUID NOT NULL REFERENCES revenue_distribution(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  payout_amount DECIMAL(10,2) NOT NULL,
  rating_count INTEGER NOT NULL,
  is_top_contributor BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending',
  payout_method TEXT,
  payout_reference TEXT,
  stripe_transfer_id TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  batch_id UUID REFERENCES payout_batches(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Status Values:**
- `pending` - Awaiting payout
- `processing` - Currently being processed
- `paid` - Successfully paid out
- `completed` - Alternative to `paid`
- `failed` - Payout failed
- `cancelled` - Payout cancelled

**Fields:**
- `payout_amount` - Amount to pay in USD
- `rating_count` - Number of ratings that earned this payout
- `is_top_contributor` - Whether this is a top contributor payout
- `status` - Current payout status
- `payout_method` - Payment method (e.g., `stripe_transfer`)
- `payout_reference` - External reference (error message for failed payouts)
- `stripe_transfer_id` - Stripe transfer ID
- `processed_at` - When payout was processed
- `failure_reason` - Reason for failure (if applicable)

---

### payout_batches

Tracks batch payout runs (for future batch processing).

```sql
CREATE TABLE payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_payouts INTEGER NOT NULL DEFAULT 0,
  successful_payouts INTEGER NOT NULL DEFAULT 0,
  failed_payouts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);
```

**Status Values:**
- `processing` - Batch in progress
- `completed` - Batch completed successfully
- `failed` - Batch failed

---

## 🔧 Database Functions

### get_user_stripe_connect_status

Returns user's Stripe Connect status.

```sql
SELECT * FROM get_user_stripe_connect_status(auth.uid());
```

**Returns:**
```
has_account        | boolean
account_status     | text
payouts_enabled    | boolean
stripe_account_id  | text
```

**Usage in frontend:**
```typescript
const { data, error } = await supabase.rpc('get_user_stripe_connect_status', {
  p_user_id: user.id
});
```

---

### get_pending_payouts_for_batch

Returns all pending payouts ready for batch processing (service role only).

```sql
SELECT * FROM get_pending_payouts_for_batch();
```

**Returns:**
```
payout_id          | uuid
user_id            | uuid
stripe_account_id  | text
payout_amount      | decimal(10,2)
user_email         | text
```

---

## 🎨 Frontend Service Functions

### stripeConnect.ts

TypeScript/JavaScript service for interacting with Stripe Connect.

#### getStripeConnectStatus()

Gets user's Stripe Connect account status.

```typescript
const status = await getStripeConnectStatus();
// Returns: { has_account, account_status, payouts_enabled, stripe_account_id }
```

#### createStripeConnectAccount()

Creates new Stripe Connect account.

```typescript
const { onboardingUrl, accountId } = await createStripeConnectAccount();
// Open onboardingUrl in browser
```

#### refreshStripeAccountStatus(accountId)

Refreshes account status from Stripe.

```typescript
const account = await refreshStripeAccountStatus('acct_123');
```

#### createStripeLoginLink(accountId)

Creates login link for Express Dashboard.

```typescript
const loginUrl = await createStripeLoginLink('acct_123');
// Open loginUrl in browser
```

#### requestPayout()

Requests payout for pending earnings.

```typescript
const result = await requestPayout();
// Returns: { success, message }
```

#### getUserStripeAccount()

Gets user's Stripe account details from database.

```typescript
const account = await getUserStripeAccount();
// Returns: StripeConnectAccount | null
```

#### getPayoutHistory()

Gets user's payout history.

```typescript
const history = await getPayoutHistory();
// Returns: Array of payout records
```

---

## 🔐 Security Considerations

### Authentication

All user-facing endpoints require authentication via Supabase JWT token:

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

### Row Level Security (RLS)

All tables have RLS enabled:

1. **user_stripe_accounts**: Users can only access their own accounts
2. **contributor_payouts**: Users can only see their own payouts
3. **payout_batches**: Only service role can access

### Webhook Security

Stripe webhooks are verified using signature:

```typescript
const event = await stripe.webhooks.constructEventAsync(
  body,
  signature,
  webhookSecret
);
```

Never trust webhook data without verification!

### PII Protection

**Critical**: Platform never handles sensitive data:
- ✅ Stripe handles all bank account information
- ✅ Stripe handles SSN/tax information
- ✅ Stripe handles identity verification
- ❌ Platform only stores account IDs and status

---

## 🧪 Testing

### Test Mode

Use Stripe test mode for development:

**Test Bank Account:**
- Routing: `110000000`
- Account: `000123456789`

**Test SSN:** `000-00-0000`

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

### Demo Accounts

Accounts starting with `acct_demo_` are simulated:
- No real Stripe API calls
- Instant "verification"
- Useful for UI development

---

## 📊 Common Queries

### Check User's Stripe Status

```sql
SELECT 
  u.email,
  usa.stripe_account_id,
  usa.account_status,
  usa.payouts_enabled,
  usa.details_submitted
FROM user_stripe_accounts usa
JOIN auth.users u ON usa.user_id = u.id
WHERE u.email = 'user@example.com';
```

### Check Pending Payouts

```sql
SELECT 
  u.email,
  cp.payout_amount,
  cp.rating_count,
  cp.is_top_contributor,
  cp.created_at
FROM contributor_payouts cp
JOIN auth.users u ON cp.user_id = u.id
WHERE cp.status = 'pending'
ORDER BY cp.created_at DESC;
```

### Check Failed Payouts

```sql
SELECT 
  u.email,
  cp.payout_amount,
  cp.payout_reference,
  cp.failure_reason,
  cp.updated_at
FROM contributor_payouts cp
JOIN auth.users u ON cp.user_id = u.id
WHERE cp.status = 'failed'
ORDER BY cp.updated_at DESC;
```

### Total Platform Revenue

```sql
SELECT 
  SUM(platform_share) as platform_revenue,
  SUM(top_contributor_share + other_contributors_share) as rater_payouts,
  COUNT(*) as total_sales
FROM revenue_distribution;
```

---

## 🔄 Account Status Flow

```
pending → active → (restricted) → inactive
  ↑                                    ↓
  └─────────── reactivation ───────────┘
```

**pending**: Account created, onboarding incomplete  
**active**: Fully verified, payouts enabled  
**restricted**: Issues detected, needs attention  
**inactive**: Deauthorized or closed  

---

## 💰 Payout Flow

1. **Earnings Created**: Revenue distribution creates pending payouts
2. **User Requests**: User clicks "Request Payout" in app
3. **Validation**: Check Stripe account status and minimum amount
4. **Transfer**: Create Stripe Transfer to Connect account
5. **Update Status**: Mark payouts as `paid` with transfer ID
6. **Bank Transfer**: Stripe transfers to user's bank (1-2 days)

---

## 🆘 Error Handling

### Common Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `NO_STRIPE_ACCOUNT` | User hasn't connected | Complete Stripe onboarding |
| `PAYOUTS_NOT_ENABLED` | Onboarding incomplete | Finish verification steps |
| `MINIMUM_AMOUNT` | Amount < $1.00 | Accumulate more earnings |
| `STRIPE_TRANSFER_FAILED` | Transfer failed | Check Stripe Dashboard logs |
| `INTERNAL_ERROR` | Server error | Check function logs |

### Debugging

Check logs:
```bash
# Function logs
npx supabase functions logs createStripeConnectAccount
npx supabase functions logs stripeConnectWebhook
npx supabase functions logs processPayouts

# Stripe Dashboard
# → Developers → Webhooks → [Your webhook] → Events
```

---

## 📚 References

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Stripe Transfers](https://stripe.com/docs/connect/charges-transfers)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

*Last updated: 2025*
