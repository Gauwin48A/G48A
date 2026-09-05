package com.zaruda.app.ui.categories

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.material.icons.filled.Shield
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.CategoriesRepository
import com.zaruda.app.domain.model.Category
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.theme.CategoryTints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CategoriesState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val items: List<Category> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class CategoriesViewModel @Inject constructor(
    private val repo: CategoriesRepository,
    private val localeManager: com.zaruda.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(CategoriesState())
    val state: StateFlow<CategoriesState> = _state.asStateFlow()
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
        _state.value = CategoriesState(loading = true)
        viewModelScope.launch {
            when (val result = repo.all()) {
                is ApiResult.Success -> _state.value = CategoriesState(loading = false, items = result.data)
                is ApiResult.Failure -> _state.value = CategoriesState(
                    loading = false,
                    error = result.error.message,
                )
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            when (val result = repo.all()) {
                is ApiResult.Success -> _state.value = _state.value.copy(refreshing = false, items = result.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(refreshing = false, error = result.error.message)
            }
        }
    }
}

private val GROUP_TABS = listOf("All", "Electronics", "Fashion", "Vehicles", "Others")
private val GROUP_EMOJIS = mapOf("All" to "🏪", "Electronics" to "💻", "Fashion" to "👗", "Vehicles" to "🚗", "Others" to "✨")

private fun categoryGroup(name: String, groupField: String?): String {
    val g = groupField?.lowercase() ?: ""
    if (g.isNotBlank()) {
        return when {
            g.contains("electron") || g.contains("tech") -> "Electronics"
            g.contains("fashion") || g.contains("cloth") -> "Fashion"
            g.contains("vehicle") || g.contains("car") || g.contains("bike") -> "Vehicles"
            else -> "Others"
        }
    }
    val n = name.lowercase()
    return when {
        n.contains("electron") || n.contains("tech") || n.contains("gadget") || n.contains("phone") -> "Electronics"
        n.contains("fashion") || n.contains("cloth") || n.contains("apparel") || n.contains("shoe") -> "Fashion"
        n.contains("vehicle") || n.contains("car") || n.contains("bike") || n.contains("motor") -> "Vehicles"
        else -> "Others"
    }
}

/* ── Categories Hero Backdrop (Full-Bleed Scenic Rapido Standard) ────────── */

@Composable
private fun CategoriesHeroBackdrop() {
    val context = LocalContext.current
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(290.dp),
    ) {
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data("https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1200&auto=format&fit=crop&q=85")
                .crossfade(true)
                .build(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )

        // Dark vignette scrim overlay for maximum text legibility
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.50f),
                            Color.Black.copy(alpha = 0.20f),
                            Color.Black.copy(alpha = 0.55f),
                            Color.Black.copy(alpha = 0.85f),
                        )
                    )
                )
        )

        // Hero Title + Escrow Trust Pill
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(top = 52.dp, start = 16.dp, end = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = "Explore",
                    fontFamily = FontFamily.Serif,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    letterSpacing = 0.5.sp,
                )
                Text(
                    text = "✦",
                    fontSize = 18.sp,
                    color = Color.White.copy(alpha = 0.95f),
                )
                Text(
                    text = "Categories",
                    fontFamily = FontFamily.Cursive,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
            }

            Spacer(Modifier.height(6.dp))

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color.White.copy(alpha = 0.25f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.6f)),
            ) {
                Text(
                    text = "VERIFIED LOCAL DEALS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.2.sp,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp),
                )
            }

            Spacer(Modifier.height(4.dp))

            Text(
                text = "Browse curated categories • Zero-Chat verified deals",
                color = Color.White.copy(alpha = 0.90f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/* ── Floating Glassmorphic Top Capsule (Rapido Standard Layer 3) ──────────── */

@Composable
private fun CategoriesFloatingTopBar(
    onBack: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        // Glassmorphic Back Button
        Surface(
            shape = CircleShape,
            color = Color.Black.copy(alpha = 0.40f),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
            modifier = Modifier.size(40.dp),
            onClick = onBack,
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp),
                )
            }
        }

        // Glassmorphic Title Pill
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.Black.copy(alpha = 0.40f),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text("🏷️", fontSize = 13.sp)
                Text(
                    text = "All Categories",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp,
                )
            }
        }

        // Spacer to balance the top bar layout
        Spacer(Modifier.size(40.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoriesScreen(
    onBack: () -> Unit,
    onCategoryClick: (String, String) -> Unit,
    viewModel: CategoriesViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedGroup by remember { mutableStateOf("All") }

    val allGrouped = remember(state.items) {
        state.items.groupBy { categoryGroup(it.displayName, it.categoryGroup) }
    }
    val filtered = remember(state.items, searchQuery, selectedGroup) {
        var list = state.items
        if (searchQuery.isNotBlank()) list = list.filter { it.displayName.contains(searchQuery, true) }
        if (selectedGroup != "All") list = list.filter { categoryGroup(it.displayName, it.categoryGroup) == selectedGroup }
        list.sortedByDescending { it.productCount }
    }
    val topPickIds = remember(state.items) {
        state.items.sortedByDescending { it.productCount }.take(3).map { it.stableId }.toSet()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // ── Layer 1: Contextual Hero Backdrop ──
        CategoriesHeroBackdrop()

        // ── Layer 2: Curved Sheet Scrolling Content ──
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize(),
        ) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    com.zaruda.app.ui.components.AppErrorState(
                        title = "Categories unavailable",
                        message = state.error ?: "Unable to load categories",
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry categories",
                    )
                }
                state.items.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    com.zaruda.app.ui.components.AppEmptyState(
                        icon = Icons.Outlined.Category,
                        title = "No categories",
                        subtitle = "Categories will appear here when available.",
                    )
                }
                else -> LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(bottom = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    // Spacer for Hero Backdrop
                    item(span = { GridItemSpan(2) }) {
                        Spacer(Modifier.height(200.dp))
                    }

                    // 32dp Curved Sheet Header
                    item(span = { GridItemSpan(2) }) {
                        Surface(
                            shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                            color = MaterialTheme.colorScheme.background,
                            shadowElevation = 8.dp,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 12.dp, bottom = 4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                // Tactile Drag Handle (Rapido Travel Standard)
                                Box(
                                    modifier = Modifier
                                        .width(40.dp)
                                        .height(4.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
                                )

                                Spacer(Modifier.height(12.dp))

                                // 100% Escrow Protection Guarantee Ribbon
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 2.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color(0xFF059669).copy(alpha = 0.08f),
                                    border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.Shield,
                                            contentDescription = null,
                                            tint = Color(0xFF059669),
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "Verified Local Categories",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp,
                                                color = Color(0xFF059669),
                                            )
                                            Text(
                                                text = "Verified Categories • Zero Chat Scams • Insured Deliveries",
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                    }
                                }

                                // Search Bar
                                OutlinedTextField(
                                    value = searchQuery,
                                    onValueChange = { searchQuery = it },
                                    placeholder = { Text("Search categories...", fontSize = 13.sp) },
                                    leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp)) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(16.dp),
                                    colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                                        focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                    ),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 8.dp),
                                )

                                // Group Tab Chips
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState())
                                        .padding(horizontal = 14.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    GROUP_TABS.forEach { group ->
                                        val count = if (group == "All") state.items.size else (allGrouped[group]?.size ?: 0)
                                        FilterChip(
                                            selected = selectedGroup == group,
                                            onClick = { selectedGroup = group },
                                            label = {
                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    Text(GROUP_EMOJIS[group] ?: "", fontSize = 14.sp)
                                                    Text(group, fontSize = 12.sp)
                                                    if (count > 0) {
                                                        Surface(
                                                            shape = RoundedCornerShape(20.dp),
                                                            color = if (selectedGroup == group) MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.3f) else MaterialTheme.colorScheme.outlineVariant
                                                        ) {
                                                            Text(
                                                                "$count",
                                                                fontSize = 10.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                color = if (selectedGroup == group) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                                            )
                                                        }
                                                    }
                                                }
                                            },
                                            shape = RoundedCornerShape(20.dp),
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                                selectedLabelColor = Color.White,
                                            ),
                                        )
                                    }
                                }

                                // Category Count Summary
                                if (filtered.isNotEmpty()) {
                                    Text(
                                        "${filtered.size} ${if (selectedGroup == "All") "categories" else selectedGroup.lowercase() + " categories"}",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp, vertical = 4.dp),
                                    )
                                }
                            }
                        }
                    }

                    // Empty search state or Category items
                    if (filtered.isEmpty()) {
                        item(span = { GridItemSpan(2) }) {
                            Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                com.zaruda.app.ui.components.AppEmptyState(
                                    icon = Icons.Outlined.Category,
                                    title = if (searchQuery.isNotBlank()) "No results for \"$searchQuery\"" else "No categories in $selectedGroup",
                                    subtitle = if (searchQuery.isNotBlank()) "Try a different search term" else "Try a different group",
                                )
                            }
                        }
                    } else {
                        itemsIndexed(filtered, key = { _, it -> it.stableId }) { idx, category ->
                            CategoryTile(
                                category = category,
                                tint = com.zaruda.app.ui.theme.CategoryTints[idx % com.zaruda.app.ui.theme.CategoryTints.size],
                                isFeatured = category.stableId in topPickIds,
                                onClick = { onCategoryClick(category.stableId, category.displayName) },
                            )
                        }
                    }
                }
            }
        }

        // ── Layer 3: Pinned Floating Glassmorphic Top Bar ──
        CategoriesFloatingTopBar(onBack = onBack)
    }
}

