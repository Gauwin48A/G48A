package com.mhub.app.ui.feed

import android.content.Intent
import com.mhub.app.ui.foryou.samplePosts
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
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Update
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
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
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Post
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
    val posts: List<Post> = emptyList(),
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
    private val postsRepository: PostsRepository,
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
            loading = !refresh && _state.value.posts.isEmpty(),
            refreshing = refresh,
            error = null,
            currentPage = 1,
            hasMore = true,
        )
        viewModelScope.launch {
            val sort = when (_state.value.sortOption) {
                "Recent" -> "newest"
                "Updated" -> "updated"
                "Views" -> "popular"
                "Likes" -> "likes"
                "Title" -> "title"
                "Shuffle" -> "shuffle"
                else -> null
            }
            when (val result = postsRepository.feed(page = 1, limit = 20, sort = sort)) {
                is ApiResult.Success -> {
                    val posts = result.data.ifEmpty { samplePosts }
                    _state.value = _state.value.copy(
                        loading = false,
                        refreshing = false,
                        posts = posts,
                        currentPage = 1,
                        hasMore = result.data.size >= 20,
                    )
                }

                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    refreshing = false,
                    posts = samplePosts,
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
            val sort = when (current.sortOption) {
                "Recent" -> "newest"
                "Updated" -> "updated"
                "Views" -> "popular"
                "Likes" -> "likes"
                "Title" -> "title"
                "Shuffle" -> "shuffle"
                else -> null
            }
            when (val result = postsRepository.feed(page = nextPage, limit = 20, sort = sort)) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loadingMore = false,
                    posts = _state.value.posts + result.data,
                    currentPage = nextPage,
                    hasMore = result.data.size >= 20,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(loadingMore = false)
            }
        }
    }

    fun toggleLike(postId: String) {
        val current = _state.value
        val newLiked = if (postId in current.likedIds) current.likedIds - postId else current.likedIds + postId
        _state.value = current.copy(likedIds = newLiked)
        viewModelScope.launch { runCatching { socialRepo.likePost(postId) } }
    }

    fun toggleBookmark(postId: String) {
        val current = _state.value
        val newBookmarked = if (postId in current.bookmarkedIds) current.bookmarkedIds - postId else current.bookmarkedIds + postId
        _state.value = current.copy(bookmarkedIds = newBookmarked)
        viewModelScope.launch { runCatching { socialRepo.bookmarkPost(postId) } }
    }
}

