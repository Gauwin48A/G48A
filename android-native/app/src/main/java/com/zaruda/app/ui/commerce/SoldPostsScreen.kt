package com.zaruda.app.ui.commerce

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.R
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.JwtHelper
import com.zaruda.app.data.local.TokenStore
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.components.AppErrorState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Map a UserSoldPostV1 (from the v1 API) to the domain Post model. */
private fun UserSoldPostV1.toDomainPost(): Post = Post(
    id = id ?: saleId,
    postId = postId,
    title = displayTitle,
    price = displayPrice,
    images = images ?: emptyList(),
    imageUrl = imageUrl,
    createdAt = createdAt ?: saleDate,
    viewCount = viewsCount,
    viewsCount = viewsCount,
    likeCount = likes,
    likesApi = likes,
    userId = userId,
    userName = userName ?: sellerName,
    sellerName = sellerName ?: userName,
    categoryName = categoryName,
    location = location,
    status = status,
)

// ──────────────────────────────────────────────────────────────────────────────
// UI state
// ──────────────────────────────────────────────────────────────────────────────

/** A sold listing plus the genuine buyer review left after the sale completed. */
data class SoldPostItem(
    val post: Post,
    val saleId: String? = null,
    val buyerRating: Double? = null,
    val buyerComment: String? = null,
    val buyerName: String? = null,
    val ratedAt: String? = null,
    val ratingStars: String? = null,
    val saleDate: String? = null,
) {
    val hasReview: Boolean get() = buyerRating != null
}

/** Seller trust passport — shown at the top of a user's sold posts page. */
data class SellerSummary(
    val sellerId: String? = null,
    val sellerName: String? = null,
    val avatarUrl: String? = null,
    val isKycVerified: Boolean = false,
    val totalSold: Int = 0,
    val averageRating: Double = 0.0,
    val starString: String? = null,
    val trustScore: Int = 0,
    val trustBadge: String? = null,
) {
    val initials: String get() = (sellerName ?: "S").take(2).uppercase()
}

data class SoldPostsUiState(
    val loading: Boolean = true,
    val items: List<SoldPostItem> = emptyList(),
    val seller: SellerSummary? = null,
    val isUserSpecific: Boolean = false,
    val error: String? = null,
    // Currently-active listings of the seller (trust page second tab)
    val activeListings: List<Post> = emptyList(),
    val activeLoading: Boolean = false,
)

private fun UserSoldPostV1.toSoldPostItem(): SoldPostItem = SoldPostItem(
    post = toDomainPost(),
    saleId = saleId,
    buyerRating = buyerRating,
    buyerComment = buyerComment,
    buyerName = buyerName,
    ratedAt = ratedAt,
    ratingStars = ratingStars,
    saleDate = saleDate,
)

