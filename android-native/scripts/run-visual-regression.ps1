param(
    [string]$Serial = "emulator-5554",
    [string]$BaselineDir = "",
    [double]$ThresholdPercent = 1.5
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($BaselineDir)) {
    $BaselineDir = Join-Path $scriptRoot "..\test-screenshots\baseline\$Serial"
}
$BaselineDir = [System.IO.Path]::GetFullPath($BaselineDir)

$captureScript = Join-Path $scriptRoot "capture-route-walkthrough.ps1"
$compareScript = Join-Path $scriptRoot "compare-screenshot-pack.ps1"

if (-not (Test-Path $captureScript)) { throw "Missing capture script: $captureScript" }
if (-not (Test-Path $compareScript)) { throw "Missing compare script: $compareScript" }
if (-not (Test-Path $BaselineDir)) { throw "Baseline folder not found: $BaselineDir" }

$output = & powershell -ExecutionPolicy Bypass -File $captureScript -Serial $Serial
$output | ForEach-Object { Write-Output $_ }

$line = $output | Where-Object { $_ -like "Route pack created:*" } | Select-Object -Last 1
if (-not $line) {
    throw "Could not determine candidate screenshot folder from capture output."
}

$candidate = $line.Substring($line.IndexOf(":") + 1).Trim()
if (-not (Test-Path $candidate)) {
    throw "Candidate folder not found: $candidate"
}

& powershell -ExecutionPolicy Bypass -File $compareScript -BaselineDir $BaselineDir -CandidateDir $candidate -ThresholdPercent $ThresholdPercent

Write-Output "Visual regression complete. Candidate: $candidate"
