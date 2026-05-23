@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.mhub.app.ui.feed

import android.content.Intent
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Update
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FloatingActionButton
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
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.mhub.app.R
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.FeedItem
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.ListShimmer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import androidx.compose.runtime.Stable
import javax.inject.Inject

@Stable
data class FeedState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val loadingMore: Boolean = false,
    val feedItems: List<FeedItem> = emptyList(),
    val error: String? = null,
    val sortOption: String = "For You", // Changed from selectedTab
    val currentPage: Int = 1,
    val hasMore: Boolean = true,
    val likedIds: Set<String> = emptySet(),
    val bookmarkedIds: Set<String> = emptySet(),
    val density: String = "NORMAL", // COMPACT, NORMAL, SPACIOUS
)

@HiltViewModel
class FeedViewModel @Inject constructor(
    private val socialRepo: com.mhub.app.data.repository.SocialRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(FeedState())
    val state: StateFlow<FeedState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L

    init {
        load()
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load(refresh = true) }
                lastLocaleVersion = version
            }
        }
    }

    fun load(refresh: Boolean = false) {
        _state.value = _state.value.copy(
            loading = !refresh && _state.value.feedItems.isEmpty(),
            refreshing = refresh,
            error = null,
            currentPage = 1,
            hasMore = true,
        )
        viewModelScope.launch {
            when (val result = socialRepo.feed(page = 1)) {
                is ApiResult.Success -> {
                    val items = sortFeedItems(result.data, _state.value.sortOption)
                    _state.value = _state.value.copy(
                        loading = false,
                        refreshing = false,
                        feedItems = items,
                        currentPage = 1,
                        hasMore = result.data.size >= 20,
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    refreshing = false,
                    feedItems = emptyList(),
                    error = result.error.message,
                )
            }
        }
    }

    fun setSortOption(option: String) {
        _state.value = _state.value.copy(sortOption = option)
        load(refresh = true)
    }

    fun setDensity(density: String) {
        _state.value = _state.value.copy(density = density)
    }

    fun selectTab(index: Int) {
        val option = when (index) {
            1 -> "Views"
            2 -> "Recent"
            else -> "For You"
        }
        setSortOption(option)
    }

    fun loadMore() {
        val current = _state.value
        if (current.loadingMore || !current.hasMore) return
        val nextPage = current.currentPage + 1
        _state.value = current.copy(loadingMore = true)
        viewModelScope.launch {
            when (val result = socialRepo.feed(page = nextPage)) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loadingMore = false,
                    feedItems = _state.value.feedItems + sortFeedItems(result.data, current.sortOption),
                    currentPage = nextPage,
                    hasMore = result.data.size >= 20,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(loadingMore = false)
            }
        }
    }

    private fun sortFeedItems(items: List<FeedItem>, sortOption: String): List<FeedItem> = when (sortOption) {
        "Recent" -> items.sortedByDescending { it.createdAt }
        "Updated" -> items.sortedByDescending { it.createdAt } // FeedItem has no updatedAt; fall back to created
        "Views" -> items.sortedByDescending { it.effectiveViews }
        "Likes" -> items.sortedByDescending { it.effectiveLikes }
        "Title" -> items.sortedBy { it.title?.lowercase() ?: "" }
        "Shuffle" -> items.shuffled()
        else -> items // "For You" = API default (relevance order)
    }

    fun toggleLike(itemId: String) {
        val current = _state.value
        val newLiked = if (itemId in current.likedIds) current.likedIds - itemId else current.likedIds + itemId
        _state.value = current.copy(likedIds = newLiked)
        viewModelScope.launch { runCatching { socialRepo.likePost(itemId) } }
    }

    fun toggleBookmark(itemId: String) {
        val current = _state.value
        val newBookmarked = if (itemId in current.bookmarkedIds) current.bookmarkedIds - itemId else current.bookmarkedIds + itemId
        _state.value = current.copy(bookmarkedIds = newBookmarked)
        viewModelScope.launch { runCatching { socialRepo.bookmarkPost(itemId) } }
    }
}

