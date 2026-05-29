package com.mhub.app.ui.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Compare
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.NewReleases
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.mhub.app.R
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.RecommendationsRepository
import com.mhub.app.data.repository.WishlistRepository
import com.mhub.app.domain.model.Category
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.SectionHeader
import com.mhub.app.ui.theme.CategoryTints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Share
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.TextButton
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.snapshotFlow
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.material3.RadioButton
import com.mhub.app.ui.LocalActiveCategoryKey

data class ExploreState(
    val ecosystemKey: String? = null,
    val sortBy: String = "newest",
    val filterCondition: String = "any",  // "any" | "new" | "used"
    val filterSubcategory: String? = null,
    val hasActiveFilters: Boolean = false,
    val posts: List<Post> = emptyList(),
    val page: Int = 1,
    val hasMore: Boolean = true,
    val loadingPosts: Boolean = true,
    val loadingMore: Boolean = false,
    val errorMessage: String? = null,
    val compareItems: Set<String> = emptySet(),
    val searchQuery: String = "",
    val searchResults: List<Post> = emptyList(),
    val isSearching: Boolean = false,
    val refreshing: Boolean = false,
    val subcategories: List<String> = emptyList(),
)

@HiltViewModel
class ExploreViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val wishlistRepo: WishlistRepository,
    private val categoriesRepo: CategoriesRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(ExploreState())
    val state: StateFlow<ExploreState> = _state.asStateFlow()

    private var searchJob: Job? = null
    private var lastLocaleVersion = 0L

    init {
        loadPosts(reset = true)
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) loadPosts(reset = true)
                lastLocaleVersion = version
            }
        }
    }

    fun setEcosystem(key: String?) {
        if (_state.value.ecosystemKey == key) return
        _state.value = _state.value.copy(ecosystemKey = key)
        loadSubcategories(key)
        loadPosts(reset = true)
    }

    fun setFilterCondition(condition: String) {
        val newFilters = condition != "any" || _state.value.filterSubcategory != null
        _state.value = _state.value.copy(filterCondition = condition, hasActiveFilters = newFilters)
        loadPosts(reset = true)
    }

    fun setFilterSubcategory(sub: String?) {
        val newFilters = _state.value.filterCondition != "any" || sub != null
        _state.value = _state.value.copy(filterSubcategory = sub, hasActiveFilters = newFilters)
        loadPosts(reset = true)
    }

    fun clearFilters() {
        _state.value = _state.value.copy(filterCondition = "any", filterSubcategory = null, hasActiveFilters = false)
        loadPosts(reset = true)
    }

    fun loadPosts(reset: Boolean = false) {
        val currentPage = if (reset) 1 else _state.value.page
        val categoryKey = _state.value.ecosystemKey
        val sort = _state.value.sortBy
        if (reset) {
            _state.value = _state.value.copy(loadingPosts = true, posts = emptyList(), page = 1, hasMore = true)
        } else {
            if (!_state.value.hasMore || _state.value.loadingMore) return
            _state.value = _state.value.copy(loadingMore = true)
        }
        viewModelScope.launch {
            val condition = _state.value.filterCondition.takeIf { it != "any" }
            val subcategory = _state.value.filterSubcategory
            when (val result = postsRepo.feed(page = currentPage, categoryId = categoryKey, sort = sort, condition = condition, subcategory = subcategory)) {
                is ApiResult.Success -> {
                    val newPosts = result.data
                    _state.value = _state.value.copy(
                        loadingPosts = false, loadingMore = false,
                        posts = if (reset) newPosts else _state.value.posts + newPosts,
                        page = currentPage + 1,
                        hasMore = newPosts.size >= 20,
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loadingPosts = false, loadingMore = false, errorMessage = result.error.message)
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            loadPosts(reset = true)
            _state.value = _state.value.copy(refreshing = false)
        }
    }

    fun retry() {
        _state.value = _state.value.copy(errorMessage = null)
        loadPosts(reset = true)
    }

    private fun loadSubcategories(key: String?) {
        if (key == null) {
            _state.value = _state.value.copy(subcategories = emptyList())
            return
        }
        viewModelScope.launch {
            when (val r = categoriesRepo.subcategories(key)) {
                is ApiResult.Success -> {
                    val names = r.data.mapNotNull { it.name }.take(10)
                    _state.value = _state.value.copy(subcategories = names)
                }
                is ApiResult.Failure -> {
                    // Keep hardcoded fallback
                    val fallback = when (key) {
                        "electronics" -> listOf("Phones", "Laptops", "Tablets", "Cameras", "Audio", "Gaming", "Accessories")
                        "fashion" -> listOf("Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Watches", "Jewellery")
                        "vehicles" -> listOf("Cars", "Motorcycles", "Bicycles", "Trucks", "Spare Parts", "Accessories")
                        "others" -> listOf("Home & Furniture", "Books", "Sports", "Health & Beauty", "Toys", "Services")
                        else -> emptyList()
                    }
                    _state.value = _state.value.copy(subcategories = fallback)
                }
            }
        }
    }

    // Retained for back-compat but ecosystem is set via setEcosystem()
    fun setCategory(idx: Int) {
        // no-op: category is now locked by ecosystem from Home screen
        // Remove if no callers remain
        _state.value = _state.value.copy()
        loadPosts(reset = true)
    }

    fun setSortBy(sort: String) {
        if (_state.value.sortBy == sort) return
        _state.value = _state.value.copy(sortBy = sort)
        loadPosts(reset = true)
    }

    fun loadMore() = loadPosts(reset = false)

    fun toggleCompare(postId: String) {
        val current = _state.value.compareItems.toMutableSet()
        if (current.contains(postId)) current.remove(postId) else if (current.size < 4) current.add(postId)
        _state.value = _state.value.copy(compareItems = current)
    }

    fun clearCompare() {
        _state.value = _state.value.copy(compareItems = emptySet())
        viewModelScope.launch { postsRepo.clearCompare() }
    }

    fun onQueryChange(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
        searchJob?.cancel()
        if (query.isBlank()) {
            _state.value = _state.value.copy(searchResults = emptyList(), isSearching = false)
            return
        }
        searchJob = viewModelScope.launch {
            delay(300)
            _state.value = _state.value.copy(isSearching = true)
            when (val result = postsRepo.feed(query = query)) {
                is ApiResult.Success -> _state.value = _state.value.copy(isSearching = false, searchResults = result.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(isSearching = false)
            }
        }
    }

    fun clearSearch() {
        searchJob?.cancel()
        _state.value = _state.value.copy(searchQuery = "", searchResults = emptyList(), isSearching = false)
    }

    private val _wishlisted = MutableStateFlow<Set<String>>(emptySet())
    val wishlisted: StateFlow<Set<String>> = _wishlisted.asStateFlow()

    fun toggleWishlist(postId: String) {
        val current = _wishlisted.value.toMutableSet()
        if (current.contains(postId)) current.remove(postId) else current.add(postId)
        _wishlisted.value = current
        viewModelScope.launch { postsRepo.toggleWishlist(postId) }
    }

    fun addToCompare(postId: String) {
        viewModelScope.launch { postsRepo.addToCompare(postId) }
    }
}

// Map category name → emoji for visual richness
private fun categoryEmoji(name: String): String {
    val n = name.lowercase()
    return when {
        n.contains("electron") || n.contains("tech") || n.contains("gadget") -> "📱"
        n.contains("fashion") || n.contains("cloth") || n.contains("apparel") -> "👗"
        n.contains("vehicle") || n.contains("car") || n.contains("bike") || n.contains("motor") -> "🚗"
        n.contains("furniture") || n.contains("home") || n.contains("decor") -> "🛋️"
        n.contains("book") || n.contains("education") || n.contains("study") -> "📚"
        n.contains("sport") || n.contains("fitness") || n.contains("gym") -> "⚽"
        n.contains("food") || n.contains("grocery") || n.contains("restaurant") -> "🍕"
        n.contains("job") || n.contains("service") || n.contains("freelan") -> "💼"
        n.contains("real estate") || n.contains("property") || n.contains("house") || n.contains("flat") -> "🏠"
        n.contains("toy") || n.contains("game") || n.contains("kid") -> "🎮"
        n.contains("health") || n.contains("beauty") || n.contains("cosmetic") -> "💄"
        n.contains("pet") || n.contains("animal") -> "🐾"
        n.contains("music") || n.contains("instrument") -> "🎵"
        n.contains("art") || n.contains("craft") || n.contains("handmade") -> "🎨"
        else -> "🏷️"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    onOpenPost: (String) -> Unit,
    onOpenSearch: () -> Unit,
    onOpenCategories: () -> Unit,
    onOpenCompare: () -> Unit = {},
    viewModel: ExploreViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val wishlistedSet by viewModel.wishlisted.collectAsState()
    var showSearch by remember { mutableStateOf(false) }
    var showFilterSheet by remember { mutableStateOf(false) }
    val filterSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val focusManager = LocalFocusManager.current

    // Ecosystem from CompositionLocal — set when user enters a category from Home
    val ecosystemKey = LocalActiveCategoryKey.current
    val ecosystemLabel = when (ecosystemKey) {
        "electronics" -> "📱 Electronics"
        "fashion" -> "👗 Fashion"
        "vehicles" -> "🚗 Vehicles"
        "others" -> "✨ Others"
        else -> null
    }
    val ecosystemSubcategories: List<String> = when {
        state.subcategories.isNotEmpty() -> state.subcategories
        ecosystemKey == "electronics" -> listOf("Phones", "Laptops", "Tablets", "Cameras", "Audio", "Gaming", "Accessories")
        ecosystemKey == "fashion" -> listOf("Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Watches", "Jewellery")
        ecosystemKey == "vehicles" -> listOf("Cars", "Motorcycles", "Bicycles", "Trucks", "Spare Parts", "Accessories")
        ecosystemKey == "others" -> listOf("Home & Furniture", "Books", "Sports", "Health & Beauty", "Toys", "Services")
        else -> emptyList()
    }

    // Draft filter state for the bottom sheet
    var draftCondition by remember(showFilterSheet) { mutableStateOf(state.filterCondition) }
    var draftSubcategory by remember(showFilterSheet) { mutableStateOf(state.filterSubcategory) }

    // Sync ecosystem into ViewModel whenever it changes
    LaunchedEffect(ecosystemKey) { viewModel.setEcosystem(ecosystemKey) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (showSearch) {
                        OutlinedTextField(
                            value = state.searchQuery,
                            onValueChange = viewModel::onQueryChange,
                            singleLine = true,
                            placeholder = { Text("Search listings…", style = MaterialTheme.typography.bodyMedium) },
                            leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp)) },
                            trailingIcon = {
                                IconButton(onClick = { showSearch = false; viewModel.clearSearch(); focusManager.clearFocus() }) {
                                    Icon(Icons.Default.Close, null)
                                }
                            },
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().padding(end = 8.dp),
                        )
                    } else {
                        Column(verticalArrangement = Arrangement.Center) {
                            Text("All Posts", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                            if (ecosystemLabel != null) {
                                Text(ecosystemLabel, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                },
                actions = {
                    if (!showSearch) {
                        IconButton(onClick = { showSearch = true }) {
                            Icon(Icons.Default.Search, contentDescription = "Search")
                        }
                        BadgedBox(badge = { if (state.hasActiveFilters) Badge() }) {
                            IconButton(onClick = {
                                draftCondition = state.filterCondition
                                draftSubcategory = state.filterSubcategory
                                showFilterSheet = true
                            }) {
                                Icon(Icons.Default.Tune, contentDescription = "Filters")
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize(),
            ) {
                AllPostsBrowse(
                    state = state,
                    wishlisted = wishlistedSet,
                    ecosystemSubcategories = ecosystemSubcategories,
                    onOpenPost = onOpenPost,
                    onToggleWishlist = viewModel::toggleWishlist,
                    onSetSort = viewModel::setSortBy,
                    onToggleCompare = viewModel::toggleCompare,
                    onLoadMore = viewModel::loadMore,
                    onOpenSearch = onOpenSearch,
                    onSelectSubcategory = { sub ->
                        viewModel.setFilterSubcategory(if (state.filterSubcategory == sub) null else sub)
                    },
                )
            }
            // Error banner
            state.errorMessage?.let { err ->
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                    shadowElevation = 4.dp,
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(err, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.weight(1f))
                        TextButton(onClick = { viewModel.retry() }) {
                            Text("Retry", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            if (state.compareItems.isNotEmpty()) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shadowElevation = 8.dp,
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            "${state.compareItems.size} item${if (state.compareItems.size > 1) "s" else ""} selected",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = viewModel::clearCompare) { Text("Clear") }
                            Button(
                                onClick = {
                                    state.compareItems.forEach { viewModel.addToCompare(it) }
                                    onOpenCompare()
                                },
                                enabled = state.compareItems.size >= 2,
                            ) { Text("Compare (${state.compareItems.size})") }
                        }
                    }
                }
            }
        }
    }

    // Filter bottom sheet
    if (showFilterSheet) {
        ModalBottomSheet(
            onDismissRequest = { showFilterSheet = false },
            sheetState = filterSheetState,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Filters", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (state.hasActiveFilters) {
                        OutlinedButton(onClick = { viewModel.clearFilters(); showFilterSheet = false }) {
                            Text("Clear All", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
                HorizontalDivider()
                // Condition filter
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Condition", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("any" to "Any", "new" to "New", "used" to "Used").forEach { (key, label) ->
                            FilterChip(
                                selected = draftCondition == key,
                                onClick = { draftCondition = key },
                                label = { Text(label, style = MaterialTheme.typography.labelMedium) },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.White),
                                shape = RoundedCornerShape(20.dp),
                            )
                        }
                    }
                }
                // Subcategory filter (only when ecosystem is active)
                if (ecosystemSubcategories.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Subcategory", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(ecosystemSubcategories.size) { idx ->
                                val sub = ecosystemSubcategories[idx]
                                FilterChip(
                                    selected = draftSubcategory == sub,
                                    onClick = { draftSubcategory = if (draftSubcategory == sub) null else sub },
                                    label = { Text(sub, style = MaterialTheme.typography.labelMedium) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.secondary, selectedLabelColor = Color.White),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                    }
                }
                // Apply button
                Button(
                    onClick = {
                        viewModel.setFilterCondition(draftCondition)
                        viewModel.setFilterSubcategory(draftSubcategory)
                        showFilterSheet = false
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text("Apply Filters", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun HeroPill(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(Color.White.copy(alpha = 0.18f))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(text, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}

private data class QuickFilterDef(val labelRes: Int, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val quickFilters = listOf(
    QuickFilterDef(R.string.explore_filter_new, Icons.Outlined.NewReleases),
    QuickFilterDef(R.string.explore_filter_trending, Icons.AutoMirrored.Filled.TrendingUp),
    QuickFilterDef(R.string.explore_filter_top_rated, Icons.Outlined.Star),
    QuickFilterDef(R.string.explore_filter_offers, Icons.Outlined.LocalOffer),
)

private data class BannerSlide(
    val gradientColors: List<Color>,
    val badge: String,
    val badgeIcon: String,
    val title: String,
    val subtitle: String,
    val ctaText: String,
    val emoji: String,
    val discount: String,
)

private val bannerSlides = listOf(
    BannerSlide(
        gradientColors = listOf(Color(0xFF1E40AF), Color(0xFF3B82F6), Color(0xFF6366F1)),
        badge = "LIMITED TIME", badgeIcon = "🔥",
        title = "Great Deals Await!", subtitle = "Discover unbeatable offers on top brands",
        ctaText = "Shop Now", emoji = "🔥", discount = "UP TO 60% OFF",
    ),
    BannerSlide(
        gradientColors = listOf(Color(0xFF7C3AED), Color(0xFFA855F7), Color(0xFFD946EF)),
        badge = "NEW ARRIVALS", badgeIcon = "✨",
        title = "Fresh Listings Daily", subtitle = "Be the first to grab new items near you",
        ctaText = "Explore", emoji = "🆕", discount = "JUST LISTED",
    ),
    BannerSlide(
        gradientColors = listOf(Color(0xFF059669), Color(0xFF10B981), Color(0xFF34D399)),
        badge = "VERIFIED SELLERS", badgeIcon = "✅",
        title = "Shop with Confidence", subtitle = "Trusted sellers with top ratings & reviews",
        ctaText = "Browse", emoji = "🛡️", discount = "100% TRUSTED",
    ),
    BannerSlide(
        gradientColors = listOf(Color(0xFFEA580C), Color(0xFFF97316), Color(0xFFFBBF24)),
        badge = "FLASH SALE", badgeIcon = "⚡",
        title = "Flash Sale Live!", subtitle = "Limited stock at incredible prices — hurry!",
        ctaText = "Grab Now", emoji = "⚡", discount = "UP TO 80% OFF",
    ),
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun GreatDealsBanner(onShopNow: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { bannerSlides.size })

    // Auto-scroll every 4 seconds
    LaunchedEffect(pagerState) {
        while (true) {
            kotlinx.coroutines.delay(4000)
            val nextPage = (pagerState.currentPage + 1) % bannerSlides.size
            pagerState.animateScrollToPage(nextPage)
        }
    }

    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth(),
            pageSpacing = 12.dp,
            contentPadding = PaddingValues(horizontal = 16.dp),
        ) { page ->
            val slide = bannerSlides[page]
            Card(
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.linearGradient(colors = slide.gradientColors))
                        .padding(20.dp),
                ) {
                    // Decorative circles
                    Box(
                        modifier = Modifier.size(80.dp).align(Alignment.TopEnd)
                            .offset(x = 20.dp, y = (-10).dp)
                            .background(Color.White.copy(alpha = 0.08f), CircleShape)
                    )
                    Box(
                        modifier = Modifier.size(50.dp).align(Alignment.BottomStart)
                            .offset(x = (-10).dp, y = 10.dp)
                            .background(Color.White.copy(alpha = 0.06f), CircleShape)
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.15f)) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Text(slide.badgeIcon, fontSize = 12.sp)
                                    Text(slide.badge, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White, letterSpacing = 1.sp)
                                }
                            }
                            Spacer(Modifier.height(10.dp))
                            Text(slide.title, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = Color.White, lineHeight = 26.sp)
                            Spacer(Modifier.height(4.dp))
                            Text(slide.subtitle, fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f), lineHeight = 18.sp)
                            Spacer(Modifier.height(14.dp))
                            Surface(onClick = onShopNow, shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 4.dp) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Text(slide.ctaText, color = slide.gradientColors.first(), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(16.dp), tint = slide.gradientColors.first())
                                }
                            }
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(start = 12.dp)) {
                            Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.15f), modifier = Modifier.size(72.dp)) {
                                Box(contentAlignment = Alignment.Center) { Text(slide.emoji, fontSize = 36.sp) }
                            }
                            Spacer(Modifier.height(6.dp))
                            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFBBF24)) {
                                Text(slide.discount, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF78350F), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                    }
                }
            }
        }
        // Page indicators
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            repeat(bannerSlides.size) { idx ->
                val isSelected = pagerState.currentPage == idx
                Box(
                    modifier = Modifier
                        .padding(horizontal = 3.dp)
                        .size(if (isSelected) 8.dp else 6.dp)
                        .clip(CircleShape)
                        .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant)
                )
            }
        }
    }
}


