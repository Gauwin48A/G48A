import re

with open('app/src/main/java/com/zaruda/app/ui/wishlist/WishlistScreen.kt', 'r', encoding='utf-8') as f:
    wishlist_code = f.read()

imports = '''import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.BorderStroke'''
wishlist_code = wishlist_code.replace('import androidx.compose.foundation.layout.Box', imports + '\nimport androidx.compose.foundation.layout.Box')

wishlist_scaffold_replacement = '''    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load() },
            modifier = Modifier.fillMaxSize(),
        ) {
            LazyColumn(
                contentPadding = PaddingValues(bottom = 90.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                // ── Layer 1: Scenic Hero Backdrop ──
                item(key = "wishlist_hero") {
                    WishlistHeroBackdrop()
                }
                
                // ── Layer 2: 32dp Floating Curved Sheet Header ──
                item(key = "curved_sheet_header") {
                    Surface(
                        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                        color = MaterialTheme.colorScheme.background,
                        shadowElevation = 8.dp,
                        modifier = Modifier.fillMaxWidth().offset(y = (-28).dp),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 14.dp, bottom = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Box(modifier = Modifier.size(width = 40.dp, height = 4.dp).clip(RoundedCornerShape(2.dp)).background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f)))
                            Spacer(Modifier.height(10.dp))
                            
                            // 100% Escrow Guarantee Ribbon
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 4.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFF059669).copy(alpha = 0.08f),
                                border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text("🛡️", fontSize = 18.sp)
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "100% Zaruda Escrow Buyer Protection",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = Color(0xFF059669),
                                        )
                                        Text(
                                            text = "Safe payments held in escrow until delivery inspection",
                                            fontSize = 10.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }

                            // Search bar
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text("Search your saved items...") },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                trailingIcon = {
                                    if (searchQuery.isNotBlank()) {
                                        IconButton(onClick = { searchQuery = "" }) {
                                            Icon(Icons.Default.Close, contentDescription = "Clear")
                                        }
                                    }
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(16.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                                    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                                ),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                            )
                            // Sort chips
                            Row(
                                modifier = Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                WishlistSort.entries.forEach { option ->
                                    FilterChip(
                                        selected = sortBy == option,
                                        onClick = { sortBy = option },
                                        label = { Text(option.label, style = MaterialTheme.typography.labelMedium) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        ),
                                    )
                                }
                            }
                            // Status filter chips
                            Row(
                                modifier = Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                val statusOptions = listOf("all" to "All", "active" to "Active", "sold" to "Sold", "inactive" to "Inactive")
                                statusOptions.forEach { (key, label) ->
                                    FilterChip(
                                        selected = statusFilter == key,
                                        onClick = { statusFilter = key },
                                        label = { Text(label, style = MaterialTheme.typography.labelMedium) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.tertiary,
                                            selectedLabelColor = MaterialTheme.colorScheme.onTertiary,
                                        ),
                                    )
                                }
                            }
                        }
                    }
                }

                when {
                    state.loading -> {
                        item(key = "loading") {
                            ListShimmer(count = 6, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                        }
                    }
                    state.error != null && state.items.isEmpty() -> {
                        item(key = "error") {
                            Box(
                                Modifier.fillMaxWidth().padding(vertical = 64.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                AppErrorState(
                                    title = "Wishlist unavailable",
                                    message = state.error ?: "Unable to load wishlist",
                                    onRetry = { viewModel.load() },
                                    retryLabel = "Retry",
                                )
                            }
                        }
                    }
                    state.items.isEmpty() -> {
                        item(key = "empty_all") {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 64.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                AppEmptyState(
                                    icon = Icons.Default.Bookmark,
                                    title = if (categoryKey != null) "No items saved in this category" else "Nothing saved yet",
                                    subtitle = if (categoryKey != null)
                                        "Items you save in ${categoryKey.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }} will appear here."
                                    else
                                        "Tap the save icon on listings to add them here.",
                                )
                            }
                        }
                    }
                    filteredItems.isEmpty() -> {
                        item(key = "empty_filtered") {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 64.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                AppEmptyState(
                                    icon = Icons.Default.Search,
                                    title = "No items match",
                                    subtitle = "Try adjusting your filters.",
                                )
                            }
                        }
                    }
                    gridMode -> {
                        item(key = "grid_content") {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 12.dp, end = 12.dp, top = 4.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                filteredItems.chunked(2).forEach { row ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        row.forEach { post ->
                                            Box(modifier = Modifier.weight(1f)) {
                                                WishlistGridCard(
                                                    post = post,
                                                    onOpen = { onOpenPost(post.stableId) },
                                                    onRemove = { removeConfirmId = post.stableId },
                                                )
                                            }
                                        }
                                        if (row.size == 1) Spacer(modifier = Modifier.weight(1f))
                                    }
                                }
                            }
                        }
                    }
                    else -> {
                        items(filteredItems, key = { it.stableId }) { post ->
                            SwipeToAction(
                                onSwipeLeft = { removeConfirmId = post.stableId },
                                onSwipeRight = { viewModel.addToCart(post.stableId) },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            ) {
                                WishlistListCard(
                                    post = post,
                                    onOpen = { onOpenPost(post.stableId) },
                                    onRemove = { removeConfirmId = post.stableId },
                                    onAddToCart = { viewModel.addToCart(post.stableId) },
                                    onTogglePriceAlert = { enabled -> viewModel.togglePriceAlert(post.stableId, enabled) },
                                    isMultiSelectMode = state.isMultiSelectMode,
                                    isSelected = post.stableId in state.selectedItems,
                                    onToggleSelect = { viewModel.toggleItemSelection(post.stableId) },
                                )
                            }
                        }
                    }
                }
            }
        }

        if (state.isMultiSelectMode && state.selectedItems.isNotEmpty()) {
            androidx.compose.material3.ExtendedFloatingActionButton(
                text = { Text("Add ${state.selectedItems.size} to Cart") },
                icon = { Icon(Icons.Default.ShoppingCart, contentDescription = null) },
                onClick = { viewModel.bulkAddToCart() },
                containerColor = MaterialTheme.colorScheme.primary,
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 16.dp)
            )
        }

        // ── Layer 3: Pinned Floating Glassmorphic Top Bar ──
        WishlistFloatingTopBar(
            title = if (state.isMultiSelectMode) "Select Items" else "Saved",
            subtitle = if (state.isMultiSelectMode && state.selectedItems.isNotEmpty()) {
                "${state.selectedItems.size} selected"
            } else if (state.items.isNotEmpty()) {
                val displayCount = if (categoryKey != null) filteredItems.size else state.items.size
                "$displayCount item${if (displayCount != 1) "s" else ""}"
            } else null,
            onBack = {
                if (state.isMultiSelectMode) {
                    viewModel.toggleMultiSelect()
                } else {
                    onBack()
                }
            },
            isMultiSelectMode = state.isMultiSelectMode,
            hasItems = state.items.isNotEmpty(),
            gridMode = gridMode,
            onToggleMultiSelect = { viewModel.toggleMultiSelect() },
            onSelectAll = { viewModel.selectAll() },
            onClearSelection = { viewModel.clearSelection() },
            onToggleGrid = { gridMode = !gridMode }
        )
    }'''

