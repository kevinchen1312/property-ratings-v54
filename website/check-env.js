#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Run this script to verify your .env.local is set up correctly
 * 
 * Usage: node check-env.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  
  log('\n🔍 Checking environment setup...\n', 'blue');
  
  // Check if .env.local exists
  if (!fs.existsSync(envPath)) {
    log('❌ .env.local file not found!', 'red');
    log('\n📝 To fix this:', 'yellow');
    log('1. Copy .env.local.example to .env.local', 'yellow');
    log('2. Fill in your Supabase and Stripe credentials', 'yellow');
    log('\nExample:', 'yellow');
    log('  cp .env.local.example .env.local', 'yellow');
    process.exit(1);
  }
  
  log('✅ .env.local file found', 'green');
  
  // Read and parse .env.local
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key.trim()] = value.trim();
    }
  });
  
  // Required variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
  ];
  
  log('\n📋 Checking required variables:\n');
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    const isPresent = value && value !== '' && !value.startsWith('your-');
    
    if (isPresent) {
      const preview = value.substring(0, 20) + '...';
      log(`  ✅ ${varName}: ${preview}`, 'green');
    } else {
      log(`  ❌ ${varName}: Missing or placeholder value`, 'red');
      allPresent = false;
    }
  });
  
  // Optional but recommended
  const optionalVars = [
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ];
  
  log('\n📋 Optional variables:\n');
  
  optionalVars.forEach(varName => {
    const value = envVars[varName];
    const isPresent = value && value !== '' && !value.startsWith('your-');
    
    if (isPresent) {
      const preview = value.substring(0, 20) + '...';
      log(`  ✅ ${varName}: ${preview}`, 'green');
    } else {
      log(`  ⚠️  ${varName}: Not set (optional but recommended)`, 'yellow');
    }
  });
  
  // Final result
  log('\n' + '='.repeat(60) + '\n');
  
  if (allPresent) {
    log('✅ All required environment variables are set!', 'green');
    log('\n🚀 You can now run: npm run dev\n', 'blue');
  } else {
    log('❌ Some required environment variables are missing!', 'red');
    log('\n📝 To fix:', 'yellow');
    log('1. Open .env.local in your editor', 'yellow');
    log('2. Replace placeholder values with your actual credentials', 'yellow');
    log('3. Get credentials from:', 'yellow');
    log('   - Supabase: https://app.supabase.com → Project Settings → API', 'yellow');
    log('   - Stripe: https://dashboard.stripe.com → Developers → API keys', 'yellow');
    log('\n4. Run this script again to verify: node check-env.js\n', 'yellow');
    process.exit(1);
  }
}

// Run the check
try {
  checkEnvFile();
} catch (error) {
  log(`\n❌ Error: ${error.message}\n`, 'red');
  process.exit(1);
}

