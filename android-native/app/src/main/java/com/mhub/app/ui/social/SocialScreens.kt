package com.mhub.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
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
                                    Text("Share", fontSize = 14.sp, color = Color(0xFF64748B))
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
            while (true) {
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
            title = { Text("Delete Post") },
            text = { Text("Are you sure you want to delete this post? This cannot be undone.") },
            confirmButton = { TextButton(onClick = { viewModel.deletePost(id); deleteTarget = null }) { Text("Delete", color = Color(0xFFEF4444)) } },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text("Cancel") } },
        )
    }
    // Promote dialog
    promoteTarget?.let { post ->
        AlertDialog(
            onDismissRequest = { promoteTarget = null },
            title = { Text("Promote Post 🚀") },
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
            confirmButton = { TextButton(onClick = { promoteTarget = null }) { Text("Promote", color = Color(0xFF2563EB)) } },
            dismissButton = { TextButton(onClick = { promoteTarget = null }) { Text("Cancel") } },
        )
    }
    // Share dialog
    val context = androidx.compose.ui.platform.LocalContext.current
    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
    shareTarget?.let { post ->
        AlertDialog(
            onDismissRequest = { shareTarget = null },
            title = { Text("📤 Share Post") },
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
            confirmButton = { TextButton(onClick = { shareTarget = null }) { Text("Close") } },
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
                Text("Density:", fontSize = 11.sp, color = Color(0xFF94A3B8), modifier = Modifier.padding(end = 6.dp))
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
                        Text("No posts yet", fontWeight = FontWeight.SemiBold, color = Color(0xFF374151))
                        Spacer(Modifier.height(8.dp))
                        Text("Share something with your community", fontSize = 13.sp, color = Color(0xFF64748B))
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
                                Text("Delete", color = Color(0xFFEF4444), fontSize = 12.sp)
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
                Text("New Post", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
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
                        Text("Feed posts are text-only. Share your thoughts!", fontSize = 12.sp, color = Color(0xFF2563EB))
                    }
                }
                // Title
                Column {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Title (optional)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                        Text("${state.title.length}/200", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    }
                    Spacer(Modifier.height(4.dp))
                    OutlinedTextField(value = state.title, onValueChange = viewModel::setTitle,
                        placeholder = { Text("Give your post a title…") }, singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth())
                }
                // Content
                Column {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Content *", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                        Text("${state.content.length}/500", fontSize = 11.sp, color = if (state.content.length < 5) Color(0xFFEF4444) else Color(0xFF94A3B8))
                    }
                    Spacer(Modifier.height(4.dp))
                    OutlinedTextField(value = state.content, onValueChange = viewModel::setContent,
                        placeholder = { Text("Share something with the community…") },
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
@HiltViewModel
class PublicWallViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedListUiState())
    val state: StateFlow<FeedListUiState> = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()
    private var userId: String = ""
    fun load(userId: String) { this.userId = userId; viewModelScope.launch {
        when (val r = repo.publicWall(userId)) {
            is ApiResult.Success -> _state.value = FeedListUiState(loading = false, items = r.data)
            is ApiResult.Failure -> _state.value = FeedListUiState(loading = false, error = r.error.message)
        }
    } }
    fun refresh() { viewModelScope.launch { _refreshing.value = true; load(userId); _refreshing.value = false } }
    fun retry() { _state.value = FeedListUiState(); load(userId) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicWallScreen(onBack: () -> Unit, viewModel: PublicWallViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    var leaderboardTab by remember { mutableStateOf("Top Users") }
    var userSearchQuery by remember { mutableStateOf("") }
    
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("Public Wall", onBack)
            // Leaderboard tabs
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp)) {
                listOf("Top Users", "Top Sellers", "Top Buyers").forEach { tab ->
                    FilterChip(
                        selected = leaderboardTab == tab,
                        onClick = { leaderboardTab = tab },
                        label = { Text(tab, fontSize = 12.sp) },
                        shape = RoundedCornerShape(16.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF2563EB),
                            selectedLabelColor = Color.White,
                        ),
                    )
                }
            }
            // User search
            OutlinedTextField(
                value = userSearchQuery,
                onValueChange = { userSearchQuery = it },
                placeholder = { Text("Search leaderboard by name…") },
                leadingIcon = { Icon(Icons.Filled.Search, null) },
                trailingIcon = { if (userSearchQuery.isNotEmpty()) IconButton(onClick = { userSearchQuery = "" }) { Icon(Icons.Filled.Clear, null) } },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF3B82F6),
                    unfocusedBorderColor = Color(0xFFE5E7EB),
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                ),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
            )
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.ErrorOutline, null, tint = Color(0xFFEF4444), modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(12.dp))
                        Text(state.error ?: "Failed to load", color = Color(0xFF64748B), fontSize = 14.sp)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.retry() }, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text("Retry") }
                    }
                }
                state.items.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.Person, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("No posts on this wall yet", fontWeight = FontWeight.SemiBold, color = Color(0xFF374151))
                        Spacer(Modifier.height(4.dp))
                        Text("Posts shared by this user will appear here", fontSize = 13.sp, color = Color(0xFF64748B))
                    }
                }
                else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize()) { LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Profile header card
                    item {
                        val firstPost = state.items.firstOrNull()
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(56.dp).clip(CircleShape).background(Color(0xFF2563EB)), contentAlignment = Alignment.Center) {
                                    Text((firstPost?.userName?.firstOrNull()?.uppercase() ?: "U"), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                                }
                                Spacer(Modifier.width(14.dp))
                                Column {
                                    Text(firstPost?.userName ?: "User", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = Color(0xFF1E293B))
                                    Spacer(Modifier.height(4.dp))
                                    Text("${state.items.size} post${if (state.items.size != 1) "s" else ""}", fontSize = 13.sp, color = Color(0xFF64748B))
                                }
                            }
                        }
                    }
                    // Leaderboard rank badges
                    item {
                        Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(14.dp)) {
                                Text("Community Ranking", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                Spacer(Modifier.height(10.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    val totalPosts = state.items.size
                                    val rank = when { totalPosts >= 20 -> Triple("Gold", "🥇", Color(0xFFF59E0B)); totalPosts >= 10 -> Triple("Silver", "🥈", Color(0xFF94A3B8)); totalPosts >= 5 -> Triple("Bronze", "🥉", Color(0xFFCD7F32)); else -> Triple("Starter", "⭐", Color(0xFF64748B)) }
                                    Surface(shape = RoundedCornerShape(20.dp), color = rank.third.copy(alpha = 0.1f)) {
                                        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Text(rank.second, fontSize = 16.sp)
                                            Spacer(Modifier.width(4.dp))
                                            Text(rank.first, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = rank.third)
                                        }
                                    }
                                    Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFF0F9FF)) {
                                        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.AutoMirrored.Filled.TrendingUp, null, tint = Color(0xFF2563EB), modifier = Modifier.size(14.dp))
                                            Spacer(Modifier.width(4.dp))
                                            Text("${state.items.sumOf { it.likeCount }} likes", fontSize = 12.sp, color = Color(0xFF2563EB))
                                        }
                                    }
                                }
                            }
                        }
                    }
                    items(state.items, key = { it.stableId }) { FeedCard(it) }
                } }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// ComplaintsScreen
