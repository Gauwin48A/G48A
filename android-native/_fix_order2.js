const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');

// Find the current sticky header Column block (subcategories first, then sort)
// and replace it with: sort first (horizontal scroll), then subcategories below

const oldSubcatFirst = `                Column {
                    if (ecosystemSubcategories.isNotEmpty()) {
                        // Subcategories section header
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Categories",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(end = 8.dp),
                            )
                            HorizontalDivider(
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                            )
                        }
                        // Subcategory chips in a wrapping FlowRow
                        FlowRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            ecosystemSubcategories.forEach { sub ->
                                val isSelected = state.filterSubcategory == sub
                                val emoji = subcategoryEmoji(sub)
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { onSelectSubcategory(sub) },
                                    label = {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(emoji, fontSize = 12.sp)
                                            Text(sub, style = MaterialTheme.typography.labelSmall)
                                        }
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.secondary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onSecondary,
                                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                    ),
                                    border = if (isSelected) null else FilterChipDefaults.filterChipBorder(
                                        borderColor = MaterialTheme.colorScheme.outlineVariant,
                                        enabled = true,
                                        selected = false,
                                    ),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                        // Spacer between subcategories and sort
                        Spacer(Modifier.height(4.dp))
                    }
                    // Sort options in a horizontally scrollable row — all buttons visible
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            sortOptions.forEach { (key, label) ->
                                val isSelected = state.sortBy == key
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { onSetSort(key) },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = Color.White,
                                    ),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                        Spacer(Modifier.width(4.dp))
                        IconButton(onClick = { isGridView = !isGridView }, modifier = Modifier.size(28.dp)) {
                            Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }`;

const newSortFirstAllVisible = `                Column {
                    // Sort options in a horizontally scrollable row — all buttons visible
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            sortOptions.forEach { (key, label) ->
                                val isSelected = state.sortBy == key
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { onSetSort(key) },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = Color.White,
                                    ),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                        Spacer(Modifier.width(4.dp))
                        IconButton(onClick = { isGridView = !isGridView }, modifier = Modifier.size(28.dp)) {
                            Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                    if (ecosystemSubcategories.isNotEmpty()) {
                        // Subcategories section header
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Categories",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(end = 8.dp),
                            )
                            HorizontalDivider(
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                            )
                        }
                        // Subcategory chips in a wrapping FlowRow
                        FlowRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            ecosystemSubcategories.forEach { sub ->
                                val isSelected = state.filterSubcategory == sub
                                val emoji = subcategoryEmoji(sub)
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { onSelectSubcategory(sub) },
                                    label = {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(emoji, fontSize = 12.sp)
                                            Text(sub, style = MaterialTheme.typography.labelSmall)
                                        }
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.secondary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onSecondary,
                                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                    ),
                                    border = if (isSelected) null else FilterChipDefaults.filterChipBorder(
                                        borderColor = MaterialTheme.colorScheme.outlineVariant,
                                        enabled = true,
                                        selected = false,
                                    ),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                    }
                }`;

if (content.includes(oldSubcatFirst)) {
    content = content.replace(oldSubcatFirst, newSortFirstAllVisible);
    console.log('SUCCESS: Reverted to sort-first order with horizontal scroll - all buttons visible');
} else {
    console.log('ERROR: Could not find the old subcat-first pattern');
    // Try alternative - find part of it
    const idx = content.indexOf('Subcategory chips in a wrapping FlowRow');
    if (idx >= 0) {
        console.log('Found subcategory section at', idx);
    } else {
        const idx2 = content.indexOf('sortOptions.forEach');
        console.log('Found sortOptions at', idx2);
    }
    process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved');
