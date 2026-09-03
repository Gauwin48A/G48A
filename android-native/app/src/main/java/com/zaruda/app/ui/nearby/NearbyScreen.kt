package com.zaruda.app.ui.nearby

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
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

data class NearbyUiState(
    val loading: Boolean = true,
    val allPosts: List<Post> = emptyList(),
    val posts: List<Post> = emptyList(),
    val error: String? = null,
    val selectedCategory: String = "All",
    val selectedRadiusKm: Int = 25,
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
                    // Try fallback with different endpoint
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

    fun filterByCategory(category: String) {
        _state.value = _state.value.copy(selectedCategory = category)
        applyFilters()
    }
    
    fun filterByRadius(radiusKm: Int) {
        _state.value = _state.value.copy(selectedRadiusKm = radiusKm)
        applyFilters()
    }
    
    private fun applyFilters() {
        var filtered = _state.value.allPosts
        val category = _state.value.selectedCategory
        val radius = _state.value.selectedRadiusKm
        
        if (category != "All") {
            filtered = filtered.filter { it.category.equals(category, ignoreCase = true) }
        }
        
        if (radius > 0) {
            filtered = filtered.filter { post ->
                val dist = getDistanceKm(post)
                dist != null && dist <= radius
            }
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
    val categories = listOf("All", "Electronics", "Fashion", "Vehicles", "Others")

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Nearby", fontWeight = FontWeight.Bold)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Location header
            Surface(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        "📡 Hyperlocal Radar active • Showing verified listings near you",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }

            // Category chips
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(vertical = 4.dp),
            ) {
                items(categories) { cat ->
                    FilterChip(
                        selected = state.selectedCategory == cat,
                        onClick = { viewModel.filterByCategory(cat) },
                        label = { Text(cat, fontSize = 12.sp) },
                    )
                }
            }

            // Radius chips
            val radii = listOf(2 to "2 km", 5 to "5 km", 10 to "10 km", 25 to "25 km", 0 to "Whole City")
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 8.dp),
            ) {
                items(radii) { (radius, label) ->
                    FilterChip(
                        selected = state.selectedRadiusKm == radius,
                        onClick = { viewModel.filterByRadius(radius) },
                        label = { Text(label, fontSize = 12.sp) },
                    )
                }
            }

            when {
                state.loading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                state.error != null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Could not load nearby posts", color = MaterialTheme.colorScheme.error)
                            Spacer(Modifier.height(8.dp))
                            Button(onClick = { viewModel.load() }) { Text("Retry") }
                        }
                    }
                }
                state.posts.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        com.zaruda.app.ui.components.AppEmptyState(
                            icon = Icons.Default.LocationOn,
                            title = "No listings within ${state.selectedRadiusKm} km",
                            subtitle = "Try expanding your search radius to 25 km or Whole City",
                            actionLabel = "Expand Radius",
                            onAction = { viewModel.filterByRadius(0) }
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item {
                            Text("${state.posts.size} items nearby", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        items(state.posts, key = { it.stableId }) { post ->
                            NearbyPostCard(post = post, distanceKm = viewModel.getDistanceKm(post), onClick = { onOpenPost(post.stableId) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NearbyPostCard(post: Post, distanceKm: Double?, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            // Image
            Box(
                modifier = Modifier.size(80.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                } else {
                    Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                // Distance badge
                distanceKm?.let { dist ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.align(Alignment.BottomEnd).padding(4.dp),
                    ) {
                        Text(
                            if (dist < 1.0) "${(dist * 1000).toInt()}m" else "${"%.1f".format(dist)}km",
                            fontSize = 9.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
            }
            // Content
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                post.price?.let {
                    Text("\u20B9${"%,.0f".format(it)}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    post.location?.let {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                            Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                    post.viewCount?.let { v ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            Icon(Icons.Default.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(11.dp))
                            Text("$v", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}