// ──────────────────────────────────────────────────────────────────────────────
// ViewModel
// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class SoldPostsViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val purchaseReviewRepo: PurchaseReviewRepositoryV1,
    private val tokenStore: TokenStore,
    private val localeManager: com.zaruda.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(SoldPostsUiState())
    val state: StateFlow<SoldPostsUiState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L

    /** User ID to fetch sold posts for (null = current logged-in user). */
    private var targetUserId: String? = null

    /** Optional category filter. */
    private var targetCategory: String? = null

    /** Tracks whether setParams() has been called at least once. */
    private var paramsInitialized = false

    /** Current logged-in user id (from the JWT) — used to resolve the own-sold route. */
    private val currentUserId: String? = run {
        val token = tokenStore.accessToken.value ?: return@run null
        JwtHelper.extractClaim(token, "sub")
            ?: JwtHelper.extractClaim(token, "userId")
            ?: JwtHelper.extractClaim(token, "id")
    }

    init {
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load() }
                lastLocaleVersion = version
            }
        }
    }

    fun setParams(userId: String?, category: String?) {
        val changed = !paramsInitialized || targetUserId != userId || targetCategory != category
        targetUserId = userId
        targetCategory = category
        paramsInitialized = true
        if (changed) load()
    }

    /** Load the seller's currently-active listings for the trust page second tab. */
    fun loadActiveListings() {
        val uid = targetUserId ?: currentUserId ?: return
        _state.update { it.copy(activeLoading = true) }
        viewModelScope.launch {
            when (val r = repo.postsByAuthor(uid, limit = 100)) {
                is ApiResult.Success -> _state.update { it.copy(activeLoading = false, activeListings = r.data) }
                is ApiResult.Failure -> _state.update { it.copy(activeLoading = false) }
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            _state.value = SoldPostsUiState(loading = true)
            // Prefer the target user id; fall back to the logged-in user for the legacy SOLD_POSTS route.
            val uid = targetUserId ?: currentUserId
            if (uid != null) {
                when (val r = purchaseReviewRepo.getUserSoldPosts(uid, category = targetCategory)) {
                    is ApiResult.Success -> {
                        val data = r.data
                        val items = data.items.map { it.toSoldPostItem() }
                        val seller = SellerSummary(
                            sellerId = data.sellerId,
                            sellerName = data.sellerName,
                            avatarUrl = data.avatarUrl,
                            isKycVerified = data.isKycVerified,
                            totalSold = data.totalSold,
                            averageRating = data.averageRating,
                            starString = data.starString,
                            trustScore = data.trustScore,
                            trustBadge = data.trustBadge,
                        )
                        _state.value = SoldPostsUiState(
                            loading = false,
                            items = items,
                            seller = seller,
                            isUserSpecific = targetUserId != null,
                            error = null,
                        )
                    }
                    is ApiResult.Failure -> {
                        _state.value = SoldPostsUiState(
                            loading = false,
                            items = _state.value.items,
                            seller = _state.value.seller,
                            isUserSpecific = _state.value.isUserSpecific,
                            error = r.error.message,
                        )
                    }
                }
                loadActiveListings()
            } else {
                // No session — legacy current-user sold posts (title-only fallback).
                when (val r = repo.sold()) {
                    is ApiResult.Success -> _state.value = SoldPostsUiState(
                        loading = false,
                        items = r.data.map { SoldPostItem(post = it) },
                    )
                    is ApiResult.Failure -> _state.value = SoldPostsUiState(
                        loading = false,
                        items = _state.value.items,
                        error = r.error.message,
                    )
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun SoldPostsScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    userId: String? = null,
    category: String? = null,
    viewModel: SoldPostsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(userId, category) {
        viewModel.setParams(userId, category)
    }
    SoldPostsListScreen(
        state = state,
        onBack = onBack,
        onOpenPost = onOpenPost,
        onRetry = viewModel::load,
    )
}

@Composable
private fun SoldPostsListScreen(
    state: SoldPostsUiState,
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    onRetry: () -> Unit,
) {
    var search by remember { mutableStateOf("") }
    var sortBy by remember { mutableStateOf("newest") }
    var activeTab by remember { mutableStateOf(0) }
    val displayed = remember(state.items, search, sortBy) {
        var list = state.items
        if (search.isNotBlank()) list = list.filter {
            it.post.displayTitle.contains(search, true) || (it.buyerName ?: "").contains(search, true) || (it.post.location ?: "").contains(search, true)
        }
        when (sortBy) {
            "price_asc" -> list = list.sortedBy { it.post.price ?: 0.0 }
            "price_desc" -> list = list.sortedByDescending { it.post.price ?: 0.0 }
            "rating" -> list = list.sortedByDescending { it.buyerRating ?: 0.0 }
            "views" -> list = list.sortedByDescending { it.post.viewCount ?: 0 }
            else -> list = list.sortedByDescending { it.saleDate ?: it.post.createdAt ?: "" }
        }
        list
    }
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            when {
                state.loading && state.items.isEmpty() -> com.zaruda.app.ui.components.ListShimmer(count = 5, modifier = Modifier.padding(16.dp))
                state.error != null && state.items.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = "Unable to load sold posts",
                        message = state.error ?: "Check your connection and try again.",
                        onRetry = onRetry,
                    )
                }
                else -> {
                    val seller = state.seller
                    if (state.isUserSpecific && seller != null) {
                        SellerPassportHeader(seller = seller, onBack = onBack)
                    }
                    // ── Trust page tabs: Sold & Reviewed / Active Listings ──
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        FilterChip(
                            selected = activeTab == 0,
                            onClick = { activeTab = 0 },
                            label = { Text("Sold & Reviewed (${state.items.size})", fontSize = 11.sp) },
                            shape = RoundedCornerShape(20.dp),
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF059669), selectedLabelColor = Color.White),
                        )
                        FilterChip(
                            selected = activeTab == 1,
                            onClick = { activeTab = 1 },
                            label = { Text("Active Listings (${state.activeListings.size})", fontSize = 11.sp) },
                            shape = RoundedCornerShape(20.dp),
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White),
                        )
                    }
                    if (activeTab == 0) {
                    OutlinedTextField(
                        value = search, onValueChange = { search = it },
                        placeholder = { Text(stringResource(R.string.commerce_search_sales)) },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                        trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8)) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                    )
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp)
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        val sortOptions = listOf(
                            "newest" to stringResource(R.string.commerce_sort_newest),
                            "rating" to stringResource(R.string.commerce_sort_rating),
                            "price_desc" to stringResource(R.string.commerce_sort_price_down),
                            "views" to stringResource(R.string.commerce_sort_views),
                        )
                        sortOptions.forEach { (key, label) ->
                            FilterChip(selected = sortBy == key, onClick = { sortBy = key },
                                label = { Text(label, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                        }
                    }
                    if (displayed.isEmpty()) {
                        EmptyState(icon = { Icon(Icons.Filled.Inventory, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                            title = stringResource(R.string.sold_empty), subtitle = stringResource(R.string.sold_empty_subtitle))
                    } else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            Text(
                                stringResource(R.string.commerce_sales_count, displayed.size),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }
                        items(displayed, key = { it.saleId ?: it.post.stableId }) { item ->
                            PostListItemSold(item) { (item.post.id ?: item.post.postId)?.let(onOpenPost) }
                        }
                    }
                    } else {
                        ActiveListingsTab(state = state, onOpenPost = onOpenPost)
                    }
                }
            }
        }
    }
}

