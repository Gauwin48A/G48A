const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt';
const lines = fs.readFileSync(path, 'utf-8').split('\n');
const changes = [];

// ─── Step 1: Replace sort chips block (lines 1587-1610) with FlowRow ───
// Line numbers are 1-indexed in the file
const sortStart = 1587; // line where LazyRow starts
const sortEnd = 1610;   // line where the item block ends (})

// Extract the sort block
const sortBlock = lines.slice(sortStart - 1, sortEnd);
const sortBlockStr = sortBlock.join('\n');

// Build new FlowRow block
const newSortBlock = [
  '                        @OptIn(ExperimentalLayoutApi::class)',
  '                        FlowRow(',
  '                            modifier = Modifier',
  '                                .fillMaxWidth()',
  '                                .padding(horizontal = 16.dp, vertical = 6.dp),',
  '                            horizontalArrangement = Arrangement.spacedBy(6.dp),',
  '                            verticalArrangement = Arrangement.spacedBy(6.dp),',
  '                        ) {',
  '                            SortOption.entries.forEach { option ->',
  '                                FilterChip(',
  '                                    selected = sortBy == option,',
  '                                    onClick = { sortBy = option },',
  '                                    label = { Text(option.label, style = MaterialTheme.typography.labelSmall) },',
  '                                    leadingIcon = when (option) {',
  '                                        SortOption.POPULAR -> ({ Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, modifier = Modifier.size(12.dp)) })',
  '                                        SortOption.NEWEST -> ({ Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(12.dp)) })',
  '                                        SortOption.MOST_VIEWED -> ({ Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(12.dp)) })',
  '                                        else -> null',
  '                                    },',
  '                                    colors = FilterChipDefaults.filterChipColors(',
  '                                        selectedContainerColor = MaterialTheme.colorScheme.primary,',
  '                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,',
  '                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,',
  '                                    ),',
  '                                )',
  '                            }',
  '                        }',
  '                    }',
].join('\n');

// Verify the old block matches
const oldBlockCheck = lines.slice(sortStart - 1, sortEnd).join('\n');
if (oldBlockCheck.includes('SortOption.entries')) {
  // Replace the old sort block
  lines.splice(sortStart - 1, sortEnd - sortStart + 1, newSortBlock);
  changes.push('Replaced sort chips LazyRow with FlowRow at lines 1587-1610');
} else {
  changes.push('Could not verify sort chips block content');
}

// ─── Step 2: Find the subcategories block and move sort chips ABOVE it ───
// The sort chips are now at a different position due to the splice
// Find the "// Subcategory chips" comment
const subIdx = lines.findIndex(l => l.includes('// Subcategory chips'));
if (subIdx >= 0) {
  // Find the sort chips block (the one with "// Sort" comment that we didn't add)
  const sortChipIdx = lines.findIndex(l => l.includes('SortOption.entries.forEach'));
  if (sortChipIdx >= 0 && sortChipIdx > subIdx) {
    // Find the boundary of the subcategories block
    // It ends where the sort chips block starts (or where the next block begins)
    // The subcategories block ends at sortChipIdx - 1
    
    // Also find where the quick filter chips start
    const qfIdx = lines.findIndex(l => l.includes('// Quick filter chips'));
    const pfIdx = lines.findIndex(l => l.includes('// Price filter row'));
    let quickFilterIdx = qfIdx >= 0 ? qfIdx : pfIdx;
    if (quickFilterIdx < 0) quickFilterIdx = lines.length;
    
    // The sort chips block is between subBlockEnd+1 and quickFilterIdx
    // The subcategories block is between subIdx and subBlockEnd
    
    // Find where subcategories block ends (before sort chips or next block)
    const subBlock = lines.slice(subIdx, sortChipIdx);
    const sortChipsBlock = lines.slice(sortChipIdx, quickFilterIdx);
    
    if (sortChipsBlock.join('').includes('SortOption')) {
      // Extract before subcategories, subcategories block, sort chips, and after
      const beforeSub = lines.slice(0, subIdx);
      const subcatBlock = lines.slice(subIdx, sortChipIdx);
      const sortBlockNew = lines.slice(sortChipIdx, quickFilterIdx);
      const afterSort = lines.slice(quickFilterIdx);
      
      // New order: beforeSub + sortBlockNew + subcatBlock + afterSort
      const newLines = [...beforeSub, ...sortBlockNew, '', ...subcatBlock, ...afterSort];
      
      // Write the result
      fs.writeFileSync(path, newLines.join('\n'), 'utf-8');
      changes.push(`Moved sort chips block (${sortChipIdx+1}-${quickFilterIdx}) ABOVE subcategories block (${subIdx+1}-${sortChipIdx})`);
    } else {
      changes.push('Sort chips block verification failed');
    }
  } else {
    changes.push(`Sort chips at index ${sortChipIdx}, subcategories at ${subIdx} — not in expected order`);
  }
} else {
  changes.push('Could not find subcategories comment');
}

console.log('=== Changes applied ===');
changes.forEach(c => console.log('  •', c));
