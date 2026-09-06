package com.zaruda.app.ui.nearby

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.LocationSetupManager
import com.zaruda.app.domain.model.Post
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NearbyCategory(
    val key: String,
    val label: String,
    val icon: String,
)

val NEARBY_CATEGORIES = listOf(
    NearbyCategory("All", "All", "🌟"),
    NearbyCategory("Electronics", "Electronics", "📱"),
    NearbyCategory("Vehicles", "Vehicles", "🚗"),
    NearbyCategory("Fashion", "Fashion", "👗"),
    NearbyCategory("Properties", "Properties", "🏠"),
    NearbyCategory("Furniture", "Furniture", "🛋️"),
    NearbyCategory("Jobs", "Jobs", "💼"),
    NearbyCategory("Services", "Services", "🛠️"),
    NearbyCategory("Others", "Others", "📦"),
)

data class NearbyUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val allPosts: List<Post> = emptyList(),
    val posts: List<Post> = emptyList(),
    val error: String? = null,
    val selectedCategory: String = "All",
    val selectedRadiusKm: Int = 25,
    val searchQuery: String = "",
    val isGridView: Boolean = true,
    val sortBy: String = "distance", // distance, price_asc, price_desc, popular
)

@HiltViewModel
class NearbyViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    val locationManager: LocationSetupManager,
) : ViewModel() {

    private val _state = MutableStateFlow(NearbyUiState())
    val state: StateFlow<NearbyUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = postsRepo.feed(page = 1)) {
                is ApiResult.Success -> {
                    val allPosts = r.data
                    val sorted = sortPostsByDistance(allPosts)
                    _state.value = _state.value.copy(loading = false, allPosts = sorted)
                    applyFilters()
                }
                is ApiResult.Failure -> {
                    when (val r2 = postsRepo.mine()) {
                        is ApiResult.Success -> {
                            val sorted = sortPostsByDistance(r2.data)
                            _state.value = _state.value.copy(loading = false, allPosts = sorted)
                            applyFilters()
                        }
                        is ApiResult.Failure -> _state.value = _state.value.copy(
                            loading = false,
                            error = r.error.message ?: "Could not load nearby posts"
                        )
                    }
                }
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            when (val r = postsRepo.feed(page = 1)) {
                is ApiResult.Success -> {
                    val allPosts = r.data
                    val sorted = sortPostsByDistance(allPosts)
                    _state.value = _state.value.copy(refreshing = false, allPosts = sorted)
                    applyFilters()
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(refreshing = false)
            }
        }
    }

    fun filterByCategory(category: String) {
        _state.value = _state.value.copy(selectedCategory = category)
        applyFilters()
    }

    fun filterByRadius(radiusKm: Int) {
        _state.value = _state.value.copy(selectedRadiusKm = radiusKm)
        applyFilters()
    }

    fun setSearchQuery(q: String) {
        _state.value = _state.value.copy(searchQuery = q)
        applyFilters()
    }

    fun toggleGridView() {
        _state.value = _state.value.copy(isGridView = !_state.value.isGridView)
    }

    fun setSortBy(sort: String) {
        _state.value = _state.value.copy(sortBy = sort)
        applyFilters()
    }

    private fun applyFilters() {
        var filtered = _state.value.allPosts
        val category = _state.value.selectedCategory
        val radius = _state.value.selectedRadiusKm
        val query = _state.value.searchQuery.trim().lowercase()

        if (category != "All") {
            filtered = filtered.filter { it.category.equals(category, ignoreCase = true) }
        }

        if (radius > 0) {
            filtered = filtered.filter { post ->
                val dist = getDistanceKm(post)
                dist == null || dist <= radius
            }
        }

        if (query.isNotBlank()) {
            filtered = filtered.filter { post ->
                post.displayTitle.lowercase().contains(query) ||
                        (post.description ?: "").lowercase().contains(query) ||
                        (post.location ?: "").lowercase().contains(query) ||
                        (post.category ?: "").lowercase().contains(query)
            }
        }

        filtered = when (_state.value.sortBy) {
            "price_asc" -> filtered.sortedBy { it.price ?: Double.MAX_VALUE }
            "price_desc" -> filtered.sortedByDescending { it.price ?: 0.0 }
            "popular" -> filtered.sortedByDescending { it.viewCount ?: 0 }
            else -> filtered // distance already sorted
        }

        _state.value = _state.value.copy(posts = filtered)
    }

    private fun sortPostsByDistance(posts: List<Post>): List<Post> {
        val myLat = locationManager.lastLat ?: return posts
        val myLng = locationManager.lastLng ?: return posts
        return posts.sortedBy { post ->
            val pLat = post.latitude
            val pLng = post.longitude
            if (pLat != null && pLng != null) {
                LocationSetupManager.distanceKm(myLat, myLng, pLat, pLng)
            } else {
                Double.MAX_VALUE
            }
        }
    }

    fun getDistanceKm(post: Post): Double? {
        val myLat = locationManager.lastLat ?: return null
        val myLng = locationManager.lastLng ?: return null
        val pLat = post.latitude ?: return null
        val pLng = post.longitude ?: return null
        return LocationSetupManager.distanceKm(myLat, myLng, pLat, pLng)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NearbyScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    viewModel: NearbyViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDark
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current

    val radii = listOf(2 to "2 km", 5 to "5 km", 10 to "10 km", 25 to "25 km", 0 to "Whole City")

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
            LazyVerticalGrid(
                columns = if (state.isGridView) GridCells.Fixed(2) else GridCells.Fixed(1),
                contentPadding = PaddingValues(bottom = 80.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                // ── 1. Hero Header with Tirumala 3A Backdrop (Home/Marketplace standard) ──
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(260.dp),
                    ) {
                        // 3A Scenic Tirumala Backdrop
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
                                            Color.Black.copy(alpha = 0.60f),
                                            MaterialTheme.colorScheme.background,
                                        )
                                    )
                                )
                        )

                        // Navigation and Title Header
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(WindowInsets.statusBars.asPaddingValues())
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                        ) {
                            // Top Bar Row: Back Button + Live Radar Chip
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
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFF10B981))
                                        )
                                        Text(
                                            "Radar Active • Tirupati",
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
                                        text = "Nearby",
                                        fontFamily = FontFamily.Serif,
                                        fontSize = 30.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                    )
                                    Text(
                                        text = "Marketplace",
                                        fontFamily = FontFamily.Cursive,
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.Normal,
                                        color = Color(0xFFF59E0B),
                                    )
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = "Direct deals & verified sellers right in your neighborhood",
                                    fontSize = 12.sp,
                                    color = Color.White.copy(alpha = 0.85f),
                                    fontWeight = FontWeight.Medium,
                                )
                            }

                            Spacer(Modifier.height(4.dp))
                        }
                    }
                }

                // ── 2. Search & Filter Bar ──
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        // Search Outlined Box
                        OutlinedTextField(
                            value = state.searchQuery,
                            onValueChange = viewModel::setSearchQuery,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            placeholder = { Text("Search nearby items, models, localities...", fontSize = 13.sp) },
                            leadingIcon = {
                                Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            },
                            trailingIcon = {
                                if (state.searchQuery.isNotBlank()) {
                                    IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                        Icon(Icons.Default.Close, contentDescription = "Clear", modifier = Modifier.size(18.dp))
                                    }
                                }
                            },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = MaterialTheme.colorScheme.surface,
                                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f),
                            ),
                        )
                    }
                }

                // ── 3. Category Chips (Marketplace Style) ──
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "CATEGORIES",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                            letterSpacing = 1.sp,
                            modifier = Modifier.padding(start = 16.dp, top = 6.dp, bottom = 4.dp),
                        )
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(NEARBY_CATEGORIES) { cat ->
                                val selected = state.selectedCategory == cat.key
                                Surface(
                                    onClick = {
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        viewModel.filterByCategory(cat.key)
                                    },
                                    shape = RoundedCornerShape(20.dp),
                                    color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                    border = BorderStroke(
                                        1.dp,
                                        if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                                    ),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    ) {
                                        Text(cat.icon, fontSize = 14.sp)
                                        Text(
                                            text = cat.label,
                                            fontSize = 12.sp,
                                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ── 4. Radius Chips ──
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "DISTANCE RADAR",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                            letterSpacing = 1.sp,
                            modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp),
                        )
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(radii) { (radius, label) ->
                                val selected = state.selectedRadiusKm == radius
                                Surface(
                                    onClick = {
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        viewModel.filterByRadius(radius)
                                    },
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (selected) Color(0xFF0284C7).copy(alpha = 0.18f) else MaterialTheme.colorScheme.surface,
                                    border = BorderStroke(
                                        1.dp,
                                        if (selected) Color(0xFF0284C7) else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)
                                    ),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        Icon(
                                            Icons.Default.NearMe,
                                            contentDescription = null,
                                            modifier = Modifier.size(13.dp),
                                            tint = if (selected) Color(0xFF0284C7) else MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Text(
                                            text = label,
                                            fontSize = 11.sp,
                                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                            color = if (selected) Color(0xFF0284C7) else MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ── 5. Results Counter & Grid/List Toggle ──
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Text(
                                text = "${state.posts.size} items nearby",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            if (state.selectedCategory != "All") {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                                ) {
                                    Text(
                                        text = state.selectedCategory,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    )
                                }
                            }
                        }

                        // Toggle Grid/List
                        IconButton(
                            onClick = { viewModel.toggleGridView() },
                            modifier = Modifier.size(32.dp),
                        ) {
                            Icon(
                                imageVector = if (state.isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                                contentDescription = "Toggle layout",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                }

                // ── 6. Listings Grid / Empty / Loading ──
                when {
                    state.loading -> {
                        item(span = { GridItemSpan(maxLineSpan) }) {
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
                    state.error != null -> {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text("Could not load nearby posts", color = MaterialTheme.colorScheme.error)
                                Spacer(Modifier.height(8.dp))
                                Button(onClick = { viewModel.load() }) { Text("Retry") }
                            }
                        }
                    }
                    state.posts.isEmpty() -> {
                        item(span = { GridItemSpan(maxLineSpan) }) {
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
                                    Text("📡", fontSize = 40.sp)
                                    Text(
                                        text = "No listings found within ${if (state.selectedRadiusKm == 0) "City" else "${state.selectedRadiusKm} km"}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Text(
                                        text = "Try expanding your radar distance or choosing All Categories",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Button(
                                        onClick = {
                                            viewModel.filterByRadius(0)
                                            viewModel.filterByCategory("All")
                                        },
                                        shape = RoundedCornerShape(12.dp),
                                    ) {
                                        Text("Expand to Whole City")
                                    }
                                }
                            }
                        }
                    }
                    else -> {
                        items(state.posts, key = { it.stableId }) { post ->
                            Box(modifier = Modifier.padding(horizontal = if (state.isGridView) 4.dp else 16.dp)) {
                                if (state.isGridView) {
                                    NearbyGridCard(
                                        post = post,
                                        distanceKm = viewModel.getDistanceKm(post),
                                        onClick = { onOpenPost(post.stableId) },
                                    )
                                } else {
                                    NearbyListCard(
                                        post = post,
                                        distanceKm = viewModel.getDistanceKm(post),
                                        onClick = { onOpenPost(post.stableId) },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── 10/10 Marketplace Grid Card ──
@Composable
private fun NearbyGridCard(
    post: Post,
    distanceKm: Double?,
    onClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Column {
            // Image with Overlays
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = post.displayTitle,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Storefront, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(36.dp))
                    }
                }

                // Distance Badge Overlay (Top Left)
                distanceKm?.let { dist ->
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color.Black.copy(alpha = 0.70f),
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(6.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                        ) {
                            Text("📍", fontSize = 9.sp)
                            Text(
                                text = if (dist < 1.0) "${(dist * 1000).toInt()}m" else "%.1f km".format(dist),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                            )
                        }
                    }
                }

                // Escrow Pill (Top Right)
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF10B981),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp),
                ) {
                    Text(
                        text = "🛡️ Escrow",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                    )
                }
            }

            // Info Content
            Column(
                modifier = Modifier.padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                // Category Pill
                Text(
                    text = post.category ?: "General",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                )

                // Title
                Text(
                    text = post.displayTitle,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface,
                )

                // Price
                Text(
                    text = if (post.price != null && post.price > 0) "₹%,.0f".format(post.price) else "₹ Free",
                    color = Color(0xFF10B981),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 15.sp,
                )

                // Location Subtitle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        text = post.location ?: post.city ?: "Tirupati",
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

// ── 10/10 Marketplace List Card ──
@Composable
private fun NearbyListCard(
    post: Post,
    distanceKm: Double?,
    onClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Thumbnail with Distance Badge
            Box(
                modifier = Modifier
                    .size(90.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = post.displayTitle,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Storefront, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                distanceKm?.let { dist ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color.Black.copy(alpha = 0.75f),
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(4.dp),
                    ) {
                        Text(
                            text = if (dist < 1.0) "${(dist * 1000).toInt()}m" else "%.1f km".format(dist),
                            fontSize = 9.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                        )
                    }
                }
            }

            // Details
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = post.category ?: "General",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                    ) {
                        Text(
                            text = "🛡️ Verified",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF10B981),
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                        )
                    }
                }

                Text(
                    text = post.displayTitle,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface,
                )

                Text(
                    text = if (post.price != null && post.price > 0) "₹%,.0f".format(post.price) else "₹ Free",
                    color = Color(0xFF10B981),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 16.sp,
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(11.dp),
                        )
                        Text(
                            text = post.location ?: post.city ?: "Tirupati",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                        )
                    }

                    post.viewCount?.let { v ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            Icon(
                                Icons.Default.Visibility,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(11.dp),
                            )
                            Text(
                                text = "$v",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

