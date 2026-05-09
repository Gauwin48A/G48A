package com.mhub.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.CategoryStat
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.domain.model.Category
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/* ── App tile data (mirrors web CategoryHub.jsx APPS array) ─────────────── */

private data class AppDef(
    val key: String,
    val label: String,
    val tagline: String,
    val emoji: String,
    val gradient: List<Color>,
)

private val APPS = listOf(
    AppDef("electronics", "Electronics", "Phones, laptops & gadgets", "📱",
        listOf(Color(0xFF3B82F6), Color(0xFF4F46E5), Color(0xFF7C3AED))),
    AppDef("fashion", "Fashion", "Clothing, shoes & accessories", "👗",
        listOf(Color(0xFFEC4899), Color(0xFFF43F5E), Color(0xFFEF4444))),
    AppDef("grocery", "Grocery", "Fresh food, staples & more", "🛒",
        listOf(Color(0xFF10B981), Color(0xFF14B8A6), Color(0xFF0891B2))),
    AppDef("furniture", "Furniture", "Home, office & décor", "🪑",
        listOf(Color(0xFFA855F7), Color(0xFF7C3AED), Color(0xFF4F46E5))),
)

/* ── ViewModel ──────────────────────────────────────────────────────────── */

data class CategoryHubState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val categories: List<Category> = emptyList(),
    val stats: List<CategoryStat> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class CategoryHubViewModel @Inject constructor(
    private val categoriesRepository: CategoriesRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CategoryHubState())
    val state: StateFlow<CategoryHubState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = CategoryHubState(loading = true)
        viewModelScope.launch {
            when (val result = categoriesRepository.all()) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, categories = result.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = result.error.message)
            }
            // Also fetch category stats (non-blocking)
            when (val r = categoriesRepository.stats()) {
                is ApiResult.Success -> _state.value = _state.value.copy(stats = r.data)
                is ApiResult.Failure -> {} // non-critical
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            when (val result = categoriesRepository.all()) {
                is ApiResult.Success -> _state.value = _state.value.copy(refreshing = false, categories = result.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(refreshing = false, error = result.error.message)
            }
            when (val r = categoriesRepository.stats()) {
                is ApiResult.Success -> _state.value = _state.value.copy(stats = r.data)
                is ApiResult.Failure -> {}
            }
        }
    }
}

/* ── Screen ─────────────────────────────────────────────────────────────── */

@Composable
fun CategoryHubScreen(
    onOpenCategory: (Category) -> Unit = {},
    onOpenAllPosts: () -> Unit,
    onOpenSearch: () -> Unit,
    onSelectApp: (String) -> Unit = { _ -> onOpenAllPosts() },
    onOpenNotifications: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    viewModel: CategoryHubViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    val filteredApps = remember(searchQuery) {
        if (searchQuery.isBlank()) APPS
        else APPS.filter { it.label.contains(searchQuery, true) || it.tagline.contains(searchQuery, true) }
    }
    val totalListings = state.stats.sumOf { it.activeCount ?: 0 }.takeIf { it > 0 }
        ?: (state.categories.size * 5)
    val newToday = state.stats.sumOf { it.newToday ?: 0 }

    val pageGradient = Brush.verticalGradient(listOf(Color(0xFFF8FAFC), Color(0xFFF1F5F9), Color(0xFFEEF2FF)))
    val titleGradient = Brush.horizontalGradient(listOf(Color(0xFF6366F1), Color(0xFFA855F7), Color(0xFFEC4899)))

    @OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = { viewModel.refresh() },
        modifier = Modifier.fillMaxSize().background(pageGradient),
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Top action row (notifications + settings)
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                IconButton(onClick = onOpenNotifications) {
                    Icon(Icons.Default.Notifications, "Notifications", tint = Color(0xFF64748B))
                }
                IconButton(onClick = onOpenSettings) {
                    Icon(Icons.Default.Settings, "Settings", tint = Color(0xFF64748B))
                }
            }

            Spacer(Modifier.height(8.dp))

            // Title
            Text(
                text = buildAnnotatedString {
                    append("Choose Your ")
                    withStyle(SpanStyle(brush = titleGradient)) { append("World") }
                },
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = Color(0xFF0F172A),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "Select the app you want to open. Your choice becomes the active experience.",
                fontSize = 13.sp, color = Color(0xFF64748B),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp),
            )

            Spacer(Modifier.height(12.dp))

            // Live stats row
            if (!state.loading) {
                HubStatsRow(
                    totalListings = totalListings,
                    newToday = newToday,
                    categoryCount = state.categories.size,
                )
                Spacer(Modifier.height(10.dp))
            }

            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search apps…", fontSize = 13.sp, color = Color(0xFF94A3B8)) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp)) },
                trailingIcon = {
                    if (searchQuery.isNotBlank()) IconButton(onClick = { searchQuery = "" }) {
                        Icon(Icons.Default.Close, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF6366F1),
                    unfocusedBorderColor = Color(0xFFE2E8F0),
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White.copy(alpha = 0.85f),
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(12.dp))

            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF6366F1))
                }
            } else if (filteredApps.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🔍", fontSize = 48.sp)
                        Spacer(Modifier.height(8.dp))
                        Text("No apps match \"$searchQuery\"", fontSize = 14.sp, color = Color(0xFF64748B))
                    }
                }
            } else {
                // App grid — 2 columns
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(bottom = 100.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    itemsIndexed(filteredApps, key = { _, app -> app.key }) { index, app ->
                        val catCount = state.categories.count { cat ->
                            val group = (cat.categoryGroup ?: "furniture").lowercase()
                            group == app.key || (app.key == "furniture" && group !in listOf("electronics", "fashion", "grocery"))
                        }
                        val stat = state.stats.find { it.key?.lowercase() == app.key }
                        val activeCount = stat?.activeCount ?: catCount
                        val newTodayApp = stat?.newToday ?: 0
                        AppTile(app = app, listingsCount = activeCount, newToday = newTodayApp, index = index) {
                            onSelectApp(app.key)
                        }
                    }
                }
            }
        }
    }
}