@Composable
private fun CategoryTile(
    category: Category,
    tint: Color,
    isFeatured: Boolean = false,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = tint),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isFeatured) 6.dp else 2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box {
            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 18.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(text = categoryEmoji(category.displayName), fontSize = 28.sp)
                Text(
                    text = category.displayName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    textAlign = TextAlign.Center,
                    overflow = TextOverflow.Ellipsis,
                )
                if (category.productCount > 0) {
                    Surface(shape = RoundedCornerShape(10.dp), color = Color.Black.copy(alpha = 0.08f)) {
                        Text(
                            "${category.productCount} listings",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        )
                    }
                }
            }
            // Featured badge
            if (isFeatured) {
                Surface(
                    shape = RoundedCornerShape(bottomEnd = 12.dp, topStart = 12.dp),
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.align(Alignment.TopEnd),
                ) {
                    Text(
                        "⭐ Top",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                    )
                }
            }
        }
    }
}

private fun categoryEmoji(name: String): String {
    val n = name.lowercase()
    return when {
        n.contains("electron") || n.contains("tech") || n.contains("gadget") -> "💻"
        n.contains("fashion") || n.contains("cloth") || n.contains("apparel") -> "👗"
        n.contains("vehicle") || n.contains("car") || n.contains("bike") || n.contains("motor") -> "🚗"
        n.contains("furniture") || n.contains("home") || n.contains("decor") -> "🏠"
        n.contains("book") || n.contains("education") || n.contains("study") -> "📚"
        n.contains("sport") || n.contains("fitness") || n.contains("gym") -> "⚽"
        n.contains("food") || n.contains("grocery") || n.contains("restaurant") -> "🍔"
        n.contains("job") || n.contains("service") || n.contains("freelan") -> "💼"
        n.contains("real estate") || n.contains("property") || n.contains("house") || n.contains("flat") -> "🏠"
        n.contains("toy") || n.contains("game") || n.contains("kid") -> "🎮"
        n.contains("health") || n.contains("beauty") || n.contains("cosmetic") -> "💄"
        n.contains("pet") || n.contains("animal") -> "🐾"
        n.contains("music") || n.contains("instrument") -> "🎵"
        n.contains("art") || n.contains("craft") || n.contains("handmade") -> "🎨"
        else -> "🏷️"
    }
}
