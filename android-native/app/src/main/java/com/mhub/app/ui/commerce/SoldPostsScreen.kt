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
class SoldPostsViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(PostListUiState())
    val state: StateFlow<PostListUiState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L

    init {
        load()
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load() }
                lastLocaleVersion = version
            }
        }
    }
    fun load() {
        viewModelScope.launch {
            _state.value = PostListUiState(loading = true)
            when (val r = repo.sold()) {
                is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)
                is ApiResult.Failure -> _state.value = PostListUiState(loading = false, error = r.error.message)
            }
        }
    }
}


@Composable
fun SoldPostsScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: SoldPostsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    SoldPostsListScreen(state, onBack, onOpenPost, onRetry = viewModel::load)
}

@Composable
private fun SoldPostsListScreen(
    state: PostListUiState,
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    onRetry: () -> Unit,
) {
    var search by remember { mutableStateOf("") }
    var sortBy by remember { mutableStateOf("newest") }
    val displayed = remember(state.posts, search, sortBy) {
        var list = state.posts
        if (search.isNotBlank()) list = list.filter { it.displayTitle.contains(search, true) || (it.location ?: "").contains(search, true) }
        when (sortBy) {
            "price_asc" -> list = list.sortedBy { it.price ?: 0.0 }
            "price_desc" -> list = list.sortedByDescending { it.price ?: 0.0 }
            "views" -> list = list.sortedByDescending { it.viewCount ?: 0 }
            "likes" -> list = list.sortedByDescending { it.likeCount ?: 0 }
            else -> list = list.sortedByDescending { it.createdAt ?: "" }
        }
        list
    }
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            when {
                state.loading && state.posts.isEmpty() -> com.mhub.app.ui.components.ListShimmer(count = 5, modifier = Modifier.padding(16.dp))
                state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = "Unable to load sold posts",
                        message = state.error ?: "Check your connection and try again.",
                        onRetry = onRetry,
                    )
                }
                else -> {
                    OutlinedTextField(
                        value = search, onValueChange = { search = it },
                        placeholder = { Text(stringResource(R.string.commerce_search_sales)) },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                        trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8)) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                    )
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp)
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("newest" to stringResource(R.string.commerce_sort_newest), "price_desc" to stringResource(R.string.commerce_sort_price_down), "views" to stringResource(R.string.commerce_sort_views), "likes" to stringResource(R.string.commerce_sort_likes)).forEach { (key, label) ->
                            FilterChip(selected = sortBy == key, onClick = { sortBy = key },
                                label = { Text(label, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                        }
                    }
                    if (displayed.isEmpty()) EmptyState(icon = { Icon(Icons.Filled.Inventory, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) }, title = stringResource(R.string.sold_empty), subtitle = stringResource(R.string.sold_empty_subtitle))
                    else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            Text(
                                stringResource(R.string.commerce_sales_count, displayed.size),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }
                        items(displayed, key = { it.stableId }) { post ->
                            PostListItemSold(post) { (post.id ?: post.postId)?.let(onOpenPost) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PostListItemSold(post: Post, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(
                    model = post.primaryImage,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant)
                )
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(post.displayTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("₹${post.price?.toLong() ?: 0}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                }
                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7)) {
                    Text("SOLD", fontSize = 9.sp, fontWeight = FontWeight.Black, color = Color(0xFF16A34A), modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.Visibility, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${post.viewCount ?: 0}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.Favorite, null, modifier = Modifier.size(14.dp), tint = Color(0xFFEF4444))
                    Text("${post.likeCount ?: 0}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.weight(1f))
                Text(post.createdAt?.take(10) ?: "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}