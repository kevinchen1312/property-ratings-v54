/**
 * Stripe Server-Side Utilities
 * DO NOT import this file in client components
 */

import Stripe from 'stripe';
import { stripeConfig } from './config';

if (!stripeConfig.secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

/**
 * Stripe client instance (server-side only)
 */
export const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

/**
 * Verify Stripe webhook signature
 * @param payload - Raw request body
 * @param signature - Stripe signature header
 * @returns Parsed Stripe event
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!stripeConfig.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeConfig.webhookSecret
    );
  } catch (err) {
    const error = err as Error;
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

