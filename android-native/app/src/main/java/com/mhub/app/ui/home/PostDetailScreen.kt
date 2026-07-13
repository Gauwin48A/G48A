package com.mhub.app.ui.home

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.Compare
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.border
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.mhub.app.R
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.TrustScoreResponse
import com.mhub.app.data.repository.CartRepository
import com.mhub.app.data.repository.OffersRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.SocialRepository
import com.mhub.app.data.repository.TrustRepository
import com.mhub.app.data.repository.WishlistRepository
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.PromoBadgeRow
import com.mhub.app.ui.explore.SharedExploreStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Resolves relative image URLs to absolute by prepending the API base URL. */
private fun resolveImageUrl(img: String?): String? {
    if (img == null) return null
    if (img.startsWith("http://") || img.startsWith("https://")) return img
    val base = com.mhub.app.BuildConfig.DEFAULT_API_BASE_URL.trimEnd('/')
    return "$base/$img"
        .replace("//", "/")
        .replace("https:/", "https://")
        .replace("http:/", "http://")
}

data class PostDetailState(
    val loading: Boolean = true,
    val post: Post? = null,
    val error: String? = null,
    val wishlisted: Boolean = false,
    val wishlistLoading: Boolean = false,
    val trustScore: TrustScoreResponse? = null,
    val offerSent: Boolean = false,
    val offerError: String? = null,
    val reported: Boolean = false,
    val similarPosts: List<Post> = emptyList(),
    val inCart: Boolean = false,
    val ownerInsights: OwnerInsights? = null,
    // Current plan (for premium/boost badge logic)
    val currentPlan: String? = null,   // "basic" | "bronze" | "silver" | "premium"
)

data class OwnerInsights(
    val totalViews: Int = 0,
    val totalInquiries: Int = 0,
    val totalOffers: Int = 0,
    val activeWatchers: Int = 0,
)

