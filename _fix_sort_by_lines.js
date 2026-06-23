const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt';
let lines = fs.readFileSync(path, 'utf-8').split('\n');
const changes = [];

// Line numbers (1-indexed from the file)
// The sort chips LazyRow block: lines 1587 to 1610
// Let's verify by checking the content

// Line 1587 should contain "LazyRow("
const lineIdx = 1586; // 0-indexed
console.log(`Line 1587 content: "${lines[lineIdx].trim()}"`);

if (lines[lineIdx].includes('LazyRow(')) {
  // Extract indentation from line 1585 (the item { line)
  const itemLine = lines[lineIdx - 2] || '';
  const indent = itemLine.match(/^(\s*)/)[1]; // e.g., "                    "
  
  // Build replacement lines with matching indentation
  const ind = indent; // e.g., 20 spaces
  const ind2 = ind + '    '; // 24 spaces
  const ind3 = ind2 + '    '; // 28 spaces
  
  const replacement = [
    `${ind}// Sort chips — all visible with FlowRow wrapping`,
    `${ind}item {`,
    `${ind2}@OptIn(ExperimentalLayoutApi::class)`,
    `${ind2}FlowRow(`,
    `${ind3}modifier = Modifier`,
    `${ind3}    .fillMaxWidth()`,
    `${ind3}    .padding(horizontal = 16.dp, vertical = 6.dp),`,
    `${ind3}horizontalArrangement = Arrangement.spacedBy(6.dp),`,
    `${ind3}verticalArrangement = Arrangement.spacedBy(6.dp),`,
    `${ind2}) {`,
    `${ind3}SortOption.entries.forEach { option ->`,
    `${ind3}    FilterChip(`,
    `${ind3}        selected = sortBy == option,`,
    `${ind3}        onClick = { sortBy = option },`,
    `${ind3}        label = { Text(option.label, style = MaterialTheme.typography.labelSmall) },`,
    `${ind3}        leadingIcon = when (option) {`,
    `${ind3}            SortOption.POPULAR -> ({ Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, modifier = Modifier.size(12.dp)) })`,
    `${ind3}            SortOption.NEWEST -> ({ Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(12.dp)) })`,
    `${ind3}            SortOption.MOST_VIEWED -> ({ Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(12.dp)) })`,
    `${ind3}            else -> null`,
    `${ind3}        },`,
    `${ind3}        colors = FilterChipDefaults.filterChipColors(`,
    `${ind3}            selectedContainerColor = MaterialTheme.colorScheme.primary,`,
    `${ind3}            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,`,
    `${ind3}            selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,`,
    `${ind3}        ),`,
    `${ind3}    )`,
    `${ind3}}`,
    `${ind2}}`,
    `${ind}}`,
  ];
  
  // The old block spans lines 1585-1610 (item { to closing })
  const oldLen = 1610 - 1585 + 1; // 26 lines
  console.log(`Replacing line 1585-1610 (${oldLen} lines) with ${replacement.length} lines`);
  
  lines.splice(1584, oldLen, ...replacement);
  changes.push('Replaced sort chips LazyRow with FlowRow at lines 1585-1610');
} else {
  console.log('ERROR: Line 1587 does not contain LazyRow');
  console.log(`Actual content at line 1587: "${lines[lineIdx]}"`);
}

fs.writeFileSync(path, lines.join('\n'), 'utf-8');
console.log('\n=== Changes applied ===');
changes.forEach(c => console.log('  •', c));
