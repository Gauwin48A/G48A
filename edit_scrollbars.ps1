$file = "android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt"
$content = Get-Content $file -Raw
$lines = $content -split "`r?`n"

Write-Host "Total lines: $($lines.Length)"

# ─── Fix 1: Sort options LazyRow → Row + horizontalScroll + indicator ───

# Find the sort options LazyRow starting context
$sortLazyStart = -1
for ($i = 1660; $i -lt 1700 -and $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match 'LazyRow\(' -and $i -gt 1660) {
        # Verify it's the sort LazyRow (contains FilterChip with sortOptions)
        for ($j = $i; $j -lt [Math]::Min($i+10, $lines.Length); $j++) {
            if ($lines[$j] -match 'sortOptions\[') {
                $sortLazyStart = $i
                break
            }
        }
        if ($sortLazyStart -ge 0) { break }
    }
}

if ($sortLazyStart -ge 0) {
    Write-Host "Sort LazyRow found at line $sortLazyStart (0-based: $($sortLazyStart+1))"
    
    # Find closing of LazyRow
    $depth = 0
    $started = $false
    $sortLazyEnd = -1
    for ($j = $sortLazyStart; $j -lt [Math]::Min($sortLazyStart+35, $lines.Length); $j++) {
        $openCount = ([regex]::Matches($lines[$j], '{')).Count
        $closeCount = ([regex]::Matches($lines[$j], '}')).Count
        if (-not $started) {
            if ($openCount -gt 0) { $started = $true }
            $depth += $openCount - $closeCount
        } else {
            $depth += $openCount - $closeCount
        }
        if ($started -and $depth -le 0) {
            $sortLazyEnd = $j
            break
        }
    }
    
    if ($sortLazyEnd -ge 0) {
        Write-Host "Sort LazyRow ends at line $sortLazyEnd (0-based: $($sortLazyEnd+1))"
        Write-Host "Lines to replace: $($sortLazyEnd - $sortLazyStart + 1)"
        
        # Get indentation from the LazyRow line
        $indent = $lines[$sortLazyStart] -replace '^(\s*).*', '$1'
        $nextIndent = $indent + '    '
        
        # Build new lines
        $newLines = @()
        $newLines += "${indent}val sortScrollState = rememberScrollState()"
        $newLines += "${indent}Box {"
        $newLines += "${nextIndent}Row("
        $newLines += "${nextIndent}    modifier = Modifier"
        $newLines += "${nextIndent}        .fillMaxWidth()"
        $newLines += "${nextIndent}        .horizontalScroll(sortScrollState)"
        $newLines += "${nextIndent}        .padding(start = 16.dp, end = 16.dp, bottom = 6.dp),"
        $newLines += "${nextIndent}    horizontalArrangement = Arrangement.spacedBy(8.dp),"
        $newLines += "${nextIndent}) {"
        
        # Copy inner content - convert items() to forEach
        for ($k = $sortLazyStart + 1; $k -lt $sortLazyEnd; $k++) {
            $line = $lines[$k]
            if ($line -match '^\s*items\(') {
                $newLines += $line -replace 'items\(sortOptions\.size, key = \{ sortOptions\[it\]\.first \}\) \{ idx ->', 'sortOptions.forEach { (key, label) ->'
            } elseif ($line -match 'val \(key, label\) = sortOptions\[idx\]') {
                # Skip this line since forEach gives us (key, label) directly
            } else {
                $newLines += $line
            }
        }
        
        # Close the Row and add scroll indicator
        $newLines += "${nextIndent}}"
        $newLines += "${indent}    HorizontalScrollIndicator(scrollState = sortScrollState)"
        $newLines += "${indent}}"
        
        # Replace in the array
        $range = $sortLazyStart..$sortLazyEnd
        $j = 0
        foreach ($idx in $range) {
            $lines[$idx] = $newLines[$j]
            $j++
        }
        
        Write-Host "Sort section updated with scrollbar indicator"
    }
}

# ─── Fix 2: Subcategory FlowRow → Row + horizontalScroll + indicator ───

