package com.zaruda.app.ui.home
import com.zaruda.app.ui.theme.ColorTokens

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
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
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
        label = "Living & Spaces",
        tagline = "Homes, decor & services",
        offer = "Zero Brokerage",
        ctaText = "Discover",
        imageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
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
    onOpenCategory: (Category) -> Unit = {},
    onOpenAllPosts: () -> Unit = {},
    onOpenSearch: () -> Unit,
    onSelectApp: (String) -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    onOpenScanner: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    onOpenForYou: () -> Unit = {},
    onOpenWishlist: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    onOpenRewards: () -> Unit = {},
    onOpenProfile: () -> Unit = {},
    onOpenTierSelection: () -> Unit = {},
    onOpenKyc: () -> Unit = {},
    onOpenPayouts: () -> Unit = {},
    unreadNotifications: Int = 0,
    cartItemCount: Int = 0,
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
            // ── Layer 1: Parallax Full-Bleed Scenic Hero Header ──────────────
            MarketplaceHeroHeader(
                onOpenSearch = onOpenSearch,
                onOpenNotifications = onOpenNotifications,
                onOpenCart = onOpenCart,
                cartCount = cartItemCount,
                unreadNotifications = unreadNotifications,
            )

            // ── Layer 2: Floating Curved Sheet (Rapido Standard) ─────────────
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 90.dp),
            ) {
                // Top spacer so hero header is visible
                item(key = "hero_spacer") {
                    Spacer(Modifier.height(210.dp))
                }

                // Curved Sheet content
                item(key = "curved_sheet") {
                    Surface(
                        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                        color = if (isDark) Color(0xFF0F172A) else Color(0xFFF8FAFC),
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(elevation = 16.dp, shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp)),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            // Sheet drag handle indicator
                            Box(
                                modifier = Modifier
                                    .width(42.dp)
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(if (isDark) Color(0xFF334155) else Color(0xFFCBD5E1))
                            )

                            Spacer(Modifier.height(16.dp))

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

                            // ── Row 2: Fashion + Living & Spaces ─────────────────────
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

                            Spacer(Modifier.height(18.dp))

                            // ── Storytelling Editorial Banner ────────────────────────
                            EscrowStorytellingBanner(onClick = onOpenAllPosts)

                            Spacer(Modifier.height(16.dp))

                            // ── Flash Deals Banner ───────────────────────────────────
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp)
                                    .clickable { onOpenAllPosts() },
                                shape = RoundedCornerShape(16.dp),
                                color = Color.Transparent,
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(Brush.horizontalGradient(listOf(Color(0xFFFF6B00), Color(0xFFFF8C00))))
                                        .padding(horizontal = 16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.LocalOffer, null, tint = Color.White, modifier = Modifier.size(20.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Column {
                                            Text("Flash Deals & Steals", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                                            Text("Limited-time verified drops", color = Color.White.copy(alpha = 0.85f), fontSize = 10.sp)
                                        }
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("View Deals", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        Spacer(Modifier.width(4.dp))
                                        Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }

                            Spacer(Modifier.height(16.dp))

                            // ── Category Quick Actions (Material Icons, no emojis) ──
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                contentPadding = PaddingValues(vertical = 4.dp),
                            ) {
                                item { CategoryIconPill(icon = Icons.Default.PhoneAndroid, label = "Phones", gradientColors = listOf(Color(0xFF3B82F6), Color(0xFF6366F1)), onClick = { onSelectApp("electronics") }, isDark = isDark) }
                                item { CategoryIconPill(icon = Icons.Default.DirectionsCar, label = "Vehicles", gradientColors = listOf(Color(0xFF10B981), Color(0xFF14B8A6)), onClick = { onSelectApp("vehicles") }, isDark = isDark) }
                                item { CategoryIconPill(icon = Icons.Default.Checkroom, label = "Fashion", gradientColors = listOf(Color(0xFFEC4899), Color(0xFFF43F5E)), onClick = { onSelectApp("fashion") }, isDark = isDark) }
                                item { CategoryIconPill(icon = Icons.Default.Home, label = "Homes", gradientColors = listOf(Color(0xFFF59E0B), Color(0xFFEF4444)), onClick = { onSelectApp("others") }, isDark = isDark) }
                                item { CategoryIconPill(icon = Icons.Default.LocalOffer, label = "Deals", gradientColors = listOf(Color(0xFF8B5CF6), Color(0xFF6366F1)), onClick = { onOpenAllPosts() }, isDark = isDark) }
                                item { CategoryIconPill(icon = Icons.Default.Search, label = "Search", gradientColors = listOf(Color(0xFF64748B), Color(0xFF475569)), onClick = { onOpenSearch() }, isDark = isDark) }
                            }

                            Spacer(Modifier.height(14.dp))

                            // ── Quick-Ribbon: 1-tap shortcuts (Material icons) ────
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                contentPadding = PaddingValues(vertical = 4.dp),
                            ) {
                                item { QuickRibbonPill(icon = Icons.Default.EmojiEvents, label = "Rewards", onClick = onOpenRewards, isDark = isDark) }
                                item { QuickRibbonPill(icon = Icons.Default.Person, label = "Profile", onClick = onOpenProfile, isDark = isDark) }
                                item { QuickRibbonPill(icon = Icons.Default.Workspaces, label = "Premium", onClick = onOpenTierSelection, isDark = isDark) }
                                item { QuickRibbonPill(icon = Icons.Default.Verified, label = "KYC", onClick = onOpenKyc, isDark = isDark) }
                                item { QuickRibbonPill(icon = Icons.Default.AccountBalance, label = "Wallet", onClick = onOpenPayouts, isDark = isDark) }
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

/* ── Marketplace Hero Header (Full-Bleed Scenic Rapido Standard) ────────── */

@Composable
private fun MarketplaceHeroHeader(
    onOpenSearch: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenCart: () -> Unit,
    cartCount: Int,
    unreadNotifications: Int,
) {
    val context = LocalContext.current
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp),
    ) {
        // High-res scenic backdrop
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data("https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&auto=format&fit=crop&q=80")
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
                            Color.Black.copy(alpha = 0.45f),
                            Color.Black.copy(alpha = 0.30f),
                            Color.Black.copy(alpha = 0.70f),
                        )
                    )
                )
        )

        // Hero contents
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Top action bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Search capsule shortcut
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.Black.copy(alpha = 0.4f),
                    modifier = Modifier.clickable { onOpenSearch() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.Search, null, tint = Color.White, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Search Zaruda...", color = Color.White.copy(alpha = 0.9f), fontSize = 13.sp)
                    }
                }

                // Notifications and Cart actions
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.4f),
                        modifier = Modifier.size(38.dp).clickable { onOpenNotifications() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Notifications, null, tint = Color.White, modifier = Modifier.size(18.dp))
                            if (unreadNotifications > 0) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFEF4444))
                                        .align(Alignment.TopEnd)
                                )
                            }
                        }
                    }

                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.4f),
                        modifier = Modifier.size(38.dp).clickable { onOpenCart() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.ShoppingCart, null, tint = Color.White, modifier = Modifier.size(18.dp))
                            if (cartCount > 0) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF10B981))
                                        .align(Alignment.TopEnd)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // Clean headline — no promo codes, no clutter
            Text(
                text = "Discover Nearby Deals",
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
                textAlign = TextAlign.Center,
                letterSpacing = (-0.3).sp,
            )

            Spacer(Modifier.height(6.dp))

            Text(
                text = "Verified sellers \u2022 Escrow protected \u2022 Zero scams",
                color = Color.White.copy(alpha = 0.85f),
                fontSize = 13.sp,
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
        shape = RoundedCornerShape(22.dp),
        shadowElevation = 8.dp,
        modifier = modifier
            .height(210.dp)
            .clickable {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onClick()
            },
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

            // Dark vignette bottom scrim for high text contrast
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.25f),
                                Color.Black.copy(alpha = 0.85f),
                                Color.Black.copy(alpha = 0.95f),
                            ),
                            startY = 60f,
                        )
                    )
            )

            // Live badge at top right
            if (listingsCount > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(10.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color.Black.copy(alpha = 0.5f),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                        ) {
                            Box(Modifier.size(5.dp).clip(CircleShape).background(Color(0xFF22C55E)))
                            Text("$listingsCount", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            // Bottom contents: Title + Value Hook + White Pill Button
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = app.label,
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 17.sp,
                )
                Text(
                    text = app.offer,
                    color = Color(0xFFFDE047),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                )

                Spacer(Modifier.height(4.dp))

                // Elevated White Pill Button
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White,
                    shadowElevation = 4.dp,
                    modifier = Modifier
                        .height(34.dp)
                        .clickable {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onClick()
                        },
                ) {
                    Box(
                        modifier = Modifier.padding(horizontal = 14.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = app.ctaText,
                            color = Color(0xFF0F172A),
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
        }
    }
}

/* ── Storytelling Editorial Banner ───────────────────────────────────────── */

@Composable
private fun EscrowStorytellingBanner(
    onClick: () -> Unit,
) {
    val context = LocalContext.current
    Surface(
        shape = RoundedCornerShape(20.dp),
        shadowElevation = 6.dp,
        color = Color(0xFFF1F5F9),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(130.dp),
        ) {
            // Background aesthetic landscape texture
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80")
                    .crossfade(true)
                    .build(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )

            // Translucent overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                Color.White.copy(alpha = 0.94f),
                                Color.White.copy(alpha = 0.85f),
                                Color.White.copy(alpha = 0.60f),
                            )
                        )
                    )
            )

            // Content overlay
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text(
                        text = "Every Deal Safe in Escrow",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF0F172A),
                        letterSpacing = (-0.2).sp,
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = "Buy verified items with 100% money-back guarantee",
                        fontSize = 11.sp,
                        color = Color(0xFF475569),
                        fontWeight = FontWeight.Medium,
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF059669).copy(alpha = 0.12f)) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp),
                            ) {
                                Icon(Icons.Default.Verified, null, tint = Color(0xFF059669), modifier = Modifier.size(10.dp))
                                Text("Escrow Insured", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                            }
                        }
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF2563EB).copy(alpha = 0.12f)) {
                            Text("OTP Handover", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2563EB), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF0F172A),
                        modifier = Modifier.padding(2.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("Explore", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.width(2.dp))
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Color.White, modifier = Modifier.size(12.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickRibbonPill(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    isDark: Boolean,
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
        modifier = Modifier
            .height(36.dp)
            .clickable { onClick() },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(icon, null, tint = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B), modifier = Modifier.size(16.dp))
            Text(
                label,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = if (isDark) Color(0xFFE2E8F0) else Color(0xFF334155),
            )
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
