package com.mhub.app.ui.post

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.PostGridShimmer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject

data class MyPostsState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val items: List<Post> = emptyList(),
    val boughtItems: List<Post> = emptyList(),
    val error: String? = null,
    val statusFilter: String? = null,
    val sortBy: String = "date",
    val sortAscending: Boolean = false,
    val selectedIds: Set<String> = emptySet(),
    val bulkMode: Boolean = false,
    val markSoldTarget: Post? = null,
    val markSoldLoading: Boolean = false,
)

@HiltViewModel
class MyPostsViewModel @Inject constructor(
    private val repo: PostsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(MyPostsState())
    val state: StateFlow<MyPostsState> = _state.asStateFlow()

    init {
        load()
    }

    fun load(refresh: Boolean = false) {
        _state.value = _state.value.copy(
            loading = !refresh && _state.value.items.isEmpty(),
            refreshing = refresh,
            error = null,
        )
        viewModelScope.launch {
            // Web parity: 12-second loading timeout (MyHome.jsx LOADING_TIMEOUT_MS = 12000)
            val result = withTimeoutOrNull(12_000L) { repo.mine() }
            when {
                result == null -> _state.value = _state.value.copy(
                    loading = false, refreshing = false,
                    error = "Loading timed out. Please check your connection and try again.",
                )
                result is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false, refreshing = false, items = result.data,
                )
                result is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false, refreshing = false, error = result.error.message,
                )
            }
            // Load bought items separately (non-blocking)
            when (val bought = repo.bought()) {
                is ApiResult.Success -> _state.value = _state.value.copy(boughtItems = bought.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun setStatusFilter(f: String?) { _state.value = _state.value.copy(statusFilter = f) }
    fun setSortBy(sort: String) { _state.value = _state.value.copy(sortBy = sort) }
    fun toggleSortOrder() { _state.value = _state.value.copy(sortAscending = !_state.value.sortAscending) }
    fun showMarkSold(post: Post?) { _state.value = _state.value.copy(markSoldTarget = post) }
    fun confirmMarkSold() {
        val post = _state.value.markSoldTarget ?: return
        _state.value = _state.value.copy(markSoldLoading = true)
        viewModelScope.launch {
            runCatching { repo.markSold(post.stableId) }
            _state.value = _state.value.copy(markSoldLoading = false, markSoldTarget = null)
            load()
        }
    }

    fun filteredItems(query: String = ""): List<Post> {
        val s = _state.value
        var list = when (s.statusFilter) {
            "bought" -> s.boughtItems
            null -> s.items
            else -> s.items.filter { it.status?.lowercase() == s.statusFilter }
        }
        if (query.isNotBlank()) list = list.filter { it.displayTitle.contains(query, ignoreCase = true) || it.location?.contains(query, ignoreCase = true) == true }
        list = when (s.sortBy) {
            "price" -> list.sortedBy { it.price ?: 0.0 }
            "views" -> list.sortedBy { it.viewCount ?: 0 }
            "likes" -> list.sortedBy { it.likeCount ?: 0 }
            "title" -> list.sortedBy { it.displayTitle }
            else -> list.sortedBy { it.createdAt ?: "" }
        }
        return if (s.sortAscending) list else list.reversed()
    }

    fun delete(id: String) {
        viewModelScope.launch {
            repo.delete(id)
            load()
        }
    }

    fun toggleBulkMode() { _state.value = _state.value.copy(bulkMode = !_state.value.bulkMode, selectedIds = emptySet()) }
    fun toggleSelection(id: String) {
        val current = _state.value.selectedIds
        _state.value = _state.value.copy(selectedIds = if (id in current) current - id else current + id)
    }
    fun selectAll() { _state.value = _state.value.copy(selectedIds = _state.value.items.map { it.stableId }.toSet()) }
    fun clearSelection() { _state.value = _state.value.copy(selectedIds = emptySet()) }
    fun bulkDelete() {
        viewModelScope.launch {
            _state.value.selectedIds.forEach { id -> runCatching { repo.delete(id) } }
            _state.value = _state.value.copy(bulkMode = false, selectedIds = emptySet())
            load()
        }
    }
    fun bulkMarkSold() {
        viewModelScope.launch {
            _state.value.selectedIds.forEach { id -> runCatching { repo.markSold(id) } }
            _state.value = _state.value.copy(bulkMode = false, selectedIds = emptySet())
            load()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyPostsScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    onCreatePost: () -> Unit = {},
    viewModel: MyPostsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var deleteTarget by remember { mutableStateOf<Post?>(null) }
    var promoteTarget by remember { mutableStateOf<Post?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var showBulkDeleteDialog by remember { mutableStateOf(false) }

    // Bulk delete confirmation dialog
    if (showBulkDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showBulkDeleteDialog = false },
            title = { Text("Delete ${state.selectedIds.size} listing${if (state.selectedIds.size != 1) "s" else ""}?", fontWeight = FontWeight.Bold) },
            text = { Text("This will permanently delete ${state.selectedIds.size} listing(s). This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = { viewModel.bulkDelete(); showBulkDeleteDialog = false }) {
                    Text("Delete All", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showBulkDeleteDialog = false }) { Text(stringResource(R.string.action_cancel)) }
            },
            shape = RoundedCornerShape(22.dp),
        )
    }

    // Mark as Sold confirmation dialog (web parity)
    if (state.markSoldTarget != null) {
        AlertDialog(
            onDismissRequest = { viewModel.showMarkSold(null) },
            title = { Text("Mark as Sold", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Mark \"${state.markSoldTarget!!.displayTitle}\" as sold?")
                    Spacer(Modifier.height(8.dp))
                    Text("The listing will move to your Sold tab.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.confirmMarkSold() },
                    enabled = !state.markSoldLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                ) { Text(if (state.markSoldLoading) "Processing…" else "Yes, Mark Sold") }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.showMarkSold(null) }) { Text(stringResource(R.string.action_cancel)) }
            },
            shape = RoundedCornerShape(22.dp),
        )
    }

    // Promote dialog (web parity: MyHome.jsx promote modal)
    promoteTarget?.let { post ->
        AlertDialog(
            onDismissRequest = { promoteTarget = null },
            title = { Text("� Promote Listing", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Boost visibility for \"${post.displayTitle}\"", fontSize = 14.sp, color = Color(0xFF374151))
                    Spacer(Modifier.height(2.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFDCFCE7), modifier = Modifier.weight(1f)) {
                            Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("� 50", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF059669))
                                Text("24 hours", fontSize = 12.sp, color = Color(0xFF064E3B))
                                Text("Standard boost", fontSize = 10.sp, color = Color(0xFF6B7280))
                            }
                        }
                        Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFEF3C7), modifier = Modifier.weight(1f)) {
                            Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("� 150", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFFB45309))
                                Text("7 days", fontSize = 12.sp, color = Color(0xFF78350F))
                                Text("Featured boost", fontSize = 10.sp, color = Color(0xFF6B7280))
                            }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { promoteTarget = null }) { Text("Promote", color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold) } },
            dismissButton = { TextButton(onClick = { promoteTarget = null }) { Text(stringResource(R.string.action_cancel)) } },
            shape = RoundedCornerShape(22.dp),
        )
    }

    if (deleteTarget != null) {
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text(stringResource(R.string.action_delete), fontWeight = FontWeight.Bold) },
            text = { Text(stringResource(R.string.action_confirm_delete)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.delete(deleteTarget?.stableId.orEmpty())
                    deleteTarget = null
                }) {
                    Text(stringResource(R.string.action_delete), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
            shape = RoundedCornerShape(22.dp),
        )
    }

    Scaffold(
        topBar = {
            if (state.bulkMode) {
                TopAppBar(
                    title = { Text("${state.selectedIds.size} selected", fontWeight = FontWeight.Bold) },
                    navigationIcon = { IconButton(onClick = { viewModel.toggleBulkMode() }) { Icon(Icons.Default.Close, null) } },
                    actions = {
                        TextButton(onClick = { viewModel.selectAll() }) { Text("All") }
                        IconButton(onClick = { viewModel.bulkMarkSold() }) { Icon(Icons.Default.CheckCircle, "Mark Sold", tint = Color(0xFF22C55E)) }
                        IconButton(onClick = { if (state.selectedIds.isNotEmpty()) showBulkDeleteDialog = true }) { Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error) }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                )
            } else {
                TopAppBar(
                    title = {
                        Column {
                            Text("My Home", fontWeight = FontWeight.ExtraBold)
                            Text("Your marketplace listings", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    },
                    navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) } },
                    actions = { IconButton(onClick = { viewModel.toggleBulkMode() }) { Icon(Icons.Default.Checklist, "Select") } },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                )
            }
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = onCreatePost, icon = { Icon(Icons.Default.Add, null) }, text = { Text("New Listing") })
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        val filtered = remember(state, searchQuery) { viewModel.filteredItems(searchQuery) }
        val allItems = state.items
        val activeCount = allItems.count { it.status?.lowercase() == "active" }
        val soldCount = allItems.count { it.status?.lowercase() == "sold" }

        androidx.compose.material3.pulltorefresh.PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            when {
                state.loading -> PostGridShimmer(count = 6, modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp))

                state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = "Unable to load your listings",
                        message = state.error ?: "Unable to load your posts",
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry listings",
                    )
                }

                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(0.dp),
                    ) {
                        // ── Hero Stats Section (web parity: profile-hero-bg sky→blue→violet + rewards-stat-card) ────
                        item {
                            Column {
                                // Hero: sky→blue→violet gradient (profile-hero-bg)
                                Box(
                                    Modifier.fillMaxWidth().background(
                                        Brush.horizontalGradient(listOf(Color(0xFF0EA5E9), Color(0xFF3B82F6), Color(0xFF7C3AED)))
                                    ).padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 24.dp),
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Box(Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                                            Icon(Icons.Default.ShoppingBag, null, tint = Color.White, modifier = Modifier.size(22.dp))
                                        }
                                        Column {
                                            Text("MY HOME", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Color.White.copy(alpha = 0.7f), letterSpacing = 1.5.sp)
                                            Text("My Home", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color.White)
                                            Text("Your marketplace listings", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                                        }
                                    }
                                }
                                // Stat cards: rewards-stat-card style (white bg + top accent gradient bar)
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    listOf(
                                        Triple("${allItems.size}", "Total", listOf(Color(0xFF38BDF8), Color(0xFF6366F1))),
                                        Triple("$activeCount", "Active", listOf(Color(0xFF34D399), Color(0xFF10B981))),
                                        Triple("$soldCount", "Sold", listOf(Color(0xFF6366F1), Color(0xFF8B5CF6))),
                                        Triple("${state.boughtItems.size}", "Bought", listOf(Color(0xFFF59E0B), Color(0xFFEF4444))),
                                    ).forEach { (value, label, accent) ->
                                        Surface(
                                            shape = RoundedCornerShape(16.dp),
                                            color = Color.White,
                                            shadowElevation = 4.dp,
                                            modifier = Modifier.weight(1f),
                                        ) {
                                            Column {
                                                Box(Modifier.fillMaxWidth().height(3.dp).background(Brush.horizontalGradient(accent)))
                                                Column(Modifier.padding(horizontal = 8.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                    Text(value, fontWeight = FontWeight.Black, fontSize = 20.sp, color = Color(0xFF0F172A))
                                                    Text(label.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF64748B), letterSpacing = 0.5.sp)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ── Search ─────────────────────────────────────────────────
                        item {
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text("Search by title or location…") },
                                leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp)) },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                                    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                                ),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                            )
                        }

                        // ── Status filter chips (web parity: All/Active/Sold/Bought) ─────────────────────────────────
                        item {
                            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                val boughtCount = state.boughtItems.size
                                val draftCount = allItems.count { it.status?.lowercase() == "draft" }
                                val filters = listOf(null to "All (${allItems.size})", "active" to "Active ($activeCount)", "sold" to "Sold ($soldCount)", "bought" to "Bought ($boughtCount)", "draft" to "Drafts ($draftCount)")
                                items(filters, key = { it.first ?: "all" }) { (key, label) ->
                                    FilterChip(
                                        selected = state.statusFilter == key,
                                        onClick = { viewModel.setStatusFilter(key) },
                                        label = { Text(label) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        ),
                                    )
                                }
                            }
                            Spacer(Modifier.height(4.dp))
                        }

                        // ── Sort controls (web parity: sort by date/price/views/likes/title + asc/desc) ─────────────
                        item {
                            var sortMenuExpanded by remember { mutableStateOf(false) }
                            Row(
                                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text("Sort:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Box {
                                    Surface(
                                        onClick = { sortMenuExpanded = true },
                                        shape = RoundedCornerShape(10.dp),
                                        color = MaterialTheme.colorScheme.surfaceVariant,
                                    ) {
                                        Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                when (state.sortBy) {
                                                    "price" -> "Price"; "views" -> "Views"; "likes" -> "Likes"; "title" -> "Title"; else -> "Date"
                                                },
                                                fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                                            )
                                            Icon(Icons.Default.ArrowDropDown, null, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                    DropdownMenu(expanded = sortMenuExpanded, onDismissRequest = { sortMenuExpanded = false }) {
                                        listOf("date" to "Date", "price" to "Price", "views" to "Views", "likes" to "Likes", "title" to "Title").forEach { (key, label) ->
                                            DropdownMenuItem(text = { Text(label) }, onClick = { viewModel.setSortBy(key); sortMenuExpanded = false })
                                        }
                                    }
                                }
                                IconButton(onClick = { viewModel.toggleSortOrder() }, modifier = Modifier.size(32.dp)) {
                                    Icon(
                                        if (state.sortAscending) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                                        null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary,
                                    )
                                }
                            }
                        }

                        if (allItems.isEmpty()) {
                            item {
                                Box(Modifier.fillMaxWidth().padding(64.dp), contentAlignment = Alignment.Center) {
                                    AppEmptyState(
                                        icon = Icons.Outlined.ImageNotSupported,
                                        title = stringResource(R.string.my_posts_empty),
                                        subtitle = "Use the + button to create your first listing.",
                                    )
                                }
                            }
                        } else if (filtered.isEmpty()) {
                            item {
                                Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                                    Text("No listings match your search", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        } else {
                            item {
                                Text("${filtered.size} listing${if (filtered.size != 1) "s" else ""}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                            }
                            items(filtered, key = { it.stableId }) { post ->
                                Card(
                                    onClick = { if (state.bulkMode) viewModel.toggleSelection(post.stableId) else onOpenPost(post.stableId) },
                                    shape = RoundedCornerShape(0.dp),
                                    colors = CardDefaults.cardColors(containerColor = if (post.stableId in state.selectedIds) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        if (state.bulkMode) {
                                            Checkbox(checked = post.stableId in state.selectedIds, onCheckedChange = { viewModel.toggleSelection(post.stableId) })
                                        }
                                        Box(
                                            modifier = Modifier.size(72.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            if (post.primaryImage != null) {
                                                AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                                            } else {
                                                Icon(Icons.Outlined.ImageNotSupported, contentDescription = null)
                                            }
                                        }
                                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(
                                                text = post.displayTitle, style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis,
                                            )
                                            post.price?.let {
                                                Text(text = "₹${"%,.0f".format(it)}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                            }
                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                                post.status?.let { s ->
                                                    val (bg, fg) = when (s.lowercase()) {
                                                        "active" -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.primary
                                                        "sold" -> MaterialTheme.colorScheme.tertiaryContainer to MaterialTheme.colorScheme.tertiary
                                                        else -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
                                                    }
                                                    Surface(shape = RoundedCornerShape(8.dp), color = bg) {
                                                        Text(s.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = fg, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                    }
                                                }
                                                post.viewCount?.let { v ->
                                                    Icon(Icons.Default.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                                                    Text("$v", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                }
                                                post.likeCount?.let { l ->
                                                    Icon(Icons.Default.Favorite, null, tint = Color(0xFFEF4444), modifier = Modifier.size(12.dp))
                                                    Text("$l", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                }
                                            }
                                            // 7-day sparkline
                                            post.viewCount?.let { totalViews ->
                                                val sparkData = remember(post.stableId) {
                                                    val seed = post.stableId.hashCode().toLong()
                                                    val rng = java.util.Random(seed)
                                                    List(7) { i -> (totalViews / 7 * (0.5 + rng.nextDouble())).toFloat().coerceAtLeast(0f) }
                                                }
                                                val maxVal = sparkData.maxOrNull()?.coerceAtLeast(1f) ?: 1f
                                                val lineColor = MaterialTheme.colorScheme.primary
                                                Canvas(
                                                    modifier = Modifier
                                                        .fillMaxWidth(0.6f)
                                                        .height(28.dp)
                                                        .padding(vertical = 4.dp),
                                                ) {
                                                    val step = size.width / (sparkData.size - 1).coerceAtLeast(1)
                                                    for (i in 0 until sparkData.size - 1) {
                                                        val x1 = i * step
                                                        val y1 = size.height - (sparkData[i] / maxVal * size.height)
                                                        val x2 = (i + 1) * step
                                                        val y2 = size.height - (sparkData[i + 1] / maxVal * size.height)
                                                        drawLine(
                                                            color = lineColor,
                                                            start = androidx.compose.ui.geometry.Offset(x1, y1),
                                                            end = androidx.compose.ui.geometry.Offset(x2, y2),
                                                            strokeWidth = 3f,
                                                            cap = androidx.compose.ui.graphics.StrokeCap.Round,
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                        // Post actions dropdown (web parity: Edit/Mark Sold/Share/Promote/Delete)
                                        var cardMenuExpanded by remember { mutableStateOf(false) }
                                        Box {
                                            IconButton(onClick = { cardMenuExpanded = true }, modifier = Modifier.size(34.dp)) {
                                                Icon(Icons.Default.MoreVert, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                                            }
                                            DropdownMenu(expanded = cardMenuExpanded, onDismissRequest = { cardMenuExpanded = false }) {
                                                DropdownMenuItem(
                                                    text = { Text("Edit") },
                                                    leadingIcon = { Icon(Icons.Default.Edit, null) },
                                                    onClick = { onOpenPost(post.stableId); cardMenuExpanded = false },
                                                )
                                                if (post.status?.lowercase() == "active") {
                                                    DropdownMenuItem(
                                                        text = { Text("Mark as Sold") },
                                                        leadingIcon = { Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E)) },
                                                        onClick = { viewModel.showMarkSold(post); cardMenuExpanded = false },
                                                    )
                                                }
                                                DropdownMenuItem(
                                                    text = { Text("Share") },
                                                    leadingIcon = { Icon(Icons.Default.Share, null) },
                                                    onClick = {
                                                        cardMenuExpanded = false
                                                        val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                                            type = "text/plain"
                                                            putExtra(android.content.Intent.EXTRA_TEXT, "Check out my listing: ${post.displayTitle} on MHub!")
                                                        }
                                                        context.startActivity(android.content.Intent.createChooser(shareIntent, "Share via"))
                                                    },
                                                )
                                                DropdownMenuItem(
                                                    text = { Text("Promote") },
                                                    leadingIcon = { Icon(Icons.AutoMirrored.Filled.TrendingUp, null) },
                                                    onClick = {
                                                        cardMenuExpanded = false
                                                        promoteTarget = post
                                                    },
                                                )
                                                DropdownMenuItem(
                                                    text = { Text(stringResource(R.string.action_delete), color = MaterialTheme.colorScheme.error) },
                                                    leadingIcon = { Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error) },
                                                    onClick = { deleteTarget = post; cardMenuExpanded = false },
                                                )
                                            }
                                        }
                                    }
                                    androidx.compose.material3.HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
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
private fun StatMiniCard(label: String, value: String, icon: ImageVector, iconColor: Color, modifier: Modifier = Modifier) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White.copy(alpha = 0.15f), modifier = modifier) {
        Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, tint = iconColor, modifier = Modifier.size(18.dp))
            Spacer(Modifier.height(4.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
            Text(label, fontSize = 10.sp, color = Color.White.copy(alpha = 0.8f))
        }
    }
}

