const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');

// Find the sort options FlowRow and replace with horizontally scrolling row
const oldSortBlock = `                    @OptIn(ExperimentalLayoutApi::class)
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
                    }`;

const newSortBlock = `                    // Sort options in a horizontally scrollable row — all buttons visible
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        androidx.compose.foundation.horizontalScroll(rememberScrollState()).let { scrollModifier ->
                            Row(
                                modifier = Modifier.weight(1f).then(scrollModifier),
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
                        }
                        // Grid/List view toggle
                        Spacer(Modifier.width(4.dp))
                        IconButton(onClick = { isGridView = !isGridView }, modifier = Modifier.size(28.dp)) {
                            Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                        }
                    }`;

if (content.includes(oldSortBlock)) {
    content = content.replace(oldSortBlock, newSortBlock);
    console.log('SUCCESS: Sort options changed to horizontally scrollable row');
} else {
    console.log('ERROR: Could not find old sort block');
    // Try alternative - maybe the indentation or content is slightly different
    const idx = content.indexOf('sortOptions.forEach');
    if (idx >= 0) {
        console.log('Found sortOptions.forEach at char position', idx);
        // Show context
        console.log('Context:');
        console.log(content.substring(Math.max(0, idx-300), idx+200));
    }
    process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved');