/** Gradient trust passport: avatar, name, KYC + trust badges, score, total sales. */
@Composable
private fun SellerPassportHeader(seller: SellerSummary, onBack: () -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = MaterialTheme.colorScheme.onSurface)
            }
            Text(
                stringResource(R.string.commerce_seller_sold_posts_title, seller.sellerName ?: "Seller"),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.linearGradient(listOf(Color(0xFF059669), Color(0xFF0D9488))))
                    .padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Box(
                        modifier = Modifier.size(60.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.22f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (seller.avatarUrl != null) {
                            AsyncImage(model = seller.avatarUrl, contentDescription = null, contentScale = ContentScale.Crop,
                                modifier = Modifier.size(60.dp).clip(CircleShape))
                        } else {
                            Text(seller.initials, fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color.White)
                        }
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(seller.sellerName ?: "Seller", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color.White)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            if (seller.isKycVerified) {
                                Surface(shape = RoundedCornerShape(6.dp), color = Color.White.copy(alpha = 0.2f)) {
                                    Row(Modifier.padding(horizontal = 6.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                        Icon(Icons.Filled.Verified, null, tint = Color(0xFFBBF7D0), modifier = Modifier.size(12.dp))
                                        Text(stringResource(R.string.commerce_seller_kyc_verified), fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD1FAE5))
                                    }
                                }
                            }
                            if (!seller.trustBadge.isNullOrBlank()) {
                                Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFFFF7ED).copy(alpha = 0.9f)) {
                                    Text(seller.trustBadge, fontSize = 9.sp, fontWeight = FontWeight.Black, color = Color(0xFF92400E), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                }
                            }
                        }
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("${seller.trustScore}", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color.White)
                        Text(stringResource(R.string.commerce_seller_trust_score), fontSize = 10.sp, color = Color.White.copy(alpha = 0.85f))
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(seller.starString ?: "—", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFDE047))
                        Text(stringResource(R.string.commerce_seller_avg_rating, "%.1f".format(seller.averageRating)), fontSize = 10.sp, color = Color.White.copy(alpha = 0.85f))
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("${seller.totalSold}", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color.White)
                        Text(stringResource(R.string.commerce_seller_total_sold), fontSize = 10.sp, color = Color.White.copy(alpha = 0.85f))
                    }
                }
            }
        }
    }
}

