const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/foryou/ForYouScreen.kt');
let code = fs.readFileSync(filePath, 'utf-8');

// ============================================================
// CHANGE 1: Move search bar outside LazyColumn (inside Scaffold content)
// ============================================================

// Replace the Scaffold content start — wrap in Column, add search bar
const oldScaffoldContent = `    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {`;

const newScaffoldContent = `    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            // Search bar — always visible below top bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    singleLine = true,
                    placeholder = { Text(stringResource(R.string.foryou_search_placeholder), style = MaterialTheme.typography.bodyMedium) },
                    leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp)) },
                    trailingIcon = {
                        if (searchQuery.isNotBlank()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Close, null, modifier = Modifier.size(18.dp))
                            }
                        }
                    },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { }),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f).height(48.dp),
                    textStyle = MaterialTheme.typography.bodyMedium,
                )
            }
            PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize(),
            ) {`;

if (!code.includes(oldScaffoldContent)) {
    console.error('ERROR: Could not find oldScaffoldContent pattern');
    process.exit(1);
}
code = code.replace(oldScaffoldContent, newScaffoldContent);

// ============================================================
// CHANGE 2: Close the new Column wrapper (add before last })
// ============================================================
// After the PullToRefreshBox closing, we need to close the Column wrapper.
// The PullToRefreshBox ends with: `}` to close the when block, then `}` for the PullToRefreshBox.
// We need to add `}` after the PullToRefreshBox closes to close the Column.

// Find the end of the file where AiSectionHeader starts, and add Column closing
// The last closing `}` before `private fun AiSectionHeader` closes the Scaffold
// We need to add `}` to close the Column before that.

const oldEndSection = `    }
}

/* ── AI Section header ───────────────────────────────────────────────────── */`;

const newEndSection = `    }
    } // close Column wrapper
}

/* ── AI Section header ───────────────────────────────────────────────────── */`;

if (!code.includes(oldEndSection)) {
    console.error('ERROR: Could not find oldEndSection pattern');
    process.exit(1);
}
code = code.replace(oldEndSection, newEndSection);

// ============================================================
// CHANGE 3: Replace scattered filter items with sticky header
// ============================================================

// Find the section from the LazyColumn items start (after `// Hero gradient section`)
// through to the end of `itemsIndexed(categories)` + the sponsored section

const oldLazyItemsStart = `                    // Hero gradient section (web parity: AllPostsFeedHeader)
                    item(key = \"for_you_hero\") {`;

const newStickyHeaderStart = `                    // Sticky header: sort chips + categories (AllPosts parity)
                    stickyHeader(key = \"sticky_filters\") {
                        Surface(
                            color = MaterialTheme.colorScheme.background,
                            shadowElevation = 2.dp,
                        ) {
                            Column {
                                // For You sort options in a wrapping FlowRow — all buttons visible
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    FlowRow(
                                        modifier = Modifier.weight(1f),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalArrangement = Arrangement.spacedBy(6.dp),
                                    ) {
                                        val forYouSortOptions = listOf(
                                            SortBy.RELEVANCE to \"✨ Relevance\",
                                            SortBy.NEWEST to \"🕒 Newest\",
                                            SortBy.OLDEST to \"🔄 Oldest\",
                                            SortBy.POPULAR to \"🔥 Popular\",
                                            SortBy.MOST_VIEWED to \"👁 Most Viewed\",
                                            SortBy.TRENDING to \"📈 Trending\",
                                            SortBy.PRICE_ASC to \"💰 Price ↑\",
                                            SortBy.PRICE_DESC to \"💰 Price ↓\",
                                        )
                                        forYouSortOptions.forEach { (sort, label) ->
                                            FilterChip(
                                                selected = state.sortBy == sort,
                                                onClick = { viewModel.setSortBy(sort) },
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
                                        Icon(if (isGridView) Icons.Default.ViewList else Icons.Default.GridOn, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                                    }
                                }
                                // Categories
                                if (categories.size > 1) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp, vertical = 2.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            \"Categories\",
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
                                    FlowRow(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp, vertical = 6.dp),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalArrangement = Arrangement.spacedBy(6.dp),
                                    ) {
                                        categories.forEach { (key, label) ->
                                            FilterChip(
                                                selected = state.selectedCategory == key,
                                                onClick = { viewModel.setCategory(key) },
                                                label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                                colors = FilterChipDefaults.filterChipColors(
                                                    selectedContainerColor = MaterialTheme.colorScheme.secondary,
                                                    selectedLabelColor = MaterialTheme.colorScheme.onSecondary,
                                                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                                    labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                ),
                                                border = if (state.selectedCategory == key) null else FilterChipDefaults.filterChipBorder(
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

                    // Hero section (AllPosts parity: feed header below filters)
                    item(key = \"for_you_hero\") {`;

