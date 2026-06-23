const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt';
let content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\r\n');
const changes = [];

// ===== STEP 1: Replace sort chips LazyRow with FlowRow =====
let sortChipsItemStart = -1;
let sortChipsItemEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('item {') && i + 1 < lines.length && lines[i + 1].includes('LazyRow(')) {
    let foundSortEntries = false;
    let j = i + 2;
    while (j < lines.length && j < i + 20) {
      if (lines[j].includes('items(SortOption.entries')) {
        foundSortEntries = true;
        break;
      }
      j++;
    }
    if (foundSortEntries) {
      sortChipsItemStart = i;
      let braceCount = 0;
      let k = i;
      while (k < lines.length) {
        for (let ch of lines[k]) {
          if (ch === '{') braceCount++;
          else if (ch === '}') braceCount--;
        }
        if (braceCount === 0 && k > i) {
          sortChipsItemEnd = k;
          break;
        }
        k++;
      }
      break;
    }
  }
}

if (sortChipsItemStart >= 0 && sortChipsItemEnd >= 0) {
  const indent = lines[sortChipsItemStart].match(/^(\s*)/)[1];
  const ind2 = indent + '    ';
  const ind3 = ind2 + '    ';
  
  const flowRowBlock = [
    `${indent}// Sort chips — all visible with FlowRow wrapping`,
    `${indent}item {`,
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
    `${indent}}`,
  ];
  
  const sortChipsContent = [...flowRowBlock];
  const oldLen = sortChipsItemEnd - sortChipsItemStart + 1;
  console.log(`Found sort chips block at lines ${sortChipsItemStart + 1}-${sortChipsItemEnd + 1}`);
  
  lines.splice(sortChipsItemStart, oldLen);
  changes.push('Replaced sort chips LazyRow with FlowRow');
  
  // ===== STEP 2: Move sort chips ABOVE subcategories =====
  let subcatCommentIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// Subcategory chips (category app) or category chips (all-posts)')) {
      subcatCommentIdx = i;
      break;
    }
  }
  
  if (subcatCommentIdx >= 0) {
    lines.splice(subcatCommentIdx, 0, ...sortChipsContent);
    changes.push('Moved sort chips ABOVE subcategories block');
  } else {
    changes.push('WARNING: Could not find subcategories comment');
  }
} else {
  changes.push('ERROR: Could not find sort chips block');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('item {') && lines[i + 1] && lines[i + 1].includes('LazyRow(')) {
      console.log(`  Found item+LazyRow at line ${i + 1}:`);
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        console.log(`    ${j + 1}: ${lines[j].trim()}`);
      }
    }
  }
}

fs.writeFileSync(path, lines.join('\r\n'), 'utf-8');
console.log('\n=== Changes applied ===');
changes.forEach(c => console.log('  •', c));
console.log(`\nTotal lines: ${lines.length}`);