@Composable
private fun PostListItemSold(item: SoldPostItem, onClick: () -> Unit) {
    val post = item.post
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(
                    model = post.primaryImage,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant)
                )
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(post.displayTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("₹${post.price?.toLong() ?: 0}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                    item.saleDate?.take(10)?.let { date ->
                        Text(stringResource(R.string.commerce_sold_on_date, date), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7)) {
                    Text("SOLD", fontSize = 9.sp, fontWeight = FontWeight.Black, color = Color(0xFF16A34A), modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.Visibility, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${post.viewCount ?: 0}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.Favorite, null, modifier = Modifier.size(14.dp), tint = Color(0xFFEF4444))
                    Text("${post.likeCount ?: 0}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.weight(1f))
                Text(post.createdAt?.take(10) ?: "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            // ── Buyer review block — the genuine trust signal ──
            BuyerReviewBlock(item)
        }
    }
}

@Composable
private fun BuyerReviewBlock(item: SoldPostItem) {
    if (item.hasReview) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
        ) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        item.ratingStars?.takeIf { it.isNotBlank() }
                            ?: "★".repeat((item.buyerRating ?: 0.0).toInt().coerceIn(0, 5)),
                        fontSize = 16.sp,
                        color = Color(0xFFF59E0B),
                    )
                    Text(
                        stringResource(R.string.commerce_buyer_rating_value, String.format(java.util.Locale.US, "%.1f", item.buyerRating ?: 0.0)),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                if (!item.buyerName.isNullOrBlank()) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(
                            modifier = Modifier.size(22.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text((item.buyerName.take(1).uppercase()), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                        }
                        Text(stringResource(R.string.commerce_reviewed_by_buyer, item.buyerName), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        item.ratedAt?.take(10)?.let { date ->
                            Text("· $date", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                if (!item.buyerComment.isNullOrBlank()) {
                    Text(item.buyerComment, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface, maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    } else {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(Icons.Filled.StarBorder, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(14.dp))
            Text(stringResource(R.string.commerce_not_rated_yet), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Active Listings tab — everything the seller is currently selling
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun ActiveListingsTab(state: SoldPostsUiState, onOpenPost: (String) -> Unit) {
    when {
        state.activeLoading && state.activeListings.isEmpty() -> {
            Box(Modifier.fillMaxSize().padding(top = 24.dp), contentAlignment = Alignment.TopCenter) {
                CircularProgressIndicator(modifier = Modifier.size(28.dp))
            }
        }
        state.activeListings.isEmpty() -> {
            Box(Modifier.fillMaxSize().padding(top = 24.dp), contentAlignment = Alignment.TopCenter) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.Storefront, null, modifier = Modifier.size(44.dp), tint = Color(0xFFCBD5E1))
                    Spacer(Modifier.height(8.dp))
                    Text("No active listings right now", color = Color.Gray, fontSize = 13.sp)
                }
            }
        }
        else -> LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    stringResource(R.string.commerce_sales_count, state.activeListings.size),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            items(state.activeListings, key = { it.stableId }) { post ->
                ActiveListingCard(post) { (post.id ?: post.postId)?.let(onOpenPost) }
            }
        }
    }
}

@Composable
private fun ActiveListingCard(post: Post, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AsyncImage(
                model = post.primaryImage,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
            )
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(post.displayTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("₹${post.price?.toLong() ?: 0}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                post.location?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7)) {
                Text("ACTIVE", fontSize = 9.sp, fontWeight = FontWeight.Black, color = Color(0xFF16A34A), modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
            }
        }
    }
}
