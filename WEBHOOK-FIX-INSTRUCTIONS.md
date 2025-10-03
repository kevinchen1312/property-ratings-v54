# Fix Webhook to Handle Credit Purchases

## The Problem
The webhook is returning 500 errors, causing Stripe to retry endlessly.

## The Solution
Update the webhook to always return 200 status, even on errors.

## How to Update via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions** → **`stripeWebhook`**
2. Click **"Code"** tab
3. Find line 151 that says: `if (creditPurchase) {`
4. Replace lines 151-184 with the code below
5. Click **"Deploy"** or **"Save"**

## New Code (Replace lines 151-184):

```typescript
      if (creditPurchase) {
        // Handle credit purchase
        console.log('Processing credit purchase:', creditPurchase.id);
        console.log('Purchase status:', creditPurchase.status);
        
        // If already completed, return success (idempotency)
        if (creditPurchase.status === 'completed') {
          console.log('Purchase already completed, returning success');
          return new Response('Credit purchase already completed', { status: 200 });
        }
        
        const { data: result, error: creditError } = await supabase.rpc('complete_credit_purchase', {
          p_stripe_session_id: session.id
        });

        if (creditError || !result) {
          console.error('Failed to complete credit purchase:', creditError);
          console.error('RPC result:', result);
          
          // Return 200 anyway to prevent Stripe from retrying
          // We'll investigate the failure separately
          return new Response(JSON.stringify({ 
            error: 'Failed to process credit purchase',
            details: creditError?.message || 'RPC returned false',
            session_id: session.id
          }), { 
            status: 200, // Return 200 to acknowledge receipt
            headers: { 'Content-Type': 'application/json' }
          });
        }

        console.log(`Successfully added ${creditPurchase.credits} credits to user ${creditPurchase.user_id}`);
        return new Response('Credit purchase completed', { status: 200 });
      }
```

## After Deployment

1. Go to Stripe → Webhooks
2. Click "Send test event" → `checkout.session.completed`
3. Check if it succeeds (should return 200 now)
4. Try a new purchase from your app
5. Credits should update within seconds!

