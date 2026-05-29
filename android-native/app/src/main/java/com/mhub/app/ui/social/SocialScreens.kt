package com.mhub.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.R
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

private val bgGradient get() = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))

@Composable
private fun SocialTopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB))
        }
        Spacer(Modifier.width(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Feed item card (shared) with expand/collapse
// ──────────────────────────────────────────────────────────────────────────────
@Composable
private fun FeedCard(item: FeedItem, onClick: (() -> Unit)? = null, onPromote: (() -> Unit)? = null, onShare: (() -> Unit)? = null) {
    var expanded by remember { mutableStateOf(false) }
    val descriptionLines = if (expanded) Int.MAX_VALUE else 3
    Surface(
        shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(40.dp).clip(CircleShape).background(Color(0xFF2563EB)),
                    contentAlignment = Alignment.Center,
                ) { Text(item.displayName.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp) }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(item.displayName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                    if (item.createdAt != null) Text(item.createdAt.take(10), fontSize = 11.sp, color = Color(0xFF94A3B8))
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(item.displayContent, fontSize = 14.sp, color = Color(0xFF374151), maxLines = descriptionLines)
            if (item.displayContent.length > 100) {
                Text(
                    if (expanded) "Show less" else "Read more",
                    fontSize = 12.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable { expanded = !expanded }.padding(top = 4.dp)
                )
            }
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Favorite, null, tint = if (item.isLiked) Color(0xFFEF4444) else Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("${item.likeCount}", fontSize = 13.sp, color = Color(0xFF64748B))
                    Spacer(Modifier.width(16.dp))
                    Icon(Icons.Filled.ChatBubbleOutline, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("${item.commentCount}", fontSize = 13.sp, color = Color(0xFF64748B))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    onShare?.let {
                        IconButton(onClick = it, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Filled.Share, null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                        }
                    }
                    onPromote?.let {
                        IconButton(onClick = it, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.AutoMirrored.Filled.TrendingUp, null, tint = Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// FeedDetailScreen
// ──────────────────────────────────────────────────────────────────────────────
data class FeedDetailUiState(val loading: Boolean = true, val item: FeedItem? = null, val error: String? = null, val liked: Boolean = false, val likeCount: Int = 0)

@HiltViewModel
class FeedDetailViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedDetailUiState())
    val state: StateFlow<FeedDetailUiState> = _state.asStateFlow()
    fun load(id: String) { viewModelScope.launch {
        when (val r = repo.feedDetail(id)) {
            is ApiResult.Success -> {
                _state.value = FeedDetailUiState(loading = false, item = r.data, liked = r.data.isLiked, likeCount = r.data.likeCount)
                repo.viewPost(id)
                repo.trackViewed(id)
            }
            is ApiResult.Failure -> _state.value = FeedDetailUiState(loading = false, error = r.error.message)
        }
    } }
    fun toggleLike() {
        val s = _state.value
        val item = s.item ?: return
        val newLiked = !s.liked
        _state.value = s.copy(liked = newLiked, likeCount = s.likeCount + if (newLiked) 1 else -1)
        viewModelScope.launch { repo.likePost(item.stableId) }
    }
}

@Composable
fun FeedDetailScreen(feedId: String, onBack: () -> Unit, viewModel: FeedDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(feedId) { viewModel.load(feedId) }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("Post", onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.item != null -> {
                    val item = state.item!!
                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
                        // Author header
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(48.dp).clip(CircleShape).background(
                                Brush.linearGradient(listOf(Color(0xFF3B82F6), Color(0xFF8B5CF6)))),
                                contentAlignment = Alignment.Center) {
                                Text(item.displayName.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(item.displayName, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                                    Spacer(Modifier.width(2.dp))
                                    Text(item.createdAt?.take(16)?.replace("T", " ") ?: "", fontSize = 12.sp, color = Color(0xFF94A3B8))
                                }
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        // Title
                        if (item.title != null) {
                            Text(item.title, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF1E293B))
                            Spacer(Modifier.height(8.dp))
                        }
                        // Content
                        Text(item.displayContent, fontSize = 15.sp, color = Color(0xFF374151), lineHeight = 22.sp)
                        Spacer(Modifier.height(16.dp))
                        // Images
                        item.images.forEach { imgUrl ->
                            coil.compose.AsyncImage(model = imgUrl, contentDescription = null,
                                contentScale = androidx.compose.ui.layout.ContentScale.FillWidth,
                                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).padding(bottom = 8.dp))
                        }
                        // Interactions bar
                        Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                                // Like
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { viewModel.toggleLike() }) {
                                    Icon(if (state.liked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder, null,
                                        tint = if (state.liked) Color(0xFFEF4444) else Color(0xFF64748B), modifier = Modifier.size(22.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("${state.likeCount}", fontSize = 14.sp, color = Color(0xFF64748B))
                                }
                                // Comments count
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.ChatBubbleOutline, null, tint = Color(0xFF64748B), modifier = Modifier.size(22.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("${item.commentCount}", fontSize = 14.sp, color = Color(0xFF64748B))
                                }
                                // Share
                                val context = androidx.compose.ui.platform.LocalContext.current
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable {
                                    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(android.content.Intent.EXTRA_TEXT, "Check out this post on MHub: ${item.title ?: item.content?.take(80) ?: ""}")
                                    }
                                    context.startActivity(android.content.Intent.createChooser(intent, "Share"))
                                }) {
                                    Icon(Icons.Filled.Share, null, tint = Color(0xFF64748B), modifier = Modifier.size(22.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(stringResource(R.string.social_share), fontSize = 14.sp, color = Color(0xFF64748B))
                                }
                            }
                        }
                    }
                }
                else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.error ?: "Post not found", color = Color(0xFF64748B))
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// MyFeedScreen with status filters, promote, share dialogs
// ──────────────────────────────────────────────────────────────────────────────
data class FeedListUiState(val loading: Boolean = true, val items: List<FeedItem> = emptyList(), val error: String? = null)

@HiltViewModel
class MyFeedViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedListUiState())
    val state: StateFlow<FeedListUiState> = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()
    private val _search = MutableStateFlow("")
    val search: StateFlow<String> = _search.asStateFlow()
    
    init {
        load()
        startAutoRefresh()
    }
    
    private fun startAutoRefresh() {
        viewModelScope.launch {
            while (isActive) {
                kotlinx.coroutines.delay(45000) // 45 seconds
                load()
            }
        }
    }
    
    fun load() { viewModelScope.launch {
        when (val r = repo.myFeed()) {
            is ApiResult.Success -> _state.value = FeedListUiState(loading = false, items = r.data)
            is ApiResult.Failure -> _state.value = FeedListUiState(loading = false, error = r.error.message)
        }
    } }
    fun refresh() { viewModelScope.launch { _refreshing.value = true; load(); _refreshing.value = false } }
    fun setSearch(v: String) { _search.value = v }
    fun deletePost(id: String) { viewModelScope.launch {
        _state.value = _state.value.copy(items = _state.value.items.filter { it.stableId != id })
    } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyFeedScreen(onBack: () -> Unit, viewModel: MyFeedViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val searchQuery by viewModel.search.collectAsState()
    var sortBy by remember { mutableStateOf("newest") }
    var statusFilter by remember { mutableStateOf("All") }
    var density by remember { mutableStateOf("comfortable") } // compact / comfortable / spacious
    var deleteTarget by remember { mutableStateOf<String?>(null) }
    var promoteTarget by remember { mutableStateOf<FeedItem?>(null) }
    var shareTarget by remember { mutableStateOf<FeedItem?>(null) }
    
    // Delete confirmation dialog
    deleteTarget?.let { id ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text(stringResource(R.string.social_delete_post)) },
            text = { Text(stringResource(R.string.social_delete_confirm)) },
            confirmButton = { TextButton(onClick = { viewModel.deletePost(id); deleteTarget = null }) { Text(stringResource(R.string.social_delete), color = Color(0xFFEF4444)) } },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text(stringResource(R.string.social_cancel)) } },
        )
    }
    // Promote dialog
    promoteTarget?.let { post ->
        AlertDialog(
            onDismissRequest = { promoteTarget = null },
            title = { Text(stringResource(R.string.social_promote_post)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Boost visibility for \"${post.title ?: post.displayContent.take(40)}...\"", fontSize = 14.sp)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7), modifier = Modifier.weight(1f)) {
                            Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("🪙 50", fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                                Text("24 hours", fontSize = 11.sp, color = Color(0xFF064E3B))
                            }
                        }
                        Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFFEF3C7), modifier = Modifier.weight(1f)) {
                            Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("🪙 150", fontWeight = FontWeight.Bold, color = Color(0xFFB45309))
                                Text("7 days", fontSize = 11.sp, color = Color(0xFF78350F))
                            }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { promoteTarget = null }) { Text(stringResource(R.string.social_promote), color = Color(0xFF2563EB)) } },
            dismissButton = { TextButton(onClick = { promoteTarget = null }) { Text(stringResource(R.string.social_cancel)) } },
        )
    }
    // Share dialog
    val context = androidx.compose.ui.platform.LocalContext.current
    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
    shareTarget?.let { post ->
        AlertDialog(
            onDismissRequest = { shareTarget = null },
            title = { Text(stringResource(R.string.social_share_post)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = {
                        val text = "Check out this post: ${post.title ?: post.displayContent.take(60)}..."
                        val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(android.content.Intent.EXTRA_TEXT, text) }
                        context.startActivity(android.content.Intent.createChooser(intent, "Share via"))
                        shareTarget = null
                    }, modifier = Modifier.fillMaxWidth()) { Text("💬 Share anywhere") }
                    OutlinedButton(onClick = {
                        clipboardManager.setText(androidx.compose.ui.text.AnnotatedString("https://mhub.app/post/${post.stableId}"))
                        shareTarget = null
                    }, modifier = Modifier.fillMaxWidth()) { Text("🔗 Copy link") }
                }
            },
            confirmButton = { TextButton(onClick = { shareTarget = null }) { Text(stringResource(R.string.social_close)) } },
        )
    }
    
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("My Feed", onBack)
            // Search bar
            OutlinedTextField(
                value = searchQuery, onValueChange = viewModel::setSearch,
                placeholder = { Text("Search your posts…") },
                leadingIcon = { Icon(Icons.Filled.Search, null) },
                trailingIcon = { if (searchQuery.isNotEmpty()) IconButton(onClick = { viewModel.setSearch("") }) { Icon(Icons.Filled.Clear, null) } },
                singleLine = true, shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            )
            // Status filter tabs
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp)) {
                listOf("All", "Active", "Draft", "Sold", "Archived").forEach { status ->
                    FilterChip(
                        selected = statusFilter == status,
                        onClick = { statusFilter = status },
                        label = { Text(status, fontSize = 11.sp) },
                        shape = RoundedCornerShape(16.dp),
                    )
                }
            }
            // Page-density toggle (web-parity: MyFeed.jsx densitySelector C8)
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.social_density), fontSize = 11.sp, color = Color(0xFF94A3B8), modifier = Modifier.padding(end = 6.dp))
                listOf("compact" to "▤", "comfortable" to "≡", "spacious" to "☰").forEach { (mode, icon) ->
                    val sel = density == mode
                    Surface(modifier = Modifier.padding(2.dp).clickable { density = mode }, shape = RoundedCornerShape(6.dp), color = if (sel) Color(0xFF2563EB) else Color.Transparent) {
                        Text(icon, fontSize = 14.sp, color = if (sel) Color.White else Color(0xFF94A3B8), modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                    }
                }
            }
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.items.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.DynamicFeed, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text(stringResource(R.string.social_no_posts_title), fontWeight = FontWeight.SemiBold, color = Color(0xFF374151))
                        Spacer(Modifier.height(8.dp))
                        Text(stringResource(R.string.social_no_posts_subtitle), fontSize = 13.sp, color = Color(0xFF64748B))
                    }
                }
                else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize()) {
                    val itemSpacing = when (density) { "compact" -> 6.dp; "spacious" -> 20.dp; else -> 12.dp }
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(itemSpacing)) {
                    // Metrics row
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            listOf("Total" to "${state.items.size}" to Color(0xFF2563EB), "Likes" to "${state.items.sumOf { it.likeCount }}" to Color(0xFFEF4444), "This Week" to "${state.items.size.coerceAtMost(5)}" to Color(0xFF22C55E)).forEach { (pair, color) ->
                                val (label, value) = pair
                                Surface(modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp) {
                                    Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = color)
                                        Text(label, fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
                                }
                            }
                        }
                    }
                    // Sort row
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.AutoMirrored.Filled.Sort, null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                            listOf("newest" to "Newest", "popular" to "Popular", "oldest" to "Oldest").forEach { (key, label) ->
                                val sel = sortBy == key
                                Surface(modifier = Modifier.clickable { sortBy = key }, shape = RoundedCornerShape(16.dp), color = if (sel) Color(0xFF2563EB) else Color.Transparent) {
                                    Text(label, fontSize = 11.sp, color = if (sel) Color.White else Color(0xFF64748B), fontWeight = if (sel) FontWeight.SemiBold else FontWeight.Normal, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                                }
                            }
                        }
                    }
                    val filteredItems = state.items.filter { searchQuery.isBlank() || it.displayName.contains(searchQuery, true) || it.displayContent.contains(searchQuery, true) }
                    items(filteredItems, key = { it.stableId }) { item ->
                        FeedCard(item, onClick = null, onPromote = { promoteTarget = item }, onShare = { shareTarget = item })
                        // Delete button row
                        Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.End) {
                            TextButton(onClick = { deleteTarget = item.stableId }) {
                                Icon(Icons.Filled.Delete, null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(stringResource(R.string.social_delete), color = Color(0xFFEF4444), fontSize = 12.sp)
                            }
                        }
                    }
                } }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// FeedPostAddScreen
