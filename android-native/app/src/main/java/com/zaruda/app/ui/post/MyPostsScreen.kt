package com.zaruda.app.ui.post

import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.R
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.userFacingMessage
import com.zaruda.app.data.remote.dto.SaleInfo
import com.zaruda.app.data.repository.BoostRepository
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.RewardsRepository
import com.zaruda.app.data.repository.SalesRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.PostGridShimmer
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject

// ── Demo user mock posts for rich testing ──
private val DEMO_USER_POSTS: List<Post> = listOf(
    Post(id="demo_p1", title="iPhone 15 Pro Max 256GB – Natural Titanium", description="Brand new sealed. AppleCare+ eligible. Face ID, A17 Pro chip, 48MP camera.", price=119000.0, originalPrice=159900.0, imageUrl="https://picsum.photos/seed/demo_iphone15/400/300", category="electronics", subcategory="Phones", brand="Apple", condition="New", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=342, likeCount=28, createdAt="2024-03-15", sellerVerified=true, isNegotiable=true),
    Post(id="demo_p2", title="Samsung Galaxy Book4 Pro 360 – 16\" 16GB/512GB", description="3 months old. Intel Core Ultra 7, AMOLED touchscreen, S-Pen included. Original box.", price=98000.0, imageUrl="https://picsum.photos/seed/demo_galaxybook/400/300", category="electronics", subcategory="Laptops", brand="Samsung", condition="Like New", city="Bengaluru", location="Bengaluru, KA", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=215, likeCount=19, createdAt="2024-02-20", sellerVerified=true),
    Post(id="demo_p3", title="Sony WH-1000XM5 – Midnight Blue ANC Headphones", description="1 month old. Flawless ANC, 30hr battery. Carry case included. Original cables.", price=18900.0, imageUrl="https://picsum.photos/seed/demo_sonyxm5/400/300", category="electronics", subcategory="Audio", brand="Sony", condition="Like New", city="Delhi", location="Delhi, DL", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=156, likeCount=18, createdAt="2024-03-01"),
    Post(id="demo_p4", title="Canon EOS R6 Mark II – Body + 24-105mm Kit Lens", description="6 months old. 24.2MP, 4K 60fps, IBIS. Includes extra battery and 128GB SD card.", price=185000.0, imageUrl="https://picsum.photos/seed/demo_canonr6/400/300", category="electronics", subcategory="Cameras", brand="Canon", condition="Used", city="Pune", location="Pune, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="sold", viewCount=490, likeCount=45, createdAt="2024-01-10"),
    Post(id="demo_p6", title="Nike Air Force 1 Low White – UK 9 Brand New", description="Deadstock, never worn. Original box. 100% authentic.", price=8500.0, imageUrl="https://picsum.photos/seed/demo_af1/400/300", category="fashion", subcategory="Shoes", brand="Nike", condition="New", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=620, likeCount=74, createdAt="2024-03-20"),
    Post(id="demo_p11", title="Honda Activa 6G – Pearl White 2022", description="8,500 km driven. First owner. All service records. New battery installed.", price=68000.0, imageUrl="https://picsum.photos/seed/demo_activa/400/300", category="vehicles", subcategory="Scooters", brand="Honda", condition="Used", city="Pune", location="Pune, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=318, likeCount=38, createdAt="2024-03-18"),
)

@Stable
data class MyPostsState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val items: List<Post> = emptyList(),
    val boughtItems: List<Post> = emptyList(),
    val salePosts: List<SaleInfo> = emptyList(),
    val error: String? = null,
    val statusFilter: String? = null,
    val searchQuery: String = "",
)

@HiltViewModel
class MyPostsViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val boostRepo: BoostRepository,
    private val rewardsRepo: RewardsRepository,
    private val salesRepo: SalesRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(MyPostsState())
    val state: StateFlow<MyPostsState> = _state.asStateFlow()

    init {
        load()
    }

    fun load(refresh: Boolean = false) {
        val hasCachedData = _state.value.items.isNotEmpty()
        _state.value = _state.value.copy(
            loading = !refresh && !hasCachedData,
            refreshing = refresh,
            error = null,
        )

        viewModelScope.launch {
            val result = withTimeoutOrNull(10_000L) { repo.mine() }
            when {
                result is ApiResult.Success && result.data.isNotEmpty() -> {
                    _state.value = _state.value.copy(
                        loading = false,
                        refreshing = false,
                        items = result.data,
                    )
                }
                else -> {
                    _state.value = _state.value.copy(
                        loading = false,
                        refreshing = false,
                        items = DEMO_USER_POSTS,
                    )
                }
            }

            when (val bought = repo.bought()) {
                is ApiResult.Success -> _state.value = _state.value.copy(boughtItems = bought.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun setFilter(filter: String?) {
        _state.value = _state.value.copy(statusFilter = filter)
    }

    fun setSearchQuery(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
    }

    fun deletePost(id: String) {
        viewModelScope.launch {
            repo.delete(id)
            load(refresh = true)
        }
    }

    fun markSold(id: String) {
        viewModelScope.launch {
            repo.markSold(id)
            load(refresh = true)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyPostsScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    onCreatePost: () -> Unit = {},
    onEditPost: (String) -> Unit = {},
    onOpenSaleHub: () -> Unit = {},
    onOpenComplaints: () -> Unit = {},
    onBoost: (String) -> Unit = {},
    viewModel: MyPostsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDark
    val context = LocalContext.current

    val pageBg = if (isDark) Color(0xFF0F172A) else Color(0xFFF8FAFC)
    val sheetBg = if (isDark) Color(0xFF0F172A) else Color(0xFFF8FAFC)

    val allItems = state.items
    val totalCount = allItems.size
    val activeCount = allItems.count { it.status?.lowercase() == "active" || it.status == null }
    val soldCount = allItems.count { it.status?.lowercase() == "sold" }
    val totalViews = allItems.sumOf { it.viewCount ?: 0 }

    val displayedItems = remember(state.items, state.statusFilter, state.searchQuery) {
        var list = when (state.statusFilter) {
            "active" -> allItems.filter { it.status?.lowercase() == "active" || it.status == null }
            "sold" -> allItems.filter { it.status?.lowercase() == "sold" }
            "bought" -> state.boughtItems
            else -> allItems
        }
        if (state.searchQuery.isNotBlank()) {
            list = list.filter {
                it.displayTitle.contains(state.searchQuery, ignoreCase = true) ||
                it.location?.contains(state.searchQuery, ignoreCase = true) == true
            }
        }
        list
    }

    Scaffold(
        containerColor = pageBg,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                // ── Layer 1: Atmospheric Aurora Mesh Backdrop ──
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(230.dp)
                        .background(
                            Brush.verticalGradient(
                                if (isDark) listOf(Color(0xFF0F172A), Color(0xFF0C2442), Color(0xFF0F172A))
                                else listOf(Color(0xFFE0F2FE), Color(0xFFEFF6FF), Color(0xFFF8FAFC))
                            )
                        )
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        drawCircle(
                            color = Color(0xFF0284C7).copy(alpha = if (isDark) 0.16f else 0.20f),
                            radius = size.width * 0.45f,
                            center = Offset(size.width * 0.15f, size.height * 0.25f)
                        )
                        drawCircle(
                            color = Color(0xFF10B981).copy(alpha = if (isDark) 0.12f else 0.18f),
                            radius = size.width * 0.35f,
                            center = Offset(size.width * 0.85f, size.height * 0.35f)
                        )
                    }
                }

                Column(modifier = Modifier.fillMaxSize()) {
                    // ── Layer 2: Floating Glass Capsule Top Bar ──
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        shape = RoundedCornerShape(24.dp),
                        color = (if (isDark) Color(0xFF1E293B) else Color.White).copy(alpha = 0.90f),
                        border = BorderStroke(1.dp, (if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)).copy(alpha = 0.6f)),
                        shadowElevation = 4.dp,
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                IconButton(onClick = onBack, modifier = Modifier.size(32.dp)) {
                                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onSurface)
                                }
                                Text("📦 My Listings", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = if (isDark) Color.White else Color(0xFF0F172A))
                            }

                            Button(
                                onClick = onCreatePost,
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF2563EB),
                                    contentColor = Color.White
                                ),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                                    Text("New Listing", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        }
                    }

                    // ── Layer 3: 32dp Curved Content Canvas ──
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                        color = sheetBg,
                        shadowElevation = 12.dp,
                    ) {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            // ── 1. 4 Neumorphic KPI Cards (2x2) ──
                            item {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        KpiMetricCard(
                                            title = "Total Listings",
                                            value = "$totalCount",
                                            subtitle = "All items created",
                                            icon = Icons.Outlined.Inventory2,
                                            accent = Color(0xFF3B82F6),
                                            modifier = Modifier.weight(1f),
                                            isDark = isDark
                                        )
                                        KpiMetricCard(
                                            title = "Active / Live",
                                            value = "$activeCount",
                                            subtitle = "Visible in feed",
                                            icon = Icons.Outlined.CheckCircle,
                                            accent = Color(0xFF10B981),
                                            modifier = Modifier.weight(1f),
                                            isDark = isDark
                                        )
                                    }

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        KpiMetricCard(
                                            title = "Sold & Done",
                                            value = "$soldCount",
                                            subtitle = "Deals completed",
                                            icon = Icons.Outlined.Handshake,
                                            accent = Color(0xFF8B5CF6),
                                            modifier = Modifier.weight(1f),
                                            isDark = isDark
                                        )
                                        KpiMetricCard(
                                            title = "Total Views",
                                            value = "$totalViews",
                                            subtitle = "Audience reach",
                                            icon = Icons.Outlined.Visibility,
                                            accent = Color(0xFFF59E0B),
                                            modifier = Modifier.weight(1f),
                                            isDark = isDark
                                        )
                                    }
                                }
                            }

                            // ── 2. Boost Promo Carousel Banner ──
                            item {
                                BoostPromoBanner(
                                    onBoost = {
                                        val firstActive = allItems.firstOrNull { it.status?.lowercase() == "active" || it.status == null }
                                        if (firstActive != null) onBoost(firstActive.stableId)
                                    },
                                    isDark = isDark
                                )
                            }

                            // ── 3. Filter Chips Row ──
                            item {
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    val filters = listOf(
                                        null to "All ($totalCount)",
                                        "active" to "Active ($activeCount)",
                                        "sold" to "Sold ($soldCount)",
                                        "bought" to "Purchased (${state.boughtItems.size})"
                                    )
                                    items(filters) { (key, label) ->
                                        val isSelected = state.statusFilter == key
                                        Surface(
                                            onClick = { viewModel.setFilter(key) },
                                            shape = RoundedCornerShape(20.dp),
                                            color = if (isSelected) Color(0xFF2563EB) else (if (isDark) Color(0xFF1E293B) else Color.White),
                                            border = BorderStroke(1.dp, if (isSelected) Color(0xFF2563EB) else (if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0))),
                                        ) {
                                            Text(
                                                label,
                                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                                                fontSize = 12.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) Color.White else (if (isDark) Color.White else Color(0xFF0F172A))
                                            )
                                        }
                                    }
                                }
                            }

                            // ── 4. Listings Cards List ──
                            if (displayedItems.isEmpty()) {
                                item {
                                    Card(
                                        shape = RoundedCornerShape(20.dp),
                                        colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
                                        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(28.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.spacedBy(12.dp)
                                        ) {
                                            Text("📦", fontSize = 40.sp)
                                            Text("No Listings Found", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                            Text("Post your first ad now to reach thousands of verified local buyers.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                                            Button(
                                                onClick = onCreatePost,
                                                shape = RoundedCornerShape(14.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                                            ) {
                                                Text("+ Post An Ad", fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            } else {
                                items(displayedItems, key = { it.stableId }) { post ->
                                    ModernListingItemCard(
                                        post = post,
                                        onOpenDetail = { onOpenPost(post.stableId) },
                                        onEdit = { onEditPost(post.stableId) },
                                        onBoost = { onBoost(post.stableId) },
                                        onMarkSold = { viewModel.markSold(post.stableId) },
                                        onDelete = { viewModel.deletePost(post.stableId) },
                                        onShare = {
                                            val intent = Intent(Intent.ACTION_SEND).apply {
                                                type = "text/plain"
                                                putExtra(Intent.EXTRA_TEXT, "Check out '${post.displayTitle}' on Zaruda: ₹${post.price?.toInt() ?: 0}")
                                            }
                                            context.startActivity(Intent.createChooser(intent, "Share listing"))
                                        },
                                        isDark = isDark
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

/* ═══════════════════════════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

@Composable
private fun KpiMetricCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    accent: Color,
    modifier: Modifier = Modifier,
    isDark: Boolean,
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 10.sp,
                    letterSpacing = 1.sp
                )
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(accent.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, null, tint = accent, modifier = Modifier.size(16.dp))
                }
            }

            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                color = if (isDark) Color.White else Color(0xFF0F172A),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp
            )
        }
    }
}

@Composable
private fun BoostPromoBanner(
    onBoost: () -> Unit,
    isDark: Boolean,
) {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(3.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.horizontalGradient(
                    if (isDark) listOf(Color(0xFF1E1B4B), Color(0xFF312E81), Color(0xFF1E1B4B))
                    else listOf(Color(0xFF4338CA), Color(0xFF6366F1), Color(0xFF4338CA))
                )
            )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("🚀", fontSize = 32.sp)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Boost Your Listings",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp
                )
                Text(
                    "Get 5x more views and sell up to 3x faster with Category 1 Escrow badges.",
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 11.sp,
                    lineHeight = 15.sp
                )
            }
            Button(
                onClick = onBoost,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFF59E0B),
                    contentColor = Color.Black
                ),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text("Boost", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun ModernListingItemCard(
    post: Post,
    onOpenDetail: () -> Unit,
    onEdit: () -> Unit,
    onBoost: () -> Unit,
    onMarkSold: () -> Unit,
    onDelete: () -> Unit,
    onShare: () -> Unit,
    isDark: Boolean,
) {
    val isSold = post.status?.lowercase() == "sold"
    val isElectronics = post.category?.lowercase() == "electronics"

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        elevation = CardDefaults.cardElevation(2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpenDetail)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Product Thumbnail
                Box(
                    modifier = Modifier
                        .size(84.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFFE2E8F0))
                ) {
                    if (!post.imageUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = post.imageUrl,
                            contentDescription = post.displayTitle,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Icon(
                            Icons.Outlined.Image,
                            null,
                            tint = Color.Gray,
                            modifier = Modifier.align(Alignment.Center)
                        )
                    }

                    // Sold Overlay Badge
                    if (isSold) {
                        Surface(
                            color = Color.Black.copy(alpha = 0.7f),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("SOLD", color = Color.White, fontWeight = FontWeight.Black, fontSize = 11.sp)
                            }
                        }
                    }
                }

                // Info Column
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (isElectronics) Color(0xFF2563EB).copy(alpha = 0.12f) else Color(0xFF10B981).copy(alpha = 0.12f),
                            border = BorderStroke(1.dp, if (isElectronics) Color(0xFF2563EB).copy(alpha = 0.3f) else Color(0xFF10B981).copy(alpha = 0.3f))
                        ) {
                            Text(
                                if (isElectronics) "🛡️ Category 1 Escrow" else "⚡ Direct Deal",
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isElectronics) Color(0xFF2563EB) else Color(0xFF059669)
                            )
                        }

                        Text(
                            post.createdAt?.take(10) ?: "",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Text(
                        post.displayTitle,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (isDark) Color.White else Color(0xFF0F172A),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    val priceVal = post.price?.toInt() ?: 0
                    Text(
                        "₹$priceVal",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF059669)
                    )

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            Icon(Icons.Outlined.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                            Text("${post.viewCount ?: 0}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            Icon(Icons.Outlined.FavoriteBorder, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                            Text("${post.likeCount ?: 0}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("•  ${post.location ?: "India"}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }

            HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))

            // Action Buttons Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Edit, "Edit", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    }
                    IconButton(onClick = onShare, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Share, "Share", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Delete, "Delete", tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (!isSold) {
                        OutlinedButton(
                            onClick = onMarkSold,
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        ) {
                            Text("Mark Sold", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = onBoost,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B), contentColor = Color.Black),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        ) {
                            Text("🚀 Boost", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
