$ErrorActionPreference = 'Continue'

Write-Host "=== MHub API Validation ===" -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint {
    param($Name, $Url, $Method = 'GET', $Body = $null, $Headers = $null)
    try {
        $invokeParams = @{
            Uri = $Url
            UseBasicParsing = $true
            TimeoutSec = 8
            ErrorAction = 'Stop'
        }
        if ($Headers) {
            $invokeParams['Headers'] = $Headers
        }
        if ($Method -eq 'POST') {
            $invokeParams['Method'] = 'POST'
            $invokeParams['Body'] = $Body
            $invokeParams['ContentType'] = 'application/json'
        } else {
            $invokeParams['Method'] = 'GET'
        }
        $resp = Invoke-WebRequest @invokeParams
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

function Get-AuthHeader {
    param($BaseUrl)

    $email = if ($env:API_VALIDATOR_EMAIL) { $env:API_VALIDATOR_EMAIL } else { "api.validator@mhub.local" }
    $phone = if ($env:API_VALIDATOR_PHONE) { $env:API_VALIDATOR_PHONE } else { "9999999999" }
    $password = if ($env:API_VALIDATOR_PASSWORD) { $env:API_VALIDATOR_PASSWORD } else { "StrongPass123!A" }

    try {
        $loginBody = @{
            emailOrPhone = $email
            password = $password
        } | ConvertTo-Json -Compress

        $loginResp = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType 'application/json' -TimeoutSec 8
        if ($loginResp.token) {
            return @{ Authorization = "Bearer $($loginResp.token)" }
        }
    } catch {}

    $signupBody = @{
        fullName = "API Validator"
        email = $email
        phone = $phone
        password = $password
    } | ConvertTo-Json -Compress

    try {
        $signupResp = Invoke-RestMethod -Uri "$BaseUrl/api/auth/signup" -Method POST -Body $signupBody -ContentType 'application/json' -TimeoutSec 8
        if ($signupResp.token) {
            return @{ Authorization = "Bearer $($signupResp.token)" }
        }
    } catch {}

    try {
        $loginBody = @{
            emailOrPhone = $email
            password = $password
        } | ConvertTo-Json -Compress

        $loginResp = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType 'application/json' -TimeoutSec 8
        if ($loginResp.token) {
            return @{ Authorization = "Bearer $($loginResp.token)" }
        }
    } catch {}

    # Last-resort fallback: use one-time validator identity if stable account is unusable.
    try {
        $suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
        if ($suffix.Length -ge 9) {
            $fallbackEmail = "api.validator.$suffix@example.com"
            $fallbackPhone = "9" + $suffix.Substring($suffix.Length - 9)
            $fallbackBody = @{
                fullName = "API Validator"
                email = $fallbackEmail
                phone = $fallbackPhone
                password = $password
            } | ConvertTo-Json -Compress

            $fallbackSignup = Invoke-RestMethod -Uri "$BaseUrl/api/auth/signup" -Method POST -Body $fallbackBody -ContentType 'application/json' -TimeoutSec 8
            if ($fallbackSignup.token) {
                return @{ Authorization = "Bearer $($fallbackSignup.token)" }
            }
        }
    } catch {}

    return $null
}

function Resolve-ApiBaseUrl {
    param([string]$ExplicitBase)

    if ($ExplicitBase) {
        return $ExplicitBase.TrimEnd('/')
    }

    $candidates = @("http://localhost:5001", "http://localhost:5000")
    foreach ($candidate in $candidates) {
        try {
            Invoke-WebRequest -Uri "$candidate/health" -Method GET -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop | Out-Null
            return $candidate
        } catch {
            continue
        }
    }

    return "http://localhost:5001"
}

$base = Resolve-ApiBaseUrl -ExplicitBase $env:API_BASE_URL
$displayBase = $base.TrimEnd('/')
Write-Host "Target Base URL: $displayBase" -ForegroundColor DarkGray
Write-Host ""
$authHeader = Get-AuthHeader -BaseUrl $base

Test-Endpoint -Name "Root /" -Url "$base/"
Test-Endpoint -Name "Health /health" -Url "$base/health"
Test-Endpoint -Name "Health /api/health" -Url "$base/api/health"
Test-Endpoint -Name "UPI Details" -Url "$base/api/payments/upi-details"
if ($authHeader) {
    Test-Endpoint -Name "Inquiry Templates" -Url "$base/api/inquiries/templates" -Headers $authHeader
} else {
    Write-Host "  [SKIP] Inquiry Templates (auth setup failed)" -ForegroundColor Yellow
    Write-Host ""
}
Test-Endpoint -Name "Promo Validate" -Url "$base/api/payments/validate-promo" -Method "POST" -Body '{"code":"LAUNCH50","plan_type":"silver"}'
Test-Endpoint -Name "Reviews (public)" -Url "$base/api/reviews/user/00000000-0000-0000-0000-000000000000"
Test-Endpoint -Name "Complaints List" -Url "$base/api/complaints"
if ($authHeader) {
    Test-Endpoint -Name "Offers List" -Url "$base/api/offers" -Headers $authHeader
} else {
    Write-Host "  [SKIP] Offers List (auth setup failed)" -ForegroundColor Yellow
    Write-Host ""
}
Test-Endpoint -Name "Referral Leaderboard" -Url "$base/api/referral/leaderboard"

Write-Host "=== Validation Complete ===" -ForegroundColor Cyan
