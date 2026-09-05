@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.zaruda.app.ui.feed

import android.content.Intent
import android.widget.Toast
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
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Update
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.TextButton
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.zaruda.app.R
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.FeedItem
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.ListShimmer
import com.zaruda.app.ui.explore.SharedExploreStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import androidx.compose.runtime.Stable
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
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
    private val socialRepo: com.zaruda.app.data.repository.SocialRepository,
    private val localeManager: com.zaruda.app.core.LocaleManager,
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
            // Fast timeout: show mock data within 4s if API unavailable
            val result = kotlinx.coroutines.withTimeoutOrNull(4000L) {
                socialRepo.feed(page = 1)
            } ?: ApiResult.Failure(com.zaruda.app.core.ApiError.Timeout)
            when (result) {
                is ApiResult.Success -> {
                    // Honest empty state: real feed only — never inject mock posts
                    _state.value = _state.value.copy(
                        loading = false,
                        refreshing = false,
                        feedItems = sortFeedItems(result.data, _state.value.sortOption),
                        currentPage = 1,
                        hasMore = result.data.size >= 20,
                        error = null,
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    refreshing = false,
                    feedItems = emptyList(),
                    error = result.error.message, // show error + retry instead of fake content
                )
            }
        }
    }

    fun setSortOption(option: String) {
        val current = _state.value.copy(sortOption = option)
        // Client-side sorts: re-sort locally without re-fetching from API.
        // Server-side sorts ("For You") require a fresh API call.
        val clientSort = option in setOf("Recent", "Oldest", "Views", "Likes", "Title", "Shuffle")
        if (clientSort && current.feedItems.isNotEmpty()) {
            _state.value = current.copy(feedItems = sortFeedItems(current.feedItems, option))
        } else {
            _state.value = current
            load(refresh = true)
        }
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
            val result = kotlinx.coroutines.withTimeoutOrNull(4000L) {
                socialRepo.feed(page = nextPage)
            } ?: ApiResult.Failure(com.zaruda.app.core.ApiError.Timeout)
            when (result) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        loadingMore = false,
                        feedItems = _state.value.feedItems + sortFeedItems(result.data, current.sortOption),
                        currentPage = nextPage,
                        hasMore = result.data.size >= 20,
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loadingMore = false)
            }
        }
    }

    private fun sortFeedItems(items: List<FeedItem>, sortOption: String): List<FeedItem> = when (sortOption) {
        "Recent" -> items.sortedByDescending { it.createdAt }
        "Oldest" -> items.sortedBy { it.createdAt }
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

    fun recordViewed(item: FeedItem) {
        SharedExploreStore.addRecentlyViewedFeed(item)
        viewModelScope.launch {
            runCatching { socialRepo.viewPost(item.stableId) }
            runCatching { socialRepo.trackViewed(item.stableId) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    onOpenPost: (String) -> Unit,
    onCreatePost: (String) -> Unit = {},
    onOpenMyFeed: () -> Unit = {},
    onOpenProfile: (String) -> Unit = {},
    isGuest: Boolean = false,
    onNavigateToLogin: () -> Unit = {},
    viewModel: FeedViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var debouncedQuery by remember { mutableStateOf("") }
    var showSearch by remember { mutableStateOf(false) }
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
                it.displayContent.contains(debouncedQuery, ignoreCase = true) ||
                it.userName?.contains(debouncedQuery, ignoreCase = true) == true
        }
        if (isGuest) searched.take(5) else searched
    }

    Box(modifier = Modifier.fillMaxSize()) {
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier.fillMaxSize(),
        ) {
            when {
                state.loading -> ListShimmer(count = 5, modifier = Modifier.padding(top = 100.dp))

                state.error != null && state.feedItems.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = stringResource(R.string.feed_unavailable),
                        message = state.error ?: stringResource(R.string.feed_unavailable),
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry",
                    )
                }

                else -> {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 100.dp),
                        verticalArrangement = Arrangement.spacedBy(when (state.density) {
                            "COMPACT" -> 6.dp
                            "SPACIOUS" -> 16.dp
                            else -> 10.dp
                        }),
                    ) {
                        // ── Layer 1: Scenic Hero Backdrop ──
                        item(key = "feed_hero") {
                            FeedHeroBackdrop()
                        }

                        // ── Layer 2: 32dp Floating Curved Sheet Header ──
                        item(key = "curved_sheet_header") {
                            Surface(
                                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                                color = MaterialTheme.colorScheme.background,
                                shadowElevation = 8.dp,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 14.dp, bottom = 4.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    // Centered tactile drag handle (40.dp x 4.dp)
                                    Box(
                                        modifier = Modifier
                                            .size(width = 40.dp, height = 4.dp)
                                            .clip(RoundedCornerShape(2.dp))
                                            .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f))
                                    )

                                    Spacer(Modifier.height(10.dp))

                                    // Search input if open
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
                                            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 6.dp),
                                        )
                                    }

                                    // Filter Pills & Density controls
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 14.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        val sortPillNewest = state.sortOption == "Recent"
                                        val sortPillOldest = state.sortOption == "Oldest"
                                        Surface(
                                            shape = RoundedCornerShape(16.dp),
                                            color = if (sortPillNewest) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                            modifier = Modifier.clickable { viewModel.setSortOption("Recent") },
                                        ) {
                                            Text(
                                                "↓ Newest",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = if (sortPillNewest) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                                            )
                                        }
                                        Surface(
                                            shape = RoundedCornerShape(16.dp),
                                            color = if (sortPillOldest) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                            modifier = Modifier.clickable { viewModel.setSortOption("Oldest") },
                                        ) {
                                            Text(
                                                "↑ Oldest",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = if (sortPillOldest) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                                            )
                                        }
                                        Spacer(Modifier.weight(1f))
                                        if (filteredPosts.isNotEmpty()) {
                                            Text(
                                                "${filteredPosts.size} stories",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Composer Card at top of feed
                        item(key = "composer_card") {
                            Box(modifier = Modifier.padding(horizontal = 14.dp)) {
                                ComposerCard(onCreatePost = { text -> onCreatePost(text) })
                            }
                        }
                        if (filteredPosts.isEmpty()) {
                            item(key = "empty_feed_state") {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 36.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    AppEmptyState(
                                        icon = Icons.Outlined.AccountCircle,
                                        title = "No feed posts yet",
                                        subtitle = "Be the first to share an update with the community!",
                                    )
                                }
                            }
                        } else {
                            items(filteredPosts, key = { it.stableId }) { post ->
                            Box(modifier = Modifier.padding(horizontal = 14.dp)) {
                                FeedCard(
                                    post = post,
                                    onOpenPost = {
                                        viewModel.recordViewed(post)
                                        onOpenPost(post.stableId)
                                    },
                                    onOpenProfile = onOpenProfile,
                                    density = state.density,
                                    isBookmarked = post.stableId in state.bookmarkedIds,
                                    onBookmark = { viewModel.toggleBookmark(post.stableId) },
                                    isLiked = post.stableId in state.likedIds,
                                    onLike = { viewModel.toggleLike(post.stableId) },
                                )
                            }
                        }
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
                        if (isGuest && filteredPosts.size > 5) {
                            item(key = "guest_login_cta") {
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f),
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp),
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
                }
            }
        }

        // ── Layer 3: Pinned Floating Glassmorphic Top Controls ──
        FeedFloatingTopBar(
            onMyFeed = onOpenMyFeed,
            onCreatePost = { onCreatePost("") },
            onSearchToggle = { showSearch = !showSearch },
            showSearch = showSearch,
        )

        // Floating Action Button for Create Post
        FloatingActionButton(
            onClick = { onCreatePost("") },
            containerColor = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 16.dp, bottom = 80.dp),
        ) {
            Icon(Icons.Default.Add, "Create post", tint = MaterialTheme.colorScheme.onPrimary)
        }

        // Back-to-top button
        com.zaruda.app.ui.components.BackToTopButton(
            listState = listState,
            coroutineScope = coroutineScope,
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 144.dp),
        )
    }
}

