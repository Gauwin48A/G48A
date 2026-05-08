package com.mhub.app.ui.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NewReleases
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.mhub.app.domain.model.Category
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.PostGridShimmer
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit

private enum class SortOption(val label: String) {
    NEWEST("New"),
    POPULAR("Popular"),
    PRICE_ASC("Price low-high"),
    PRICE_DESC("Price high-low"),
}

// Relative time formatting: "2h ago", "3d ago"
private fun relativeTime(isoDate: String?): String {
    if (isoDate.isNullOrBlank()) return ""
    return try {
        val then = Instant.parse(isoDate)
        val now = Instant.now()
        val mins = ChronoUnit.MINUTES.between(then, now)
        when {
            mins < 1 -> "now"
            mins < 60 -> "${mins}m ago"
            mins < 1440 -> "${mins / 60}h ago"
            mins < 10080 -> "${mins / 1440}d ago"
            else -> "${mins / 10080}w ago"
        }
    } catch (_: Exception) { "" }
}

private data class PostFilters(
    val minPrice: Float = 0f,
    val maxPrice: Float = 100000f,
    val condition: String = "Any",
    val location: String = "",
    val verifiedOnly: Boolean = false,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterBottomSheet(
    filters: PostFilters,
    onApply: (PostFilters) -> Unit,
    onDismiss: () -> Unit,
) {
    var priceRange by remember { mutableStateOf(filters.minPrice..filters.maxPrice) }
    var condition by remember { mutableStateOf(filters.condition) }
    var location by remember { mutableStateOf(filters.location) }
    var verifiedOnly by remember { mutableStateOf(filters.verifiedOnly) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
            Text("Filters", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))

            Text("Price Range: ₹${"%,.0f".format(priceRange.start)} — ₹${"%,.0f".format(priceRange.endInclusive)}", style = MaterialTheme.typography.labelMedium)
            RangeSlider(value = priceRange, onValueChange = { priceRange = it }, valueRange = 0f..500000f, steps = 9)
            Spacer(Modifier.height(12.dp))

            Text("Condition", style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 4.dp)) {
                listOf("Any", "New", "Used", "Like New").forEach { opt ->
                    FilterChip(selected = condition == opt, onClick = { condition = opt }, label = { Text(opt) })
                }
            }
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(value = location, onValueChange = { location = it }, label = { Text("Location") }, singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Verified sellers only")
                Switch(checked = verifiedOnly, onCheckedChange = { verifiedOnly = it })
            }
            Spacer(Modifier.height(16.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                androidx.compose.material3.OutlinedButton(onClick = {
                    onApply(PostFilters()); onDismiss()
                }, modifier = Modifier.weight(1f)) { Text("Reset") }
                androidx.compose.material3.Button(onClick = {
                    onApply(PostFilters(priceRange.start, priceRange.endInclusive, condition, location, verifiedOnly)); onDismiss()
                }, modifier = Modifier.weight(1f)) { Text("Apply") }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

/* ── Category theme data ──────────────────────────────────────────────── */

private data class CategoryTheme(
    val key: String,
    val label: String,
    val emoji: String,
    val tagline: String,
    val gradient: List<Color>,
)

private val CATEGORY_THEMES = mapOf(
    "electronics" to CategoryTheme("electronics", "Electronics", "📱", "Phones, laptops & gadgets",
        listOf(Color(0xFF3B82F6), Color(0xFF4F46E5), Color(0xFF7C3AED))),
    "fashion" to CategoryTheme("fashion", "Fashion", "👗", "Clothing, shoes & accessories",
        listOf(Color(0xFFEC4899), Color(0xFFF43F5E), Color(0xFFEF4444))),
    "vehicles" to CategoryTheme("vehicles", "Vehicles", "🚗", "Cars, bikes & spare parts",
        listOf(Color(0xFF10B981), Color(0xFF14B8A6), Color(0xFF0891B2))),
    "others" to CategoryTheme("others", "Others", "✨", "Home, services, jobs & more",
        listOf(Color(0xFFA855F7), Color(0xFF7C3AED), Color(0xFF4F46E5))),
)

/* ── Hero banner for active category ──────────────────────────────────── */

@Composable
private fun CategoryHeroBanner(
    theme: CategoryTheme,
    listingsCount: Int,
    onChangeApp: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.horizontalGradient(theme.gradient))
            .padding(20.dp),
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(theme.emoji, fontSize = 32.sp)
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(theme.label, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                        Text(theme.tagline, color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp)
                    }
                }
                Surface(
                    onClick = onChangeApp,
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White.copy(alpha = 0.2f),
                ) {
                    Text(
                        "Switch",
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    )
                }
            }
            if (listingsCount > 0) {
                Spacer(Modifier.height(8.dp))
                Text(
                    "$listingsCount listings available",
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

/* ── Quick-access row (Cart / Wishlist / Recently Viewed) ─────────────── */

@Composable
private fun QuickAccessRow(
    onOpenCart: () -> Unit,
    onOpenWishlist: () -> Unit,
    onOpenRecentlyViewed: () -> Unit,
    accentColor: Color,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        QuickAccessChip(Icons.Default.ShoppingCart, "Cart", accentColor, Modifier.weight(1f), onOpenCart)
        QuickAccessChip(Icons.Default.FavoriteBorder, "Wishlist", accentColor, Modifier.weight(1f), onOpenWishlist)
        QuickAccessChip(Icons.Default.History, "Recent", accentColor, Modifier.weight(1f), onOpenRecentlyViewed)
    }
}

@Composable
private fun QuickAccessChip(
    icon: ImageVector,
    label: String,
    accentColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = accentColor.copy(alpha = 0.08f),
        modifier = modifier,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(icon, null, tint = accentColor, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, color = accentColor, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

/* ── Subcategory strip (shown when a category app is active) ──────────── */

@Composable
private fun SubcategoryStrip(
    subcategories: List<Category>,
    selected: String?,
    accentColor: Color,
    onSelect: (String?) -> Unit,
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
    ) {
        item {
            FilterChip(
                selected = selected == null,
                onClick = { onSelect(null) },
                label = { Text("All", style = MaterialTheme.typography.labelMedium) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = accentColor,
                    selectedLabelColor = Color.White,
                ),
            )
        }
        items(subcategories, key = { it.stableId }) { sub ->
            FilterChip(
                selected = selected == sub.stableId,
                onClick = { onSelect(sub.stableId) },
                label = { Text(sub.displayName, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = accentColor,
                    selectedLabelColor = Color.White,
                ),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onOpenPost: (String) -> Unit,
    onOpenSearch: () -> Unit = {},
    onCreatePost: () -> Unit = {},
    onOpenExplore: () -> Unit = {},
    onOpenCategories: () -> Unit = {},
    activeCategoryKey: String? = null,
    onChangeApp: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    onOpenWishlist: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var gridMode by remember { mutableStateOf(false) }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var sortBy by remember { mutableStateOf(SortOption.NEWEST) }
    var searchQuery by remember { mutableStateOf("") }
    var showSearch by remember { mutableStateOf(false) }
    var showFilterSheet by remember { mutableStateOf(false) }
    var filters by remember { mutableStateOf(PostFilters()) }
    var quickFilter by remember { mutableStateOf<String?>(null) }
    var showShareSheet by remember { mutableStateOf(false) }
    var sharePostId by remember { mutableStateOf("") }
    var sharePostTitle by remember { mutableStateOf("") }
    var showInterestModal by remember { mutableStateOf(false) }
    var interestPostId by remember { mutableStateOf("") }
    var interestPostTitle by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val categoryTheme = activeCategoryKey?.let { CATEGORY_THEMES[it] }

    // Sync category key with ViewModel
    LaunchedEffect(activeCategoryKey) {
        viewModel.setCategoryKey(activeCategoryKey)
    }

    // Auto-refresh every 30 seconds
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(30_000L)
            viewModel.load()
        }
    }

    if (showShareSheet) {
        com.mhub.app.ui.components.ShareLinkBottomSheet(
            title = sharePostTitle, postId = sharePostId,
            onDismiss = { showShareSheet = false },
        )
    }
    if (showInterestModal) {
        com.mhub.app.ui.components.BuyerInterestModal(
            postId = interestPostId, postTitle = interestPostTitle,
            onDismiss = { showInterestModal = false },
            onSubmit = { _, _, _ -> showInterestModal = false },
        )
    }

    val filteredPosts = remember(state.posts, selectedCategory, sortBy, searchQuery, filters, quickFilter) {
        state.posts
            .filter { post ->
                (selectedCategory == null || post.categoryName == selectedCategory) &&
                    (searchQuery.isBlank() ||
                        post.displayTitle.contains(searchQuery, ignoreCase = true) ||
                        post.location?.contains(searchQuery, ignoreCase = true) == true ||
                        post.categoryName?.contains(searchQuery, ignoreCase = true) == true) &&
                    (filters.condition == "Any" || post.condition?.equals(filters.condition, ignoreCase = true) == true) &&
                    (filters.location.isBlank() || post.location?.contains(filters.location, ignoreCase = true) == true) &&
                    (!filters.verifiedOnly || post.sellerName != null) &&
                    (post.price == null || (post.price >= filters.minPrice && post.price <= filters.maxPrice))
            }
            .let { list ->
                when (quickFilter) {
                    "Under ₹500" -> list.filter { (it.price ?: Double.MAX_VALUE) < 500.0 }
                    "New Arrivals" -> list // already sorted by newest
                    "Near Me" -> list.filter { it.location != null }
                    else -> list
                }
            }
            .let { list ->
                when (sortBy) {
                    SortOption.NEWEST -> list
                    SortOption.POPULAR -> list.sortedByDescending { it.viewCount ?: 0 }
                    SortOption.PRICE_ASC -> list.sortedBy { it.price ?: Double.MAX_VALUE }
                    SortOption.PRICE_DESC -> list.sortedByDescending { it.price ?: 0.0 }
                }
            }
    }

    if (showFilterSheet) {
        FilterBottomSheet(filters = filters, onApply = { filters = it }, onDismiss = { showFilterSheet = false })
    }

    Scaffold(
        topBar = {
            if (categoryTheme != null) {
                // Category-branded top bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.horizontalGradient(categoryTheme.gradient))
                        .padding(top = with(androidx.compose.ui.platform.LocalDensity.current) {
                            androidx.compose.foundation.layout.WindowInsets.statusBars.getTop(this).toDp()
                        }),
                ) {
                    TopAppBar(
                        title = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(categoryTheme.emoji, fontSize = 22.sp)
                                Spacer(Modifier.width(8.dp))
                                Column {
                                    Text(categoryTheme.label, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 18.sp)
                                    Text(categoryTheme.tagline, color = Color.White.copy(alpha = 0.75f), fontSize = 11.sp)
                                }
                            }
                        },
                        actions = {
                            IconButton(onClick = { showSearch = !showSearch }) {
                                Icon(if (showSearch) Icons.Default.Close else Icons.Default.Search, "Search", tint = Color.White)
                            }
                            IconButton(onClick = { showFilterSheet = true }) {
                                Icon(Icons.Default.Tune, "Filters", tint = Color.White)
                            }
                            FilledTonalIconButton(onClick = { gridMode = !gridMode }) {
                                Icon(if (gridMode) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, "Toggle view")
                            }
                            Spacer(Modifier.width(4.dp))
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Color.Transparent,
                            scrolledContainerColor = Color.Transparent,
                        ),
                    )
                }
            } else {
                // Default top bar
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "MHub",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            text = "Trust-First Marketplace",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            letterSpacing = androidx.compose.ui.unit.TextUnit(
                                value = 1.2f,
                                type = androidx.compose.ui.unit.TextUnitType.Sp,
                            ),
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showSearch = !showSearch }) {
                        Icon(
                            imageVector = if (showSearch) Icons.Default.Close else Icons.Default.Search,
                            contentDescription = "Search",
                        )
                    }
                    IconButton(onClick = { showFilterSheet = true }) {
                        Icon(Icons.Default.Tune, contentDescription = "Filters")
                    }
                    FilledTonalIconButton(onClick = { gridMode = !gridMode }) {
                        Icon(
                            imageVector = if (gridMode) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                            contentDescription = "Toggle view",
                        )
                    }
                    Spacer(Modifier.width(4.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
            }
        },
        floatingActionButton = {
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                com.mhub.app.ui.components.BackToTopButton(listState = listState, coroutineScope = coroutineScope)
                ExtendedFloatingActionButton(
                    onClick = onCreatePost,
                    icon = { Icon(Icons.Default.Add, contentDescription = null) },
                    text = { Text("Sell", fontWeight = FontWeight.SemiBold) },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 4.dp),
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load() },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            when {
                state.loading && state.posts.isEmpty() -> PostGridShimmer(
                    count = 6,
                    modifier = Modifier.fillMaxSize().padding(top = 8.dp),
                )
                state.error != null && state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = "Feed unavailable",
                        message = state.error ?: "Could not load posts.",
                        onRetry = { viewModel.load(initial = true) },
                        retryLabel = "Reload feed",
                    )
                }
                state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppEmptyState(icon = Icons.Outlined.Inventory2, title = "No listings yet", subtitle = "Pull to refresh or create the first listing.")
                }
                else -> LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(bottom = 100.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    // Category hero banner when inside a category app
                    if (categoryTheme != null) {
                        item {
                            CategoryHeroBanner(
                                theme = categoryTheme,
                                listingsCount = state.posts.size,
                                onChangeApp = onChangeApp,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                        // Quick access row (Cart, Wishlist, Recently Viewed)
                        item {
                            QuickAccessRow(
                                onOpenCart = onOpenCart,
                                onOpenWishlist = onOpenWishlist,
                                onOpenRecentlyViewed = onOpenRecentlyViewed,
                                accentColor = categoryTheme.gradient.first(),
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            )
                        }
                    } else {
                        // Great Deals promotional banner (no category active)
                        item {
                            com.mhub.app.ui.components.GreatDealsBanner(
                                onShopNow = { quickFilter = "Under ₹500" },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                    }

                    if (showSearch) {
                        item {
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text("Search listings, categories...") },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                trailingIcon = {
                                    if (searchQuery.isNotBlank()) {
                                        IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Close, contentDescription = "Clear") }
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
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                            )
                        }
                    }

                    // Subcategory chips (category app) or category chips (all-posts)
                    if (categoryTheme != null && state.subcategories.isNotEmpty()) {
                        item {
                            SubcategoryStrip(
                                subcategories = state.subcategories,
                                selected = state.selectedSubcategory,
                                accentColor = categoryTheme.gradient.first(),
                                onSelect = { viewModel.selectSubcategory(it) },
                            )
                        }
                    } else if (state.categories.isNotEmpty()) {
                        item {
                            CategoriesStrip(categories = state.categories, selected = selectedCategory, onSelect = { tapped ->
                                selectedCategory = if (selectedCategory == tapped) null else tapped
                            })
                        }
                    }

                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                        ) {
                            items(SortOption.entries) { option ->
                                FilterChip(
                                    selected = sortBy == option,
                                    onClick = { sortBy = option },
                                    label = { Text(option.label, style = MaterialTheme.typography.labelMedium) },
                                    leadingIcon = when (option) {
                                        SortOption.POPULAR -> ({ Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, modifier = Modifier.size(14.dp)) })
                                        SortOption.NEWEST -> ({ Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(14.dp)) })
                                        else -> null
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }

                    // Quick filter chips
                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 2.dp),
                        ) {
                            val quickFilters = listOf("Under ₹500" to Icons.Default.LocalOffer, "Near Me" to Icons.Default.LocationOn, "New Arrivals" to Icons.Default.NewReleases)
                            items(quickFilters, key = { it.first }) { (label, icon) ->
                                FilterChip(
                                    selected = quickFilter == label,
                                    onClick = { quickFilter = if (quickFilter == label) null else label },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(14.dp)) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.tertiary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onTertiary,
                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onTertiary,
                                    ),
                                )
                            }
                        }
                    }

                    item {
                        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("${filteredPosts.size} listing${if (filteredPosts.size != 1) "s" else ""}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (selectedCategory != null) {
                                Spacer(Modifier.width(6.dp))
                                Text("in $selectedCategory", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium)
                            }
                        }
                    }

                    if (filteredPosts.isEmpty()) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                                AppEmptyState(icon = Icons.Outlined.Inventory2, title = "No results", subtitle = "Try a different filter or search term.")
                            }
                        }
                    } else if (gridMode) {
                        items(filteredPosts.chunked(2), key = { row -> row.joinToString("-") { it.stableId } }) { row ->
                            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                row.forEach { post -> GridPostCard(post = post, onClick = { onOpenPost(post.stableId) }, modifier = Modifier.weight(1f)) }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    } else {
                        items(filteredPosts, key = { it.stableId }) { post ->
                            ListPostCard(
                                post = post,
                                onClick = { onOpenPost(post.stableId) },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                onShare = {
                                    sharePostId = post.stableId
                                    sharePostTitle = post.displayTitle
                                    showShareSheet = true
                                },
                                onInterested = {
                                    interestPostId = post.stableId
                                    interestPostTitle = post.displayTitle
                                    showInterestModal = true
                                },
                            )
                        }
                    }

                    // Infinite scroll: load more when reaching end
                    if (state.hasMore && filteredPosts.isNotEmpty()) {
                        item {
                            LaunchedEffect(Unit) { viewModel.loadMore() }
                            if (state.loadingMore) {
                                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
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
private fun CategoriesStrip(categories: List<Category>, selected: String?, onSelect: (String) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)) {
        items(categories, key = { it.stableId }) { category ->
            val active = selected == category.displayName
            FilterChip(
                selected = active,
                onClick = { onSelect(category.displayName) },
                label = { Text(category.displayName, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                ),
            )
        }
    }
}

@Composable
fun ListPostCard(
    post: Post,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    onShare: (() -> Unit)? = null,
    onInterested: (() -> Unit)? = null,
    isOwner: Boolean = false,
) {
    var wishlisted by remember { mutableStateOf(false) }
    var liked by remember { mutableStateOf(false) }
    val allImages = remember(post) {
        buildList {
            post.primaryImage?.let { add(it) }
            post.images.filter { it != post.primaryImage }.forEach { add(it) }
        }
    }
    Card(onClick = onClick, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp), modifier = modifier.fillMaxWidth()) {
        Column {
            // Seller header row
            if (post.sellerName != null || post.userName != null) {
                val name = post.sellerName ?: post.userName ?: "Seller"
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(28.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(name.take(1).uppercase(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                        Spacer(Modifier.width(6.dp))
                        Text(name, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 160.dp))
                        if (post.sellerName != null) {
                            Spacer(Modifier.width(4.dp))
                            Icon(Icons.Default.VerifiedUser, contentDescription = "Verified", tint = Color(0xFF3B82F6), modifier = Modifier.size(14.dp))
                        }
                    }
                    com.mhub.app.ui.components.PostMoreMenuButton(
                        postId = post.stableId, isOwner = isOwner,
                        onShare = { onShare?.invoke() }, onReport = {},
                        onAddToCart = {}, onSave = { wishlisted = !wishlisted },
                    )
                }
            }
            Box(modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
                if (allImages.size > 1) {
                    val pagerState = rememberPagerState(pageCount = { allImages.size })
                    HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                        AsyncImage(model = allImages[page], contentDescription = post.displayTitle, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)))
                    }
                    // Page indicator dots
                    Row(modifier = Modifier.align(Alignment.BottomCenter).padding(8.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        repeat(allImages.size) { i ->
                            Box(modifier = Modifier.size(if (i == pagerState.currentPage) 8.dp else 6.dp).clip(CircleShape).background(if (i == pagerState.currentPage) Color.White else Color.White.copy(alpha = 0.5f)))
                        }
                    }
                } else if (post.primaryImage != null) {
                    AsyncImage(model = post.primaryImage, contentDescription = post.displayTitle, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)))
                } else {
                    Box(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.ImageNotSupported, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(36.dp))
                    }
                }
                Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.55f)), startY = 80f)))
                post.price?.let { price ->
                    Text("INR ${"%,.0f".format(price)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.align(Alignment.BottomStart).padding(12.dp))
                }
                val heartColor by animateColorAsState(if (wishlisted) Color(0xFFEF4444) else Color.White, label = "wishlist")
                IconButton(onClick = { wishlisted = !wishlisted }, modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(36.dp).background(Color.Black.copy(alpha = 0.25f), CircleShape)) {
                    Icon(imageVector = if (wishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder, contentDescription = "Wishlist", tint = heartColor, modifier = Modifier.size(18.dp))
                }
            }
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(text = post.displayTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                post.categoryName?.let { cat ->
                    Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.align(Alignment.Start)) {
                        Text(cat, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    post.condition?.let { cond ->
                        Surface(shape = RoundedCornerShape(6.dp), color = if (cond.lowercase() == "new") Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant) {
                            Text(cond.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = if (cond.lowercase() == "new") Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                    post.brand?.let { b ->
                        Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                            Text(b, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                    post.sellerName?.let {
                        Icon(Icons.Default.VerifiedUser, contentDescription = "Verified", tint = Color(0xFF3B82F6), modifier = Modifier.size(14.dp))
                    }
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                        Spacer(Modifier.width(3.dp))
                        Text(post.location ?: "Nearby", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    val timeAgo = relativeTime(post.createdAt)
                    if (timeAgo.isNotBlank()) {
                        Text(timeAgo, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(8.dp))
                    }
                    post.viewCount?.let { views ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Visibility, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                            Spacer(Modifier.width(3.dp))
                            Text(views.toString(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                // Action row
                HorizontalDivider(modifier = Modifier.padding(top = 6.dp), thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
                com.mhub.app.ui.components.PostActionRow(
                    postId = post.stableId,
                    viewCount = post.viewCount ?: 0,
                    isLiked = liked,
                    isWishlisted = wishlisted,
                    onLike = { liked = !liked },
                    onWishlist = { wishlisted = !wishlisted },
                    onInterested = { onInterested?.invoke() },
                    onShare = { onShare?.invoke() },
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
                )
            }
        }
    }
}

@Composable
fun GridPostCard(post: Post, onClick: () -> Unit, modifier: Modifier = Modifier) {
    var wishlisted by remember { mutableStateOf(false) }
    Card(onClick = onClick, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp), modifier = modifier) {
        Column {
            Box(modifier = Modifier.fillMaxWidth().aspectRatio(4f / 3f)) {
                if (post.primaryImage != null) {
                    AsyncImage(model = post.primaryImage, contentDescription = post.displayTitle, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)))
                } else {
                    Box(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.ImageNotSupported, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f)), startY = 60f)))
                post.price?.let { price ->
                    Text("INR ${"%,.0f".format(price)}", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.align(Alignment.BottomStart).padding(8.dp))
                }
                val heartColor by animateColorAsState(if (wishlisted) Color(0xFFEF4444) else Color.White, label = "wishlist")
                Box(modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).size(28.dp).background(Color.Black.copy(alpha = 0.25f), CircleShape).clickable { wishlisted = !wishlisted }, contentAlignment = Alignment.Center) {
                    Icon(imageVector = if (wishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder, contentDescription = "Wishlist", tint = heartColor, modifier = Modifier.size(14.dp))
                }
            }
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(text = post.displayTitle, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                    post.condition?.let { cond ->
                        Surface(shape = RoundedCornerShape(4.dp), color = if (cond.lowercase() == "new") Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant) {
                            Text(cond.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = if (cond.lowercase() == "new") Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                        }
                    }
                    post.sellerName?.let {
                        Icon(Icons.Default.VerifiedUser, contentDescription = "Verified", tint = Color(0xFF3B82F6), modifier = Modifier.size(12.dp))
                    }
                }
                post.location?.let {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(11.dp))
                        Spacer(Modifier.width(2.dp))
                        Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}
