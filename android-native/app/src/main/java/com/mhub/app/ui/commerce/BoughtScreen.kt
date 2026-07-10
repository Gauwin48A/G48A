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
class BoughtPostsViewModel @Inject constructor(
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
            when (val r = repo.bought()) {
                is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)
                is ApiResult.Failure -> _state.value = PostListUiState(loading = false, posts = _state.value.posts)
            }
        }
    }
}


@Composable
fun BoughtPostsScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: BoughtPostsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    PostsListScreen(
        stringResource(R.string.bought_title),
        Icons.Filled.ShoppingBag,
        stringResource(R.string.bought_title),
        stringResource(R.string.bought_empty),
        state,
        onBack,
        onOpenPost,
        onRetry = viewModel::load,
    )
}

@Composable
private fun PostsListScreen(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    subtitle: String,
    emptyMsg: String,
    state: PostListUiState,
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
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
                        title = "Unable to load posts",
                        message = state.error ?: "Check your connection and try again.",
                        onRetry = onRetry,
                    )
                }
                else -> {
                    // Search bar
                    OutlinedTextField(
                        value = search, onValueChange = { search = it },
                        placeholder = { Text(stringResource(R.string.commerce_search_location)) },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
                        trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Filled.Close, null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant, focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                    )
                    // Sort chips
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp)
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("newest" to "Newest", "price_asc" to "Price ↑", "price_desc" to "Price ↓").forEach { (key, label) ->
                            FilterChip(selected = sortBy == key, onClick = { sortBy = key },
                                label = { Text(label, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary))
                        }
                    }
                    if (displayed.isEmpty()) EmptyState(
                        icon = { Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(64.dp)) },
                        title = if (search.isNotBlank()) "No results for \"$search\"" else emptyMsg, subtitle = subtitle,
                    )
                    else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            Text(
                                stringResource(R.string.commerce_items_count, displayed.size),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }
                        items(displayed, key = { it.stableId }) { post ->
                            PostListItem(post) { (post.id ?: post.postId)?.let(onOpenPost) }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// OffersScreen
// ──────────────────────────────────────────────────────────────────────────────
data class OffersUiState(
    val loading: Boolean = true,
    val received: List<Offer> = emptyList(),
    val sent: List<Offer> = emptyList(),
    val error: String? = null,
    val tab: String = "received",
    val statusFilter: String? = null,
    val search: String = "",
)