private val feedSortOptions = listOf("For You", "Shuffle", "Recent", "Updated", "Views", "Likes", "Title")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    onOpenPost: (String) -> Unit,
    onCreatePost: () -> Unit = {},
    viewModel: FeedViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var showSearch by remember { mutableStateOf(false) }
    var showImageZoom by remember { mutableStateOf(false) }
    var zoomImages by remember { mutableStateOf<List<String>>(emptyList()) }
    var showSortMenu by remember { mutableStateOf(false) }
    var showDensityMenu by remember { mutableStateOf(false) }
    var feedModeTab by remember { mutableIntStateOf(0) }
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    val focusManager = androidx.compose.ui.platform.LocalFocusManager.current

    val filteredPosts = remember(state.posts, searchQuery) {
        if (searchQuery.isBlank()) state.posts
        else state.posts.filter {
            it.displayTitle.contains(searchQuery, ignoreCase = true) ||
                it.description?.contains(searchQuery, ignoreCase = true) == true ||
                it.userName?.contains(searchQuery, ignoreCase = true) == true
        }
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
                        // Density toggle
                        Box {
                            IconButton(onClick = { showDensityMenu = !showDensityMenu }) {
                                Icon(Icons.Default.ArrowDropDown, "Density")
                            }
                            DropdownMenu(expanded = showDensityMenu, onDismissRequest = { showDensityMenu = false }) {
                                listOf("COMPACT", "NORMAL", "SPACIOUS").forEach { density ->
                                    DropdownMenuItem(
                                        text = { Text(density) },
                                        onClick = { viewModel.setDensity(density); showDensityMenu = false },
                                        trailingIcon = if (state.density == density) {{ Icon(Icons.Default.Bookmark, null, modifier = Modifier.size(16.dp)) }} else null,
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
                        IconButton(onClick = { viewModel.load(refresh = true) }) {
                            Icon(Icons.Outlined.Update, contentDescription = "Refresh")
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
                // Feed mode tabs: For You | Following | Recent
                TabRow(
                    selectedTabIndex = feedModeTab,
                    containerColor = MaterialTheme.colorScheme.surface,
                ) {
                    listOf("For You", "Following", "Recent").forEachIndexed { index, label ->
                        Tab(
                            selected = feedModeTab == index,
                            onClick = {
                                feedModeTab = index
                                viewModel.setSortOption(
                                    when (index) {
                                        1 -> "Likes"
                                        2 -> "Recent"
                                        else -> "For You"
                                    }
                                )
                            },
                            text = { Text(label, style = MaterialTheme.typography.labelMedium) },
                        )
                    }
                }
                // Sort dropdown (6 options) replacing tabs
                Surface(color = MaterialTheme.colorScheme.surface) {
                    Column {
                        Box {
                            Row(
                                modifier = Modifier.fillMaxWidth().clickable { showSortMenu = !showSortMenu }.padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(stringResource(R.string.feed_sort_label, state.sortOption), fontWeight = FontWeight.SemiBold)
                                Icon(Icons.Default.ArrowDropDown, "Sort options")
                            }
                            DropdownMenu(expanded = showSortMenu, onDismissRequest = { showSortMenu = false }, modifier = Modifier.fillMaxWidth(0.5f)) {
                                feedSortOptions.forEach { option ->
                                    DropdownMenuItem(
                                        text = { Text(option) },
                                        onClick = { viewModel.setSortOption(option); showSortMenu = false },
                                        trailingIcon = if (state.sortOption == option) {{ Icon(Icons.Default.Bookmark, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp)) }} else null,
                                    )
                                }
                            }
                        }
                        // Translation language chips (web-parity: FeedPage.jsx inline translation strip)
                        var selectedLang by remember { mutableStateOf("") }
                        val langOptions = listOf("English", "हिंदी", "తెలుగు", "தமிழ்", "ಕನ್ನಡ")
                        if (selectedLang.isNotEmpty()) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 2.dp),
                            ) {
                                Text(stringResource(R.string.feed_translated_to, selectedLang), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(6.dp))
                            }
                        }
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                        ) {
                            items(langOptions) { lang ->
                                FilterChip(
                                    selected = selectedLang == lang,
                                    onClick = { selectedLang = if (selectedLang == lang) "" else lang },
                                    label = { Text(lang, fontSize = 11.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
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

                state.error != null && state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = stringResource(R.string.feed_unavailable),
                        message = state.error ?: stringResource(R.string.feed_unavailable),
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry",
                    )
                }

                state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
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

@Composable
private fun FeedCard(
    post: Post,
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
    var showComments by remember { mutableStateOf(false) }
    var commentText by remember { mutableStateOf("") }
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
                Box(
                    modifier = Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(initial, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = post.userName ?: "Community member",
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
                }
            }

            Text(
                text = post.displayTitle,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            // Category + Subcategory tags
            if (!post.category.isNullOrBlank()) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF3B82F6).copy(alpha = 0.15f)) {
                        Text(
                            post.category,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF3B82F6),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                    post.subcategory?.let { sub ->
                        Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF10B981).copy(alpha = 0.15f)) {
                            Text(
                                sub,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFF10B981),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            )
                        }
                    }
                }
            }

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

            // Price chip if available
            post.price?.let { price ->
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                    Text(
                        "₹${"%,.0f".format(price)}",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    )
                }
            }

            if (post.primaryImage != null) {
                AsyncImage(
                    model = post.primaryImage,
                    contentDescription = post.displayTitle,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(12.dp)),
                )
            }

            // Engagement bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                // Like button with animation
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable {
                        localLiked = !localLiked
                        onLike()
                    },
                ) {
                    Icon(
                        if (localLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = null,
                        tint = if (localLiked) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(22.dp).scale(if (localLiked) likeScale else 1f),
                    )
                    Text(
                        if (localLiked) "Liked" else "Like",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (localLiked) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                // Comment button
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { showComments = !showComments },
                ) {
                    Icon(Icons.AutoMirrored.Outlined.Chat, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                    Text(stringResource(R.string.feed_comment), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                // Bookmark button
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onBookmark() },
                ) {
                    Icon(
                        if (isBookmarked) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                        contentDescription = null,
                        tint = if (isBookmarked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        if (isBookmarked) "Saved" else "Save",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (isBookmarked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                // Share + views
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                    post.viewCount?.let { views ->
                        Icon(Icons.Default.Visibility, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                        Text("$views", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(8.dp))
                    }
                    IconButton(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, "Check out ${post.displayTitle} on MHub!")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                        },
                        modifier = Modifier.size(32.dp),
                    ) {
                        Icon(Icons.Outlined.Share, contentDescription = "Share", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                    }
                }
            }

            // Inline comment section
            if (showComments) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.feed_comments), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                        Text(
                            "No comments yet. Be the first!",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = commentText,
                                onValueChange = { commentText = it },
                                placeholder = { Text(stringResource(R.string.feed_write_comment), fontSize = 13.sp) },
                                singleLine = true,
                                shape = RoundedCornerShape(20.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                ),
                                modifier = Modifier.weight(1f).height(44.dp),
                            )
                            IconButton(
                                onClick = { commentText = "" },
                                modifier = Modifier.size(36.dp),
                            ) {
                                Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = "Send", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