@Composable
private fun ComposerCard(onCreatePost: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    var text by rememberSaveable { mutableStateOf("") }
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(
                    modifier = Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Add, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(24.dp))
                }
                if (!expanded) {
                    Text(
                        "Share something...",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f).clickable { expanded = true },
                    )
                    Icon(
                        Icons.AutoMirrored.Outlined.Send,
                        null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.clickable { onCreatePost(text) }
                    )
                } else {
                    OutlinedTextField(
                        value = text,
                        onValueChange = { text = it },
                        placeholder = { Text("What's on your mind?") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        maxLines = 4,
                    )
                }
            }
            if (expanded) {
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                ) {
                    TextButton(onClick = { expanded = false; text = "" }) { Text("Cancel") }
                    Button(
                        onClick = { onCreatePost(text) },
                        enabled = text.isNotBlank(),
                    ) {
                        Icon(Icons.AutoMirrored.Outlined.Send, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Post")
                    }
                }
            }
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
    onOpenProfile: (String) -> Unit = {},
    density: String = "NORMAL",
    isBookmarked: Boolean = false,
    onBookmark: () -> Unit = {},
    isLiked: Boolean = false,
    onLike: () -> Unit = {},
) {
    var localLiked by remember(isLiked) { mutableStateOf(isLiked) }
    var showFullDescription by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current

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
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.clickable { post.userId?.let { onOpenProfile(it) } },
                    )
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "Local network",
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
                            Icon(Icons.Filled.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
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
                            onClick = {
                                showMoreMenu = false
                                Toast.makeText(context, "Post reported. We'll review it shortly.", Toast.LENGTH_SHORT).show()
                            },
                        )
                        DropdownMenuItem(
                            text = { Text("Promote") },
                            leadingIcon = { Icon(Icons.Outlined.Campaign, null, modifier = Modifier.size(18.dp)) },
                            onClick = {
                                showMoreMenu = false
                                Toast.makeText(context, "Promotion feature coming soon", Toast.LENGTH_SHORT).show()
                            },
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

            // Show content/description body (if it differs from the title, otherwise a short excerpt)
            val bodyText = post.content?.takeIf { it.isNotBlank() }
                ?: post.description?.takeIf { it.isNotBlank() }
                ?: post.displayContent.takeIf { it != post.title && it.isNotBlank() }
                ?: ""
            if (bodyText.isNotBlank()) {
                Column {
                    Text(
                        text = bodyText,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = if (showFullDescription) Int.MAX_VALUE else 3,
                        overflow = if (showFullDescription) TextOverflow.Visible else TextOverflow.Ellipsis,
                    )
                    if (bodyText.length > 120) {
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

            // Action bar: social pill buttons (Like | Share | Save | Views)
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
                    modifier = Modifier.clickable { localLiked = !localLiked; onLike(); haptic.performHapticFeedback(HapticFeedbackType.LongPress) },
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
                        val shareIntent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Check out this community post!") }
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
                    color = if (isBookmarked) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.clickable { onBookmark() },
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (isBookmarked) Icons.Default.Bookmark else Icons.Default.BookmarkBorder, null, tint = if (isBookmarked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text(if (isBookmarked) "Saved" else "Save", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (isBookmarked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
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
            }

            // View full post button (prominent CTA with gradient accent)
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                tonalElevation = 2.dp,
                modifier = Modifier.fillMaxWidth().clickable { onOpenPost() },
            ) {
                Row(
                    Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Article,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "View full post",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                    Spacer(Modifier.width(6.dp))
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowForward,
                        null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(18.dp),
                    )
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

@Composable
private fun FeedHeroBackdrop() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(280.dp)
    ) {
        AsyncImage(
            model = "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
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
                        text = "LIVE COMMUNITY PULSE",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }
            Text(
                text = "Community Pulse 👥",
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = "⚡ Community updates, local stories & verified deals",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

@Composable
private fun FeedFloatingTopBar(
    onMyFeed: () -> Unit,
    onCreatePost: () -> Unit,
    onSearchToggle: () -> Unit,
    showSearch: Boolean,
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
            Text(
                text = "👥 Community Pulse",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
            Spacer(Modifier.weight(1f))
            IconButton(
                onClick = onSearchToggle,
                modifier = Modifier.size(34.dp)
            ) {
                Icon(
                    if (showSearch) Icons.Default.Close else Icons.Default.Search,
                    contentDescription = "Search",
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(Modifier.width(4.dp))
            // My Feed — labeled pill so it reads as a button, not a profile icon
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White.copy(alpha = 0.14f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
                modifier = Modifier.clickable { onMyFeed() }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        Icons.Outlined.AccountCircle,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(14.dp)
                    )
                    Text("My Feed", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.width(4.dp))
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color(0xFF3B82F6),
                modifier = Modifier.clickable { onCreatePost() }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(Icons.Default.Add, null, tint = Color.White, modifier = Modifier.size(14.dp))
                    Text("Post", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