$flowRowStart = -1
for ($i = 1700; $i -lt 1770 -and $i -lt $lines.Length; $i++) {
    if (($lines[$i] -match 'FlowRow\(') -and ($lines[$i+1] -match 'ecosystemSubcategories' -or $i+2 -lt $lines.Length -and ($lines[$i+2] -match 'ecosystemSubcategories' -or $lines[$i+1] -match 'ecosystemSubcategories'))) {
        $flowRowStart = $i
        break
    }
}

# Alternative: find by comment
if ($flowRowStart -lt 0) {
    for ($i = 1700; $i -lt 1770 -and $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match 'Subcategory.*chips|wrapping FlowRow|ecosystemSubcategories') {
            $flowRowStart = $i
            break
        }
    }
}

if ($flowRowStart -lt 0) {
    Write-Host "ERROR: Could not find FlowRow for subcategories"
    exit 1
}

Write-Host "Subcategory FlowRow area found starting at line $flowRowStart (0-based: $($flowRowStart+1))"

# Find actual FlowRow( line
$actualFlowRowStart = -1
for ($j = $flowRowStart; $j -lt [Math]::Min($flowRowStart+8, $lines.Length); $j++) {
    if ($lines[$j] -match '^\s*FlowRow\(') {
        $actualFlowRowStart = $j
        break
    }
}

if ($actualFlowRowStart -lt 0) {
    Write-Host "ERROR: Could not find FlowRow( line"
    exit 1
}

# Find closing of FlowRow
$depth = 0
$started = $false
$flowRowEnd = -1
for ($j = $actualFlowRowStart; $j -lt [Math]::Min($actualFlowRowStart+45, $lines.Length); $j++) {
    $openCount = ([regex]::Matches($lines[$j], '{')).Count
    $closeCount = ([regex]::Matches($lines[$j], '}')).Count
    if (-not $started) {
        if ($openCount -gt 0) { $started = $true }
        $depth += $openCount - $closeCount
    } else {
        $depth += $openCount - $closeCount
    }
    if ($started -and $depth -le 0) {
        $flowRowEnd = $j
        break
    }
}

if ($flowRowEnd -lt 0) {
    Write-Host "ERROR: Could not find FlowRow closing"
    exit 1
}

Write-Host "FlowRow ends at line $flowRowEnd (0-based: $($flowRowEnd+1))"

$indent = $lines[$actualFlowRowStart] -replace '^(\s*).*', '$1'
$nextIndent = $indent + '    '

# Keep any comment lines before FlowRow(
$commentLines = @()
for ($j = $flowRowStart; $j -lt $actualFlowRowStart; $j++) {
    $commentLines += $lines[$j]
}

# Build new category section
$newCatLines = @()
$newCatLines += $commentLines
$newCatLines += "${indent}val catScrollState = rememberScrollState()"
$newCatLines += "${indent}Column {"
$newCatLines += "${nextIndent}Row("
$newCatLines += "${nextIndent}    modifier = Modifier"
$newCatLines += "${nextIndent}        .fillMaxWidth()"
$newCatLines += "${nextIndent}        .horizontalScroll(catScrollState)"
$newCatLines += "${nextIndent}        .padding(horizontal = 16.dp, vertical = 6.dp),"
$newCatLines += "${nextIndent}    horizontalArrangement = Arrangement.spacedBy(6.dp),"
$newCatLines += "${nextIndent}) {"

# Copy inner chip content
for ($k = $actualFlowRowStart + 1; $k -lt $flowRowEnd; $k++) {
    $line = $lines[$k]
    if ($line -match '^\s*FlowRow\(' -or $line -match '^\s*FlowRow\.') {
        continue
    }
    $newCatLines += $line
}

# Close Row, add indicator, close Column
$newCatLines += "${nextIndent}}"
$newCatLines += "${indent}    HorizontalScrollIndicator(scrollState = catScrollState)"
$newCatLines += "${indent}}"

# Replace in array
$range = $flowRowStart..$flowRowEnd
$j = 0
foreach ($idx in $range) {
    $lines[$idx] = $newCatLines[$j]
    $j++
}

Write-Host "Category section updated with scrollbar indicator"

# Write back
$newContent = $lines -join "`r`n"
Set-Content $file -Value $newContent -NoNewline -Encoding UTF8

Write-Host "Done! File updated successfully."
