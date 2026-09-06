package com.zaruda.app.ui.commerce

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.statusBars
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.material.icons.filled.VerifiedUser
import com.zaruda.app.ui.theme.ColorTokens

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
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.BookmarkAdd
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
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
import com.zaruda.app.core.ApiError
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.data.local.ThemeMode
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.ListShimmer
import com.zaruda.app.ui.explore.SharedExploreStore
import com.zaruda.app.ui.wishlist.normalizeMarketplaceCategoryKey
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────

data class RecentlyViewedUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val posts: List<Post> = emptyList(),
    val error: String? = null,
    val selectedItems: Set<String> = emptySet(),
    val isMultiSelectMode: Boolean = false,
)

@HiltViewModel
class RecentlyViewedViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val localeManager: com.zaruda.app.core.LocaleManager,
    private val authRepo: com.zaruda.app.data.repository.AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(RecentlyViewedUiState())
    val state: StateFlow<RecentlyViewedUiState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L
    private var remoteRecentPosts: List<Post> = emptyList()

    private val _categoryFilter = MutableStateFlow<String?>(null)
    fun setCategoryFilter(cat: String?) {
        _categoryFilter.value = cat
        syncRecentlyViewed(loading = false)
    }

    init {
        syncRecentlyViewed(loading = SharedExploreStore.recentlyViewedPosts.isEmpty())
        load()
        viewModelScope.launch {
            SharedExploreStore.recentlyViewedFlow.collect {
                syncRecentlyViewed(loading = false)
            }
        }
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load() }
                lastLocaleVersion = version
            }
        }
    }

    private fun syncRecentlyViewed(
        loading: Boolean = _state.value.loading,
        refreshing: Boolean = false,
        error: String? = null,
    ) {
        val catFilter = _categoryFilter.value
        val allPosts = (SharedExploreStore.recentlyViewedPosts + remoteRecentPosts)
            .distinctBy { it.stableId }
            .take(50)
        val mergedPosts = if (catFilter != null) {
            allPosts.filter { normalizeMarketplaceCategoryKey(it.category) == normalizeMarketplaceCategoryKey(catFilter) }
        } else {
            allPosts
        }
        _state.value = _state.value.copy(
            loading = loading,
            refreshing = refreshing,
            posts = mergedPosts,
            error = if (mergedPosts.isEmpty()) error else null,
        )
    }

    fun load() {
        // Show shimmer only if we have no data at all
        _state.value = _state.value.copy(
            loading = _state.value.posts.isEmpty() && SharedExploreStore.recentlyViewedPosts.isEmpty(),
            refreshing = _state.value.posts.isNotEmpty() || SharedExploreStore.recentlyViewedPosts.isNotEmpty(),
            error = null,
        )
        viewModelScope.launch {
            // Proactively refresh token if needed before API call
            if (authRepo.hasSession && !authRepo.isCurrentlyAuthenticated) {
                authRepo.tryRefreshToken()
            }

            when (val result = repo.recentlyViewed()) {
                is ApiResult.Success -> {
                    remoteRecentPosts = result.data
                    syncRecentlyViewed(loading = false)
                }
                is ApiResult.Failure -> {
                    val isAuthError = result.error is ApiError.Unauthorized || result.error is ApiError.Forbidden
                    if (isAuthError) {
                        if (authRepo.isDemoSession) {
                            // Demo sessions always get 401 — use local data silently
                            syncRecentlyViewed(loading = false, error = null)
                            return@launch
                        }
                        // Retry once with fresh token
                        authRepo.tryRefreshToken()
                        when (val retry = repo.recentlyViewed()) {
                            is ApiResult.Success -> {
                                remoteRecentPosts = retry.data
                                syncRecentlyViewed(loading = false)
                            }
                            is ApiResult.Failure -> {
                                // Even on auth failure, show local data instead of error
                                syncRecentlyViewed(loading = false, error = null)
                            }
                        }
                    } else {
                        // Network/server error — show local data silently, keep error for retry
                        syncRecentlyViewed(
                            loading = false,
                            error = if (SharedExploreStore.recentlyViewedPosts.isEmpty()) result.error.message else null,
                        )
                    }
                }
            }
        }
    }

    fun remove(postId: String) {
        remoteRecentPosts = remoteRecentPosts.filterNot { it.stableId == postId }
        SharedExploreStore.removeRecentlyViewed(postId)
        syncRecentlyViewed(loading = false)
        viewModelScope.launch { repo.deleteRecentlyViewed(postId) }
    }

    fun clearAll() {
        remoteRecentPosts = emptyList()
        SharedExploreStore.clearRecentlyViewed()
        syncRecentlyViewed(loading = false)
        viewModelScope.launch { repo.clearRecentlyViewed() }
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
        _state.value = _state.value.copy(selectedItems = _state.value.posts.map { it.stableId }.toSet())
    }

    fun clearSelection() {
        _state.value = _state.value.copy(selectedItems = emptySet())
    }

    fun bulkRemove() {
        _state.value.selectedItems.forEach { postId ->
            remoteRecentPosts = remoteRecentPosts.filterNot { it.stableId == postId }
            SharedExploreStore.removeRecentlyViewed(postId)
        }
        viewModelScope.launch {
            _state.value.selectedItems.forEach { postId -> repo.deleteRecentlyViewed(postId) }
            _state.value = _state.value.copy(selectedItems = emptySet(), isMultiSelectMode = false)
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────

private fun timeSinceLabel(isoDate: String?): String {
    if (isoDate == null) return ""
    return try {
        val instant = Instant.parse(if (isoDate.endsWith("Z")) isoDate else "${isoDate}Z")
        val now = Instant.now()
        val minutesAgo = ChronoUnit.MINUTES.between(instant, now)
        when {
            minutesAgo < 1 -> "just now"
            minutesAgo < 60 -> "${minutesAgo}m ago"
            minutesAgo < 1440 -> "${minutesAgo / 60}h ago"
            minutesAgo < 10080 -> "${minutesAgo / 1440}d ago"
            else -> DateTimeFormatter.ofPattern("d MMM").format(instant.atZone(ZoneId.systemDefault()))
        }
    } catch (_: Exception) { isoDate.take(10) }
}

private fun dayGroup(isoDate: String?): String {
    if (isoDate == null) return "Earlier"
    return try {
        val date = Instant.parse(if (isoDate.endsWith("Z")) isoDate else "${isoDate}Z")
            .atZone(ZoneId.systemDefault()).toLocalDate()
        val today = LocalDate.now()
        when (ChronoUnit.DAYS.between(date, today)) {
            0L -> "Today"
            1L -> "Yesterday"
            else -> "Earlier"
        }
    } catch (_: Exception) { "Earlier" }
}

private enum class RecentlyViewedSort(val label: String) {
    RECENT("Recent"),
    PRICE_ASC("Price ↑"),
    PRICE_DESC("Price ↓"),
}

// ──────────────────────────────────────────────────────────────────────────────
// RecentlyViewedScreen — redesigned to match WishlistScreen styling
// ──────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecentlyViewedScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    onOpenFeed: (String) -> Unit = {},
    onWishlist: () -> Unit = {},
    onRewards: () -> Unit = {},
    onNotifications: () -> Unit = {},
    onCart: () -> Unit = {},
    currentThemeMode: ThemeMode = ThemeMode.SYSTEM,
    onToggleTheme: () -> Unit = {},
    onLanguage: () -> Unit = {},
    categoryKey: String? = null,
    viewModel: RecentlyViewedViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var gridMode by remember { mutableStateOf(false) }
    var sortBy by remember { mutableStateOf(RecentlyViewedSort.RECENT) }
    var statusFilter by remember { mutableStateOf("all") }
    var removeConfirmId by remember { mutableStateOf<String?>(null) }
    val focusManager = LocalFocusManager.current

    // Apply category filter when categoryKey changes
    LaunchedEffect(categoryKey) {
        viewModel.setCategoryFilter(categoryKey)
    }

    // Remove confirmation dialog
    removeConfirmId?.let { idToRemove ->
        AlertDialog(
            onDismissRequest = { removeConfirmId = null },
            title = { Text("Remove from Recently Viewed") },
            text = { Text("Are you sure you want to remove this item from your recently viewed history?") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.remove(idToRemove)
                    removeConfirmId = null
                }) { Text("Remove", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { removeConfirmId = null }) { Text("Cancel") }
            },
        )
    }

    val filteredItems = remember(state.posts, searchQuery, sortBy, statusFilter, categoryKey) {
        state.posts
            .filter { post ->
                // Same normalized comparison as the ViewModel — never exact-match, or legit
                // items (e.g. category "Cars & Bikes" vs key "vehicles") would be dropped.
                (categoryKey == null || normalizeMarketplaceCategoryKey(post.category) == normalizeMarketplaceCategoryKey(categoryKey)) &&
                (searchQuery.isBlank() ||
                    post.displayTitle.contains(searchQuery, ignoreCase = true) ||
                    post.location?.contains(searchQuery, ignoreCase = true) == true ||
                    post.categoryName?.contains(searchQuery, ignoreCase = true) == true) &&
                when (statusFilter) {
                    "all" -> true
                    "posts" -> post.status != "feed"
                    "feed" -> post.status == "feed"
                    "available" -> post.status?.lowercase()?.let { it != "sold" } ?: true
                    "sold" -> post.status?.lowercase() == "sold"
                    else -> true
                }
            }
            .let { list ->
                when (sortBy) {
                    RecentlyViewedSort.RECENT -> list.sortedByDescending { it.createdAt ?: "" }
                    RecentlyViewedSort.PRICE_ASC -> list.sortedBy { it.price ?: Double.MAX_VALUE }
                    RecentlyViewedSort.PRICE_DESC -> list.sortedByDescending { it.price ?: 0.0 }
                }
            }
    }

    // Group by day for list mode
    val grouped = remember(filteredItems) {
        filteredItems.groupBy { dayGroup(it.createdAt) }
    }
    val groupOrder = listOf("Today", "Yesterday", "Earlier")

    val isDark = currentThemeMode == ThemeMode.DARK || (currentThemeMode == ThemeMode.SYSTEM && isSystemInDarkTheme())
    val haptic = LocalHapticFeedback.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // ── Layer 1: Atmospheric Canvas Backdrop ──
        RecentlyViewedAtmosphericBackdrop(isDark = isDark)

        // ── Layer 3: 32dp Curved Content Sheet ──
        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(104.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Tactile Drag Handle (Home Page Standard)
                    Box(
                        modifier = Modifier
                            .padding(top = 10.dp, bottom = 6.dp)
                            .width(44.dp)
                            .height(4.5.dp)
                            .clip(RoundedCornerShape(2.5.dp))
                            .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
                            .align(Alignment.CenterHorizontally),
                    )

                    // Escrow Protection Ribbon
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF059669).copy(alpha = 0.08f),
                        border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.22f)),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("🛡️", fontSize = 14.sp)
                            Text(
                                "100% Escrow Insured Browsing • Inspected items with buyer refund protection",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF059669),
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }

                    PullToRefreshBox(
                        isRefreshing = state.refreshing,
                        onRefresh = { viewModel.load() },
                        modifier = Modifier.fillMaxSize(),
                    ) {
            when {
                state.loading -> ListShimmer(count = 6, modifier = Modifier.fillMaxSize().padding(top = 8.dp))

                state.error != null && state.posts.isEmpty() -> Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    AppErrorState(
                        title = "Recently viewed unavailable",
                        message = state.error ?: "Unable to load recently viewed items",
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry",
                    )
                }

                else -> {
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Search bar
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Search recent items...") },
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
                            RecentlyViewedSort.entries.forEach { option ->
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
                            val statusOptions = listOf("all" to "All", "posts" to "Posts", "feed" to "Feed", "available" to "Available", "sold" to "Sold")
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
                            state.posts.isEmpty() -> Box(
                                modifier = Modifier.fillMaxSize().padding(vertical = 64.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                AppEmptyState(
                                    icon = Icons.Default.History,
                                    title = if (categoryKey != null) "No items viewed in this category" else "No recently viewed items",
                                    subtitle = if (categoryKey != null) "Items you browse in this app will appear here." else "Items you browse will appear here.",
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
                                // Grid mode: Column+verticalScroll with chunked rows
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
                                                    RecentlyViewedGridCard(
                                                        post = post,
                                                        onOpen = { if (post.status == "feed") onOpenFeed(post.stableId) else onOpenPost(post.stableId) },
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
                                // List mode: day-grouped LazyColumn
                                LazyColumn(
                                    contentPadding = PaddingValues(bottom = 90.dp),
                                    modifier = Modifier.fillMaxSize(),
                                ) {
                                    groupOrder.forEach { group ->
                                        val groupPosts = grouped[group] ?: return@forEach
                                        if (groupPosts.isEmpty()) return@forEach
                                        item(key = "header_$group") {
                                            DayGroupHeader(group = group, count = groupPosts.size)
                                        }
                                        items(groupPosts, key = { it.stableId }) { post ->
                                            RecentlyViewedListCard(
                                                post = post,
                                                onOpen = { if (post.status == "feed") onOpenFeed(post.stableId) else onOpenPost(post.stableId) },
                                                onRemove = { removeConfirmId = post.stableId },
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
            }
        }

        // ── Layer 2: Floating Glassmorphic Top Bar ──
        RecentlyViewedFloatingTopBar(
            title = if (state.isMultiSelectMode) "Select Items" else "Recently Viewed",
            subtitle = if (state.isMultiSelectMode && state.selectedItems.isNotEmpty()) {
                "${state.selectedItems.size} selected"
            } else if (state.posts.isNotEmpty()) {
                val displayCount = filteredItems.size
                if (displayCount != 1) "$displayCount items" else "$displayCount item"
            } else "Explore your history",
            isDark = isDark,
            isMultiSelectMode = state.isMultiSelectMode,
            hasPosts = state.posts.isNotEmpty(),
            gridMode = gridMode,
            currentThemeMode = currentThemeMode,
            onBack = {
                if (state.isMultiSelectMode) {
                    viewModel.toggleMultiSelect()
                } else {
                    onBack()
                }
            },
            onSelectAll = { viewModel.selectAll() },
            onClearSelection = { viewModel.clearSelection() },
            onClearAll = { viewModel.clearAll() },
            onToggleMultiSelect = { viewModel.toggleMultiSelect() },
            onToggleGridMode = { gridMode = !gridMode },
            onWishlist = onWishlist,
            onRewards = onRewards,
            onCart = onCart,
            onNotifications = onNotifications,
            onToggleTheme = onToggleTheme,
            onLanguage = onLanguage,
        )

        // Bulk Delete FAB when multi-select is active
        if (state.isMultiSelectMode && state.selectedItems.isNotEmpty()) {
            ExtendedFloatingActionButton(
                text = { Text("Remove ${state.selectedItems.size}") },
                icon = { Icon(Icons.Default.DeleteSweep, contentDescription = null) },
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    viewModel.bulkRemove()
                },
                containerColor = MaterialTheme.colorScheme.error,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(20.dp),
            )
        }
    }
}

/* ── Layer 1: Atmospheric Canvas Backdrop ─────────────────────────────────── */

@Composable
private fun RecentlyViewedAtmosphericBackdrop(
    isDark: Boolean,
    modifier: Modifier = Modifier,
) {
    val bgGradient = if (isDark) {
        listOf(
            Color(0xFF060D1A),
            Color(0xFF0F172A),
            Color(0xFF0B192C),
        )
    } else {
        listOf(
            Color(0xFF1E3A8A),
            Color(0xFF1E40AF),
            Color(0xFF172554),
        )
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(240.dp)
            .background(Brush.verticalGradient(bgGradient))
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            // Ambient glowing orbs
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF38BDF8).copy(alpha = if (isDark) 0.28f else 0.40f),
                        Color.Transparent,
                    ),
                    center = Offset(size.width * 0.85f, 40.dp.toPx()),
                    radius = 180.dp.toPx(),
                )
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF6366F1).copy(alpha = if (isDark) 0.20f else 0.32f),
                        Color.Transparent,
                    ),
                    center = Offset(size.width * 0.15f, 80.dp.toPx()),
                    radius = 150.dp.toPx(),
                )
            )
        }

        // Top scrim for status bar readability
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(90.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Black.copy(alpha = 0.45f), Color.Transparent)
                    )
                )
        )

        // Bottom vignette scrim blending into 32dp curved sheet
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.30f))
                    )
                )
        )
    }
}

