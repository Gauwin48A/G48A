$ErrorActionPreference = 'Continue'

Write-Host "=== MHub API Validation ===" -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint {
    param($Name, $Url, $Method = 'GET', $Body = $null)
    try {
        if ($Method -eq 'POST') {
            $resp = Invoke-WebRequest -Uri $Url -Method POST -Body $Body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 8
        } else {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
        }
        $preview = if ($resp.Content.Length -gt 200) { $resp.Content.Substring(0,200) + "..." } else { $resp.Content }
        Write-Host "  [OK $($resp.StatusCode)] $Name" -ForegroundColor Green
        Write-Host "    $preview" -ForegroundColor Gray
    } catch {
        $code = $null
        try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
        # Read response body from exception
        $errBody = ""
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errBody = $reader.ReadToEnd()
        } catch {}
        
        if ($code -ge 400 -and $code -lt 500) {
            Write-Host "  [$code] $Name" -ForegroundColor Yellow
            if ($errBody) { Write-Host "    $errBody" -ForegroundColor Gray }
        } else {
            Write-Host "  [ERR $code] $Name" -ForegroundColor Red
            Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
            if ($errBody) { Write-Host "    $errBody" -ForegroundColor Gray }
        }
    }
    Write-Host ""
}

$base = "http://localhost:5000"

Test-Endpoint -Name "Root /" -Url "$base/"
Test-Endpoint -Name "Health /health" -Url "$base/health"
Test-Endpoint -Name "Health /api/health" -Url "$base/api/health"
Test-Endpoint -Name "UPI Details" -Url "$base/api/payments/upi-details"
Test-Endpoint -Name "Inquiry Templates" -Url "$base/api/inquiries/templates"
Test-Endpoint -Name "Promo Validate" -Url "$base/api/payments/validate-promo" -Method "POST" -Body '{"code":"LAUNCH50","plan_type":"silver"}'
Test-Endpoint -Name "Reviews (public)" -Url "$base/api/reviews/user/00000000-0000-0000-0000-000000000000"
Test-Endpoint -Name "Complaints List" -Url "$base/api/complaints"
Test-Endpoint -Name "Offers List" -Url "$base/api/offers"
Test-Endpoint -Name "Referral Leaderboard" -Url "$base/api/referral/leaderboard"

Write-Host "=== Validation Complete ===" -ForegroundColor Cyan