wishlist_hero = '''

@Composable
private fun WishlistHeroBackdrop() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
    ) {
        AsyncImage(
            model = "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=80",
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF0F172A).copy(alpha = 0.40f),
                            Color(0xFF0F172A).copy(alpha = 0.85f),
                        )
                    )
                )
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 20.dp, vertical = 24.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF059669).copy(alpha = 0.35f),
                border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.6f)),
                modifier = Modifier.padding(bottom = 6.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF22C55E)))
                    Text(
                        text = "100% ESCROW ASSURED",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }
            Text(
                text = "Your Wishlist 💖",
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = "Save your favorite items for later",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

@Composable
private fun WishlistFloatingTopBar(
    title: String,
    subtitle: String?,
    onBack: () -> Unit,
    isMultiSelectMode: Boolean,
    hasItems: Boolean,
    gridMode: Boolean,
    onToggleMultiSelect: () -> Unit,
    onSelectAll: () -> Unit,
    onClearSelection: () -> Unit,
    onToggleGrid: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(24.dp),
        color = Color(0xFF0F172A).copy(alpha = 0.85f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.15f)),
        shadowElevation = 8.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.size(34.dp)
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(Modifier.width(8.dp))
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color.White.copy(alpha = 0.12f),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = title,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                    if (subtitle != null) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF10B981).copy(alpha = 0.2f),
                        ) {
                            Text(
                                text = subtitle,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF10B981),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.weight(1f))
            
            if (isMultiSelectMode) {
                TextButton(onClick = onSelectAll) {
                    Text("Select All", style = MaterialTheme.typography.labelMedium, color = Color.White)
                }
                TextButton(onClick = onClearSelection) {
                    Text("Clear", style = MaterialTheme.typography.labelMedium, color = Color.White)
                }
            } else {
                if (hasItems) {
                    IconButton(onClick = onToggleMultiSelect, modifier = Modifier.size(34.dp)) {
                        Icon(Icons.Default.CheckCircle, contentDescription = "Multi-select", tint = Color.White, modifier = Modifier.size(20.dp))
                    }
                }
                IconButton(onClick = onToggleGrid, modifier = Modifier.size(34.dp)) {
                    Icon(
                        imageVector = if (gridMode) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                        contentDescription = "Toggle view",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
'''

pattern = re.compile(r'    Scaffold\([\s\S]*?^    \}', re.MULTILINE)
wishlist_code = pattern.sub(wishlist_scaffold_replacement, wishlist_code)
wishlist_code += wishlist_hero

with open('app/src/main/java/com/zaruda/app/ui/wishlist/WishlistScreen.kt', 'w', encoding='utf-8') as f:
    f.write(wishlist_code)
