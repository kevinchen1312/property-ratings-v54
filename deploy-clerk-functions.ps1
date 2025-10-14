# Deploy Clerk Integration Edge Functions to Supabase
# This script deploys the necessary Supabase Edge Functions for Clerk integration

Write-Host "🚀 Deploying Clerk Integration Edge Functions" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Deploy sync-clerk-user function
Write-Host "📦 Deploying sync-clerk-user function..." -ForegroundColor Yellow
try {
    supabase functions deploy sync-clerk-user
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ sync-clerk-user deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy sync-clerk-user" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error deploying sync-clerk-user: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Deploy clerk-to-supabase-jwt function
Write-Host "📦 Deploying clerk-to-supabase-jwt function..." -ForegroundColor Yellow
try {
    supabase functions deploy clerk-to-supabase-jwt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ clerk-to-supabase-jwt deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy clerk-to-supabase-jwt" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error deploying clerk-to-supabase-jwt: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 All functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Don't forget to set your JWT secret:" -ForegroundColor Yellow
Write-Host "supabase secrets set SUPABASE_JWT_SECRET=your_jwt_secret_here" -ForegroundColor Cyan
Write-Host ""
Write-Host "Get your JWT secret from: Supabase Dashboard → Settings → API → JWT Secret" -ForegroundColor Gray
