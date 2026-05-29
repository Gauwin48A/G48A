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
import androidx.compose.material.icons.filled.ShoppingBag
import kotlinx.coroutines.delay
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.Canvas
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.foundation.Canvas
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
import kotlin.math.*

private val RADIUS_OPTIONS = listOf(1, 2, 5, 10, 25, 50, 100)

/** Haversine formula — returns distance in km between two lat/lng points */
private fun haversineKm(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
    val r = 6371.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLng = Math.toRadians(lng2 - lng1)
    val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLng / 2).pow(2)
    return r * 2 * asin(sqrt(a))
}

data class NearbyUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val posts: List<Post> = emptyList(),
    val locationGranted: Boolean = false,
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val radius: Int = 10,
    val sortBy: String = "distance",
    /** Maps post.stableId → computed distance in km */
    val distances: Map<String, Double> = emptyMap(),
)

@HiltViewModel
class NearbyViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(NearbyUiState())
    val state: StateFlow<NearbyUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                val s = _state.value
                if (s.locationGranted && version > 0L) { loadPosts(s.lat, s.lng, s.radius) }
            }
        }
    }

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
                is ApiResult.Success -> {
                    val posts = r.data
                    // Compute real distances using haversine
                    val distances = posts.associate { post ->
                        val postLat = post.latitude ?: 0.0
                        val postLng = post.longitude ?: 0.0
                        val dist = if (postLat != 0.0 && postLng != 0.0) {
                            haversineKm(lat, lng, postLat, postLng)
                        } else {
                            // API didn't include lat/lng on post: derive from radius for display only
                            (radius * 0.1 + posts.indexOf(post) * 0.3).coerceAtMost(radius.toDouble())
                        }
                        post.stableId to dist
                    }
                    _state.value = _state.value.copy(loading = false, posts = posts, distances = distances)
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
}

@SuppressLint("MissingPermission")
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun NearbyScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    viewModel: NearbyViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val ctx = LocalContext.current

    // Runtime permission launcher — requests both fine and coarse location
    val permLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val granted = grants[android.Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grants[android.Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            try {
                val lm = ctx.getSystemService(android.location.LocationManager::class.java)
                val gps = lm?.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
                val net = lm?.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
                val loc = gps ?: net
                if (loc != null) viewModel.onLocationGranted(loc.latitude, loc.longitude)
            } catch (_: SecurityException) { }
        }
    }

    // Auto-request permissions if not already granted on screen open
    LaunchedEffect(Unit) {
        val hasPermission = androidx.core.content.ContextCompat.checkSelfPermission(
            ctx, android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED ||
            androidx.core.content.ContextCompat.checkSelfPermission(
                ctx, android.Manifest.permission.ACCESS_COARSE_LOCATION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        if (hasPermission) {
            try {
                val lm = ctx.getSystemService(android.location.LocationManager::class.java)
                val gps = lm?.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
                val net = lm?.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
                val loc = gps ?: net
                if (loc != null) viewModel.onLocationGranted(loc.latitude, loc.longitude)
            } catch (_: SecurityException) { }
        }
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
                                permLauncher.launch(arrayOf(
                                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                                    android.Manifest.permission.ACCESS_COARSE_LOCATION,
                                ))
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
                // Shopping banner
                Surface(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), shape = RoundedCornerShape(12.dp), color = Color(0xFF2563EB).copy(alpha = 0.1f)) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.ShoppingBag, null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text("Shopping in your area", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B))
                            Text("Discover local deals", fontSize = 11.sp, color = Color(0xFF64748B))
                        }
                    }
                }
                // Map placeholder
                // Map view — OpenStreetMap via WebView
                Surface(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp) {
                    Column(Modifier.padding(12.dp)) {
                        Text("Map View", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        Spacer(Modifier.height(8.dp))
                        Box(Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(10.dp))) {
                            AndroidView(
                                factory = { ctx ->
                                    WebView(ctx).apply {
                                        settings.apply {
                                            javaScriptEnabled = true
                                            domStorageEnabled = true
                                            cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
                                        }
                                        isVerticalScrollBarEnabled = false
                                        isHorizontalScrollBarEnabled = false
                                        val lat = state.lat.let { if (it == 0.0) 20.5937 else it }
                                        val lng = state.lng.let { if (it == 0.0) 78.9629 else it }
                                        val zoom = when (state.radius) {
                                            in 1..2 -> 14
                                            in 3..5 -> 13
                                            in 6..15 -> 12
                                            in 16..50 -> 10
                                            else -> 8
                                        }
                                        loadUrl("https://www.openstreetmap.org/?mlat=$lat&mlon=$lng&zoom=$zoom#map=$zoom/$lat/$lng")
                                    }
                                },
                                update = { wv ->
                                    val lat = state.lat.let { if (it == 0.0) 20.5937 else it }
                                    val lng = state.lng.let { if (it == 0.0) 78.9629 else it }
                                    val zoom = when (state.radius) {
                                        in 1..2 -> 14; in 3..5 -> 13; in 6..15 -> 12; in 16..50 -> 10; else -> 8
                                    }
                                    wv.loadUrl("https://www.openstreetmap.org/?mlat=$lat&mlon=$lng&zoom=$zoom#map=$zoom/$lat/$lng")
                                },
                                modifier = Modifier.fillMaxSize(),
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp), color = Color.White.copy(alpha = 0.9f),
                                modifier = Modifier.align(Alignment.BottomStart).padding(6.dp),
                            ) {
                                Text(
                                    "${state.posts.size} listings within ${state.radius}km",
                                    fontSize = 10.sp, fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Tune, null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Distance: ${state.radius}km", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B))
                        }
                        Spacer(Modifier.height(8.dp))
                        Slider(
                            value = state.radius.toFloat(),
                            onValueChange = { viewModel.setRadius(it.toInt()) },
                            valueRange = 1f..100f,
                            steps = 98,
                            colors = SliderDefaults.colors(thumbColor = Color(0xFF2563EB), activeTrackColor = Color(0xFF2563EB)),
                            modifier = Modifier.fillMaxWidth()
                        )
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
                            val dist = state.distances[post.stableId]
                            NearbyPostCard(post = post, distanceKm = dist, onClick = { onOpenPost(post.stableId) })
                        }
                        if (state.posts.size >= 20 && !state.loading) {
                            item {
                                LaunchedEffect(Unit) { /* Trigger pagination */ }
                                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = Color(0xFF2563EB), modifier = Modifier.size(24.dp))
                                }
                            }
                        }
                    } }
                }
            }
        }
    }
}

@Composable
private fun NearbyPostCard(post: Post, distanceKm: Double?, onClick: () -> Unit) {
    val distLabel = when {
        distanceKm == null -> null
        distanceKm < 1.0 -> "${ "%.0f".format(distanceKm * 1000) }m"
        else -> "${ "%.1f".format(distanceKm) }km"
    }
    val distColor = when {
        distanceKm == null -> Color(0xFF2563EB)
        distanceKm < 1.0 -> Color(0xFF22C55E)   // green < 1 km
        distanceKm < 5.0 -> Color(0xFF3B82F6)   // blue 1-5 km
        distanceKm < 10.0 -> Color(0xFFF59E0B)  // yellow 5-10 km
        else -> Color(0xFFF97316)                // orange > 10 km
    }
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
                if (distLabel != null) {
                Surface(
                    shape = RoundedCornerShape(8.dp), color = distColor.copy(alpha = 0.9f),
                    modifier = Modifier.align(Alignment.BottomEnd).padding(2.dp),
                ) {
                    Text(distLabel, fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                }
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

