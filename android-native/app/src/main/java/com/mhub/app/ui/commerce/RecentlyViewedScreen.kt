package com.mhub.app.ui.commerce

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
import com.mhub.app.R
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.common.LinkColor
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

@HiltViewModel
class RecentlyViewedViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(RecentlyViewedUiState())
    val state: StateFlow<RecentlyViewedUiState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L

    init {
        load()
        viewModelScope.launch {
            repo.recentlyViewedFlow.collect { posts ->
                _state.value = _state.value.copy(posts = posts, loading = false)
            }
        }
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load() }
                lastLocaleVersion = version
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            repo.recentlyViewed()
        }
    }

    fun clearAll() {
        _state.value = _state.value.copy(posts = emptyList())
        viewModelScope.launch { repo.clearRecentlyViewed() }
    }

    fun removePost(id: String) {
        viewModelScope.launch { repo.deleteRecentlyViewed(id) }
    }
}

private fun timeSinceLabel(isoDate: String?): String {
    if (isoDate == null) return ""
    return try {
        val instant = Instant.parse(if (isoDate.endsWith("Z")) isoDate else "${isoDate}Z")
        val now = Instant.now()
        val minutesAgo = ChronoUnit.MINUTES.between(instant, now)
        when {
            minutesAgo < 1 -> "just now"
            minutesAgo < 60 -> "${minutesAgo}m ago"
            minutesAgo < 1440 -> "${minutesAgo / 60}h ago"
            minutesAgo < 10080 -> "${minutesAgo / 1440}d ago"
            else -> DateTimeFormatter.ofPattern("d MMM").format(instant.atZone(ZoneId.systemDefault()))
        }
    } catch (_: Exception) { isoDate.take(10) }
}

private fun dayGroup(isoDate: String?): String {
    if (isoDate == null) return "Earlier"
    return try {
        val date = Instant.parse(if (isoDate.endsWith("Z")) isoDate else "${isoDate}Z")
            .atZone(ZoneId.systemDefault()).toLocalDate()
        val today = LocalDate.now()
        when (ChronoUnit.DAYS.between(date, today)) {
            0L -> "Today"
            1L -> "Yesterday"
            else -> "Earlier"
        }
    } catch (_: Exception) { "Earlier" }
}

@OptIn(ExperimentalMaterial3Api::class)

