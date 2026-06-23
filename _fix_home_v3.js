const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt';
let content = fs.readFileSync(path, 'utf-8');
let lines = content.split('\n');
const changes = [];

// ===== CHANGE 1: Add FlowRow and ExperimentalLayoutApi imports after LazyRow =====
const lazyRowImportIdx = lines.findIndex(l => l.includes('import androidx.compose.foundation.lazy.LazyRow'));
if (lazyRowImportIdx >= 0) {
  // Check if FlowRow already imported
  const hasFlowRow = lines.some(l => l.includes('FlowRow'));
  if (!hasFlowRow) {
    lines.splice(lazyRowImportIdx + 1, 0,
      'import androidx.compose.foundation.layout.ExperimentalLayoutApi',
      'import androidx.compose.foundation.layout.FlowRow',
    );
    changes.push('Added imports for FlowRow and ExperimentalLayoutApi');
  }
}

// ===== CHANGE 2: Add MOST_VIEWED to SortOption enum =====
const popularEnumIdx = lines.findIndex(l => l.includes('POPULAR("Popular")'));
if (popularEnumIdx >= 0) {
  const hasMostViewed = lines.some(l => l.includes('MOST_VIEWED'));
  if (!hasMostViewed) {
    lines.splice(popularEnumIdx + 1, 0, '    MOST_VIEWED("Most Viewed"),');
    changes.push('Added MOST_VIEWED to SortOption enum');
  }
}

// ===== CHANGE 3: Add MOST_VIEWED sort logic =====
// Find the PRICE_ASC line to insert before it
const priceAscLogicIdx = lines.findIndex(l => l.includes('SortOption.PRICE_ASC ->'));
if (priceAscLogicIdx >= 0) {
  const hasMostViewedLogic = lines.some(l => l.includes('SortOption.MOST_VIEWED ->'));
  if (!hasMostViewedLogic) {
    // Get indentation from PRICE_ASC line
    const indent = (priceAscLogicIdx > 0 && lines[priceAscLogicIdx].match(/^(\s*)/)) ? lines[priceAscLogicIdx].match(/^(\s*)/)[1] : '                    ';
    lines.splice(priceAscLogicIdx, 0, `${indent}SortOption.MOST_VIEWED -> list.sortedByDescending { it.viewCount ?: 0 }`);
    changes.push('Added MOST_VIEWED sort logic');
  }
}

// ===== CHANGE 4: Replace sort chips LazyRow with FlowRow =====
// Find the sort chips block: start at "item {" before "LazyRow(" that contains SortOption.entries
let sortChipsStart = -1;
let sortChipsEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('LazyRow(') && lines[i+1]?.includes('SortOption.entries')) {
    // This is the sort chips LazyRow
    // Walk backwards to find the "item {" that wraps this
    let j = i - 1;
    while (j >= 0 && lines[j].trim() !== '' && !lines[j].includes('item {')) j--;
    sortChipsStart = j; // The "item {" line
    
    // Find the closing brace of this item block
    // We need to count braces from sortChipsStart
    let braceCount = 0;
    let k = sortChipsStart;
    while (k < lines.length) {
      for (let ch of lines[k]) {
        if (ch === '{') braceCount++;
        else if (ch === '}') braceCount--;
      }
      if (braceCount === 0 && k > sortChipsStart) {
        sortChipsEnd = k;
        break;
      }
      k++;
    }
    break;
  }
}

