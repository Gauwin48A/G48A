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
import androidx.compose.ui.text.font.FontFamily
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
import coil.request.ImageRequest
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
    val context = LocalContext.current
    var search by remember { mutableStateOf("") }
    val filtered = remember(state, search) {
        viewModel.filteredPosts().filter { search.isBlank() || it.displayTitle.contains(search, true) }
    }
    var expanded by remember { mutableStateOf(false) }

    // Aggregate KPIs
    val totalActive = remember(state.posts) { state.posts.count { it.status?.lowercase() == "active" } }
    val totalViews = remember(state.posts) { state.posts.sumOf { it.views ?: it.viewCount ?: 0 } }
    val totalValue = remember(state.posts) { state.posts.sumOf { it.price ?: 0.0 } }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // ── 1. Hero Header with Tirumala 3A Backdrop ──
                item(key = "myhome_hero") {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(240.dp),
                    ) {
                        // 3A Scenic Backdrop
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(com.zaruda.app.R.drawable.tirumala_konda_bg)
                                .crossfade(true)
                                .build(),
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            alignment = androidx.compose.ui.BiasAlignment(0f, 0.25f),
                            modifier = Modifier.fillMaxSize(),
                        )

                        // Balanced Dark Gradient Scrim
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color.Black.copy(alpha = 0.35f),
                                            Color.Black.copy(alpha = 0.20f),
                                            Color.Black.copy(alpha = 0.65f),
                                            MaterialTheme.colorScheme.background,
                                        )
                                    )
                                )
                        )

                        // Top Row & Title
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(WindowInsets.statusBars.asPaddingValues())
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                        ) {
                            // Top Row: Back Button + Seller Studio Badge
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                IconButton(
                                    onClick = onBack,
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(Color.Black.copy(alpha = 0.45f)),
                                ) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.ArrowBack,
                                        contentDescription = "Back",
                                        tint = Color.White,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }

                                Surface(
                                    shape = RoundedCornerShape(20.dp),
                                    color = Color(0xFF10B981).copy(alpha = 0.25f),
                                    border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.5f)),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    ) {
                                        Text("🛡️", fontSize = 11.sp)
                                        Text(
                                            "Verified Seller Hub",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                        )
                                    }
                                }
                            }

                            // Title & Subtitle Banner
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Text(
                                        text = "My Home",
                                        fontFamily = FontFamily.Serif,
                                        fontSize = 30.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                    )
                                    Text(
                                        text = "Studio",
                                        fontFamily = FontFamily.Cursive,
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.Normal,
                                        color = Color(0xFFF59E0B),
                                    )
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = "Manage your active listings, view engagement, and track deals",
                                    fontSize = 12.sp,
                                    color = Color.White.copy(alpha = 0.85f),
                                    fontWeight = FontWeight.Medium,
                                )
                            }

                            Spacer(Modifier.height(4.dp))
                        }
                    }
                }

                // ── 2. 4-KPI Performance Matrix ──
                item(key = "kpi_matrix") {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        KpiCard(
                            label = "Active",
                            value = "$totalActive",
                            icon = Icons.Default.Inventory2,
                            color = Color(0xFF10B981),
                            modifier = Modifier.weight(1f),
                        )
                        KpiCard(
                            label = "Total Views",
                            value = "$totalViews",
                            icon = Icons.Default.Visibility,
                            color = Color(0xFF3B82F6),
                            modifier = Modifier.weight(1f),
                        )
                        KpiCard(
                            label = "Catalog Value",
                            value = "₹%,.0f".format(totalValue),
                            icon = Icons.Default.AccountBalanceWallet,
                            color = Color(0xFF8B5CF6),
                            modifier = Modifier.weight(1.2f),
                        )
                    }
                }

                // ── 3. Search & Filters ──
                item(key = "search_and_filters") {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        // Search Bar
                        OutlinedTextField(
                            value = search,
                            onValueChange = { search = it },
                            placeholder = { Text("Search your listings by title, category...") },
                            leadingIcon = { Icon(Icons.Default.Search, null, tint = MaterialTheme.colorScheme.primary) },
                            trailingIcon = {
                                if (search.isNotBlank()) {
                                    IconButton(onClick = { search = "" }) { Icon(Icons.Default.Close, null) }
                                }
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = MaterialTheme.colorScheme.surface,
                                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                            ),
                        )

                        // Status filter chips
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                        ) {
                            val filters = listOf(
                                "all" to "🌟 All Listings",
                                "active" to "🟢 Active",
                                "draft" to "⏳ Drafts",
                                "sold" to "✅ Sold",
                                "archived" to "📁 Archived"
                            )
                            filters.forEach { (key, label) ->
                                val selected = state.statusFilter == key
                                Surface(
                                    onClick = { viewModel.setStatusFilter(key) },
                                    shape = RoundedCornerShape(20.dp),
                                    color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                    border = BorderStroke(
                                        1.dp,
                                        if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)
                                    ),
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 12.sp,
                                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                                    )
                                }
                            }
                        }

                        // Sort dropdown row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                text = "${filtered.size} Listings",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                            )

                            Box {
                                Surface(
                                    onClick = { expanded = true },
                                    shape = RoundedCornerShape(10.dp),
                                    color = MaterialTheme.colorScheme.surface,
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            text = when (state.sortBy) {
                                                "views" -> "Most Viewed"
                                                "likes" -> "Most Liked"
                                                "price" -> "Highest Price"
                                                "title" -> "Title A-Z"
                                                else -> "Latest First"
                                            },
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.primary,
                                        )
                                        Icon(Icons.Filled.ArrowDropDown, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                                    }
                                }
                                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                    listOf(
                                        "date" to "Latest First",
                                        "views" to "Most Viewed",
                                        "likes" to "Most Liked",
                                        "price" to "Highest Price",
                                        "title" to "Title A-Z"
                                    ).forEach { (key, label) ->
                                        DropdownMenuItem(
                                            text = { Text(label) },
                                            onClick = { viewModel.setSortBy(key); expanded = false },
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ── 4. Listings List / Empty State ──
                when {
                    state.loading -> {
                        item(key = "loading") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(200.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                CircularProgressIndicator()
                            }
                        }
                    }
                    filtered.isEmpty() -> {
                        item(key = "empty") {
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = MaterialTheme.colorScheme.surface,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 24.dp),
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Text("📦", fontSize = 40.sp)
                                    Text(
                                        text = "No listings found in ${state.statusFilter.replaceFirstChar { it.uppercase() }}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Text(
                                        text = "Post an ad in 30 seconds to start receiving direct buyer inquiries!",
                                        fontSize = 12.sp,
                                        textAlign = TextAlign.Center,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                    else -> {
                        items(filtered, key = { it.stableId }) { post ->
                            Box(modifier = Modifier.padding(horizontal = 16.dp)) {
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
    }

    // Delete confirmation dialog
    if (state.showDeleteDialog != null) {
        AlertDialog(
            onDismissRequest = { viewModel.showDeleteDialog(null) },
            title = { Text(stringResource(R.string.commerce_delete_post_title)) },
            text = { Text(stringResource(R.string.commerce_delete_confirm)) },
            confirmButton = {
                Button(
                    onClick = { state.showDeleteDialog?.let { viewModel.deletePost(it) } },
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
private fun KpiCard(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
        shadowElevation = 1.dp,
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(14.dp))
                Text(
                    text = label,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
            Text(
                text = value,
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
            )
        }
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
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(76.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                    )
                } else {
                    Box(
                        Modifier
                            .size(76.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Filled.Image, null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(28.dp))
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(post.displayTitle, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (post.price != null) Text("₹${post.price.toLong()}", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = Color(0xFF10B981))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        post.status?.let { s -> StatusChip(s) }
                        Text(
                            text = post.category ?: "General",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    // Metrics
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 2.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                            Spacer(Modifier.width(3.dp))
                            Text("${post.views ?: post.viewCount ?: 0} views", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Favorite, null, tint = Color(0xFFEF4444), modifier = Modifier.size(13.dp))
                            Spacer(Modifier.width(3.dp))
                            Text("${post.likes ?: 0}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                // Menu button
                Box {
                    IconButton(onClick = onMenu, modifier = Modifier.size(32.dp)) {
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
                            leadingIcon = { Icon(Icons.AutoMirrored.Filled.TrendingUp, null, tint = Color(0xFFF59E0B)) },
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