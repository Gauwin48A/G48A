const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/foryou/ForYouScreen.kt';
let content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\r\n');
const changes = [];

// Find key markers in the LazyColumn
let greatDealsIdx = -1;
let searchFilterIdx = -1;
let sortDropdownIdx = -1;
let sortDirectionIdx = -1;
let categoryChipsIdx = -1;
let categoryChipsEnd = -1;
let timeWindowIdx = -1;
let quickFiltersIdx = -1;
let quickFiltersEnd = -1;
let priceRangeIdx = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Find GreatDealsBanner
  if (line.includes('GreatDealsBanner') && greatDealsIdx < 0) greatDealsIdx = i;
  
  // Find Search + Filter item
  if (line.includes('modifier = Modifier.weight(1f)') && line.includes('singleLine = true') && line.includes('ImeAction.Search')) {
    searchFilterIdx = i;
  }
  
  // Find Sort dropdown item (the items count + sort chip)
  if (line.includes('Sort:') && line.includes('FilterChip') && sortDropdownIdx < 0) {
    sortDropdownIdx = i;
  }
  
  // Find Sort direction + density chips
  if (line.includes('ArrowUpward') && line.includes('FilterChip') && sortDirectionIdx < 0) {
    sortDirectionIdx = i;
  }

  // Find Category chips item
  if (line.includes('contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)') && 
      line.includes('Arrangement.spacedBy(8.dp)') && categoryChipsIdx < 0) {
    // Check if next few lines contain FilterChip with selectedContainerColor = primary
    let isCategory = false;
    for (let j = i; j < Math.min(i + 10, lines.length); j++) {
      if (lines[j].includes('selectedContainerColor = MaterialTheme.colorScheme.primary') &&
          lines[j].includes('selectedLabelColor = MaterialTheme.colorScheme.onPrimary')) {
        isCategory = true;
        break;
      }
    }
    if (isCategory) {
      categoryChipsIdx = i;
    }
  }
  
  // Find Time window filters
  if (line.includes('All Time') && line.includes('Today') && timeWindowIdx < 0) {
    timeWindowIdx = i;
  }
  
  // Find Quick filters
  if (line.includes('Under ₹500') && line.includes('Under ₹1000') && quickFiltersIdx < 0) {
    quickFiltersIdx = i;
  }
  
  // Find Price range
  if (line.includes('Min ₹') && line.includes('OutlinedTextField') && priceRangeIdx < 0) {
    priceRangeIdx = i;
  }
}

console.log('Key block positions (0-indexed):');
console.log(`  GreatDealsBanner: ${greatDealsIdx}`);
console.log(`  Search+Filter: ${searchFilterIdx}`);
console.log(`  Sort dropdown: ${sortDropdownIdx}`);
console.log(`  Sort direction: ${sortDirectionIdx}`);
console.log(`  Category chips (start/end): ${categoryChipsIdx}`);
console.log(`  Time window: ${timeWindowIdx}`);
console.log(`  Quick filters: ${quickFiltersIdx}`);
console.log(`  Price range: ${priceRangeIdx}`);

// Find the actual item { } boundaries for blocks we need to move
function findItemBlock(startLine) {
  // Walk up to find the item {
  let itemStart = startLine;
  while (itemStart >= 0 && !lines[itemStart].trim().startsWith('item')) {
    itemStart--;
  }
  // Walk forward to find matching closing brace
  let braceCount = 0;
  let endLine = itemStart;
  while (endLine < lines.length) {
    for (let ch of lines[endLine]) {
      if (ch === '{') braceCount++;
      else if (ch === '}') braceCount--;
    }
    if (braceCount === 0 && endLine > itemStart) {
      return { start: itemStart, end: endLine };
    }
    endLine++;
  }
  return null;
}

// ===== CHANGE 1: Add "Most Viewed" to the quick filter list =====
// Find the qFilters list and add Most Viewed
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"Latest 50"')) {
    // Check if "Most Viewed" is already in qFilters
    let hasMostViewed = false;
    for (let j = i; j < Math.min(i + 20, lines.length); j++) {
      if (lines[j].includes('Most Viewed')) {
        hasMostViewed = true;
        break;
      }
    }
    if (!hasMostViewed) {
      // Add "Most Viewed" after "Latest 50" 
      const indent = lines[i].match(/^(\s*)/)[1];
      lines.splice(i + 1, 0, `${indent}"Most Viewed" to Icons.Default.Visibility,`);
      changes.push('Added "Most Viewed" to quick filters');
    }
    break;
  }
}

