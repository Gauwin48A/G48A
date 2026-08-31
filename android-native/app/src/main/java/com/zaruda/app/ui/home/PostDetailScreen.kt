package com.zaruda.app.ui.home
import com.zaruda.app.ui.theme.ColorTokens

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Verified
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
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material3.AlertDialog
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
import com.zaruda.app.R
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.TrustScoreResponse
import com.zaruda.app.data.repository.CartRepository
import com.zaruda.app.data.repository.OffersRepository
import com.zaruda.app.data.repository.SalesRepository
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.SocialRepository
import com.zaruda.app.data.repository.TrustRepository
import com.zaruda.app.data.repository.WishlistRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.PromoBadgeRow
import com.zaruda.app.ui.explore.SharedExploreStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject
/** Small pool of mock suggested posts — used when the server API fails. */
private val MOCK_SUGGESTED_POSTS = listOf(
    com.zaruda.app.domain.model.Post(id="mock_sug_p1", title="iPhone 15 Pro Max 256GB – Titanium", description="Brand new, sealed box. 48MP camera, A17 Pro chip. 5x optical zoom.", price=132000.0, category="electronics", subcategory="Phones", brand="Apple", condition="New", location="Mumbai, MH", imageUrl="https://picsum.photos/seed/iph15pro/400/300", tier="premium", isPremium=true, viewCount=15200, likeCount=345, promoLabel="spotlight", boostLevel=3, sellerVerified=true, city="Mumbai", sellerName="Apple Store"),
    com.zaruda.app.domain.model.Post(id="mock_sug_p2", title="Samsung Galaxy Book 4 Ultra – i9 32GB 1TB", description="16\" 3K AMOLED, RTX 4070. Perfect for creators and professionals. 1 month old.", price=185000.0, category="electronics", subcategory="Laptops", brand="Samsung", condition="Like New", location="Bengaluru, KA", imageUrl="https://picsum.photos/seed/galbook4/400/300", tier="silver", viewCount=8900, likeCount=198, boostLevel=2, promoLabel="featured", sellerVerified=true, city="Bengaluru", sellerName="TechHub"),
    com.zaruda.app.domain.model.Post(id="mock_sug_p3", title="Royal Enfield Himalayan 450 – 2024 Model", description="5,000 km only. First owner. All accessories included. Excellent condition.", price=285000.0, category="vehicles", subcategory="Motorcycles", brand="Royal Enfield", condition="Like New", location="Pune, MH", imageUrl="https://picsum.photos/seed/himalayan450/400/300", tier="gold", viewCount=12300, likeCount=276, boostLevel=1, promoLabel="boost", sellerVerified=true, city="Pune", sellerName="RE Rider"),
    com.zaruda.app.domain.model.Post(id="mock_sug_p4", title="Louis Vuitton Neverfull GM – Damier Azur", description="Authentic LV. Gently used. Original dust bag and box included. Price negotiable.", price=165000.0, category="fashion", subcategory="Bags", brand="Louis Vuitton", condition="Used", location="Delhi, DL", imageUrl="https://picsum.photos/seed/lvneverfull2/400/300", tier="premium", isPremium=true, viewCount=28400, likeCount=612, sellerVerified=true, city="Delhi", sellerName="Luxury Closet"),
    com.zaruda.app.domain.model.Post(id="mock_sug_p5", title="Bose QuietComfort Ultra Headphones", description="Best-in-class ANC. Immersive spatial audio. 24hr battery. 2 weeks old.", price=28500.0, category="electronics", subcategory="Headphones", brand="Bose", condition="Like New", location="Chennai, TN", imageUrl="https://picsum.photos/seed/boseqcu/400/300", tier="silver", viewCount=6700, likeCount=145, boostLevel=3, promoLabel="spotlight", sellerVerified=true, city="Chennai", sellerName="AudioPhile"),
    com.zaruda.app.domain.model.Post(id="mock_sug_p6", title="Mercedes-Benz GLC 300 – 2022 Model", description="18,000 km. Sunroof, 360° camera, ambient lighting. Full service history. Single owner.", price=5800000.0, category="vehicles", subcategory="Cars", brand="Mercedes-Benz", condition="Used", location="Mumbai, MH", imageUrl="https://picsum.photos/seed/glc300/400/300", tier="premium", isPremium=true, viewCount=34200, likeCount=789, boostLevel=2, promoLabel="featured", sellerVerified=true, city="Mumbai", sellerName="AutoLux"),
    com.zaruda.app.domain.model.Post(id="mock_sug_p7", title="Sony Alpha 7 IV + 24-70mm GM II", description="Full-frame 33MP. 4K 60fps. Kit lens included. 3 months old. No shutter count.", price=265000.0, category="electronics", subcategory="Cameras", brand="Sony", condition="Like New", location="Hyderabad, TS", imageUrl="https://picsum.photos/seed/sonya7iv/400/300", tier="gold", viewCount=9800, likeCount=234, boostLevel=1, sellerVerified=true, city="Hyderabad", sellerName="ShutterBug"),
    com.zaruda.app.domain.model.Post(id="mock_sug_p8", title="Nike Air Force 1 '07 – White UK 10", description="Limited edition 'White on White'. Worn once. 100% authentic. Comes with box.", price=8500.0, category="fashion", subcategory="Shoes", brand="Nike", condition="Like New", location="Bengaluru, KA", imageUrl="https://picsum.photos/seed/nikeaf1/400/300", viewCount=4500, likeCount=98, sellerVerified=true, city="Bengaluru", sellerName="SneakerHead"),
)

