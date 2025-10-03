/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session for credit purchase
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/supabaseServer';
import {
  CREDIT_PACKAGES,
  isValidPackageKey,
  deepLinkConfig,
} from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in first.' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();
    const { packageKey } = body;

    if (!packageKey || !isValidPackageKey(packageKey)) {
      return NextResponse.json(
        { error: 'Invalid package key' },
        { status: 400 }
      );
    }

    const creditPackage = CREDIT_PACKAGES[packageKey];

    // 3. Create credit_purchase entry (required for webhook to process)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: purchase, error: purchaseError } = await supabase
      .from('credit_purchase')
      .insert({
        user_id: user.id,
        email: user.email,
        package_id: packageKey,
        credits: creditPackage.credits,
        amount: creditPackage.price,
        status: 'pending',
        metadata: {
          source: 'web-credits-page',
          package_key: packageKey,
        }
      })
      .select()
      .single();

    if (purchaseError || !purchase) {
      console.error('Failed to create purchase record:', purchaseError);
      return NextResponse.json(
        { error: 'Failed to create purchase record', details: purchaseError?.message },
        { status: 500 }
      );
    }

    console.log(`Created purchase record ${purchase.id} for user ${user.id}`);

    // 4. Create Stripe Checkout Session
    const successUrl = `${deepLinkConfig.successScheme}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = deepLinkConfig.cancelScheme;

    // Create idempotency key (prevents duplicate sessions if user clicks multiple times)
    const idempotencyKey = `checkout-${user.id}-${packageKey}-${Date.now()}`;

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${creditPackage.credits} Credit${creditPackage.credits > 1 ? 's' : ''}`,
                description: `${creditPackage.credits} property report credit${creditPackage.credits > 1 ? 's' : ''}`,
              },
              unit_amount: Math.round(creditPackage.price * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: {
          purchase_id: purchase.id,
          user_id: user.id,
          packageKey: packageKey,
          credits: creditPackage.credits.toString(),
          source: 'web-credits-page',
        },
        allow_promotion_codes: true,
      },
      {
        idempotencyKey,
      }
    );

    // 5. Update purchase with Stripe session ID
    await supabase
      .from('credit_purchase')
      .update({ stripe_session_id: session.id })
      .eq('id', purchase.id);

    console.log(`Created checkout session ${session.id} for user ${user.id}, purchase ${purchase.id}`);

    // 6. Return session URL to client
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      purchaseId: purchase.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: errorMessage },
      { status: 500 }
    );
  }
}

// Disable body parsing for this route - we need raw body for Stripe
export const dynamic = 'force-dynamic';

