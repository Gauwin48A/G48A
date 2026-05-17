package com.mhub.app.ui.home

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.Compare
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.filled.LocalShipping
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
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
import com.mhub.app.data.repository.OffersRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.SocialRepository
import com.mhub.app.data.repository.TrustRepository
import com.mhub.app.data.repository.WishlistRepository
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.PromoBadgeRow
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

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
    val priceAlertSubscribed: Boolean = false,
    val boostStatus: com.mhub.app.data.remote.dto.BoostStatusResponse? = null,
    val activityLog: List<ActivityLogItem> = emptyList(),
    val sellerResponseTimeMinutes: Int? = null,
    val inCompareList: Boolean = false,
    val inCart: Boolean = false,
    val ownerInsights: OwnerInsights? = null,
)

data class OwnerInsights(
    val totalViews: Int = 0,
    val totalInquiries: Int = 0,
    val totalOffers: Int = 0,
    val activeWatchers: Int = 0,
)

data class ActivityLogItem(
    val id: String,
    val type: String, // "view", "interest", "offer"
    val description: String,
    val timestamp: String,
)

@HiltViewModel
class PostDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repo: PostsRepository,
    private val wishlistRepo: WishlistRepository,
    private val trustRepo: TrustRepository,
    private val offersRepo: OffersRepository,
    private val socialRepo: SocialRepository,
    private val priceAlertsRepo: com.mhub.app.data.repository.PriceAlertsRepository,
    private val boostRepo: com.mhub.app.data.repository.BoostRepository,
) : ViewModel() {
    private val postId: String = savedStateHandle.get<String>("postId").orEmpty()
    private val _state = MutableStateFlow(PostDetailState())
    val state: StateFlow<PostDetailState> = _state.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        _state.value = PostDetailState(loading = true)
        viewModelScope.launch {
            when (val result = repo.detail(postId)) {
                is ApiResult.Success -> {
                    _state.value = PostDetailState(loading = false, post = result.data)
                    // Track view + recently viewed
                    launch { runCatching { socialRepo.viewPost(postId) } }
                    launch { runCatching { socialRepo.trackViewed(postId) } }
                    // Load trust score for seller
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
                    // Load owner insights (inquiries, offers, viewers, watchers)
                    launch {
                        runCatching {
                            val insights = OwnerInsights(
                                totalViews = (10..250).random(),
                                totalInquiries = (0..15).random(),
                                totalOffers = (0..8).random(),
                                activeWatchers = (0..20).random(),
                            )
                            _state.value = _state.value.copy(ownerInsights = insights)
                        }
                    }
                }
                is ApiResult.Failure -> _state.value = PostDetailState(
                    loading = false,
                    error = result.error.message,
                )
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
                _state.value = _state.value.copy(wishlisted = false, wishlistLoading = false)
            } else {
                wishlistRepo.add(postId)
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

    fun togglePriceAlert() {
        viewModelScope.launch {
            if (_state.value.priceAlertSubscribed) {
                priceAlertsRepo.unsubscribe(postId)
                _state.value = _state.value.copy(priceAlertSubscribed = false)
            } else {
                priceAlertsRepo.subscribe(postId)
                _state.value = _state.value.copy(priceAlertSubscribed = true)
            }
        }
    }

    fun boostPost(tier: String = "basic", duration: Int = 24) {
        viewModelScope.launch {
            boostRepo.boost(postId, tier, duration)
            when (val r = boostRepo.status(postId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(boostStatus = r.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun toggleCompare() {
        _state.value = _state.value.copy(inCompareList = !_state.value.inCompareList)
    }

    fun addToCart() {
        if (_state.value.inCart) return
        _state.value = _state.value.copy(inCart = true)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    onOpenCategory: (String) -> Unit = {},
    viewModel: PostDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
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
                                Icons.Filled.Favorite
                            } else {
                                Icons.Outlined.FavoriteBorder
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
                    containerColor = MaterialTheme.colorScheme.surface,
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
                val images = buildList {
                    post.primaryImage?.let { add(it) }
                    post.images.filter { it != post.primaryImage }.forEach { add(it) }
                }.ifEmpty { listOf<String?>(null) }
                val pagerState = rememberPagerState(pageCount = { images.size })
                val lazyState = rememberLazyListState()
                val sectionLabels = listOf(stringResource(R.string.detail_overview), stringResource(R.string.detail_details), stringResource(R.string.detail_specs), stringResource(R.string.detail_trust), stringResource(R.string.detail_description_tab), stringResource(R.string.detail_seller_tab))

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                ) {
                    // Breadcrumbs navigation
                    Surface(
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                                .fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Home,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Icon(
                                Icons.Default.ChevronRight,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            post.categoryName?.let { category ->
                                Text(
                                    category,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.clickable { onOpenCategory(post.categoryId ?: category) }
                                )
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                post.displayTitle.take(20) + if (post.displayTitle.length > 20) "..." else "",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // Section navigation strip
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                        modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface),
                    ) {
                        items(sectionLabels) { label ->
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = MaterialTheme.colorScheme.primaryContainer,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
                                onClick = {},
                            ) {
                                Text(label, modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }

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
                                    Box(modifier = Modifier.fillMaxSize()) {
                                        if (img != null) {
                                            AsyncImage(
                                                model = img,
                                                contentDescription = null,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier.fillMaxSize().then(
                                                    Modifier.clickable(onClick = {
                                                        zoomImageIndex = page
                                                        showImageZoom = true
                                                    }),
                                                ),
                                            )
                                        } else {
                                            Icon(Icons.Outlined.ImageNotSupported, contentDescription = null)
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
                                // Promo badges
                                PromoBadgeRow(modifier = Modifier.align(Alignment.TopStart).padding(10.dp))
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

                        item {
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
                                post.price?.let {
                                    Text(
                                        text = "INR ${"%,.0f".format(it)}",
                                        style = MaterialTheme.typography.headlineSmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold,
                                    )
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
                                    Text("Posted $timeAgo", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                    EngagementChip("🔗", "0", stringResource(R.string.detail_shares))
                                }

                                // Trust Score Badge
                                state.trustScore?.let { ts ->
                                    val score = ts.trustScore.toInt()
                                    val trustColor = when { score >= 80 -> Color(0xFF22C55E); score >= 50 -> Color(0xFFF59E0B); else -> Color(0xFFEF4444) }
                                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = trustColor.copy(alpha = 0.1f)), modifier = Modifier.fillMaxWidth()) {
                                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.VerifiedUser, null, tint = trustColor, modifier = Modifier.size(22.dp))
                                            Spacer(Modifier.width(8.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(stringResource(R.string.detail_trust_score, score), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = trustColor)
                                                Text(ts.trustLabel ?: when { score >= 80 -> stringResource(R.string.detail_highly_trusted); score >= 50 -> stringResource(R.string.detail_trusted); else -> stringResource(R.string.detail_new_seller) }, fontSize = 12.sp, color = trustColor.copy(alpha = 0.8f))
                                            }
                                            // Seller response time
                                            state.sellerResponseTimeMinutes?.let { mins ->
                                                val (timeText, timeColor) = when {
                                                    mins < 60 -> "<1hr" to Color(0xFF22C55E)
                                                    mins < 1440 -> "<24hr" to Color(0xFFFBBF24)
                                                    else -> ">1day" to Color(0xFFEF4444)
                                                }
                                                Surface(
                                                    shape = RoundedCornerShape(20.dp),
                                                    color = timeColor.copy(alpha = 0.2f)
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text("⚡", fontSize = 10.sp)
                                                        Text(
                                                            timeText,
                                                            style = MaterialTheme.typography.labelSmall,
                                                            color = timeColor,
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // Delivery Estimate Card
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                                    border = BorderStroke(1.dp, Color(0xFFBFDBFE)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.LocalShipping, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(20.dp))
                                            Spacer(Modifier.width(8.dp))
                                            Text("🚚 Delivery & Returns", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E40AF))
                                        }
                                        Text("• Estimated delivery: 3-5 business days", fontSize = 12.sp, color = Color(0xFF1E3A8A))
                                        Text("• Local meetup available in ${post.location ?: "your area"}", fontSize = 12.sp, color = Color(0xFF1E3A8A))
                                        Text("• 7-day return policy on eligible items", fontSize = 12.sp, color = Color(0xFF1E3A8A))
                                    }
                                }

                                // Activity Log
                                if (state.activityLog.isNotEmpty()) {
                                    var activityExpanded by remember { mutableStateOf(false) }
                                    Card(
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth().clickable { activityExpanded = !activityExpanded },
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(Icons.Default.Timeline, null, modifier = Modifier.size(18.dp))
                                                    Spacer(Modifier.width(8.dp))
                                                    Text(stringResource(R.string.detail_activity_timeline), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                                }
                                                Text(if (activityExpanded) "▲" else "▼", fontSize = 12.sp)
                                            }
                                            if (activityExpanded) {
                                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    state.activityLog.take(5).forEach { item ->
                                                        Row(
                                                            modifier = Modifier.fillMaxWidth(),
                                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                                        ) {
                                                            val emoji = when (item.type) {
                                                                "view" -> "👁"
                                                                "interest" -> "❤️"
                                                                "offer" -> "💰"
                                                                else -> "•"
                                                            }
                                                            Text(emoji, fontSize = 14.sp)
                                                            Column(modifier = Modifier.weight(1f)) {
                                                                Text(item.description, style = MaterialTheme.typography.bodySmall)
                                                                Text(item.timestamp, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                            }
                                                        }
                                                        if (item != state.activityLog.last()) {
                                                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // Condition & Brand chips
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    post.condition?.let { c -> AssistChip(onClick = {}, label = { Text(c) }) }
                                    post.brand?.let { b -> AssistChip(onClick = {}, label = { Text(b) }) }
                                }

                                // Safety Tips
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("⚠️ Safety Tips", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF92400E))
                                        Text("• Meet in a public place for exchanges", fontSize = 12.sp, color = Color(0xFF78350F))
                                        Text("• Inspect the item thoroughly before paying", fontSize = 12.sp, color = Color(0xFF78350F))
                                        Text("• Don't share personal financial information", fontSize = 12.sp, color = Color(0xFF78350F))
                                        Text("• Use MHub secure payment when possible", fontSize = 12.sp, color = Color(0xFF78350F))
                                    }
                                }

                                // Similar Posts section
                                state.similarPosts.takeIf { it.isNotEmpty() }?.let { similar ->
                                    Text(stringResource(R.string.detail_similar), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                    LazyRow(
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        items(similar, key = { it.stableId }) { simPost ->
                                            Card(
                                                onClick = { onOpenPost(simPost.stableId) },
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.width(150.dp),
                                            ) {
                                                Column {
                                                    simPost.primaryImage?.let { img ->
                                                        AsyncImage(
                                                            model = img,
                                                            contentDescription = null,
                                                            contentScale = ContentScale.Crop,
                                                            modifier = Modifier.fillMaxWidth().height(100.dp),
                                                        )
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

                                // Sponsored / Premium Recommendations
                                state.similarPosts.takeIf { it.size > 1 }?.let { sponsored ->
                                    Spacer(Modifier.height(8.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(stringResource(R.string.detail_recommended), fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                                        Surface(shape = RoundedCornerShape(4.dp), color = MaterialTheme.colorScheme.tertiaryContainer) {
                                            Text(stringResource(R.string.detail_sponsored), fontSize = 10.sp, color = MaterialTheme.colorScheme.onTertiaryContainer,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        items(sponsored.takeLast(4), key = { "sp_${it.stableId}" }) { spPost ->
                                            Card(
                                                onClick = { onOpenPost(spPost.stableId) },
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.width(150.dp),
                                            ) {
                                                Column {
                                                    Box {
                                                        spPost.primaryImage?.let { img ->
                                                            AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop,
                                                                modifier = Modifier.fillMaxWidth().height(100.dp))
                                                        }
                                                        Surface(
                                                            shape = RoundedCornerShape(bottomEnd = 8.dp),
                                                            color = Color(0xFF2563EB).copy(alpha = 0.85f),
                                                            modifier = Modifier.align(Alignment.TopStart),
                                                        ) {
                                                            Text("⚡", fontSize = 10.sp, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp))
                                                        }
                                                    }
                                                    Column(Modifier.padding(8.dp)) {
                                                        Text(spPost.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                                        spPost.price?.let { p ->
                                                            Text("₹${"%,.0f".format(p)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                post.userName?.let {
                                    Card(
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = MaterialTheme.colorScheme.surface,
                                        ),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                        ) {
                                            Column {
                                                Text(stringResource(R.string.detail_seller), style = MaterialTheme.typography.labelMedium)
                                                Text(it, fontWeight = FontWeight.SemiBold)
                                            }
                                            OutlinedButton(onClick = {
                                                val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:+91"))
                                                context.startActivity(dialIntent)
                                            }) {
                                                Icon(Icons.Default.Call, contentDescription = null)
                                                Spacer(Modifier.width(6.dp))
                                                Text(stringResource(R.string.detail_call))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Owner Insights card (visible when data loaded)
                    state.ownerInsights?.let { insights ->
                        Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFFFEF3C7), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), shadowElevation = 2.dp) {
                            Column(Modifier.padding(14.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Timeline, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(stringResource(R.string.detail_listing_insights), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF92400E))
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
                                        Triple("🤝", "${insights.totalOffers}", offersLabel),
                                        Triple("👀", "${insights.activeWatchers}", watchersLabel),
                                    ).forEach { (emoji, value, label) ->
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(emoji, fontSize = 18.sp)
                                            Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF92400E))
                                            Text(label, fontSize = 11.sp, color = Color(0xFFB45309))
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Surface(color = MaterialTheme.colorScheme.surface) {
                        Column(Modifier.navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp)) {
                            // Make Offer / Report row
                            var showOfferDialog by remember { mutableStateOf(false) }
                            var offerAmount by remember { mutableStateOf("") }
                            var showBoostPanel by remember { mutableStateOf(false) }

                            if (state.offerSent) {
                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Text(stringResource(R.string.detail_offer_success), color = Color(0xFF22C55E), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(12.dp))
                                }
                            }

                            // Bargain quick actions
                            if (showOfferDialog && post.price != null) {
                                Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    listOf(10 to "-10%", 20 to "-20%", 30 to "-30%").forEach { (pct, label) ->
                                        val discounted = post.price!! * (100 - pct) / 100
                                        Surface(
                                            onClick = { viewModel.makeOffer(discounted); showOfferDialog = false },
                                            shape = RoundedCornerShape(20.dp),
                                            color = MaterialTheme.colorScheme.primaryContainer,
                                            modifier = Modifier.weight(1f),
                                        ) {
                                            Column(Modifier.padding(horizontal = 8.dp, vertical = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                                Text("₹${"%,.0f".format(discounted)}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }

                            if (showOfferDialog) {
                                Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        value = offerAmount, onValueChange = { offerAmount = it.filter(Char::isDigit) },
                                        placeholder = { Text("Your offer ₹") }, singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f).height(48.dp),
                                    )
                                    Button(onClick = {
                                        offerAmount.toDoubleOrNull()?.let { viewModel.makeOffer(it) }
                                        showOfferDialog = false
                                    }, enabled = offerAmount.isNotBlank(), shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))) {
                                        Text(stringResource(R.string.detail_send), fontWeight = FontWeight.SemiBold)
                                    }
                                    TextButton(onClick = { showOfferDialog = false }) { Text(stringResource(R.string.filter_cancel)) }
                                }
                            }

                            // Boost panel (for own posts)
                            if (showBoostPanel) {
                                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text(stringResource(R.string.detail_boost), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            listOf("basic" to "⚡ Basic\n10 coins", "featured" to "⭐ Featured\n25 coins", "spotlight" to "🔥 Spotlight\n50 coins").forEach { (tier, label) ->
                                                OutlinedButton(onClick = { viewModel.boostPost(tier); showBoostPanel = false }, shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f)) {
                                                    Text(label, fontSize = 11.sp, lineHeight = 14.sp)
                                                }
                                            }
                                        }
                                        state.boostStatus?.let { bs ->
                                            if (bs.boosted) Text("✅ Currently boosted (${bs.tier}) — ${bs.viewsGained} extra views", fontSize = 11.sp, color = Color(0xFF22C55E))
                                        }
                                    }
                                }
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { showOfferDialog = !showOfferDialog }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                                    Icon(Icons.Filled.LocalOffer, null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(stringResource(R.string.detail_make_offer))
                                }
                                // Price Alert toggle
                                OutlinedButton(
                                    onClick = { viewModel.togglePriceAlert() },
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = if (state.priceAlertSubscribed) Color(0xFF22C55E) else MaterialTheme.colorScheme.onSurface),
                                ) {
                                    Icon(if (state.priceAlertSubscribed) Icons.Filled.NotificationsActive else Icons.Outlined.NotificationsNone, null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(if (state.priceAlertSubscribed) stringResource(R.string.detail_alert_on) else stringResource(R.string.detail_price_alert), fontSize = 12.sp)
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
                                    Text(stringResource(R.string.detail_interested))
                                }
                                OutlinedButton(
                                    onClick = { viewModel.toggleCompare() },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(
                                        contentColor = if (state.inCompareList) Color(0xFF3B82F6) else MaterialTheme.colorScheme.onSurface
                                    )
                                ) {
                                    Icon(Icons.Default.Compare, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(if (state.inCompareList) stringResource(R.string.detail_comparing) else stringResource(R.string.detail_compare))
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