@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun AllPostsBrowse(
    state: ExploreState,
    wishlisted: Set<String>,
    ecosystemSubcategories: List<String>,
    onOpenPost: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
    onSetSort: (String) -> Unit,
    onToggleCompare: (String) -> Unit,
    onLoadMore: () -> Unit,
    onOpenSearch: () -> Unit,
    onSelectSubcategory: (String) -> Unit = {},
) {
    val sortOptions = listOf(
        "newest" to "Newest", "popular" to "Popular",
        "price_asc" to "Price ↑", "price_desc" to "Price ↓",
    )
    var isGridView by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val shouldLoadMore by remember {
        derivedStateOf {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: return@derivedStateOf false
            last >= listState.layoutInfo.totalItemsCount - 3
        }
    }
    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore && state.hasMore && !state.loadingMore && !state.loadingPosts && state.posts.isNotEmpty()) onLoadMore()
    }

    LazyColumn(state = listState, contentPadding = PaddingValues(bottom = 100.dp)) {
        if (state.searchQuery.isNotBlank()) {
            if (state.isSearching) {
                item(key = "search_loading") {
                    Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
            } else if (state.searchResults.isEmpty()) {
                item(key = "search_empty") {
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        AppEmptyState(icon = Icons.Outlined.ImageNotSupported, title = "No results found", subtitle = "Try different keywords")
                    }
                }
            } else {
                items(state.searchResults, key = { it.stableId }) { post ->
                    AllPostCard(post = post, onClick = { onOpenPost(post.stableId) }, isWishlisted = wishlisted.contains(post.stableId), onToggleWishlist = { onToggleWishlist(post.stableId) }, isCompared = state.compareItems.contains(post.stableId), onToggleCompare = { onToggleCompare(post.stableId) }, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp).animateItem())
                }
            }
            return@LazyColumn
        }

        // Sticky sort + subcategory chips (don't scroll away)
        stickyHeader(key = "sticky_filters") {
            Surface(
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 2.dp,
            ) {
                Column {
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                        items(sortOptions.size) { idx ->
                            val (key, label) = sortOptions[idx]
                            val isSelected = state.sortBy == key
                            FilterChip(selected = isSelected, onClick = { onSetSort(key) }, label = { Text(label, style = MaterialTheme.typography.labelMedium) }, colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.White), shape = RoundedCornerShape(20.dp))
                        }
                        item {
                            // Grid/List view toggle (web parity)
                            IconButton(onClick = { isGridView = !isGridView }, modifier = Modifier.size(32.dp)) {
                                Icon(if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                    if (ecosystemSubcategories.isNotEmpty()) {
                        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 6.dp)) {
                            items(ecosystemSubcategories.size) { idx ->
                                val sub = ecosystemSubcategories[idx]
                                val isSelected = state.filterSubcategory == sub
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { onSelectSubcategory(sub) },
                                    label = { Text(sub, style = MaterialTheme.typography.labelMedium) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.secondary, selectedLabelColor = Color.White, containerColor = MaterialTheme.colorScheme.surface),
                                    border = FilterChipDefaults.filterChipBorder(borderColor = MaterialTheme.colorScheme.outlineVariant, enabled = true, selected = isSelected),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                    }
                }
            }
        }

        item(key = "quick_filters") {
            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
                items(quickFilters.size) { idx ->
                    val f = quickFilters[idx]
                    FilterChip(selected = false, onClick = { onOpenSearch() }, label = { Text(stringResource(f.labelRes), style = MaterialTheme.typography.labelMedium) }, leadingIcon = { Icon(f.icon, null, modifier = Modifier.size(16.dp), tint = Color(0xFF2563EB)) }, colors = FilterChipDefaults.filterChipColors(containerColor = Color.White), border = FilterChipDefaults.filterChipBorder(borderColor = Color(0xFFE2E8F0), enabled = true, selected = false), shape = RoundedCornerShape(20.dp))
                }
                val priceLabels = listOf(R.string.explore_price_under_1k, R.string.explore_price_1k_5k, R.string.explore_price_5k_20k, R.string.explore_price_above_20k)
                items(priceLabels.size) { idx ->
                    FilterChip(selected = false, onClick = { onOpenSearch() }, label = { Text(stringResource(priceLabels[idx]), style = MaterialTheme.typography.labelSmall) }, leadingIcon = { Text("₹", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = Color(0xFF22C55E)) }, colors = FilterChipDefaults.filterChipColors(containerColor = Color(0xFFF0FDF4)), border = FilterChipDefaults.filterChipBorder(borderColor = Color(0xFFBBF7D0), enabled = true, selected = false), shape = RoundedCornerShape(20.dp))
                }
            }
        }

        item(key = "banner") { GreatDealsBanner(onShopNow = onOpenSearch) }

        if (state.loadingPosts && state.posts.isEmpty()) {
            items(6, key = { "shimmer_$it" }) { i ->
                com.mhub.app.ui.components.ListCardShimmer(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                )
            }
        } else if (!state.loadingPosts && state.posts.isEmpty()) {
            item(key = "empty") {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    AppEmptyState(icon = Icons.Outlined.ImageNotSupported, title = "No listings found", subtitle = "Try a different category or filter")
                }
            }
        } else {
            if (isGridView) {
                // 2-column grid view (web parity)
                val chunked = state.posts.chunked(2)
                items(chunked.size, key = { "grid_row_$it" }) { rowIdx ->
                    val row = chunked[rowIdx]
                    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { post ->
                            Card(
                                onClick = { onOpenPost(post.stableId) },
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.weight(1f),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(2.dp),
                            ) {
                                Column {
                                    Box(Modifier.fillMaxWidth().height(130.dp)) {
                                        if (post.primaryImage != null) {
                                            AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)))
                                        } else {
                                            Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                                                Icon(Icons.Outlined.ImageNotSupported, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(28.dp))
                                            }
                                        }
                                        // Wishlist icon overlay (top-right)
                                        val isWished = wishlisted.contains(post.stableId)
                                        Icon(
                                            if (isWished) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                                            contentDescription = null,
                                            tint = if (isWished) Color(0xFFEF4444) else androidx.compose.ui.graphics.Color.White,
                                            modifier = Modifier
                                                .align(Alignment.TopEnd)
                                                .padding(8.dp)
                                                .size(20.dp)
                                                .clickable { onToggleWishlist(post.stableId) },
                                        )
                                    }
                                    Column(Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(post.displayTitle, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                                        post.price?.let { Text("₹${"%,.0f".format(it)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary) }
                                        post.location?.let { loc ->
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(loc, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            }
                                        }
                                        post.viewCount?.let { v ->
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.Visibility, null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(" $v views", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            } else {
                items(state.posts, key = { it.stableId }) { post ->
                    AllPostCard(post = post, onClick = { onOpenPost(post.stableId) }, isWishlisted = wishlisted.contains(post.stableId), onToggleWishlist = { onToggleWishlist(post.stableId) }, isCompared = state.compareItems.contains(post.stableId), onToggleCompare = { onToggleCompare(post.stableId) }, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp).animateItem())
                }
            }
            item(key = "load_more") {
                if (state.loadingMore) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.primary)
                    }
                } else if (!state.hasMore && state.posts.isNotEmpty()) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        Text("You've seen all listings", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryCard(
    category: Category,
    tint: Color,
    emoji: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = tint),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = emoji,
                style = MaterialTheme.typography.headlineSmall,
            )
            Text(
                text = category.displayName,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
    }
}

@Composable
private fun AllPostCard(
    post: Post,
    onClick: () -> Unit,
    isWishlisted: Boolean = false,
    onToggleWishlist: () -> Unit = {},
    isCompared: Boolean = false,
    onToggleCompare: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var showFullDescription by remember { mutableStateOf(false) }
    var localLiked by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Author row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                val initial = (post.userName?.firstOrNull() ?: post.sellerName?.firstOrNull() ?: 'M').uppercaseChar().toString()
                Box(
                    modifier = Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(initial, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = post.userName ?: post.sellerName ?: "Community member",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = post.location ?: "MHub network",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        post.createdAt?.take(10)?.let { date ->
                            Text("·", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                            Text(date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    // Seller rating stars — derived from likeCount as proxy
                    val likeRating = (post.likeCount ?: 0).coerceIn(0, 200)
                    if (likeRating > 0) {
                        val stars = ((likeRating / 40.0) + 3.0).coerceIn(3.0, 5.0)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            repeat(5) { star ->
                                Text(if (star < stars.toInt()) "★" else "☆", fontSize = 10.sp, color = if (star < stars.toInt()) Color(0xFFF59E0B) else Color(0xFFCBD5E1))
                            }
                            Text("${"%,.1f".format(stars)}", fontSize = 10.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }

            // Title
            Text(
                text = post.displayTitle,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            // Category + subcategory tags
            if (!post.category.isNullOrBlank()) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF3B82F6).copy(alpha = 0.15f)) {
                        Text(post.category, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF3B82F6), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                    }
                    post.subcategory?.let { sub ->
                        Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF10B981).copy(alpha = 0.15f)) {
                            Text(sub, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFF10B981), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }
                }
            }

            // Description
            if (!post.description.isNullOrBlank()) {
                Column {
                    Text(
                        text = post.description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = if (showFullDescription) Int.MAX_VALUE else 3,
                        overflow = if (showFullDescription) TextOverflow.Visible else TextOverflow.Ellipsis,
                    )
                    if (post.description.length > 120) {
                        Text(
                            text = if (showFullDescription) "Show less" else "Read more",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.clickable { showFullDescription = !showFullDescription }.padding(top = 4.dp),
                        )
                    }
                }
            }

            // Image with price badge + HOT badge + condition badge
            if (post.primaryImage != null) {
                Box(Modifier.fillMaxWidth().height(220.dp)) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = post.displayTitle,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)),
                    )
                    post.price?.let { price ->
                        Surface(
                            Modifier.align(Alignment.BottomStart).padding(8.dp),
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF1E293B).copy(alpha = 0.85f),
                        ) {
                            Text("₹${"%,.0f".format(price)}", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = Color.White, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                        }
                    }
                    // HOT badge — top-right for high-view items
                    val viewCount = post.viewCount ?: 0
                    if (viewCount > 50) {
                        Surface(
                            Modifier.align(Alignment.TopEnd).padding(8.dp),
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFEF4444),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp),
                            ) {
                                Text("🔥", fontSize = 10.sp)
                                Text("HOT", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                            }
                        }
                    }
                    // Condition badge — top-left
                    post.condition?.let { cond ->
                        val (condColor, condLabel) = when (cond.lowercase()) {
                            "new" -> Color(0xFF10B981) to "NEW"
                            "like new", "like_new" -> Color(0xFF3B82F6) to "LIKE NEW"
                            "good" -> Color(0xFFF59E0B) to "GOOD"
                            "fair" -> Color(0xFFEA580C) to "FAIR"
                            else -> Color(0xFF6366F1) to cond.uppercase().take(8)
                        }
                        Surface(
                            Modifier.align(Alignment.TopStart).padding(8.dp),
                            shape = RoundedCornerShape(6.dp),
                            color = condColor,
                        ) {
                            Text(condLabel, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }
            }

            // Engagement bar: pill-style (web parity)
            @OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
            androidx.compose.foundation.layout.FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                // Like pill
                Surface(shape = RoundedCornerShape(20.dp), color = if (localLiked) Color(0xFFEF4444).copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.clickable { localLiked = !localLiked }) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (localLiked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder, null, tint = if (localLiked) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text(if (localLiked) "Liked" else "Like", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (localLiked) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Share pill
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.clickable {
                    val shareIntent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Check out ${post.displayTitle} on MHub!") }
                    context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                }) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Share, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text("Share", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Save pill
                Surface(shape = RoundedCornerShape(20.dp), color = if (isWishlisted) Color(0xFF6366F1).copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.clickable { onToggleWishlist() }) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (isWishlisted) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, null, tint = if (isWishlisted) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text(if (isWishlisted) "Saved" else "Save", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (isWishlisted) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Views pill
                post.viewCount?.takeIf { it > 0 }?.let { v ->
                    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                            Text("$v", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                Spacer(Modifier.weight(1f))
                // View Details CTA
                Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF6366F1).copy(alpha = 0.1f), modifier = Modifier.clickable(onClick = onClick)) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Visibility, null, tint = Color(0xFF6366F1), modifier = Modifier.size(14.dp))
                        Text("View Details", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF6366F1))
                    }
                }
            }
        }
    }
}

