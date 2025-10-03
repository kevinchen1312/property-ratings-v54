#!/usr/bin/env node

/**
 * Test webhook locally without going through Stripe Checkout
 * Usage: node scripts/test-webhook.js
 */

const crypto = require('crypto');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/stripe';

// Sample webhook event
const mockEvent = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2024-11-20.acacia',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_' + Date.now(),
      object: 'checkout.session',
      amount_total: 499,
      currency: 'usd',
      customer_email: 'test@example.com',
      payment_status: 'paid',
      metadata: {
        user_id: '00000000-0000-0000-0000-000000000000', // Replace with real user ID
        packageKey: '1',
        credits: '1',
      },
    },
  },
};

function generateSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function testWebhook() {
  if (!WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not found in .env.local');
    console.log('Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe');
    console.log('Then copy the webhook secret to .env.local');
    process.exit(1);
  }

  const payload = JSON.stringify(mockEvent);
  const signature = generateSignature(payload, WEBHOOK_SECRET);

  console.log('🧪 Testing webhook...');
  console.log('Event ID:', mockEvent.id);
  console.log('Session ID:', mockEvent.data.object.id);
  console.log('User ID:', mockEvent.data.object.metadata.user_id);
  console.log('Credits:', mockEvent.data.object.metadata.credits);
  console.log('');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: payload,
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Webhook processed successfully!');
      console.log('Response:', result);
    } else {
      console.log('❌ Webhook failed!');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
    console.log('\nIs the dev server running?');
    console.log('Run: npm run dev');
  }
}

testWebhook();