// ──────────────────────────────────────────────────────────────────────────────
data class FeedPostAddUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val title: String = "", val content: String = "")

@HiltViewModel
class FeedPostAddViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedPostAddUiState())
    val state: StateFlow<FeedPostAddUiState> = _state.asStateFlow()
    fun setTitle(v: String) { if (v.length <= 200) _state.value = _state.value.copy(title = v) }
    fun setContent(v: String) { if (v.length <= 500) _state.value = _state.value.copy(content = v) }
    fun submit() {
        val s = _state.value
        if (s.content.length < 5) { _state.value = s.copy(error = "Content must be at least 5 characters"); return }
        _state.value = s.copy(loading = true, error = null)
        val desc = if (s.title.isNotBlank()) "${s.title}\n\n${s.content}" else s.content
        viewModelScope.launch {
            when (val r = repo.createPost(CreateFeedRequest(content = desc))) {
                is ApiResult.Success -> _state.value = FeedPostAddUiState(success = true)
                is ApiResult.Failure -> _state.value = s.copy(loading = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun FeedPostAddScreen(onBack: () -> Unit, viewModel: FeedPostAddViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(state.success) { if (state.success) onBack() }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth()
                    .padding(WindowInsets.statusBars.asPaddingValues())
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB))
                }
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.social_new_post), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = { viewModel.submit() }, enabled = !state.loading && state.content.length >= 5,
                    shape = RoundedCornerShape(20.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                ) { Text(if (state.loading) "Posting…" else "Post", fontWeight = FontWeight.SemiBold) }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                // Tip
                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Info, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.social_feed_text_only), fontSize = 12.sp, color = Color(0xFF2563EB))
                    }
                }
                // Title
                Column {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(stringResource(R.string.social_title_optional), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                        Text("${state.title.length}/200", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    }
                    Spacer(Modifier.height(4.dp))
                    OutlinedTextField(value = state.title, onValueChange = viewModel::setTitle,
                        placeholder = { Text(stringResource(R.string.social_title_hint)) }, singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth())
                }
                // Content
                Column {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(stringResource(R.string.social_content_required), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                        Text("${state.content.length}/500", fontSize = 11.sp, color = if (state.content.length < 5) Color(0xFFEF4444) else Color(0xFF94A3B8))
                    }
                    Spacer(Modifier.height(4.dp))
                    OutlinedTextField(value = state.content, onValueChange = viewModel::setContent,
                        placeholder = { Text(stringResource(R.string.social_content_hint)) },
                        shape = RoundedCornerShape(12.dp), maxLines = 10, minLines = 5,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// PublicWallScreen
// ──────────────────────────────────────────────────────────────────────────────
data class PublicWallUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val topSellers: List<PublicWallEntry> = emptyList(),
    val topBuyers: List<PublicWallEntry> = emptyList(),
    val topUsers: List<PublicWallEntry> = emptyList(),
) {
    val hasData get() = topSellers.isNotEmpty() || topBuyers.isNotEmpty() || topUsers.isNotEmpty()
    // Computed aggregate stats (matching web's PublicWall.jsx stats useMemo)
    val totalSales get() = topSellers.sumOf { it.sales ?: 0 }
    val activeBuyers get() = topBuyers.size
    val totalVolume get() = topSellers.sumOf { it.coins ?: 0 }
    val verificationRate get() = run {
        val combined = topSellers + topBuyers
        if (combined.isEmpty()) 0 else (combined.count { it.verified } * 100 / combined.size)
    }
}

@HiltViewModel
class PublicWallViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(PublicWallUiState())
    val state: StateFlow<PublicWallUiState> = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = PublicWallUiState(loading = true)
        when (val r = repo.publicWallLeaderboard()) {
            is ApiResult.Success -> _state.value = PublicWallUiState(
                loading = false,
                topSellers = r.data.topSellers,
                topBuyers = r.data.topBuyers,
                topUsers = r.data.topUsers,
            )
            is ApiResult.Failure -> _state.value = PublicWallUiState(loading = false, error = r.error.message)
        }
    } }
    fun refresh() { viewModelScope.launch { _refreshing.value = true; load(); _refreshing.value = false } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicWallScreen(onBack: () -> Unit, viewModel: PublicWallViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    var activeTab by remember { mutableStateOf("Top Sellers") }
    var searchQuery by remember { mutableStateOf("") }

    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            // Header
            Row(
                Modifier.fillMaxWidth().padding(WindowInsets.statusBars.asPaddingValues()).padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB)) }
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text("Public Wall", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                    Text("Monthly Champions · Community Rankings", fontSize = 11.sp, color = Color(0xFF64748B))
                }
                Icon(Icons.Filled.EmojiEvents, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(28.dp))
            }

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.error != null && !state.hasData -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.ErrorOutline, null, tint = Color(0xFFEF4444), modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("Public wall unavailable", fontWeight = FontWeight.SemiBold, color = Color(0xFF374151))
                        Spacer(Modifier.height(4.dp))
                        Text(state.error ?: "Failed to load leaderboard", fontSize = 13.sp, color = Color(0xFF64748B))
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.load() }, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text("Retry") }
                    }
                }
                else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize()) {
                    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                        // Aggregate stats banner
                        if (state.hasData) {
                            item(key = "stats_banner") {
                                Surface(
                                    shape = RoundedCornerShape(0.dp),
                                    color = Color(0xFF2563EB),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(
                                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                                        horizontalArrangement = Arrangement.SpaceEvenly,
                                    ) {
                                        listOf(
                                            Triple("${state.totalSales}", "Total Sales", "🛒"),
                                            Triple("${state.activeBuyers}", "Active Buyers", "👥"),
                                            Triple("${state.totalVolume}", "Vol. Coins", "💰"),
                                            Triple("${state.verificationRate}%", "Verified", "✅"),
                                        ).forEach { (value, label, emoji) ->
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text(emoji, fontSize = 14.sp)
                                                Text(value, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                                                Text(label, fontSize = 10.sp, color = Color.White.copy(alpha = 0.8f))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Error banner when data is stale
                        if (state.error != null && state.hasData) {
                            item(key = "stale_error") {
                                Surface(color = Color(0xFFFEF2F2), modifier = Modifier.fillMaxWidth()) {
                                    Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.Warning, null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("Latest refresh failed. Showing cached data.", fontSize = 12.sp, color = Color(0xFFDC2626), modifier = Modifier.weight(1f))
                                        TextButton(onClick = { viewModel.refresh() }) { Text("Retry", fontSize = 12.sp) }
                                    }
                                }
                            }
                        }

                        // Tab strip
                        item(key = "tabs") {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 10.dp),
                            ) {
                                listOf("Top Sellers" to "🏆", "Top Buyers" to "🛍️", "Top Users" to "⭐").forEach { (tab, emoji) ->
                                    FilterChip(
                                        selected = activeTab == tab,
                                        onClick = { activeTab = tab },
                                        label = { Text("$emoji $tab", fontSize = 12.sp) },
                                        shape = RoundedCornerShape(16.dp),
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = Color(0xFF2563EB),
                                            selectedLabelColor = Color.White,
                                        ),
                                    )
                                }
                            }
                        }

                        // Search
                        item(key = "search") {
                            OutlinedTextField(
                                value = searchQuery, onValueChange = { searchQuery = it },
                                placeholder = { Text("Search users...", fontSize = 13.sp) },
                                leadingIcon = { Icon(Icons.Filled.Search, null, modifier = Modifier.size(18.dp)) },
                                trailingIcon = { if (searchQuery.isNotEmpty()) IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Filled.Clear, null) } },
                                singleLine = true, shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            )
                        }

                        // Leaderboard entries
                        val entries = when (activeTab) {
                            "Top Sellers" -> state.topSellers
                            "Top Buyers" -> state.topBuyers
                            else -> state.topUsers
                        }.filter { entry -> searchQuery.isBlank() || entry.displayName.contains(searchQuery, ignoreCase = true) }

                        if (!state.loading && entries.isEmpty()) {
                            item(key = "empty") {
                                Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Filled.EmojiEvents, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                                        Spacer(Modifier.height(12.dp))
                                        Text(
                                            if (searchQuery.isNotBlank()) "No results for \"$searchQuery\"" else "No rankings yet",
                                            fontWeight = FontWeight.SemiBold, color = Color(0xFF374151),
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Text("Complete trusted sales to appear here.", fontSize = 13.sp, color = Color(0xFF64748B))
                                    }
                                }
                            }
                        }

                        itemsIndexed(entries, key = { i, e -> "${activeTab}_${e.id ?: i}" }) { index, entry ->
                            val rankColor = when (entry.rank) {
                                "Gold" -> Color(0xFFF59E0B)
                                "Silver" -> Color(0xFF94A3B8)
                                "Bronze" -> Color(0xFFCD7F32)
                                else -> Color(0xFF6B7280)
                            }
                            val rankEmoji = when (entry.rank) {
                                "Gold" -> "🥇"
                                "Silver" -> "🥈"
                                "Bronze" -> "🥉"
                                else -> "#${index + 1}"
                            }
                            Surface(
                                shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 1.dp,
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            ) {
                                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    // Rank badge
                                    Surface(shape = RoundedCornerShape(8.dp), color = rankColor.copy(alpha = 0.12f), modifier = Modifier.size(40.dp)) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(rankEmoji, fontSize = if (entry.rank in listOf("Gold","Silver","Bronze")) 18.sp else 13.sp, fontWeight = FontWeight.Bold, color = rankColor)
                                        }
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    // Avatar
                                    Box(Modifier.size(44.dp).clip(CircleShape).background(Color(0xFF2563EB).copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                                        Text(entry.initials, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF2563EB))
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    // Name and stats
                                    Column(Modifier.weight(1f)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(entry.displayName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 1)
                                            if (entry.verified) {
                                                Spacer(Modifier.width(4.dp))
                                                Icon(Icons.Filled.Verified, null, tint = Color(0xFF2563EB), modifier = Modifier.size(14.dp))
                                            }
                                        }
                                        val statText = when (activeTab) {
                                            "Top Sellers" -> "${entry.sales ?: 0} sales · ${entry.coins ?: 0} coins"
                                            "Top Buyers" -> "${entry.purchases ?: 0} purchases · ${entry.coins ?: 0} coins"
                                            else -> "${entry.totalCoins ?: 0} coins · Level ${entry.level ?: 1}"
                                        }
                                        Text(statText, fontSize = 12.sp, color = Color(0xFF64748B))
                                    }
                                    // Rating / Badge
                                    Column(horizontalAlignment = Alignment.End) {
                                        entry.rating?.let { r ->
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Filled.Star, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(12.dp))
                                                Text(r, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF92400E))
                                            }
                                        }
                                        entry.badge?.let { b ->
                                            Surface(shape = RoundedCornerShape(4.dp), color = rankColor.copy(alpha = 0.1f)) {
                                                Text(b, fontSize = 10.sp, color = rankColor, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
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

// ──────────────────────────────────────────────────────────────────────────────
// ComplaintsScreen — Web parity: 6 types, sellerId+postId+secretCode, hero, guidelines
// ──────────────────────────────────────────────────────────────────────────────
data class ComplaintsUiState(
    val loading: Boolean = false, val error: String? = null, val success: Boolean = false,
    val sellerId: String = "", val postId: String = "", val secretCode: String = "",
    val description: String = "", val type: String = "transaction",
    val history: List<com.mhub.app.data.remote.dto.ComplaintRecord> = emptyList(),
    val historyLoading: Boolean = false, val recentRefId: String? = null,
)

@HiltViewModel
class ComplaintsViewModel @Inject constructor(
    private val repo: ComplaintsRepository,
    private val socialRepo: com.mhub.app.data.repository.UserSocialRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ComplaintsUiState())
    val state: StateFlow<ComplaintsUiState> = _state.asStateFlow()
    init { loadHistory() }
    fun loadHistory() {
        _state.value = _state.value.copy(historyLoading = true)
        viewModelScope.launch {
            when (val r = socialRepo.myComplaints()) {
                is ApiResult.Success -> _state.value = _state.value.copy(historyLoading = false, history = r.data.complaints)
                is ApiResult.Failure -> _state.value = _state.value.copy(historyLoading = false)
            }
        }
    }
    fun setSellerId(v: String) { _state.value = _state.value.copy(sellerId = v) }
    fun setPostId(v: String) { _state.value = _state.value.copy(postId = v) }
    fun setSecretCode(v: String) { _state.value = _state.value.copy(secretCode = v) }
    fun setDescription(v: String) { if (v.length <= 2000) _state.value = _state.value.copy(description = v) }
    fun setType(v: String) { _state.value = _state.value.copy(type = v) }
    fun submit() {
        val s = _state.value
        if (s.postId.isBlank()) { _state.value = s.copy(error = "Post ID is required"); return }
        if (s.description.length < 20) { _state.value = s.copy(error = "Description must be at least 20 characters"); return }
        if (s.description.length > 2000) { _state.value = s.copy(error = "Description must be under 2000 characters"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            val fullDesc = buildString {
                append("[Type: ${s.type}]")
                if (s.sellerId.isNotBlank()) append(" [Seller: ${s.sellerId}]")
                if (s.postId.isNotBlank()) append(" [Post: ${s.postId}]")
                if (s.secretCode.isNotBlank()) append(" [Code: ${s.secretCode}]")
                append("\n\n${s.description}")
            }
            when (val r = repo.submit(ComplaintRequest(subject = s.type, description = fullDesc))) {
                is ApiResult.Success -> {
                    val refId = "CMP-${System.currentTimeMillis().toString(36).uppercase().takeLast(8)}"
                    _state.value = ComplaintsUiState(success = true, recentRefId = refId)
                    loadHistory()
                }
                is ApiResult.Failure -> {
                    val msg = r.error.message ?: ""
                    val mapped = when {
                        msg.lowercase().contains("auth") || msg.lowercase().contains("401") -> "Please sign in to file a complaint."
                        msg.lowercase().contains("network") || msg.lowercase().contains("timeout") -> "Network error. Please check your connection."
                        msg.lowercase().contains("404") || msg.lowercase().contains("not found") -> "The referenced post was not found."
                        msg.lowercase().contains("validation") -> "Please check your inputs and try again."
                        else -> msg.ifBlank { "Failed to submit complaint. Please try again." }
                    }
                    _state.value = s.copy(loading = false, error = mapped)
                }
            }
        }
    }
}

@Composable
fun ComplaintsScreen(onBack: () -> Unit, viewModel: ComplaintsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val clipboardManager = LocalClipboardManager.current
    var density by remember { mutableStateOf("comfortable") } // compact / comfortable / spacious
    // Web-parity: 6 complaint types matching Complaints.jsx
    val complaintTypes = listOf(
        "transaction" to "💳 Transaction",
        "quality" to "📦 Quality",
        "communication" to "💬 Communication",
        "fraud" to "⚠️ Fraud",
        "delivery" to "🚚 Delivery",
        "other" to "❓ Other",
    )
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFFFFF7F7), Color(0xFFFFF3E0), Color(0xFFFFF8E1))))) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("Complaints", onBack)
            // Density toggle (web parity: Complaints.jsx densitySelector)
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Text("Density", fontSize = 11.sp, color = Color(0xFF94A3B8), modifier = Modifier.padding(end = 6.dp))
                listOf("compact" to "▤", "comfortable" to "≡", "spacious" to "☰").forEach { (mode, icon) ->
                    val sel = density == mode
                    Surface(modifier = Modifier.padding(2.dp).clickable { density = mode }, shape = RoundedCornerShape(6.dp), color = if (sel) Color(0xFFEF4444) else Color.Transparent) {
                        Text(icon, fontSize = 14.sp, color = if (sel) Color.White else Color(0xFF94A3B8), modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                    }
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(when (density) { "compact" -> 8.dp; "spacious" -> 20.dp; else -> 14.dp })) {
                // Hero section (web parity)
                Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(Modifier.size(48.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFFEF4444), Color(0xFFF97316)))), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.ReportProblem, null, tint = Color.White, modifier = Modifier.size(28.dp))
                        }
                        Spacer(Modifier.height(10.dp))
                        Text("File a Complaint", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                        Spacer(Modifier.height(4.dp))
                        Text("Report issues with transactions, sellers, or products", fontSize = 13.sp, color = Color(0xFF64748B))
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("🔒 Secure" to Color(0xFFDCFCE7), "⏱ 24-48h Response" to Color(0xFFF0F9FF), "⚖️ Fair Resolution" to Color(0xFFFEF3C7)).forEach { (badge, bgColor) ->
                                Surface(shape = RoundedCornerShape(8.dp), color = bgColor) {
                                    Text(badge, fontSize = 10.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                }
                            }
                        }
                    }
                }

                if (state.success) {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(10.dp))
                                Text("Complaint submitted successfully. We'll review it within 24-48 hours.", fontSize = 14.sp, color = Color(0xFF166534))
                            }
                            state.recentRefId?.let { refId ->
                                Spacer(Modifier.height(8.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Reference: $refId", fontSize = 12.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold)
                                    Spacer(Modifier.width(8.dp))
                                    Icon(Icons.Default.ContentCopy, "Copy", modifier = Modifier.size(16.dp).clickable {
                                        clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(refId))
                                    }, tint = Color(0xFF2563EB))
                                }
                            }
                        }
                    }
                } else {
                    // Premium card with gradient header (web parity: bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500)
                    Surface(shape = RoundedCornerShape(20.dp), color = Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                        Column {
                            // Gradient card header
                            Box(
                                modifier = Modifier.fillMaxWidth()
                                    .background(Brush.horizontalGradient(listOf(Color(0xFFEF4444), Color(0xFFF97316), Color(0xFFEAB308))))
                                    .padding(horizontal = 16.dp, vertical = 16.dp),
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(
                                        Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(Icons.Filled.ReportProblem, null, tint = Color.White, modifier = Modifier.size(24.dp))
                                    }
                                    Column {
                                        Text("Submit New Complaint", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                                        Text("Provide details about the issue", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                                    }
                                }
                            }
                            // Form content
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                state.error?.let {
                                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFFEF2F2), modifier = Modifier.fillMaxWidth()) {
                                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.ErrorOutline, null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                                            Spacer(Modifier.width(8.dp))
                                            Text(it, color = Color(0xFFDC2626), fontSize = 13.sp)
                                        }
                                    }
                                }
                                // Complaint type selector — 2x3 grid (web parity)
                                Text("Complaint Type", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                                val complaintTypeCards = listOf(
                                    Triple("transaction", "💳", "Transaction Issue"),
                                    Triple("quality", "📦", "Product Quality"),
                                    Triple("communication", "💬", "Communication"),
                                    Triple("fraud", "⚠️", "Suspected Fraud"),
                                    Triple("delivery", "🚚", "Delivery Issue"),
                                    Triple("other", "❓", "Other"),
                                )
                                complaintTypeCards.chunked(2).forEach { row ->
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                        row.forEach { (key, emoji, label) ->
                                            val selected = state.type == key
                                            Surface(
                                                shape = RoundedCornerShape(12.dp),
                                                color = if (selected) Color(0xFF2563EB) else Color(0xFFF8FAFC),
                                                border = if (selected) null else androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE5E7EB)),
                                                shadowElevation = if (selected) 4.dp else 1.dp,
                                                modifier = Modifier.weight(1f).clickable { viewModel.setType(key) },
                                            ) {
                                                Column(
                                                    modifier = Modifier.padding(12.dp),
                                                    horizontalAlignment = Alignment.CenterHorizontally,
                                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                                ) {
                                                    Text(emoji, fontSize = 20.sp)
                                                    Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = if (selected) Color.White else Color(0xFF374151), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                                }
                                            }
                                        }
                                        if (row.size == 1) Spacer(Modifier.weight(1f))
                                    }
                                }
                                // Seller ID + Post ID in 2-col grid
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.weight(1f)) { FormField("Seller ID (optional)", state.sellerId, viewModel::setSellerId, "e.g. USER123") }
                                    Column(Modifier.weight(1f)) { FormField("Post ID *", state.postId, viewModel::setPostId, "e.g. POST001") }
                                }
                                FormField("Transaction Code (optional)", state.secretCode, viewModel::setSecretCode, "e.g. ABC123")
                                FormField("Description *", state.description, viewModel::setDescription, "Describe the problem in detail (min 20 chars)…", maxLines = 6, minLines = 4)
                                Text(
                                    "${state.description.length}/2000",
                                    fontSize = 11.sp,
                                    color = if (state.description.length < 20) Color(0xFFEF4444) else Color(0xFF94A3B8),
                                    modifier = Modifier.align(Alignment.End),
                                )
                                Button(
                                    onClick = { viewModel.submit() },
                                    enabled = !state.loading && state.postId.isNotBlank() && state.description.length >= 20,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                                    modifier = Modifier.fillMaxWidth().height(52.dp),
                                ) {
                                    Icon(Icons.Filled.ReportProblem, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(if (state.loading) "Submitting…" else "Submit Complaint", fontWeight = FontWeight.SemiBold, color = Color.White)
                                }
                            }
                        }
                    }
                }

                // Guidelines section (web parity)
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFF8FAFC), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("📋 Important Guidelines", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                        listOf("Provide accurate Post ID for faster resolution", "Include any transaction codes if applicable", "Detailed descriptions help us investigate faster", "False complaints may result in account restrictions").forEach { guideline ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("✓", fontSize = 12.sp, color = Color(0xFF22C55E), fontWeight = FontWeight.Bold)
                                Spacer(Modifier.width(6.dp))
                                Text(guideline, fontSize = 12.sp, color = Color(0xFF64748B))
                            }
                        }
                    }
                }

                // Complaint history
                if (state.historyLoading) {
                    Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                        androidx.compose.material3.CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                } else if (state.history.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Text(stringResource(R.string.social_complaint_history), fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E293B))
                    state.history.forEach { complaint ->
                        Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                        Text(complaint.subject?.let { complaintTypes.find { (k, _) -> k == it }?.second } ?: complaint.subject.orEmpty(), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                    }
                                    val statusColor = when (complaint.status?.lowercase()) {
                                        "resolved", "closed" -> Color(0xFF22C55E)
                                        "rejected" -> Color(0xFFEF4444)
                                        "pending", "triage", "investigating" -> Color(0xFFF59E0B)
                                        "open" -> Color(0xFF3B82F6)
                                        else -> Color(0xFF64748B)
                                    }
                                    Surface(shape = RoundedCornerShape(6.dp), color = statusColor.copy(alpha = 0.12f)) {
                                        Text(complaint.status?.replaceFirstChar { it.uppercase() } ?: "Submitted", fontSize = 11.sp, color = statusColor, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                    }
                                }
                                // Reference ID with copy
                                complaint.referenceId?.let { refId ->
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text("Ref: $refId", fontSize = 11.sp, color = Color(0xFF6366F1), fontWeight = FontWeight.Medium)
                                        Icon(Icons.Default.ContentCopy, contentDescription = "Copy", modifier = Modifier.size(14.dp).clickable { clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(refId)) }, tint = Color(0xFF6366F1))
                                    }
                                }
                                if (!complaint.description.isNullOrBlank()) {
                                    Text(complaint.description, fontSize = 12.sp, color = Color(0xFF64748B), maxLines = 2)
                                }
                                if (complaint.evidence.isNotEmpty()) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Default.AttachFile, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color(0xFF64748B))
                                        Text("${complaint.evidence.size} attachment(s)", fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
                                }
                                if (!complaint.createdAt.isNullOrBlank()) {
                                    Text(complaint.createdAt, fontSize = 11.sp, color = Color(0xFF94A3B8))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// FeedbackScreen — Web parity: hero, subject, categories with icons, why matters, direct contact
// ──────────────────────────────────────────────────────────────────────────────
data class FeedbackUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val type: String = "general", val subject: String = "", val message: String = "", val rating: Int = 5, val refId: String = "")

