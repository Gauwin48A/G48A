const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/foryou/ForYouScreen.kt';
let content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\r\n');
const changes = [];
const N = lines.length;

function findBlockEnd(startLine) {
  let braceCount = 0;
  let k = startLine;
  while (k < N) {
    const line = lines[k];
    if (!line) { k++; continue; }
    for (let ch of line) {
      if (ch === '{') braceCount++;
      else if (ch === '}') braceCount--;
    }
    if (braceCount === 0 && k > startLine) return k;
    k++;
  }
  return -1;
}

function findBlockStart(startLine) {
  let j = startLine;
  while (j >= 0 && !lines[j].trim().startsWith('item') && !lines[j].trim().startsWith('//')) j--;
  if (j >= 0 && lines[j].trim().startsWith('//')) j++;
  return j;
}

// ===== Step 1: Add "Most Viewed" to quick filters if not already there =====
let hasMostViewed = false;
for (let i = 0; i < N; i++) {
  if (lines[i] && lines[i].includes('"Most Viewed"')) {
    hasMostViewed = true;
    break;
  }
}

if (!hasMostViewed) {
  for (let i = 0; i < N; i++) {
    if (lines[i] && lines[i].includes('"Latest 50"')) {
      const indent = lines[i].match(/^(\s*)/)[1];
      lines.splice(i + 1, 0, `${indent}"Most Viewed" to Icons.Default.Visibility,`);
      changes.push('Added "Most Viewed" to quick filters');
      break;
    }
  }
} else {
  changes.push('"Most Viewed" already in quick filters');
}

// ===== Step 2: Find category chips block and move it after price range block =====
let catItemStart = -1;
let catItemEnd = -1;

for (let i = 0; i < N; i++) {
  if (lines[i] && lines[i].includes('itemsIndexed(categories)')) {
    catItemStart = findBlockStart(i);
    if (catItemStart >= 0) {
      catItemEnd = findBlockEnd(catItemStart);
    }
    break;
  }
}

if (catItemStart < 0 || catItemEnd < 0) {
  changes.push('ERROR: Could not find category chips block');
} else {
  changes.push(`Category chips block: lines ${catItemStart+1}-${catItemEnd+1}`);
  const catBlock = lines.slice(catItemStart, catItemEnd + 1);
  
  // Remove category chips block
  const catLen = catItemEnd - catItemStart + 1;
  lines.splice(catItemStart, catLen);
  changes.push('Removed category chips from original position');
  
  // Find price range block (look for "Min ₹" or "Max ₹" in OutlinedTextFields)
  let priceStart = -1;
  let priceEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('OutlinedTextField') && lines[i].includes('Min')) {
      // Check if there's a Max ₹ nearby
      for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 10); j++) {
        if (lines[j] && lines[j].includes('Max')) {
          // Found the price range area - find the item block
          priceStart = findBlockStart(i);
          if (priceStart >= 0) {
            priceEnd = findBlockEnd(priceStart);
          }
          break;
        }
      }
      if (priceStart >= 0) break;
    }
  }
  
  if (priceStart >= 0 && priceEnd >= 0) {
    changes.push(`Price range block: lines ${priceStart+1}-${priceEnd+1}`);
    lines.splice(priceEnd + 1, 0, ...catBlock);
    changes.push('Inserted category chips AFTER price range block');
  } else {
    changes.push('WARNING: Could not find price range, inserting before sponsored');
    // Insert before sponsored
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] && lines[i].includes('if (state.sponsored.isNotEmpty())')) {
        lines.splice(i, 0, ...catBlock);
        changes.push('Inserted before sponsored');
        break;
      }
    }
  }
}