@Composable
private fun TrendingCard(
    post: Post,
    onClick: () -> Unit,
    isWishlisted: Boolean = false,
    onToggleWishlist: () -> Unit = {},
    onAddToCompare: () -> Unit = {},
    modifier: Modifier = Modifier.width(170.dp),
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp, pressedElevation = 1.dp),
        modifier = modifier,
    ) {
        Column {
            // Image with overlays
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
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
                    Icon(Icons.Outlined.ImageNotSupported, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                // Price badge overlay
                post.price?.let {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF0F172A).copy(alpha = 0.82f),
                        modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                    ) {
                        Text(
                            "₹${"%,.0f".format(it)}",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                }
                // Condition badge (top-start)
                post.condition?.let { cond ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (cond.lowercase().contains("new")) Color(0xFF10B981).copy(alpha = 0.9f) else Color(0xFFF59E0B).copy(alpha = 0.9f),
                        modifier = Modifier.align(Alignment.TopStart).padding(8.dp),
                    ) {
                        Text(
                            cond,
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                // Heart + Compare overlay (top-end)
                Row(
                    modifier = Modifier.align(Alignment.TopEnd).padding(6.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.5f),
                        modifier = Modifier.size(28.dp),
                        onClick = onToggleWishlist,
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Icon(
                                if (isWishlisted) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                                contentDescription = null,
                                tint = if (isWishlisted) Color(0xFFEF4444) else Color.White,
                                modifier = Modifier.size(14.dp),
                            )
                        }
                    }
                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.5f),
                        modifier = Modifier.size(28.dp),
                        onClick = onAddToCompare,
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Icon(Icons.Filled.Compare, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }
            // Content area
            Column(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                // Seller row
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Surface(shape = CircleShape, color = Color(0xFF6366F1).copy(alpha = 0.15f), modifier = Modifier.size(18.dp)) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text((post.sellerName ?: post.userName ?: "?").take(1).uppercase(), fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF6366F1))
                        }
                    }
                    Text(
                        post.sellerName ?: post.userName ?: "Seller",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                }
                // Location + views
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(10.dp))
                            Text(loc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 70.dp))
                        }
                    }
                    post.viewCount?.let { views ->
                        if (views > 0) Text("$views views", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchResults(
    loading: Boolean,
    posts: List<Post>,
    onOpenPost: (String) -> Unit,
) {
    when {
        loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
        posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            AppEmptyState(
                icon = Icons.Default.Search,
                title = "No results found",
                subtitle = "Try a shorter or different search term.",
            )
        }
        else -> LazyColumn(
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(posts, key = { it.stableId }) { post ->
                SearchResultCard(post = post, onClick = { onOpenPost(post.stableId) })
            }
        }
    }
}

@Composable
private fun SearchResultCard(post: Post, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
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
                    Icon(Icons.Outlined.Category, contentDescription = null)
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                post.price?.let {
                    Text(
                        text = "₹${"%,.0f".format(it)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    post.categoryName?.let { cat ->
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Text(
                                text = cat,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                            )
                        }
                        Spacer(Modifier.width(6.dp))
                    }
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(12.dp),
                            )
                            Text(
                                text = loc,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}
