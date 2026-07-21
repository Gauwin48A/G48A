package com.zaruda.app.ui.commerce

import android.content.Intent
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.R
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.common.LinkColor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────

data class MyPostsUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val posts: List<Post> = emptyList(),
    val error: String? = null,
    val statusFilter: String = "all",
    val sortBy: String = "date",
    val showDeleteDialog: String? = null,
    val showPromoteDialog: String? = null,
    val showMenu: String? = null,
)

@HiltViewModel
class MyPostsViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    private val _state = MutableStateFlow(MyPostsUiState())
    val state: StateFlow<MyPostsUiState> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            when (val r = repo.mine()) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, posts = r.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(refreshing = true)
            when (val r = repo.mine()) {
                is ApiResult.Success -> _state.value = _state.value.copy(refreshing = false, posts = r.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(refreshing = false, error = r.error.message)
            }
        }
    }
    fun setStatusFilter(f: String) { _state.value = _state.value.copy(statusFilter = f) }
    fun setSortBy(s: String) { _state.value = _state.value.copy(sortBy = s) }
    fun showDeleteDialog(id: String?) { _state.value = _state.value.copy(showDeleteDialog = id) }
    fun showPromoteDialog(id: String?) { _state.value = _state.value.copy(showPromoteDialog = id) }
    fun showMenu(id: String?) { _state.value = _state.value.copy(showMenu = id) }
    fun deletePost(id: String) {
        viewModelScope.launch {
            repo.delete(id)
            _state.value = _state.value.copy(posts = _state.value.posts.filter { it.stableId != id }, showDeleteDialog = null)
        }
    }
    fun filteredPosts(): List<Post> {
        val s = _state.value
        var filtered = when (s.statusFilter) {
            "active" -> s.posts.filter { it.status?.lowercase() == "active" }
            "draft" -> s.posts.filter { it.status?.lowercase() == "draft" }
            "sold" -> s.posts.filter { it.status?.lowercase() == "sold" }
            "archived" -> s.posts.filter { it.status?.lowercase() == "archived" }
            else -> s.posts
        }
        filtered = when (s.sortBy) {
            "views" -> filtered.sortedByDescending { it.views ?: 0 }
            "likes" -> filtered.sortedByDescending { it.likes ?: 0 }
            "price" -> filtered.sortedByDescending { it.price ?: 0.0 }
            "title" -> filtered.sortedBy { it.displayTitle }
            else -> filtered.sortedByDescending { it.createdAt ?: "" }
        }
        return filtered
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyPostsScreen(onBack: () -> Unit, onEdit: (String) -> Unit = {}, viewModel: MyPostsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    var search by remember { mutableStateOf("") }
    val filtered = remember(state, search) {
        viewModel.filteredPosts().filter { search.isBlank() || it.displayTitle.contains(search, true) }
    }
    var expanded by remember { mutableStateOf(false) }

    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            // Screen Header (since MhubTopBar is unified)
            Text(
                stringResource(R.string.my_posts_label),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )
            
            // Search Bar (Fixed: "Search bar not working in myhome")
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                placeholder = { Text("Search your listings...") },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
                trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Default.Close, null) } },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface)
            )

            // Status filter tabs
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("all" to stringResource(R.string.commerce_filter_all), "active" to stringResource(R.string.commerce_filter_active), "draft" to stringResource(R.string.commerce_filter_draft), "sold" to stringResource(R.string.commerce_filter_sold), "archived" to stringResource(R.string.commerce_filter_archived)).forEach { (key, label) ->
                    FilterChip(
                        selected = state.statusFilter == key,
                        onClick = { viewModel.setStatusFilter(key) },
                        label = { Text(label, fontSize = 11.sp) },
                        shape = RoundedCornerShape(20.dp),
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
                    )
                }
            }
            // Sort dropdown
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.commerce_sort_by), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(8.dp))
                Box {
                    Surface(
                        onClick = { expanded = true },
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = ButtonDefaults.outlinedButtonBorder(enabled = true),
                    ) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                when (state.sortBy) {
                                    "views" -> stringResource(R.string.commerce_sort_views)
                                    "likes" -> stringResource(R.string.commerce_sort_likes)
                                    "price" -> stringResource(R.string.commerce_sort_price)
                                    "title" -> stringResource(R.string.commerce_sort_title)
                                    else -> stringResource(R.string.commerce_sort_date)
                                },
                                fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary,
                            )
                            Icon(Icons.Filled.ArrowDropDown, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                        }
                    }
                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        listOf("date" to stringResource(R.string.commerce_sort_date), "views" to stringResource(R.string.commerce_sort_views), "likes" to stringResource(R.string.commerce_sort_likes), "price" to stringResource(R.string.commerce_sort_price), "title" to stringResource(R.string.commerce_sort_title)).forEach { (key, label) ->
                            DropdownMenuItem(text = { Text(label) }, onClick = { viewModel.setSortBy(key); expanded = false })
                        }
                    }
                }
            }

            PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize()
            ) {
                when {
                    state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) }
                    filtered.isEmpty() -> Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), contentAlignment = Alignment.Center) {
                        EmptyState(
                            icon = { Icon(Icons.Filled.PostAdd, null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(64.dp)) },
                            title = stringResource(R.string.commerce_no_posts), subtitle = stringResource(R.string.commerce_no_posts_desc),
                        )
                    }
                    else -> LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item { Text(stringResource(R.string.commerce_posts_count, filtered.size), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        items(filtered, key = { it.stableId }) { post ->
                            MyPostCard(
                                post = post,
                                onEdit = { onEdit(post.stableId) },
                                onDelete = { viewModel.showDeleteDialog(post.stableId) },
                                onPromote = { viewModel.showPromoteDialog(post.stableId) },
                                onMenu = { viewModel.showMenu(post.stableId) },
                                isMenuOpen = state.showMenu == post.stableId,
                                onMenuDismiss = { viewModel.showMenu(null) },
                            )
                        }
                    }
                }
            }
        }
    }

    // Delete confirmation dialog
    if (state.showDeleteDialog != null) {
        AlertDialog(
            onDismissRequest = { viewModel.showDeleteDialog(null) },
            title = { Text(stringResource(R.string.commerce_delete_post_title)) },
            text = { Text(stringResource(R.string.commerce_delete_confirm)) },
            confirmButton = {
                Button(
                    onClick = { viewModel.deletePost(state.showDeleteDialog!!) },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                ) { Text(stringResource(R.string.action_delete)) }
            },
            dismissButton = { TextButton(onClick = { viewModel.showDeleteDialog(null) }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }

    // Promote dialog
    if (state.showPromoteDialog != null) {
        AlertDialog(
            onDismissRequest = { viewModel.showPromoteDialog(null) },
            title = { Text(stringResource(R.string.commerce_boost_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        Triple("Basic Boost", "₹49", "3 days featured • 2x visibility"),
                        Triple("Pro Boost", "₹99", "7 days featured • 5x visibility • Priority badge"),
                        Triple("Premium Boost", "₹199", "14 days featured • 10x visibility • Homepage placement"),
                    ).forEach { (tier, price, desc) ->
                        Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(tier, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                                    Spacer(Modifier.weight(1f))
                                    Text(price, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.primary)
                                }
                                Text(desc, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.showPromoteDialog(null) }) { Text(stringResource(R.string.commerce_continue_payment)) }
            },
            dismissButton = { TextButton(onClick = { viewModel.showPromoteDialog(null) }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }
}

@Composable
private fun MyPostCard(
    post: Post,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onPromote: () -> Unit,
    onMenu: () -> Unit,
    isMenuOpen: Boolean,
    onMenuDismiss: () -> Unit,
) {
    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage, contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                    )
                } else {
                    Box(Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Image, null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(28.dp))
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 2)
                    if (post.price != null) Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        post.status?.let { s -> StatusChip(s) }
                    }
                    // Metrics
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 4.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(3.dp))
                            Text("${post.views ?: 0}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Favorite, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(3.dp))
                            Text("${post.likes ?: 0}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                // Menu button
                Box {
                    IconButton(onClick = onMenu, modifier = Modifier.size(30.dp)) {
                        Icon(Icons.Filled.MoreVert, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    DropdownMenu(expanded = isMenuOpen, onDismissRequest = onMenuDismiss) {
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.btn_edit)) },
                            leadingIcon = { Icon(Icons.Filled.Edit, null) },
                            onClick = { onEdit(); onMenuDismiss() },
                        )
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.btn_promote)) },
                            leadingIcon = { Icon(Icons.AutoMirrored.Filled.TrendingUp, null) },
                            onClick = { onPromote(); onMenuDismiss() },
                        )
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.btn_delete), color = MaterialTheme.colorScheme.error) },
                            leadingIcon = { Icon(Icons.Filled.Delete, null, tint = MaterialTheme.colorScheme.error) },
                            onClick = { onDelete(); onMenuDismiss() },
                        )
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// BoughtPostsScreen / SoldPostsScreen
// ──────────────────────────────────────────────────────────────────────────────
data class PostListUiState(val loading: Boolean = true, val posts: List<Post> = emptyList(), val error: String? = null)