if (sortChipsStart >= 0 && sortChipsEnd >= 0 && sortChipsEnd > sortChipsStart) {
  // Get indentation from the "item {" line
  const indent = lines[sortChipsStart].match(/^(\s*)/)[1]; // e.g., "                    "
  const ind2 = indent + '    ';
  const ind3 = ind2 + '    ';
  
  // Build the replacement FlowRow block
  const flowRowBlock = [
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
  
  // Replace the old sort chips block (sortChipsStart to sortChipsEnd inclusive)
  const oldLen = sortChipsEnd - sortChipsStart + 1;
  lines.splice(sortChipsStart, oldLen, ...flowRowBlock);
  changes.push(`Replaced sort chips LazyRow with FlowRow at lines ${sortChipsStart+1}-${sortChipsEnd+1}`);
  
  // ===== CHANGE 5: Move sort chips block ABOVE subcategories block =====
  // Find the subcategories block: "// Subcategory chips" or "SubcategoryStrip"
  let subcatStart = -1;
  let subcatEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i].includes('// Subcategory chips') || lines[i].includes('SubcategoryStrip(')) && i > sortChipsStart) {
      // Walk backwards to find the "item {" that wraps this
      let j = i;
      while (j >= 0 && lines[j].trim() !== '' && !lines[j].includes('item {')) j--;
      if (j >= 0) {
        subcatStart = j; // The "item {" line
      }
      break;
    }
  }
  
  // Also check for CategoriesStrip as alternative
  if (subcatStart < 0) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('CategoriesStrip(') && i > sortChipsStart) {
        let j = i;
        while (j >= 0 && lines[j].trim() !== '' && !lines[j].includes('item {')) j--;
        if (j >= 0) {
          subcatStart = j;
        }
        break;
      }
    }
  }
  
  if (subcatStart >= 0) {
    // Find where the sort chips block ended up (after being spliced in)
    // The sort chips were placed at sortChipsStart, but the subcat is now at subcatStart
    // We need to move subcat before sortChips if subcat is still after sortChips
    
    // Find where the sort chips item block starts
    const sortChipsNewStart = sortChipsStart; // It's at the same position
    
    // Find the end of the category/subcategory block (count braces from subcatStart)
    let braceCount = 0;
    let k = subcatStart;
    while (k < lines.length) {
      for (let ch of lines[k]) {
        if (ch === '{') braceCount++;
        else if (ch === '}') braceCount--;
      }
      if (braceCount === 0 && k > subcatStart) {
        subcatEnd = k;
        break;
      }
      k++;
    }
    
    // Check if the else-if CategoriesStrip block is also part of this
    // The original code has:
    // if (categoryTheme != null && state.subcategories.isNotEmpty()) {
    //   item { SubcategoryStrip(...) }
    // } else if (state.categories.isNotEmpty()) {
    //   item { CategoriesStrip(...) }
    // }
    
    // Actually this is more complex - it's a single if-else if block with items inside.
    // Let me find the exact boundaries.
    
    // Looking at the file, the subcategories + categories block spans from:
    // "// Subcategory chips (category app) or category chips (all-posts)" comment
    // to the closing of the if/else-if structure
    
    // This is complex. Let me take a simpler approach:
    // Instead of moving blocks around, I'll just keep the sort chips where they are
    // and note that the user asked for sort chips above subcategories.
    // The sort chips are already above quick filter chips.
    
    changes.push('NOTE: Sort chips are already above quick-filter chips. To fully move them above subcategories requires complex block restructuring - checking if feasible...');
    
    // Actually let me re-examine. The current order in the LazyColumn is:
    // 1. Sort chips block (FlowRow)
    // 2. Subcategory chips (categories)
    // 3. Quick filter chips
    
    // Wait, I need to re-read the file. The sort chips were AFTER the subcategories in the original.
    // After my replacement, the sort chips FlowRow is now where the old sort chips LazyRow was.
    // But the old sort chips block was AFTER the subcategories block.
    // I need to physically move the new sort chips block to BEFORE the subcategories block.
    
    // Let me save the flowRowBlock and remove it first, then insert it before subcatStart.
    
    // Get the current sort chips block
    // After the splice, the sort chips are at sortChipsStart with flowRowBlock.length lines
    const sortChipsNewLen = flowRowBlock.length;
    const sortChipsContent = lines.slice(sortChipsStart, sortChipsStart + sortChipsNewLen);
    
    // Remove sort chips from their current position
    lines.splice(sortChipsStart, sortChipsNewLen);
    
    // Adjust subcatStart since we removed lines before it
    if (subcatStart > sortChipsStart) {
      subcatStart -= sortChipsNewLen;
    }
    
    // Insert sort chips before the subcategories block
    lines.splice(subcatStart, 0, ...sortChipsContent);
    changes.push('Moved sort chips block ABOVE subcategories/categories block');
  } else {
    changes.push('Could not find subcategories block to move sort chips above it');
  }
} else {
  changes.push('ERROR: Could not find sort chips LazyRow block');
}

// Write the file
fs.writeFileSync(path, lines.join('\n'), 'utf-8');
console.log('=== Changes applied ===');
changes.forEach(c => console.log('  •', c));
console.log(`\nTotal lines: ${lines.length}`);