// ===== CHANGE 2: Convert quick filter LazyRow to FlowRow =====
// Find the LazyRow with qFilters and replace with FlowRow
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('val qFilters = listOf(')) {
    // Find the LazyRow that wraps qFilters
    let lazyRowStart = i;
    while (lazyRowStart >= 0 && !lines[lazyRowStart].includes('LazyRow(')) lazyRowStart--;
    
    if (lazyRowStart >= 0) {
      // Find the closing of this LazyRow
      let braceCount = 0;
      let lazyRowEnd = lazyRowStart;
      while (lazyRowEnd < lines.length) {
        for (let ch of lines[lazyRowEnd]) {
          if (ch === '{') braceCount++;
          else if (ch === '}') braceCount--;
        }
        if (braceCount === 0 && lazyRowEnd > lazyRowStart) {
          break;
        }
        lazyRowEnd++;
      }
      
      // Find the item { that wraps this LazyRow
      let itemStart = lazyRowStart;
      while (itemStart >= 0 && !lines[itemStart].trim().startsWith('item')) itemStart--;
      
      if (itemStart >= 0 && itemStart < lazyRowStart) {
        // Now find the closing brace of the item block
        braceCount = 0;
        let itemEnd = itemStart;
        while (itemEnd < lines.length) {
          for (let ch of lines[itemEnd]) {
            if (ch === '{') braceCount++;
            else if (ch === '}') braceCount--;
          }
          if (braceCount === 0 && itemEnd > itemStart) {
            // Found the item block boundaries
            const indent = lines[itemStart].match(/^(\s*)/)[1];
            const ind2 = indent + '    ';
            const ind3 = ind2 + '    ';
            
            // Build FlowRow replacement
            const flowRowBlock = [
              `${ind}item {`,
              `${ind2}@OptIn(ExperimentalLayoutApi::class)`,
              `${ind2}FlowRow(`,
              `${ind3}modifier = Modifier`,
              `${ind3}    .fillMaxWidth()`,
              `${ind3}    .padding(horizontal = 16.dp, vertical = 4.dp),`,
              `${ind3}horizontalArrangement = Arrangement.spacedBy(6.dp),`,
              `${ind3}verticalArrangement = Arrangement.spacedBy(4.dp),`,
              `${ind2}) {`,
            ];
            
            // Extract the actual filter chip content
            // We need to find the items() call and convert each item
            const oldBlock = lines.slice(itemStart, itemEnd + 1);
            const itemLines = oldBlock.join('\r\n');
            
            // Extract the FilterChip creation code from the items() block
            const filterChips = [];
            for (let j = 0; j < oldBlock.length; j++) {
              if (oldBlock[j].includes('FilterChip(')) {
                // Extract until the closing )
                let chipLines = [];
                let chipBraceCount = 0;
                let k = j;
                let foundEnd = false;
                while (k < oldBlock.length && !foundEnd) {
                  for (let ch of oldBlock[k]) {
                    if (ch === '(') chipBraceCount++;
                    else if (ch === ')') chipBraceCount--;
                  }
                  chipLines.push(oldBlock[k]);
                  if (chipBraceCount <= 0 && k > j) {
                    foundEnd = true;
                    // Find the chip indent
                    const chipIndent = oldBlock[j].match(/^(\s*)/)[1];
                    // Re-indent to 3 indentation level
                    const reindented = chipLines.map(l => {
                      const trimmed = l.trim();
                      if (trimmed.startsWith('FilterChip')) {
                        return `${ind3}${trimmed}`;
                      } else if (trimmed.startsWith('selected =')) {
                        return `${ind3}    ${trimmed}`;
                      } else if (trimmed.startsWith('onClick')) {
                        return `${ind3}    ${trimmed}`;
                      } else if (trimmed.startsWith('label')) {
                        return `${ind3}    ${trimmed}`;
                      } else if (trimmed.startsWith('leadingIcon')) {
                        return `${ind3}    ${trimmed}`;
                      } else if (trimmed.startsWith('colors')) {
                        return `${ind3}    ${trimmed}`;
                      } else if (trimmed.startsWith('selectedContainerColor')) {
                        return `${ind3}        ${trimmed}`;
                      } else if (trimmed.startsWith('selectedLabelColor')) {
                        return `${ind3}        ${trimmed}`;
                      } else if (trimmed.startsWith('selectedLeadingIconColor')) {
                        return `${ind3}        ${trimmed}`;
                      } else if (trimmed.startsWith('),')) {
                        return `${ind3}    ),`;
                      } else if (trimmed.startsWith(')')) {
                        return `${ind3})`;
                      } else {
                        return `${ind3}${trimmed}`;
                      }
                    });
                    filterChips.push(...reindented);
                  }
                  k++;
                }
              }
              // Handle the clear filters item and other content
              if (oldBlock[j].includes('item {')) {
                // Keep items as-is with proper indentation
                filterChips.push(`${ind3}${oldBlock[j].trim()}`);
              }
            }
            
            // If we couldn't extract properly, just copy the content with re-indentation
            // Actually this is getting too complex. Let me take a simpler approach.
            // Just replace the LazyRow with FlowRow wrapping the same items.
            
            // Get the indentation of the LazyRow
            const lazyRowIndent = lines[lazyRowStart].match(/^(\s*)/)[1];
            
            // Build a simpler replacement
            const simpleFlowRow = [];
            simpleFlowRow.push(`${ind}item {`);
            simpleFlowRow.push(`${ind2}@OptIn(ExperimentalLayoutApi::class)`);
            simpleFlowRow.push(`${ind2}FlowRow(`);
            simpleFlowRow.push(`${ind3}modifier = Modifier`);
            simpleFlowRow.push(`${ind3}    .fillMaxWidth()`);
            simpleFlowRow.push(`${ind3}    .padding(horizontal = 16.dp, vertical = 4.dp),`);
            simpleFlowRow.push(`${ind3}horizontalArrangement = Arrangement.spacedBy(6.dp),`);
            simpleFlowRow.push(`${ind3}verticalArrangement = Arrangement.spacedBy(4.dp),`);
            simpleFlowRow.push(`${ind2}) {`);
            
            // Copy the content between LazyRow opening and closing, adjusting indentation
            const innerStart = lazyRowStart + 1; // skip LazyRow(
            const innerEnd = lazyRowEnd; // includes the closing )
            
            // Find the items() line and the closing } before )
            let itemsStart = -1;
            let itemsEnd = -1;
            for (let j = innerStart; j < innerEnd; j++) {
              if (lines[j].includes('items(') || lines[j].includes('val qFilters')) {
                itemsStart = j;
              }
            }
            
            // We need to find the content between items(...) { and the final }
            // This is the FilterChip code
            let captureStart = -1;
            let captureEnd = -1;
            braceCount = 0;
            for (let j = innerStart; j < innerEnd; j++) {
              const trimmed = lines[j].trim();
              if (trimmed.startsWith('items(') || trimmed.startsWith('item {') || trimmed.startsWith('val q')) {
                if (trimmed.includes('{')) captureStart = j + 1;
              }
            }
            
            // This is getting too complex. Let me take a completely different approach.
            break;
          }
          itemEnd++;
        }
      }
    }
    break;
  }
}

