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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    AppDef("vehicles", "Vehicles", "Cars, bikes & spare parts", "🚗",
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
            Spacer(Modifier.height(8.dp))
            Text(
                "Select the app you want to open. Your choice becomes the active experience.",
                fontSize = 13.sp, color = Color(0xFF64748B),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp),
            )

            Spacer(Modifier.height(24.dp))

            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF6366F1))
                }
            } else {
                // App grid — 2 columns
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(bottom = 100.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(APPS, key = { it.key }) { app ->
                        val catCount = state.categories.count { cat ->
                            val group = (cat.categoryGroup ?: "others").lowercase()
                            group == app.key || (app.key == "others" && group !in listOf("electronics", "fashion", "vehicles"))
                        }
                        val stat = state.stats.find { it.key?.lowercase() == app.key }
                        val activeCount = stat?.activeCount ?: catCount
                        val newToday = stat?.newToday ?: 0
                        AppTile(app = app, listingsCount = activeCount, newToday = newToday) {
                            onSelectApp(app.key)
                        }
                    }
                }
            }
        }
    }
}

/* ── App tile composable ────────────────────────────────────────────────── */

@Composable
private fun AppTile(app: AppDef, listingsCount: Int, newToday: Int = 0, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp)
            .shadow(12.dp, RoundedCornerShape(24.dp))
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(app.gradient))
            .clickable { onClick() }
            .padding(16.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            // Top: emoji
            Text(app.emoji, fontSize = 36.sp)

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
                Text(
                    if (listingsCount > 0) "$listingsCount listings" else "—",
                    color = Color.White.copy(alpha = 0.6f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                )
                if (newToday > 0) {
                    Box(Modifier.clip(RoundedCornerShape(8.dp)).background(Color.White.copy(alpha = 0.2f)).padding(horizontal = 6.dp, vertical = 2.dp)) {
                        Text("+$newToday today", color = Color.White.copy(alpha = 0.85f), fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Box(
                    modifier = Modifier.size(28.dp).clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Color.White, modifier = Modifier.size(14.dp))
                }
            }
        }
    }
}