if (!code.includes(oldLazyItemsStart)) {
    console.error('ERROR: Could not find oldLazyItemsStart pattern');
    process.exit(1);
}
code = code.replace(oldLazyItemsStart, newStickyHeaderStart);

// ============================================================
// CHANGE 4: Remove the scattered filter items from LazyColumn
// Remove: search bar item (now outside), sort dropdown item, ascending/descending,
// density chips, time window filter, quick filters, price range, categories itemsIndexed
// We keep the hero section, banner, sponsored, AI insight, cards, compare panel
// ============================================================

// Remove the old search bar item inside LazyColumn (it's now outside)
const oldSearchItem = `
                    item {
                        Row(
                            Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text(stringResource(R.string.foryou_search_placeholder), style = MaterialTheme.typography.bodySmall) },
                                leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp)) },
                                trailingIcon = {
                                    if (searchQuery.isNotEmpty()) {
                                        IconButton(onClick = { searchQuery = \"\" }) {
                                            Icon(Icons.Default.Close, null, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                shape = RoundedCornerShape(12.dp),
                            )
                            OutlinedButton(
                                onClick = { quickFilter = if (quickFilter == \"Trending\") null else \"Trending\" },
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 14.dp),
                            ) {
                                Icon(Icons.Default.FilterList, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(\"Filter\", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }`;

if (code.includes(oldSearchItem)) {
    code = code.replace(oldSearchItem, '');
    console.log('Removed old search bar item');
} else {
    console.log('WARN: Could not find oldSearchItem pattern');
}

// Remove the sort dropdown item (items count + sort dropdown)
// Match from `item { Row( modifier = Modifier... ` with items count to the closing `}` before ascending/descending
const oldSortDropdown = `
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                \"\${displayed.size} items · \${categories.count { (catKey, catName) -> catKey == null || state.posts.any { p -> p.categoryName?.contains(catName, ignoreCase = true) == true } }} categories · 🔥 Live\",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.weight(1f)
                            )
                            Box {
                                val sortLabel = when (state.sortBy) {
                                    SortBy.RELEVANCE -> \"✨ Relevance\"
                                    SortBy.PRICE_ASC -> \"💰 Price ↑\"
                                    SortBy.PRICE_DESC -> \"💰 Price ↓\"
                                    SortBy.NEWEST -> \"🕒 Newest\"
                                    SortBy.OLDEST -> \"🔄 Oldest\"
                                    SortBy.POPULAR -> \"👁 Popular\"
                                    SortBy.TRENDING -> \"🔥 Trending\"
                                    SortBy.MOST_VIEWED -> \"👁 Most Viewed\"
                                    SortBy.FEATURED_FIRST -> \"⭐ Featured First\"
                                    SortBy.PREMIUM_FIRST -> \"💎 Premium First\"
                                }
                                FilterChip(
                                    selected = state.sortBy != SortBy.RELEVANCE,
                                    onClick = { sortMenuExpanded = true },
                                    label = { Text(\"Sort: \$sortLabel\", style = MaterialTheme.typography.labelSmall) },
                                    trailingIcon = { Icon(Icons.Default.ArrowDropDown, null, modifier = Modifier.size(16.dp)) }
                                )
                                DropdownMenu(expanded = sortMenuExpanded, onDismissRequest = { sortMenuExpanded = false }) {
                                    listOf(
                                        SortBy.RELEVANCE to \"✨ Relevance\",
                                        SortBy.PRICE_ASC to \"🔥 Price: Low to High\",
                                        SortBy.PRICE_DESC to \"🔥 Price: High to Low\",
                                        SortBy.NEWEST to \"🕒 Newest First\",
                                        SortBy.OLDEST to \"🔄 Oldest First\",
                                        SortBy.POPULAR to \"👁 Most Popular\",
                                        SortBy.TRENDING to \"🔥 Trending\",
                                        SortBy.MOST_VIEWED to \"👁 Most Viewed\",
                                        SortBy.FEATURED_FIRST to \"⭐ Featured First\",
                                        SortBy.PREMIUM_FIRST to \"💎 Premium First\",
                                    ).forEach { (sort, label) ->
                                        DropdownMenuItem(
                                            text = { Text(label) },
                                            onClick = {
                                                viewModel.setSortBy(sort)
                                                sortMenuExpanded = false
                                            },
                                            leadingIcon = { if (state.sortBy == sort) Icon(Icons.Default.Check, null) }
                                        )
                                    }
                                }
                            }
                        }
                    }`;

