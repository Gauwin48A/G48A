const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');

// Find the stickyHeader section and swap the order of sortOptions and subcategories

// Old pattern: sortOptions FlowRow first, then subcategories section
const oldSortFirst = `                Column {
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        sortOptions.forEach { (key, label) ->
                            val isSelected = state.sortBy == key
                            FilterChip(selected = isSelected, onClick = { onSetSort(key) }, label = { Text(label, style = MaterialTheme.typography.labelSmall) }, colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.White), shape = RoundedCornerShape(20.dp))
                        }
                        // Grid/List view toggle (web parity)
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

// New pattern: subcategories first, then sortOptions FlowRow below
const newSubcatFirst = `                Column {
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
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        sortOptions.forEach { (key, label) ->
                            val isSelected = state.sortBy == key
                            FilterChip(selected = isSelected, onClick = { onSetSort(key) }, label = { Text(label, style = MaterialTheme.typography.labelSmall) }, colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.White), shape = RoundedCornerShape(20.dp))
                        }
                        // Grid/List view toggle (web parity)
                        IconButton(onClick = { isGridView = !isGridView }, modifier = Modifier.size(28.dp)) {
                            Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }`;

if (content.includes(oldSortFirst)) {
    content = content.replace(oldSortFirst, newSubcatFirst);
    console.log('SUCCESS: Swapped sticky header order - subcategories first, sort below');
} else {
    console.log('ERROR: Could not find the sort-first pattern');
    console.log('Searching for alternative...');
    // Try to find a partial match
    const idx = content.indexOf('sortOptions.forEach');
    if (idx >= 0) {
        console.log('Found sortOptions at position', idx);
        console.log('Context around it:', content.substring(Math.max(0, idx-100), Math.min(content.length, idx+100)));
    }
    process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved successfully');
