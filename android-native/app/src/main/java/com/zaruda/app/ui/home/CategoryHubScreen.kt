package com.zaruda.app.ui.home
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.text.font.FontFamily
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Workspaces
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.ui.res.stringResource
import com.zaruda.app.R
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
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.CategoryStat
import com.zaruda.app.data.repository.CategoriesRepository
import com.zaruda.app.domain.model.Category
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalTime
import javax.inject.Inject
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign

/* ── App tile data (mirrors web CategoryHub.jsx APPS array) ─────────────── */

private data class AppDef(
    val key: String,
    val label: String,
    val tagline: String,
    val offer: String,
    val ctaText: String,
    val imageUrl: String,
    val fallbackGradient: List<Color>,
)

private val APPS = listOf(
    AppDef(
        key = "electronics",
        label = "Electronics",
        tagline = "Phones, laptops & gadgets",
        offer = "Up to 40% Off",
        ctaText = "Explore Now",
        imageUrl = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
        fallbackGradient = listOf(Color(0xFF1E3A8A), Color(0xFF2563EB), Color(0xFF38BDF8)),
    ),
    AppDef(
        key = "vehicles",
        label = "Vehicles",
        tagline = "Cars, bikes & spare parts",
        offer = "100% Inspected",
        ctaText = "View Wheels",
        imageUrl = "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80",
        fallbackGradient = listOf(Color(0xFF064E3B), Color(0xFF059669), Color(0xFF34D399)),
    ),
    AppDef(
        key = "fashion",
        label = "Fashion",
        tagline = "Clothing, shoes & accessories",
        offer = "Trending Drops",
        ctaText = "Shop Drops",
        imageUrl = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
        fallbackGradient = listOf(Color(0xFF831843), Color(0xFFDB2777), Color(0xFFF472B6)),
    ),
    AppDef(
        key = "others",
        label = "Others",
        tagline = "Books, sports, hobbies & more",
        offer = "Everyday Finds",
        ctaText = "Explore",
        imageUrl = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80",
        fallbackGradient = listOf(Color(0xFF4C1D95), Color(0xFF7C3AED), Color(0xFFA78BFA)),
    ),
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
    private val cartItemDao: com.zaruda.app.data.local.db.CartItemDao,
    private val wishlistItemDao: com.zaruda.app.data.local.db.WishlistItemDao,
) : ViewModel() {
    private val _state = MutableStateFlow(CategoryHubState())
    val state: StateFlow<CategoryHubState> = _state.asStateFlow()

    /** Live Room-backed badge counts so Cart/Wishlist icons reflect real items. */
    val cartCount: StateFlow<Int> = cartItemDao.observeCount().catch { emit(0) }.stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5_000), 0,
    )
    val wishlistCount: StateFlow<Int> = wishlistItemDao.observeCount().catch { emit(0) }.stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5_000), 0,
    )

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
    onOpenAllPosts: () -> Unit = {},
    onSelectApp: (String) -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    viewModel: CategoryHubViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDarkTheme()

    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = { viewModel.refresh() },
        modifier = Modifier.fillMaxSize(),
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // ── Layer 1: Scenic Hero Backdrop ────────────────────────────────
            MarketplaceHeroBackdrop()

            // ── Layer 2: Floating Curved Sheet (Rapido Standard) ─────────────
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 90.dp),
            ) {
                // Top spacer so hero header is visible
                item(key = "hero_spacer") {
                    Spacer(Modifier.height(235.dp))
                }

                // Curved Sheet content
                item(key = "curved_sheet") {
                    Surface(
                        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                        color = if (isDark) Color(0xFF0F172A) else Color.White,
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(elevation = 16.dp, shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp)),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            // ── Row 1: Electronics + Vehicles ────────────────────────
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                            ) {
                                val s0 = state.stats.find { it.key?.lowercase() == "electronics" }
                                val s1 = state.stats.find { it.key?.lowercase() == "vehicles" }
                                RapidoCategoryCard(
                                    app = APPS[0],
                                    listingsCount = s0?.activeCount ?: state.categories.count { (it.categoryGroup ?: "").lowercase() == "electronics" },
                                    modifier = Modifier.weight(1f),
                                    onClick = { onSelectApp(APPS[0].key) },
                                )
                                RapidoCategoryCard(
                                    app = APPS[1],
                                    listingsCount = s1?.activeCount ?: state.categories.count { (it.categoryGroup ?: "").lowercase() == "vehicles" },
                                    modifier = Modifier.weight(1f),
                                    onClick = { onSelectApp(APPS[1].key) },
                                )
                            }

                            Spacer(Modifier.height(14.dp))

                            // ── Row 2: Fashion + Others ──────────────────────────────
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                            ) {
                                val s2 = state.stats.find { it.key?.lowercase() == "fashion" }
                                val s3 = state.stats.find { it.key?.lowercase() == "others" }
                                RapidoCategoryCard(
                                    app = APPS[2],
                                    listingsCount = s2?.activeCount ?: state.categories.count { (it.categoryGroup ?: "").lowercase() == "fashion" },
                                    modifier = Modifier.weight(1f),
                                    onClick = { onSelectApp(APPS[2].key) },
                                )
                                RapidoCategoryCard(
                                    app = APPS[3],
                                    listingsCount = s3?.activeCount ?: state.categories.count {
                                        (it.categoryGroup ?: "").lowercase() !in listOf("electronics", "fashion", "vehicles")
                                    },
                                    modifier = Modifier.weight(1f),
                                    onClick = { onSelectApp(APPS[3].key) },
                                )
                            }



                            // ── Continue Where You Left Off ──────────────────────────
                            val recentPosts = com.zaruda.app.ui.explore.SharedExploreStore.recentlyViewedPosts
                            if (recentPosts.isNotEmpty()) {
                                Spacer(Modifier.height(20.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = "Continue Where You Left Off",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A),
                                    )
                                    Row(
                                        modifier = Modifier.clickable { onOpenRecentlyViewed() },
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            text = "View All",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.primary,
                                        )
                                        Spacer(Modifier.width(2.dp))
                                        Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                                    }
                                }
                                Spacer(Modifier.height(10.dp))
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    contentPadding = PaddingValues(bottom = 8.dp),
                                ) {
                                    items(recentPosts.take(6)) { post ->
                                        Surface(
                                            shape = RoundedCornerShape(14.dp),
                                            color = if (isDark) Color(0xFF1E293B) else Color(0xFFFFFFFF),
                                            shadowElevation = 3.dp,
                                            modifier = Modifier
                                                .width(160.dp)
                                                .height(100.dp)
                                                .clickable { onOpenAllPosts() }
                                        ) {
                                            Column(
                                                modifier = Modifier.fillMaxSize().padding(12.dp),
                                                verticalArrangement = Arrangement.SpaceBetween,
                                            ) {
                                                Text(
                                                    (post.title ?: "Untitled").take(20),
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A),
                                                    maxLines = 2,
                                                    overflow = TextOverflow.Ellipsis,
                                                )
                                                Text(
                                                    String.format("\u20B9%,.0f", post.price ?: 0.0),
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = Color(0xFF10B981),
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            Spacer(Modifier.height(24.dp))
                        }
                    }
                }
            }

        }
    }
}

