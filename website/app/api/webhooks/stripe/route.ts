/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events (checkout.session.completed)
 * This is the AUTHORITATIVE source of truth for credit fulfillment
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '@/lib/stripe';
import { addCreditsToUser } from '@/lib/supabaseServer';
import { isValidPackageKey, getCreditsForPackage } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body and signature
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // 2. Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`Received webhook event: ${event.type}, ID: ${event.id}`);

    // 3. Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Extract metadata
      const { user_id, packageKey } = session.metadata || {};

      if (!user_id || !packageKey) {
        console.error('Missing user_id or packageKey in session metadata:', session.id);
        return NextResponse.json(
          { error: 'Invalid session metadata' },
          { status: 400 }
        );
      }

      if (!isValidPackageKey(packageKey)) {
        console.error('Invalid packageKey in metadata:', packageKey);
        return NextResponse.json(
          { error: 'Invalid package key' },
          { status: 400 }
        );
      }

      // Get credit count for this package
      const creditCount = getCreditsForPackage(packageKey);

      console.log(`Processing credit purchase:`, {
        sessionId: session.id,
        userId: user_id,
        packageKey,
        credits: creditCount,
        paymentStatus: session.payment_status,
      });

      // Only process if payment was successful
      if (session.payment_status !== 'paid') {
        console.warn(`Session ${session.id} payment status is ${session.payment_status}, skipping fulfillment`);
        return NextResponse.json({ received: true, skipped: true });
      }

      // 4. Add credits to user (idempotent)
      const success = await addCreditsToUser(
        user_id,
        creditCount,
        session.id,
        packageKey
      );

      if (!success) {
        console.error(`Failed to add credits for session ${session.id}`);
        // Return 200 to acknowledge receipt, but log the error
        // Stripe will retry webhooks on non-200 responses
        return NextResponse.json(
          { received: true, processed: false },
          { status: 200 }
        );
      }

      console.log(`✅ Successfully processed credit purchase for user ${user_id}: +${creditCount} credits`);

      return NextResponse.json({
        received: true,
        processed: true,
        credits: creditCount,
      });
    }

    // Handle other event types (for logging/debugging)
    console.log(`Unhandled webhook event type: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return 500 so Stripe retries the webhook
    return NextResponse.json(
      { error: 'Webhook handler failed', details: errorMessage },
      { status: 500 }
    );
  }
}

// Configure route to accept raw body
export const dynamic = 'force-dynamic';

