package com.mhub.app.ui.foryou

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.mhub.app.R
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.SponsoredRepository
import com.mhub.app.data.repository.RecommendationsRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.CartRepository
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.data.repository.ProfileRepository
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.BackToTopButton
import com.mhub.app.ui.components.GreatDealsBanner
import com.mhub.app.ui.components.ShareLinkBottomSheet
import com.mhub.app.ui.components.BuyerInterestModal
import com.mhub.app.ui.components.PostActionRow
import com.mhub.app.ui.components.PromoBadgeRow
import com.mhub.app.ui.components.ImageZoomDialog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.Stable
import javax.inject.Inject

private val MOCK_FOR_YOU_POSTS: List<com.mhub.app.domain.model.Post> = listOf(
    com.mhub.app.domain.model.Post(id = "fy_1", title = "iPhone 14 Pro Max 256GB", description = "Excellent condition, used for 6 months. Original box included. No scratches.", price = 82000.0, categoryName = "Electronics", condition = "Like New", city = "Mumbai", createdAt = "2024-01-15T10:00:00Z", likeCount = 45, viewCount = 890, sellerVerified = true),
    com.mhub.app.domain.model.Post(id = "fy_2", title = "Royal Enfield Classic 350 2022", description = "Single owner, all service records available. Mileage: 12,000 km.", price = 165000.0, categoryName = "Vehicles", condition = "Good", city = "Bangalore", createdAt = "2024-01-14T09:00:00Z", likeCount = 78, viewCount = 1450),
    com.mhub.app.domain.model.Post(id = "fy_3", title = "Wooden Study Table 4ft", description = "Solid wood table, 2 drawers, good for home office or kids study.", price = 4500.0, categoryName = "Furniture", condition = "Good", city = "Delhi", createdAt = "2024-01-13T14:00:00Z", likeCount = 23, viewCount = 340),
    com.mhub.app.domain.model.Post(id = "fy_4", title = "HP Pavilion Laptop i5 11th Gen", description = "8GB RAM, 512GB SSD, Windows 11. Perfect for professionals and students.", price = 38000.0, categoryName = "Electronics", brand = "HP", condition = "Like New", city = "Hyderabad", createdAt = "2024-01-12T11:00:00Z", likeCount = 67, viewCount = 1200),
    com.mhub.app.domain.model.Post(id = "fy_5", title = "Designer Saree Collection", description = "Set of 3 Banarasi silk sarees, worn once each for family events. Beautiful colors.", price = 8500.0, categoryName = "Fashion", condition = "Good", city = "Kolkata", createdAt = "2024-01-11T16:00:00Z", likeCount = 112, viewCount = 2300),
    com.mhub.app.domain.model.Post(id = "fy_6", title = "Sony 43 inch 4K Smart TV", description = "2 year old, excellent picture quality. All smart features working. Original remote.", price = 22000.0, categoryName = "Electronics", brand = "Sony", condition = "Good", city = "Pune", createdAt = "2024-01-10T10:00:00Z", likeCount = 56, viewCount = 980),
    com.mhub.app.domain.model.Post(id = "fy_7", title = "Honda Activa 6G 2023", description = "Only 5000 km driven. Insurance valid till 2025. All documents clear.", price = 68000.0, categoryName = "Vehicles", condition = "Like New", city = "Chennai", createdAt = "2024-01-09T13:00:00Z", likeCount = 89, viewCount = 1870),
    com.mhub.app.domain.model.Post(id = "fy_8", title = "Yoga Mat Premium Anti-slip", description = "Thick 6mm NBR mat, perfect for home workouts. Used 3 times only.", price = 800.0, categoryName = "Others", condition = "Like New", city = "Ahmedabad", createdAt = "2024-01-08T08:00:00Z", likeCount = 34, viewCount = 560),
)

enum class SortBy { RELEVANCE, PRICE_ASC, PRICE_DESC, NEWEST, OLDEST, POPULAR, TRENDING, MOST_VIEWED, FEATURED_FIRST, PREMIUM_FIRST }
enum class PageDensity { COMPACT, NORMAL, SPACIOUS }

@Stable
data class ForYouState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val posts: List<Post> = emptyList(),
    val sponsored: List<Post> = emptyList(),
    val error: String? = null,
    val selectedCategory: String? = null,
    val sortBy: SortBy = SortBy.RELEVANCE,
    val sortAscending: Boolean = true,
    val currentPage: Int = 1,
    val hasMorePosts: Boolean = true,
    val compareItems: Set<String> = emptySet(),
    val cartItems: Set<String> = emptySet(),
    /** Loaded from API: null key = "All" */
    val categories: List<Pair<String?, String>> = listOf(null to "All"),
)