if (code.includes(oldSortDropdown)) {
    code = code.replace(oldSortDropdown, '');
    console.log('Removed sort dropdown item');
} else {
    console.log('WARN: Could not find oldSortDropdown pattern');
}

// Remove ascending/descending + density chips item
const oldAscDesc = `
                    item {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = state.sortAscending,
                                onClick = { if (!state.sortAscending) viewModel.toggleSortDirection() },
                                label = { Text(stringResource(R.string.foryou_ascending), style = MaterialTheme.typography.labelSmall) },
                                leadingIcon = { Icon(Icons.Default.ArrowUpward, null, modifier = Modifier.size(14.dp)) }
                            )
                            FilterChip(
                                selected = !state.sortAscending,
                                onClick = { if (state.sortAscending) viewModel.toggleSortDirection() },
                                label = { Text(stringResource(R.string.foryou_descending), style = MaterialTheme.typography.labelSmall) },
                                leadingIcon = { Icon(Icons.Default.ArrowDownward, null, modifier = Modifier.size(14.dp)) }
                            )
                            Spacer(Modifier.weight(1f))
                            FilterChip(
                                selected = density == PageDensity.COMPACT,
                                onClick = { density = PageDensity.COMPACT },
                                label = { Text(stringResource(R.string.foryou_compact), style = MaterialTheme.typography.labelSmall) }
                            )
                            FilterChip(
                                selected = density == PageDensity.NORMAL,
                                onClick = { density = PageDensity.NORMAL },
                                label = { Text(stringResource(R.string.foryou_normal), style = MaterialTheme.typography.labelSmall) }
                            )
                            FilterChip(
                                selected = density == PageDensity.SPACIOUS,
                                onClick = { density = PageDensity.SPACIOUS },
                                label = { Text(stringResource(R.string.foryou_spacious), style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }`;

if (code.includes(oldAscDesc)) {
    code = code.replace(oldAscDesc, '');
    console.log('Removed ascending/descending + density chips');
} else {
    console.log('WARN: Could not find oldAscDesc pattern');
}

// Remove time window filter
const oldTimeFilter = `
                    // --- Time Window Filter ---
                    item {
                        @OptIn(ExperimentalLayoutApi::class)
                        FlowRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            val timeOptions = listOf<Pair<String?, String>>(
                                null to \"All Time\",
                                \"Today\" to \"Today\",
                                \"Week\" to \"This Week\",
                                \"Month\" to \"This Month\",
                            )
                            timeOptions.forEach { (key, label) ->
                                FilterChip(
                                    selected = timeFilter == key,
                                    onClick = { timeFilter = if (timeFilter == key && key != null) null else key },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.secondaryContainer,
                                        selectedLabelColor = MaterialTheme.colorScheme.onSecondaryContainer,
                                    ),
                                )
                            }
                        }
                    }`;

