package com.mhub.app.ui.home

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Category
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.PostGridShimmer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/* ── APPS gradient map ────────────────────────────────────────────────── */

private val APP_GRADIENTS = mapOf(
    "electronics" to listOf(Color(0xFF3B82F6), Color(0xFF4F46E5), Color(0xFF7C3AED)),
    "fashion"     to listOf(Color(0xFFEC4899), Color(0xFFF43F5E), Color(0xFFEF4444)),
    "vehicles"    to listOf(Color(0xFF10B981), Color(0xFF14B8A6), Color(0xFF0891B2)),
    "others"      to listOf(Color(0xFFA855F7), Color(0xFF7C3AED), Color(0xFF4F46E5)),
)
private val APP_EMOJIS = mapOf(
    "electronics" to "💻", "fashion" to "👗", "vehicles" to "🚗", "others" to "✨",
)

/* ── UI State ─────────────────────────────────────────────────────────── */

data class CategoryDetailState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val posts: List<Post> = emptyList(),
    val subcategories: List<Category> = emptyList(),
    val selectedSubcategory: String? = null,
    val sortBy: String = "newest",
    val page: Int = 1,
    val hasMore: Boolean = true,
    val error: String? = null,
    val searchQuery: String = "",
    val isGridView: Boolean = true,
)

/* ── ViewModel ────────────────────────────────────────────────────────── */

@HiltViewModel
class CategoryDetailViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val categoriesRepo: CategoriesRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    val categoryKey: String = checkNotNull(savedStateHandle["categoryKey"])

    private val _state = MutableStateFlow(CategoryDetailState())
    val state: StateFlow<CategoryDetailState> = _state.asStateFlow()

    init { load() }

    fun load(reset: Boolean = true) {
        if (reset) _state.value = CategoryDetailState(loading = true)
        viewModelScope.launch {
            // Load subcategories for this group
            when (val r = categoriesRepo.all()) {
                is ApiResult.Success -> {
                    val subs = r.data.filter { cat ->
                        val group = (cat.categoryGroup ?: "others").lowercase()
                        group == categoryKey || (categoryKey == "others" && group !in listOf("electronics", "fashion", "vehicles"))
                    }
                    _state.value = _state.value.copy(subcategories = subs)
                }
                is ApiResult.Failure -> { /* subcategories are optional filter chips - continue without them */ }
            }
            fetchPosts(reset = true)
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            fetchPosts(reset = true)
            _state.value = _state.value.copy(refreshing = false)
        }
    }

    fun selectSubcategory(id: String?) {
        _state.value = _state.value.copy(selectedSubcategory = id, page = 1, posts = emptyList(), loading = true)
        viewModelScope.launch { fetchPosts(reset = true) }
    }

    fun setSortBy(sort: String) {
        _state.value = _state.value.copy(sortBy = sort, page = 1, posts = emptyList(), loading = true)
        viewModelScope.launch { fetchPosts(reset = true) }
    }

    fun setSearch(q: String) { _state.value = _state.value.copy(searchQuery = q) }
    fun toggleViewMode() { _state.value = _state.value.copy(isGridView = !_state.value.isGridView) }

    fun loadMore() {
        if (!_state.value.hasMore || _state.value.loading) return
        viewModelScope.launch { fetchPosts(reset = false) }
    }

    private suspend fun fetchPosts(reset: Boolean) {
        val s = _state.value
        val page = if (reset) 1 else s.page
        when (val r = postsRepo.feed(page = page, limit = 20, categoryId = s.selectedSubcategory ?: categoryKey)) {
            is ApiResult.Success -> {
                val newList = if (reset) r.data else s.posts + r.data
                _state.value = _state.value.copy(
                    loading = false,
                    posts = newList,
                    page = page + 1,
                    hasMore = r.data.size >= 20,
                    error = null,
                )
            }
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
        }
    }
}

