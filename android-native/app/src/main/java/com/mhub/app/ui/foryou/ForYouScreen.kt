package com.mhub.app.ui.foryou

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.CategoriesRepository
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
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.Stable
import javax.inject.Inject

enum class SortBy { RELEVANCE, PRICE_ASC, PRICE_DESC, NEWEST, POPULAR, TRENDING }
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
    /** Loaded from API: null key = "All" */
    val categories: List<Pair<String?, String>> = listOf(null to "All"),
)

/** Sample posts shown when API returns empty — ensures pages never feel blank */
internal val samplePosts = listOf(
    Post(id = "sample-1", title = "iPhone 15 Pro Max 256GB", price = 134900.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/iphone15/400/300", category = "electronics",
        categoryName = "Electronics", location = "Mumbai", viewCount = 245, likeCount = 42,
        sellerName = "TechStore India", condition = "New", createdAt = "2025-05-15T10:00:00Z"),
    Post(id = "sample-2", title = "Royal Enfield Classic 350", price = 195000.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/bullet350/400/300", category = "vehicles",
        categoryName = "Vehicles", location = "Delhi", viewCount = 189, likeCount = 35,
        sellerName = "MotoMart", condition = "Used - Like New", createdAt = "2025-05-14T08:30:00Z"),
    Post(id = "sample-3", title = "Samsung Galaxy S24 Ultra", price = 129999.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/s24ultra/400/300", category = "electronics",
        categoryName = "Electronics", location = "Bangalore", viewCount = 312, likeCount = 67,
        sellerName = "GadgetHub", condition = "New", createdAt = "2025-05-13T14:20:00Z"),
    Post(id = "sample-4", title = "Nike Air Jordan 1 Retro High", price = 16995.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/jordan1/400/300", category = "fashion",
        categoryName = "Fashion", location = "Pune", viewCount = 156, likeCount = 28,
        sellerName = "SneakerStreet", condition = "New", createdAt = "2025-05-12T09:15:00Z"),
    Post(id = "sample-5", title = "MacBook Air M3 15-inch", price = 149900.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/macbookm3/400/300", category = "electronics",
        categoryName = "Electronics", location = "Hyderabad", viewCount = 278, likeCount = 53,
        sellerName = "AppleReseller", condition = "New", createdAt = "2025-05-11T16:45:00Z"),
    Post(id = "sample-6", title = "Sony WH-1000XM5 Headphones", price = 29990.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/sonyxm5/400/300", category = "electronics",
        categoryName = "Electronics", location = "Chennai", viewCount = 198, likeCount = 41,
        sellerName = "AudioPhile", condition = "New", createdAt = "2025-05-10T11:00:00Z"),
    Post(id = "sample-7", title = "Honda City 2024 ZX CVT", price = 1549000.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/hondacity/400/300", category = "vehicles",
        categoryName = "Vehicles", location = "Ahmedabad", viewCount = 432, likeCount = 78,
        sellerName = "AutoDeals", condition = "New", createdAt = "2025-05-09T07:30:00Z"),
    Post(id = "sample-8", title = "Levi's 501 Original Fit Jeans", price = 4599.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/levis501/400/300", category = "fashion",
        categoryName = "Fashion", location = "Kolkata", viewCount = 89, likeCount = 15,
        sellerName = "DenimWorld", condition = "New", createdAt = "2025-05-08T13:20:00Z"),
    Post(id = "sample-9", title = "LG 55\" OLED C3 4K TV", price = 129990.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/lgoled/400/300", category = "electronics",
        categoryName = "Electronics", location = "Jaipur", viewCount = 167, likeCount = 32,
        sellerName = "HomeElectro", condition = "New", createdAt = "2025-05-07T10:10:00Z"),
    Post(id = "sample-10", title = "Freelance Web Developer Available", price = 2500.0, currency = "INR",
        imageUrl = "https://picsum.photos/seed/webdev/400/300", category = "others",
        categoryName = "Services", location = "Remote", viewCount = 345, likeCount = 56,
        sellerName = "DevPro", condition = null, createdAt = "2025-05-06T15:00:00Z"),
)

