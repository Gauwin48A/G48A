const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt';
let content = fs.readFileSync(path, 'utf-8');
let lines = content.split('\n');
const changes = [];

// ===== CHANGE 1: Add FlowRow and ExperimentalLayoutApi imports =====
const lazyRowImportIdx = lines.findIndex(l => l.includes('import androidx.compose.foundation.lazy.LazyRow'));
if (lazyRowImportIdx >= 0) {
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
const priceAscLogicIdx = lines.findIndex(l => l.includes('SortOption.PRICE_ASC ->'));
if (priceAscLogicIdx >= 0) {
  const hasMostViewedLogic = lines.some(l => l.includes('SortOption.MOST_VIEWED ->'));
  if (!hasMostViewedLogic) {
    const indent = lines[priceAscLogicIdx].match(/^(\s*)/)[1];
    lines.splice(priceAscLogicIdx, 0, `${indent}SortOption.MOST_VIEWED -> list.sortedByDescending { it.viewCount ?: 0 }`);
    changes.push('Added MOST_VIEWED sort logic');
  }
}

// ===== CHANGE 4: Find and replace sort chips LazyRow with FlowRow =====
// Find the line with "items(SortOption.entries" 
const sortItemsIdx = lines.findIndex(l => l.includes('items(SortOption.entries'));
if (sortItemsIdx >= 0) {
  // Walk up to find the "item {" that wraps this
  let itemStart = sortItemsIdx;
  while (itemStart >= 0 && !lines[itemStart].trim().startsWith('item')) itemStart--;
  // Might need to go back further if item has a modifier or content
  // Let's be more precise: find the closing } of the item block
  // Start from itemStart, count braces, and find the matching close
  let startLine = itemStart - 1;
  while (startLine >= 0) {
    const trimmed = lines[startLine].trim();
    if (trimmed.startsWith('//') || trimmed === '') {
      startLine--;
      continue;
    }
    break;
  }
  // The item { should be at startLine + 1, or we can use itemStart directly
  
  // Walk forward from sortItemsIdx to find the end of the item block
  // The LazyRow block closes with: }) or ) }\n} 
  // Let's find the closing } of the item block
  let braceCount = 0;
  let endLine = itemStart;
  let foundLazyRowEnd = false;
  while (endLine < lines.length) {
    for (let ch of lines[endLine]) {
      if (ch === '{') braceCount++;
      else if (ch === '}') braceCount--;
    }
    if (braceCount === 0 && endLine > itemStart) {
      foundLazyRowEnd = true;
      break;
    }
    endLine++;
  }
  
  if (foundLazyRowEnd) {
    // Verify this looks like the sort chips block - there should be a LazyRow near itemStart
    let hasLazyRow = false;
    for (let i = itemStart; i <= endLine; i++) {
      if (lines[i].includes('LazyRow(')) { hasLazyRow = true; break; }
    }
    
    if (hasLazyRow) {
      const indent = lines[itemStart].match(/^(\s*)/)[1];
      const ind2 = indent + '    ';
      const ind3 = ind2 + '    ';
      
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
      
      // Save content to be moved
      const blockLen = endLine - itemStart + 1;
      const sortChipsContent = flowRowBlock; // Use the FlowRow replacement
      
      // Remove old sort chips block
      lines.splice(itemStart, blockLen);
      changes.push(`Replaced sort chips block (lines ${itemStart+1}-${itemStart+blockLen}) with FlowRow`);
      
      // ===== CHANGE 5: Move sort chips ABOVE subcategories =====
      // Find the subcategories block: look for SubcategoryStrip or CategoriesStrip
      let subcatItemStart = -1;
      for (let i = 0; i < lines.length; i++) {
        if ((lines[i].includes('SubcategoryStrip(') || lines[i].includes('CategoriesStrip(')) && i >= itemStart) {
          // Walk up to find the wrapping "item {"
          let j = i;
          while (j >= 0 && !lines[j].trim().startsWith('item') && !(lines[j].includes('item {') || lines[j].includes('item('))) j--;
          // j might have the "item {" but we need its exact position
          // It might also be the start of the if-else block
          // Let's look for the "// Subcategory chips" comment or the if block start
          let k = i;
          while (k >= 0 && !(lines[k].includes('// Subcategory chips') || lines[k].includes('if (categoryTheme != null'))) k--;
          if (k >= 0) {
            // The item { directly after this comment or inside the if
            subcatItemStart = k;
          }
          break;
        }
      }
      
      // Insert sort chips before the subcategories comment/block
      // Insert at subcatItemStart
      const insertPos = (subcatItemStart >= 0) ? subcatItemStart : itemStart;
      lines.splice(insertPos, 0, ...sortChipsContent);
      changes.push('Moved sort chips ABOVE subcategories block');
    } else {
      changes.push('ERROR: Found items(SortOption.entries) but no LazyRow in the block');
    }
  } else {
    changes.push('ERROR: Could not find end of sort chips block');
  }
} else {
  changes.push('ERROR: Could not find items(SortOption.entries) line');
}

fs.writeFileSync(path, lines.join('\n'), 'utf-8');
console.log('=== Changes applied ===');
changes.forEach(c => console.log('  •', c));
console.log(`\nTotal lines: ${lines.length}`);