@HiltViewModel
class ForYouViewModel @Inject constructor(
    private val sponsoredRepo: SponsoredRepository,
    private val recommendationsRepo: RecommendationsRepository,
    private val postsRepo: PostsRepository,
    private val cartRepo: CartRepository,
    private val categoriesRepo: CategoriesRepository,
    private val profileRepo: ProfileRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(ForYouState())
    val state: StateFlow<ForYouState> = _state.asStateFlow()
    private val viewedPostIds = mutableSetOf<String>()
    private var batchViewJob: Job? = null
    private var lastLocaleVersion = 0L

    init {
        load()
        loadCategories()
        loadCart()
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load() }
                lastLocaleVersion = version
            }
        }
    }

    /**
     * Load For You posts with three-tier fallback matching web app ForYou.jsx:
     *   1. /api/recommendations — personalised recommendations
     *   2. /api/profile/preferences → preferred categories → /api/posts filtered by those
     *   3. /api/posts/feed — general feed as last resort
     */
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            val posts = fetchForYouPosts(page = 1)
            _state.value = _state.value.copy(loading = false, posts = posts)
            when (val s = sponsoredRepo.list(8)) {
                is ApiResult.Success -> _state.value = _state.value.copy(sponsored = s.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true, error = null)
        viewModelScope.launch {
            val posts = fetchForYouPosts(page = 1)
            _state.value = _state.value.copy(refreshing = false, posts = posts)
            when (val s = sponsoredRepo.list(8)) {
                is ApiResult.Success -> _state.value = _state.value.copy(sponsored = s.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    /** Centralised three-tier fetch logic so load() and refresh() stay DRY. */
    private suspend fun fetchForYouPosts(page: Int): List<Post> {
        // Tier 1: GET /recommendations — personalised recommendations (web parity: ForYou.jsx tries this first)
        when (val r = recommendationsRepo.forYou()) {
            is ApiResult.Success -> if (r.data.isNotEmpty()) return r.data
            is ApiResult.Failure -> {}
        }
        // Tier 1b: GET /posts/for-you fallback (web parity: requestWithFallback pattern)
        when (val r = sponsoredRepo.forYou(limit = 30, page = page)) {
            is ApiResult.Success -> if (r.data.isNotEmpty()) return r.data
            is ApiResult.Failure -> {}
        }
        // Tier 2: preference-filtered posts (web app: fetchUserPreferencesCached)
        val preferredCategoryId: String? = when (val pref = profileRepo.preferences()) {
            is ApiResult.Success -> pref.data.categories?.firstOrNull()
            is ApiResult.Failure -> null
        }
        if (preferredCategoryId != null) {
            when (val r = postsRepo.feed(page = page, limit = 30, categoryId = preferredCategoryId)) {
                is ApiResult.Success -> if (r.data.isNotEmpty()) return r.data
                is ApiResult.Failure -> {}
            }
        }
        // Tier 3: general feed fallback
        return when (val f = postsRepo.feed(limit = 30)) {
            is ApiResult.Success -> f.data
            is ApiResult.Failure -> MOCK_FOR_YOU_POSTS
        }
    }

    fun setCategory(cat: String?) {
        _state.value = _state.value.copy(selectedCategory = cat)
    }

    private fun loadCategories() {
        viewModelScope.launch {
            when (val r = categoriesRepo.all()) {
                is ApiResult.Success -> {
                    val apiCats = r.data.map { cat -> cat.slug to (cat.name ?: cat.slug.orEmpty()) }
                    val all = listOf<Pair<String?, String>>(null to "All") + apiCats.take(12)
                    _state.value = _state.value.copy(categories = all)
                }
                is ApiResult.Failure -> {} // keep default
            }
        }
    }

    fun setSortBy(sort: SortBy) {
        _state.value = _state.value.copy(sortBy = sort)
    }

    fun toggleSortDirection() {
        _state.value = _state.value.copy(sortAscending = !_state.value.sortAscending)
    }

    fun loadMore() {
        if (!_state.value.hasMorePosts || _state.value.loading) return
        viewModelScope.launch {
            val nextPage = _state.value.currentPage + 1
            when (val r = sponsoredRepo.forYou(limit = 30, page = nextPage)) {
                is ApiResult.Success -> {
                    val existingIds = _state.value.posts.map { it.stableId }.toSet()
                    val deduped = r.data.filter { it.stableId !in existingIds }
                    _state.value = _state.value.copy(
                        posts = _state.value.posts + deduped,
                        currentPage = nextPage,
                        hasMorePosts = r.data.size >= 30
                    )
                }
                is ApiResult.Failure -> {}
            }
        }
    }

    fun markPostViewed(postId: String) {
        viewedPostIds.add(postId)
        if (batchViewJob == null) {
            batchViewJob = viewModelScope.launch {
                delay(5000)
                if (viewedPostIds.isNotEmpty()) {
                    postsRepo.batchView(viewedPostIds.toList())
                    viewedPostIds.clear()
                }
                batchViewJob = null
            }
        }
    }

    fun toggleBookmark(postId: String) {
        viewModelScope.launch {
            postsRepo.toggleWishlist(postId)
        }
    }

    fun toggleCompare(postId: String) {
        val current = _state.value.compareItems.toMutableSet()
        if (current.contains(postId)) current.remove(postId) else if (current.size < 4) current.add(postId)
        _state.value = _state.value.copy(compareItems = current)
        viewModelScope.launch {
            if (postId in current) postsRepo.addToCompare(postId) else postsRepo.removeFromCompare(postId)
        }
    }

    fun addToCompare(postId: String) {
        viewModelScope.launch { postsRepo.addToCompare(postId) }
    }

    fun clearCompare() {
        _state.value = _state.value.copy(compareItems = emptySet())
        viewModelScope.launch { postsRepo.clearCompare() }
    }

    fun toggleCart(postId: String) {
        val removing = postId in _state.value.cartItems
        val updated = _state.value.cartItems.toMutableSet().apply {
            if (removing) remove(postId) else add(postId)
        }
        _state.value = _state.value.copy(cartItems = updated)
        viewModelScope.launch {
            val result = if (removing) cartRepo.remove(postId) else cartRepo.add(postId)
            if (result is ApiResult.Failure) {
                val rollback = _state.value.cartItems.toMutableSet().apply {
                    if (removing) add(postId) else remove(postId)
                }
                _state.value = _state.value.copy(cartItems = rollback)
            }
        }
    }

    private fun loadCart() {
        viewModelScope.launch {
            when (val result = cartRepo.get()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    cartItems = result.data.items.mapNotNull { it.postId }.toSet(),
                )
                is ApiResult.Failure -> Unit
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForYouScreen(
    onOpenPost: (String) -> Unit,
    isGuest: Boolean = false,
    onNavigateToLogin: () -> Unit = {},
    onOpenCompare: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    viewModel: ForYouViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val categories = state.categories

    var quickFilter by remember { mutableStateOf<String?>(null) }
    var timeFilter by remember { mutableStateOf<String?>(null) }
    var minPrice by remember { mutableStateOf("") }
    var maxPrice by remember { mutableStateOf("") }
    var verifiedOnly by remember { mutableStateOf(false) }
    var showShareSheet by remember { mutableStateOf(false) }
    var sharePostId by remember { mutableStateOf("") }
    var sharePostTitle by remember { mutableStateOf("") }
    var showInterestModal by remember { mutableStateOf(false) }
    var interestPostId by remember { mutableStateOf("") }
    var interestPostTitle by remember { mutableStateOf("") }
    var zoomImages by remember { mutableStateOf<List<String>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var density by rememberSaveable { mutableStateOf(PageDensity.NORMAL) }
    var sortMenuExpanded by remember { mutableStateOf(false) }
    var hiddenPostIds by remember { mutableStateOf(emptySet<String>()) }
    var isGridView by rememberSaveable { mutableStateOf(false) }

    if (showShareSheet) {
        ShareLinkBottomSheet(title = sharePostTitle, postId = sharePostId, onDismiss = { showShareSheet = false })
    }
    if (showInterestModal) {
        BuyerInterestModal(
            postId = interestPostId, postTitle = interestPostTitle,
            onDismiss = { showInterestModal = false },
            onSubmit = { _, _, _ -> showInterestModal = false },
        )
    }
    if (zoomImages.isNotEmpty()) {
        ImageZoomDialog(imageUrls = zoomImages, onDismiss = { zoomImages = emptyList() })
    }

    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo }
            .collect { visibleItems ->
                visibleItems.forEach { item ->
                    val post = state.posts.getOrNull(item.index - 7)
                    post?.let { viewModel.markPostViewed(it.stableId) }
                }
            }
    }

    val displayed = remember(state.posts, state.selectedCategory, quickFilter, timeFilter, searchQuery, state.sortBy, state.sortAscending, minPrice, maxPrice, verifiedOnly, hiddenPostIds) {
        state.posts
            .filter { post -> post.stableId !in hiddenPostIds }
            .filter { post ->
                state.selectedCategory == null || post.categoryName?.contains(state.selectedCategory!!, ignoreCase = true) == true
            }
            .filter { post ->
                searchQuery.isBlank() || post.displayTitle.contains(searchQuery, ignoreCase = true) || post.description?.contains(searchQuery, ignoreCase = true) == true
            }
            .let { list ->
                // Price range filter (web parity)
                val min = minPrice.toDoubleOrNull()
                val max = maxPrice.toDoubleOrNull()
                if (min != null || max != null) {
                    list.filter { post ->
                        val p = post.price ?: return@filter true
                        (min == null || p >= min) && (max == null || p <= max)
                    }
                } else list
            }
            .let { list ->
                // Verified-only filter (web parity)
                if (verifiedOnly) list.filter { it.sellerVerified == true } else list
            }
            .let { list ->
                when (quickFilter) {
                    "Under ₹500" -> list.filter { (it.price ?: Double.MAX_VALUE) < 500.0 }
                    "Under ₹1000" -> list.filter { (it.price ?: Double.MAX_VALUE) < 1000.0 }
                    "Trending" -> list.sortedByDescending { it.viewCount ?: 0 }
                    "New Arrivals" -> list.sortedByDescending { it.createdAt ?: "" }
                    "Latest 10" -> list.sortedByDescending { it.createdAt ?: "" }.take(10)
                    "Latest 50" -> list.sortedByDescending { it.createdAt ?: "" }.take(50)
                    else -> list
                }
            }
            .let { list ->
                val sorted = when (state.sortBy) {
                    SortBy.RELEVANCE -> list
                    SortBy.PRICE_ASC -> list.sortedBy { it.price ?: Double.MAX_VALUE }
                    SortBy.PRICE_DESC -> list.sortedByDescending { it.price ?: 0.0 }
                    SortBy.NEWEST -> list.sortedByDescending { it.createdAt ?: "" }
                    SortBy.OLDEST -> list.sortedBy { it.createdAt ?: "" }
                    SortBy.POPULAR -> list.sortedByDescending { (it.likeCount ?: 0) + (it.interestedBuyers ?: 0) * 2 }
                    SortBy.TRENDING -> list.sortedByDescending { (it.viewCount ?: 0) + (it.interestedBuyers ?: 0) * 10 }
                    SortBy.MOST_VIEWED -> list.sortedByDescending { it.viewCount ?: 0 }
                    SortBy.FEATURED_FIRST -> list.sortedBy { if (it.promoLabel == "featured") 0 else 1 }
                    SortBy.PREMIUM_FIRST -> list.sortedBy { if (it.tier == "premium") 0 else 1 }
                }
                if (state.sortAscending) sorted else sorted.reversed()
            }
            .let { list ->
                if (timeFilter == null) list
                else {
                    val nowMs = System.currentTimeMillis()
                    val cutoffMs = when (timeFilter) {
                        "Today" -> nowMs - 24L * 60 * 60 * 1000
                        "Week" -> nowMs - 7L * 24 * 60 * 60 * 1000
                        "Month" -> nowMs - 30L * 24 * 60 * 60 * 1000
                        else -> 0L
                    }
                    list.filter { post ->
                        if (post.createdAt.isNullOrBlank()) true
                        else try {
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                                java.time.Instant.parse(post.createdAt).toEpochMilli() >= cutoffMs
                            } else true
                        } catch (_: Exception) { true }
                    }
                }
            }
            .let { list -> if (isGuest) list.take(5) else list }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(stringResource(R.string.foryou_title), fontWeight = FontWeight.Bold)
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.7f),
                            ) {
                                Text(
                                    stringResource(R.string.foryou_ai_curated),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                )
                            }
                        Text(stringResource(R.string.foryou_subtitle), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    IconButton(onClick = { isGridView = !isGridView }) {
                        Icon(if (isGridView) Icons.Default.ViewList else Icons.Default.GridOn, contentDescription = if (isGridView) "List" else "Grid")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        floatingActionButton = { BackToTopButton(listState, scope) },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            when {
                state.loading -> LazyColumn(contentPadding = PaddingValues(vertical = 8.dp)) {
                    items(5, key = { "foryou_shimmer_$it" }) {
                        com.mhub.app.ui.components.ListCardShimmer(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                        )
                    }
                }
                state.error != null && state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Outlined.ErrorOutline, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(12.dp))
                        Text(stringResource(R.string.foryou_error_title), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(4.dp))
                        Text(state.error ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.load() }) { Text(stringResource(R.string.foryou_retry)) }
                    }
                }
                else -> LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = if (state.compareItems.size >= 2) 150.dp else 80.dp),
                ) {
                    // Hero gradient section (web parity: AllPostsFeedHeader)
                    item(key = "for_you_hero") {
                        Box(
                            modifier = Modifier.fillMaxWidth()
                                .background(Brush.horizontalGradient(listOf(Color(0xFF7C3AED), Color(0xFF4F46E5), Color(0xFF2563EB)))),
                        ) {
                            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(Icons.Default.AutoAwesome, null, tint = Color.White.copy(alpha = 0.9f), modifier = Modifier.size(22.dp))
                                    Text(stringResource(R.string.foryou_title), fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Color.White)
                                }
                                Text(stringResource(R.string.foryou_subtitle), fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.15f)) {
                                        Text("✨ AI Curated", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                                    }
                                    Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.1f)) {
                                        Text("📍 Near You", fontSize = 10.sp, color = Color.White, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                                    }
                                    Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.1f)) {
                                        Text("🔥 Top Deals", fontSize = 10.sp, color = Color.White, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                                    }
                                }
                            }
                        }
                    }
                    item { GreatDealsBanner(onShopNow = { quickFilter = "Under ₹500" }, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }

                    item {
                        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text(stringResource(R.string.foryou_search_placeholder), style = MaterialTheme.typography.bodySmall) },
                                leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp)) },
                                trailingIcon = {
                                    if (searchQuery.isNotEmpty()) {
                                        IconButton(onClick = { searchQuery = "" }) {
                                            Icon(Icons.Default.Close, null, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                shape = RoundedCornerShape(12.dp),
                            )
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "${displayed.size} items · ${categories.count { (catKey, catName) -> catKey == null || state.posts.any { p -> p.categoryName?.contains(catName, ignoreCase = true) == true } }} categories · 🔥 Live",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.weight(1f)
                            )
                            Box {
                                val sortLabel = when (state.sortBy) {
                                    SortBy.RELEVANCE -> "✨ Relevance"
                                    SortBy.PRICE_ASC -> "💰 Price ↑"
                                    SortBy.PRICE_DESC -> "💰 Price ↓"
                                    SortBy.NEWEST -> "🕒 Newest"
                                    SortBy.OLDEST -> "🔄 Oldest"
                                    SortBy.POPULAR -> "👁 Popular"
                                    SortBy.TRENDING -> "🔥 Trending"
                                    SortBy.MOST_VIEWED -> "👁 Most Viewed"
                                    SortBy.FEATURED_FIRST -> "⭐ Featured First"
                                    SortBy.PREMIUM_FIRST -> "💎 Premium First"
                                }
                                FilterChip(
                                    selected = state.sortBy != SortBy.RELEVANCE,
                                    onClick = { sortMenuExpanded = true },
                                    label = { Text("Sort: $sortLabel", style = MaterialTheme.typography.labelSmall) },
                                    trailingIcon = { Icon(Icons.Default.ArrowDropDown, null, modifier = Modifier.size(16.dp)) }
                                )
                                DropdownMenu(expanded = sortMenuExpanded, onDismissRequest = { sortMenuExpanded = false }) {
                                    listOf(
                                        SortBy.RELEVANCE to "✨ Relevance",
                                        SortBy.PRICE_ASC to "🔥 Price: Low to High",
                                        SortBy.PRICE_DESC to "🔥 Price: High to Low",
                                        SortBy.NEWEST to "🕒 Newest First",
                                        SortBy.OLDEST to "🔄 Oldest First",
                                        SortBy.POPULAR to "👁 Most Popular",
                                        SortBy.TRENDING to "🔥 Trending",
                                        SortBy.MOST_VIEWED to "👁 Most Viewed",
                                        SortBy.FEATURED_FIRST to "⭐ Featured First",
                                        SortBy.PREMIUM_FIRST to "💎 Premium First",
                                    ).forEach { (sort, label) ->
                                        DropdownMenuItem(
                                            text = { Text(label) },
                                            onClick = {
                                                viewModel.setSortBy(sort)
                                                sortMenuExpanded = false
                                            },
                                            leadingIcon = { if (state.sortBy == sort) Icon(Icons.Default.Check, null) }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = state.sortAscending,
                                onClick = { if (!state.sortAscending) viewModel.toggleSortDirection() },
                                label = { Text(stringResource(R.string.foryou_ascending), style = MaterialTheme.typography.labelSmall) },
                                leadingIcon = { Icon(Icons.Default.ArrowUpward, null, modifier = Modifier.size(14.dp)) }
                            )
                            FilterChip(
                                selected = !state.sortAscending,
                                onClick = { if (state.sortAscending) viewModel.toggleSortDirection() },
                                label = { Text(stringResource(R.string.foryou_descending), style = MaterialTheme.typography.labelSmall) },
                                leadingIcon = { Icon(Icons.Default.ArrowDownward, null, modifier = Modifier.size(14.dp)) }
                            )
                            Spacer(Modifier.weight(1f))
                            FilterChip(
                                selected = density == PageDensity.COMPACT,
                                onClick = { density = PageDensity.COMPACT },
                                label = { Text(stringResource(R.string.foryou_compact), style = MaterialTheme.typography.labelSmall) }
                            )
                            FilterChip(
                                selected = density == PageDensity.NORMAL,
                                onClick = { density = PageDensity.NORMAL },
                                label = { Text(stringResource(R.string.foryou_normal), style = MaterialTheme.typography.labelSmall) }
                            )
                            FilterChip(
                                selected = density == PageDensity.SPACIOUS,
                                onClick = { density = PageDensity.SPACIOUS },
                                label = { Text(stringResource(R.string.foryou_spacious), style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }

                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            // Use index-based keys to avoid crash when API returns category with slug matching fallback key
                            itemsIndexed(categories) { idx, (key, label) ->
                                FilterChip(
                                    selected = state.selectedCategory == key,
                                    onClick = { viewModel.setCategory(key) },
                                    label = { Text(label) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }

                    // ─── Time Window Filter ─────────────────────────────
                    item {
                        val timeOptions = listOf<Pair<String?, String>>(
                            null to "All Time",
                            "Today" to "Today",
                            "Week" to "This Week",
                            "Month" to "This Month",
                        )
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 2.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            items(timeOptions, key = { it.first ?: "all_time" }) { (key, label) ->
                                FilterChip(
                                    selected = timeFilter == key,
                                    onClick = { timeFilter = if (timeFilter == key && key != null) null else key },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.secondaryContainer,
                                        selectedLabelColor = MaterialTheme.colorScheme.onSecondaryContainer,
                                    ),
                                )
                            }
                        }
                    }

                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            val qFilters = listOf(
                                "Under ₹500" to Icons.Default.LocalOffer,
                                "Under ₹1000" to Icons.Default.LocalOffer,
                                "Trending" to Icons.AutoMirrored.Filled.TrendingUp,
                                "New Arrivals" to Icons.Default.NewReleases,
                                "Latest 10" to Icons.Default.FilterList,
                                "Latest 50" to Icons.Default.FilterList,
                            )
                            items(qFilters, key = { it.first }) { (label, icon) ->
                                FilterChip(
                                    selected = quickFilter == label,
                                    onClick = { quickFilter = if (quickFilter == label) null else label },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    leadingIcon = { Icon(icon, null, modifier = Modifier.size(14.dp)) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.tertiary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onTertiary,
                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onTertiary,
                                    ),
                                )
                            }
                            // Clear all filters
                            item {
                                if (quickFilter != null || timeFilter != null || minPrice.isNotBlank() || maxPrice.isNotBlank() || verifiedOnly || searchQuery.isNotBlank()) {
                                    FilterChip(
                                        selected = false,
                                        onClick = { quickFilter = null; timeFilter = null; minPrice = ""; maxPrice = ""; verifiedOnly = false; searchQuery = "" },
                                        label = { Text("✕ Clear", style = MaterialTheme.typography.labelSmall) },
                                        colors = FilterChipDefaults.filterChipColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                                    )
                                }
                            }
                        }
                    }

                    // Price range & verified filter (web parity)
                    item {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            OutlinedTextField(
                                value = minPrice,
                                onValueChange = { minPrice = it.filter { c -> c.isDigit() || c == '.' } },
                                label = { Text("Min ₹") },
                                modifier = Modifier.weight(1f).height(52.dp),
                                textStyle = MaterialTheme.typography.bodySmall,
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            )
                            OutlinedTextField(
                                value = maxPrice,
                                onValueChange = { maxPrice = it.filter { c -> c.isDigit() || c == '.' } },
                                label = { Text("Max ₹") },
                                modifier = Modifier.weight(1f).height(52.dp),
                                textStyle = MaterialTheme.typography.bodySmall,
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            )
                            FilterChip(
                                selected = verifiedOnly,
                                onClick = { verifiedOnly = !verifiedOnly },
                                label = { Text("Verified", style = MaterialTheme.typography.labelSmall) },
                                leadingIcon = { Icon(Icons.Default.Verified, null, modifier = Modifier.size(14.dp)) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,
                                ),
                            )
                        }
                    }

                    if (state.sponsored.isNotEmpty()) {
                        item {
                            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                                Text(stringResource(R.string.foryou_sponsored), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(8.dp))
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    items(state.sponsored, key = { "sp_${it.stableId}" }) { post ->
                                        Card(
                                            onClick = { onOpenPost(post.stableId) },
                                            shape = RoundedCornerShape(14.dp),
                                            modifier = Modifier.width(200.dp),
                                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                            elevation = CardDefaults.cardElevation(2.dp),
                                        ) {
                                            Column {
                                                Box(Modifier.fillMaxWidth().height(120.dp).background(MaterialTheme.colorScheme.surfaceVariant)) {
                                                    post.primaryImage?.let { img ->
                                                        AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clickable { zoomImages = listOf(img) })
                                                    }
                                                    Surface(
                                                        shape = RoundedCornerShape(4.dp),
                                                        color = Color(0xFF7C3AED),
                                                        modifier = Modifier.align(Alignment.TopStart).padding(6.dp),
                                                    ) { Text("⚡ Ad", color = Color.White, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) }
                                                }
                                                Column(Modifier.padding(10.dp)) {
                                                    Text(post.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                                    post.price?.let { Text("₹${"%,.0f".format(it)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary) }
                                                    post.location?.let {
                                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                                            Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(11.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                            Spacer(Modifier.width(2.dp))
                                                            Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                Spacer(Modifier.height(8.dp))
                            }
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF2563EB).copy(alpha = 0.1f)) {
                                Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.AutoAwesome, null, tint = Color(0xFF2563EB), modifier = Modifier.size(14.dp))
                                    Text(stringResource(R.string.foryou_recommended), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF2563EB))
                                }
                            }
                            Spacer(Modifier.weight(1f))
                            Text("${displayed.size} picks", fontSize = 12.sp, color = Color(0xFF64748B))
                        }
                    }

                    // AI Insight Card — explains why these picks are shown
                    item(key = "ai_insight") {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF0F9FF)),
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Surface(shape = CircleShape, color = Color(0xFF2563EB).copy(alpha = 0.12f), modifier = Modifier.size(40.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(Icons.Default.Psychology, null, tint = Color(0xFF2563EB), modifier = Modifier.size(22.dp))
                                    }
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Personalized for you", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E40AF))
                                    Text(
                                        "Based on your browsing history, location, and preferences",
                                        fontSize = 11.sp,
                                        color = Color(0xFF64748B),
                                        lineHeight = 15.sp,
                                    )
                                }
                            }
                        }
                    }

                    if (displayed.isEmpty()) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Outlined.Recommend, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(Modifier.height(8.dp))
                                    Text(stringResource(R.string.foryou_no_recommendations), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                    Text(stringResource(R.string.foryou_browse_more), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }

                    // ─── AI Section header before first item ──────────────
                    if (displayed.isNotEmpty()) {
                        item(key = "section_trending") {
                            AiSectionHeader(
                                emoji = "🔥",
                                title = "Trending Near You",
                                subtitle = "Popular picks in your location",
                                accentColor = Color(0xFF10B981),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            )
                        }
                    }

                    itemsIndexed(displayed, key = { _, post -> post.stableId }) { index, post ->
                        var wishlisted by remember { mutableStateOf(false) }
                        var liked by remember { mutableStateOf(false) }
                        var likeCount by remember { mutableStateOf(post.likeCount ?: 0) }
                        // Insert section headers at specific indices
                        if (index == 5 && displayed.size > 5) {
                            AiSectionHeader(
                                emoji = "✨",
                                title = "New Today",
                                subtitle = "Just listed in the last 24 hours",
                                accentColor = Color(0xFF6366F1),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            )
                        }
                        if (index == 10 && displayed.size > 10) {
                            AiSectionHeader(
                                emoji = "🧠",
                                title = "Based on Your Browsing",
                                subtitle = "AI-matched to your interests",
                                accentColor = Color(0xFFF59E0B),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            )
                        }

                        // AI-curated premium card — single column, larger image, Add to Cart
                        var showNotInterestedMenu by remember { mutableStateOf(false) }
                        Card(
                            onClick = { onOpenPost(post.stableId) },
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                        ) {
                            Column {
                                // Image with gradient overlay
                                Box(Modifier.fillMaxWidth().height(220.dp)) {
                                    val images = listOfNotNull(post.primaryImage) + (post.images)
                                    var imageIdx by remember { mutableStateOf(0) }
                                    if (images.isNotEmpty()) {
                                        AsyncImage(
                                            model = images[imageIdx.coerceIn(0, images.size - 1)],
                                            contentDescription = post.displayTitle,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                                                .clickable { zoomImages = images },
                                        )
                                        // Image nav arrows for multi-image
                                        if (images.size > 1) {
                                            Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                                IconButton(onClick = { if (imageIdx > 0) imageIdx-- }, modifier = Modifier.size(36.dp).background(Color.Black.copy(alpha = 0.3f), CircleShape)) {
                                                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                                }
                                                IconButton(onClick = { if (imageIdx < images.size - 1) imageIdx++ }, modifier = Modifier.size(36.dp).background(Color.Black.copy(alpha = 0.3f), CircleShape)) {
                                                    Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                                }
                                            }
                                            // Dot indicators
                                            Row(Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                images.forEachIndexed { i, _ ->
                                                    Box(Modifier.size(if (i == imageIdx) 8.dp else 5.dp).clip(CircleShape).background(if (i == imageIdx) Color.White else Color.White.copy(alpha = 0.5f)))
                                                }
                                            }
                                        }
                                    } else {
                                        Box(Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                                            Icon(Icons.Outlined.ImageNotSupported, null, modifier = Modifier.size(48.dp), tint = Color(0xFFCBD5E1))
                                        }
                                    }
                                    // Price badge bottom-left
                                    post.price?.let { p ->
                                        Surface(Modifier.align(Alignment.BottomStart).padding(10.dp), shape = RoundedCornerShape(10.dp), color = Color(0xFF1E293B).copy(alpha = 0.85f)) {
                                            Text("₹${"%,.0f".format(p)}", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color.White, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                                        }
                                    }
                                    // Bookmark top-right
                                    Box(Modifier.align(Alignment.TopEnd).padding(10.dp)) {
                                        IconButton(onClick = { wishlisted = !wishlisted; viewModel.toggleBookmark(post.stableId) }, modifier = Modifier.size(34.dp).background(Color.Black.copy(alpha = 0.3f), CircleShape)) {
                                            Icon(if (wishlisted) Icons.Default.Bookmark else Icons.Default.BookmarkBorder, null, tint = if (wishlisted) Color(0xFFFBBF24) else Color.White, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                    // AI badge top-left
                                    Surface(Modifier.align(Alignment.TopStart).padding(10.dp), shape = RoundedCornerShape(8.dp), color = Color(0xFF2563EB)) {
                                        Row(Modifier.padding(horizontal = 8.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                            Icon(Icons.Default.AutoAwesome, null, tint = Color.White, modifier = Modifier.size(10.dp))
                                            Text("For You", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        }
                                    }
                                    PromoBadgeRow(modifier = Modifier.align(Alignment.TopStart).padding(start = 10.dp, top = 36.dp))
                                }

                                Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    // Seller row
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        val initial = (post.sellerName ?: post.userName ?: "?").take(1).uppercase()
                                        Box(Modifier.size(28.dp).clip(CircleShape).background(Color(0xFF2563EB).copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                                            Text(initial, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2563EB))
                                        }
                                        Text(post.sellerName ?: post.userName ?: "", fontSize = 12.sp, color = Color(0xFF64748B), modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        post.condition?.let { cond ->
                                            Surface(shape = RoundedCornerShape(6.dp), color = if (cond.equals("New", ignoreCase = true)) Color(0xFFDCFCE7) else Color(0xFFFFF7ED)) {
                                                Text(cond, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = if (cond.equals("New", ignoreCase = true)) Color(0xFF16A34A) else Color(0xFFD97706), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                        }
                                    }

                                    // Title
                                    Text(post.displayTitle, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A), maxLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 22.sp)

                                    // Category + subcategory tags (web parity: AllPostCard)
                                    if (!post.categoryName.isNullOrBlank() || !post.subcategoryName.isNullOrBlank()) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            post.categoryName?.let { cat ->
                                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF3B82F6).copy(alpha = 0.15f)) {
                                                    Text(cat, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF3B82F6), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                                }
                                            }
                                            post.subcategoryName?.let { sub ->
                                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFF1F5F9)) {
                                                    Text(sub, fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                                }
                                            }
                                        }
                                    }

                                    // Location + views row
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        post.location?.let {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                                Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(13.dp), tint = Color(0xFF94A3B8))
                                                Text(it, fontSize = 12.sp, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            }
                                        }
                                        post.viewCount?.let { v ->
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                                Icon(Icons.Default.Visibility, null, modifier = Modifier.size(13.dp), tint = Color(0xFF94A3B8))
                                                Text("$v views", fontSize = 12.sp, color = Color(0xFF64748B))
                                            }
                                        }
                                    }

                                    // Engagement pills (web parity: AllPostCard style)
                                    @OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
                                    androidx.compose.foundation.layout.FlowRow(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        // Like pill
                                        Surface(shape = RoundedCornerShape(20.dp), color = if (liked) Color(0xFFEF4444).copy(alpha = 0.12f) else Color(0xFFF1F5F9), modifier = Modifier.clickable { liked = !liked; if (liked) likeCount++ else likeCount-- }) {
                                            Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(if (liked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder, null, tint = if (liked) Color(0xFFEF4444) else Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                                                Text(if (liked) "Liked" else "Like", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (liked) Color(0xFFEF4444) else Color(0xFF64748B))
                                            }
                                        }
                                        // Interested pill
                                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF059669).copy(alpha = 0.12f), modifier = Modifier.clickable { interestPostId = post.stableId; interestPostTitle = post.displayTitle; showInterestModal = true }) {
                                            Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Outlined.Star, null, tint = Color(0xFF059669), modifier = Modifier.size(14.dp))
                                                Text("Interested", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFF059669))
                                            }
                                        }
                                        // Share pill
                                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFF1F5F9), modifier = Modifier.clickable { sharePostId = post.stableId; sharePostTitle = post.displayTitle; showShareSheet = true }) {
                                            Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Outlined.Share, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                                                Text("Share", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFF64748B))
                                            }
                                        }
                                        // Save pill
                                        Surface(shape = RoundedCornerShape(20.dp), color = if (wishlisted) Color(0xFF6366F1).copy(alpha = 0.12f) else Color(0xFFF1F5F9), modifier = Modifier.clickable { wishlisted = !wishlisted; viewModel.toggleBookmark(post.stableId) }) {
                                            Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(if (wishlisted) Icons.Default.Bookmark else Icons.Default.BookmarkBorder, null, tint = if (wishlisted) Color(0xFF6366F1) else Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                                                Text(if (wishlisted) "Saved" else "Save", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (wishlisted) Color(0xFF6366F1) else Color(0xFF64748B))
                                            }
                                        }
                                        // Not Interested / hide pill
                                        Box {
                                            Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFF1F5F9), modifier = Modifier.clickable { showNotInterestedMenu = true }) {
                                                Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(Icons.Default.MoreVert, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                                                    Text("More", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFF64748B))
                                                }
                                            }
                                            DropdownMenu(expanded = showNotInterestedMenu, onDismissRequest = { showNotInterestedMenu = false }) {
                                                DropdownMenuItem(
                                                    text = { Text("Not interested", fontSize = 14.sp) },
                                                    onClick = { hiddenPostIds = hiddenPostIds + post.stableId; showNotInterestedMenu = false },
                                                    leadingIcon = { Icon(Icons.Default.ThumbDown, null, modifier = Modifier.size(16.dp), tint = Color(0xFF64748B)) },
                                                )
                                            }
                                        }
                                        // Compare pill
                                        val isCompared = state.compareItems.contains(post.stableId)
                                        Surface(shape = RoundedCornerShape(20.dp), color = if (isCompared) Color(0xFF8B5CF6).copy(alpha = 0.12f) else Color(0xFFF1F5F9), modifier = Modifier.clickable { viewModel.toggleCompare(post.stableId) }) {
                                            Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(if (isCompared) Icons.Default.Compare else Icons.Outlined.Compare, null, tint = if (isCompared) Color(0xFF8B5CF6) else Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                                                Text(if (isCompared) "Added" else "Compare", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (isCompared) Color(0xFF8B5CF6) else Color(0xFF64748B))
                                            }
                                        }
                                        // Cart pill
                                        val isInCart = state.cartItems.contains(post.stableId)
                                        Surface(shape = RoundedCornerShape(20.dp), color = if (isInCart) Color(0xFF059669).copy(alpha = 0.12f) else Color(0xFFF1F5F9), modifier = Modifier.clickable { viewModel.toggleCart(post.stableId) }) {
                                            Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(if (isInCart) Icons.Default.ShoppingCart else Icons.Outlined.ShoppingCart, null, tint = if (isInCart) Color(0xFF059669) else Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                                                Text(if (isInCart) "In Cart" else "Cart", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (isInCart) Color(0xFF059669) else Color(0xFF64748B))
                                            }
                                        }
                                        Spacer(Modifier.weight(1f))
                                        // View Details CTA pill
                                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF6366F1).copy(alpha = 0.1f), modifier = Modifier.clickable { onOpenPost(post.stableId) }) {
                                            Row(Modifier.padding(horizontal = 12.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.Visibility, null, tint = Color(0xFF6366F1), modifier = Modifier.size(14.dp))
                                                Text("View Details", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF6366F1))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (isGuest && displayed.size >= 5) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(Icons.Default.Lock, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.primary)
                                    Spacer(Modifier.height(12.dp))
                                    Text(
                                        stringResource(R.string.foryou_sign_in_more),
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        stringResource(R.string.foryou_sign_in_desc),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(horizontal = 16.dp)
                                    )
                                    Spacer(Modifier.height(16.dp))
                                    Button(onClick = onNavigateToLogin) {
                                        Text(stringResource(R.string.foryou_sign_in))
                                    }
                                }
                            }
                        }
                    }

                    if (!isGuest && state.hasMorePosts && displayed.isNotEmpty()) {
                        item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Button(
                                    onClick = { viewModel.loadMore() },
                                    modifier = Modifier.fillMaxWidth(0.5f)
                                ) {
                                    Icon(Icons.Default.ExpandMore, null, modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(stringResource(R.string.foryou_load_more))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/* ── AI Section header ───────────────────────────────────────────────────── */

@Composable
private fun AiSectionHeader(
    emoji: String,
    title: String,
    subtitle: String,
    accentColor: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Surface(
            shape = androidx.compose.foundation.shape.CircleShape,
            color = accentColor.copy(alpha = 0.12f),
            modifier = Modifier.size(36.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(emoji, fontSize = 18.sp)
            }
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = Color(0xFF0F172A))
            Text(subtitle, fontSize = 11.sp, color = Color(0xFF64748B))
        }
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = accentColor.copy(alpha = 0.1f),
        ) {
            Text(
                "AI",
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold,
                color = accentColor,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
    }
}
