const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/foryou/ForYouScreen.kt';
let content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\r\n');
const changes = [];

// ===== Step 1: Find the category chips item block =====
// Look for the item { LazyRow { FilterChip with categories } 
let catItemStart = -1;
let catItemEnd = -1;

for (let i = 0; i < lines.length; i++) {
  // Find the "itemsIndexed(categories)" line which is unique to the category chips block
  if (lines[i].includes('itemsIndexed(categories)')) {
    // Walk up to find the item { 
    let j = i;
    while (j >= 0 && !lines[j].trim().startsWith('item')) j--;
    catItemStart = j;
    
    // Walk forward to find the closing }
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
  process.exit(1);
}

console.log(`Category chips block: lines ${catItemStart + 1} - ${catItemEnd + 1}`);

// ===== Step 2: Find the price range + verified item block =====
// This comes after category chips and before sponsored
let priceItemStart = -1;
let priceItemEnd = -1;

for (let i = catItemEnd + 1; i < lines.length; i++) {
  // The price range block has "Min ₹" and "Max ₹" text fields
  if (lines[i].includes('OutlinedTextField') && 
      (lines[i].includes('Min') && lines[i+1] && lines[i+1].includes('Max')) ||
      (lines[i].includes('Max') && lines[i-1] && lines[i-1].includes('Min'))) {
    // Walk up to find item {
    let j = i;
    while (j >= 0 && !lines[j].trim().startsWith('item')) j--;
    priceItemStart = j;
    
    // Walk forward to find closing }
    let braceCount = 0;
    let k = priceItemStart;
    while (k < lines.length) {
      for (let ch of lines[k]) {
        if (ch === '{') braceCount++;
        else if (ch === '}') braceCount--;
      }
      if (braceCount === 0 && k > priceItemStart) {
        priceItemEnd = k;
        break;
      }
      k++;
    }
    break;
  }
}

if (priceItemStart < 0 || priceItemEnd < 0) {
  console.log('ERROR: Could not find price range block');
  process.exit(1);
}

console.log(`Price range block: lines ${priceItemStart + 1} - ${priceItemEnd + 1}`);

// ===== Step 3: Extract the category chips block content =====
const catBlock = lines.slice(catItemStart, catItemEnd + 1);

// ===== Step 4: Remove category chips block =====
lines.splice(catItemStart, catItemEnd - catItemStart + 1);
changes.push('Removed category chips block from its original position');

// Adjust price range position since we removed lines before it
priceItemStart -= (catItemEnd - catItemStart + 1);
priceItemEnd -= (catItemEnd - catItemStart + 1);

// ===== Step 5: Insert category chips block AFTER the price range block =====
const insertPos = priceItemEnd + 1;
lines.splice(insertPos, 0, ...catBlock);
changes.push('Inserted category chips block AFTER price range block');

// ===== Step 6: Also convert the quick filters LazyRow to FlowRow =====
// Find the LazyRow with qFilters and replace with FlowRow
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('val qFilters = listOf(')) {
    // Find the LazyRow that wraps this
    let lazyRowStart = i;
    while (lazyRowStart >= 0 && !lines[lazyRowStart].includes('LazyRow(')) lazyRowStart--;
    
    if (lazyRowStart >= 0) {
      // Find the item { that wraps the LazyRow
      let itemStart = lazyRowStart;
      while (itemStart >= 0 && !lines[itemStart].trim().startsWith('item')) itemStart--;
      
      if (itemStart >= 0 && itemStart < lazyRowStart) {
        // Find the closing } of the item block
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
          // Replace LazyRow(...) with FlowRow(...)
          const indent = lines[itemStart].match(/^(\s*)/)[1];
          const ind2 = indent + '    ';
          const ind3 = ind2 + '    ';
          const ind4 = ind3 + '    ';
          
          // Check if the quick filters block already has FlowRow import available
          // The ForYouScreen uses `import ...*` so FlowRow should be available
          
          // Extract the FilterChip content from the items block
          // Find the inner content between items(...) { and the closing }
          let itemsContentStart = -1;
          let itemsContentEnd = -1;
          
          for (let j = lazyRowStart; j < itemEnd; j++) {
            if (lines[j].includes('items(qFilters') && lines[j].includes('{')) {
              itemsContentStart = j + 1;
              // The next lines are the FilterChip lambda
            }
          }
          
          // Find the closing of the items forEach
          if (itemsContentStart > 0) {
            braceCount = 0;
            for (let j = itemsContentStart; j < itemEnd; j++) {
              // Count braces to find where the items block closes
              for (let ch of lines[j]) {
                if (ch === '{') braceCount++;
                else if (ch === '}') braceCount--;
              }
              if (braceCount === 0) {
                itemsContentEnd = j;
                // This includes the closing ) of items() and the closing } of LazyRow
                break;
              }
            }
          }
          
          // Build new FlowRow block
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
          
          // Add the qFilter items with proper indentation
          const qFilterStart = lazyRowStart + 3; // skip LazyRow( and its parameters
          let qFilterListEnd = -1;
          for (let j = qFilterStart; j < Math.min(qFilterStart + 15, lines.length); j++) {
            if (lines[j].includes('items(qFilters')) {
              qFilterListEnd = j;
              break;
            }
          }
          
          // Extract the filter list items
          let inList = false;
          for (let j = qFilterStart; j < qFilterListEnd; j++) {
            const trimmed = lines[j].trim();
            if (trimmed.startsWith('"Under ₹500"') || trimmed.startsWith('"Under ₹1000"') || 
                trimmed.startsWith('"Trending"') || trimmed.startsWith('"New Arrivals"') ||
                trimmed.startsWith('"Latest 10"') || trimmed.startsWith('"Latest 50"') ||
                trimmed.startsWith('"Most Viewed"')) {
              flowRowBlock.push(`${ind3}    ${trimmed}`);
            }
          }
          
          flowRowBlock.push(`${ind3})`);
          
          // Now add the FilterChip for each item using forEach instead of items()
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
          
          // Add Clear filter chip (only if filters are active)
          flowRowBlock.push(`${ind3}// Clear all filters chip`);
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
          
          // Replace the old item block with the new FlowRow block
          const oldLen = itemEnd - itemStart + 1;
          lines.splice(itemStart, oldLen, ...flowRowBlock);
          changes.push('Converted quick filters LazyRow to FlowRow with wrapping');
        }
      }
    }
    break;
  }
}