// ===== Step 3: Convert quick filter LazyRow to FlowRow =====
for (let i = 0; i < lines.length; i++) {
  if (lines[i] && lines[i].includes('val qFilters = listOf(')) {
    // Find LazyRow
    let lazyRowStart = i;
    while (lazyRowStart >= 0 && !(lines[lazyRowStart] && lines[lazyRowStart].includes('LazyRow('))) lazyRowStart--;
    
    if (lazyRowStart >= 0) {
      let itemStart = findBlockStart(lazyRowStart);
      if (itemStart >= 0) {
        let itemEnd = findBlockEnd(itemStart);
        
        if (itemEnd >= 0 && itemEnd > itemStart) {
          const indent = lines[itemStart].match(/^(\s*)/)[1];
          const ind2 = indent + '    ';
          const ind3 = ind2 + '    ';
          const ind4 = ind3 + '    ';
          const ind5 = ind4 + '    ';
          
          // Extract filter items
          const filterItems = [];
          for (let j = lazyRowStart; j < itemEnd; j++) {
            const t = lines[j] ? lines[j].trim() : '';
            if (t.startsWith('"Under ₹500"') || t.startsWith('"Under ₹1000"') || 
                t.startsWith('"Trending"') || t.startsWith('"New Arrivals"') ||
                t.startsWith('"Latest 10"') || t.startsWith('"Latest 50"') ||
                t.startsWith('"Most Viewed"')) {
              filterItems.push(t.replace(/,$/, ''));
            }
          }
          
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
            `${ind3}val qFilters = listOf(`,
          ];
          
          filterItems.forEach(item => {
            flowRowBlock.push(`${ind3}    ${item},`);
          });
          
          flowRowBlock.push(`${ind3})`);
          flowRowBlock.push(`${ind3}qFilters.forEach { (label, icon) ->`);
          flowRowBlock.push(`${ind4}FilterChip(`);
          flowRowBlock.push(`${ind4}    selected = quickFilter == label,`);
          flowRowBlock.push(`${ind4}    onClick = { quickFilter = if (quickFilter == label) null else label },`);
          flowRowBlock.push(`${ind4}    label = { Text(label, style = MaterialTheme.typography.labelSmall) },`);
          flowRowBlock.push(`${ind4}    leadingIcon = { Icon(icon, null, modifier = Modifier.size(14.dp)) },`);
          flowRowBlock.push(`${ind4}    colors = FilterChipDefaults.filterChipColors(`);
          flowRowBlock.push(`${ind5}selectedContainerColor = MaterialTheme.colorScheme.tertiary,`);
          flowRowBlock.push(`${ind5}selectedLabelColor = MaterialTheme.colorScheme.onTertiary,`);
          flowRowBlock.push(`${ind5}selectedLeadingIconColor = MaterialTheme.colorScheme.onTertiary,`);
          flowRowBlock.push(`${ind4}    ),`);
          flowRowBlock.push(`${ind4})`);
          flowRowBlock.push(`${ind3}}`);
          // Clear all filters
          flowRowBlock.push(`${ind3}if (quickFilter != null || timeFilter != null || minPrice.isNotBlank() || maxPrice.isNotBlank() || verifiedOnly || searchQuery.isNotBlank()) {`);
          flowRowBlock.push(`${ind4}FilterChip(`);
          flowRowBlock.push(`${ind4}    selected = false,`);
          flowRowBlock.push(`${ind4}    onClick = { quickFilter = null; timeFilter = null; minPrice = \"\"; maxPrice = \"\"; verifiedOnly = false; searchQuery = \"\" },`);
          flowRowBlock.push(`${ind4}    label = { Text(\"✕ Clear\", style = MaterialTheme.typography.labelSmall) },`);
          flowRowBlock.push(`${ind4}    colors = FilterChipDefaults.filterChipColors(containerColor = MaterialTheme.colorScheme.errorContainer),`);
          flowRowBlock.push(`${ind4})`);
          flowRowBlock.push(`${ind3}}`);
          flowRowBlock.push(`${ind2}}`);
          flowRowBlock.push(`${ind}}`);
          
          const oldLen = itemEnd - itemStart + 1;
          lines.splice(itemStart, oldLen, ...flowRowBlock);
          changes.push('Converted quick filters LazyRow to FlowRow');
        }
      }
    }
    break;
  }
}

// ===== Step 4: Convert time window LazyRow to FlowRow =====
for (let i = 0; i < lines.length; i++) {
  if (lines[i] && lines[i].includes('val timeOptions = listOf<Pair<String?, String>>(')) {
    let lazyRowStart = i;
    while (lazyRowStart >= 0 && !(lines[lazyRowStart] && lines[lazyRowStart].includes('LazyRow('))) lazyRowStart--;
    
    if (lazyRowStart >= 0) {
      let itemStart = findBlockStart(lazyRowStart);
      if (itemStart >= 0) {
        let itemEnd = findBlockEnd(itemStart);
        
        if (itemEnd >= 0 && itemEnd > itemStart) {
          const indent = lines[itemStart].match(/^(\s*)/)[1];
          const ind2 = indent + '    ';
          const ind3 = ind2 + '    ';
          const ind4 = ind3 + '    ';
          
          const flowRowBlock = [
            `${ind}// ─── Time Window Filter ─────────────────────────────`,
            `${ind}item {`,
            `${ind2}@OptIn(ExperimentalLayoutApi::class)`,
            `${ind2}FlowRow(`,
            `${ind3}modifier = Modifier`,
            `${ind3}    .fillMaxWidth()`,
            `${ind3}    .padding(horizontal = 16.dp, vertical = 4.dp),`,
            `${ind3}horizontalArrangement = Arrangement.spacedBy(6.dp),`,
            `${ind3}verticalArrangement = Arrangement.spacedBy(4.dp),`,
            `${ind2}) {`,
            `${ind3}val timeOptions = listOf<Pair<String?, String>>(`,
            `${ind3}    null to "All Time",`,
            `${ind3}    "Today" to "Today",`,
            `${ind3}    "Week" to "This Week",`,
            `${ind3}    "Month" to "This Month",`,
            `${ind3})`,
            `${ind3}timeOptions.forEach { (key, label) ->`,
            `${ind4}FilterChip(`,
            `${ind4}    selected = timeFilter == key,`,
            `${ind4}    onClick = { timeFilter = if (timeFilter == key && key != null) null else key },`,
            `${ind4}    label = { Text(label, style = MaterialTheme.typography.labelSmall) },`,
            `${ind4}    colors = FilterChipDefaults.filterChipColors(`,
            `${ind4}        selectedContainerColor = MaterialTheme.colorScheme.secondaryContainer,`,
            `${ind4}        selectedLabelColor = MaterialTheme.colorScheme.onSecondaryContainer,`,
            `${ind4}    ),`,
            `${ind4})`,
            `${ind3}}`,
            `${ind2}}`,
            `${ind}}`,
          ];
          
          const oldLen = itemEnd - itemStart + 1;
          lines.splice(itemStart, oldLen, ...flowRowBlock);
          changes.push('Converted time window LazyRow to FlowRow');
        }
      }
    }
    break;
  }
}

fs.writeFileSync(path, lines.join('\r\n'), 'utf-8');
console.log('\n=== Changes applied ===');
changes.forEach(c => console.log('  •', c));
console.log(`\nTotal lines: ${lines.length}`);
