const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt');
let content = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');

// The current combined sticky header block (the one we wrote in v1)
const oldStickyHeader = `        stickyHeader(key = "sticky_filters") {
            Surface(
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 2.dp,
            ) {
                Column {
                    if (state.forYouMode) {
                        ForYouRefineToolbar(
                            activeQuickFilter = state.quickFilter,
                            isGridView = isGridView,
                            onSetQuickFilter = onSetQuickFilter,
                            onOpenFilters = onOpenFilters,
                            onToggleGrid = { isGridView = !isGridView },
                        )
                    } else {
                        // Combined sort + categories in one horizontal scroll row
                        val scrollState = rememberScrollState()
                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(scrollState)
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                // Sort chips
                                sortOptions.forEach { (key, label) ->
                                    val selected = state.sortBy == key
                                    FilterChip(
                                        selected = selected,
                                        onClick = { onSetSort(key) },
                                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                        leadingIcon = if (selected) {
                                            { Icon(Icons.Default.Check, null, modifier = Modifier.size(14.dp)) }
                                        } else null,
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                            labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                        ),
                                        shape = RoundedCornerShape(20.dp),
                                    )
                                }
                                // Divider between sort and categories
                                if (ecosystemSubcategories.isNotEmpty()) {
                                    Box(
                                        modifier = Modifier
                                            .width(1.dp)
                                            .height(28.dp)
                                            .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)),
                                    )
                                    // Category chips
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
                            // Thin scroll progress bar
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(3.dp)
                                    .background(Color.Transparent),
                            ) {
                                // Fade-out right edge indicator
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(3.dp)
                                        .background(
                                            Brush.horizontalGradient(
                                                colors = listOf(
                                                    Color.Transparent,
                                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                                                    Color.Transparent,
                                                ),
                                                startX = 0f,
                                                endX = 1000f,
                                            ),
                                        ),
                                )
                            }
                        }
                    }
                }
            }
        }`;

const newStickyHeader = `        stickyHeader(key = "sticky_filters") {
            Surface(
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 2.dp,
            ) {
                Column {
                    if (state.forYouMode) {
                        ForYouRefineToolbar(
                            activeQuickFilter = state.quickFilter,
                            isGridView = isGridView,
                            onSetQuickFilter = onSetQuickFilter,
                            onOpenFilters = onOpenFilters,
                            onToggleGrid = { isGridView = !isGridView },
                        )
                    } else {
                        // Row 1: Sort options (horizontal scroll)
                        val sortScrollState = rememberScrollState()
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(sortScrollState)
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            sortOptions.forEach { (key, label) ->
                                val selected = state.sortBy == key
                                FilterChip(
                                    selected = selected,
                                    onClick = { onSetSort(key) },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    leadingIcon = if (selected) {
                                        { Icon(Icons.Default.Check, null, modifier = Modifier.size(14.dp)) }
                                    } else null,
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                    ),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                        // Row 2: Category chips (horizontal scroll) — only when categories exist
                        if (ecosystemSubcategories.isNotEmpty()) {
                            val catScrollState = rememberScrollState()
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(catScrollState)
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
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
                    }
                }
            }
        }`;

const idx = content.indexOf(oldStickyHeader);
if (idx < 0) {
    console.log('ERROR: Could not find old sticky header in file!');
    // Try to find an alternative
    const searchFor = 'stickyHeader(key = "sticky_filters")';
    const sfIdx = content.indexOf(searchFor);
    if (sfIdx >= 0) {
        console.log(`Found stickyHeader at index ${sfIdx}`);
        // Print the next 500 chars to see what's there
        const snippet = content.substring(sfIdx, sfIdx + 500);
        console.log(`Context: ${snippet}`);
    } else {
        console.log('Could not find stickyHeader at all');
    }
    process.exit(1);
}

content = content.substring(0, idx) + newStickyHeader + content.substring(idx + oldStickyHeader.length);

fs.writeFileSync(FILE, content, 'utf8');

const opens = (content.match(/{/g) || []).length;
const closes = (content.match(/}/g) || []).length;
console.log(`SUCCESS: Sticky header replaced with two separate rows. Lines: ${content.split('\\n').length}. Braces: ${opens}/${closes} (diff=${opens - closes}).`);
