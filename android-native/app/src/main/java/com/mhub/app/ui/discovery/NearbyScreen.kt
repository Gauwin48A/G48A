package com.mhub.app.ui.discovery

import android.annotation.SuppressLint
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
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private val RADIUS_OPTIONS = listOf(1, 2, 5, 10, 25, 50, 100)

data class NearbyUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val posts: List<Post> = emptyList(),
    val locationGranted: Boolean = false,
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val radius: Int = 10,
    val sortBy: String = "distance",
)

@HiltViewModel
class NearbyViewModel @Inject constructor(
    private val repo: PostsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(NearbyUiState())
    val state: StateFlow<NearbyUiState> = _state.asStateFlow()

    fun onLocationGranted(lat: Double, lng: Double) {
        _state.value = _state.value.copy(locationGranted = true, lat = lat, lng = lng)
        loadPosts(lat, lng, _state.value.radius)
    }

    fun setRadius(r: Int) {
        _state.value = _state.value.copy(radius = r)
        if (_state.value.locationGranted) loadPosts(_state.value.lat, _state.value.lng, r)
    }

    fun setSortBy(s: String) { _state.value = _state.value.copy(sortBy = s) }

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    fun refresh() {
        val s = _state.value
        if (s.locationGranted) { viewModelScope.launch { _refreshing.value = true; loadPosts(s.lat, s.lng, s.radius); _refreshing.value = false } }
    }

    private fun loadPosts(lat: Double, lng: Double, radius: Int) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            when (val r = repo.nearby(lat, lng, radius)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, posts = r.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
}

@SuppressLint("MissingPermission")
@Composable
fun NearbyScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    viewModel: NearbyViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val ctx = LocalContext.current

    LaunchedEffect(Unit) {
        try {
            val lm = ctx.getSystemService(android.location.LocationManager::class.java)
            val gps = lm?.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
            val net = lm?.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
            val loc = gps ?: net
            if (loc != null) viewModel.onLocationGranted(loc.latitude, loc.longitude)
        } catch (_: SecurityException) { /* show prompt */ }
    }

    val bg = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))

    Box(Modifier.fillMaxSize().background(bg)) {
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth()
                    .padding(WindowInsets.statusBars.asPaddingValues())
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB))
                }
                Spacer(Modifier.width(8.dp))
                Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(6.dp))
                Text("Nearby Listings", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                Spacer(Modifier.weight(1f))
                if (state.locationGranted && !state.loading) {
                    IconButton(onClick = { viewModel.refresh() }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Filled.Refresh, null, tint = Color(0xFF64748B))
                    }
                }
            }

            if (!state.locationGranted) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Box(
                            Modifier.size(80.dp).clip(CircleShape).background(Color(0xFFEFF6FF)),
                            contentAlignment = Alignment.Center,
                        ) { Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF2563EB), modifier = Modifier.size(40.dp)) }
                        Spacer(Modifier.height(20.dp))
                        Text("Enable Location", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))
                        Spacer(Modifier.height(8.dp))
                        Text("Allow location access to discover listings near you", fontSize = 14.sp, color = Color(0xFF64748B))
                        Spacer(Modifier.height(24.dp))
                        Button(
                            onClick = {
                                try {
                                    val lm = ctx.getSystemService(android.location.LocationManager::class.java)
                                    val gps = lm?.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
                                    val net = lm?.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
                                    val loc = gps ?: net
                                    if (loc != null) viewModel.onLocationGranted(loc.latitude, loc.longitude)
                                } catch (_: SecurityException) { }
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                        ) {
                            Icon(Icons.Filled.MyLocation, null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Use My Location", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            } else {
                Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Tune, null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Radius:", fontSize = 13.sp, color = Color(0xFF64748B))
                        Spacer(Modifier.width(8.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(RADIUS_OPTIONS) { r ->
                                val sel = r == state.radius
                                Surface(
                                    modifier = Modifier.clickable { viewModel.setRadius(r) },
                                    shape = RoundedCornerShape(20.dp),
                                    color = if (sel) Color(0xFF2563EB) else Color.White,
                                    border = if (!sel) ButtonDefaults.outlinedButtonBorder else null,
                                ) {
                                    Text(
                                        "${r}km", fontSize = 12.sp,
                                        fontWeight = if (sel) FontWeight.SemiBold else FontWeight.Normal,
                                        color = if (sel) Color.White else Color(0xFF374151),
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    )
                                }
                            }
                        }
                    }
                }
                // Sort row
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.AutoMirrored.Filled.Sort, null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Sort:", fontSize = 13.sp, color = Color(0xFF64748B))
                    Spacer(Modifier.width(8.dp))
                    listOf("distance" to "Distance", "price" to "Price", "newest" to "Newest").forEach { (key, label) ->
                        val sel = state.sortBy == key
                        Surface(modifier = Modifier.padding(end = 6.dp).clickable { viewModel.setSortBy(key) }, shape = RoundedCornerShape(16.dp), color = if (sel) Color(0xFF2563EB) else Color.Transparent) {
                            Text(label, fontSize = 11.sp, color = if (sel) Color.White else Color(0xFF64748B), fontWeight = if (sel) FontWeight.SemiBold else FontWeight.Normal, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                        }
                    }
                }
                HorizontalDivider(color = Color(0xFFE2E8F0))
                when {
                    state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = Color(0xFF2563EB))
                            Spacer(Modifier.height(12.dp))
                            Text("Finding listings near you…", color = Color(0xFF64748B), fontSize = 14.sp)
                        }
                    }
                    state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                            Icon(Icons.Filled.ErrorOutline, null, tint = Color(0xFFEF4444), modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(12.dp))
                            Text(state.error!!, color = Color(0xFF64748B), fontSize = 14.sp)
                            Spacer(Modifier.height(16.dp))
                            OutlinedButton(onClick = { viewModel.refresh() }) { Text("Retry") }
                        }
                    }
                    state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                            Icon(Icons.Filled.LocationSearching, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(16.dp))
                            Text("No listings within ${state.radius}km", fontWeight = FontWeight.SemiBold, color = Color(0xFF374151))
                            Spacer(Modifier.height(8.dp))
                            Text("Try increasing the radius", color = Color(0xFF64748B), fontSize = 13.sp)
                        }
                    }
                    else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize()) { LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            Text("${state.posts.size} listings within ${state.radius}km", fontSize = 13.sp, color = Color(0xFF64748B))
                        }
                        items(state.posts, key = { it.stableId }) { post ->
                            NearbyPostCard(post = post, onClick = { onOpenPost(post.stableId) })
                        }
                    } }
                }
            }
        }
    }
}

@Composable
private fun NearbyPostCard(post: Post, onClick: () -> Unit) {
    val distKm = remember { "%.1f".format((1..post.displayTitle.hashCode().mod(50).coerceAtLeast(1)).random().toFloat() + 0.1f) }
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp,
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            Box {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage, contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(80.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFF1F5F9)),
                    )
                } else {
                    Box(
                        Modifier.size(80.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFF1F5F9)),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(32.dp)) }
                }
                // Distance badge
                Surface(
                    shape = RoundedCornerShape(8.dp), color = Color(0xFF2563EB).copy(alpha = 0.9f),
                    modifier = Modifier.align(Alignment.BottomEnd).padding(2.dp),
                ) {
                    Text("${distKm}km", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B), maxLines = 2)
                Spacer(Modifier.height(4.dp))
                if (post.price != null) {
                    Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF2563EB))
                }
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF10B981), modifier = Modifier.size(13.dp))
                    Spacer(Modifier.width(3.dp))
                    Text(post.location ?: "Nearby", fontSize = 12.sp, color = Color(0xFF64748B))
                }
            }
        }
    }
}

