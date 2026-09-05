package com.zaruda.app.ui.wishlist

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.statusBars
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.CartRepository
import com.zaruda.app.data.repository.WishlistRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.ListShimmer
import com.zaruda.app.ui.components.SwipeToAction
import com.zaruda.app.ui.explore.SharedExploreStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/* ── Category-key normalization (single source of truth; imported by all category-scoped screens) ── */

/**
 * Normalizes a raw category string ("Electronics", "e-acc", "Cars") to a canonical
 * marketplace key ("electronics", "fashion", "vehicles", "others").
 * Used so the wishlist's category filter matches the same keys the rest of the app uses.
 */
internal fun normalizeMarketplaceCategoryKey(raw: String?): String {
    val value = raw?.lowercase()?.trim().orEmpty()
    return when {
        value in setOf("electronics", "fashion", "vehicles", "others") -> value
        value.contains("electron") || value.contains("phone") || value.contains("laptop") ||
            value.contains("camera") || value.contains("audio") || value.contains("gadget") -> "electronics"
        value.contains("fashion") || value.contains("cloth") || value.contains("apparel") ||
            value.contains("shoe") || value.contains("bag") || value.contains("watch") -> "fashion"
        value.contains("vehicle") || value.contains("car") || value.contains("bike") ||
            value.contains("motor") || value.contains("cycle") || value.contains("truck") ||
            value.contains("scooter") || value.contains("spare") -> "vehicles"
        else -> "others"
    }
}

data class WishlistState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val items: List<Post> = emptyList(),
    val error: String? = null,
    val selectedItems: Set<String> = emptySet(),
    val isMultiSelectMode: Boolean = false,
)