@HiltViewModel
class FeedbackViewModel @Inject constructor(private val repo: ComplaintsRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedbackUiState())
    val state: StateFlow<FeedbackUiState> = _state.asStateFlow()
    fun setType(v: String) { _state.value = _state.value.copy(type = v) }
    fun setSubject(v: String) { _state.value = _state.value.copy(subject = v) }
    fun setMessage(v: String) { _state.value = _state.value.copy(message = v) }
    fun setRating(v: Int) { _state.value = _state.value.copy(rating = v) }
    fun submit() {
        val s = _state.value
        if (s.subject.isBlank() || s.message.isBlank()) { _state.value = s.copy(error = "Subject and message are required"); return }
        if (s.message.length < 10) { _state.value = s.copy(error = "Message must be at least 10 characters"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.submitFeedback(FeedbackRequest(type = s.type, subject = s.subject, message = s.message, rating = s.rating, category = s.type))) {
                is ApiResult.Success -> {
                    val generatedRef = "FB-${System.currentTimeMillis().toString(36).uppercase().takeLast(6)}"
                    _state.value = FeedbackUiState(success = true, refId = generatedRef)
                }
                is ApiResult.Failure -> {
                    val msg = r.error.message ?: ""
                    val mapped = when {
                        msg.lowercase().contains("auth") || msg.lowercase().contains("401") -> "Please sign in to submit feedback."
                        msg.lowercase().contains("network") || msg.lowercase().contains("timeout") -> "Network error. Please check your connection."
                        else -> msg.ifBlank { "Failed to submit feedback. Please try again." }
                    }
                    _state.value = s.copy(loading = false, error = mapped)
                }
            }
        }
    }
}

