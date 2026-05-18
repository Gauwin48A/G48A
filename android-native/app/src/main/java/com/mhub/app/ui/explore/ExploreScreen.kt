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
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TrendingUp
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
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ExploreState(
    val categories: List<Category> = emptyList(),
    val trending: List<Post> = emptyList(),
    val recommendations: List<Post> = emptyList(),
    val searchQuery: String = "",
    val searchResults: List<Post> = emptyList(),
    val isSearching: Boolean = false,
    val refreshing: Boolean = false,
    val loadingCategories: Boolean = true,
    val loadingTrending: Boolean = true,
    val loadingRecs: Boolean = true,
)

@HiltViewModel
class ExploreViewModel @Inject constructor(
    private val categoriesRepo: CategoriesRepository,
    private val postsRepo: PostsRepository,
    private val recsRepo: RecommendationsRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(ExploreState())
    val state: StateFlow<ExploreState> = _state.asStateFlow()

    private var searchJob: Job? = null
    private var lastLocaleVersion = 0L

    init {
        loadCategories()
        loadTrending()
        loadRecommendations()
        // Observe locale changes → reload data with new language
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) {
                    loadCategories()
                    loadTrending()
                    loadRecommendations()
                }
                lastLocaleVersion = version
            }
        }
    }

    private fun loadCategories() {
        viewModelScope.launch {
            when (val result = categoriesRepo.all()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loadingCategories = false,
                    categories = result.data,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(loadingCategories = false)
            }
        }
    }

    private fun loadTrending() {
        viewModelScope.launch {
            when (val result = postsRepo.feed(limit = 12)) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loadingTrending = false,
                    trending = result.data.ifEmpty { com.mhub.app.ui.foryou.samplePosts.take(6) },
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loadingTrending = false,
                    trending = com.mhub.app.ui.foryou.samplePosts.take(6),
                )
            }
        }
    }

    private fun loadRecommendations() {
        viewModelScope.launch {
            when (val result = recsRepo.forYou()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loadingRecs = false,
                    recommendations = result.data.ifEmpty { com.mhub.app.ui.foryou.samplePosts.drop(3).take(6) },
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loadingRecs = false,
                    recommendations = com.mhub.app.ui.foryou.samplePosts.drop(3).take(6),
                )
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            loadCategories()
            loadTrending()
            loadRecommendations()
            _state.value = _state.value.copy(refreshing = false)
        }
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
                is ApiResult.Success -> _state.value = _state.value.copy(
                    isSearching = false,
                    searchResults = result.data,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(isSearching = false)
            }
        }
    }

    fun clearSearch() {
        searchJob?.cancel()
        _state.value = _state.value.copy(searchQuery = "", searchResults = emptyList(), isSearching = false)
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
    viewModel: ExploreViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val focusManager = LocalFocusManager.current
    val title = stringResource(R.string.explore_title)
    val subtitle = stringResource(R.string.explore_subtitle)

    Scaffold(containerColor = MaterialTheme.colorScheme.background) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // ── Hero Section (web-parity: AllPosts.jsx hero) ──
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(listOf(Color(0xFF1E40AF), Color(0xFF4338CA), Color(0xFF6D28D9))),
                    )
                    .padding(horizontal = 20.dp, vertical = 18.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        "Marketplace",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.sp,
                    )
                    Text(
                        title,
                        color = Color.White,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 26.sp,
                    )
                    Text(subtitle, color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                    Spacer(Modifier.height(4.dp))
                    // Stats pills
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        val recCount = state.recommendations.size + state.trending.size
                        HeroPill("\uD83D\uDCE6 ${if (recCount > 0) "$recCount items" else "Browse"}")
                        HeroPill("⚡ Live market")
                        HeroPill("${state.categories.size} categories")
                    }
                }
            }

            // Search bar
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = viewModel::onQueryChange,
                singleLine = true,
                placeholder = { Text("Search products, services, jobs...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (state.searchQuery.isNotBlank()) {
                        IconButton(onClick = { viewModel.clearSearch() }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear")
                        }
                    }
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            )

            if (state.searchQuery.isNotBlank()) {
                SearchResults(loading = state.isSearching, posts = state.searchResults, onOpenPost = onOpenPost)
            } else {
                DiscoveryFeed(state = state, onOpenPost = onOpenPost, onOpenSearch = onOpenSearch)
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

private data class QuickFilterDef(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val quickFilters = listOf(
    QuickFilterDef("New", Icons.Outlined.NewReleases),
    QuickFilterDef("Trending", Icons.AutoMirrored.Filled.TrendingUp),
    QuickFilterDef("Top Rated", Icons.Outlined.Star),
    QuickFilterDef("Offers", Icons.Outlined.LocalOffer),
)

@Composable
private fun GreatDealsBanner(onShopNow: () -> Unit) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Box(Modifier.size(6.dp).background(Color(0xFFF59E0B), CircleShape))
                    Text("SPONSORED", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B), letterSpacing = 1.sp)
                }
                Spacer(Modifier.height(6.dp))
                Text("Great Deals", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E3A5F))
                Text("Up to 50% off on select items", fontSize = 12.sp, color = Color(0xFF64748B))
                Spacer(Modifier.height(10.dp))
                Surface(
                    onClick = onShopNow,
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF2563EB),
                ) {
                    Text(
                        "⚡ Shop now",
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                }
            }
            Text("🛍️", fontSize = 48.sp, modifier = Modifier.padding(start = 12.dp))
        }
    }
}