/* ── Marketplace Hero Backdrop (Full-Bleed Scenic Rapido Standard) ────────── */

@Composable
private fun MarketplaceHeroBackdrop() {
    val context = LocalContext.current
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(300.dp),
    ) {
        // High-res alpine scenic backdrop
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=85")
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
                            Color.Black.copy(alpha = 0.40f),
                            Color.Black.copy(alpha = 0.15f),
                            Color.Black.copy(alpha = 0.45f),
                            Color.Black.copy(alpha = 0.70f),
                        )
                    )
                )
        )

        // Clean headline positioned below status bar matching Rapido Screen 2
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(top = 18.dp, start = 16.dp, end = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = "Discover",
                    fontFamily = FontFamily.Serif,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    letterSpacing = 0.5.sp,
                )
                Text(
                    text = "✦",
                    fontSize = 20.sp,
                    color = Color.White.copy(alpha = 0.95f),
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = "✦",
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.90f),
                )
                Text(
                    text = "Marketplace Deals",
                    fontFamily = FontFamily.Cursive,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
            }

            Spacer(Modifier.height(8.dp))

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color.White.copy(alpha = 0.25f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.6f)),
            ) {
                Text(
                    text = "LOCALDEALS",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.5.sp,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                )
            }

            Spacer(Modifier.height(5.dp))

            Text(
                text = "Direct deals from verified local sellers",
                color = Color.White.copy(alpha = 0.90f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
            )
        }
    }
}


/* ── Rapido Photorealistic Category Card ─────────────────────────────────── */

@Composable
private fun RapidoCategoryCard(
    app: AppDef,
    listingsCount: Int,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current

    Surface(
        onClick = {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            onClick()
        },
        shape = RoundedCornerShape(24.dp),
        shadowElevation = 8.dp,
        modifier = modifier.height(230.dp),
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Background photographic image
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(app.imageUrl)
                    .crossfade(true)
                    .build(),
                contentDescription = app.label,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )

            // Fallback gradient behind image
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { alpha = 0.25f }.background(Brush.linearGradient(app.fallbackGradient))
            )

            // Dark vignette bottom scrim for high text contrast (keeps top daylight clear)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.35f),
                                Color.Black.copy(alpha = 0.80f),
                                Color.Black.copy(alpha = 0.92f),
                            ),
                            startY = 100f,
                        )
                    )
            )

            // Bottom contents: Title + Value Hook + White Pill Button
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text(
                    text = app.label,
                    color = Color.White,
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp,
                )
                Text(
                    text = app.offer,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    letterSpacing = (-0.2).sp,
                )

                Spacer(Modifier.height(5.dp))

                // Elevated White Pill Button matching Rapido Screen 2
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White,
                    shadowElevation = 3.dp,
                    modifier = Modifier.height(34.dp),
                ) {
                    Box(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = app.ctaText,
                            color = Color(0xFF0F172A),
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
        }
    }
}


/**
 * Category Icon Pill — circular icon with gradient background + label.
 * Uses Material icons instead of emojis for premium feel.
 */
@Composable
private fun CategoryIconPill(
    icon: ImageVector,
    label: String,
    gradientColors: List<Color>,
    onClick: () -> Unit,
    isDark: Boolean,
) {
    Column(
        modifier = Modifier
            .width(68.dp)
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Surface(
            shape = CircleShape,
            modifier = Modifier.size(56.dp),
            shadowElevation = 4.dp,
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(Brush.linearGradient(gradientColors)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = Color.White, modifier = Modifier.size(24.dp))
            }
        }
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (isDark) Color(0xFFE2E8F0) else Color(0xFF334155),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
