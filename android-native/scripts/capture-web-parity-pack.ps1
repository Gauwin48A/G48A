param(
    [string]$Serial = "emulator-5554",
    [string]$PackageName = "com.zaruda.app.debug",
    [string]$OutputRoot = "",
    [string]$OutputDir = "",
    [int]$LaunchWaitMs = 2200,
    [int]$UiTimeoutSec = 16,
    [int]$MaxRoutes = 0,
    [int]$StartIndex = 1,
    [int]$EndIndex = 0,
    [switch]$SkipUiWait = $false
)

$ErrorActionPreference = "Stop"

function Resolve-AdbPath {
    $candidates = @()
    if ($env:ANDROID_SDK_ROOT) { $candidates += (Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe") }
    if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe") }
    $candidates += "C:\Android\Sdk\platform-tools\adb.exe"
    $candidates += "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe"

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) { return $candidate }
    }

    $adbCmd = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbCmd) { return $adbCmd.Source }
    throw "adb not found. Install Android platform-tools or set ANDROID_SDK_ROOT."
}

function Pause([int]$ms = 1200) { Start-Sleep -Milliseconds $ms }

$adb = Resolve-AdbPath

function Adb {
    param([Parameter(Mandatory = $true)][string[]]$AdbArgs)

    & $adb @AdbArgs
    if ($LASTEXITCODE -ne 0) {
        throw "adb command failed: $($AdbArgs -join ' ')"
    }
}

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $PSScriptRoot "..\test-screenshots"
}
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$outDir = ""
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $outDir = Join-Path $OutputRoot ("route-walkthrough-web-parity-" + $stamp)
} else {
    if ([System.IO.Path]::IsPathRooted($OutputDir)) {
        $outDir = $OutputDir
    } else {
        $outDir = Join-Path $OutputRoot $OutputDir
    }
}
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$uiPath = Join-Path $outDir "_ui.xml"
$manifestTxtPath = Join-Path $outDir "MANIFEST.txt"
$manifestJsonPath = Join-Path $outDir "manifest.json"

function Capture([string]$name) {
    $remote = "/sdcard/$name"
    Adb -AdbArgs @("-s", $Serial, "shell", "screencap", "-p", $remote) | Out-Null
    $target = Join-Path $outDir $name
    Adb -AdbArgs @("-s", $Serial, "pull", $remote, $target) | Out-Null
    if (-not (Test-Path $target)) {
        throw "Screenshot pull failed for $name"
    }
}

function DumpUi {
    for ($i = 0; $i -lt 8; $i++) {
        Adb -AdbArgs @("-s", $Serial, "shell", "uiautomator", "dump", "/sdcard/ui.xml") | Out-Null
        Pause 300
        Adb -AdbArgs @("-s", $Serial, "pull", "/sdcard/ui.xml", $uiPath) | Out-Null

        if (Test-Path $uiPath) {
            $raw = Get-Content $uiPath -Raw
            if ($raw -match "<hierarchy") {
                try { return [xml]$raw } catch { }
            }
        }
    }
    throw "Unable to dump UI hierarchy."
}

function WaitForAnyText([string[]]$texts, [int]$timeoutSec = 12) {
    if ($SkipUiWait) { return $true }
    for ($i = 0; $i -lt $timeoutSec; $i++) {
        try {
            $xml = DumpUi
            foreach ($text in $texts) {
                $safe = $text.Replace("'", "&apos;")
                if ($xml.SelectSingleNode("//node[@text='$safe']")) { return $true }
            }
        } catch { }
        Start-Sleep -Seconds 1
    }
    return $false
}

function StartDebugRoute([string]$route) {
    Adb -AdbArgs @(
        "-s", $Serial, "shell", "am", "start",
        "-n", "$PackageName/com.zaruda.app.MainActivity",
        "--es", "debug_route", $route
    ) | Out-Null
    Pause $LaunchWaitMs
}

$routeCatalogPath = Join-Path $PSScriptRoot "..\app\src\main\java\com\mhub\app\ui\parity\WebRouteCatalog.kt"
if (-not (Test-Path $routeCatalogPath)) {
    throw "Route catalog not found: $routeCatalogPath"
}

$catalogRaw = Get-Content $routeCatalogPath -Raw
$routeMatches = [regex]::Matches(
    $catalogRaw,
    'WebRouteReference\("(?<key>[^"]+)",\s*"(?<title>[^"]+)",\s*"(?<canonicalPath>[^"]+)"'
)

$seenKeys = @{}
$routes = @()
foreach ($match in $routeMatches) {
    $key = $match.Groups["key"].Value
    if ([string]::IsNullOrWhiteSpace($key) -or $seenKeys.ContainsKey($key)) { continue }
    $seenKeys[$key] = $true
    $routes += [pscustomobject]@{
        key = $key
        title = $match.Groups["title"].Value
        canonicalPath = $match.Groups["canonicalPath"].Value
    }
}

if ($routes.Count -eq 0) {
    throw "No routes parsed from $routeCatalogPath"
}

Adb -AdbArgs @("-s", $Serial, "wait-for-device") | Out-Null
Adb -AdbArgs @("-s", $Serial, "shell", "am", "force-stop", $PackageName) | Out-Null
Pause 900

$manifest = @()
if (Test-Path $manifestJsonPath) {
    try {
        $existing = Get-Content $manifestJsonPath -Raw | ConvertFrom-Json
        $manifest = @($existing)
    } catch { }
}

if ($StartIndex -le 1 -and -not (Test-Path (Join-Path $outDir "000_parity_hub.png"))) {
    # Cold start can be slow on emulators. Warm up on a deterministic detail screen first.
    StartDebugRoute "parity/page/login"
    WaitForAnyText @("Login", "Route preview") 180 | Out-Null
    StartDebugRoute "parity/hub"
    WaitForAnyText @("Web parity pages") 30 | Out-Null
    Capture "000_parity_hub.png"
    $manifest += [pscustomobject]@{
        index = 0
        file = "000_parity_hub.png"
        key = "parity_hub"
        title = "Web parity pages"
        route = "parity/hub"
        canonicalPath = "n/a"
    }
}

$index = 1
$capturedThisRun = 0
foreach ($route in $routes) {
    if ($index -lt $StartIndex) { $index++; continue }
    if ($EndIndex -gt 0 -and $index -gt $EndIndex) { break }
    if ($MaxRoutes -gt 0 -and $index -gt $MaxRoutes) { break }
    $appRoute = "parity/page/$($route.key)"
    Write-Output ("Capturing [{0}/{1}] {2}" -f $index, $routes.Count, $appRoute)
    StartDebugRoute $appRoute
    WaitForAnyText @($route.title, "Route preview") $UiTimeoutSec | Out-Null

    $safeKey = ($route.key -replace '[^a-zA-Z0-9_-]', '_')
    $fileName = ("{0:D3}_{1}.png" -f $index, $safeKey)
    Capture $fileName

    $manifest += [pscustomobject]@{
        index = $index
        file = $fileName
        key = $route.key
        title = $route.title
        route = $appRoute
        canonicalPath = $route.canonicalPath
    }
    $capturedThisRun++
    $index++
}

$manifest = $manifest | Sort-Object index -Unique

$manifest |
    ForEach-Object {
        "{0} | {1} | {2} | {3}" -f $_.file, $_.title, $_.route, $_.canonicalPath
    } |
    Set-Content -Path $manifestTxtPath

$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestJsonPath

Write-Output "Web parity screenshot pack created: $outDir"
Write-Output "Screenshots captured (total): $($manifest.Count)"
Write-Output "Screenshots captured (this run): $capturedThisRun"