@Composable
private fun DiscoveryFeed(
    state: ExploreState,
    onOpenPost: (String) -> Unit,
    onOpenSearch: () -> Unit,
) {
    LazyColumn(contentPadding = PaddingValues(bottom = 90.dp)) {
        // ── Quick Filter Chips (sticky-feel, scrollable) ──
        item {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(vertical = 8.dp),
            ) {
                items(quickFilters) { filter ->
                    FilterChip(
                        selected = false,
                        onClick = onOpenSearch,
                        label = { Text(filter.label, style = MaterialTheme.typography.labelMedium) },
                        leadingIcon = {
                            Icon(filter.icon, contentDescription = null, modifier = Modifier.size(16.dp))
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            borderColor = MaterialTheme.colorScheme.outlineVariant,
                            enabled = true,
                            selected = false,
                        ),
                    )
                }
                // Price range chips
                items(listOf("Under ₹1K", "₹1K-5K", "₹5K-20K", "Above ₹20K")) { label ->
                    FilterChip(
                        selected = false,
                        onClick = onOpenSearch,
                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                        leadingIcon = { Text("₹", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.colorScheme.primary) },
                        colors = FilterChipDefaults.filterChipColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            borderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                            enabled = true,
                            selected = false,
                        ),
                    )
                }
            }
        }

        // ── Great Deals Banner ──
        item {
            GreatDealsBanner(onShopNow = onOpenSearch)
        }

        // Categories header
        item {
            SectionHeader(
                title = "Browse Categories",
                subtitle = "Find what you're looking for",
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }

        // Category grid (2 columns)
        if (state.loadingCategories) {
            item {
                Box(Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
        } else if (state.categories.isEmpty()) {
            item {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    AppEmptyState(
                        icon = Icons.Outlined.Category,
                        title = "No categories",
                        subtitle = "Categories will appear here.",
                    )
                }
            }
        } else {
            items(state.categories.chunked(3), key = { row -> row.joinToString("-") { it.stableId } }) { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    row.forEachIndexed { index, category ->
                        val tint = CategoryTints[(row.indexOf(category) + state.categories.indexOf(category)) % CategoryTints.size]
                        CategoryCard(
                            category = category,
                            tint = tint,
                            emoji = categoryEmoji(category.displayName),
                            onClick = onOpenSearch,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    // Fill remaining slots if row is incomplete
                    repeat(3 - row.size) {
                        Spacer(Modifier.weight(1f))
                    }
                }
            }
        }

        // Trending header
        item {
            SectionHeader(
                title = "Trending Now",
                subtitle = "Most viewed listings",
                actionLabel = "See All",
                onAction = onOpenSearch,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }

        // Trending horizontal scroll
        if (state.loadingTrending) {
            item {
                Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
        } else if (state.trending.isNotEmpty()) {
            item {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(vertical = 4.dp),
                ) {
                    items(state.trending, key = { it.stableId }) { post ->
                        TrendingCard(post = post, onClick = { onOpenPost(post.stableId) })
                    }
                }
            }
        }

        // For You header
        item {
            SectionHeader(
                title = "For You",
                subtitle = "Personalized recommendations",
                actionLabel = "See All",
                onAction = onOpenSearch,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }

        // For You grid (2 columns)
        if (state.loadingRecs) {
            item {
                Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
        } else if (state.recommendations.isNotEmpty()) {
            items(state.recommendations.chunked(2), key = { row -> row.joinToString("-") { it.stableId } }) { row ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    row.forEach { post ->
                        TrendingCard(post = post, onClick = { onOpenPost(post.stableId) }, modifier = Modifier.weight(1f))
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
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
private fun TrendingCard(post: Post, onClick: () -> Unit, modifier: Modifier = Modifier.width(170.dp)) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp, pressedElevation = 1.dp),
        modifier = modifier,
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
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
                // Category badge overlay
                post.categoryName?.let { cat ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color.Black.copy(alpha = 0.6f),
                        modifier = Modifier.align(Alignment.TopStart).padding(8.dp),
                    ) {
                        Text(
                            cat,
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
            }
            Column(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                post.price?.let {
                    Text(
                        text = "₹${"%,.0f".format(it)}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                // Location + views
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(10.dp))
                            Text(loc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 80.dp))
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
