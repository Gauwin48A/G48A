param(
    [string]$Serial = "emulator-5554",
    [string]$PackageName = "com.zaruda.app.debug",
    [string]$OutputRoot = "",
    [int]$UiTimeoutSec = 30
)

$ErrorActionPreference = "Stop"

function Resolve-AdbPath {
    $candidates = @()
    if ($env:ANDROID_SDK_ROOT) { $candidates += (Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe") }
    if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe") }
    $candidates += "C:\Android\Sdk\platform-tools\adb.exe"
    $candidates += "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe"

    foreach ($p in $candidates) {
        if ($p -and (Test-Path $p)) { return $p }
    }

    $cmd = Get-Command adb -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    throw "adb not found. Install Android platform-tools or set ANDROID_SDK_ROOT."
}

$adb = Resolve-AdbPath

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $PSScriptRoot "..\test-screenshots"
}
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $OutputRoot ("route-pack-" + $Serial + "-" + $stamp)
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$uiPath = Join-Path $outDir "_ui.xml"

function Pause([int]$ms = 1200) { Start-Sleep -Milliseconds $ms }

function Adb([string[]]$args) {
    & $adb @args
}

function DeviceScale {
    $sizeRaw = (Adb @("-s", $Serial, "shell", "wm", "size") | Out-String)
    if ($sizeRaw -notmatch "(\d+)x(\d+)") { return @{ W = 1080; H = 2400 } }
    return @{ W = [int]$matches[1]; H = [int]$matches[2] }
}

$device = DeviceScale
$w = $device.W
$h = $device.H

function ScaleX([double]$x) { [int][Math]::Round(($x / 1080.0) * $w) }
function ScaleY([double]$y) { [int][Math]::Round(($y / 2400.0) * $h) }

function TapAt([double]$xBase, [double]$yBase, [int]$waitMs = 1700) {
    $x = ScaleX $xBase
    $y = ScaleY $yBase
    Adb @("-s", $Serial, "shell", "input", "tap", "$x", "$y") | Out-Null
    Pause $waitMs
}

function KeyBack([int]$waitMs = 1700) {
    Adb @("-s", $Serial, "shell", "input", "keyevent", "4") | Out-Null
    Pause $waitMs
}

function Capture([string]$name) {
    $remote = "/sdcard/$name"
    Adb @("-s", $Serial, "shell", "screencap", "-p", $remote) | Out-Null
    Adb @("-s", $Serial, "pull", $remote, (Join-Path $outDir $name)) | Out-Null
}

function DumpUi {
    for ($i = 0; $i -lt 8; $i++) {
        Adb @("-s", $Serial, "shell", "uiautomator", "dump", "/sdcard/ui.xml") | Out-Null
        Pause 300
        Adb @("-s", $Serial, "pull", "/sdcard/ui.xml", $uiPath) | Out-Null

        if (Test-Path $uiPath) {
            $raw = Get-Content $uiPath -Raw
            if ($raw -match "<hierarchy") {
                try { return [xml]$raw } catch { }
            }
        }
        Pause 500
    }
    throw "Unable to dump UI hierarchy"
}

function WaitForText([string]$text, [int]$timeoutSec = 20) {
    $safe = $text.Replace("'", "&apos;")
    for ($i = 0; $i -lt $timeoutSec; $i++) {
        try {
            $xml = DumpUi
            if ($xml.SelectSingleNode("//node[@text='$safe']")) { return $true }
        } catch { }
        Start-Sleep -Seconds 1
    }
    return $false
}

function TapByText([string]$text, [int]$occurrence = 1, [int]$waitMs = 1800) {
    $safe = $text.Replace("'", "&apos;")
    $xml = DumpUi
    $nodes = $xml.SelectNodes("//node[@text='$safe']/ancestor::node[@clickable='true'][1]")
    if (-not $nodes -or $nodes.Count -lt $occurrence) {
        throw "Could not find tappable text '$text'"
    }
    $bounds = $nodes[$occurrence - 1].bounds
    if ($bounds -notmatch "\[(\d+),(\d+)\]\[(\d+),(\d+)\]") {
        throw "Invalid bounds for '$text': $bounds"
    }
    $cx = [int](($matches[1] + $matches[3]) / 2)
    $cy = [int](($matches[2] + $matches[4]) / 2)
    Adb @("-s", $Serial, "shell", "input", "tap", "$cx", "$cy") | Out-Null
    Pause $waitMs
}

# reset app
Adb @("-s", $Serial, "shell", "am", "force-stop", $PackageName) | Out-Null
Adb @("-s", $Serial, "shell", "pm", "clear", $PackageName) | Out-Null
Pause 800
Adb @("-s", $Serial, "shell", "am", "start", "-n", "$PackageName/com.zaruda.app.MainActivity") | Out-Null

if (-not (WaitForText "Welcome back" $UiTimeoutSec)) {
    throw "Login screen did not become ready"
}

Capture "01_login_signin.png"
TapByText "Create account"
Capture "02_login_signup.png"
TapByText "Sign in"
Capture "03_login_signin_tab.png"
TapAt 965 367 2200
Capture "04_settings_from_login.png"
KeyBack 1900

TapByText "Preview app (debug)"
WaitForText "Local marketplace near you" 20 | Out-Null
Capture "05_home.png"

TapByText "Detail"
WaitForText "Listing" 12 | Out-Null
Capture "06_post_detail_state.png"
KeyBack 1900

TapAt 702 213 2500
WaitForText "Categories" 12 | Out-Null
Capture "07_categories.png"
KeyBack 1900

TapAt 844 213 2200
WaitForText "Search listings" 12 | Out-Null
Capture "08_search_initial.png"
Adb @("-s", $Serial, "shell", "input", "text", "phone") | Out-Null
Pause 2500
Capture "09_search_query.png"
TapAt 25 165 1900

TapAt 933 2011 2200
WaitForText "Create listing" 12 | Out-Null
Capture "10_create_post.png"
KeyBack 1900

TapAt 320 2232 2100
Capture "11_explore.png"
TapAt 540 2232 2100
Capture "12_notifications.png"
TapAt 760 2232 2100
Capture "13_wishlist.png"
TapAt 980 2232 2400
WaitForText "My listings" 20 | Out-Null
Capture "14_profile.png"

TapByText "My listings"
Capture "15_my_listings.png"
KeyBack 1800
TapByText "Complete verification"
Capture "16_kyc.png"
KeyBack 1800
TapByText "Settings"
Capture "17_settings_from_profile.png"
KeyBack 1800
Capture "18_profile_return.png"

@(
    "01_login_signin.png - Login (Sign in tab)",
    "02_login_signup.png - Login (Create account tab)",
    "03_login_signin_tab.png - Login (Back to sign in tab)",
    "04_settings_from_login.png - Settings opened from login",
    "05_home.png - Home feed route",
    "06_post_detail_state.png - Post detail route",
    "07_categories.png - Categories route",
    "08_search_initial.png - Search initial",
    "09_search_query.png - Search with query",
    "10_create_post.png - Create listing route",
    "11_explore.png - Explore tab",
    "12_notifications.png - Alerts tab",
    "13_wishlist.png - Wishlist tab",
    "14_profile.png - Profile tab",
    "15_my_listings.png - My listings route",
    "16_kyc.png - KYC route",
    "17_settings_from_profile.png - Settings route from profile",
    "18_profile_return.png - Profile after settings back"
) | Set-Content -Path (Join-Path $outDir "MANIFEST.txt")

Write-Output "Route pack created: $outDir"

