param(
    [string]$Serial = "emulator-5554",
    [string]$PackageName = "com.mhub.app.debug",
    [string]$OutputRoot = "",
    [int]$LaunchWaitMs = 2200,
    [int]$UiTimeoutSec = 16
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

function Adb([string[]]$args) {
    & $adb @args
}

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $PSScriptRoot "..\test-screenshots"
}
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $OutputRoot ("route-walkthrough-web-parity-" + $stamp)
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$uiPath = Join-Path $outDir "_ui.xml"
$manifestTxtPath = Join-Path $outDir "MANIFEST.txt"
$manifestJsonPath = Join-Path $outDir "manifest.json"

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
    }
    throw "Unable to dump UI hierarchy."
}

function WaitForAnyText([string[]]$texts, [int]$timeoutSec = 12) {
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
    Adb @(
        "-s", $Serial, "shell", "am", "start",
        "-n", "$PackageName/com.mhub.app.MainActivity",
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

Adb @("-s", $Serial, "wait-for-device") | Out-Null
Adb @("-s", $Serial, "shell", "am", "force-stop", $PackageName) | Out-Null
Pause 900

$manifest = @()

StartDebugRoute "parity/hub"
# Cold start can be slow on emulators. Wait longer for the first usable compose frame.
WaitForAnyText @("Web parity pages", "Welcome back", "MHub") 180 | Out-Null
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

$index = 1
foreach ($route in $routes) {
    $appRoute = "parity/page/$($route.key)"
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
    $index++
}

$manifest |
    ForEach-Object {
        "{0} | {1} | {2} | {3}" -f $_.file, $_.title, $_.route, $_.canonicalPath
    } |
    Set-Content -Path $manifestTxtPath

$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestJsonPath

Write-Output "Web parity screenshot pack created: $outDir"
Write-Output "Screenshots captured: $($manifest.Count)"