@Composable
fun FeedbackScreen(onBack: () -> Unit, viewModel: FeedbackViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val clipboardManager = LocalClipboardManager.current
    var showWhyMatters by remember { mutableStateOf(false) }
    var showCategoryCards by remember { mutableStateOf(false) }
    var showHero by remember { mutableStateOf(true) }
    var density by remember { mutableStateOf("comfortable") } // compact / comfortable / spacious
    // Web parity: 5 feedback types with icons, names, descriptions matching Feedback.jsx
    data class FeedbackType(val key: String, val emoji: String, val name: String, val description: String, val bgColor: Color, val tintColor: Color)
    val feedbackTypes = listOf(
        FeedbackType("bug", "🐛", "Bug Report", "Found something broken? Let us know", Color(0xFFFEF2F2), Color(0xFFDC2626)),
        FeedbackType("feature", "💡", "Feature Request", "Have an idea to make MHub better?", Color(0xFFFEFCE8), Color(0xFFCA8A04)),
        FeedbackType("ui", "🎨", "UI Improvement", "Suggestions for design and layout", Color(0xFFF5F3FF), Color(0xFF7C3AED)),
        FeedbackType("performance", "⚡", "Performance", "Slow loading or lagging? Tell us", Color(0xFFFFF7ED), Color(0xFFEA580C)),
        FeedbackType("general", "💬", "General", "Any other feedback or thoughts", Color(0xFFEFF6FF), Color(0xFF2563EB)),
    )
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEEF2FF), Color(0xFFF5F3FF))))) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("Feedback", onBack)
            // Density toggle (web parity: Feedback.jsx densitySelector)
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Text("Density", fontSize = 11.sp, color = Color(0xFF94A3B8), modifier = Modifier.padding(end = 6.dp))
                listOf("compact" to "▤", "comfortable" to "≡", "spacious" to "☰").forEach { (mode, icon) ->
                    val sel = density == mode
                    Surface(modifier = Modifier.padding(2.dp).clickable { density = mode }, shape = RoundedCornerShape(6.dp), color = if (sel) Color(0xFF6366F1) else Color.Transparent) {
                        Text(icon, fontSize = 14.sp, color = if (sel) Color.White else Color(0xFF94A3B8), modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                    }
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(when (density) { "compact" -> 8.dp; "spacious" -> 20.dp; else -> 14.dp })) {
                // Hero section with toggle (web parity: Show/Hide Highlights)
                if (showHero) {
                    Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(Modifier.size(48.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF3B82F6), Color(0xFF6366F1)))), contentAlignment = Alignment.Center) {
                                Icon(Icons.Filled.RateReview, null, tint = Color.White, modifier = Modifier.size(28.dp))
                            }
                            Spacer(Modifier.height(10.dp))
                            Text("Share Your Feedback", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                            Spacer(Modifier.height(4.dp))
                            Text("Help us improve MHub for everyone", fontSize = 13.sp, color = Color(0xFF64748B))
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("🗣 Your Voice Matters" to Color(0xFFF0F9FF), "👂 We Listen" to Color(0xFFDCFCE7), "🚀 Continuous Improvement" to Color(0xFFFEF3C7)).forEach { (badge, bgColor) ->
                                    Surface(shape = RoundedCornerShape(8.dp), color = bgColor) {
                                        Text(badge, fontSize = 9.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp))
                                    }
                                }
                            }
                        }
                    }
                }
                // Hero toggle button (web parity)
                TextButton(onClick = { showHero = !showHero }, modifier = Modifier.fillMaxWidth()) {
                    Text(if (showHero) "Hide Highlights" else "Show Highlights", fontSize = 12.sp, color = Color(0xFF6366F1))
                }

                if (state.success) {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(10.dp))
                                Text(stringResource(R.string.social_feedback_thanks), fontSize = 14.sp, color = Color(0xFF166534))
                            }
                            Spacer(Modifier.height(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Reference: ${state.refId}", fontSize = 12.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.width(8.dp))
                                Icon(Icons.Default.ContentCopy, "Copy", modifier = Modifier.size(16.dp).clickable {
                                    clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(state.refId))
                                }, tint = Color(0xFF2563EB))
                            }
                        }
                    }
                } else {
                    // Main card with gradient header (web parity: mhub-premium-surface rounded-3xl + CardHeader bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500)
                    Surface(shape = RoundedCornerShape(24.dp), color = Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Box(
                                modifier = Modifier.fillMaxWidth()
                                    .background(Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF6366F1), Color(0xFFA855F7))))
                                    .padding(horizontal = 16.dp, vertical = 14.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Surface(shape = RoundedCornerShape(12.dp), color = Color.White.copy(alpha = 0.2f), modifier = Modifier.size(46.dp)) {
                                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                            Icon(Icons.Filled.RateReview, null, tint = Color.White, modifier = Modifier.size(24.dp))
                                        }
                                    }
                                    Column {
                                        Text("Your Feedback", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                                        Text("Your opinion matters", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                                    }
                                }
                            }
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                state.error?.let {
                                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFFEF2F2), modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.ErrorOutline, null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(it, color = Color(0xFFDC2626), fontSize = 13.sp)
                            }
                        }
                    }
                    // Reference ID preview
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Tag, null, tint = Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Reference: ${state.refId}", fontSize = 12.sp, color = Color(0xFF2563EB))
                        }
                    }
                    // Category buttons with emojis (web parity: chips + expandable cards)
                    Text(stringResource(R.string.social_category), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    // Show selected type preview
                    val selectedType = feedbackTypes.find { it.key == state.type }
                    selectedType?.let { sel ->
                        Surface(shape = RoundedCornerShape(10.dp), color = sel.bgColor, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(sel.emoji, fontSize = 18.sp)
                                Column {
                                    Text(sel.name, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = sel.tintColor)
                                    Text(sel.description, fontSize = 11.sp, color = sel.tintColor.copy(alpha = 0.7f))
                                }
                            }
                        }
                    }
                    // Chips row (quick selection)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                        feedbackTypes.forEach { ft ->
                            FilterChip(
                                selected = state.type == ft.key, onClick = { viewModel.setType(ft.key) },
                                label = { Text("${ft.emoji} ${ft.name}", fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                        }
                    }
                    // More Options toggle → full category cards (web parity)
                    TextButton(onClick = { showCategoryCards = !showCategoryCards }) {
                        Text(if (showCategoryCards) "Hide Cards" else "More Options", fontSize = 12.sp, color = Color(0xFF6366F1))
                        Spacer(Modifier.width(4.dp))
                        Icon(if (showCategoryCards) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, null, modifier = Modifier.size(14.dp), tint = Color(0xFF6366F1))
                    }
                    if (showCategoryCards) {
                        // 2-column card grid (web parity: sm:grid-cols-2)
                        val chunked = feedbackTypes.chunked(2)
                        chunked.forEach { row ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                row.forEach { ft ->
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = if (state.type == ft.key) ft.bgColor else Color.White,
                                        shadowElevation = if (state.type == ft.key) 3.dp else 1.dp,
                                        border = if (state.type == ft.key) androidx.compose.foundation.BorderStroke(1.5.dp, ft.tintColor) else null,
                                        modifier = Modifier.weight(1f).clickable { viewModel.setType(ft.key) },
                                    ) {
                                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(ft.emoji, fontSize = 20.sp)
                                            Text(ft.name, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = ft.tintColor)
                                            Text(ft.description, fontSize = 10.sp, color = Color(0xFF64748B), maxLines = 2)
                                        }
                                    }
                                }
                                // Fill empty cell if odd number
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                    // Star rating (web parity)
                    Text(stringResource(R.string.social_rating), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        (1..5).forEach { i ->
                            IconButton(onClick = { viewModel.setRating(i) }, modifier = Modifier.size(36.dp)) {
                                Icon(Icons.Filled.Star, null, tint = if (i <= state.rating) Color(0xFFF59E0B) else Color(0xFFE2E8F0), modifier = Modifier.size(28.dp))
                            }
                        }
                        Spacer(Modifier.width(8.dp))
                        Text("${state.rating} / 5", fontSize = 13.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium)
                    }
                    // Subject field (web parity — missing in previous version)
                    FormField("Subject *", state.subject, viewModel::setSubject, "Brief title for your feedback")
                    FormField("Message *", state.message, viewModel::setMessage, "Share your detailed thoughts…", maxLines = 6, minLines = 4)
                    Button(
                        onClick = { viewModel.submit() }, enabled = !state.loading && state.subject.isNotBlank() && state.message.isNotBlank(),
                        shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                    ) { Text(if (state.loading) "Submitting…" else "Submit Feedback", fontWeight = FontWeight.SemiBold) }
                    // Link to complaints
                    TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                        Text("Report a transaction issue instead →", fontSize = 12.sp, color = Color(0xFF6366F1))
                    }
                            } // end form Column
                        } // end card Column
                    } // end Surface card
                }

                // Why Feedback Matters — enhanced 2-col grid (web parity)
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFF8FAFC), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("💡 Why Your Feedback Matters", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                        listOf(
                            Triple("🚀", "Shapes Features", "Your ideas guide what we build next"),
                            Triple("🛡", "Improves Safety", "Bug reports keep the platform secure"),
                            Triple("✨", "Better UX", "Your UI feedback drives design decisions"),
                            Triple("🌍", "Grows Community", "Your input makes MHub better for everyone"),
                        ).chunked(2).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                row.forEach { (emoji, title, desc) ->
                                    Surface(shape = RoundedCornerShape(10.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.weight(1f)) {
                                        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(emoji, fontSize = 18.sp)
                                            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF1E293B))
                                            Text(desc, fontSize = 11.sp, color = Color(0xFF64748B))
                                        }
                                    }
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
                // Direct contact (web parity)
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFEFF6FF), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("📞 Direct Contact", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                        Text("For urgent issues, reach us at support@mhub.app", fontSize = 12.sp, color = Color(0xFF4B5563))
                        Text("We respond within 24 hours on business days.", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// ReviewsScreen
// ──────────────────────────────────────────────────────────────────────────────
data class ReviewsUiState(
    val loading: Boolean = true,
    val reviews: List<Review> = emptyList(),
    val averageRating: Float = 0f,
    val totalReviews: Int = 0,
    val error: String? = null,
    val ratingFilter: Int? = null,
    val sortBy: String = "recent",
    val showWriteForm: Boolean = false,
    val newRating: Int = 5,
    val newComment: String = "",
    val submitting: Boolean = false,
    val stats: ReviewStats? = null,
)

@HiltViewModel
class ReviewsViewModel @Inject constructor(private val repo: ReviewsRepository) : ViewModel() {
    private val _state = MutableStateFlow(ReviewsUiState())
    val state: StateFlow<ReviewsUiState> = _state.asStateFlow()
    private var targetUserId: String = ""
    fun load(userId: String) {
        targetUserId = userId
        viewModelScope.launch {
            when (val r = repo.forUser(userId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, reviews = r.data.reviews, averageRating = r.data.averageRating, totalReviews = r.data.totalReviews, stats = r.data.stats)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
    fun setRatingFilter(r: Int?) { _state.value = _state.value.copy(ratingFilter = r) }
    fun setSortBy(s: String) { _state.value = _state.value.copy(sortBy = s) }
    fun toggleWriteForm() { _state.value = _state.value.copy(showWriteForm = !_state.value.showWriteForm) }
    fun setNewRating(r: Int) { _state.value = _state.value.copy(newRating = r) }
    fun setNewComment(v: String) { _state.value = _state.value.copy(newComment = v) }
    fun submitReview() {
        val s = _state.value
        if (s.newComment.isBlank()) { _state.value = s.copy(error = "Comment is required"); return }
        _state.value = s.copy(submitting = true, error = null)
        viewModelScope.launch {
            when (repo.submit(ReviewRequest(reviewedUserId = targetUserId, rating = s.newRating, comment = s.newComment))) {
                is ApiResult.Success -> { _state.value = _state.value.copy(submitting = false, showWriteForm = false, newComment = "", newRating = 5); load(targetUserId) }
                is ApiResult.Failure -> _state.value = _state.value.copy(submitting = false, error = "Failed to submit review")
            }
        }
    }
    fun markHelpful(id: String) { viewModelScope.launch { repo.markHelpful(id) } }
    fun filteredReviews(): List<Review> {
        val s = _state.value
        var list = s.reviews
        if (s.ratingFilter != null) list = list.filter { it.rating.toInt() == s.ratingFilter }
        return when (s.sortBy) {
            "highest" -> list.sortedByDescending { it.rating }
            "lowest" -> list.sortedBy { it.rating }
            "helpful" -> list.sortedByDescending { it.helpfulCount }
            else -> list
        }
    }
}

@Composable
fun ReviewsScreen(userId: String, onBack: () -> Unit, viewModel: ReviewsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(userId) { viewModel.load(userId) }
    val filtered = viewModel.filteredReviews()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("Reviews", onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Summary card with distribution
                    item {
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(20.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(String.format("%.1f", state.averageRating), fontWeight = FontWeight.Bold, fontSize = 40.sp, color = Color(0xFF1E293B))
                                    Spacer(Modifier.width(16.dp))
                                    Column {
                                        Row { (1..5).forEach { i -> Icon(Icons.Filled.Star, null, tint = if (i <= state.averageRating) Color(0xFFF59E0B) else Color(0xFFE2E8F0), modifier = Modifier.size(20.dp)) } }
                                        Text("${state.totalReviews} reviews", fontSize = 13.sp, color = Color(0xFF64748B))
                                    }
                                }
                                // Distribution bars
                                state.stats?.distribution?.let { dist ->
                                    Spacer(Modifier.height(12.dp))
                                    (5 downTo 1).forEach { star ->
                                        val count = dist[star.toString()] ?: 0
                                        val pct = if (state.totalReviews > 0) count.toFloat() / state.totalReviews else 0f
                                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
                                            Text("$star", fontSize = 12.sp, color = Color(0xFF64748B), modifier = Modifier.width(16.dp))
                                            Icon(Icons.Filled.Star, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(14.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Box(Modifier.weight(1f).height(8.dp).clip(RoundedCornerShape(4.dp)).background(Color(0xFFE2E8F0))) {
                                                Box(Modifier.fillMaxHeight().fillMaxWidth(pct).clip(RoundedCornerShape(4.dp)).background(Color(0xFFF59E0B)))
                                            }
                                            Text("$count", fontSize = 11.sp, color = Color(0xFF94A3B8), modifier = Modifier.width(28.dp).padding(start = 6.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Write review button / form
                    item {
                        if (state.showWriteForm) {
                            Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(16.dp)) {
                                    Text(stringResource(R.string.social_write_review), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                                    Spacer(Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        (1..5).forEach { i ->
                                            IconButton(onClick = { viewModel.setNewRating(i) }, modifier = Modifier.size(36.dp)) {
                                                Icon(Icons.Filled.Star, null, tint = if (i <= state.newRating) Color(0xFFF59E0B) else Color(0xFFE2E8F0), modifier = Modifier.size(28.dp))
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    OutlinedTextField(value = state.newComment, onValueChange = viewModel::setNewComment,
                                        placeholder = { Text("Share your experience…") }, shape = RoundedCornerShape(12.dp), maxLines = 4, minLines = 3,
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                        modifier = Modifier.fillMaxWidth())
                                    Spacer(Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { viewModel.toggleWriteForm() }, shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f)) { Text("Cancel") }
                                        Button(onClick = { viewModel.submitReview() }, enabled = !state.submitting,
                                            shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                            modifier = Modifier.weight(1f)) { Text(if (state.submitting) "Submitting…" else "Submit") }
                                    }
                                }
                            }
                        } else {
                            Button(onClick = { viewModel.toggleWriteForm() }, shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                modifier = Modifier.fillMaxWidth().height(48.dp)) {
                                Icon(Icons.Filled.Edit, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Write a Review", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                    // Filters
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            FilterChip(selected = state.ratingFilter == null, onClick = { viewModel.setRatingFilter(null) },
                                label = { Text("All", fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                            (5 downTo 1).forEach { r ->
                                FilterChip(selected = state.ratingFilter == r, onClick = { viewModel.setRatingFilter(r) },
                                    label = { Text("$r★", fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                            }
                        }
                    }
                    // Reviews
                    if (filtered.isEmpty()) item {
                        Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text(stringResource(R.string.social_no_reviews_match), color = Color(0xFF64748B))
                        }
                    }
                    items(filtered, key = { it.stableId }) { review ->
                        Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(14.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(Modifier.size(36.dp).clip(CircleShape).background(Color(0xFF2563EB)), contentAlignment = Alignment.Center) {
                                        Text((review.reviewerName ?: "?").take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(review.reviewerName ?: "Anonymous", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                            if (review.verifiedPurchase) {
                                                Spacer(Modifier.width(6.dp))
                                                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFDCFCE7)) {
                                                    Text("Verified", fontSize = 9.sp, color = Color(0xFF22C55E), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                }
                                            }
                                        }
                                        Row { (1..5).forEach { i -> Icon(Icons.Filled.Star, null, tint = if (i <= review.rating) Color(0xFFF59E0B) else Color(0xFFE2E8F0), modifier = Modifier.size(14.dp)) } }
                                    }
                                    if (review.createdAt != null) Text(review.createdAt.take(10), fontSize = 11.sp, color = Color(0xFF94A3B8))
                                }
                                if (review.comment != null) { Spacer(Modifier.height(8.dp)); Text(review.comment, fontSize = 13.sp, color = Color(0xFF374151)) }
                                if (review.response != null) {
                                    Spacer(Modifier.height(8.dp))
                                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(10.dp)) {
                                            Text("Seller Response", fontWeight = FontWeight.SemiBold, fontSize = 11.sp, color = Color(0xFF2563EB))
                                            Text(review.response, fontSize = 12.sp, color = Color(0xFF374151))
                                        }
                                    }
                                }
                                Spacer(Modifier.height(6.dp))
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { viewModel.markHelpful(review.stableId) }) {
                                    Icon(Icons.Filled.ThumbUp, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Helpful (${review.helpfulCount})", fontSize = 11.sp, color = Color(0xFF94A3B8))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared form field helper
// ──────────────────────────────────────────────────────────────────────────────
@Composable
private fun FormField(label: String, value: String, onValueChange: (String) -> Unit, placeholder: String = "", maxLines: Int = 1, minLines: Int = 1) {
    Column {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value, onValueChange = onValueChange,
            placeholder = { Text(placeholder, color = Color(0xFF94A3B8), fontSize = 13.sp) },
            singleLine = maxLines == 1, maxLines = maxLines, minLines = minLines,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB),
                focusedContainerColor = Color.White, unfocusedContainerColor = Color.White,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}