/* ── Screen ───────────────────────────────────────────────────────────── */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryDetailScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    viewModel: CategoryDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val gradients = APP_GRADIENTS[viewModel.categoryKey] ?: listOf(Color(0xFF3B82F6), Color(0xFF7C3AED))
    val emoji = APP_EMOJIS[viewModel.categoryKey] ?: "🛒"
    val title = viewModel.categoryKey.replaceFirstChar { it.uppercase() }
    var showSortSheet by remember { mutableStateOf(false) }
    val sortSheetState = rememberModalBottomSheetState()

    Scaffold(
        topBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.horizontalGradient(gradients))
                    .windowInsetsPadding(WindowInsets.statusBars),
            ) {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(emoji, fontSize = 20.sp)
                            Spacer(Modifier.width(8.dp))
                            Text(title, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color.White)
                        }
                    },
                    actions = {
                        IconButton(onClick = { viewModel.toggleViewMode() }) {
                            Icon(if (state.isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Filled.GridView, "Toggle view", tint = Color.White)
                        }
                        IconButton(onClick = { showSortSheet = true }) {
                            Icon(Icons.AutoMirrored.Filled.Sort, "Sort", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        scrolledContainerColor = Color.Transparent,
                    ),
                )
            }
        },
    ) { padding ->
        @OptIn(ExperimentalMaterial3Api::class)
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.padding(padding).fillMaxSize(),
        ) {
            LazyColumn(
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                // Breadcrumbs
                item {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Hub", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("›", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(title, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = gradients.first())
                        if (state.selectedSubcategory != null) {
                            Text("›", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(state.subcategories.find { it.stableId == state.selectedSubcategory }?.displayName ?: "", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                // Subcategory filter chips
                if (state.subcategories.isNotEmpty()) {
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            item {
                                CategoryFilterChip(
                                    label = "All",
                                    selected = state.selectedSubcategory == null,
                                    gradient = gradients,
                                    onClick = { viewModel.selectSubcategory(null) },
                                )
                            }
                            items(state.subcategories, key = { it.stableId }) { sub ->
                                CategoryFilterChip(
                                    label = sub.displayName,
                                    selected = state.selectedSubcategory == sub.stableId,
                                    gradient = gradients,
                                    onClick = { viewModel.selectSubcategory(sub.stableId) },
                                )
                            }
                        }
                    }
                }

                // Brand filter (from post data)
                if (state.posts.isNotEmpty()) {
                    item {
                        val brands = state.posts.mapNotNull { it.brand }.distinct().take(5)
                        if (brands.isNotEmpty()) {
                            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                item { Text("Brand:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                items(brands) { brand ->
                                    FilterChip(selected = false, onClick = {}, label = { Text(brand, fontSize = 11.sp) })
                                }
                            }
                        }
                    }
                }
                // Search bar
                item {
                    OutlinedTextField(
                        value = state.searchQuery, onValueChange = viewModel::setSearch,
                        placeholder = { Text("Search in $title…") },
                        leadingIcon = { Icon(Icons.Filled.Search, null) },
                        trailingIcon = { if (state.searchQuery.isNotEmpty()) IconButton(onClick = { viewModel.setSearch("") }) { Icon(Icons.Filled.Clear, null) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = gradients.first(), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    )
                }

                // Sort + count bar
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "${state.posts.size}+ listings",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        TextButton(onClick = { showSortSheet = true }) {
                            Icon(Icons.AutoMirrored.Filled.Sort, null, Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(
                                when (state.sortBy) {
                                    "price_asc" -> "Price ↑"
                                    "price_desc" -> "Price ↓"
                                    "popular" -> "Popular"
                                    else -> "Newest"
                                },
                                style = MaterialTheme.typography.labelMedium,
                            )
                        }
                    }
                }

                // Posts grid (2 columns inside LazyColumn via chunked)
                if (state.loading) {
                    item {
                        PostGridShimmer(
                            count = 6,
                            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        )
                    }
                } else if (state.error != null) {
                    item {
                        AppErrorState(
                            message = state.error ?: "Error loading posts",
                            onRetry = { viewModel.load() },
                        )
                    }
                } else if (state.posts.isEmpty()) {
                    item {
                        AppEmptyState(
                            icon = Icons.Outlined.Inventory2,
                            title = "No listings yet",
                            subtitle = "Be the first to list in $title",
                        )
                    }
                } else {
                    val filteredPosts = if (state.searchQuery.isBlank()) state.posts else state.posts.filter { it.displayTitle.contains(state.searchQuery, true) }
                    if (filteredPosts.isEmpty()) {
                        item {
                            AppEmptyState(
                                icon = Icons.Outlined.Inventory2,
                                title = "No results",
                                subtitle = "Try a different search term",
                            )
                        }
                    } else if (state.isGridView) {
                    // Chunk into rows of 2
                    val chunked = filteredPosts.chunked(2)
                    items(chunked, key = { it.first().stableId }) { row ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            row.forEach { post ->
                                Box(modifier = Modifier.weight(1f)) {
                                    PostGridCard(
                                        post = post,
                                        accentColor = gradients.first(),
                                        onClick = { onOpenPost(post.stableId) },
                                    )
                                }
                            }
                            if (row.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                    } else {
                        // List view
                        items(filteredPosts, key = { it.stableId }) { post ->
                            Surface(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp).clickable { onOpenPost(post.stableId) },
                                shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp,
                            ) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    if (post.primaryImage != null) {
                                        AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.size(72.dp).clip(RoundedCornerShape(10.dp)))
                                    } else {
                                        Box(Modifier.size(72.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1)) }
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 2, color = Color(0xFF1E293B))
                                        if (post.price != null) { Spacer(Modifier.height(4.dp)); Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, color = gradients.first()) }
                                        if (post.location != null) { Spacer(Modifier.height(2.dp)); Text(post.location, fontSize = 12.sp, color = Color(0xFF64748B)) }
                                    }
                                }
                            }
                        }
                    }

                    // Load more trigger
                    if (state.hasMore) {
                        item {
                            LaunchedEffect(state.posts.size) { viewModel.loadMore() }
                            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = gradients.first())
                            }
                        }
                    }
                }
            }
        }
    }

    // Sort bottom sheet
    if (showSortSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSortSheet = false },
            sheetState = sortSheetState,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text("Sort By", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                listOf(
                    "newest" to "Newest First",
                    "popular" to "Most Popular",
                    "price_asc" to "Price: Low to High",
                    "price_desc" to "Price: High to Low",
                ).forEach { (key, label) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { viewModel.setSortBy(key); showSortSheet = false }
                            .background(if (state.sortBy == key) gradients.first().copy(alpha = 0.1f) else Color.Transparent)
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            label,
                            fontWeight = if (state.sortBy == key) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (state.sortBy == key) gradients.first() else MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

/* ── Filter Chip ──────────────────────────────────────────────────────── */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryFilterChip(
    label: String,
    selected: Boolean,
    gradient: List<Color>,
    onClick: () -> Unit,
) {
    val bg by animateColorAsState(if (selected) gradient.first() else Color.Transparent)
    val textColor by animateColorAsState(if (selected) Color.White else MaterialTheme.colorScheme.onSurface)

    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label, color = textColor, fontSize = 13.sp) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = gradient.first(),
            selectedLabelColor = Color.White,
        ),
    )
}