@Composable
fun RecentlyViewedScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    onOpenFeed: (String) -> Unit = {},
    viewModel: RecentlyViewedViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var isGrid by remember { mutableStateOf(false) }
    var search by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("All") }
    var bulkSelect by remember { mutableStateOf(false) }
    var selectedIds by remember { mutableStateOf(setOf<String>()) }
    val statusOptions = listOf("All", "Posts", "Feed", "Available", "Sold", "Promoted")
    val displayed = remember(state.posts, search, statusFilter) {
        state.posts
            .filter { if (search.isBlank()) true else it.displayTitle.contains(search, true) || (it.location ?: "").contains(search, true) }
            .filter { post -> when (statusFilter) {
                "Posts" -> post.status != "feed"
                "Feed" -> post.status == "feed"
                "Available" -> post.status?.lowercase()?.let { it != "sold" } ?: true
                "Sold" -> post.status?.lowercase() == "sold"
                "Promoted" -> post.isPromoted == true
                else -> true
            } }
    }
    // Group by day
    val grouped = remember(displayed) {
        displayed.groupBy { dayGroup(it.createdAt) }
    }
    val groupOrder = listOf("Today", "Yesterday", "Earlier")

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
                    Text(stringResource(R.string.recently_viewed_title), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                    if (state.posts.isNotEmpty()) Text("${state.posts.size} items browsed", fontSize = 11.sp, color = Color(0xFF64748B))
                }
                if (state.posts.isNotEmpty()) TextButton(onClick = { viewModel.clearAll() }) { Text(stringResource(R.string.btn_clear_all), color = Color(0xFFEF4444), fontSize = 13.sp) }
                IconButton(onClick = { bulkSelect = !bulkSelect; if (!bulkSelect) selectedIds = emptySet() }, modifier = Modifier.size(36.dp)) {
                    Icon(if (bulkSelect) Icons.Filled.CheckBox else Icons.Filled.CheckBoxOutlineBlank, null, tint = if (bulkSelect) Color(0xFF2563EB) else Color(0xFF64748B))
                }
                IconButton(onClick = { isGrid = !isGrid }, modifier = Modifier.size(36.dp)) {
                    Icon(if (isGrid) Icons.AutoMirrored.Filled.ViewList else Icons.Filled.GridView, null, tint = Color(0xFF64748B))
                }
            }

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                else -> {
                    OutlinedTextField(
                        value = search, onValueChange = { search = it },
                        placeholder = { Text(stringResource(R.string.commerce_search_recently)) },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                        trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8)) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    )
                    // Status filter chips (web-parity: RecentlyViewed.jsx filterTabs)
                    androidx.compose.foundation.lazy.LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(statusOptions) { opt ->
                            FilterChip(
                                selected = statusFilter == opt,
                                onClick = { statusFilter = opt },
                                label = { Text(opt, fontSize = 12.sp) },
                            )
                        }
                    }
                    // Bulk-select toolbar
                    if (bulkSelect && selectedIds.isNotEmpty()) {
                        Surface(color = Color(0xFFFEE2E2)) {
                            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("${selectedIds.size} selected", fontWeight = FontWeight.SemiBold, color = Color(0xFFDC2626), modifier = Modifier.weight(1f))
                                TextButton(onClick = { selectedIds.forEach { viewModel.removePost(it) }; selectedIds = emptySet(); bulkSelect = false }) {
                                    Text(stringResource(R.string.btn_delete_selected), color = Color(0xFFDC2626))
                                }
                                TextButton(onClick = { selectedIds = emptySet(); bulkSelect = false }) { Text(stringResource(R.string.btn_cancel)) }
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    if (displayed.isEmpty()) EmptyState(
                        icon = { Icon(Icons.Filled.History, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                        title = if (search.isNotBlank()) "No results for \"$search\"" else "No recently viewed items",
                        subtitle = "Items you browse will appear here",
                    )
                    else if (isGrid) LazyVerticalGrid(
                        columns = GridCells.Fixed(2), contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(displayed, key = { it.stableId }) { post ->
                            val swipeState = rememberSwipeToDismissBoxState(
                                confirmValueChange = { value -> if (value == SwipeToDismissBoxValue.EndToStart) { viewModel.removePost(post.stableId); true } else false }
                            )
                            SwipeToDismissBox(
                                state = swipeState,
                                backgroundContent = {
                                    Box(Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)).background(Color(0xFFEF4444)), contentAlignment = Alignment.CenterEnd) {
                                        Icon(Icons.Filled.Delete, null, tint = Color.White, modifier = Modifier.padding(end = 16.dp))
                                    }
                                },
                                modifier = Modifier.clip(RoundedCornerShape(14.dp)),
                            ) {
                                Surface(modifier = Modifier.clickable {
                                    if (post.status == "feed") onOpenFeed(post.stableId) else onOpenPost(post.stableId)
                                }, shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp) {
                                    Column {
                                        Box(Modifier.fillMaxWidth().height(110.dp)) {
                                            if (post.primaryImage != null) AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)))
                                            else Box(Modifier.fillMaxSize().background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1)) }
                                        }
                                        Column(Modifier.padding(8.dp)) {
                                            Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF1E293B), maxLines = 2)
                                            if (post.price != null) Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF2563EB))
                                            val timeLabel = timeSinceLabel(post.createdAt)
                                            if (timeLabel.isNotEmpty()) Text(timeLabel, fontSize = 10.sp, color = Color(0xFF94A3B8))
                                        }
                                    }
                                }
                            }
                        }
                    }
                    else LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                        groupOrder.forEach { group ->
                            val groupPosts = grouped[group] ?: return@forEach
                            if (groupPosts.isEmpty()) return@forEach
                            item {
                                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(group, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF6366F1))
                                    Spacer(Modifier.width(6.dp))
                                    Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFEEF2FF)) {
                                        Text("${groupPosts.size}", fontSize = 11.sp, color = Color(0xFF6366F1), fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp))
                                    }
                                }
                            }
                            items(groupPosts, key = { it.stableId }) { post ->
                                val swipeState = rememberSwipeToDismissBoxState(
                                    confirmValueChange = { value -> if (value == SwipeToDismissBoxValue.EndToStart) { viewModel.removePost(post.stableId); true } else false }
                                )
                                SwipeToDismissBox(
                                    state = swipeState,
                                    backgroundContent = {
                                        Box(Modifier.fillMaxSize().padding(horizontal = 16.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFFEF4444)), contentAlignment = Alignment.CenterEnd) {
                                            Icon(Icons.Filled.Delete, null, tint = Color.White, modifier = Modifier.padding(end = 16.dp))
                                        }
                                    },
                                ) {
                                    Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                                        RecentlyViewedListItem(post) {
                                            if (post.status == "feed") onOpenFeed(post.stableId) else onOpenPost(post.stableId)
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

@Composable
private fun RecentlyViewedListItem(post: Post, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp,
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            if (post.primaryImage != null) {
                AsyncImage(
                    model = post.primaryImage, contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)),
                )
            } else {
                Box(
                    Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(28.dp)) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 2)
                if (post.price != null) {
                    Spacer(Modifier.height(3.dp))
                    Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2563EB))
                }
                Spacer(Modifier.height(3.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(12.dp))
                            Text(loc, fontSize = 11.sp, color = Color(0xFF94A3B8), maxLines = 1)
                        }
                    }
                    val timeLabel = timeSinceLabel(post.createdAt)
                    if (timeLabel.isNotEmpty()) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF1F5F9)) {
                            Row(Modifier.padding(horizontal = 5.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                Icon(Icons.Filled.AccessTime, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(10.dp))
                                Text(timeLabel, fontSize = 10.sp, color = Color(0xFF94A3B8))
                            }
                        }
                    }
                }
                post.condition?.let { cond ->
                    Spacer(Modifier.height(2.dp))
                    StatusChip(cond)
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// SavedSearchesScreen
// ──────────────────────────────────────────────────────────────────────────────
data class SavedSearchesUiState(
    val loading: Boolean = true,
    val searches: List<SavedSearch> = emptyList(),
    val error: String? = null,
    val newKeyword: String = "",
    val newLocation: String = "",
    val newMinPrice: String = "",
    val newMaxPrice: String = "",
    val newCategory: String = "",
    val showCreateForm: Boolean = false,
    val creating: Boolean = false,
    val notificationsEnabled: Map<String, Boolean> = emptyMap(),
)