private val feedSortOptions = listOf("For You", "Shuffle", "Recent", "Updated", "Views", "Likes", "Title")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    onOpenPost: (String) -> Unit,
    onCreatePost: () -> Unit = {},
    isGuest: Boolean = false,
    onNavigateToLogin: () -> Unit = {},
    viewModel: FeedViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var debouncedQuery by remember { mutableStateOf("") }
    var showSearch by remember { mutableStateOf(false) }
    var showImageZoom by remember { mutableStateOf(false) }
    var zoomImages by remember { mutableStateOf<List<String>>(emptyList()) }
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    val focusManager = androidx.compose.ui.platform.LocalFocusManager.current

    // Search debounce (350ms matching web)
    LaunchedEffect(searchQuery) {
        kotlinx.coroutines.delay(350)
        debouncedQuery = searchQuery
    }

    val filteredPosts = remember(state.feedItems, debouncedQuery, isGuest) {
        val searched = if (debouncedQuery.isBlank()) state.feedItems
        else state.feedItems.filter {
            it.title?.contains(debouncedQuery, ignoreCase = true) == true ||
                it.content?.contains(debouncedQuery, ignoreCase = true) == true ||
                it.userName?.contains(debouncedQuery, ignoreCase = true) == true
        }
        if (isGuest) searched.take(5) else searched
    }

    if (showImageZoom && zoomImages.isNotEmpty()) {
        com.mhub.app.ui.components.ImageZoomDialog(
            imageUrls = zoomImages,
            onDismiss = { showImageZoom = false },
        )
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Column {
                            Text(stringResource(R.string.feed_title), fontWeight = FontWeight.Bold)
                            Text(
                                stringResource(R.string.feed_subtitle),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    },
                    actions = {
                        // Sort dropdown
                        var showSortMenu by remember { mutableStateOf(false) }
                        Box {
                            IconButton(onClick = { showSortMenu = true }) {
                                Icon(Icons.Default.ArrowDropDown, contentDescription = "Sort")
                            }
                            DropdownMenu(expanded = showSortMenu, onDismissRequest = { showSortMenu = false }) {
                                listOf("For You" to "✨ Discover", "Shuffle" to "🔀 Shuffle", "Recent" to "🆕 Newest", "Updated" to "📝 Updated", "Views" to "👁 Popular", "Likes" to "❤ Most Liked", "Title" to "🔤 Title").forEach { (value, label) ->
                                    DropdownMenuItem(
                                        text = { Text(label) },
                                        onClick = { viewModel.setSortOption(value); showSortMenu = false },
                                        leadingIcon = if (state.sortOption == value) {{ Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp)) }} else null,
                                    )
                                }
                            }
                        }
                        // Density toggle
                        var showDensityMenu by remember { mutableStateOf(false) }
                        Box {
                            IconButton(onClick = { showDensityMenu = true }) {
                                Icon(Icons.Default.Visibility, contentDescription = "Density", modifier = Modifier.size(20.dp))
                            }
                            DropdownMenu(expanded = showDensityMenu, onDismissRequest = { showDensityMenu = false }) {
                                listOf("COMPACT" to "Compact", "NORMAL" to "Normal", "SPACIOUS" to "Spacious").forEach { (value, label) ->
                                    DropdownMenuItem(
                                        text = { Text(label) },
                                        onClick = { viewModel.setDensity(value); showDensityMenu = false },
                                        leadingIcon = if (state.density == value) {{ Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp)) }} else null,
                                    )
                                }
                            }
                        }
                        IconButton(onClick = { showSearch = !showSearch }) {
                            Icon(
                                if (showSearch) Icons.Default.Close else Icons.Default.Search,
                                contentDescription = "Search",
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                )
                if (showSearch) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text(stringResource(R.string.feed_search_placeholder)) },
                        leadingIcon = { Icon(Icons.Default.Search, null) },
                        trailingIcon = {
                            if (searchQuery.isNotBlank()) {
                                IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Close, null) }
                            }
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                    )
                }
                // Sort order pills row (web parity)
                var sortDesc by remember { mutableStateOf(true) }
                Surface(color = MaterialTheme.colorScheme.surface) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (sortDesc) Color(0xFF6366F1) else MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.clickable { sortDesc = true; viewModel.setSortOption("Recent") },
                        ) {
                            Text("↓ Newest first", fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                                color = if (sortDesc) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp))
                        }
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (!sortDesc) Color(0xFF6366F1) else MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.clickable { sortDesc = false; viewModel.setSortOption("For You") },
                        ) {
                            Text("↑ Oldest first", fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                                color = if (!sortDesc) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp))
                        }
                        if (state.feedItems.isNotEmpty()) {
                            Spacer(Modifier.weight(1f))
                            Text("${state.feedItems.size} posts", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreatePost,
                containerColor = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 72.dp),
            ) {
                Icon(Icons.Default.Add, "Create post", tint = MaterialTheme.colorScheme.onPrimary)
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            when {
                state.loading -> ListShimmer(count = 5, modifier = Modifier.padding(top = 12.dp))

                state.error != null && state.feedItems.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = stringResource(R.string.feed_unavailable),
                        message = state.error ?: stringResource(R.string.feed_unavailable),
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry",
                    )
                }

                state.feedItems.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppEmptyState(
                        icon = Icons.Outlined.AccountCircle,
                        title = "No feed posts yet",
                        subtitle = "New updates from users will appear here.",
                    )
                }

                else -> {
                    Box(Modifier.fillMaxSize()) {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(when (state.density) {
                                "COMPACT" -> 6.dp
                                "SPACIOUS" -> 16.dp
                                else -> 10.dp
                            }),
                        ) {
                            // Hero banner (web parity: from-indigo-600 via-purple-600 to-blue-600)
                            item(key = "hero_banner") {
                                Box(
                                    modifier = Modifier.fillMaxWidth()
                                        .background(Brush.horizontalGradient(listOf(Color(0xFF4F46E5), Color(0xFF7C3AED), Color(0xFF2563EB))))
                                        .padding(horizontal = 16.dp, vertical = 12.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Icon(Icons.Outlined.Update, null, tint = Color.White.copy(alpha = 0.9f), modifier = Modifier.size(22.dp))
                                                Text("News & Updates", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                                            }
                                            Text(
                                                "Share knowledge, news, and updates with the community",
                                                fontSize = 12.sp, color = Color.White.copy(alpha = 0.7f), lineHeight = 16.sp,
                                            )
                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.15f)) {
                                                    Text("Community feed", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                                }
                                                Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.1f)) {
                                                    Text("Browse marketplace", fontSize = 10.sp, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                                }
                                            }
                                        }
                                        Spacer(Modifier.width(8.dp))
                                        Column(verticalArrangement = Arrangement.spacedBy(6.dp), horizontalAlignment = Alignment.End) {
                                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White.copy(alpha = 0.15f), modifier = Modifier.clickable { }) {
                                                Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    Icon(Icons.Outlined.AccountCircle, null, tint = Color.White, modifier = Modifier.size(14.dp))
                                                    Text("My Feed", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                }
                                            }
                                            if (!isGuest) {
                                                Surface(shape = RoundedCornerShape(12.dp), color = Color.White, modifier = Modifier.clickable(onClick = onCreatePost)) {
                                                    Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                        Icon(Icons.Filled.Add, null, tint = Color(0xFF4F46E5), modifier = Modifier.size(14.dp))
                                                        Text("Share Update", color = Color(0xFF4F46E5), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Composer Card at top
                            item(key = "composer_card") {
                                ComposerCard(onCreatePost = onCreatePost)
                            }
                            items(filteredPosts, key = { it.stableId }) { post ->
                                FeedCard(
                                    post = post,
                                    onOpenPost = { onOpenPost(post.stableId) },
                                    onImageZoom = { urls ->
                                        zoomImages = urls
                                        showImageZoom = true
                                    },
                                    density = state.density,
                                    isBookmarked = post.stableId in state.bookmarkedIds,
                                    onBookmark = { viewModel.toggleBookmark(post.stableId) },
                                    isLiked = post.stableId in state.likedIds,
                                    onLike = { viewModel.toggleLike(post.stableId) },
                                )
                            }
                            if (state.hasMore && filteredPosts.isNotEmpty() && !isGuest) {
                                item {
                                    LaunchedEffect(Unit) { viewModel.loadMore() }
                                    if (state.loadingMore) {
                                        Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                            CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                                        }
                                    }
                                }
                            }
                            // Guest login overlay (web parity: shows after 5 posts)
                            if (isGuest && state.feedItems.size > 5) {
                                item(key = "guest_login_cta") {
                                    Surface(
                                        shape = RoundedCornerShape(16.dp),
                                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f),
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(24.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.spacedBy(12.dp),
                                        ) {
                                            Text(
                                                stringResource(R.string.feed_login_to_see_more),
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                            )
                                            Text(
                                                stringResource(R.string.feed_login_subtitle),
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                                            )
                                            androidx.compose.material3.Button(
                                                onClick = onNavigateToLogin,
                                                shape = RoundedCornerShape(12.dp),
                                            ) {
                                                Text(stringResource(R.string.action_sign_in))
                                            }
                                        }
                                    }
                                }
                            }
                            item { Box(modifier = Modifier.height(56.dp)) }
                        }
                        // Back-to-top button
                        com.mhub.app.ui.components.BackToTopButton(
                            listState = listState,
                            coroutineScope = coroutineScope,
                            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 72.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ComposerCard(onCreatePost: () -> Unit) {
    Card(
        onClick = onCreatePost,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Add, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(24.dp))
            }
            Text(
                "Share something...",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f),
            )
            Icon(Icons.AutoMirrored.Outlined.Send, null, tint = MaterialTheme.colorScheme.primary)
        }
    }
}

