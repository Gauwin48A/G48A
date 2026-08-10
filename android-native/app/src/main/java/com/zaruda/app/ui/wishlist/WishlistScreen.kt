package com.zaruda.app.ui.wishlist

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.Schedule
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
import androidx.compose.ui.unit.sp
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
import com.zaruda.app.ui.explore.SharedExploreStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

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
        val catFilter = _categoryFilter.value
        val allItems = (remoteWishlistItems + roomWishlistItems + SharedExploreStore.wishlistPosts)
            .distinctBy { it.stableId }
        val mergedItems = if (catFilter != null) {
            allItems.filter { it.category == catFilter }
        } else {
            allItems
        }
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
    var searchQuery by remember { mutableStateOf("") }
    var gridMode by remember { mutableStateOf(false) }
    var sortBy by remember { mutableStateOf(WishlistSort.SAVED) }
    var statusFilter by remember { mutableStateOf("all") } // all, active, sold, inactive
    var removeConfirmId by remember { mutableStateOf<String?>(null) }
    val focusManager = LocalFocusManager.current

    // Apply category filter when categoryKey changes
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

    val filteredItems = remember(state.items, searchQuery, sortBy, statusFilter, categoryKey) {
        state.items
            .filter { post ->
                (categoryKey == null || post.category == categoryKey) &&
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(text = if (state.isMultiSelectMode) "Select Items" else "Saved", fontWeight = FontWeight.Bold)
                        if (state.isMultiSelectMode && state.selectedItems.isNotEmpty()) {
                            Text(
                                text = "${state.selectedItems.size} selected",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        } else if (state.items.isNotEmpty()) {
                            val displayCount = if (categoryKey != null) filteredItems.size else state.items.size
                            Text(
                                text = "$displayCount item${if (displayCount != 1) "s" else ""}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (state.isMultiSelectMode) {
                            viewModel.toggleMultiSelect()
                        } else {
                            onBack()
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (state.isMultiSelectMode) {
                        TextButton(onClick = { viewModel.selectAll() }) {
                            Text("Select All", style = MaterialTheme.typography.labelMedium)
                        }
                        TextButton(onClick = { viewModel.clearSelection() }) {
                            Text("Clear", style = MaterialTheme.typography.labelMedium)
                        }
                    } else {
                        if (state.items.isNotEmpty()) {
                            IconButton(onClick = { viewModel.toggleMultiSelect() }) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Multi-select")
                            }
                        }
                        IconButton(onClick = { gridMode = !gridMode }) {
                            Icon(
                                imageVector = if (gridMode) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                                contentDescription = "Toggle view",
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
        floatingActionButton = {
            if (state.isMultiSelectMode && state.selectedItems.isNotEmpty()) {
                androidx.compose.material3.ExtendedFloatingActionButton(
                    text = { Text("Add ${state.selectedItems.size} to Cart") },
                    icon = { Icon(Icons.Default.ShoppingCart, contentDescription = null) },
                    onClick = { viewModel.bulkAddToCart() },
                    containerColor = MaterialTheme.colorScheme.primary,
                )
            }
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.loading -> ListShimmer(count = 6, modifier = Modifier.fillMaxSize().padding(top = 8.dp))

                state.error != null && state.items.isEmpty() -> Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    AppErrorState(
                        title = "Wishlist unavailable",
                        message = state.error ?: "Unable to load wishlist",
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry",
                    )
                }

                else -> {
                    // Fixed: use Column for header UI + conditional LazyColumn/LazyVerticalGrid
                    // This eliminates the nested-LazyVerticalGrid-inside-LazyColumn bug that broke scrolling
                    Column(modifier = Modifier.fillMaxSize()) {
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

                        when {
                            state.items.isEmpty() -> Box(
                                modifier = Modifier.fillMaxSize().padding(vertical = 64.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                AppEmptyState(
                                    icon = Icons.Default.Bookmark,
                                    title = "Nothing saved yet",
                                    subtitle = "Tap the save icon on listings to add them here.",
                                )
                            }
                            filteredItems.isEmpty() -> Box(
                                modifier = Modifier.fillMaxSize().padding(vertical = 64.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                AppEmptyState(
                                    icon = Icons.Default.Search,
                                    title = "No items match",
                                    subtitle = "Try adjusting your filters.",
                                )
                            }
                            gridMode -> {
                                // Grid mode: Column+verticalScroll with chunked rows (avoids LazyListScope overload issues)
                                Column(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .verticalScroll(rememberScrollState())
                                        .padding(start = 12.dp, end = 12.dp, top = 4.dp, bottom = 90.dp),
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
                            else -> {
                                // List mode: standard LazyColumn
                                LazyColumn(
                                    contentPadding = PaddingValues(bottom = 90.dp),
                                    modifier = Modifier.fillMaxSize(),
                                ) {
                                    items(filteredItems, key = { it.stableId }) { post ->
                                        WishlistListCard(
                                            post = post,
                                            onOpen = { onOpenPost(post.stableId) },
                                            onRemove = { removeConfirmId = post.stableId },
                                            onAddToCart = { viewModel.addToCart(post.stableId) },
                                            onTogglePriceAlert = { enabled -> viewModel.togglePriceAlert(post.stableId, enabled) },
                                            isMultiSelectMode = state.isMultiSelectMode,
                                            isSelected = post.stableId in state.selectedItems,
                                            onToggleSelect = { viewModel.toggleItemSelection(post.stableId) },
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
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
    // Price drop not available without historical pricing data
    val priceDrop: Int? = null
    var priceAlertEnabled by remember { mutableStateOf(false) }
    
    // Mock date added (in reality, would come from API)
    val dateAdded = remember { 
        val daysAgo = (post.stableId.hashCode().and(0xFF)) % 30
        val cal = java.util.Calendar.getInstance()
        cal.add(java.util.Calendar.DAY_OF_YEAR, -daysAgo)
        java.text.SimpleDateFormat("MMM d", java.util.Locale.getDefault()).format(cal.time)
    }

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
                
                // Price drop badge
                if (priceDrop != null) {
                    androidx.compose.material3.Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFEF4444),
                        modifier = Modifier.align(Alignment.TopStart).padding(4.dp),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("↓", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            Text("${priceDrop}%", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
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
                
                // Date added
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(11.dp),
                    )
                    Spacer(Modifier.width(3.dp))
                    Text(
                        text = "Added $dateAdded",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
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
    // Price drop not available from API without price history endpoint
    val priceDrop: Int? = null

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
                
                // Price drop badge
                if (priceDrop != null) {
                    androidx.compose.material3.Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFEF4444),
                        modifier = Modifier.align(Alignment.TopStart).padding(6.dp),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("↓", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            Text("${priceDrop}%", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        }
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
