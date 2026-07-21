param(
    [Parameter(Mandatory = $true)] [string]$BaselineDir,
    [Parameter(Mandatory = $true)] [string]$CandidateDir,
    [double]$ThresholdPercent = 1.5,
    [int]$SampleStep = 3,
    [int]$IgnoreTopPx = 100,
    [int]$IgnoreBottomPx = 120
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$BaselineDir = [System.IO.Path]::GetFullPath($BaselineDir)
$CandidateDir = [System.IO.Path]::GetFullPath($CandidateDir)

if (-not (Test-Path $BaselineDir)) { throw "BaselineDir not found: $BaselineDir" }
if (-not (Test-Path $CandidateDir)) { throw "CandidateDir not found: $CandidateDir" }

$baselineFiles = Get-ChildItem -Path $BaselineDir -Filter "*.png" | Sort-Object Name
$candidateFiles = Get-ChildItem -Path $CandidateDir -Filter "*.png" | Sort-Object Name

if ($baselineFiles.Count -eq 0 -or $candidateFiles.Count -eq 0) {
    throw "Missing png files in baseline or candidate folder."
}

$names = $baselineFiles.Name | Where-Object { $candidateFiles.Name -contains $_ }
if ($names.Count -eq 0) { throw "No overlapping screenshot names to compare." }

function Compare-Images([string]$fileA, [string]$fileB) {
    $bmpA = New-Object System.Drawing.Bitmap($fileA)
    $bmpB = New-Object System.Drawing.Bitmap($fileB)

    try {
        if ($bmpA.Width -ne $bmpB.Width -or $bmpA.Height -ne $bmpB.Height) {
            return @{ DiffPercent = 100.0; ComparedPixels = 0; ChangedPixels = 0 }
        }

        $width = $bmpA.Width
        $height = $bmpA.Height
        $yStart = [Math]::Min([Math]::Max(0, $IgnoreTopPx), $height - 1)
        $yEnd = [Math]::Max($yStart + 1, $height - $IgnoreBottomPx)

        $total = 0L
        $changed = 0L

        for ($y = $yStart; $y -lt $yEnd; $y += $SampleStep) {
            for ($x = 0; $x -lt $width; $x += $SampleStep) {
                $c1 = $bmpA.GetPixel($x, $y)
                $c2 = $bmpB.GetPixel($x, $y)
                $total++

                $delta = [Math]::Abs($c1.R - $c2.R) + [Math]::Abs($c1.G - $c2.G) + [Math]::Abs($c1.B - $c2.B)
                if ($delta -gt 30) { $changed++ }
            }
        }

        $percent = if ($total -eq 0) { 0.0 } else { [Math]::Round(($changed * 100.0) / $total, 3) }
        return @{ DiffPercent = $percent; ComparedPixels = $total; ChangedPixels = $changed }
    }
    finally {
        $bmpA.Dispose()
        $bmpB.Dispose()
    }
}

$rows = @()
foreach ($name in $names) {
    $a = Join-Path $BaselineDir $name
    $b = Join-Path $CandidateDir $name
    $cmp = Compare-Images $a $b

    $rows += [PSCustomObject]@{
        file = $name
        diff_percent = $cmp.DiffPercent
        compared_pixels = $cmp.ComparedPixels
        changed_pixels = $cmp.ChangedPixels
        status = if ($cmp.DiffPercent -le $ThresholdPercent) { "PASS" } else { "FAIL" }
    }
}

$reportPath = Join-Path $CandidateDir "visual-regression-report.csv"
$rows | Export-Csv -Path $reportPath -NoTypeInformation

$failed = $rows | Where-Object { $_.status -eq "FAIL" }

Write-Output "Compared $($rows.Count) screenshot(s). Threshold: $ThresholdPercent%"
$rows | Format-Table -AutoSize
Write-Output "Report: $reportPath"

if ($failed.Count -gt 0) {
    Write-Error ("Visual regression failed for {0} screenshot(s)." -f $failed.Count)
    exit 2
}

Write-Output "Visual regression passed."