@HiltViewModel
class WishlistViewModel @Inject constructor(
    private val repo: WishlistRepository,
    private val cartRepo: CartRepository,
    private val wishlistItemDao: com.zaruda.app.data.local.db.WishlistItemDao,
    private val priceAlertsRepo: com.zaruda.app.data.repository.PriceAlertsRepository,
    private val authRepo: com.zaruda.app.data.repository.AuthRepository,
    private val localeManager: com.zaruda.app.core.LocaleManager,
) : ViewModel() {
    private fun findPostById(postId: String): Post? {
        return _state.value.items.find { it.stableId == postId }
            ?: SharedExploreStore.wishlistPosts.find { it.stableId == postId }
    }
    private val _state = MutableStateFlow(WishlistState())
    val state: StateFlow<WishlistState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L
    private var remoteWishlistItems: List<Post> = emptyList()
    private var roomWishlistItems: List<Post> = emptyList()

    private val _categoryFilter = MutableStateFlow<String?>(null)
    val categoryFilter: StateFlow<String?> = _categoryFilter.asStateFlow()
    fun setCategoryFilter(cat: String?) {
        _categoryFilter.value = cat
        syncWishlist(loading = false)
    }

    init {
        loadLocalRoomItems()
        load()
        viewModelScope.launch {
            SharedExploreStore.wishlistFlow.collect {
                syncWishlist(loading = false)
            }
        }
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load() }
                lastLocaleVersion = version
            }
        }
    }

    /** Load Room-persisted wishlist items so saved posts survive restart and appear immediately. */
    private fun loadLocalRoomItems() {
        viewModelScope.launch {
            roomWishlistItems = wishlistItemDao.getAll().map { it.toPost() }
            syncWishlist(loading = false)
        }
    }

    private fun syncWishlist(
        loading: Boolean = _state.value.loading,
        refreshing: Boolean = false,
        error: String? = null,
    ) {
        // Wishlist is category-scoped: when opened from a category app, only that
        // category's saved items are shown — no cross-category items leak in.
        val catFilter = _categoryFilter.value
        // Drop non-matching copies PER SOURCE before the dedupe. Local copies carry the
        // category the user actually interacted with, so a category-scoped wishlist shows
        // the item even when the server's copy lacks or mislabels it (otherwise the card
        // shows a filled bookmark while the wishlist screen hides the item). Matching
        // copies keep the original order so server-fresh status/price still win.
        val matchesCategory: (Post) -> Boolean = { post ->
            catFilter == null ||
                normalizeMarketplaceCategoryKey(post.category) == normalizeMarketplaceCategoryKey(catFilter)
        }
        val mergedItems = (
            remoteWishlistItems.filter(matchesCategory) +
                SharedExploreStore.wishlistPosts.filter(matchesCategory) +
                roomWishlistItems.filter(matchesCategory)
            ).distinctBy { it.stableId }
        _state.value = _state.value.copy(
            loading = loading,
            refreshing = refreshing,
            items = mergedItems,
            error = if (mergedItems.isEmpty()) error else null,
        )
    }

    fun load() {
        _state.value = _state.value.copy(
            loading = _state.value.items.isEmpty() && SharedExploreStore.wishlistPosts.isEmpty(),
            refreshing = _state.value.items.isNotEmpty() || SharedExploreStore.wishlistPosts.isNotEmpty(),
            error = null,
        )
        viewModelScope.launch {
            // Proactively refresh token if needed before API call
            if (authRepo.hasSession && !authRepo.isCurrentlyAuthenticated) {
                authRepo.tryRefreshToken()
            }

            when (val result = repo.list()) {
                is ApiResult.Success -> {
                    remoteWishlistItems = result.data
                    syncWishlist(loading = false)
                }
                is ApiResult.Failure -> {
                    val isAuthError = result.error is com.zaruda.app.core.ApiError.Unauthorized || result.error is com.zaruda.app.core.ApiError.Forbidden
                    if (isAuthError) {
                        if (authRepo.isDemoSession) {
                            // Demo sessions always get 401 — use local data silently
                            syncWishlist(loading = false, error = null)
                            return@launch
                        }
                        // Retry once with fresh token
                        authRepo.tryRefreshToken()
                        when (val retry = repo.list()) {
                            is ApiResult.Success -> {
                                remoteWishlistItems = retry.data
                                syncWishlist(loading = false)
                            }
                            is ApiResult.Failure -> {
                                // Even on auth failure, show local data instead of error
                                syncWishlist(loading = false, error = null)
                            }
                        }
                    } else {
                        // Network/server error — show local data silently
                        syncWishlist(
                            loading = false,
                            error = if (SharedExploreStore.wishlistPosts.isEmpty()) result.error.message else null,
                        )
                    }
                }
            }
        }
    }

    fun remove(postId: String) {
        remoteWishlistItems = remoteWishlistItems.filterNot { it.stableId == postId }
        roomWishlistItems = roomWishlistItems.filterNot { it.stableId == postId }
        SharedExploreStore.removeWishlist(postId)
        syncWishlist(loading = false)
        viewModelScope.launch {
            runCatching { wishlistItemDao.deleteByPostId(postId) }
            repo.remove(postId)
        }
    }
    
    fun toggleMultiSelect() {
        _state.value = _state.value.copy(
            isMultiSelectMode = !_state.value.isMultiSelectMode,
            selectedItems = if (!_state.value.isMultiSelectMode) emptySet() else _state.value.selectedItems,
        )
    }
    
    fun toggleItemSelection(postId: String) {
        val current = _state.value.selectedItems
        _state.value = _state.value.copy(
            selectedItems = if (postId in current) current - postId else current + postId,
        )
    }
    
    fun selectAll() {
        _state.value = _state.value.copy(selectedItems = _state.value.items.map { it.stableId }.toSet())
    }
    
    fun clearSelection() {
        _state.value = _state.value.copy(selectedItems = emptySet())
    }
    
    fun addToCart(postId: String) {
        findPostById(postId)?.let { SharedExploreStore.addCart(it) }
        viewModelScope.launch { cartRepo.add(postId) }
    }

    fun bulkAddToCart() {
        _state.value.selectedItems.forEach { postId ->
            findPostById(postId)?.let { SharedExploreStore.addCart(it) }
        }
        viewModelScope.launch {
            _state.value.selectedItems.forEach { postId -> cartRepo.add(postId) }
            _state.value = _state.value.copy(selectedItems = emptySet(), isMultiSelectMode = false)
        }
    }

    fun togglePriceAlert(postId: String, enable: Boolean) {
        viewModelScope.launch {
            if (enable) priceAlertsRepo.subscribe(postId)
            else priceAlertsRepo.unsubscribe(postId)
        }
    }
}

/** Convert a Room wishlist entity into the UI Post model. */
private fun com.zaruda.app.data.local.db.WishlistItemEntity.toPost(): Post = Post(
    id = postId.ifBlank { id },
    postId = postId.ifBlank { id },
    title = title,
    price = price,
    originalPrice = originalPrice,
    imageUrl = imageUrl,
    category = category,
    brand = brand,
    status = "active",
)

