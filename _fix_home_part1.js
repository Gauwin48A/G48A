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
  content = content.replace(popLine,
    'SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }');
  content = content.replace(
    'SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }\n                    SortOption.PRICE_ASC',
    'SortOption.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.viewCount ?: 0) * 2 }\n                    SortOption.MOST_VIEWED -> list.sortedByDescending { it.viewCount ?: 0 }\n                    SortOption.PRICE_ASC'
  );
  changes.push('Updated POPULAR sort, added MOST_VIEWED sort logic');
}

// 3. Add FlowRow + ExperimentalLayoutApi imports
if (!content.includes('import androidx.compose.foundation.layout.ExperimentalLayoutApi')) {
  content = content.replace(
    'import androidx.compose.foundation.layout.fillMaxWidth\nimport androidx.compose.foundation.layout.height',
    'import androidx.compose.foundation.layout.fillMaxWidth\nimport androidx.compose.foundation.layout.ExperimentalLayoutApi\nimport androidx.compose.foundation.layout.FlowRow\nimport androidx.compose.foundation.layout.height'
  );
  changes.push('Added FlowRow/ExperimentalLayoutApi imports');
}

// 4. Replace sort chips LazyRow with FlowRow (keeping same position)
const oldLazyRow = `                    item {
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

const newFlowRow = `                    // Sort chips — visible with FlowRow wrapping
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

if (content.includes(oldLazyRow)) {
  content = content.replace(oldLazyRow, newFlowRow);
  changes.push('Replaced sort chips LazyRow with FlowRow');
} else {
  changes.push('Could not find LazyRow sort chips block');
}

fs.writeFileSync(path, content, 'utf-8');
console.log('=== Changes applied ===');
changes.forEach(c => console.log('  •', c));
