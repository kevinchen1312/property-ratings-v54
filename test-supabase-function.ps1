# Test Supabase Function Directly

# Replace these with your actual values
$SUPABASE_URL = "https://oyphcjbickujybvbeame.supabase.co"
$SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE"  # Get from Supabase Dashboard

# Test payload
$body = @{
    propertyIds = @("test-property-id")
    email = "test@example.com"
} | ConvertTo-Json

Write-Host "Testing Supabase function..." -ForegroundColor Cyan
Write-Host "URL: $SUPABASE_URL/functions/v1/redeemReports" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest `
        -Uri "$SUPABASE_URL/functions/v1/redeemReports" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $body `
        -UseBasicParsing
    
    Write-Host "`nSuccess! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "`nError! Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Error Message:" -ForegroundColor Red
    $_.Exception.Message
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nResponse Body:" -ForegroundColor Yellow
        $responseBody
    }
}


