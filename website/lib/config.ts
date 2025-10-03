/**
 * Application Configuration
 * Central place for all environment variables and app constants
 */

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
] as const;

// Check for missing env vars in production
if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

// Supabase Configuration
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

// Stripe Configuration
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
};

// Deep Link Configuration
export const deepLinkConfig = {
  // For development, use web page instead of deep link (Expo Go doesn't support custom schemes)
  successScheme: process.env.APP_SUCCESS_DEEPLINK_SCHEME || 'https://leadongs-credits.vercel.app/return',
  cancelScheme: process.env.APP_CANCEL_DEEPLINK_SCHEME || 'https://leadongs-credits.vercel.app/credits',
  siteUrl: process.env.SITE_URL || 'https://leadsong.com',
};

/**
 * Stripe Price IDs for credit packages
 * TODO: Replace these with your actual Stripe Price IDs from your Stripe Dashboard
 */
export const STRIPE_PRICE_IDS = {
  '1': process.env.STRIPE_PRICE_1_CREDIT || 'price_1CREDIT',
  '5': process.env.STRIPE_PRICE_5_CREDITS || 'price_5CREDITS',
  '10': process.env.STRIPE_PRICE_10_CREDITS || 'price_10CREDITS',
  '25': process.env.STRIPE_PRICE_25_CREDITS || 'price_25CREDITS',
} as const;

export type PackageKey = keyof typeof STRIPE_PRICE_IDS;

/**
 * Credit package definitions
 * Maps package keys to credit amounts and display information
 */
export const CREDIT_PACKAGES: Record<
  PackageKey,
  {
    credits: number;
    price: number;
    pricePerCredit: number;
    popular?: boolean;
    savings?: string;
  }
> = {
  '1': {
    credits: 1,
    price: 10.00,
    pricePerCredit: 10.00,
  },
  '5': {
    credits: 5,
    price: 45.00,
    pricePerCredit: 9.00,
    savings: '$5 off',
  },
  '10': {
    credits: 10,
    price: 80.00,
    pricePerCredit: 8.00,
    popular: true,
    savings: '$20 off',
  },
  '25': {
    credits: 25,
    price: 175.00,
    pricePerCredit: 7.00,
    savings: '$75 off',
  },
};

/**
 * Validate that a package key exists
 */
export function isValidPackageKey(key: string): key is PackageKey {
  return key in CREDIT_PACKAGES;
}

/**
 * Get credit count for a package key
 */
export function getCreditsForPackage(packageKey: PackageKey): number {
  return CREDIT_PACKAGES[packageKey].credits;
}