/** Resolves relative image URLs to absolute by prepending the API base URL. */
private fun resolveImageUrl(img: String?): String? {
    if (img == null) return null
    // Already absolute — return as-is
    if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("blob:")) return img
    val base = com.zaruda.app.BuildConfig.DEFAULT_API_BASE_URL.trimEnd('/')
    val cleanImg = img.trimStart('/')
    // Ensure base ends with / and img has no leading / to avoid "//"
    return "$base/$cleanImg"
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

    // Buyer review eligibility for THIS post (only the verified buyer of a completed sale)
    val reviewStatus: com.zaruda.app.data.remote.dto.MyReviewStatusResponse? = null,
    val reviewLoading: Boolean = false,
    val showRateDialog: Boolean = false,
    val selectedRating: Int = 5,
    val rateComment: String = "",
    val ratingSubmitting: Boolean = false,
    val reviewError: String? = null,
    // Express Interest (buyer inquiry)
    val inquirySent: Boolean = false,
    val inquiryError: String? = null,
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
    private val wishlistItemDao: com.zaruda.app.data.local.db.WishlistItemDao,
    private val cartItemDao: com.zaruda.app.data.local.db.CartItemDao,
    private val trustRepo: TrustRepository,
    private val offersRepo: OffersRepository,
    private val socialRepo: SocialRepository,
    private val analyticsRepo: com.zaruda.app.data.repository.AnalyticsRepository,
    private val authRepo: com.zaruda.app.data.repository.AuthRepository,
    private val salesRepo: SalesRepository,
    private val inquiriesRepo: com.zaruda.app.data.repository.InquiriesRepository,
    private val localeManager: com.zaruda.app.core.LocaleManager,
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
                    // Check whether the current user is the buyer of a completed, unrated sale for this post
                    launch { loadReviewStatus() }
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
                            is com.zaruda.app.core.ApiResult.Success -> {
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
                            is com.zaruda.app.core.ApiResult.Failure -> {
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
                    // Try to show previously cached post data instead of a generic mock
                    val cachedPost = SharedExploreStore.recentlyViewedPosts.firstOrNull { it.stableId == postId }
                        ?: SharedExploreStore.wishlistPosts.firstOrNull { it.stableId == postId }
                    if (cachedPost != null) {
                        _state.value = PostDetailState(
                            loading = false,
                            post = cachedPost,
                            error = null,
                        )
                        SharedExploreStore.addRecentlyViewed(cachedPost)
                    } else {
                        // Fallback: minimal mock post with the postId
                        val mockPost = com.zaruda.app.domain.model.Post(
                            id = postId,
                            postId = postId,
                            title = "Post #$postId",
                            description = "This listing could not be loaded right now. Please check your connection and try again.",
                            status = "active",
                            viewCount = 0,
                            likeCount = 0,
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
    }

    // ── Buyer review eligibility for this post (verified buyer of a completed sale only) ──

    fun loadReviewStatus() {
        _state.update { it.copy(reviewLoading = true) }
        viewModelScope.launch {
            when (val r = salesRepo.myReviewStatus(postId)) {
                is ApiResult.Success -> _state.update { it.copy(reviewLoading = false, reviewStatus = r.data) }
                is ApiResult.Failure -> _state.update { it.copy(reviewLoading = false) } // anonymous/not a buyer — fine
            }
        }
    }

    fun setRateDialog(show: Boolean) {
        _state.update { it.copy(showRateDialog = show, selectedRating = 5, rateComment = "", reviewError = null) }
    }
    fun setSelectedRating(rating: Int) { _state.update { it.copy(selectedRating = rating.coerceIn(1, 5)) } }
    fun setRateComment(comment: String) { _state.update { it.copy(rateComment = comment) } }

    fun submitReview() {
        val saleId = _state.value.reviewStatus?.saleId ?: return
        val rating = _state.value.selectedRating
        val comment = _state.value.rateComment
        if (_state.value.ratingSubmitting) return
        _state.update { it.copy(ratingSubmitting = true) }
        viewModelScope.launch {
            when (val r = salesRepo.rateCompletedSale(saleId, rating, comment)) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            ratingSubmitting = false,
                            showRateDialog = false,
                            reviewStatus = it.reviewStatus?.copy(
                                eligible = false,
                                rated = true,
                                buyerRating = rating,
                                buyerComment = comment,
                            ),
                        )
                    }
                }
                is ApiResult.Failure -> _state.update {
                    it.copy(ratingSubmitting = false, reviewError = r.error.message ?: "Failed to submit rating")
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
                runCatching { wishlistItemDao.deleteByPostId(postId) }
                _state.value = _state.value.copy(wishlisted = false, wishlistLoading = false)
            } else {
                wishlistRepo.add(postId)
                // Save full Post to shared store so WishlistScreen works without backend
                val post = _state.value.post
                post?.let {
                    SharedExploreStore.addWishlist(it)
                    runCatching {
                        wishlistItemDao.insert(
                            com.zaruda.app.data.local.db.WishlistItemEntity(
                                id = it.stableId,
                                postId = it.stableId,
                                title = it.displayTitle,
                                price = it.price ?: 0.0,
                                originalPrice = it.originalPrice ?: 0.0,
                                imageUrl = it.primaryImage.orEmpty(),
                                category = it.category.orEmpty(),
                                brand = it.brand.orEmpty(),
                                rating = 0f,
                                reviewCount = 0,
                            )
                        )
                    }
                }
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

    /** Express Interest — notify seller via push notification (FCM). */
    fun submitInquiry(buyerName: String, phone: String, message: String) {
        viewModelScope.launch {
            when (val r = inquiriesRepo.createInquiry(postId, buyerName, phone, message = message)) {
                is ApiResult.Success -> _state.value = _state.value.copy(inquirySent = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(inquiryError = r.error.message)
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
        val post = _state.value.post
        post?.let { SharedExploreStore.addCart(it) }
        viewModelScope.launch {
            val item = _state.value.post
            if (item != null) {
                runCatching {
                    cartItemDao.insert(
                        com.zaruda.app.data.local.db.CartItemEntity(
                            id = item.stableId,
                            postId = item.stableId,
                            title = item.displayTitle,
                            price = item.price ?: 0.0,
                            originalPrice = item.originalPrice ?: 0.0,
                            imageUrl = item.primaryImage.orEmpty(),
                            category = item.category.orEmpty(),
                            brand = item.brand.orEmpty(),
                            selectedColor = "",
                            selectedSize = "",
                            quantity = 1,
                            inStock = true,
                        )
                    )
                }
            }
            cartRepo.add(postId)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    onOpenCategory: (String) -> Unit = {},
    onOpenCentre: (String) -> Unit = {},
    onOpenSale: (postId: String, sellerId: String) -> Unit = { _, _ -> },
    onOpenUser: (String) -> Unit = {},
    viewModel: PostDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val isDark = ColorTokens.isDarkTheme()
    var showShareSheet by remember { mutableStateOf(false) }
    var showInterestModal by remember { mutableStateOf(false) }
    var showImageZoom by remember { mutableStateOf(false) }
    var zoomImageIndex by remember { mutableStateOf(0) }
    var showBuyFlowHowItWorks by remember { mutableStateOf(false) }
    val salePrefs = remember {
        context.getSharedPreferences("mhub_sale_prefs", android.content.Context.MODE_PRIVATE)
    }

    if (showShareSheet) state.post?.let { post ->
        com.zaruda.app.ui.components.ShareLinkBottomSheet(
            title = post.displayTitle,
            postId = post.stableId,
            onDismiss = { showShareSheet = false },
        )
    }
    if (showInterestModal) state.post?.let { post ->
        com.zaruda.app.ui.components.BuyerInterestModal(
            postId = post.stableId,
            postTitle = post.displayTitle,
            onDismiss = { showInterestModal = false },
            onSubmit = { name, phone, msg ->
                viewModel.submitInquiry(buyerName = name, phone = phone, message = msg)
                showInterestModal = false
            },
        )
    }
    if (showBuyFlowHowItWorks) state.post?.let { buyPost ->
        BuyFlowHowItWorksDialog(
            onContinue = {
                showBuyFlowHowItWorks = false
                salePrefs.edit().putBoolean("buy_flow_seen_${buyPost.stableId}", true).apply()
                buyPost.userId?.let { sellerId -> onOpenSale(buyPost.stableId, sellerId) }
            },
            onDismiss = { showBuyFlowHowItWorks = false },
        )
    }
    if (state.showRateDialog) {
        PostRatingDialog(
            selectedRating = state.selectedRating,
            comment = state.rateComment,
            submitting = state.ratingSubmitting,
            error = state.reviewError,
            onRatingChange = viewModel::setSelectedRating,
            onCommentChange = viewModel::setRateComment,
            onSubmit = viewModel::submitReview,
            onDismiss = { viewModel.setRateDialog(false) },
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
                    containerColor = if (isDark) Color(0xFF0F1B4D) else Color(0xFF1E3A8A),
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
                                        isHotDeal = false,
                                        isJustListed = (post.viewCount ?: 0) < 10,
                                        expiresAt = post.expiresAt,
                                    )
                                }
                            }
                            // Image zoom dialog
                            if (showImageZoom) {
                                val zoomUrls = images.filterNotNull()
                                if (zoomUrls.isNotEmpty()) {
                                    com.zaruda.app.ui.components.ImageZoomDialog(
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
                                // Seller row — tap to open the seller's sold-posts trust page
                                val sellerNameForRow = post.sellerName ?: post.userName
                                if (sellerNameForRow != null) {
                                    val userClickable = post.userId != null
                                    Row(
                                        modifier = if (userClickable) Modifier.clip(RoundedCornerShape(12.dp)).clickable { post.userId?.let(onOpenUser) } else Modifier,
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        Box(
                                            modifier = Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text(sellerNameForRow.take(1).uppercase(), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                        }
                                        Column {
                                            Text(sellerNameForRow, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = if (userClickable) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                                            if (userClickable) {
                                                Text(stringResource(R.string.explore_view_seller_sales), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                                            } else {
                                                Text(stringResource(R.string.commerce_verified_seller), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                        if (userClickable) {
                                            Spacer(Modifier.weight(1f))
                                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                }
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
                                        if (origPrice != null && origPrice > price && origPrice > 0) {
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
                        // ── Buyer review card — only the verified buyer of a completed sale sees this ──
                        item(key = "sec_review") {
                            val review = state.reviewStatus
                            when {
                                review?.eligible == true -> {
                                    Card(
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFF059669).copy(alpha = if (isDark) 0.18f else 0.12f)),
                                        border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.4f)),
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                                    ) {
                                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Text("✅", fontSize = 20.sp)
                                                Column {
                                                    Text("You bought this item", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                                    Text("Your verified review builds trust for the seller.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                }
                                            }
                                            Button(
                                                onClick = { viewModel.setRateDialog(true) },
                                                enabled = !state.reviewLoading,
                                                modifier = Modifier.fillMaxWidth().height(44.dp),
                                                shape = RoundedCornerShape(12.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                                            ) {
                                                Icon(Icons.Filled.Star, null, modifier = Modifier.size(16.dp))
                                                Spacer(Modifier.width(6.dp))
                                                Text("Rate & Review", fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                                review?.rated == true -> {
                                    Card(
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF59E0B).copy(alpha = if (isDark) 0.15f else 0.1f)),
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                                    ) {
                                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                            Text("⭐", fontSize = 18.sp)
                                            Column(Modifier.weight(1f)) {
                                                Text("You rated this purchase ${review.buyerRating ?: 0}/5", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                                review.buyerComment?.takeIf { it.isNotBlank() }?.let {
                                                    Text("\"$it\"", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                                }
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

                                // Safety reminder (compact single line — always visible)
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7).copy(alpha = 0.85f),
                                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                                ) {
                                    Row(
                                        Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Text("\uD83D\uDEE1\uFE0F", fontSize = 16.sp)
                                        Text("Safety: Meet in public, inspect before paying, never share OTP.",
                                            fontSize = 11.sp, color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F),
                                            fontWeight = FontWeight.Medium, maxLines = 2)
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
                                // Build suggestion pool: API similar posts + mock fallback + shared store
                                val suggestionPool = remember(state.similarPosts) {
                                    val storePosts = SharedExploreStore.recentlyViewedPosts +
                                        SharedExploreStore.wishlistPosts +
                                        SharedExploreStore.comparePosts
                                    // Merge and deduplicate, excluding current post
                                    // MOCK_SUGGESTED_POSTS always ensures a rich pool even when offline
                                    (state.similarPosts + MOCK_SUGGESTED_POSTS + storePosts)
                                        .distinctBy { it.stableId }
                                        .filter { it.stableId != post.stableId }
                                }
                                
                                // 🔥 For You — prioritize premium/boosted/featured posts
                                if (suggestionPool.isNotEmpty()) {
                                    Spacer(Modifier.height(2.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("🔥 For You", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF8B5CF6).copy(alpha = 0.12f)) {
                                            Text("SPONSORED", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF8B5CF6),
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                        }
                                    }
                                    Spacer(Modifier.height(6.dp))
                                    // Sort: premium first, then boosted, then featured, then shuffle rest
                                    val sortedPool = remember(suggestionPool) {
                                        suggestionPool.sortedByDescending {
                                            when {
                                                it.isPremium == true || (it.tierPriority ?: 0) >= 3 || it.tier?.lowercase() == "premium" -> 100
                                                it.boostLevel != null || it.promoLabel != null -> 75
                                                it.tier?.lowercase() == "gold" || it.tier?.lowercase() == "silver" -> 50
                                                else -> 0
                                            }
                                        }.take(12).shuffled().take(8)
                                    }
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        items(sortedPool, key = { "sug_${it.stableId}" }) { sugPost ->
                                            Card(
                                                onClick = { onOpenPost(sugPost.stableId) },
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.width(150.dp),
                                            ) {
                                                Column {
                                                    Box(modifier = Modifier.fillMaxWidth()) {
                                                        val sugImgUrl = resolveImageUrl(sugPost.primaryImage)
                                                        if (sugImgUrl != null) {
                                                            AsyncImage(model = sugImgUrl, contentDescription = null,
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
                                                            sugPost.isPremium == true || (sugPost.tierPriority ?: 0) >= 3 || sugPost.tier?.lowercase() == "premium" -> 
                                                                "👑 PREMIUM" to Color(0xFFF59E0B)
                                                            sugPost.boostLevel != null || sugPost.promoLabel != null -> 
                                                                "⚡ BOOSTED" to Color(0xFF2563EB)
                                                            sugPost.tier?.lowercase() == "gold" || sugPost.tier?.lowercase() == "silver" -> 
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
                                                        Text(sugPost.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                            sugPost.price?.let { p ->
                                                                Text("₹${"%,.0f".format(p)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                                            }
                                                            Spacer(Modifier.weight(1f))
                                                            Text("↗", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                        }
                                                        // Show location if available
                                                        sugPost.location?.let { loc ->
                                                            Text(loc.take(25), fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
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
                            // ── Buy via App (escrow-protected purchase) ──
                            Spacer(Modifier.height(6.dp))
                            Button(
                                onClick = {
                                    post.userId?.let { sellerId ->
                                        if (isOwner) {
                                            // Seller managing their own listing — straight to sale hub
                                            onOpenSale(post.stableId, sellerId)
                                        } else if (salePrefs.getBoolean("buy_flow_seen_${post.stableId}", false)) {
                                            onOpenSale(post.stableId, sellerId)
                                        } else {
                                            showBuyFlowHowItWorks = true
                                        }
                                    }
                                },
                                enabled = post.userId != null,
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF059669)
                                )
                            ) {
                                Icon(Icons.Default.ShoppingBag, contentDescription = null, modifier = Modifier.size(18.dp))
                                val catLower = (post.category ?: post.categoryName ?: "").lowercase()
                                val isElectronicsCategory = catLower.contains("electron") || catLower.contains("mobile") || catLower.contains("phone") || catLower.contains("gadget")
                                Column(horizontalAlignment = Alignment.Start) {
                                    Text(
                                        if (isOwner) stringResource(R.string.commerce_sell_via_app)
                                        else if (isElectronicsCategory) "Buy via App (Escrow Protected · 2.5% Fee)"
                                        else stringResource(R.string.commerce_buy_via_app),
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        if (isOwner) stringResource(R.string.commerce_sell_manage)
                                        else if (isElectronicsCategory) "100% Escrow Fraud Shield · 2.5% Commission"
                                        else stringResource(R.string.commerce_escrow_badge),
                                        fontSize = 10.sp,
                                        color = Color.White.copy(alpha = 0.85f),
                                    )
                                }
                            }

                            // ── How it works — always available so the flow is never a mystery ──
                            if (!isOwner) {
                                TextButton(
                                    onClick = { showBuyFlowHowItWorks = true },
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Icon(Icons.Default.Info, null, tint = Color(0xFF059669), modifier = Modifier.size(15.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(stringResource(R.string.commerce_buy_flow_how), color = Color(0xFF059669), fontSize = 12.sp)
                                }
                            }

                            // ── Contact Seller — direct deal, number revealed on tap ──
                            if (!isOwner) {
                                Spacer(Modifier.height(6.dp))
                                ContactSellerRevealPanel(
                                    post = post,
                                    context = context,
                                    onBuyViaApp = {
                                        post.userId?.let { sellerId -> onOpenSale(post.stableId, sellerId) }
                                    },
                                )
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

// ──────────────────────────────────────────────────────────────────────────────
// Buy via App — How it works dialog (escrow + fraud freeze explanation)
// ──────────────────────────────────────────────────────────────────────────────

/** Star-rating + review dialog for the verified buyer of a completed sale. */
@Composable
private fun PostRatingDialog(
    selectedRating: Int,
    comment: String,
    submitting: Boolean,
    error: String?,
    onRatingChange: (Int) -> Unit,
    onCommentChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rate Your Purchase", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("How was your experience with this purchase?", fontSize = 13.sp, color = Color.Gray)
                Spacer(Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                    (1..5).forEach { star ->
                        IconButton(onClick = { onRatingChange(star) }) {
                            Icon(
                                imageVector = if (star <= selectedRating) Icons.Filled.Star else Icons.Filled.StarBorder,
                                contentDescription = "Star $star",
                                tint = if (star <= selectedRating) Color(0xFFFFB800) else Color.Gray,
                                modifier = Modifier.size(34.dp),
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = comment,
                    onValueChange = onCommentChange,
                    label = { Text("Review / Feedback (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3,
                )
                error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = Color(0xFFDC2626), fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(onClick = onSubmit, enabled = !submitting) {
                Text(if (submitting) "Submitting..." else "Submit Rating")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}

@Composable
private fun BuyFlowHowItWorksDialog(
    onContinue: () -> Unit,
    onDismiss: () -> Unit,
) {
    val isDark = ColorTokens.isDarkTheme()
    val steps = listOf(
        Triple(
            stringResource(R.string.commerce_buy_flow_step1_title),
            stringResource(R.string.commerce_buy_flow_step1_desc),
            "📝",
        ),
        Triple(
            stringResource(R.string.commerce_buy_flow_step2_title),
            stringResource(R.string.commerce_buy_flow_step2_desc),
            "✅",
        ),
        Triple(
            stringResource(R.string.commerce_buy_flow_step3_title),
            stringResource(R.string.commerce_buy_flow_step3_desc),
            "💳",
        ),
        Triple(
            stringResource(R.string.commerce_buy_flow_step4_title),
            stringResource(R.string.commerce_buy_flow_step4_desc),
            "📦",
        ),
        Triple(
            stringResource(R.string.commerce_buy_flow_step5_title),
            stringResource(R.string.commerce_buy_flow_step5_desc),
            "💰",
        ),
    )
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Text(stringResource(R.string.commerce_buy_flow_title), fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(2.dp))
                Text(
                    stringResource(R.string.commerce_buy_flow_subtitle),
                    fontSize = 12.sp,
                    color = if (isDark) Color.Gray else Color(0xFF64748B),
                )
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                steps.forEach { (title, desc, emoji) ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF059669).copy(alpha = 0.12f),
                            modifier = Modifier.size(36.dp),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(emoji, fontSize = 16.sp)
                            }
                        }
                        Column(Modifier.weight(1f)) {
                            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(desc, fontSize = 12.sp, color = if (isDark) Color.Gray else Color(0xFF64748B))
                        }
                    }
                }
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        "⚠️ " + stringResource(R.string.commerce_buy_flow_fraud_note),
                        fontSize = 11.sp,
                        color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F),
                        modifier = Modifier.padding(10.dp),
                    )
                }
            }
        },
        confirmButton = {
            Button(onClick = onContinue) {
                Text(stringResource(R.string.commerce_got_it))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.commerce_not_now))
            }
        },
    )
}

// ──────────────────────────────────────────────────────────────────────────────
// Contact Seller — reveal-on-tap number with Call / WhatsApp + outside-app notice
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun ContactSellerRevealPanel(
    post: Post,
    context: android.content.Context,
    onBuyViaApp: () -> Unit = {},
) {
    val isDark = ColorTokens.isDarkTheme()
    var revealed by remember { mutableStateOf(false) }
    var numberVisible by remember { mutableStateOf(false) }
    val rawNumber = post.contactNumber?.trim().orEmpty()
    val digits = rawNumber.filter { it.isDigit() }
    val displayNumber = when {
        digits.length == 12 && digits.startsWith("91") -> "+91 ${digits.substring(2, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}"
        digits.length == 10 -> "+91 ${digits.substring(0, 5)} ${digits.substring(5)}"
        else -> rawNumber
    }
    val masked = when {
        digits.length >= 6 -> "+91 ******${digits.takeLast(4)}"
        digits.isNotEmpty() -> "+91 ****${digits.takeLast(2)}"
        else -> ""
    }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        // KYC + active-plan trust line (all users are verified)
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.6f) else Color(0xFFF0FDF4),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Default.Verified, null, tint = Color(0xFF059669), modifier = Modifier.size(14.dp))
                Text(
                    stringResource(R.string.commerce_contact_kyc_note),
                    fontSize = 10.5.sp,
                    color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF065F46),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        OutlinedButton(
            onClick = { revealed = !revealed; numberVisible = false },
            modifier = Modifier.fillMaxWidth().height(46.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF3B82F6)),
            border = BorderStroke(1.dp, Color(0xFF3B82F6).copy(alpha = 0.5f)),
        ) {
            Icon(Icons.Default.Call, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(stringResource(R.string.commerce_contact_seller), fontWeight = FontWeight.SemiBold)
        }

        if (revealed) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White,
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (rawNumber.isBlank()) {
                        // No number shared — give an actionable fallback instead of a dead end
                        Text(
                            stringResource(R.string.commerce_contact_not_shared),
                            fontSize = 12.sp,
                            color = if (isDark) Color.Gray else Color(0xFF64748B),
                        )
                        OutlinedButton(
                            onClick = onBuyViaApp,
                            modifier = Modifier.fillMaxWidth().height(40.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF059669)),
                            border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.5f)),
                        ) {
                            Icon(Icons.Default.ShoppingBag, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.commerce_contact_use_buy), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    } else if (!numberVisible) {
                        // Step 1 — show masked number, tap to reveal
                        Text(
                            stringResource(R.string.commerce_contact_masked),
                            fontSize = 11.sp,
                            color = if (isDark) Color.Gray else Color(0xFF64748B),
                        )
                        Text(masked, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Button(
                            onClick = { numberVisible = true },
                            modifier = Modifier.fillMaxWidth().height(40.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                        ) {
                            Icon(Icons.Outlined.Visibility, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.commerce_contact_show), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    } else {
                        // Step 2 — full number + Call / WhatsApp
                        Text(
                            stringResource(R.string.commerce_contact_seller),
                            fontSize = 11.sp,
                            color = if (isDark) Color.Gray else Color(0xFF64748B),
                        )
                        Text(displayNumber, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    runCatching {
                                        val intent = android.content.Intent(Intent.ACTION_DIAL, Uri.parse("tel:$digits"))
                                        context.startActivity(intent)
                                    }
                                },
                                enabled = digits.isNotEmpty(),
                                modifier = Modifier.weight(1f).height(42.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                            ) {
                                Icon(Icons.Default.Call, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(stringResource(R.string.commerce_contact_call), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                            Button(
                                onClick = {
                                    runCatching {
                                        val waNumber = if (digits.length == 10) "91$digits" else digits
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$waNumber"))
                                        context.startActivity(intent)
                                    }
                                },
                                enabled = digits.isNotEmpty(),
                                modifier = Modifier.weight(1f).height(42.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                            ) {
                                Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(stringResource(R.string.commerce_contact_whatsapp), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                    Text(
                        stringResource(R.string.commerce_outside_app_note),
                        fontSize = 10.sp,
                        color = if (isDark) Color.Gray else Color(0xFF6B7280),
                    )
                }
            }
        }
    }
}