if (code.includes(oldTimeFilter)) {
    code = code.replace(oldTimeFilter, '');
    console.log('Removed time window filter');
} else {
    console.log('WARN: Could not find oldTimeFilter pattern');
}

// Remove quick filter chips
const oldQuickFilters = `
                    // ─── Quick Filter Chips ────────────────────────────
                    item {
                        @OptIn(ExperimentalLayoutApi::class)
                        FlowRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            val qFilters = listOf(
                                \"Under ₹500\" to Icons.Default.LocalOffer,
                                \"Under ₹1000\" to Icons.Default.LocalOffer,
                                \"Trending\" to Icons.AutoMirrored.Filled.TrendingUp,
                                \"New Arrivals\" to Icons.Default.NewReleases,
                                \"Latest 10\" to Icons.Default.FilterList,
                                \"Latest 50\" to Icons.Default.FilterList,
                                \"Most Viewed\" to Icons.Default.Visibility,
                            )
                            qFilters.forEach { (label, icon) ->
                                FilterChip(
                                    selected = quickFilter == label,
                                    onClick = { quickFilter = if (quickFilter == label) null else label },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    leadingIcon = { Icon(icon, null, modifier = Modifier.size(14.dp)) },
                                    colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.tertiary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onTertiary,
                                    selectedLeadingIconColor = MaterialTheme.colorScheme.onTertiary,
                                    ),
                                )
                            }
                            if (quickFilter != null || timeFilter != null || minPrice.isNotBlank() || maxPrice.isNotBlank() || verifiedOnly || searchQuery.isNotBlank()) {
                                FilterChip(
                                    selected = false,
                                    onClick = { quickFilter = null; timeFilter = null; minPrice = \"\"; maxPrice = \"\"; verifiedOnly = false; searchQuery = \"\" },
                                    label = { Text(\"✕ Clear\", style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                                )
                            }
                        }
                    }`;

if (code.includes(oldQuickFilters)) {
    code = code.replace(oldQuickFilters, '');
    console.log('Removed quick filter chips');
} else {
    console.log('WARN: Could not find oldQuickFilters pattern');
}

// Remove price range + verified filter
const oldPriceRange = `
                    // Price range & verified filter (web parity)
                    item {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            OutlinedTextField(
                                value = minPrice,
                                onValueChange = { minPrice = it.filter { c -> c.isDigit() || c == '.' } },
                                label = { Text(\"Min ₹\") },
                                modifier = Modifier.weight(1f).height(52.dp),
                                textStyle = MaterialTheme.typography.bodySmall,
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            )
                            OutlinedTextField(
                                value = maxPrice,
                                onValueChange = { maxPrice = it.filter { c -> c.isDigit() || c == '.' } },
                                label = { Text(\"Max ₹\") },
                                modifier = Modifier.weight(1f).height(52.dp),
                                textStyle = MaterialTheme.typography.bodySmall,
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            )
                            FilterChip(
                                selected = verifiedOnly,
                                onClick = { verifiedOnly = !verifiedOnly },
                                label = { Text(\"Verified\", style = MaterialTheme.typography.labelSmall) },
                                leadingIcon = { Icon(Icons.Default.Verified, null, modifier = Modifier.size(14.dp)) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,
                                ),
                            )
                        }
                    }

                            itemsIndexed(categories) { idx, (key, label) ->
                                FilterChip(
                                    selected = state.selectedCategory == key,
                                    onClick = { viewModel.setCategory(key) },
                                    label = { Text(label) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }`;

if (code.includes(oldPriceRange)) {
    code = code.replace(oldPriceRange, '');
    console.log('Removed price range + categories itemsIndexed');
} else {
    console.log('WARN: Could not find oldPriceRange pattern');
}

// ============================================================
// Remove unused variables that are no longer needed
// Note: We keep the state variables but remove the ones only used by removed sections
// density and sortMenuExpanded might still be referenced elsewhere, check first
// ============================================================

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Done! Changes applied successfully.');
