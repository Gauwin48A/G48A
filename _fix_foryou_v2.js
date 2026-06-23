const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/foryou/ForYouScreen.kt';
let content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\r\n');
const changes = [];

// ===== Step 1: Add "Most Viewed" to quick filters if not already there =====
let hasMostViewed = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"Most Viewed"')) {
    hasMostViewed = true;
    break;
  }
}

if (!hasMostViewed) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('"Latest 50"')) {
      const indent = lines[i + 1] ? lines[i + 1].match(/^(\s*)/)[1] : '                            ';
      lines.splice(i + 1, 0, `${indent}"Most Viewed" to Icons.Default.Visibility,`);
      changes.push('Added "Most Viewed" to quick filters');
      break;
    }
  }
} else {
  changes.push('"Most Viewed" already in quick filters (from previous run)');
}

// ===== Step 2: Find category chips block and move it after price range block =====
let catItemStart = -1;
let catItemEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('itemsIndexed(categories)')) {
    let j = i;
    while (j >= 0 && !lines[j].trim().startsWith('item')) j--;
    catItemStart = j;
    
    let braceCount = 0;
    let k = catItemStart;
    while (k < lines.length) {
      for (let ch of lines[k]) {
        if (ch === '{') braceCount++;
        else if (ch === '}') braceCount--;
      }
      if (braceCount === 0 && k > catItemStart) {
        catItemEnd = k;
        break;
      }
      k++;
    }
    break;
  }
}

if (catItemStart < 0 || catItemEnd < 0) {
  console.log('ERROR: Could not find category chips block');
} else {
  console.log(`Category chips block: lines ${catItemStart + 1} - ${catItemEnd + 1}`);
  const catBlock = lines.slice(catItemStart, catItemEnd + 1);
  
  // Remove category chips block
  lines.splice(catItemStart, catItemEnd - catItemStart + 1);
  changes.push('Moved category chips block');
  
  // Find price range block (after the area we just modified)
  // Look for "Min ₹" and "Max ₹" 
  let priceRangeStart = -1;
  let priceRangeEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Min ₹') && lines[i + 1] && (lines[i + 1].includes('Max ₹') || lines[i].includes('Max ₹'))) {
      // Walk up to find item {
      let j = i;
      while (j >= 0 && !lines[j].trim().startsWith('item')) j--;
      priceRangeStart = j;
      
      let braceCount = 0;
      let k = priceRangeStart;
      while (k < lines.length) {
        for (let ch of lines[k]) {
          if (ch === '{') braceCount++;
          else if (ch === '}') braceCount--;
        }
        if (braceCount === 0 && k > priceRangeStart) {
          priceRangeEnd = k;
          break;
        }
        k++;
      }
      break;
    }
  }
  
  if (priceRangeStart < 0 || priceRangeEnd < 0) {
    // Try alternative: find the Verified filter chip
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Icons.Default.Verified') && lines[i].includes('FilterChip') && lines[i].includes('"Verified"')) {
        let j = i;
        while (j >= 0 && !lines[j].trim().startsWith('item')) j--;
        priceRangeStart = j;
        
        let braceCount = 0;
        let k = priceRangeStart;
        while (k < lines.length) {
          for (let ch of lines[k]) {
            if (ch === '{') braceCount++;
            else if (ch === '}') braceCount--;
          }
          if (braceCount === 0 && k > priceRangeStart) {
            priceRangeEnd = k;
            break;
          }
          k++;
        }
        break;
      }
    }
  }
  
  if (priceRangeStart >= 0 && priceRangeEnd >= 0) {
    console.log(`Price range block: lines ${priceRangeStart + 1} - ${priceRangeEnd + 1}`);
    lines.splice(priceRangeEnd + 1, 0, ...catBlock);
    changes.push('Inserted category chips AFTER price range block');
  } else {
    // Fallback: insert before sponsored section
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('if (state.sponsored.isNotEmpty())')) {
        lines.splice(i, 0, ...catBlock);
        changes.push('Inserted category chips before sponsored section');
        break;
      }
    }
  }
}

// ===== Step 3: Convert quick filter LazyRow to FlowRow =====
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('val qFilters = listOf(')) {
    // Find LazyRow
    let lazyRowStart = i;
    while (lazyRowStart >= 0 && !lines[lazyRowStart].includes('LazyRow(')) lazyRowStart--;
    
    if (lazyRowStart >= 0) {
      // Find item {
      let itemStart = lazyRowStart;
      while (itemStart >= 0 && !lines[itemStart].trim().startsWith('item')) itemStart--;
      
      if (itemStart >= 0 && itemStart < lazyRowStart) {
        let braceCount = 0;
        let itemEnd = itemStart;
        while (itemEnd < lines.length) {
          for (let ch of lines[itemEnd]) {
            if (ch === '{') braceCount++;
            else if (ch === '}') braceCount--;
          }
          if (braceCount === 0 && itemEnd > itemStart) break;
          itemEnd++;
        }
        
        if (itemEnd < lines.length) {
          const indent = lines[itemStart].match(/^(\s*)/)[1];
          const ind2 = indent + '    ';
          const ind3 = ind2 + '    ';
          const ind4 = ind3 + '    ';
          const ind5 = ind4 + '    ';
          
          // Extract the qFilter items from the list
          const filterItems = [];
          for (let j = lazyRowStart; j < itemEnd; j++) {
            const trimmed = lines[j].trim();
            if (trimmed.startsWith('"Under ₹500"') || trimmed.startsWith('"Under ₹1000"') || 
                trimmed.startsWith('"Trending"') || trimmed.startsWith('"New Arrivals"') ||
                trimmed.startsWith('"Latest 10"') || trimmed.startsWith('"Latest 50"') ||
                trimmed.startsWith('"Most Viewed"')) {
              filterItems.push(trimmed);
            }
          }
          
          // Build FlowRow block
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
  if (lines[i].includes('val timeOptions = listOf<Pair<String?, String>>(')) {
    let lazyRowStart = i;
    while (lazyRowStart >= 0 && !lines[lazyRowStart].includes('LazyRow(')) lazyRowStart--;
    
    if (lazyRowStart >= 0) {
      let itemStart = lazyRowStart;
      while (itemStart >= 0 && !lines[itemStart].trim().startsWith('item')) itemStart--;
      
      if (itemStart >= 0) {
        let braceCount = 0;
        let itemEnd = itemStart;
        while (itemEnd < lines.length) {
          for (let ch of lines[itemEnd]) {
            if (ch === '{') braceCount++;
            else if (ch === '}') braceCount--;
          }
          if (braceCount === 0 && itemEnd > itemStart) break;
          itemEnd++;
        }
        
        if (itemEnd < lines.length) {
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
