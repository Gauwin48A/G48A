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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.mhub.app.R
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
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
    AppDef("electronics", "Electronics", "Phones, laptops & gadgets", "🏪",
        listOf(Color(0xFF3B82F6), Color(0xFF4F46E5), Color(0xFF7C3AED))),
    AppDef("fashion", "Fashion", "Clothing, shoes & accessories", "🏪",
        listOf(Color(0xFFEC4899), Color(0xFFF43F5E), Color(0xFFEF4444))),
    AppDef("vehicles", "Vehicles", "Cars, bikes & spare parts", "🏪",
        listOf(Color(0xFF10B981), Color(0xFF14B8A6), Color(0xFF0891B2))),
    AppDef("others", "Others", "Home, services, jobs & more", "✨",
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

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun CategoryHubScreen(
    onOpenCategory: (Category) -> Unit = {},
    onOpenAllPosts: () -> Unit = {},
    onOpenSearch: () -> Unit,
    onSelectApp: (String) -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    onOpenScanner: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    unreadNotifications: Int = 0,
    cartItemCount: Int = 0,
    viewModel: CategoryHubViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    val isDark = androidx.compose.foundation.isSystemInDarkTheme()
    val pageGradient = if (isDark) Brush.verticalGradient(listOf(Color(0xFF0F1422), Color(0xFF161D2D), Color(0xFF1A2236)))
        else Brush.verticalGradient(listOf(Color(0xFFF8FAFC), Color(0xFFF1F5F9), Color(0xFFEEF2FF)))
    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = { viewModel.refresh() },
        modifier = Modifier.fillMaxSize().background(pageGradient),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 8.dp,
                bottom = 100.dp,
            ),
        ) {

            // ── Header: welcome greeting ───────────────────────────────
            item(key = "header") {
                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Welcome to MHub 🌟",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A),
                    )
                    Text(
                        stringResource(R.string.hub_subtitle),
                        fontSize = 13.sp,
                        color = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B),
                    )
                    Spacer(Modifier.height(4.dp))
                }
            }

            // ── Error banner ───────────────────────────────────────────
            if (state.error != null && !state.loading) {
                item(key = "error") {
                    Surface(
                        color = Color(0xFFFEF2F2),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                    ) {
                        Text(
                            "⚠️ Offline — showing cached data",
                            color = Color(0xFFDC2626),
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        )
                    }
                }
            }

            // ── Loading state ──────────────────────────────────────────
            if (state.loading) {
                item(key = "loading") {
                    Box(Modifier.fillMaxWidth().height(340.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF6366F1))
                    }
                }
            } else {
                item(key = "section_spacer") {
                    Spacer(Modifier.height(16.dp))
                }

                // ── Row 1: Electronics + Fashion ───────────────────────
                item(key = "row1") {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        val s0 = state.stats.find { it.key?.lowercase() == "electronics" }
                        val s1 = state.stats.find { it.key?.lowercase() == "fashion" }
                        AppTile(
                            app = APPS[0],
                            listingsCount = s0?.activeCount ?: state.categories.count { (it.categoryGroup ?: "").lowercase() == "electronics" },
                            newToday = s0?.newToday ?: 0,
                            index = 0,
                            modifier = Modifier.weight(1f),
                            onClick = { onSelectApp(APPS[0].key) },
                        )
                        AppTile(
                            app = APPS[1],
                            listingsCount = s1?.activeCount ?: state.categories.count { (it.categoryGroup ?: "").lowercase() == "fashion" },
                            newToday = s1?.newToday ?: 0,
                            index = 1,
                            modifier = Modifier.weight(1f),
                            onClick = { onSelectApp(APPS[1].key) },
                        )
                    }
                }
                // ── Row 2: Vehicles + Others ───────────────────────────
                item(key = "row2") {
                    Spacer(Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        val s2 = state.stats.find { it.key?.lowercase() == "vehicles" }
                        val s3 = state.stats.find { it.key?.lowercase() == "others" }
                        AppTile(
                            app = APPS[2],
                            listingsCount = s2?.activeCount ?: state.categories.count { (it.categoryGroup ?: "").lowercase() == "vehicles" },
                            newToday = s2?.newToday ?: 0,
                            index = 2,
                            modifier = Modifier.weight(1f),
                            onClick = { onSelectApp(APPS[2].key) },
                        )
                        AppTile(
                            app = APPS[3],
                            listingsCount = s3?.activeCount ?: state.categories.count {
                                (it.categoryGroup ?: "").lowercase() !in listOf("electronics", "fashion", "vehicles")
                            },
                            newToday = s3?.newToday ?: 0,
                            index = 3,
                            modifier = Modifier.weight(1f),
                            onClick = { onSelectApp(APPS[3].key) },
                        )
                    }
                }

                item(key = "bottom_spacer") {
                    Spacer(Modifier.height(32.dp))
                }
            }
        }
    }
}

/* ── App tile composable ────────────────────────────────────────────────── */

@Composable
private fun AppTile(app: AppDef, listingsCount: Int, newToday: Int = 0, index: Int = 0, modifier: Modifier = Modifier, onClick: () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { delay(index * 120L); visible = true }
    val tileAlpha by animateFloatAsState(if (visible) 1f else 0f, tween(350), label = "tileAlpha")

    Box(
        modifier = modifier
            .height(200.dp)
            .alpha(tileAlpha)
            .shadow(14.dp, RoundedCornerShape(24.dp))
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(app.gradient))
            .clickable { onClick() }
            .semantics {
                role = Role.Button
                contentDescription = "Open ${app.label} app"
                stateDescription = "$listingsCount listings${if (newToday > 0) ", plus $newToday today" else ""}"
            }
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