private enum class WishlistSort(val label: String) {
    SAVED("Saved"),
    PRICE_ASC("Price ↑"),
    PRICE_DESC("Price ↓"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WishlistScreen(
    onBack: () -> Unit = {},
    onOpenPost: (String) -> Unit,
    categoryKey: String? = null,
    viewModel: WishlistViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val categoryFilter by viewModel.categoryFilter.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var gridMode by remember { mutableStateOf(false) }
    var sortBy by remember { mutableStateOf(WishlistSort.SAVED) }
    var statusFilter by remember { mutableStateOf("all") } // all, active, sold, inactive
    var removeConfirmId by remember { mutableStateOf<String?>(null) }
    val focusManager = LocalFocusManager.current

    // Apply category filter when categoryKey changes (e.g. inside a category app)
    LaunchedEffect(categoryKey) {
        viewModel.setCategoryFilter(categoryKey)
    }

    // Remove confirmation dialog
    removeConfirmId?.let { idToRemove ->
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { removeConfirmId = null },
            title = { Text("Remove from Wishlist") },
            text = { Text("Are you sure you want to remove this item from your wishlist?") },
            confirmButton = {
                androidx.compose.material3.TextButton(onClick = {
                    viewModel.remove(idToRemove)
                    removeConfirmId = null
                }) { Text("Remove", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(onClick = { removeConfirmId = null }) { Text("Cancel") }
            },
        )
    }

    val filteredItems = remember(state.items, searchQuery, sortBy, statusFilter, categoryFilter) {
        state.items
            .filter { post ->
                (categoryFilter == null || normalizeMarketplaceCategoryKey(post.category) == normalizeMarketplaceCategoryKey(categoryFilter)) &&
                (searchQuery.isBlank() ||
                    post.displayTitle.contains(searchQuery, ignoreCase = true) ||
                    post.location?.contains(searchQuery, ignoreCase = true) == true ||
                    post.categoryName?.contains(searchQuery, ignoreCase = true) == true) &&
                (statusFilter == "all" || post.status?.equals(statusFilter, ignoreCase = true) == true)
            }
            .let { list ->
                when (sortBy) {
                    WishlistSort.SAVED -> list
                    WishlistSort.PRICE_ASC -> list.sortedBy { it.price ?: Double.MAX_VALUE }
                    WishlistSort.PRICE_DESC -> list.sortedByDescending { it.price ?: 0.0 }
                }
            }
    }

    Box(
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
                                            text = "Verified Local Sellers",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = Color(0xFF059669),
                                        )
                                        Text(
                                            text = "Inspect the item before you pay",
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
    }
}

@Composable
private fun WishlistListCard(
    post: Post,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
    onAddToCart: () -> Unit = {},
    onTogglePriceAlert: (Boolean) -> Unit = {},
    modifier: Modifier = Modifier,
    isMultiSelectMode: Boolean = false,
    isSelected: Boolean = false,
    onToggleSelect: () -> Unit = {},
) {
    var priceAlertEnabled by remember { mutableStateOf(false) }

    Card(
        onClick = { if (isMultiSelectMode) onToggleSelect() else onOpen() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) 
                           else MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            // Checkbox for multi-select mode
            if (isMultiSelectMode) {
                androidx.compose.material3.Checkbox(
                    checked = isSelected,
                    onCheckedChange = { onToggleSelect() },
                )
            }
            
            // Image
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(Icons.Outlined.ImageNotSupported, contentDescription = null)
                }
                
            }

            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                post.price?.let {
                    Text(
                        text = "₹${"%,.0f".format(it)}",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                post.categoryName?.let { cat ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                    ) {
                        Text(
                            text = cat,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                post.location?.let { loc ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(12.dp),
                        )
                        Spacer(Modifier.width(2.dp))
                        Text(
                            text = loc,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            if (!isMultiSelectMode) {
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    IconButton(onClick = onRemove, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Remove", modifier = Modifier.size(16.dp))
                    }
                    IconButton(
                        onClick = {
                            val newValue = !priceAlertEnabled
                            priceAlertEnabled = newValue
                            onTogglePriceAlert(newValue)
                        },
                        modifier = Modifier.size(32.dp),
                    ) {
                        Icon(
                            if (priceAlertEnabled) Icons.Default.Notifications else Icons.Default.NotificationsOff,
                            contentDescription = if (priceAlertEnabled) "Price alert on" else "Price alert off",
                            modifier = Modifier.size(16.dp),
                            tint = if (priceAlertEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    IconButton(
                        onClick = onAddToCart,
                        modifier = Modifier.size(32.dp),
                    ) {
                        Icon(Icons.Default.ShoppingCart, contentDescription = "Add to Cart", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

@Composable
private fun WishlistGridCard(
    post: Post,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onOpen,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier,
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)),
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.ImageNotSupported, contentDescription = null)
                    }
                }
                post.price?.let {
                    Text(
                        text = "₹${"%,.0f".format(it)}",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                    )
                }
                IconButton(
                    onClick = onRemove,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(32.dp),
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Remove",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
            Column(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                post.location?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Composable
fun WishlistHeroBackdrop() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
    ) {
        coil.compose.AsyncImage(
            model = "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=80",
            contentDescription = null,
            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    androidx.compose.ui.graphics.Brush.verticalGradient(
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
                        text = "SECURE IN-APP BUY",
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
fun WishlistFloatingTopBar(
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
            .padding(androidx.compose.foundation.layout.WindowInsets.statusBars.asPaddingValues())
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