// Avatar gradient system (web parity: FeedPage.jsx AVATAR_GRADIENTS + getAvatarGradient)
private val AVATAR_GRADIENT_PAIRS = listOf(
    Color(0xFF818CF8) to Color(0xFFA855F7),  // indigo-400 to purple-500
    Color(0xFF34D399) to Color(0xFF14B8A6),  // emerald-400 to teal-500
    Color(0xFFFBBF24) to Color(0xFFF97316),  // amber-400 to orange-500
    Color(0xFFF472B6) to Color(0xFFF43F5E),  // pink-400 to rose-500
    Color(0xFF38BDF8) to Color(0xFF3B82F6),  // sky-400 to blue-500
)

private fun getAvatarGradient(username: String): Pair<Color, Color> {
    val value = username.trim()
    if (value.isEmpty()) return AVATAR_GRADIENT_PAIRS[0]
    var hash = 0
    for (c in value) { hash = (hash * 31 + c.code) % 100000 }
    return AVATAR_GRADIENT_PAIRS[Math.abs(hash) % AVATAR_GRADIENT_PAIRS.size]
}

@Composable
private fun FeedCard(
    post: FeedItem,
    onOpenPost: () -> Unit,
    onImageZoom: (List<String>) -> Unit = {},
    density: String = "NORMAL",
    isBookmarked: Boolean = false,
    onBookmark: () -> Unit = {},
    isLiked: Boolean = false,
    onLike: () -> Unit = {},
) {
    var localLiked by remember(isLiked) { mutableStateOf(isLiked) }
    var showFullDescription by remember { mutableStateOf(false) }
    val context = LocalContext.current

    // Like animation
    val likeScale by animateFloatAsState(
        targetValue = if (localLiked) 1.0f else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "like_scale",
    )

    val cardPadding = when (density) {
        "COMPACT" -> 10.dp
        "SPACIOUS" -> 18.dp
        else -> 14.dp
    }
    val verticalSpacing = when (density) {
        "COMPACT" -> 6.dp
        "SPACIOUS" -> 12.dp
        else -> 10.dp
    }

    Card(
        onClick = onOpenPost,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(cardPadding),
            verticalArrangement = Arrangement.spacedBy(verticalSpacing),
        ) {
            // Author row with avatar initial
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                val initial = (post.userName?.firstOrNull() ?: 'M').uppercaseChar().toString()
                val (avatarStart, avatarEnd) = getAvatarGradient(post.displayName)
                if (post.userAvatar != null) {
                    AsyncImage(model = post.userAvatar, contentDescription = null, contentScale = ContentScale.Crop,
                        modifier = Modifier.size(40.dp).clip(CircleShape))
                } else {
                    Box(
                        modifier = Modifier.size(40.dp).clip(CircleShape).background(
                            Brush.linearGradient(listOf(avatarStart, avatarEnd))
                        ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(initial, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = post.displayName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "MHub network",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        val timeAgo = relativeTime(post.createdAt)
                        if (timeAgo.isNotBlank()) {
                            Text("·", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                            Text(timeAgo, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    // Location row
                    if (!post.location.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                            Text(post.location, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
                // More menu (web parity: report, promote)
                var showMoreMenu by remember { mutableStateOf(false) }
                Box {
                    IconButton(onClick = { showMoreMenu = true }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                    }
                    DropdownMenu(expanded = showMoreMenu, onDismissRequest = { showMoreMenu = false }) {
                        DropdownMenuItem(
                            text = { Text("Report") },
                            leadingIcon = { Icon(Icons.Outlined.Flag, null, modifier = Modifier.size(18.dp)) },
                            onClick = { showMoreMenu = false },
                        )
                        DropdownMenuItem(
                            text = { Text("Promote") },
                            leadingIcon = { Icon(Icons.Outlined.Campaign, null, modifier = Modifier.size(18.dp)) },
                            onClick = { showMoreMenu = false },
                        )
                    }
                }
            }

            if (!post.title.isNullOrBlank()) {
                Text(
                    text = post.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            // Category/subcategory badges (web parity: shown below author row)
            if (!post.categoryName.isNullOrBlank() || !post.subcategoryName.isNullOrBlank()) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    post.categoryName?.takeIf { it.isNotBlank() }?.let { cat ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFF6366F1).copy(alpha = 0.1f),
                        ) {
                            Text(cat, style = MaterialTheme.typography.labelSmall, color = Color(0xFF6366F1), fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }
                    post.subcategoryName?.takeIf { it.isNotBlank() }?.let { sub ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFF8B5CF6).copy(alpha = 0.1f),
                        ) {
                            Text(sub, style = MaterialTheme.typography.labelSmall, color = Color(0xFF8B5CF6), fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }
                }
            }

            if (!post.content.isNullOrBlank()) {
                Column {
                    Text(
                        text = post.content,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = if (showFullDescription) Int.MAX_VALUE else 3,
                        overflow = if (showFullDescription) TextOverflow.Visible else TextOverflow.Ellipsis,
                    )
                    if ((post.content.length) > 120) {
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

            // Image carousel — multi-image support (web parity: FeedPage.jsx image slider)
            val allImages = remember(post.imageUrl, post.images) {
                (listOfNotNull(post.imageUrl) + post.images.filter { it.isNotBlank() && it != post.imageUrl })
                    .filter { it.isNotBlank() }
            }
            if (allImages.isNotEmpty()) {
                if (allImages.size == 1) {
                    Box(Modifier.fillMaxWidth().height(220.dp)) {
                        AsyncImage(
                            model = allImages[0],
                            contentDescription = post.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)).clickable {
                                onImageZoom(allImages)
                            },
                        )
                    }
                } else {
                    val pagerState = rememberPagerState { allImages.size }
                    Box(Modifier.fillMaxWidth().height(220.dp)) {
                        HorizontalPager(
                            state = pagerState,
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)),
                        ) { page ->
                            AsyncImage(
                                model = allImages[page],
                                contentDescription = "${post.title} image ${page + 1}",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize().clickable { onImageZoom(allImages) },
                            )
                        }
                        // Dot indicators
                        Row(
                            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            allImages.indices.forEach { idx ->
                                Box(
                                    modifier = Modifier
                                        .size(if (pagerState.currentPage == idx) 8.dp else 5.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (pagerState.currentPage == idx) Color.White
                                            else Color.White.copy(alpha = 0.55f)
                                        ),
                                )
                            }
                        }
                        // Page count badge
                        Surface(
                            modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
                            shape = RoundedCornerShape(12.dp),
                            color = Color.Black.copy(alpha = 0.45f),
                        ) {
                            Text(
                                "${pagerState.currentPage + 1}/${allImages.size}",
                                fontSize = 11.sp,
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            )
                        }
                    }
                }
            }

            // Action bar: pill buttons (web parity: Like | Share | Save | Views | View Details)
            androidx.compose.foundation.layout.FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                val likeDisplay = post.effectiveLikes + (if (localLiked && !isLiked) 1 else if (!localLiked && isLiked) -1 else 0)
                // Like pill
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = if (localLiked) Color(0xFFEF4444).copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.clickable { localLiked = !localLiked; onLike() },
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (localLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder, null, tint = if (localLiked) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp).scale(if (localLiked) likeScale else 1f))
                        Text(if (likeDisplay > 0) "$likeDisplay" else if (localLiked) "Liked" else "Like", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (localLiked) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Share pill
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.clickable {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Check out ${post.displayContent} on MHub!") }
                        context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                    },
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Share, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text("Share", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Save pill
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = if (isBookmarked) Color(0xFF6366F1).copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.clickable { onBookmark() },
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (isBookmarked) Icons.Default.Bookmark else Icons.Default.BookmarkBorder, null, tint = if (isBookmarked) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text(if (isBookmarked) "Saved" else "Save", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (isBookmarked) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Views pill
                post.effectiveViews.takeIf { it > 0 }?.let { v ->
                    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                            Text("$v", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                Spacer(Modifier.weight(1f))
                // View Details CTA (web parity: indigo pill button)
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFF6366F1).copy(alpha = 0.1f),
                    modifier = Modifier.clickable(onClick = onOpenPost),
                ) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Visibility, null, tint = Color(0xFF6366F1), modifier = Modifier.size(14.dp))
                        Text("View Details", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF6366F1))
                    }
                }
            }
        }
    }
}

private fun relativeTime(dateStr: String?): String {
    if (dateStr.isNullOrBlank()) return ""
    return try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).also { it.timeZone = java.util.TimeZone.getTimeZone("UTC") }
        val sdf2 = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).also { it.timeZone = java.util.TimeZone.getTimeZone("UTC") }
        val date = try { sdf2.parse(dateStr) } catch (_: Exception) { sdf.parse(dateStr) } ?: return ""
        val diffMs = System.currentTimeMillis() - date.time
        val mins = diffMs / 60_000
        val hours = mins / 60
        val days = hours / 24
        when {
            mins < 1 -> "Just now"
            mins < 60 -> "${mins}m ago"
            hours < 24 -> "${hours}h ago"
            days < 7 -> "${days}d ago"
            days < 30 -> "${days / 7}w ago"
            days < 365 -> "${days / 30}mo ago"
            else -> "${days / 365}y ago"
        }
    } catch (_: Exception) { "" }
}