/* ── Post Grid Card ───────────────────────────────────────────────────── */

@Composable
fun PostGridCard(
    post: Post,
    accentColor: Color = Color(0xFF2F66EA),
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column {
            // Image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            ) {
                if (!post.primaryImage.isNullOrBlank()) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = post.displayTitle,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(
                        Icons.Outlined.ImageNotSupported,
                        null,
                        modifier = Modifier.align(Alignment.Center).size(32.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                    )
                }

                // Wishlist heart
                var wishlisted by remember { mutableStateOf(false) }
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.3f))
                        .clickable { wishlisted = !wishlisted },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        if (wishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Wishlist",
                        tint = if (wishlisted) Color(0xFFEF4444) else Color.White,
                        modifier = Modifier.size(14.dp),
                    )
                }

                // Condition badge
                if (!post.condition.isNullOrBlank()) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(6.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color.Black.copy(alpha = 0.55f))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(
                            post.condition!!,
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }

                // Price overlay
                if (post.price != null) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(6.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(accentColor)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    ) {
                        Text(
                            "₹${post.price.toLong()}",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }

            // Info
            Column(modifier = Modifier.padding(10.dp)) {
                Text(
                    post.displayTitle,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.bodyMedium,
                )
                if (!post.location.isNullOrBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocationOn,
                            null,
                            modifier = Modifier.size(11.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            post.location!!,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}
