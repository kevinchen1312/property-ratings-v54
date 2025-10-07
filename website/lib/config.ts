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
  successScheme: process.env.APP_SUCCESS_DEEPLINK_SCHEME || 'https://credits.leadsong.com/return',
  cancelScheme: process.env.APP_CANCEL_DEEPLINK_SCHEME || 'https://credits.leadsong.com',
  siteUrl: process.env.SITE_URL || 'https://credits.leadsong.com',
};

/**
 * Stripe Price IDs for credit packages
 * TODO: Replace these with your actual Stripe Price IDs from your Stripe Dashboard
 */
export const STRIPE_PRICE_IDS = {
  '1': process.env.STRIPE_PRICE_1_CREDIT || 'price_1CREDIT',
  '10': process.env.STRIPE_PRICE_10_CREDITS || 'price_10CREDITS',
  '20': process.env.STRIPE_PRICE_20_CREDITS || 'price_20CREDITS',
  '50': process.env.STRIPE_PRICE_50_CREDITS || 'price_50CREDITS',
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
    price: 5.00,
    pricePerCredit: 5.00,
  },
  '10': {
    credits: 10,
    price: 45.00,
    pricePerCredit: 4.50,
    popular: true,
    savings: '$5 off',
  },
  '20': {
    credits: 20,
    price: 80.00,
    pricePerCredit: 4.00,
    savings: '$20 off',
  },
  '50': {
    credits: 50,
    price: 175.00,
    pricePerCredit: 3.50,
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