// ===== SIMPLER APPROACH: Direct line-number-based surgery =====
// From the file content I read, I know:
// - Category chips: item { LazyRow with FilterChip for categories } → need to move after price range
// - Time window: item { LazyRow with time options }
// - Quick filters: item { LazyRow with "Under ₹500"... }
// - Price range: item { Row with Min/Max/Verified }

// Let me find these blocks by content pattern matching
function findItemBlockByContent(contentPattern, afterLine = 0) {
  for (let i = afterLine; i < lines.length; i++) {
    if (lines[i].includes(contentPattern)) {
      // Walk up to find item {
      let itemStart = i;
      while (itemStart >= 0 && !lines[itemStart].trim().startsWith('item') && !lines[itemStart].trim().startsWith('//')) {
        itemStart--;
      }
      // Adjust if we hit a comment
      if (lines[itemStart].trim().startsWith('//')) {
        itemStart++;
      }
      // Find matching close
      let braceCount = 0;
      let itemEnd = itemStart;
      while (itemEnd < lines.length) {
        for (let ch of lines[itemEnd]) {
          if (ch === '{') braceCount++;
          else if (ch === '}') braceCount--;
        }
        if (braceCount === 0 && itemEnd > itemStart) {
          return { start: itemStart, end: itemEnd, content: lines.slice(itemStart, itemEnd + 1) };
        }
        itemEnd++;
      }
    }
  }
  return null;
}

// It's getting too complex with this approach. Let me use a different strategy.
// I'll use str_replace directly for targeted changes.

console.log('\nScript completed partial analysis. Manual edits needed.');
changes.forEach(c => console.log('  •', c));