@HiltViewModel
class PostDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repo: PostsRepository,
    private val wishlistRepo: WishlistRepository,
    private val cartRepo: CartRepository,
    private val trustRepo: TrustRepository,
    private val offersRepo: OffersRepository,
    private val socialRepo: SocialRepository,
    private val analyticsRepo: com.mhub.app.data.repository.AnalyticsRepository,
    private val authRepo: com.mhub.app.data.repository.AuthRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val postId: String = savedStateHandle.get<String>("postId").orEmpty()
    private val _state = MutableStateFlow(PostDetailState())
    val state: StateFlow<PostDetailState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L

    init {
        reload()
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { reload() }
                lastLocaleVersion = version
            }
        }
    }

    fun reload() {
        _state.value = PostDetailState(loading = true)
        viewModelScope.launch {
            when (val result = repo.detail(postId)) {
                is ApiResult.Success -> {
                    _state.value = PostDetailState(loading = false, post = result.data)
                    SharedExploreStore.addRecentlyViewed(result.data)
                    // Track view + recently viewed
                    launch { runCatching { socialRepo.viewPost(postId) } }
                    launch { runCatching { socialRepo.trackViewed(postId) } }
                    // Load current plan
                    launch {
                        when (val me = authRepo.me()) {
                            is ApiResult.Success -> _state.value = _state.value.copy(
                                currentPlan = me.data.currentPlan?.lowercase()
                            )
                            is ApiResult.Failure -> {}
                        }
                    }
                    result.data.userId?.let { userId ->
                        launch {
                            when (val t = trustRepo.score(userId)) {
                                is ApiResult.Success -> _state.value = _state.value.copy(trustScore = t.data)
                                is ApiResult.Failure -> {} // non-critical
                            }
                        }
                    }
                    // Load similar posts from same category
                    result.data.categoryId?.let { catId ->
                        launch {
                            when (val s = repo.feed(limit = 6, categoryId = catId)) {
                                is ApiResult.Success -> _state.value = _state.value.copy(
                                    similarPosts = s.data.filter { it.stableId != postId }.take(5)
                                )
                                is ApiResult.Failure -> {} // non-critical
                            }
                        }
                    }
                    // Load owner insights from real analytics API (only meaningful if owner)
                    launch {
                        when (val a = analyticsRepo.postAnalytics()) {
                            is com.mhub.app.core.ApiResult.Success -> {
                                val postStat = a.data.firstOrNull { it.postId == postId }
                                if (postStat != null) {
                                    _state.value = _state.value.copy(
                                        ownerInsights = OwnerInsights(
                                            totalViews = postStat.views,
                                            totalInquiries = postStat.inquiries,
                                            totalOffers = postStat.offers,
                                            activeWatchers = 0, // not available from API
                                        )
                                    )
                                } else {
                                    // Viewer context: show view count from post object itself
                                    val post = _state.value.post
                                    if (post != null) {
                                        _state.value = _state.value.copy(
                                            ownerInsights = OwnerInsights(
                                                totalViews = post.viewCount ?: 0,
                                                totalInquiries = 0,
                                                totalOffers = 0,
                                                activeWatchers = 0,
                                            )
                                        )
                                    }
                                }
                            }
                            is com.mhub.app.core.ApiResult.Failure -> {
                                // Non-owner or analytics not available — use post.viewCount only
                                val post = _state.value.post
                                if (post != null) {
                                    _state.value = _state.value.copy(
                                        ownerInsights = OwnerInsights(
                                            totalViews = post.viewCount ?: 0,
                                            totalInquiries = 0,
                                            totalOffers = 0,
                                            activeWatchers = 0,
                                        )
                                    )
                                }
                            }
                        }
                    }
                }
                is ApiResult.Failure -> {
                    // Build a minimal mock post from the postId so the screen never shows a blank error
                    val mockPost = com.mhub.app.domain.model.Post(
                        id = postId,
                        title = "Post #$postId",
                        description = "This listing could not be loaded right now. Please check your connection and try again.",
                        status = "active",
                        viewCount = 0,
                    )
                    _state.value = PostDetailState(
                        loading = false,
                        post = mockPost,
                        error = null,
                    )
                    SharedExploreStore.addRecentlyViewed(mockPost)
                }
            }
        }
    }

    fun toggleWishlist() {
        val current = _state.value
        if (current.wishlistLoading) return

        _state.value = current.copy(wishlistLoading = true)
        viewModelScope.launch {
            if (current.wishlisted) {
                wishlistRepo.remove(postId)
                SharedExploreStore.removeWishlist(postId)
                _state.value = _state.value.copy(wishlisted = false, wishlistLoading = false)
            } else {
                wishlistRepo.add(postId)
                // Save full Post to shared store so WishlistScreen works without backend
                _state.value.post?.let { SharedExploreStore.addWishlist(it) }
                _state.value = _state.value.copy(wishlisted = true, wishlistLoading = false)
            }
        }
    }

    fun makeOffer(amount: Double) {
        viewModelScope.launch {
            when (offersRepo.makeOffer(postId, amount)) {
                is ApiResult.Success -> _state.value = _state.value.copy(offerSent = true, offerError = null)
                is ApiResult.Failure -> _state.value = _state.value.copy(offerError = "Failed to send offer")
            }
        }
    }

    fun reportPost() {
        viewModelScope.launch {
            runCatching { repo.report(postId) }
            _state.value = _state.value.copy(reported = true)
        }
    }

    fun addToCart() {
        if (_state.value.inCart) return
        _state.value = _state.value.copy(inCart = true)
        // Save to shared store so CartScreen works without backend
        _state.value.post?.let { SharedExploreStore.addCart(it) }
        viewModelScope.launch { cartRepo.add(postId) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    onOpenCategory: (String) -> Unit = {},
    onOpenCentre: (String) -> Unit = {},
    viewModel: PostDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val isDark = isSystemInDarkTheme()
    var showShareSheet by remember { mutableStateOf(false) }
    var showInterestModal by remember { mutableStateOf(false) }
    var showImageZoom by remember { mutableStateOf(false) }
    var zoomImageIndex by remember { mutableStateOf(0) }

    if (showShareSheet && state.post != null) {
        com.mhub.app.ui.components.ShareLinkBottomSheet(
            title = state.post!!.displayTitle,
            postId = state.post!!.stableId,
            onDismiss = { showShareSheet = false },
        )
    }
    if (showInterestModal && state.post != null) {
        com.mhub.app.ui.components.BuyerInterestModal(
            postId = state.post!!.stableId,
            postTitle = state.post!!.displayTitle,
            onDismiss = { showInterestModal = false },
            onSubmit = { _, _, _ -> showInterestModal = false },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.detail_listing), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    FilledIconButton(
                        onClick = { viewModel.toggleWishlist() },
                        enabled = !state.wishlistLoading,
                    ) {
                        Icon(
                            imageVector = if (state.wishlisted) {
                                Icons.Filled.Bookmark
                            } else {
                                Icons.Outlined.BookmarkBorder
                            },
                            contentDescription = null,
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    FilledIconButton(onClick = { showShareSheet = true }) {
                        Icon(Icons.Default.Share, contentDescription = null)
                    }
                    Spacer(Modifier.width(8.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1E3A8A),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White,
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        when {
            state.loading -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }

            state.error != null -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                AppErrorState(
                    title = stringResource(R.string.detail_unable_open),
                    message = state.error ?: stringResource(R.string.detail_unable_load),
                    onRetry = { viewModel.reload() },
                    retryLabel = stringResource(R.string.detail_reload),
                )
            }

            state.post == null -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                AppEmptyState(
                    icon = Icons.Outlined.ErrorOutline,
                    title = stringResource(R.string.detail_not_available),
                    subtitle = stringResource(R.string.detail_removed),
                )
            }

            else -> {
                val post = state.post ?: return@Scaffold
                // Determine ownership: ownerInsights loaded only for post owner
                val isOwner = state.ownerInsights != null
                val images = buildList {
                    post.primaryImage?.let { add(it) }
                    post.images.filter { it != post.primaryImage }.forEach { add(it) }
                }.ifEmpty { listOf<String?>(null) }
                val pagerState = rememberPagerState(pageCount = { images.size })
                val lazyState = rememberLazyListState()

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                ) {
                    LazyColumn(
                        state = lazyState,
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(bottom = 20.dp),
                    ) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(280.dp)
                                    .background(MaterialTheme.colorScheme.surfaceVariant),
                                contentAlignment = Alignment.Center,
                            ) {
                                HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                                    val img = images[page]
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .background(MaterialTheme.colorScheme.surfaceVariant),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        val displayUrl = resolveImageUrl(img)
                                        if (displayUrl != null) {
                                            AsyncImage(
                                                model = displayUrl,
                                                contentDescription = null,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier
                                                    .fillMaxSize()
                                                    .clickable {
                                                        zoomImageIndex = page
                                                        showImageZoom = true
                                                    },
                                            )
                                        } else {
                                            Icon(
                                                Icons.Outlined.ImageNotSupported,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                                modifier = Modifier.size(48.dp),
                                            )
                                        }
                                        // Video play button overlay
                                        val isVideo = img?.contains(".mp4") == true || img?.contains(".mov") == true
                                        if (isVideo) {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxSize()
                                                    .background(Color.Black.copy(alpha = 0.3f)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Surface(
                                                    shape = CircleShape,
                                                    color = Color.White.copy(alpha = 0.9f),
                                                    modifier = Modifier.size(64.dp)
                                                ) {
                                                    Icon(
                                                        Icons.Default.PlayArrow,
                                                        contentDescription = "Play video",
                                                        modifier = Modifier.size(40.dp).padding(8.dp),
                                                        tint = MaterialTheme.colorScheme.primary
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                if (images.size > 1) {
                                    AssistChip(
                                        onClick = { zoomImageIndex = pagerState.currentPage; showImageZoom = true },
                                        label = { Text("${pagerState.currentPage + 1}/${images.size} · Tap to zoom") },
                                        modifier = Modifier.align(Alignment.BottomEnd).padding(10.dp),
                                    )
                                }
                                // Promo badges — pass post data for real badges
                                Column(
                                    modifier = Modifier.align(Alignment.TopStart).padding(10.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    // Tier badge (Premium/Silver/Standard)
                                    val tierBadge = when {
                                        post.isPremium == true || (post.tierPriority ?: 0) >= 3 || post.tier?.lowercase() == "premium" -> "👑 PREMIUM" to Color(0xFFF59E0B)
                                        post.tier?.lowercase() == "silver" -> "🥈 SILVER" to Color(0xFF94A3B8)
                                        else -> null
                                    }
                                    tierBadge?.let { (label, color) ->
                                        Surface(shape = RoundedCornerShape(6.dp), color = color) {
                                            Text(label, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    // Flash Sale badge
                                    if (post.isFlashSale == true) {
                                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFDC2626)) {
                                            Text("🔥 FLASH SALE", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    // Negotiable badge
                                    if (post.isNegotiable == true || post.pricingType?.lowercase()?.contains("negoti") == true) {
                                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF059669)) {
                                            Text("✋ NEGOTIABLE", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    // Boost/Promo badge
                                    PromoBadgeRow(
                                        boostLevel = post.boostLevel,
                                        promoLabel = post.promoLabel,
                                        isHotDeal = post.isFlashSale == true,
                                        isJustListed = (post.viewCount ?: 0) < 10,
                                        expiresAt = post.expiresAt,
                                    )
                                }
                            }
                            // Image zoom dialog
                            if (showImageZoom) {
                                val zoomUrls = images.filterNotNull()
                                if (zoomUrls.isNotEmpty()) {
                                    com.mhub.app.ui.components.ImageZoomDialog(
                                        imageUrls = zoomUrls,
                                        initialIndex = zoomImageIndex.coerceIn(0, zoomUrls.lastIndex),
                                        onDismiss = { showImageZoom = false },
                                    )
                                }
                            }
                        }

                        item(key = "sec_overview") {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Text(
                                    text = post.displayTitle,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                                // Status badge: Active / Sold / Inactive / Expired
                                post.status?.takeIf { it.isNotBlank() }?.let { status ->
                                    val (statusColor, statusBg, statusLabel) = when (status.lowercase()) {
                                        "active" -> Triple(Color(0xFF22C55E), if (isDark) Color(0xFF0D2818) else Color(0xFFDCFCE7), "Active")
                                        "sold" -> Triple(Color(0xFFEF4444), if (isDark) Color(0xFF2A0F0F) else Color(0xFFFEE2E2), "Sold")
                                        "inactive" -> Triple(Color(0xFFF59E0B), if (isDark) Color(0xFF2A1F08) else Color(0xFFFEF3C7), "Inactive")
                                        "expired" -> Triple(Color(0xFFEF4444), if (isDark) Color(0xFF2A0F0F) else Color(0xFFFEE2E2), "Expired")
                                        else -> Triple(Color(0xFF6B7280), if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6), status.replaceFirstChar(Char::uppercase))
                                    }
                                    Surface(shape = RoundedCornerShape(6.dp), color = statusBg, border = BorderStroke(1.dp, statusColor.copy(alpha = 0.4f))) {
                                        Text(statusLabel, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = statusColor, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                    }
                                }
                                post.price?.let { price ->
                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(
                                            text = "₹${"%,.0f".format(price)}",
                                            style = MaterialTheme.typography.headlineSmall,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        val origPrice = post.originalPrice
                                        if (origPrice != null && origPrice > price) {
                                            val savings = origPrice - price
                                            val pct = (savings / origPrice * 100).toInt()
                                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Text(
                                                    text = "₹${"%,.0f".format(origPrice)}",
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    textDecoration = TextDecoration.LineThrough,
                                                )
                                                Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFF22C55E).copy(alpha = 0.15f)) {
                                                    Text("-$pct%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF22C55E), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                }
                                            }
                                            Text("You save ₹${"%,.0f".format(savings)}", fontSize = 12.sp, color = Color(0xFF22C55E), fontWeight = FontWeight.Medium)
                                        }
                                    }
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    post.categoryName?.let { name ->
                                        AssistChip(onClick = { onOpenCategory(post.categoryId ?: name) }, label = { Text(name) })
                                    }
                                    post.location?.let { loc ->
                                        AssistChip(
                                            onClick = {},
                                            label = { Text(loc, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                            leadingIcon = {
                                                Icon(Icons.Default.LocationOn, contentDescription = null)
                                            },
                                        )
                                    }
                                    // Condition badge with color coding
                                    post.condition?.let { cond ->
                                        val (condColor, condText) = when (cond.lowercase()) {
                                            "new" -> Color(0xFF22C55E) to "New"
                                            "like new" -> Color(0xFF14B8A6) to "Like New"
                                            "used" -> Color(0xFFF59E0B) to "Used"
                                            "fair" -> Color(0xFFF97316) to "Fair"
                                            "poor" -> Color(0xFFEF4444) to "Poor"
                                            else -> Color(0xFF6B7280) to cond.replaceFirstChar { it.uppercase() }
                                        }
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = condColor.copy(alpha = 0.15f),
                                            border = BorderStroke(1.dp, condColor.copy(alpha = 0.4f))
                                        ) {
                                            Text(
                                                condText,
                                                style = MaterialTheme.typography.labelMedium,
                                                color = condColor,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                            )
                                        }
                                    }
                                }

                                post.description?.takeIf { it.isNotBlank() }?.let {
                                    var expanded by remember { mutableStateOf(false) }
                                    Column {
                                        Text(
                                            text = stringResource(R.string.detail_description),
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            text = it,
                                            style = MaterialTheme.typography.bodyLarge,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = if (expanded) Int.MAX_VALUE else 4,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                        if (it.length > 200) {
                                            TextButton(onClick = { expanded = !expanded }) {
                                                Text(if (expanded) stringResource(R.string.detail_show_less) else stringResource(R.string.detail_read_more))
                                            }
                                        }
                                    }
                                }

                            }
                        }
                        item(key = "sec_specs") {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                // Specifications table
                                val conditionLabel = stringResource(R.string.detail_condition)
                                val brandLabel = stringResource(R.string.detail_brand)
                                val locationLabel = stringResource(R.string.detail_location)
                                val priceLabel = stringResource(R.string.detail_price)
                                val categoryLabel = stringResource(R.string.detail_category)
                                val specs = remember(post) {
                                    buildList {
                                        post.condition?.let { add(conditionLabel to it.replaceFirstChar(Char::uppercase)) }
                                        post.brand?.let { add(brandLabel to it) }
                                        post.location?.let { add(locationLabel to it) }
                                        post.price?.let { add(priceLabel to "₹${"%,.0f".format(it)}") }
                                        post.categoryName?.let { add(categoryLabel to it) }
                                    }
                                }
                                if (specs.isNotEmpty()) {
                                    Card(
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text(stringResource(R.string.detail_specifications), fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                            specs.forEach { (key, value) ->
                                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                    Text(key, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                    Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                                }
                                                if (specs.last().first != key) {
                                                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                                                }
                                            }
                                        }
                                    }
                                }

                                // Posted time
                                post.createdAt?.let { dateStr ->
                                    val timeAgo = try {
                                        val then = java.time.Instant.parse(dateStr)
                                        val mins = java.time.temporal.ChronoUnit.MINUTES.between(then, java.time.Instant.now())
                                        when {
                                            mins < 60 -> "${mins}m ago"
                                            mins < 1440 -> "${mins / 60}h ago"
                                            mins < 10080 -> "${mins / 1440}d ago"
                                            else -> "${mins / 10080}w ago"
                                        }
                                    } catch (_: Exception) { dateStr }
                                    // Freshness line: "Updated X ago • Expires in N days"
                                    val updatedAgo = post.updatedAt?.let { uStr ->
                                        try {
                                            val uThen = java.time.Instant.parse(uStr)
                                            val uMins = java.time.temporal.ChronoUnit.MINUTES.between(uThen, java.time.Instant.now())
                                            when {
                                                uMins < 60 -> "Updated ${uMins}m ago"
                                                uMins < 1440 -> "Updated ${uMins / 60}h ago"
                                                uMins < 10080 -> "Updated ${uMins / 1440}d ago"
                                                else -> "Updated ${uMins / 10080}w ago"
                                            }
                                        } catch (_: Exception) { null }
                                    }
                                    val expiresIn = post.expiresAt?.let { eStr ->
                                        try {
                                            val eThen = java.time.Instant.parse(eStr)
                                            val eDays = java.time.temporal.ChronoUnit.DAYS.between(java.time.Instant.now(), eThen)
                                            if (eDays > 0) "Expires in ${eDays}d" else if (eDays == 0L) "Expires today" else "Expired"
                                        } catch (_: Exception) { null }
                                    }
                                    val freshnessText = listOfNotNull(updatedAgo ?: "Posted $timeAgo", expiresIn).joinToString(" • ")
                                    Text(freshnessText, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }

                                post.viewCount?.let {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Outlined.Visibility, contentDescription = null)
                                        Spacer(Modifier.width(6.dp))
                                        Text("$it views", style = MaterialTheme.typography.bodySmall)
                                    }
                                }

                                // Engagement stats row
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                                ) {
                                    EngagementChip("👁", "${post.viewCount ?: 0}", stringResource(R.string.detail_views))
                                    EngagementChip("❤️", "${post.likeCount ?: 0}", stringResource(R.string.detail_likes))
                                    EngagementChip("📤", "0", stringResource(R.string.detail_shares))
                                }

                            }
                        }
                        // Key Details section (Listing ID, Pricing Type, Availability, Warranty, Expires)
                        item(key = "sec_key_details") {
                            val keyDetails = buildList {
                                post.listingId?.let { add("Listing ID" to it) }
                                    ?: post.id?.let { add("Listing ID" to "#$it") }
                                post.pricingType?.let { add("Pricing" to it.replaceFirstChar(Char::uppercase)) }
                                post.isNegotiable?.takeIf { it }?.let { add("Pricing" to "Negotiable") }
                                post.availability?.let { add("Availability" to it.replaceFirstChar(Char::uppercase)) }
                                post.warranty?.let { add("Warranty" to it) }
                                post.expiresAt?.take(10)?.let { add("Expires" to it) }
                                post.updatedAt?.take(10)?.let { add("Updated" to it) }
                            }
                            if (keyDetails.isNotEmpty()) {
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                                ) {
                                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("Listing Details", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                        keyDetails.forEach { (key, value) ->
                                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text(key, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                            }
                                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                                        }
                                    }
                                }
                            }
                        }


                        item(key = "sec_trust") {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {




                                // Condition & Brand chips
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    post.condition?.let { c -> AssistChip(onClick = {}, label = { Text(c) }) }
                                    post.brand?.let { b -> AssistChip(onClick = {}, label = { Text(b) }) }
                                }

                                // Safety Tips (collapsible with border glow & READ badge)
                                var safetyExpanded by remember { mutableStateOf(false) }
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7)),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { safetyExpanded = !safetyExpanded }
                                        .then(
                                            if (safetyExpanded) Modifier.border(
                                                1.5.dp, Brush.horizontalGradient(listOf(Color(0xFFF97316), Color(0xFFEF4444))),
                                                RoundedCornerShape(14.dp),
                                            )
                                            else Modifier.border(
                                                1.5.dp, Color(0xFFFDE68A).copy(alpha = 0.5f),
                                                RoundedCornerShape(14.dp),
                                            )
                                        ),
                                ) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text("\u26A0\uFE0F", fontSize = 18.sp)
                                            Text("Safety Tips", fontWeight = FontWeight.Bold, fontSize = 14.sp,
                                                color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E),
                                                modifier = Modifier.weight(1f))
                                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFEF4444)) {
                                                Text("READ", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                            Text(if (safetyExpanded) "\u25B2" else "\u25BC", fontSize = 12.sp,
                                                color = if (isDark) Color(0xFFFDE68A) else Color(0xFF92400E))
                                        }
                                        if (safetyExpanded) {
                                            HorizontalDivider(color = if (isDark) Color(0xFFFDE68A).copy(alpha = 0.2f) else Color(0xFFD97706).copy(alpha = 0.2f))
                                            val safetyEmojiTips = listOf(
                                                "\uD83D\uDC6B" to "Meet in a public place for exchanges",
                                                "\uD83D\uDD0D" to "Inspect the item thoroughly before paying",
                                                "\uD83D\uDCB3" to "Use secure payment methods only",
                                                "\uD83D\uDD12" to "Don't share personal financial info",
                                                "\uD83D\uDCCD" to "Verify the listing ID with the seller",
                                            )
                                            safetyEmojiTips.forEach { (emoji, tip) ->
                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    Text(emoji, fontSize = 14.sp)
                                                    Text(tip, fontSize = 12.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                                                }
                                            }
                                            Spacer(Modifier.height(4.dp))
                                            Surface(
                                                shape = RoundedCornerShape(8.dp),
                                                color = if (isDark) Color(0xFFEF4444).copy(alpha = 0.15f) else Color(0xFFFEE2E2),
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                    Text("\uD83D\uDEE1\uFE0F", fontSize = 14.sp)
                                                    Text("Stay safe! MHub will never ask for your password or OTP.",
                                                        fontSize = 11.sp, color = if (isDark) Color(0xFFFCA5A5) else Color(0xFF991B1B))
                                                }
                                            }
                                        }
                                    }
                                }

                                // Safety at a Glance (3 highlighted tiles)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            val safetyItems = listOf(
                                "🤝" to "Public Meetup",
                                "💰" to "No Pre-payment",
                                "🔍" to "Verify Listing ID",
                            )
                            safetyItems.forEach { (emoji, label) ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (isDark) Color(0xFF064E3B).copy(alpha = 0.6f) else Color(0xFFECFDF5),
                                    border = BorderStroke(1.dp, if (isDark) Color(0xFF10B981).copy(alpha = 0.5f) else Color(0xFF6EE7B7)),
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Column(
                                        modifier = Modifier.padding(vertical = 12.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                    ) {
                                        Text(emoji, fontSize = 22.sp)
                                        Spacer(Modifier.height(4.dp))
                                        Text(label, fontSize = 11.sp, color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF065F46), fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
                                    }
                                }
                            }
                        }
                            }
                        }
                                                item(key = "sec_similar") {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                // 🔥 Recommended For You — Premium/Featured/Boosted Posts
                                state.similarPosts.takeIf { it.size > 1 }?.let { allSimilar ->
                                    Spacer(Modifier.height(2.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("🔥 Recommended For You", fontWeight = FontWeight.SemiBold, fontSize = 17.sp, modifier = Modifier.weight(1f))
                                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF8B5CF6).copy(alpha = 0.12f)) {
                                            Text("SPONSORED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF8B5CF6),
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                        }
                                    }
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        val shuffledAndBadged = allSimilar.shuffled().take(6)
                                        items(shuffledAndBadged, key = { "sp_${it.stableId}" }) { spPost ->
                                            Card(
                                                onClick = { onOpenPost(spPost.stableId) },
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.width(150.dp),
                                            ) {
                                                Column {
                                                    Box(modifier = Modifier.fillMaxWidth()) {
                                                        val recImgUrl = resolveImageUrl(spPost.primaryImage)
                                                        if (recImgUrl != null) {
                                                            AsyncImage(model = recImgUrl, contentDescription = null,
                                                                contentScale = ContentScale.Crop,
                                                                modifier = Modifier.fillMaxWidth().height(110.dp))
                                                        } else {
                                                            Box(
                                                                modifier = Modifier.fillMaxWidth().height(110.dp).background(MaterialTheme.colorScheme.surfaceVariant),
                                                                contentAlignment = Alignment.Center
                                                            ) {
                                                                Icon(Icons.Outlined.ImageNotSupported, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                            }
                                                        }
                                                        // Premium/Featured/Boosted badge overlay
                                                        val badge = when {
                                                            spPost.isPremium == true || (spPost.tierPriority ?: 0) >= 3 || spPost.tier?.lowercase() == "premium" -> 
                                                                "👑 PREMIUM" to Color(0xFFF59E0B)
                                                            spPost.boostLevel != null || spPost.promoLabel != null -> 
                                                                "⚡ BOOSTED" to Color(0xFF2563EB)
                                                            spPost.tier?.lowercase() == "silver" || spPost.tier?.lowercase() == "gold" -> 
                                                                "⭐ FEATURED" to Color(0xFF7C3AED)
                                                            else -> null
                                                        }
                                                        if (badge != null) {
                                                            Surface(
                                                                shape = RoundedCornerShape(bottomEnd = 8.dp),
                                                                color = badge.second.copy(alpha = 0.88f),
                                                                modifier = Modifier.align(Alignment.TopStart),
                                                            ) {
                                                                Text(badge.first, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, 
                                                                    color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                                                            }
                                                        }
                                                    }
                                                    Column(Modifier.padding(8.dp)) {
                                                        Text(spPost.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                            spPost.price?.let { p ->
                                                                Text("₹${"%,.0f".format(p)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                                            }
                                                            Spacer(Modifier.weight(1f))
                                                            Text("↗", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                
                                // 📋 Similar Listings section
                                state.similarPosts.takeIf { it.isNotEmpty() }?.let { similar ->
                                    Spacer(Modifier.height(4.dp))
                                    Text("📋 Similar Listings", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        items(similar, key = { it.stableId }) { simPost ->
                                            Card(
                                                onClick = { onOpenPost(simPost.stableId) },
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.width(150.dp),
                                            ) {
                                                Column {
                                                    Box(modifier = Modifier.fillMaxWidth().height(100.dp).background(MaterialTheme.colorScheme.surfaceVariant)) {
                                                        val simImgUrl = resolveImageUrl(simPost.primaryImage)
                                                        if (simImgUrl != null) {
                                                            AsyncImage(model = simImgUrl, contentDescription = null, contentScale = ContentScale.Crop,
                                                                modifier = Modifier.fillMaxWidth().height(100.dp))
                                                        }
                                                        // Minimal premium badge
                                                        if (simPost.isPremium == true) {
                                                            Surface(shape = RoundedCornerShape(bottomEnd = 6.dp), color = Color(0xFFF59E0B).copy(alpha = 0.85f),
                                                                modifier = Modifier.align(Alignment.TopStart)) {
                                                                Text("PREMIUM", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color.White,
                                                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                                            }
                                                        }
                                                    }
                                                    Column(Modifier.padding(8.dp)) {
                                                        Text(simPost.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                                        simPost.price?.let { p ->
                                                            Text("₹${"%,.0f".format(p)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    state.ownerInsights?.let { insights ->
                        Surface(shape = RoundedCornerShape(14.dp), color = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), shadowElevation = 2.dp) {
                            Column(Modifier.padding(14.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Timeline, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(stringResource(R.string.detail_listing_insights), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E))
                                }
                                Spacer(Modifier.height(10.dp))
                                val viewsLabel = stringResource(R.string.detail_views)
                                val inquiriesLabel = stringResource(R.string.detail_inquiries)
                                val offersLabel = stringResource(R.string.detail_offers)
                                val watchersLabel = stringResource(R.string.detail_watchers)
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                    listOf(
                                        Triple("👁", "${insights.totalViews}", viewsLabel),
                                        Triple("💬", "${insights.totalInquiries}", inquiriesLabel),
                                        Triple("💰", "${insights.totalOffers}", offersLabel),
                                        Triple("👥", "${insights.activeWatchers}", watchersLabel),
                                    ).forEach { (emoji, value, label) ->
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(emoji, fontSize = 18.sp)
                                            Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E))
                                            Text(label, fontSize = 11.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFFB45309))
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Surface(color = MaterialTheme.colorScheme.surface) {
                        Column(Modifier.navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp)) {
                            // Make Offer row
                            var showOfferDialog by remember { mutableStateOf(false) }
                            var offerAmount by remember { mutableStateOf("") }
                            if (state.offerSent) {
                                Surface(shape = RoundedCornerShape(8.dp), color = if (isDark) Color(0xFF0D2818) else Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Text(stringResource(R.string.detail_offer_success), color = Color(0xFF22C55E), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(12.dp))
                                }
                            }

                            if (showOfferDialog) {
                                Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    val offerVal = offerAmount.toDoubleOrNull()
                                    val minAcceptable = (post.price ?: 0.0) * 0.5
                                    val isTooLow = offerVal != null && offerVal < minAcceptable
                                    Column(Modifier.weight(1f)) {
                                        OutlinedTextField(
                                            value = offerAmount, onValueChange = { offerAmount = it.filter(Char::isDigit) },
                                            placeholder = { Text("Your offer ₹") }, singleLine = true,
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth().height(48.dp),
                                            isError = isTooLow,
                                            supportingText = if (isTooLow) {{ Text("Min ₹${"%,.0f".format(minAcceptable)}", color = Color(0xFFEF4444), fontSize = 10.sp) }} else null,
                                        )
                                    }
                                    Button(onClick = {
                                        offerVal?.let { viewModel.makeOffer(it) }
                                        showOfferDialog = false
                                    }, enabled = offerAmount.isNotBlank() && !isTooLow, shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))) {
                                        Text("Send", fontWeight = FontWeight.SemiBold)
                                    }
                                    TextButton(onClick = { showOfferDialog = false }) { Text("Cancel") }
                                }
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { showOfferDialog = !showOfferDialog }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                                    Icon(Icons.Filled.LocalOffer, null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Make Offer")
                                }
                                OutlinedButton(onClick = { if (!state.reported) viewModel.reportPost() }, shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = if (state.reported) Color(0xFF94A3B8) else Color(0xFFEF4444))) {
                                    Icon(Icons.Filled.Flag, null, modifier = Modifier.size(18.dp))
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedButton(onClick = { showInterestModal = true }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                                    Icon(Icons.Default.LocalOffer, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Interested")
                                }
                                Button(
                                    onClick = { viewModel.addToCart() },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (state.inCart) Color(0xFF22C55E) else Color(0xFF3B82F6)
                                    )
                                ) {
                                    Icon(
                                        if (state.inCart) Icons.Default.ShoppingBag else Icons.Default.AddShoppingCart,
                                        contentDescription = null
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(if (state.inCart) "In Cart" else "Add")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EngagementChip(emoji: String, count: String, label: String) {
    Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(emoji, fontSize = 14.sp)
            Text(count, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