/* ── Stat formatting (1.2k, 3.5M) ─────────────────────────────────────── */

private fun formatCompact(n: Int): String = when {
    n >= 1_000_000 -> "${"%.1f".format(n / 1_000_000.0)}M"
    n >= 1_000 -> "${"%.1f".format(n / 1_000.0)}k"
    else -> "$n+"
}

/* ── Hub Stats Row ─────────────────────────────────────────────────────── */

@Composable
private fun HubStatsRow(totalListings: Int, newToday: Int, categoryCount: Int) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White.copy(alpha = 0.75f),
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            HubStat("🏪", if (totalListings > 0) formatCompact(totalListings) else "—", "Listings")
            Box(Modifier.width(1.dp).height(32.dp).background(Color(0xFFE2E8F0)))
            HubStat("🔥", if (newToday > 0) "+$newToday" else "0", "New Today")
            Box(Modifier.width(1.dp).height(32.dp).background(Color(0xFFE2E8F0)))
            HubStat("📦", "$categoryCount", "Categories")
        }
    }
}

@Composable
private fun HubStat(emoji: String, value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(emoji, fontSize = 14.sp)
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0F172A))
        }
        Text(label, fontSize = 10.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Medium)
    }
}

/* ── App tile composable ────────────────────────────────────────────────── */

@Composable
private fun AppTile(app: AppDef, listingsCount: Int, newToday: Int = 0, index: Int = 0, onClick: () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { delay(index * 120L); visible = true }
    val tileAlpha by animateFloatAsState(if (visible) 1f else 0f, tween(350), label = "tileAlpha")

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(168.dp)
            .alpha(tileAlpha)
            .shadow(14.dp, RoundedCornerShape(24.dp))
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(app.gradient))
            .clickable { onClick() }
            .padding(16.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            // Top: emoji + LIVE badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(app.emoji, fontSize = 36.sp)
                if (listingsCount > 0) AppLiveBadge()
            }

            // Middle: label + tagline
            Column {
                Text(app.label, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                Text(app.tagline, color = Color.White.copy(alpha = 0.75f), fontSize = 11.sp)
            }

            // Bottom: stats + enter
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        if (listingsCount > 0) "$listingsCount listings" else "—",
                        color = Color.White.copy(alpha = 0.6f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                    )
                    if (newToday > 0) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                        ) {
                            AppPulsingDot()
                            Text("+$newToday today", color = Color.White.copy(alpha = 0.85f), fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Box(
                    modifier = Modifier.size(28.dp).clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.25f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Color.White, modifier = Modifier.size(14.dp))
                }
            }
        }
    }
}

@Composable
private fun AppLiveBadge() {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF22C55E).copy(alpha = 0.28f),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            AppPulsingDot()
            Text("LIVE", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
        }
    }
}

@Composable
private fun AppPulsingDot() {
    val transition = rememberInfiniteTransition(label = "pulseDot")
    val dotAlpha by transition.animateFloat(
        initialValue = 0.35f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(750), RepeatMode.Reverse),
        label = "dotAlpha",
    )
    Box(Modifier.size(6.dp).alpha(dotAlpha).background(Color(0xFF4ADE80), CircleShape))
}