// ──────────────────────────────────────────────────────────────────────────────
data class ComplaintsUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val subject: String = "", val description: String = "", val type: String = "transaction", val postId: String = "", val history: List<com.mhub.app.data.remote.dto.ComplaintRecord> = emptyList(), val historyLoading: Boolean = false)

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
    fun setSubject(v: String) { _state.value = _state.value.copy(subject = v) }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v) }
    fun setType(v: String) { _state.value = _state.value.copy(type = v) }
    fun setPostId(v: String) { _state.value = _state.value.copy(postId = v) }
    fun submit() {
        val s = _state.value
        if (s.subject.isBlank() || s.description.isBlank()) { _state.value = s.copy(error = "All fields are required"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.submit(ComplaintRequest(subject = s.subject, description = s.description))) {
                is ApiResult.Success -> { _state.value = ComplaintsUiState(success = true); loadHistory() }
                is ApiResult.Failure -> _state.value = s.copy(loading = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun ComplaintsScreen(onBack: () -> Unit, viewModel: ComplaintsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val complaintTypes = listOf("transaction" to "Transaction", "quality" to "Quality", "delivery" to "Delivery", "service" to "Service", "other" to "Other")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("Complaints", onBack)
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                if (state.success) {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(10.dp))
                            Text("Complaint submitted successfully. We'll review it soon.", fontSize = 14.sp, color = Color(0xFF166534))
                        }
                    }
                } else {
                    state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                    // Complaint type selector
                    Text("Complaint Type", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                        complaintTypes.forEach { (key, label) ->
                            FilterChip(selected = state.type == key, onClick = { viewModel.setType(key) },
                                label = { Text(label, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                        }
                    }
                    FormField("Post / Seller ID (optional)", state.postId, viewModel::setPostId, "e.g. post123 or seller456")
                    FormField("Subject", state.subject, viewModel::setSubject, "e.g. Fake listing, Fraud buyer…")
                    FormField("Description", state.description, viewModel::setDescription, "Describe the issue in detail…", maxLines = 5, minLines = 4)
                    Button(
                        onClick = { viewModel.submit() }, enabled = !state.loading,
                        shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                    ) { Text(if (state.loading) "Submitting…" else "Submit Complaint", fontWeight = FontWeight.SemiBold) }
                }
                // Complaint history
                if (state.historyLoading) {
                    Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                        androidx.compose.material3.CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                } else if (state.history.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Text("My Complaint History", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E293B))
                    state.history.forEach { complaint ->
                        val clipboardManager = LocalClipboardManager.current
                        Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text(complaint.subject.orEmpty(), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))
                                    val statusColor = when (complaint.status?.lowercase()) {
                                        "resolved" -> Color(0xFF22C55E)
                                        "rejected" -> Color(0xFFEF4444)
                                        "pending" -> Color(0xFFF59E0B)
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
                                // Evidence attachments
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
// FeedbackScreen
// ──────────────────────────────────────────────────────────────────────────────
data class FeedbackUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val type: String = "general", val subject: String = "", val message: String = "", val rating: Int = 5, val refId: String = "FB-${System.currentTimeMillis().toString(36).uppercase().takeLast(6)}")

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
        if (s.message.isBlank()) { _state.value = s.copy(error = "Please write your feedback"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.submitFeedback(FeedbackRequest(type = s.type, message = s.message, rating = s.rating))) {
                is ApiResult.Success -> _state.value = FeedbackUiState(success = true)
                is ApiResult.Failure -> _state.value = s.copy(loading = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun FeedbackScreen(onBack: () -> Unit, viewModel: FeedbackViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val feedbackTypes = listOf("general" to "General", "bug" to "Bug Report", "feature" to "Feature Request", "ui_ux" to "UI/UX", "performance" to "Performance")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("Feedback", onBack)
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                if (state.success) {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(10.dp))
                            Text("Thank you for your feedback!", fontSize = 14.sp, color = Color(0xFF166534))
                        }
                    }
                } else {
                    state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                    // Reference ID
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Tag, null, tint = Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Reference: ${state.refId}", fontSize = 12.sp, color = Color(0xFF2563EB))
                        }
                    }
                    // Category buttons
                    Text("Category", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                        feedbackTypes.forEach { (key, label) ->
                            FilterChip(
                                selected = state.type == key, onClick = { viewModel.setType(key) },
                                label = { Text(label, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                        }
                    }
                    Text("Rating", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        (1..5).forEach { i ->
                            IconButton(onClick = { viewModel.setRating(i) }, modifier = Modifier.size(36.dp)) {
                                Icon(Icons.Filled.Star, null, tint = if (i <= state.rating) Color(0xFFF59E0B) else Color(0xFFE2E8F0), modifier = Modifier.size(28.dp))
                            }
                        }
                    }
                    FormField("Message", state.message, viewModel::setMessage, "Share your thoughts…", maxLines = 5, minLines = 4)
                    Button(
                        onClick = { viewModel.submit() }, enabled = !state.loading,
                        shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                    ) { Text(if (state.loading) "Submitting…" else "Submit Feedback", fontWeight = FontWeight.SemiBold) }
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
                                    Text("Write a Review", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
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
                            Text("No reviews match your filter", color = Color(0xFF64748B))
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


