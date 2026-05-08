package com.mhub.app.ui.post

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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
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
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MyPostsState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val items: List<Post> = emptyList(),
    val error: String? = null,
    val statusFilter: String? = null,
    val selectedIds: Set<String> = emptySet(),
    val bulkMode: Boolean = false,
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
            when (val result = repo.mine()) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, refreshing = false, items = result.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    refreshing = false,
                    error = result.error.message,
                )
            }
        }
    }

    fun setStatusFilter(f: String?) { _state.value = _state.value.copy(statusFilter = f) }

    fun filteredItems(query: String = ""): List<Post> {
        val s = _state.value
        var list = if (s.statusFilter == null) s.items else s.items.filter { it.status?.lowercase() == s.statusFilter }
        if (query.isNotBlank()) list = list.filter { it.displayTitle.contains(query, ignoreCase = true) || it.location?.contains(query, ignoreCase = true) == true }
        return list
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
    var deleteTarget by remember { mutableStateOf<Post?>(null) }
    var searchQuery by remember { mutableStateOf("") }

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
                        IconButton(onClick = { viewModel.bulkDelete() }) { Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error) }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                )
            } else {
                TopAppBar(
                    title = { Text(stringResource(R.string.profile_my_posts), fontWeight = FontWeight.Bold) },
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
        val totalViews = allItems.sumOf { it.viewCount ?: 0 }

        androidx.compose.material3.pulltorefresh.PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }

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
                        // ── Hero Stats Section ────────────────────────────────────
                        item {
                            Box(
                                Modifier.fillMaxWidth().background(
                                    Brush.verticalGradient(listOf(Color(0xFF1D4ED8), Color(0xFF2563EB), Color(0xFF3B82F6)))
                                ),
                            ) {
                                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("My Listings", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color.White)
                                    Text("Manage and track your listings", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        StatMiniCard("Total", "${allItems.size}", Icons.Default.ShoppingBag, Color(0xFF3B82F6), Modifier.weight(1f))
                                        StatMiniCard("Active", "$activeCount", Icons.AutoMirrored.Filled.TrendingUp, Color(0xFF22C55E), Modifier.weight(1f))
                                        StatMiniCard("Sold", "$soldCount", Icons.Default.Favorite, Color(0xFFF59E0B), Modifier.weight(1f))
                                        StatMiniCard("Views", "$totalViews", Icons.Default.Visibility, Color(0xFF8B5CF6), Modifier.weight(1f))
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

                        // ── Status filter chips ────────────────────────────────────
                        item {
                            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                val filters = listOf(null to "All (${allItems.size})", "active" to "Active ($activeCount)", "sold" to "Sold ($soldCount)", "draft" to "Draft")
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
                                        }
                                        Column {
                                            IconButton(onClick = { onOpenPost(post.stableId) }, modifier = Modifier.size(34.dp)) {
                                                Icon(Icons.Default.Edit, "Edit", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                                            }
                                            IconButton(onClick = { deleteTarget = post }, modifier = Modifier.size(34.dp)) {
                                                Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
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

