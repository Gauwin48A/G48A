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
import androidx.hilt.navigation.compose.hiltViewModel
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
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
                title = { Text("Listing", fontWeight = FontWeight.Bold) },
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
                    title = "Unable to open listing",
                    message = state.error ?: "Unable to load listing",
                    onRetry = { viewModel.reload() },
                    retryLabel = "Reload listing",
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
                    title = "Listing not available",
                    subtitle = "This listing may have been removed.",
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
                val sectionLabels = listOf("Overview", "Details", "Specs", "Trust", "Description", "Seller")

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                ) {
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
                                }

                                if (images.size > 1) {
                                    AssistChip(
                                        onClick = { zoomImageIndex = pagerState.currentPage; showImageZoom = true },
                                        label = { Text("${pagerState.currentPage + 1}/${images.size} · Tap to zoom") },
                                        modifier = Modifier.align(Alignment.BottomEnd).padding(10.dp),
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
                                        AssistChip(onClick = {}, label = { Text(name) })
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
                                }

                                post.description?.takeIf { it.isNotBlank() }?.let {
                                    var expanded by remember { mutableStateOf(false) }
                                    Column {
                                        Text(
                                            text = "Description",
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
                                                Text(if (expanded) "Show less" else "Read more")
                                            }
                                        }
                                    }
                                }

                                // Specifications table
                                val specs = remember(post) {
                                    buildList {
                                        post.condition?.let { add("Condition" to it.replaceFirstChar(Char::uppercase)) }
                                        post.brand?.let { add("Brand" to it) }
                                        post.location?.let { add("Location" to it) }
                                        post.price?.let { add("Price" to "₹${"%,.0f".format(it)}") }
                                        post.categoryName?.let { add("Category" to it) }
                                    }
                                }
                                if (specs.isNotEmpty()) {
                                    Card(
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text("Specifications", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
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
                                    EngagementChip("👁", "${post.viewCount ?: 0}", "Views")
                                    EngagementChip("❤️", "${post.likeCount ?: 0}", "Likes")
                                    EngagementChip("🔗", "0", "Shares")
                                }

                                // Trust Score Badge
                                state.trustScore?.let { ts ->
                                    val score = ts.trustScore.toInt()
                                    val trustColor = when { score >= 80 -> Color(0xFF22C55E); score >= 50 -> Color(0xFFF59E0B); else -> Color(0xFFEF4444) }
                                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = trustColor.copy(alpha = 0.1f)), modifier = Modifier.fillMaxWidth()) {
                                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.VerifiedUser, null, tint = trustColor, modifier = Modifier.size(22.dp))
                                            Spacer(Modifier.width(8.dp))
                                            Column {
                                                Text("Trust Score: $score/100", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = trustColor)
                                                Text(ts.trustLabel ?: when { score >= 80 -> "Highly Trusted"; score >= 50 -> "Trusted"; else -> "New Seller" }, fontSize = 12.sp, color = trustColor.copy(alpha = 0.8f))
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
                                    Text("Similar Listings", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
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
                                                Text("Seller", style = MaterialTheme.typography.labelMedium)
                                                Text(it, fontWeight = FontWeight.SemiBold)
                                            }
                                            OutlinedButton(onClick = {
                                                val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:+91"))
                                                context.startActivity(dialIntent)
                                            }) {
                                                Icon(Icons.Default.Call, contentDescription = null)
                                                Spacer(Modifier.width(6.dp))
                                                Text("Call")
                                            }
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
                                    Text("Offer sent successfully!", color = Color(0xFF22C55E), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(12.dp))
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
                                        Text("Send", fontWeight = FontWeight.SemiBold)
                                    }
                                    TextButton(onClick = { showOfferDialog = false }) { Text("Cancel") }
                                }
                            }

                            // Boost panel (for own posts)
                            if (showBoostPanel) {
                                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("Boost Your Listing", fontWeight = FontWeight.Bold, fontSize = 14.sp)
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
                                    Text("Make Offer")
                                }
                                // Price Alert toggle
                                OutlinedButton(
                                    onClick = { viewModel.togglePriceAlert() },
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = if (state.priceAlertSubscribed) Color(0xFF22C55E) else MaterialTheme.colorScheme.onSurface),
                                ) {
                                    Icon(if (state.priceAlertSubscribed) Icons.Filled.NotificationsActive else Icons.Outlined.NotificationsNone, null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(if (state.priceAlertSubscribed) "Alert On" else "Price Alert", fontSize = 12.sp)
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
                                OutlinedButton(onClick = { showBoostPanel = !showBoostPanel }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                                    Icon(Icons.Default.Bolt, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Boost")
                                }
                                Button(onClick = {}, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                                    Icon(Icons.Default.ShoppingBag, contentDescription = null)
                                    Spacer(Modifier.width(6.dp))
                                    Text("Buy")
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