/* ── Layer 2: Floating Glassmorphic Top Bar ───────────────────────────────── */

@Composable
private fun RecentlyViewedFloatingTopBar(
    title: String,
    subtitle: String,
    isDark: Boolean,
    isMultiSelectMode: Boolean,
    hasPosts: Boolean,
    gridMode: Boolean,
    currentThemeMode: ThemeMode,
    onBack: () -> Unit,
    onSelectAll: () -> Unit,
    onClearSelection: () -> Unit,
    onClearAll: () -> Unit,
    onToggleMultiSelect: () -> Unit,
    onToggleGridMode: () -> Unit,
    onWishlist: () -> Unit,
    onRewards: () -> Unit,
    onCart: () -> Unit,
    onNotifications: () -> Unit,
    onToggleTheme: () -> Unit,
    onLanguage: () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    var showOverflow by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = if (isDark) Color.Black.copy(alpha = 0.65f) else Color.White.copy(alpha = 0.90f),
            border = BorderStroke(1.dp, if (isDark) Color.White.copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.08f)),
            shadowElevation = 6.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onBack()
                    },
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.size(20.dp),
                    )
                }
                Spacer(Modifier.width(6.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        subtitle,
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                if (isMultiSelectMode) {
                    TextButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onSelectAll()
                        },
                    ) {
                        Text("All", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                    TextButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onClearSelection()
                        },
                    ) {
                        Text("Clear", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                } else {
                    if (hasPosts) {
                        IconButton(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                onClearAll()
                            },
                            modifier = Modifier.size(34.dp),
                        ) {
                            Icon(
                                Icons.Default.DeleteSweep,
                                contentDescription = "Clear All",
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(19.dp),
                            )
                        }
                        IconButton(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                onToggleMultiSelect()
                            },
                            modifier = Modifier.size(34.dp),
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = "Multi-select",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(19.dp),
                            )
                        }
                    }
                    IconButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onToggleGridMode()
                        },
                        modifier = Modifier.size(34.dp),
                    ) {
                        Icon(
                            imageVector = if (gridMode) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                            contentDescription = "Toggle view",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(19.dp),
                        )
                    }
                    Box {
                        IconButton(
                            onClick = { showOverflow = true },
                            modifier = Modifier.size(34.dp),
                        ) {
                            Icon(
                                Icons.Default.MoreVert,
                                contentDescription = "More options",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(19.dp),
                            )
                        }
                        DropdownMenu(
                            expanded = showOverflow,
                            onDismissRequest = { showOverflow = false },
                        ) {
                            DropdownMenuItem(
                                text = { Text("Wishlist") },
                                leadingIcon = { Icon(Icons.Default.BookmarkAdd, null, modifier = Modifier.size(18.dp)) },
                                onClick = { showOverflow = false; onWishlist() },
                            )
                            DropdownMenuItem(
                                text = { Text("Rewards") },
                                leadingIcon = { Icon(Icons.Default.EmojiEvents, null, modifier = Modifier.size(18.dp)) },
                                onClick = { showOverflow = false; onRewards() },
                            )
                            DropdownMenuItem(
                                text = { Text("Cart") },
                                leadingIcon = { Icon(Icons.Default.ShoppingCart, null, modifier = Modifier.size(18.dp)) },
                                onClick = { showOverflow = false; onCart() },
                            )
                            DropdownMenuItem(
                                text = { Text("Notifications") },
                                leadingIcon = { Icon(Icons.Default.Notifications, null, modifier = Modifier.size(18.dp)) },
                                onClick = { showOverflow = false; onNotifications() },
                            )
                            DropdownMenuItem(
                                text = { Text(if (currentThemeMode == ThemeMode.DARK) "Light Mode" else "Dark Mode") },
                                leadingIcon = {
                                    Icon(
                                        if (currentThemeMode == ThemeMode.DARK) Icons.Outlined.LightMode else Icons.Outlined.DarkMode,
                                        null,
                                        modifier = Modifier.size(18.dp),
                                    )
                                },
                                onClick = { showOverflow = false; onToggleTheme() },
                            )
                            DropdownMenuItem(
                                text = { Text("Language") },
                                leadingIcon = { Icon(Icons.Default.Language, null, modifier = Modifier.size(18.dp)) },
                                onClick = { showOverflow = false; onLanguage() },
                            )
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// DayGroupHeader — section header for Today / Yesterday / Earlier
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun DayGroupHeader(group: String, count: Int) {
    val accentColor = when (group) {
        "Today" -> MaterialTheme.colorScheme.primary
        "Yesterday" -> MaterialTheme.colorScheme.tertiary
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.material3.Surface(
            shape = RoundedCornerShape(20.dp),
            color = accentColor.copy(alpha = 0.12f),
        ) {
            Text(
                group,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = accentColor,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            )
        }
        Spacer(Modifier.width(8.dp))
        Text(
            "$count item${if (count != 1) "s" else ""}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// RecentlyViewedListCard — Wishlist-grade list card
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun RecentlyViewedListCard(
    post: Post,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
    isMultiSelectMode: Boolean = false,
    isSelected: Boolean = false,
    onToggleSelect: () -> Unit = {},
) {
    val timeLabel = remember(post.createdAt) { timeSinceLabel(post.createdAt) }

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
                Checkbox(
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

            // Info column
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                // Title
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )

                // Price
                post.price?.let { price ->
                    val fmtText = "%,.0f".format(price)
                    Text(
                        text = "₹$fmtText",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }

                // Category chip
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

                // Location + time row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
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
                                maxLines = 1,
                            )
                        }
                    }
                    if (timeLabel.isNotEmpty()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.AccessTime,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(11.dp),
                            )
                            Spacer(Modifier.width(3.dp))
                            Text(
                                text = timeLabel,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                // Status/condition chip
                if (post.status == "feed") {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.tertiaryContainer,
                    ) {
                        Text(
                            "Feed Post",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onTertiaryContainer,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                } else {
                    post.condition?.let { cond ->
                        ConditionChip(cond)
                    }
                }
            }

            // Remove button (only outside multi-select mode)
            if (!isMultiSelectMode) {
                IconButton(
                    onClick = onRemove,
                    modifier = Modifier.size(32.dp).align(Alignment.Top),
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Remove",
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// RecentlyViewedGridCard — Wishlist-grade grid card
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun RecentlyViewedGridCard(
    post: Post,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val timeLabel = remember(post.createdAt) { timeSinceLabel(post.createdAt) }

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

                // Remove X button
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

                // Price overlay
                post.price?.let { price ->
                    val fmtText = "%,.0f".format(price)
                    Text(
                        text = "₹$fmtText",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                    )
                }

                // Time badge
                if (timeLabel.isNotEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color.Black.copy(alpha = 0.5f),
                        modifier = Modifier.align(Alignment.BottomEnd).padding(6.dp),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                        ) {
                            Icon(
                                Icons.Default.AccessTime, null,
                                tint = Color.White.copy(alpha = 0.8f),
                                modifier = Modifier.size(10.dp),
                            )
                            Text(
                                timeLabel,
                                fontSize = 9.sp,
                                color = Color.White.copy(alpha = 0.9f),
                            )
                        }
                    }
                }
            }

            // Info below image
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

// ──────────────────────────────────────────────────────────────────────────────
// ConditionChip helper
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun ConditionChip(condition: String) {
    val (bg, fg) = when (condition.lowercase()) {
        "new" -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.onPrimaryContainer
        "like new" -> Color(0xFFDCFCE7) to Color(0xFF166534)
        "good" -> Color(0xFFDBEAFE) to Color(0xFF1D4ED8)
        "fair" -> Color(0xFFFEF9C3) to Color(0xFF854D0E)
        else -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(shape = RoundedCornerShape(6.dp), color = bg) {
        Text(
            condition.replaceFirstChar { it.uppercase() },
            fontSize = 10.sp,
            color = fg,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
        )
    }
}
