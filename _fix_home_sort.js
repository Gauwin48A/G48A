const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt';
let content = fs.readFileSync(path, 'utf-8');
const changes = [];

// 1. Add MOST_VIEWED to SortOption enum
if (!content.includes('MOST_VIEWED')) {
  content = content.replace(
    '    NEWEST("New"),\n    POPULAR("Popular"),\n    PRICE_ASC("Price low-high"),\n    PRICE_DESC("Price high-low"),',
    '    NEWEST("New"),\n    POPULAR("Popular"),\n    MOST_VIEWED("Most Viewed"),\n    PRICE_ASC("Price low-high"),\n    PRICE_DESC("Price high-low"),'
  );
  changes.push('Added MOST_VIEWED to SortOption enum');
}

// 2. Update POPULAR sort and add MOST_VIEWED sort logic
const popLine = 'SortOption.POPULAR -> list.sortedByDescending { it.viewCount ?: 0 }';
if (content.includes(popLine)) {
  content = content.replace(
    popLine,
    'SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }'
  );
  // Now add MOST_VIEWED right after POPULAR
  content = content.replace(
    'SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }\n                    SortOption.PRICE_ASC',
    'SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }\n                    SortOption.MOST_VIEWED -> list.sortedByDescending { it.viewCount ?: 0 }\n                    SortOption.PRICE_ASC'
  );
  changes.push('Updated sort logic: POPULAR = likes+views, added MOST_VIEWED = views');
}

// 3. Replace sort chips LazyRow with FlowRow
const oldSortChips = `                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                        ) {
                            items(SortOption.entries, key = { it.name }) { option ->
                                FilterChip(
                                    selected = sortBy == option,
                                    onClick = { sortBy = option },
                                    label = { Text(option.label, style = MaterialTheme.typography.labelMedium) },
                                    leadingIcon = when (option) {
                                        SortOption.POPULAR -> ({ Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, modifier = Modifier.size(14.dp)) })
                                        SortOption.NEWEST -> ({ Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(14.dp)) })
                                        else -> null
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }`;

const newSortChips = `                    // Sort chips — visible with FlowRow wrapping
                    item {
                        @OptIn(ExperimentalLayoutApi::class)
                        FlowRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            SortOption.entries.forEach { option ->
                                FilterChip(
                                    selected = sortBy == option,
                                    onClick = { sortBy = option },
                                    label = { Text(option.label, style = MaterialTheme.typography.labelSmall) },
                                    leadingIcon = when (option) {
                                        SortOption.POPULAR -> ({ Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, modifier = Modifier.size(12.dp)) })
                                        SortOption.NEWEST -> ({ Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(12.dp)) })
                                        SortOption.MOST_VIEWED -> ({ Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(12.dp)) })
                                        else -> null
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }`;

if (content.includes(oldSortChips)) {
  content = content.replace(oldSortChips, newSortChips);
  changes.push('Replaced sort chips LazyRow with FlowRow');
} else {
  changes.push('Could not find sort chips block (exact match)');
}

// 4. Move sort chips ABOVE subcategories/categories strip
// The subcategories block starts with comment "// Subcategory chips"
const subStart = content.indexOf('// Subcategory chips (category app) or category chips (all-posts)');
if (subStart >= 0) {
  // Find the sort chips block (the one we just added with "// Sort chips")
  const sortComment = '// Sort chips';
  const sortPos = content.indexOf(sortComment, subStart);
  
  if (sortPos >= 0) {
    // Find quick filter chips start (the block after sort chips)
    const qfStart = content.indexOf('// Quick filter chips', subStart);
    const qfStart2 = content.indexOf('// Price filter row', subStart);
    const actualQfStart = (qfStart >= 0 && qfStart < qfStart2) || qfStart2 < 0 ? qfStart : qfStart2;
    
    if (actualQfStart > sortPos) {
      const subBlock = content.substring(subStart, sortPos);
      const sortBlock = content.substring(sortPos, actualQfStart);
      
      if (sortBlock.includes('SortOption')) {
        content = content.substring(0, subStart) + sortBlock + '\n\n' + subBlock + content.substring(actualQfStart);
        changes.push('Moved sort chips ABOVE subcategories block');
      }
    }
  }
}

fs.writeFileSync(path, content, 'utf-8');
console.log('=== Changes applied to HomeScreen.kt ===');
changes.forEach(c => console.log('  •', c));