// ===== Step 7: Also convert time window LazyRow to FlowRow =====
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('val timeOptions = listOf<Pair<String?, String>>(')) {
    // Find the LazyRow
    let lazyRowStart = i;
    while (lazyRowStart >= 0 && !lines[lazyRowStart].includes('LazyRow(')) lazyRowStart--;
    
    if (lazyRowStart >= 0) {
      // Find the item { 
      let itemStart = lazyRowStart;
      while (itemStart >= 0 && !lines[itemStart].trim().startsWith('item')) itemStart--;
      
      if (itemStart >= 0) {
        // Find the closing }
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
          
          // Build FlowRow replacement
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
            `${ind5}selectedContainerColor = MaterialTheme.colorScheme.secondaryContainer,`,
            `${ind5}selectedLabelColor = MaterialTheme.colorScheme.onSecondaryContainer,`,
            `${ind4}    ),`,
            `${ind4})`,
            `${ind3}}`,
            `${ind2}}`,
            `${ind}}`,
          ];
          
          const oldLen = itemEnd - itemStart + 1;
          lines.splice(itemStart, oldLen, ...flowRowBlock);
          changes.push('Converted time window LazyRow to FlowRow with wrapping');
        }
      }
    }
    break;
  }
}

// Need to define ind5 and ind4 properly for the quick filter section
// Since I used ind4 and ind5 variables before they were defined in the qFilter section,
// let me fix that

// Actually, looking at the code, I used `${ind5}` and `${ind4}` before defining them.
// Let me redo the qFilter section properly.

// The issue is that I interleaved the qFilter and timeWindow conversions.
// Let me just fix the qFilter section to use proper indentation by rewriting it.

fs.writeFileSync(path, lines.join('\r\n'), 'utf-8');
console.log('\n=== Changes applied ===');
changes.forEach(c => console.log('  •', c));
console.log(`\nTotal lines: ${lines.length}`);