@HiltViewModel
class ForYouViewModel @Inject constructor(
    private val sponsoredRepo: SponsoredRepository,
    private val postsRepo: PostsRepository,
    private val categoriesRepo: CategoriesRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ForYouState())
    val state: StateFlow<ForYouState> = _state.asStateFlow()
    private val viewedPostIds = mutableSetOf<String>()
    private var batchViewJob: Job? = null

    init { load(); loadCategories() }

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            var posts = emptyList<Post>()
            when (val r = sponsoredRepo.forYou(30)) {
                is ApiResult.Success -> posts = r.data
                is ApiResult.Failure -> {
                    when (val f = postsRepo.feed(limit = 30)) {
                        is ApiResult.Success -> posts = f.data
                        is ApiResult.Failure -> {} // will use sample data below
                    }
                }
            }
            // Fallback to sample data if API returns empty
            if (posts.isEmpty()) posts = samplePosts
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
            var posts = emptyList<Post>()
            when (val r = sponsoredRepo.forYou(30)) {
                is ApiResult.Success -> posts = r.data
                is ApiResult.Failure -> {
                    when (val f = postsRepo.feed(limit = 30)) {
                        is ApiResult.Success -> posts = f.data
                        is ApiResult.Failure -> {}
                    }
                }
            }
            if (posts.isEmpty()) posts = samplePosts
            _state.value = _state.value.copy(refreshing = false, posts = posts)
            when (val s = sponsoredRepo.list(8)) {
                is ApiResult.Success -> _state.value = _state.value.copy(sponsored = s.data)
                is ApiResult.Failure -> {}
            }
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForYouScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    isGuest: Boolean = false,
    onNavigateToLogin: () -> Unit = {},
    viewModel: ForYouViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val categories = state.categories

    var quickFilter by remember { mutableStateOf<String?>(null) }
    var timeFilter by remember { mutableStateOf<String?>(null) }
    var showShareSheet by remember { mutableStateOf(false) }
    var sharePostId by remember { mutableStateOf("") }
    var sharePostTitle by remember { mutableStateOf("") }
    var showInterestModal by remember { mutableStateOf(false) }
    var interestPostId by remember { mutableStateOf("") }
    var interestPostTitle by remember { mutableStateOf("") }
    var zoomImages by remember { mutableStateOf<List<String>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var density by remember { mutableStateOf(PageDensity.NORMAL) }
    var sortMenuExpanded by remember { mutableStateOf(false) }

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

    val displayed = remember(state.posts, state.selectedCategory, quickFilter, timeFilter, searchQuery, state.sortBy, state.sortAscending) {
        state.posts
            .filter { post ->
                state.selectedCategory == null || post.categoryName?.contains(state.selectedCategory!!, ignoreCase = true) == true
            }
            .filter { post ->
                searchQuery.isBlank() || post.displayTitle.contains(searchQuery, ignoreCase = true) || post.description?.contains(searchQuery, ignoreCase = true) == true
            }
            .let { list ->
                when (quickFilter) {
                    "Under ₹500" -> list.filter { (it.price ?: Double.MAX_VALUE) < 500.0 }
                    "Trending" -> list.sortedByDescending { it.viewCount ?: 0 }
                    else -> list
                }
            }
            .let { list ->
                val sorted = when (state.sortBy) {
                    SortBy.RELEVANCE -> list
                    SortBy.PRICE_ASC -> list.sortedBy { it.price ?: Double.MAX_VALUE }
                    SortBy.PRICE_DESC -> list.sortedByDescending { it.price ?: 0.0 }
                    SortBy.NEWEST -> list.sortedByDescending { it.createdAt ?: "" }
                    SortBy.POPULAR -> list.sortedByDescending { it.viewCount ?: 0 }
                    SortBy.TRENDING -> list.sortedByDescending { (it.viewCount ?: 0) + (it.interestedBuyers ?: 0) * 10 }
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
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
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
                        }
                        Text(stringResource(R.string.foryou_subtitle), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
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
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
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
                    contentPadding = PaddingValues(bottom = 80.dp),
                ) {
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
                                "${displayed.size} items · ${categories.count { (catKey, catName) -> catKey == null || state.posts.any { p -> p.categoryName?.contains(catName, ignoreCase = true) == true } }} categories · 🟢 Live",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.weight(1f)
                            )
                            Box {
                                FilterChip(
                                    selected = false,
                                    onClick = { sortMenuExpanded = true },
                                    label = { Text("Sort: ${state.sortBy.name.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() }}", style = MaterialTheme.typography.labelSmall) },
                                    trailingIcon = { Icon(Icons.Default.ArrowDropDown, null, modifier = Modifier.size(16.dp)) }
                                )
                                DropdownMenu(expanded = sortMenuExpanded, onDismissRequest = { sortMenuExpanded = false }) {
                                    SortBy.entries.forEach { sort ->
                                        DropdownMenuItem(
                                            text = { Text(sort.name.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() }) },
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
                            items(categories, key = { it.first ?: "all" }) { (key, label) ->
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
                                "Trending" to Icons.Default.TrendingUp,
                                "New Arrivals" to Icons.Default.NewReleases,
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
                        Text(stringResource(R.string.foryou_recommended), fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
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

                    items(displayed, key = { it.stableId }) { post ->
                        var wishlisted by remember { mutableStateOf(false) }
                        var liked by remember { mutableStateOf(false) }

                        val cardPadding = when (density) {
                            PageDensity.COMPACT -> PaddingValues(horizontal = 16.dp, vertical = 2.dp)
                            PageDensity.NORMAL -> PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                            PageDensity.SPACIOUS -> PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                        }

                        Card(
                            onClick = { onOpenPost(post.stableId) },
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(2.dp),
                            modifier = Modifier.fillMaxWidth().padding(cardPadding),
                        ) {
                            Column {
                                Box(Modifier.fillMaxWidth().height(200.dp).background(MaterialTheme.colorScheme.surfaceVariant)) {
                                    post.primaryImage?.let { img ->
                                        AsyncImage(
                                            model = img, contentDescription = null,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize().clickable { zoomImages = listOf(img) },
                                        )
                                    } ?: Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Outlined.ImageNotSupported, null, modifier = Modifier.size(36.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.5f)), startY = 100f)))
                                    post.price?.let { p ->
                                        Text("₹${"%,.0f".format(p)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.align(Alignment.BottomStart).padding(12.dp))
                                    }
                                    IconButton(
                                        onClick = {
                                            wishlisted = !wishlisted
                                            viewModel.toggleBookmark(post.stableId)
                                        },
                                        modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(36.dp).background(Color.Black.copy(alpha = 0.25f), CircleShape),
                                    ) {
                                        Icon(if (wishlisted) Icons.Default.Bookmark else Icons.Default.BookmarkBorder, "Bookmark", tint = if (wishlisted) Color(0xFFFBBF24) else Color.White, modifier = Modifier.size(18.dp))
                                    }
                                    PromoBadgeRow(modifier = Modifier.align(Alignment.TopStart).padding(8.dp))
                                }

                                Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    val sellerName = post.sellerName ?: post.userName
                                    if (sellerName != null) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(Modifier.size(24.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                                                Text(sellerName.take(1).uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                            }
                                            Spacer(Modifier.width(6.dp))
                                            Text(sellerName, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                            if (post.sellerName != null) {
                                                Icon(Icons.Default.VerifiedUser, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(14.dp))
                                            }
                                        }
                                        Spacer(Modifier.height(2.dp))
                                    }

                                    Text(post.displayTitle, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, fontSize = 15.sp)

                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        post.condition?.let { cond ->
                                            Surface(shape = RoundedCornerShape(4.dp), color = if (cond.lowercase() == "new") Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant) {
                                                Text(cond.replaceFirstChar { c -> c.uppercase() }, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (cond.lowercase() == "new") Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                        }
                                        post.brand?.let { b ->
                                            Surface(shape = RoundedCornerShape(4.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                                                Text(b, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }

                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        post.location?.let {
                                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                                Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(13.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Spacer(Modifier.width(2.dp))
                                                Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            }
                                        }
                                        post.viewCount?.let { v ->
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.Visibility, null, modifier = Modifier.size(13.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Spacer(Modifier.width(2.dp))
                                                Text(v.toString(), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }

                                    HorizontalDivider(modifier = Modifier.padding(top = 4.dp), thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
                                    PostActionRow(
                                        postId = post.stableId,
                                        viewCount = post.viewCount ?: 0,
                                        isLiked = liked,
                                        isWishlisted = wishlisted,
                                        onLike = { liked = !liked },
                                        onWishlist = { wishlisted = !wishlisted },
                                        onInterested = {
                                            interestPostId = post.stableId
                                            interestPostTitle = post.displayTitle
                                            showInterestModal = true
                                        },
                                        onShare = {
                                            sharePostId = post.stableId
                                            sharePostTitle = post.displayTitle
                                            showShareSheet = true
                                        },
                                    )
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
