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
class CompareViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    private val _state = MutableStateFlow(PostListUiState())
    val state: StateFlow<PostListUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true)
        when (val r = repo.compareList()) {
            is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)
            is ApiResult.Failure -> _state.value = PostListUiState(loading = false, error = r.error.message)
        }
    } }
    fun removePost(postId: String) {
        // Optimistic remove
        val prev = _state.value.posts
        _state.value = _state.value.copy(posts = prev.filter { it.stableId != postId })
        viewModelScope.launch {
            val result = repo.removeFromCompare(postId)
            if (result is ApiResult.Failure) {
                _state.value = _state.value.copy(posts = prev)
            }
        }
    }
    fun clearAll() {
        val prev = _state.value.posts
        _state.value = _state.value.copy(posts = emptyList())
        viewModelScope.launch {
            val result = repo.clearCompare()
            if (result is ApiResult.Failure) _state.value = _state.value.copy(posts = prev)
        }
    }
}


@Composable
fun CompareScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: CompareViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.compare_title), onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.posts.isEmpty() -> EmptyState(
                    icon = { Icon(Icons.Filled.Compare, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                    title = stringResource(R.string.compare_nothing), subtitle = stringResource(R.string.compare_add_hint),
                )
                else -> {
                    val posts = state.posts
                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                        // Clear All button
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.End) {
                            Surface(
                                onClick = { viewModel.clearAll() },
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFFEF2F2),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFCA5A5)),
                            ) {
                                Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Default.DeleteForever, null, tint = Color(0xFFDC2626), modifier = Modifier.size(14.dp))
                                    Text(stringResource(R.string.compare_clear_all), fontSize = 12.sp, color = Color(0xFFDC2626), fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                        // Product cards row (horizontal scroll) with X remove button
                        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            posts.forEach { post ->
                                Box(Modifier.width(200.dp)) {
                                    Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp) {
                                        Column(Modifier.padding(10.dp)) {
                                            if (post.primaryImage != null) {
                                                AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop,
                                                    modifier = Modifier.fillMaxWidth().height(120.dp).clip(RoundedCornerShape(10.dp)))
                                            } else {
                                                Box(Modifier.fillMaxWidth().height(120.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                                                    Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1))
                                                }
                                            }
                                            Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B), maxLines = 2)
                                            if (post.price != null) Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF2563EB))
                                        }
                                    }
                                    // Remove X button
                                    Surface(
                                        onClick = { viewModel.removePost(post.stableId) },
                                        shape = CircleShape,
                                        color = Color(0xFFDC2626),
                                        modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(22.dp),
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(14.dp))
                                        }
                                    }
                                }
                            }
                        }
                        // Dynamic comparison table
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                            Column(Modifier.padding(16.dp)) {
                                Text(stringResource(R.string.compare_comparison), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                                Spacer(Modifier.height(12.dp))
                                // Build dynamic specs: include any field that has a non-null value across all posts
                                val allSpecs = listOf(
                                    stringResource(R.string.compare_price) to { p: Post -> if (p.price != null) "₹${p.price.toLong()}" else "—" },
                                    stringResource(R.string.compare_condition) to { p: Post -> p.condition ?: "—" },
                                    stringResource(R.string.compare_brand) to { p: Post -> p.brand ?: "—" },
                                    stringResource(R.string.compare_model) to { p: Post -> p.model ?: "—" },
                                    stringResource(R.string.compare_location) to { p: Post -> p.location ?: "—" },
                                    stringResource(R.string.compare_color) to { p: Post -> p.color ?: "—" },
                                    stringResource(R.string.compare_size) to { p: Post -> p.size ?: "—" },
                                    stringResource(R.string.compare_year) to { p: Post -> p.year?.toString() ?: "—" },
                                    stringResource(R.string.compare_mileage) to { p: Post -> if (p.mileage != null) "${p.mileage} km" else "—" },
                                    stringResource(R.string.compare_ram_storage) to { p: Post -> p.ramStorage ?: "—" },
                                    stringResource(R.string.compare_category) to { p: Post -> p.categoryName ?: "—" },
                                    "Subcategory" to { p: Post -> p.subcategoryName ?: "—" },
                                    stringResource(R.string.compare_seller) to { p: Post -> p.userName ?: "—" },
                                    stringResource(R.string.compare_status) to { p: Post -> p.status ?: "—" },
                                    "Posted" to { p: Post -> p.createdAt?.take(10) ?: "—" },
                                )
                                val visibleSpecs = allSpecs.filter { (_, getter) -> posts.any { getter(it) != "—" } }
                                visibleSpecs.forEach { (label, getter) ->
                                    HorizontalDivider(color = Color(0xFFF1F5F9))
                                    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                                        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF64748B), modifier = Modifier.width(90.dp))
                                        posts.forEach { post ->
                                            Text(getter(post), fontSize = 12.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f), maxLines = 2, overflow = TextOverflow.Ellipsis)
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
// BuyerViewScreen — Full browse with search, brand, price filters
// ──────────────────────────────────────────────────────────────────────────────
data class BuyerViewUiState(
    val loading: Boolean = true,
    val posts: List<Post> = emptyList(),
    val error: String? = null,
    val search: String = "",
    val selectedBrand: String? = null,
    val priceRange: String? = null,
    val brands: List<Brand> = emptyList(),
)