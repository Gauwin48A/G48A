package com.zaruda.app.ui.explore
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.text.font.FontFamily
import coil.request.ImageRequest
import androidx.compose.material.icons.filled.Shield
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Compare
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.NewReleases
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.zaruda.app.R
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.local.ThemeMode
import com.zaruda.app.data.repository.CartRepository
import com.zaruda.app.data.repository.CategoriesRepository
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.RecommendationsRepository
import com.zaruda.app.data.repository.WishlistRepository
import com.zaruda.app.domain.model.Category
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.components.AnimatedLazyItem
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.PromoBadgeRow
import com.zaruda.app.ui.components.SectionHeader
import com.zaruda.app.ui.theme.CategoryTints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Share
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.TextButton
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.filled.RemoveShoppingCart
import androidx.compose.material.icons.filled.Add
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.material3.RadioButton
import com.zaruda.app.ui.LocalActiveCategoryKey

data class ExploreState(
    val ecosystemKey: String? = null,
    val forYouMode: Boolean = false,
    val sortBy: String = "newest",
    val filterCondition: String = "any",  // "any" | "new" | "used"
    val filterSubcategory: String? = null,
    val filterMinPrice: Float = 0f,
    val filterMaxPrice: Float = 500000f,
    val hasActiveFilters: Boolean = false,
    val posts: List<Post> = emptyList(),
    val page: Int = 1,
    val hasMore: Boolean = true,
    val loadingPosts: Boolean = true,
    val loadingMore: Boolean = false,
    val errorMessage: String? = null,
    val compareItems: Set<String> = emptySet(),
    val cartItems: Set<String> = emptySet(),
    val searchQuery: String = "",
    val searchResults: List<Post> = emptyList(),
    val isSearching: Boolean = false,
    /** Live type-ahead suggestions (recent queries + brands/subcats/titles from loaded posts) */
    val searchSuggestions: List<String> = emptyList(),
    /** Last 10 query strings persisted locally (web-parity recent searches) */
    val recentQueries: List<String> = emptyList(),
    /** True once the current query has produced results (controls suggestion visibility) */
    val hasSearchedQuery: Boolean = false,
    val refreshing: Boolean = false,
    val subcategories: List<String> = emptyList(),
    // Quick filter state
    val quickFilter: String? = null, // "latest5" | "latest10" | "today" | "verified"
    val autoRefresh: Boolean = false,
    // Plan expiry banner state
    val showPlanExpiryBanner: Boolean = false,
    val planExpiringSoon: Boolean = false,   // true = expiring within 7 days
    val planExpired: Boolean = false,        // true = already expired
    val planExpiryDate: String? = null,
    val restricted: Boolean = false,
)

@HiltViewModel
class ExploreViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val recommendationsRepo: RecommendationsRepository,
    private val wishlistRepo: WishlistRepository,
    private val cartRepo: CartRepository,
    private val categoriesRepo: CategoriesRepository,
    private val tiersRepo: com.zaruda.app.data.repository.TiersRepository,
    private val localeManager: com.zaruda.app.core.LocaleManager,
    private val tokenStore: com.zaruda.app.data.local.TokenStore,
    private val prefs: com.zaruda.app.data.local.AppPreferences,
    private val api: com.zaruda.app.data.remote.ZarudaApi,
    private val cartItemDao: com.zaruda.app.data.local.db.CartItemDao,
    private val wishlistItemDao: com.zaruda.app.data.local.db.WishlistItemDao,
) : ViewModel() {
    private val _state = MutableStateFlow(ExploreState())
    val state: StateFlow<ExploreState> = _state.asStateFlow()

    private val _wishlisted = MutableStateFlow<Set<String>>(emptySet())
    val wishlisted: StateFlow<Set<String>> = _wishlisted.asStateFlow()

    private val _prefsSaving = MutableStateFlow(false)
    val prefsSaving: StateFlow<Boolean> = _prefsSaving.asStateFlow()

    private var searchJob: Job? = null
    private var lastLocaleVersion = 0L

    init {
        // 1. Seed wishlist heart state + SharedExploreStore from Room so
        //    persisted items survive process death and show across screens
        viewModelScope.launch {
            val wishItems = wishlistItemDao.getAll()
            _wishlisted.value = wishItems
                .mapNotNull { it.postId.ifBlank { it.id } }
                .toSet()
            // Re-populate SharedExploreStore so WishlistScreen has data on cold start
            wishItems.forEach { entity ->
                SharedExploreStore.addWishlist(
                    Post(
                        id = entity.id,
                        postId = entity.postId,
                        title = entity.title,
                        price = entity.price,
                        originalPrice = entity.originalPrice,
                        imageUrl = entity.imageUrl,
                        category = entity.category,
                        brand = entity.brand,
                    )
                )
            }
            // Re-populate SharedExploreStore cart from Room
            val cartItems = cartItemDao.getAll()
            cartItems.forEach { entity ->
                SharedExploreStore.addCart(
                    Post(
                        id = entity.id,
                        postId = entity.postId,
                        title = entity.title,
                        price = entity.price,
                        originalPrice = entity.originalPrice,
                        imageUrl = entity.imageUrl,
                        category = entity.category,
                        brand = entity.brand,
                    )
                )
            }
        }
        // 2. Restore recent search queries for the marketplace search bar
        viewModelScope.launch {
            val persisted = prefs.getRecentSearches()
            if (persisted.isNotEmpty()) _state.value = _state.value.copy(recentQueries = persisted)
        }
        // 3. Load saved preferences (may affect feed filtering)
        viewModelScope.launch {
            delay(500L)
            loadPreferences()
        }
        // 3. Load posts (deferred slightly so preferences can land first)
        viewModelScope.launch {
            delay(600L)
            loadPosts(reset = true)
        }
        // 4. Deferred non-critical startup work
        viewModelScope.launch {
            delay(2000L)
            checkPlanExpiry()
        }
        viewModelScope.launch {
            delay(2500L)
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) loadPosts(reset = true)
                lastLocaleVersion = version
            }
        }
    }

    fun dismissPlanBanner() {
        _state.value = _state.value.copy(showPlanExpiryBanner = false)
    }

    fun setForYouMode(enabled: Boolean) {
        if (_state.value.forYouMode == enabled) return
        _state.value = _state.value.copy(
            forYouMode = enabled,
            quickFilter = null,
            searchQuery = "",
            searchResults = emptyList(),
            isSearching = false,
        )
        loadPosts(reset = true)
    }

    private fun checkPlanExpiry() {
        // Demo sessions have premium enabled by design — never show plan-expiry warnings
        if (tokenStore.isDemoSession) return
        viewModelScope.launch {
            val result = kotlinx.coroutines.withTimeoutOrNull(4000L) { tiersRepo.mySubscription() }
                ?: return@launch
            if (result is com.zaruda.app.core.ApiResult.Success) {
                val sub = result.data.subscription
                val expiresAt = sub?.expiresAt
                if (expiresAt != null) {
                    val now = System.currentTimeMillis()
                    val sevenDaysMs = 7L * 24 * 60 * 60 * 1000
                    val expMs = try {
                        java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                            .also { it.timeZone = java.util.TimeZone.getTimeZone("UTC") }
                            .parse(expiresAt)?.time ?: Long.MAX_VALUE
                    } catch (_: Exception) { Long.MAX_VALUE }
                    val expired = expMs < now
                    val expiringSoon = !expired && (expMs - now) < sevenDaysMs
                    if (expired || expiringSoon) {
                        _state.value = _state.value.copy(
                            showPlanExpiryBanner = true,
                            planExpired = expired,
                            planExpiringSoon = expiringSoon,
                            planExpiryDate = expiresAt.take(10),
                        )
                    }
                }
            }
        }
    }

    fun setEcosystem(key: String?) {
        if (_state.value.ecosystemKey == key) return
        _state.value = _state.value.copy(ecosystemKey = key)
        loadSubcategories(key)
        loadPosts(reset = true)
    }

    fun setFilterCondition(condition: String) {
        val newFilters = condition != "any" || _state.value.filterSubcategory != null
        _state.value = _state.value.copy(filterCondition = condition, hasActiveFilters = newFilters)
        loadPosts(reset = true)
    }

    fun setFilterSubcategory(sub: String?) {
        val newFilters = _state.value.filterCondition != "any" || sub != null
        _state.value = _state.value.copy(filterSubcategory = sub, hasActiveFilters = newFilters)
        loadPosts(reset = true)
    }

    fun setFilterPrice(min: Float, max: Float) {
        val newFilters = _state.value.filterCondition != "any" || _state.value.filterSubcategory != null || min > 0f || max < 500000f
        _state.value = _state.value.copy(filterMinPrice = min, filterMaxPrice = max, hasActiveFilters = newFilters)
        loadPosts(reset = true)
    }

    /**
     * Apply all filter values at once from the filter sheet, triggering only ONE loadPosts call.
     * This prevents the race condition where setFilterCondition / setFilterSubcategory /
     * setFilterPrice each independently call loadPosts, cancelling each other's coroutines.
     */
    fun applyFilters(condition: String, subcategory: String?, minPrice: Float, maxPrice: Float) {
        val hasActive = condition != "any" || subcategory != null || minPrice > 0f || maxPrice < 500000f
        _state.value = _state.value.copy(
            filterCondition = condition,
            filterSubcategory = subcategory,
            filterMinPrice = minPrice,
            filterMaxPrice = maxPrice,
            hasActiveFilters = hasActive,
        )
        // Sync inline chips so they reflect the filter sheet selection
        if (subcategory != null) SharedExploreStore.updateSelectedSubcategories(setOf(subcategory))
        else SharedExploreStore.updateSelectedSubcategories(emptySet())
        loadPosts(reset = true)
    }

    fun clearFilters() {
        _state.value = _state.value.copy(filterCondition = "any", filterSubcategory = null, filterMinPrice = 0f, filterMaxPrice = 500000f, hasActiveFilters = false)
        // Also clear the SharedExploreStore subcategories so inline chips reflect the cleared state
        SharedExploreStore.updateSelectedSubcategories(emptySet())
        loadPosts(reset = true)
    }

    fun setQuickFilter(filter: String?) {
        val effectiveFilter = filter?.ifBlank { null }
        val current = _state.value.quickFilter
        val newFilter = if (current == effectiveFilter) null else effectiveFilter
        // Do NOT override sortBy — keep the user's sort choice independent of quick filters
        _state.value = _state.value.copy(quickFilter = newFilter)
        loadPosts(reset = true)
    }

    fun toggleAutoRefresh() {
        val newVal = !_state.value.autoRefresh
        _state.value = _state.value.copy(autoRefresh = newVal)
        if (newVal) startAutoRefresh() else {
            autoRefreshJob?.cancel()
            autoRefreshJob = null
        }
    }

    companion object {
        /** Max posts kept in memory to prevent unbounded growth. Beyond this, oldest pages are dropped. */
        private const val MAX_CACHED_POSTS = 200
    }

    private var loadJob: Job? = null
    private var loadGeneration = 0L
    private var autoRefreshJob: Job? = null
    private fun startAutoRefresh() {
        autoRefreshJob?.cancel()
        autoRefreshJob = viewModelScope.launch {
            while (true) {
                delay(30_000L)
                if (_state.value.autoRefresh) refresh() else break
            }
        }
    }

    fun loadPosts(reset: Boolean = false) {
        // Cancel any in-flight load so a rapid filter/sort change doesn't race
        loadJob?.cancel()
        val generation = ++loadGeneration
        val currentPage = if (reset) 1 else _state.value.page
        val categoryKey = _state.value.ecosystemKey
        if (reset) {
            // Always show shimmer loading on filter/sort changes so the user sees feedback
            _state.value = _state.value.copy(
                loadingPosts = true,
                posts = emptyList(),
                page = 1, hasMore = true,
            )
        } else {
            if (!_state.value.hasMore || _state.value.loadingMore) return
            _state.value = _state.value.copy(loadingMore = true)
        }
        // Guest (no-session) users: skip the API (avoid 401s firing the token
        // authenticator) and show an honest empty state — never inject fake posts.
        if (!tokenStore.hasSession) {
            _state.value = _state.value.copy(
                loadingPosts = false, loadingMore = false,
                posts = emptyList(),
                hasMore = false,
                errorMessage = null,
            )
            return
        }

        // Read ALL filter state inside the coroutine so it is always consistent
        // and reflects the latest user action, not a stale snapshot.
        loadJob = viewModelScope.launch {
            val sort = _state.value.sortBy
            val condition = _state.value.filterCondition.takeIf { it != "any" }
            val subcategory = _state.value.filterSubcategory

            /** Helper: skip stale coroutine results (cancelled by a newer loadPosts call) */
            fun isStale() = generation != loadGeneration

            if (_state.value.forYouMode && reset) {
                // For You: fetch the regular feed, then the UI filters by the user's
                // saved preferences (subcategories, location, price). Never inject mock data.
                when (val result = postsRepo.feedResponse(page = currentPage, categoryId = categoryKey, sort = sort, condition = condition, subcategory = subcategory)) {
                    is ApiResult.Success -> {
                        if (isStale()) return@launch
                        val newPosts = filterForEcosystem(result.data.allItems, categoryKey)
                        // Server already filters by subcategory via SQL (sc.name ILIKE);
                        // only apply client-side condition filter as a safety net.
                        val filteredNewPosts = newPosts.let { p ->
                            var filtered = p
                            if (condition != null) filtered = filtered.filter { it.condition?.lowercase() == condition }
                            filtered
                        }
                        _state.value = _state.value.copy(
                            loadingPosts = false, loadingMore = false,
                            posts = applyQuickFilter(applySort(filteredNewPosts)),
                            page = 2,
                            hasMore = false,
                            errorMessage = null,
                            restricted = result.data.isRestricted && !tokenStore.isDemoSession,
                        )
                    }
                    is ApiResult.Failure -> {
                        if (isStale()) return@launch
                        _state.value = _state.value.copy(
                            loadingPosts = false, loadingMore = false,
                            posts = emptyList(),
                            page = 2,
                            hasMore = false,
                            errorMessage = result.error.message,
                            restricted = !tokenStore.isDemoSession,
                        )
                    }
                }
                return@launch
            }
            when (val result = postsRepo.feedResponse(page = currentPage, categoryId = categoryKey, sort = sort, condition = condition, subcategory = subcategory)) {
                is ApiResult.Success -> {
                    if (isStale()) return@launch
                    val postsResponse = result.data
                    val newPosts = filterForEcosystem(postsResponse.allItems, categoryKey)
                    // Server already filters by subcategory via SQL (sc.name ILIKE).
                    // Only apply client-side condition filter as a safety net.
                    val filteredNewPosts = newPosts.let { p ->
                        var filtered = p
                        if (condition != null) filtered = filtered.filter { it.condition?.lowercase() == condition }
                        filtered
                    }
                    val finalPosts = applyQuickFilter(applySort(when {
                        reset -> filteredNewPosts
                        else -> (_state.value.posts + filteredNewPosts).take(MAX_CACHED_POSTS)
                    }))
                    _state.value = _state.value.copy(
                        loadingPosts = false, loadingMore = false,
                        posts = finalPosts,
                        page = currentPage + 1,
                        hasMore = newPosts.size >= 20,
                        errorMessage = null,
                        restricted = postsResponse.isRestricted && !tokenStore.isDemoSession,
                    )
                }
                is ApiResult.Failure -> {
                    if (isStale()) return@launch
                    // Honest failure state: keep already-loaded posts, surface the error banner.
                    _state.value = _state.value.copy(
                        loadingPosts = false, loadingMore = false,
                        errorMessage = result.error.message,
                        hasMore = false,
                        restricted = !tokenStore.isDemoSession,
                    )
                }
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            loadPosts(reset = true)
            _state.value = _state.value.copy(refreshing = false)
        }
    }

    fun retry() {
        _state.value = _state.value.copy(errorMessage = null)
        loadPosts(reset = true)
    }

    fun dismissError() {
        _state.value = _state.value.copy(errorMessage = null)
    }

    private fun applyQuickFilter(posts: List<Post>): List<Post> {
        val qf = _state.value.quickFilter ?: return posts
        val now = System.currentTimeMillis()
        val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date(now))
        return when (qf) {
            "latest5" -> posts.sortedByDescending { it.createdAt ?: "" }.take(5)
            "latest10" -> posts.sortedByDescending { it.createdAt ?: "" }.take(10)
            "today" -> posts.filter { it.createdAt?.startsWith(todayStr) == true }.ifEmpty { posts.take(5) }
            "verified" -> posts.filter { it.sellerVerified == true }
            "shuffle" -> posts.shuffled()
            "trending" -> posts.sortedByDescending { (it.viewCount ?: 0) + (it.likeCount ?: 0) * 3 }
            "top_rated" -> posts.sortedByDescending { (it.completedSales ?: 0) * 10 + (it.responseRate ?: 0) + (it.likeCount ?: 0) * 2 }
            "offers" -> posts.filter { it.originalPrice != null || it.isNegotiable == true || it.promoLabel?.contains("offer", ignoreCase = true) == true }
            else -> posts
        }
    }

    private fun applySort(posts: List<Post>): List<Post> {
        return when (_state.value.sortBy) {
            "oldest" -> posts.sortedBy { it.createdAt ?: "" }
            "popular" -> posts.sortedByDescending { (it.likeCount ?: 0) + (it.interestedBuyers ?: 0) * 2 + (it.viewCount ?: 0) }
            "most_viewed" -> posts.sortedByDescending { it.viewCount ?: 0 }
            "price_asc" -> posts.sortedBy { it.price ?: Double.MAX_VALUE }
            "price_desc" -> posts.sortedByDescending { it.price ?: 0.0 }
            "featured_first" -> posts.sortedBy { if (it.promoLabel?.contains("featured", ignoreCase = true) == true || it.isPromoted == true) 0 else 1 }
            "premium_first" -> posts.sortedBy { if (it.isPremium == true || it.tier?.contains("premium", ignoreCase = true) == true) 0 else 1 }
            else -> posts.sortedByDescending { it.createdAt ?: "" }
        }
    }

    private fun filterForEcosystem(posts: List<Post>, categoryKey: String?): List<Post> {
        val normalizedKey = normalizeBroadCategory(categoryKey) ?: return posts
        return posts.filter { post ->
            listOf(post.category, post.categoryId, post.categoryName).any {
                normalizeBroadCategory(it) == normalizedKey
            }
        }
    }

    private fun normalizeBroadCategory(raw: String?): String? {
        val value = raw?.lowercase()?.trim().orEmpty()
        if (value.isBlank()) return null
        return when {
            value in setOf("electronics", "fashion", "vehicles", "others") -> value
            value.contains("electron") || value.contains("phone") || value.contains("laptop") ||
                value.contains("camera") || value.contains("audio") || value.contains("gadget") ||
                value.contains("gaming") || value.contains("tablet") -> "electronics"
            value.contains("fashion") || value.contains("cloth") || value.contains("apparel") ||
                value.contains("shoe") || value.contains("bag") || value.contains("watch") ||
                value.contains("jewel") -> "fashion"
            value.contains("vehicle") || value.contains("car") || value.contains("bike") ||
                value.contains("motor") || value.contains("cycle") || value.contains("truck") ||
                value.contains("scooter") || value.contains("spare") || value.contains("auto") -> "vehicles"
            else -> "others"
        }
    }

    private fun loadSubcategories(key: String?) {
        if (key == null) {
            _state.value = _state.value.copy(subcategories = emptyList())
            return
        }
        viewModelScope.launch {
            when (val r = categoriesRepo.subcategories(key)) {
                is ApiResult.Success -> {
                    val names = r.data.mapNotNull { it.name }.take(10)
                    _state.value = _state.value.copy(subcategories = names)
                }
                is ApiResult.Failure -> {
                    // Keep hardcoded fallback (single source of truth)
                    _state.value = _state.value.copy(
                        subcategories = ecosystemSubcategoryMap[key] ?: allEcosystemSubcategories
                    )
                }
            }
        }
    }

    // Retained for back-compat but ecosystem is set via setEcosystem()
    fun setCategory(idx: Int) {
        // no-op: category is now locked by ecosystem from Home screen
        // Remove if no callers remain
        _state.value = _state.value.copy()
        loadPosts(reset = true)
    }

    fun setSortBy(sort: String) {
        if (_state.value.sortBy == sort) return
        _state.value = _state.value.copy(sortBy = sort)
        loadPosts(reset = true)
    }

    fun loadMore() = loadPosts(reset = false)

    private fun findActionPost(postId: String): Post? {
        val current = _state.value
        // Search the loaded list first, then fall back to the shared store so a toggle
        // never silently fails to persist just because the post isn't in the current list.
        return (current.posts + current.searchResults)
            .firstOrNull { it.stableId == postId }
            ?: SharedExploreStore.wishlistPosts.firstOrNull { it.stableId == postId }
            ?: SharedExploreStore.cartPosts.firstOrNull { it.stableId == postId }
            ?: SharedExploreStore.recentlyViewedPosts.firstOrNull { it.stableId == postId }
    }

    fun toggleCompare(postId: String) {
        val current = _state.value.compareItems.toMutableSet()
        if (current.contains(postId)) {
            current.remove(postId)
            SharedExploreStore.removeCompare(postId)
            viewModelScope.launch { postsRepo.removeFromCompare(postId) }
        } else if (current.size < 4) {
            // Subcategory match check: only allow comparing similar products
            val newPost = findActionPost(postId)
            if (newPost != null) {
                val existingPosts = SharedExploreStore.comparePosts
                if (existingPosts.isNotEmpty()) {
                    val firstSubcategory = existingPosts.first().subcategory
                    if (firstSubcategory != null && newPost.subcategory != null &&
                        !firstSubcategory.equals(newPost.subcategory, ignoreCase = true)
                    ) {
                        _state.value = _state.value.copy(
                            errorMessage = "Can only compare similar products (${firstSubcategory})"
                        )
                        viewModelScope.launch {
                            delay(3000)
                            _state.value = _state.value.copy(errorMessage = null)
                        }
                        return
                    }
                }
            }
            current.add(postId)
            // Save full Post to shared store so CompareScreen works without backend
            newPost?.let { SharedExploreStore.addCompare(it) }
            viewModelScope.launch { postsRepo.addToCompare(postId) }
        } else {
            // Max 4 reached - show limit banner
            _state.value = _state.value.copy(errorMessage = "Maximum 4 items can be compared")
            viewModelScope.launch {
                delay(3000)
                _state.value = _state.value.copy(errorMessage = null)
            }
        }
        _state.value = _state.value.copy(compareItems = current)
    }

    fun toggleCart(postId: String) {
        val current = _state.value.cartItems.toMutableSet()
        if (current.contains(postId)) {
            current.remove(postId)
            SharedExploreStore.removeCart(postId)
            viewModelScope.launch {
                // Keep Room in sync so the cart badge + offline list stay accurate
                runCatching { cartItemDao.delete(postId) }
                cartRepo.remove(postId)
            }
        } else {
            current.add(postId)
            // Save full Post to shared store so CartScreen works without backend
            val post = findActionPost(postId)
            post?.let { SharedExploreStore.addCart(it) }
            viewModelScope.launch {
                // Persist to Room too — items survive restart and drive the badge count
                post?.let {
                    runCatching { cartItemDao.insert(it.toCartItemEntity()) }
                }
                cartRepo.add(postId)
            }
        }
        _state.value = _state.value.copy(cartItems = current)
    }

    fun clearCompare() {
        _state.value = _state.value.copy(compareItems = emptySet())
        SharedExploreStore.clearCompare()
        viewModelScope.launch { postsRepo.clearCompare() }
    }

    fun openCompare(onReady: () -> Unit) {
        val selectedIds = _state.value.compareItems.toList()
        if (selectedIds.size < 2) return
        viewModelScope.launch {
            postsRepo.clearCompare()
            selectedIds.forEach { postsRepo.addToCompare(it) }
            onReady()
        }
    }

    fun onQueryChange(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
        searchJob?.cancel()
        if (query.isBlank()) {
            _state.value = _state.value.copy(searchResults = emptyList(), isSearching = false, searchSuggestions = emptyList(), hasSearchedQuery = false)
            return
        }
        // Live type-ahead suggestions: recent queries + brand/subcategory/title tokens from loaded posts
        val tokens = query.trim().lowercase()
        val fromPosts = _state.value.posts
            .flatMap { listOfNotNull(it.brand, it.subcategory, it.subcategoryName, it.categoryName, it.title) }
            .filter { it.isNotBlank() && it.length >= 3 && it.contains(tokens, ignoreCase = true) }
            .distinct()
            .take(5)
        val fromRecent = _state.value.recentQueries.filter { it.contains(tokens, ignoreCase = true) }
        val suggestions = (fromRecent + fromPosts).distinct().take(8)
        _state.value = _state.value.copy(searchSuggestions = suggestions, hasSearchedQuery = false)

        searchJob = viewModelScope.launch {
            delay(300)
            performSearch(query)
        }
    }

    /** Run a search immediately (skips the debounce) — used by IME Search, suggestion taps & recent chips. */
    fun applySearchSuggestion(query: String) {
        searchJob?.cancel()
        _state.value = _state.value.copy(searchQuery = query, hasSearchedQuery = false)
        viewModelScope.launch { performSearch(query) }
    }

    private suspend fun performSearch(query: String) {
        _state.value = _state.value.copy(isSearching = true, searchSuggestions = emptyList())
        val localResults = localSearchResults(query)
        when (val result = postsRepo.feed(query = query)) {
            is ApiResult.Success -> {
                val merged = (result.data + localResults).distinctBy { it.stableId }
                _state.value = _state.value.copy(isSearching = false, searchResults = merged, hasSearchedQuery = true)
                // Persist to recent queries (keep last 10, deduplicate)
                val trimmed = query.trim()
                if (trimmed.isNotBlank()) {
                    val updated = (_state.value.recentQueries.filter { it != trimmed } + trimmed).takeLast(10).reversed()
                    _state.value = _state.value.copy(recentQueries = updated)
                    viewModelScope.launch { prefs.saveRecentSearches(updated) }
                }
            }
            is ApiResult.Failure -> _state.value = _state.value.copy(isSearching = false, searchResults = localResults, hasSearchedQuery = true)
        }
    }

    fun removeRecentQuery(q: String) {
        val updated = _state.value.recentQueries.filter { it != q }
        _state.value = _state.value.copy(recentQueries = updated)
        viewModelScope.launch { prefs.saveRecentSearches(updated) }
    }

    fun clearRecentSearches() {
        _state.value = _state.value.copy(recentQueries = emptyList())
        viewModelScope.launch { prefs.saveRecentSearches(emptyList()) }
    }

    private fun localSearchResults(query: String): List<Post> {
        val terms = query.lowercase().split(Regex("\\s+")).filter { it.isNotBlank() }
        if (terms.isEmpty()) return emptyList()
        val pool = _state.value.posts.distinctBy { it.stableId }
        return pool.filter { post ->
            val haystack = listOfNotNull(
                post.title,
                post.description,
                post.category,
                post.categoryName,
                post.subcategory,
                post.subcategoryName,
                post.brand,
                post.model,
                post.sellerName,
                post.userName,
                post.userHandle,
                post.location,
                post.city,
                post.state,
                post.condition,
                post.status,
                post.tags?.joinToString(" "),
                post.hashtags?.joinToString(" "),
                post.promoLabel,
                post.tier,
                post.pricingType,
                post.availability,
            ).joinToString(" ").lowercase()
            terms.all { haystack.contains(it) }
        }
    }

    fun clearSearch() {
        searchJob?.cancel()
        _state.value = _state.value.copy(searchQuery = "", searchResults = emptyList(), isSearching = false, searchSuggestions = emptyList(), hasSearchedQuery = false)
    }

    fun toggleWishlist(postId: String) {
        val current = _wishlisted.value.toMutableSet()
        if (current.contains(postId)) {
            current.remove(postId)
            SharedExploreStore.removeWishlist(postId)
            viewModelScope.launch {
                // Keep Room in sync so the wishlist badge + offline list stay accurate
                runCatching { wishlistItemDao.deleteByPostId(postId) }
                postsRepo.toggleWishlist(postId)
            }
        } else {
            current.add(postId)
            // Save full Post to shared store so WishlistScreen works without backend
            val post = findActionPost(postId)
            post?.let { SharedExploreStore.addWishlist(it) }
            viewModelScope.launch {
                // Persist to Room too — items survive restart and drive the badge count
                post?.let {
                    runCatching { wishlistItemDao.insert(it.toWishlistItemEntity()) }
                }
                postsRepo.toggleWishlist(postId)
            }
        }
        _wishlisted.value = current
    }

    fun recordViewed(postId: String) {
        viewModelScope.launch {
            runCatching { postsRepo.trackViewed(postId) }
        }
        // Save to recently viewed shared store so RecentlyViewedScreen works without backend
        findActionPost(postId)?.let { SharedExploreStore.addRecentlyViewed(it) }
    }

    fun addToCompare(postId: String) {
        viewModelScope.launch { postsRepo.addToCompare(postId) }
    }

    // ── Preferences persistence (moved from ProfileViewModel) ──
    fun loadPreferences() {
        viewModelScope.launch {
            try {
                val resp = api.getPreferences()
                resp.categories?.toSet()?.let { SharedExploreStore.updateSelectedSubcategories(it) }
                resp.location?.let { SharedExploreStore.updateSelectedLocation(it) }
                resp.minPrice?.let { SharedExploreStore.updateSelectedMinPrice(it) }
                resp.maxPrice?.let { SharedExploreStore.updateSelectedMaxPrice(it) }
            } catch (_: Exception) {
                // If API fails, skip silently — user can set preferences manually
            }
        }
    }

    fun savePreferences(location: String?, minPrice: Int?, maxPrice: Int?, categories: List<String>?) {
        _prefsSaving.value = true
        
        // Sync with SharedExploreStore for ForYou page filtering
        val safeCategories = categories ?: emptyList()
        SharedExploreStore.updateSelectedSubcategories(safeCategories.toSet())
        location?.let { SharedExploreStore.updateSelectedLocation(it) }
        minPrice?.let { SharedExploreStore.updateSelectedMinPrice(it) }
        maxPrice?.let { SharedExploreStore.updateSelectedMaxPrice(it) }
        
        viewModelScope.launch {
            try {
                api.updatePreferences(
                    com.zaruda.app.data.remote.dto.PreferencesUpdateRequest(
                        location = location,
                        minPrice = minPrice,
                        maxPrice = maxPrice,
                        categories = safeCategories,
                    )
                )
            } catch (_: Exception) {
                // API save failed — preferences still work locally via SharedExploreStore
            } finally {
                _prefsSaving.value = false
            }
        }
    }
}

/** Persist a feed [Post] as a Room cart entity (badge + offline list). */
private fun Post.toCartItemEntity(): com.zaruda.app.data.local.db.CartItemEntity = com.zaruda.app.data.local.db.CartItemEntity(
    id = stableId,
    postId = stableId,
    title = displayTitle,
    price = price ?: 0.0,
    originalPrice = originalPrice ?: 0.0,
    imageUrl = primaryImage.orEmpty(),
    category = category.orEmpty(),
    brand = brand.orEmpty(),
    selectedColor = "",
    selectedSize = "",
    quantity = 1,
    inStock = true,
)

/** Persist a feed [Post] as a Room wishlist entity (badge + offline list). */
private fun Post.toWishlistItemEntity(): com.zaruda.app.data.local.db.WishlistItemEntity = com.zaruda.app.data.local.db.WishlistItemEntity(
    id = stableId,
    postId = stableId,
    title = displayTitle,
    price = price ?: 0.0,
    originalPrice = originalPrice ?: 0.0,
    imageUrl = primaryImage.orEmpty(),
    category = category.orEmpty(),
    brand = brand.orEmpty(),
    rating = 0f,
    reviewCount = 0,
)

// Map subcategory name → emoji for visual richness
// All subcategories used by both the preferences sheet and inline chips
private val allSubcategories: List<Pair<String, String>> = listOf(
    "Phones" to "Electronics", "Laptops" to "Electronics", "Tablets" to "Electronics",
    "Cameras" to "Electronics", "Gaming" to "Electronics",
    "Men's Clothing" to "Fashion", "Women's Clothing" to "Fashion",
    "Shoes" to "Fashion", "Bags" to "Fashion", "Watches" to "Fashion",
    "Cars" to "Vehicles", "Motorcycles" to "Vehicles", "Scooters" to "Vehicles",
    "Bicycles" to "Vehicles",
    "Home & Furniture" to "Others", "Sports & Fitness" to "Others",
    "Books & Education" to "Others", "Health & Beauty" to "Others",
    "Agriculture" to "Others", "Real Estate" to "Others",
)

/** Canonical subcategory lists per ecosystem. Single source of truth — used by
 *  both the ViewModel fallback and the ExploreScreen inline chips. */
private val ecosystemSubcategoryMap = mapOf(
    "electronics" to listOf("Phones", "Laptops", "Tablets", "Cameras", "Gaming"),
    "fashion" to listOf("Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Watches"),
    "vehicles" to listOf("Cars", "Motorcycles", "Scooters", "Bicycles", "Spare Parts"),
    "others" to listOf("Home & Furniture", "Sports & Fitness", "Books & Education"),
)
private val allEcosystemSubcategories = listOf(
    "Phones", "Laptops", "Cameras", "Gaming",
    "Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Watches",
    "Cars", "Motorcycles", "Scooters", "Bicycles",
    "Home & Furniture", "Sports & Fitness", "Books & Education",
)

/**
 * Robust subcategory matching for the ForYou feed. A post matches when ANY of its
 * category/subcategory fields (server IDs like "e-phones" or display names like
 * "Phones") contains or is contained by any selected preference subcategory name.
 * This prevents unrelated-category posts leaking into the ForYou feed.
 */
private fun postMatchesForYouSubs(post: Post, selectedSubs: List<String>): Boolean {
    val prefs = selectedSubs.map { it.lowercase().trim() }.filter { it.isNotBlank() }
    if (prefs.isEmpty()) return true
    val haystacks = listOfNotNull(
        post.subcategory,
        post.subcategoryName,
        post.category,
        post.categoryName,
    ).map { it.lowercase().trim() }.filter { it.isNotBlank() }
    if (haystacks.isEmpty()) return false
    return prefs.any { pref ->
        haystacks.any { h ->
            h == pref || matchesForYouToken(pref, h) || matchesForYouToken(h, pref)
        }
    }
}

/**
 * Word-boundary token match: "phones" matches "Phones", "e-phones" and
 * "Phones & Accessories", but NOT "headphones" (no boundary before "phones").
 * This prevents unrelated subcategories leaking into the ForYou feed.
 */
private fun matchesForYouToken(needle: String, haystack: String): Boolean {
    if (haystack == needle) return true
    val pattern = "(^|[^a-z0-9])" + Regex.escape(needle) + "([^a-z0-9]|$)"
    return Regex(pattern, RegexOption.IGNORE_CASE).containsMatchIn(haystack)
}

private fun subcategoryEmoji(name: String): String {
    return when (name) {
        "Phones" -> "📱"; "Laptops" -> "💻"; "Tablets" -> "📟"; "Cameras" -> "📷"
        "Gaming" -> "🎮"; "Accessories" -> "🔌"
        "Men's Clothing" -> "👔"; "Women's Clothing" -> "👗"; "Shoes" -> "👟"
        "Bags" -> "👜"; "Watches" -> "⌚"; "Jewellery" -> "💍"
        "Cars" -> "🚗"; "Motorcycles" -> "🏍️"; "Bicycles" -> "🚲"
        "Trucks" -> "🚛"; "Spare Parts" -> "🔧"
        "Home & Furniture" -> "🏠"; "Books" -> "📚"; "Sports" -> "⚽"
        "Health & Beauty" -> "💄"; "Toys" -> "🧸"; "Services" -> "💼"
        "Agriculture" -> "🌾"; "Real Estate" -> "🏘️"
        "Sports & Fitness" -> "⚽"; "Books & Education" -> "📚"; "Scooters" -> "🛵"
        else -> "📦"
    }
}

private fun categoryEmoji(name: String): String {
    val n = name.lowercase()
    return when {
        n.contains("electron") || n.contains("tech") || n.contains("gadget") -> "💻"
        n.contains("fashion") || n.contains("cloth") || n.contains("apparel") -> "👗"
        n.contains("vehicle") || n.contains("car") || n.contains("bike") || n.contains("motor") -> "🚗"
        n.contains("furniture") || n.contains("home") || n.contains("decor") -> "🏠"
        n.contains("book") || n.contains("education") || n.contains("study") -> "📚"
        n.contains("sport") || n.contains("fitness") || n.contains("gym") -> "⚽"
        n.contains("food") || n.contains("grocery") || n.contains("restaurant") -> "🍔"
        n.contains("job") || n.contains("service") || n.contains("freelan") -> "💼"
        n.contains("real estate") || n.contains("property") || n.contains("house") || n.contains("flat") -> "🏠"
        n.contains("toy") || n.contains("game") || n.contains("kid") -> "🎮"
        n.contains("health") || n.contains("beauty") || n.contains("cosmetic") -> "💄"
        n.contains("pet") || n.contains("animal") -> "🐾"
        n.contains("music") || n.contains("instrument") -> "🎵"
        n.contains("art") || n.contains("craft") || n.contains("handmade") -> "🎨"
        else -> "🏷️"
    }
}

/* ── Explore / Category Hero Backdrop (Full-Bleed Scenic Rapido Standard) ────────── */

@Composable
private fun ExploreHeroBackdrop(categoryKey: String?) {
    val context = LocalContext.current
    val normalizedKey = categoryKey?.lowercase()?.trim()

    val imageUrl = when {
        normalizedKey == "electronics" -> "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&auto=format&fit=crop&q=85"
        normalizedKey == "vehicles" -> "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=85"
        normalizedKey == "fashion" -> "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop&q=85"
        normalizedKey == "lifestyle" || normalizedKey == "furniture" || normalizedKey == "home" -> "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1200&auto=format&fit=crop&q=85"
        else -> "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=85"
    }

    val title = when {
        normalizedKey == "electronics" -> "Electronics"
        normalizedKey == "vehicles" -> "Vehicles"
        normalizedKey == "fashion" -> "Fashion"
        normalizedKey == "lifestyle" -> "Lifestyle"
        normalizedKey == "others" || normalizedKey == "other" -> "Others"
        !categoryKey.isNullOrBlank() -> categoryKey.replaceFirstChar { it.uppercase() }
        else -> "Marketplace"
    }

    val isElectronics = normalizedKey == "electronics"
    val subtitle = when {
        isElectronics -> "Verified electronics • Secure in-app buy"
        !categoryKey.isNullOrBlank() -> "Verified ${categoryKey.lowercase()} • Direct from local sellers"
        else -> "Direct deals from verified local sellers"
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(270.dp),
    ) {
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data(imageUrl)
                .crossfade(true)
                .build(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )

        // Dark vignette scrim overlay for text legibility
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.60f),
                            Color.Black.copy(alpha = 0.25f),
                            Color.Black.copy(alpha = 0.55f),
                            Color.Black.copy(alpha = 0.90f),
                        )
                    )
                )
        )

        // Hero Title + Escrow/Direct Deals Trust Pill (generously padded below floating bar)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 92.dp, start = 16.dp, end = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = title,
                    fontFamily = FontFamily.Serif,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    letterSpacing = 0.5.sp,
                )
                Text(
                    text = "✦",
                    fontSize = 20.sp,
                    color = Color(0xFFF59E0B),
                )
            }

            Spacer(Modifier.height(8.dp))

            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.White.copy(alpha = 0.15f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
            ) {
                Text(
                    text = if (isElectronics) "SECURE IN-APP BUY" else "VERIFIED DIRECT DEALS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp),
                )
            }

            Spacer(Modifier.height(6.dp))

            Text(
                text = subtitle,
                color = Color.White.copy(alpha = 0.85f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/* ── Floating Glassmorphic Top Capsule (Rapido Standard Layer 3) ──────────── */

@Composable
private fun ExploreFloatingTopBar(
    title: String,
    categoryEmoji: String,
    cartCount: Int,
    onBack: () -> Unit,
    onCart: () -> Unit,
    onWishlist: () -> Unit,
    isScrolled: Boolean = false,
) {
    val isDark = ColorTokens.isDarkTheme()
    val barBg by animateColorAsState(
        targetValue = if (isScrolled) {
            if (isDark) Color(0xFF0F172A).copy(alpha = 0.98f) else Color.White.copy(alpha = 0.98f)
        } else {
            Color.Transparent
        },
        label = "barBg",
    )
    val contentColor by animateColorAsState(
        targetValue = if (isScrolled) MaterialTheme.colorScheme.onSurface else Color.White,
        label = "contentColor",
    )
    val buttonBg by animateColorAsState(
        targetValue = if (isScrolled) {
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.65f)
        } else {
            Color.Black.copy(alpha = 0.35f)
        },
        label = "buttonBg",
    )
    val buttonBorderColor by animateColorAsState(
        targetValue = if (isScrolled) {
            MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)
        } else {
            Color.White.copy(alpha = 0.30f)
        },
        label = "buttonBorderColor",
    )

    Surface(
        color = barBg,
        shadowElevation = if (isScrolled) 4.dp else 0.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            // Back Button
            Surface(
                shape = CircleShape,
                color = buttonBg,
                border = BorderStroke(1.dp, buttonBorderColor),
                modifier = Modifier.size(40.dp),
                onClick = onBack,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = contentColor,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }

            // Center Title Pill — smoothly animates in only when scrolled past hero
            AnimatedVisibility(
                visible = isScrolled,
                enter = fadeIn() + scaleIn(initialScale = 0.88f),
                exit = fadeOut() + scaleOut(targetScale = 0.88f),
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = buttonBg,
                    border = BorderStroke(1.dp, buttonBorderColor),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(categoryEmoji, fontSize = 13.sp)
                        Text(
                            text = "$title ✦",
                            color = contentColor,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp,
                        )
                    }
                }
            }

            // Action Buttons: Wishlist & Cart
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    shape = CircleShape,
                    color = buttonBg,
                    border = BorderStroke(1.dp, buttonBorderColor),
                    modifier = Modifier.size(40.dp),
                    onClick = onWishlist,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Outlined.BookmarkBorder,
                            contentDescription = "Wishlist",
                            tint = contentColor,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }

                Surface(
                    shape = CircleShape,
                    color = buttonBg,
                    border = BorderStroke(1.dp, buttonBorderColor),
                    modifier = Modifier.size(40.dp),
                    onClick = onCart,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        BadgedBox(badge = {
                            if (cartCount > 0) {
                                Badge(containerColor = Color(0xFFEF4444)) {
                                    Text("$cartCount", fontSize = 10.sp, color = Color.White)
                                }
                            }
                        }) {
                            Icon(
                                imageVector = Icons.Outlined.ShoppingCart,
                                contentDescription = "Cart",
                                tint = contentColor,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ExploreScreen(
    onOpenPost: (String) -> Unit,
    onOpenSearch: (String) -> Unit = {},
    onOpenCategories: () -> Unit,
    onOpenHome: () -> Unit = {},
    onBack: (() -> Unit)? = null,
    onOpenProfile: () -> Unit = {},
    onOpenForYou: () -> Unit = {},
    onOpenCompare: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    onOpenRewards: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    onOpenWishlist: () -> Unit = {},
    onAddPost: () -> Unit = {},
    onLanguage: () -> Unit = {},
    onOpenUser: (String) -> Unit = {},
    onOpenTierSelection: () -> Unit = {},
    onOpenKyc: () -> Unit = {},
    currentThemeMode: ThemeMode = ThemeMode.SYSTEM,
    onToggleTheme: () -> Unit = {},
    forYouMode: Boolean = false,
    /**
     * When ExploreScreen is hosted inside a MainShell that already renders the global
     * ZarudaTopBar (Marketplace / For You tabs), its own in-Scaffold top bar must be
     * hidden — otherwise two identical top bars stack on screen. Category-scoped hosts
     * (MainShell showTopBar = false) keep the internal bar as the sole header.
     */
    showOwnTopBar: Boolean = true,
    viewModel: ExploreViewModel = hiltViewModel(),
) {
    // Location ViewModel — shares LocationSetupManager singleton with MainShell
    val locationVm: com.zaruda.app.ui.location.AppLocationViewModel = hiltViewModel()
    val isLocationDetecting by locationVm.isDetecting.collectAsState()
    val state by viewModel.state.collectAsState()
    val wishlistedSet by viewModel.wishlisted.collectAsState()
    var showFilterSheet by remember { mutableStateOf(false) }
    val filterSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var showInterestModal by remember { mutableStateOf(false) }
    var interestPostId by remember { mutableStateOf("") }
    var interestPostTitle by remember { mutableStateOf("") }
    var showRestrictionDialog by remember { mutableStateOf(false) }
    var showForYouPrefsSheet by remember { mutableStateOf(false) }
    val forYouPrefsSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var hasAutoShownPrefsOnForYou by remember { mutableStateOf(false) }
    // Ecosystem from CompositionLocal — set when user enters a category from Home
    val ecosystemKey = LocalActiveCategoryKey.current
    val ecosystemSubcategories: List<String> = when {
        state.subcategories.isNotEmpty() -> state.subcategories
        ecosystemKey != null -> ecosystemSubcategoryMap[ecosystemKey] ?: allEcosystemSubcategories
        else -> allEcosystemSubcategories
    }

    // Draft filter state for the bottom sheet
    var draftCondition by remember(showFilterSheet) { mutableStateOf(state.filterCondition) }
    var draftSubcategory by remember(showFilterSheet) { mutableStateOf(state.filterSubcategory) }
    var draftPriceRange by remember(showFilterSheet) { mutableStateOf(state.filterMinPrice..state.filterMaxPrice) }

    // Sync route mode and ecosystem into ViewModel whenever they change
    LaunchedEffect(forYouMode) {
        viewModel.setForYouMode(forYouMode)
        if (forYouMode && !hasAutoShownPrefsOnForYou) {
            // Small delay so loadPreferences() (called in ViewModel init with 500ms delay)
            // has time to populate SharedExploreStore before we check for empty prefs.
            delay(600L)
            val subs = SharedExploreStore.selectedSubcategories
            val loc = SharedExploreStore.selectedLocation
            val minP = SharedExploreStore.selectedMinPrice
            val maxP = SharedExploreStore.selectedMaxPrice
            if (subs.isEmpty() && loc == null && minP == null && maxP == null) {
                showForYouPrefsSheet = true
                hasAutoShownPrefsOnForYou = true
            }
        }
    }
    LaunchedEffect(ecosystemKey) { viewModel.setEcosystem(ecosystemKey) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // ── Layer 1: Curved Sheet Scrolling Content ──
        // The hero wallpaper is the FIRST item inside the LazyColumn (not a fixed
        // backdrop layer), so it scrolls up and away with the content while the
        val listState = rememberLazyListState()
        val isScrolled by remember {
            derivedStateOf {
                listState.firstVisibleItemIndex > 0 || listState.firstVisibleItemScrollOffset > 60
            }
        }

        // ── Layer 1: Curved Sheet Scrolling Content ──
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize(),
        ) {
            AllPostsBrowse(
                state = state,
                wishlisted = wishlistedSet,
                ecosystemSubcategories = ecosystemSubcategories,
                listState = listState,
                onOpenPost = { id ->
                    if (state.restricted) {
                        showRestrictionDialog = true
                    } else {
                        viewModel.recordViewed(id)
                        onOpenPost(id)
                    }
                },
                onToggleWishlist = viewModel::toggleWishlist,
                onSetSort = viewModel::setSortBy,
                onSetQuickFilter = viewModel::setQuickFilter,
                onToggleCompare = viewModel::toggleCompare,
                onToggleCart = viewModel::toggleCart,
                onOpenCompare = onOpenCompare,
                onToggleAutoRefresh = viewModel::toggleAutoRefresh,
                onLoadMore = viewModel::loadMore,
                onOpenSearch = onOpenSearch,
                onOpenFilters = {
                    draftCondition = state.filterCondition
                    draftSubcategory = state.filterSubcategory
                    draftPriceRange = state.filterMinPrice..state.filterMaxPrice
                    showFilterSheet = true
                },
                onOpenPrefs = { showForYouPrefsSheet = true },
                onSelectSubcategory = { sub ->
                    if (sub.isBlank()) {
                        viewModel.setFilterSubcategory(null)
                    } else {
                        viewModel.setFilterSubcategory(if (state.filterSubcategory == sub) null else sub)
                    }
                },
                onSetSubcategories = { subs -> SharedExploreStore.updateSelectedSubcategories(subs.toSet()) },
                onInterested = { postId, postTitle ->
                    interestPostId = postId
                    interestPostTitle = postTitle
                    showInterestModal = true
                },
                onOpenProfile = onOpenProfile,
                onOpenUser = onOpenUser,
                allSubcategories = allSubcategories,
                selectedSubcategories = SharedExploreStore.selectedSubcategories,
                onQueryChange = viewModel::onQueryChange,
                onClearSearch = viewModel::clearSearch,
                onApplySuggestion = viewModel::applySearchSuggestion,
                onRemoveRecent = viewModel::removeRecentQuery,
                onClearRecents = viewModel::clearRecentSearches,
                onOpenHome = onOpenHome,
                onOpenForYou = onOpenForYou,
            )
        }

        // ── Layer 3: Pinned Floating Glassmorphic Top Bar ──
        if (showOwnTopBar) {
            val displayTitle = when {
                !ecosystemKey.isNullOrBlank() -> ecosystemKey.replaceFirstChar { it.uppercase() }
                state.forYouMode -> "For You"
                else -> "Marketplace"
            }
            val displayEmoji = when {
                !ecosystemKey.isNullOrBlank() -> categoryEmoji(ecosystemKey)
                state.forYouMode -> "✨"
                else -> "🛍️"
            }

            ExploreFloatingTopBar(
                title = displayTitle,
                categoryEmoji = displayEmoji,
                cartCount = state.cartItems.size,
                onBack = onBack ?: onOpenHome,
                onCart = onOpenCart,
                onWishlist = onOpenWishlist,
                isScrolled = isScrolled,
            )
        }

        // Plan expiry / expired banner (pinned below floating bar)
        if (state.showPlanExpiryBanner) {
            val bannerIsDark = ColorTokens.isDarkTheme()
            val bannerColor = if (state.planExpired) {
                if (bannerIsDark) Color(0xFFFCA5A5) else Color(0xFFDC2626)
            } else {
                if (bannerIsDark) Color(0xFFFDE68A) else Color(0xFFF59E0B)
            }
            val bannerBg = if (state.planExpired) if (bannerIsDark) Color(0xFF450A0A) else Color(0xFFFEF2F2) else if (bannerIsDark) Color(0xFF2D1F00) else Color(0xFFFFFBEB)
            Surface(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(WindowInsets.statusBars.asPaddingValues())
                    .padding(top = 56.dp)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                color = bannerBg,
                shadowElevation = 6.dp,
                border = BorderStroke(1.dp, bannerColor.copy(alpha = 0.3f)),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(if (state.planExpired) "⚠️" else "🔔", fontSize = 18.sp)
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (state.planExpired) "Your plan has expired" else "Plan expiring soon",
                            fontWeight = FontWeight.Bold, fontSize = 13.sp, color = bannerColor,
                        )
                        Text(
                            if (state.planExpired) "Renew your plan to post listings & access seller features."
                            else "Your plan expires on ${state.planExpiryDate}. Renew now to avoid interruption.",
                            fontSize = 11.sp, color = bannerColor.copy(alpha = 0.8f), lineHeight = 15.sp,
                        )
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp), horizontalAlignment = Alignment.End) {
                        Surface(shape = RoundedCornerShape(8.dp), color = bannerColor) {
                            Text("Renew", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
                        }
                        IconButton(onClick = viewModel::dismissPlanBanner, modifier = Modifier.size(20.dp)) {
                            Icon(Icons.Default.Close, null, tint = bannerColor.copy(alpha = 0.6f), modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }

        // Error banner
        val err = state.errorMessage
        if (err != null) {
            val isAuthError = err.contains("sign in", ignoreCase = true) || err.contains("authentication", ignoreCase = true)
            Surface(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(WindowInsets.statusBars.asPaddingValues())
                    .padding(top = 56.dp)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.errorContainer,
                shadowElevation = 4.dp,
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(err, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.weight(1f))
                    if (isAuthError) {
                        TextButton(onClick = onOpenProfile) {
                            Text("Sign In", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        IconButton(onClick = viewModel::dismissError, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Dismiss", tint = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }

        // Compare floating bar
        if (state.compareItems.isNotEmpty()) {
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                shadowElevation = 8.dp,
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        "${state.compareItems.size} item${if (state.compareItems.size > 1) "s" else ""} selected",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = viewModel::clearCompare) { Text("Clear") }
                        Button(
                            onClick = { viewModel.openCompare(onOpenCompare) },
                            enabled = state.compareItems.size >= 2,
                        ) { Text("Compare (${state.compareItems.size})") }
                    }
                }
            }
        }
    }

    // Filter bottom sheet
    if (showFilterSheet) {
        ModalBottomSheet(
            onDismissRequest = { showFilterSheet = false },
            sheetState = filterSheetState,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 48.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Tune, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))
                        Text(stringResource(R.string.explore_filters_title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (state.hasActiveFilters) {
                            TextButton(onClick = { viewModel.clearFilters(); showFilterSheet = false }) {
                                Icon(Icons.Default.Close, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(stringResource(R.string.explore_filter_clear_all), style = MaterialTheme.typography.labelMedium)
                            }
                        }
                        IconButton(onClick = { showFilterSheet = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Close filters")
                        }
                    }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                // Price range filter — enhanced with quick price chips
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val minVal = draftPriceRange.start.toInt()
                    val maxVal = draftPriceRange.endInclusive.toInt()
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("💰 Price Range", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                        Text("₹$minVal – ₹$maxVal", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    }
                    // Quick price chips
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("Under ₹1K" to (0f..1000f), "₹1K-5K" to (1000f..5000f), "₹5K-20K" to (5000f..20000f), "₹20K+" to (20000f..500000f)).forEach { (label, range) ->
                            val selected = draftPriceRange.start == range.start && draftPriceRange.endInclusive == range.endInclusive
                            FilterChip(
                                selected = selected,
                                onClick = { draftPriceRange = range },
                                label = { Text(label, fontSize = 10.sp) },
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.height(28.dp),
                            )

                        }
                    }
                    androidx.compose.material3.RangeSlider(
                        value = draftPriceRange,
                        onValueChange = { draftPriceRange = it },
                        valueRange = 0f..500000f,
                        steps = 99,
                    )
                }

                // Condition filter
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("📦 Condition", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("any" to "All", "new" to "Brand New", "like_new" to "Like New", "used" to "Used", "refurbished" to "Refurbished").forEach { (key, label) ->
                            FilterChip(
                                selected = draftCondition == key,
                                onClick = { draftCondition = key },
                                label = { Text(label, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.White),
                                shape = RoundedCornerShape(16.dp),
                            )

                        }
                    }
                }

                // Posted within filter
                var selectedPostedWithin by remember { mutableStateOf("any") }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("🕐 Posted Within", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("any" to "Any time", "today" to "Today", "3d" to "3 days", "7d" to "This week", "30d" to "This month").forEach { (key, label) ->
                            FilterChip(
                                selected = selectedPostedWithin == key,
                                onClick = {
                                    selectedPostedWithin = key
                                    when (key) {
                                        "today" -> viewModel.setQuickFilter("today")
                                        "3d" -> viewModel.setQuickFilter("latest5")
                                        "7d" -> viewModel.setQuickFilter("latest10")
                                        else -> viewModel.setQuickFilter("")
                                    }
                                },
                                label = { Text(label, fontSize = 11.sp) },
                                shape = RoundedCornerShape(16.dp),
                            )

                        }
                    }
                }

                // Seller type filter
                var selectedSellerType by remember { mutableStateOf("all") }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("👤 Seller Type", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("all" to "All Sellers", "verified" to "✓ Verified Only", "top_rated" to "⭐ Top Rated").forEach { (key, label) ->
                            FilterChip(
                                selected = selectedSellerType == key,
                                onClick = {
                                    selectedSellerType = key
                                    when (key) {
                                        "verified" -> viewModel.setQuickFilter("verified")
                                        else -> viewModel.setQuickFilter("")
                                    }
                                },
                                label = { Text(label, fontSize = 11.sp) },
                                shape = RoundedCornerShape(16.dp),
                            )

                        }
                    }
                }

                // Location filter
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("📍 Location", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    var draftLocation by remember { mutableStateOf("") }
                    OutlinedTextField(
                        value = draftLocation,
                        onValueChange = { draftLocation = it },
                        placeholder = { Text("City or area…") },
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(18.dp)) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                // Subcategory filter (only when ecosystem is active)
                if (ecosystemSubcategories.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("🏷️ Subcategory", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(ecosystemSubcategories.size) { idx ->
                                val sub = ecosystemSubcategories[idx]
                                FilterChip(
                                    selected = draftSubcategory == sub,
                                    onClick = { draftSubcategory = if (draftSubcategory == sub) null else sub },
                                    label = { Text(sub, style = MaterialTheme.typography.labelMedium) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.secondary, selectedLabelColor = Color.White),
                                    shape = RoundedCornerShape(16.dp),
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(4.dp))
                // Apply / Reset buttons row
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = { showFilterSheet = false },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Text(stringResource(R.string.explore_filter_cancel), fontWeight = FontWeight.SemiBold)
                    }
                    OutlinedButton(
                        onClick = { viewModel.clearFilters(); showFilterSheet = false },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Text(stringResource(R.string.explore_filter_reset), fontWeight = FontWeight.SemiBold)
                    }
                    Button(
                        onClick = {
                            viewModel.applyFilters(draftCondition, draftSubcategory, draftPriceRange.start, draftPriceRange.endInclusive)
                            showFilterSheet = false
                        },
                        modifier = Modifier.weight(1.5f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Icon(Icons.Default.Check, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(stringResource(R.string.explore_filter_apply), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    // Buyer Interest Modal (web parity: "Interested" button → contact seller)
    // ─── ForYou Preferences Sheet ────────────────────────────────────────────
    if (showForYouPrefsSheet) {
        // allSubcategories is defined at ExploreScreen composable level — no redefinition needed
        var draftSubcategories by remember { mutableStateOf(SharedExploreStore.selectedSubcategories) }
        var draftLocation by remember { mutableStateOf(SharedExploreStore.selectedLocation ?: "") }
        var draftMinPrice by remember { mutableStateOf(SharedExploreStore.selectedMinPrice?.toString() ?: "") }
        var draftMaxPrice by remember { mutableStateOf(SharedExploreStore.selectedMaxPrice?.toString() ?: "") }
        var activeCategoryFilter by remember { mutableStateOf<String?>(null) }

        val activeEcosystemKey = state.ecosystemKey
        val sheetSubcategories = remember(activeEcosystemKey) {
            if (!activeEcosystemKey.isNullOrBlank()) {
                allSubcategories.filter { it.second.equals(activeEcosystemKey, ignoreCase = true) }
            } else {
                allSubcategories
            }
        }

        val categoryGroups = remember(sheetSubcategories) {
            sheetSubcategories.groupBy { it.second }
        }

        ModalBottomSheet(
            onDismissRequest = {
                draftSubcategories = SharedExploreStore.selectedSubcategories
                draftLocation = SharedExploreStore.selectedLocation ?: ""
                draftMinPrice = SharedExploreStore.selectedMinPrice?.toString() ?: ""
                draftMaxPrice = SharedExploreStore.selectedMaxPrice?.toString() ?: ""
                showForYouPrefsSheet = false
            },
            sheetState = forYouPrefsSheetState,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Your Preferences",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        if (draftSubcategories.isNotEmpty() || draftLocation.isNotBlank() || draftMinPrice.isNotBlank() || draftMaxPrice.isNotBlank()) {
                            TextButton(onClick = {
                                draftSubcategories = emptySet()
                                draftLocation = ""
                                draftMinPrice = ""
                                draftMaxPrice = ""
                            }) {
                                Text("Reset", color = MaterialTheme.colorScheme.error)
                            }
                        }
                        IconButton(onClick = {
                            draftSubcategories = SharedExploreStore.selectedSubcategories
                            draftLocation = SharedExploreStore.selectedLocation ?: ""
                            showForYouPrefsSheet = false
                        }) {
                            Icon(Icons.Default.Close, null)
                        }
                    }
                }

                // ── Location Section ──
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), thickness = 0.5.dp)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Location", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                }
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = draftLocation,
                    onValueChange = { draftLocation = it },
                    placeholder = { Text("e.g. Mumbai, Bengaluru, Delhi", fontSize = 13.sp) },
                    leadingIcon = { Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(18.dp)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    textStyle = MaterialTheme.typography.bodyLarge,
                )

                // ── Price Range Section ──
                Spacer(modifier = Modifier.height(4.dp))
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), thickness = 0.5.dp)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.AutoMirrored.Filled.TrendingUp, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Price Range", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = draftMinPrice,
                        onValueChange = { draftMinPrice = it.filter { c -> c.isDigit() }.take(6) },
                        placeholder = { Text("Min", fontSize = 13.sp) },
                        leadingIcon = { Text("₹", fontSize = 14.sp, fontWeight = FontWeight.Bold) },
                        singleLine = true,
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        textStyle = MaterialTheme.typography.bodyLarge,
                    )
                    Text("to", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
                    OutlinedTextField(
                        value = draftMaxPrice,
                        onValueChange = { draftMaxPrice = it.filter { c -> c.isDigit() }.take(7) },
                        placeholder = { Text("Max", fontSize = 13.sp) },
                        leadingIcon = { Text("₹", fontSize = 14.sp, fontWeight = FontWeight.Bold) },
                        singleLine = true,
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        textStyle = MaterialTheme.typography.bodyLarge,
                    )
                }

                // ── Your Interests Section ──
                Spacer(modifier = Modifier.height(4.dp))
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), thickness = 0.5.dp)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Your Interests", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text("Select topics you'd like to see — matching posts will show first.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    
                    // Category filter chips
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                        FilterChip(
                            selected = activeCategoryFilter == null,
                            onClick = { activeCategoryFilter = null },
                            label = { Text("All", fontSize = 11.sp) },
                            shape = RoundedCornerShape(16.dp),
                        )
                        for (cat in categoryGroups.keys) {
                            FilterChip(
                                selected = activeCategoryFilter == cat,
                                onClick = { activeCategoryFilter = if (activeCategoryFilter == cat) null else cat },
                                label = { Text(cat, fontSize = 11.sp) },
                                shape = RoundedCornerShape(16.dp),
                            )
                        }
                    }

                    // Subcategory chips for filtered category
                    val displaySubs = if (activeCategoryFilter != null) {
                        categoryGroups[activeCategoryFilter] ?: emptyList()
                    } else sheetSubcategories

                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        for ((subName, catName) in displaySubs) {
                            val isSelected = subName in draftSubcategories
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    draftSubcategories = if (isSelected) {
                                        draftSubcategories - subName
                                    } else {
                                        draftSubcategories + subName
                                    }
                                },
                                label = {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text(when (catName) {
                                            "Electronics" -> "💻"
                                            "Fashion" -> "👗"
                                            "Vehicles" -> "🚗"
                                            else -> "📦"
                                        }, fontSize = 14.sp)
                                        Text(subName, fontSize = 13.sp)
                                    }
                                },
                                shape = RoundedCornerShape(24.dp),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                                ),
                            )
                        }
                    }

                // Active preferences summary
                if (draftSubcategories.isNotEmpty() || draftLocation.isNotBlank() || draftMinPrice.isNotBlank() || draftMaxPrice.isNotBlank()) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Your Selections", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            if (draftSubcategories.isNotEmpty()) {
                                Text("📂 ${draftSubcategories.size} subcategories selected", style = MaterialTheme.typography.bodySmall)
                            }
                            if (draftLocation.isNotBlank()) {
                                Text("📍 $draftLocation", style = MaterialTheme.typography.bodySmall)
                            }
                            if (draftMinPrice.isNotBlank() || draftMaxPrice.isNotBlank()) {
                                val min = draftMinPrice.ifBlank { "0" }
                                val max = draftMaxPrice.ifBlank { "∞" }
                                Text("💰 ₹$min – ₹$max", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Apply button
                Button(
                    onClick = {
                        SharedExploreStore.updateSelectedSubcategories(draftSubcategories)
                        SharedExploreStore.updateSelectedLocation(draftLocation.ifBlank { null })
                        SharedExploreStore.updateSelectedMinPrice(draftMinPrice.toIntOrNull())
                        SharedExploreStore.updateSelectedMaxPrice(draftMaxPrice.toIntOrNull())
                        viewModel.savePreferences(
                            location = draftLocation.ifBlank { null },
                            minPrice = draftMinPrice.toIntOrNull(),
                            maxPrice = draftMaxPrice.toIntOrNull(),
                            categories = draftSubcategories.toList(),
                        )
                        viewModel.loadPosts(reset = true)
                        showForYouPrefsSheet = false
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(Icons.Default.Check, null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Apply Preferences", fontWeight = FontWeight.Bold)
                }

                Spacer(Modifier.height(16.dp))
            }
        }
    }

    // ─── Buyer Interest Modal ────────────────────────────────────────────────
    if (showInterestModal) {
        com.zaruda.app.ui.components.BuyerInterestModal(
            postId = interestPostId,
            postTitle = interestPostTitle,
            onDismiss = { showInterestModal = false },
            onSubmit = { _, _, _ -> showInterestModal = false },
        )
    }

    if (showRestrictionDialog) {
        AlertDialog(
            onDismissRequest = { showRestrictionDialog = false },
            title = {
                Text(
                    text = "Subscription & KYC Required",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "App access is currently limited — you can browse previews only. Unlock the full app by completing BOTH:",
                        fontSize = 14.sp
                    )
                    Text(
                        text = "\u2022  An active subscription plan (any tier)\n\u2022  Aadhaar/PAN KYC verification",
                        fontSize = 14.sp
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showRestrictionDialog = false
                        onOpenTierSelection()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("Choose a Plan", color = Color.White)
                }
            },
            dismissButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    OutlinedButton(
                        onClick = {
                            showRestrictionDialog = false
                            onOpenKyc()
                        }
                    ) {
                        Text("Complete KYC")
                    }
                    TextButton(onClick = { showRestrictionDialog = false }) {
                        Text("Not now")
                    }
                }
            }
        )
    }
}

@Composable
private fun HeroPill(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(Color.White.copy(alpha = 0.18f))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(text, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}


private data class BannerSlide(
    val gradientColors: List<Color>,
    val badge: String,
    val badgeIcon: String,
    val title: String,
    val subtitle: String,
    val ctaText: String,
    val emoji: String,
    val discount: String,
)

private val bannerSlides = listOf(
    BannerSlide(
        gradientColors = listOf(Color(0xFF1E40AF), Color(0xFF3B82F6), Color(0xFF6366F1)),
        badge = "LIMITED TIME", badgeIcon = "🔥",
        title = "Great Deals Await!", subtitle = "Discover unbeatable offers on top brands",
        ctaText = "Shop Now", emoji = "🛒", discount = "UP TO 60% OFF",
    ),
    BannerSlide(
        gradientColors = listOf(Color(0xFF7C3AED), Color(0xFFA855F7), Color(0xFFD946EF)),
        badge = "NEW ARRIVALS", badgeIcon = "✨",
        title = "Fresh Listings Daily", subtitle = "Be the first to grab new items near you",
        ctaText = "Explore", emoji = "✨", discount = "JUST LISTED",
    ),
    BannerSlide(
        gradientColors = listOf(Color(0xFF059669), Color(0xFF10B981), Color(0xFF34D399)),
        badge = "VERIFIED SELLERS", badgeIcon = "✅",
        title = "Shop with Confidence", subtitle = "Trusted sellers with top ratings & reviews",
        ctaText = "Browse", emoji = "🛡️", discount = "100% TRUSTED",
    ),
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun GreatDealsBanner(onShopNow: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { bannerSlides.size })

    // Auto-scroll every 4 seconds
    LaunchedEffect(pagerState) {
        while (true) {
            kotlinx.coroutines.delay(4000)
            val nextPage = (pagerState.currentPage + 1) % bannerSlides.size
            pagerState.animateScrollToPage(nextPage)
        }
    }

    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth(),
            pageSpacing = 12.dp,
            contentPadding = PaddingValues(horizontal = 16.dp),
        ) { page ->
            val slide = bannerSlides[page]
            Card(
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.linearGradient(colors = slide.gradientColors))
                        .padding(20.dp),
                ) {
                    // Decorative circles
                    Box(
                        modifier = Modifier.size(80.dp).align(Alignment.TopEnd)
                            .offset(x = 20.dp, y = (-10).dp)
                            .background(Color.White.copy(alpha = 0.08f), CircleShape)
                    )
                    Box(
                        modifier = Modifier.size(50.dp).align(Alignment.BottomStart)
                            .offset(x = (-10).dp, y = 10.dp)
                            .background(Color.White.copy(alpha = 0.06f), CircleShape)
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.15f)) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Text(slide.badgeIcon, fontSize = 12.sp)
                                    Text(slide.badge, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White, letterSpacing = 1.sp)
                                }
                            }
                            Spacer(Modifier.height(10.dp))
                            Text(slide.title, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = Color.White, lineHeight = 26.sp)
                            Spacer(Modifier.height(4.dp))
                            Text(slide.subtitle, fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f), lineHeight = 18.sp)
                            Spacer(Modifier.height(14.dp))
                            Surface(onClick = onShopNow, shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 4.dp) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Text(slide.ctaText, color = slide.gradientColors.first(), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(16.dp), tint = slide.gradientColors.first())
                                }
                            }
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(start = 12.dp)) {
                            Surface(shape = CircleShape, color = Color.White.copy(alpha = 0.15f), modifier = Modifier.size(72.dp)) {
                                Box(contentAlignment = Alignment.Center) { Text(slide.emoji, fontSize = 36.sp) }
                            }
                            Spacer(Modifier.height(6.dp))
                            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFBBF24)) {
                                Text(slide.discount, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF78350F), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                    }
                }
            }
        }
        // Page indicators
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            repeat(bannerSlides.size) { idx ->
                val isSelected = pagerState.currentPage == idx
                Box(
                    modifier = Modifier
                        .padding(horizontal = 3.dp)
                        .size(if (isSelected) 8.dp else 6.dp)
                        .clip(CircleShape)
                        .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant)
                )
            }
        }
    }
}


@OptIn(ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
private fun AllPostsBrowse(
    state: ExploreState,
    wishlisted: Set<String>,
    ecosystemSubcategories: List<String>,
    onOpenPost: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
    onSetSort: (String) -> Unit,
    onSetQuickFilter: (String?) -> Unit = {},
    onToggleCompare: (String) -> Unit,
    onToggleCart: (String) -> Unit = {},
    onOpenCompare: () -> Unit = {},
    onToggleAutoRefresh: () -> Unit = {},
    onLoadMore: () -> Unit,
    onOpenSearch: (String) -> Unit = {},
    onOpenFilters: () -> Unit = {},
    onOpenPrefs: () -> Unit = {},
    onSelectSubcategory: (String) -> Unit = {},
    onSetSubcategories: (List<String>) -> Unit = {},
    onInterested: (postId: String, postTitle: String) -> Unit = { _, _ -> },
    onOpenProfile: () -> Unit = {},
    onOpenUser: (String) -> Unit = {},
    allSubcategories: List<Pair<String, String>> = emptyList(),
    selectedSubcategories: Set<String> = emptySet(),
    onQueryChange: (String) -> Unit = {},
    onClearSearch: () -> Unit = {},
    onApplySuggestion: (String) -> Unit = {},
    onRemoveRecent: (String) -> Unit = {},
    onClearRecents: () -> Unit = {},
    onOpenHome: () -> Unit = {},
    onOpenForYou: () -> Unit = {},
    listState: LazyListState = rememberLazyListState(),
) {
    val sortOptions = listOf(
        "newest" to "Newest",
        "oldest" to "Oldest",
        "popular" to "Most popular",
        "most_viewed" to "Most viewed",
        "price_asc" to "Price low-high",
        "price_desc" to "Price high-low",
        "featured_first" to "Featured first",
        "premium_first" to "Premium first",
    )
    var isGridView by remember { mutableStateOf(false) }
    var searchFocused by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val browseHaptic = androidx.compose.ui.platform.LocalHapticFeedback.current
    val shouldLoadMore by remember {
        derivedStateOf {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: return@derivedStateOf false
            last >= listState.layoutInfo.totalItemsCount - 3
        }
    }
    // Key on both shouldLoadMore and loadingMore so loadMore fires again
    // after each page finishes loading
    LaunchedEffect(shouldLoadMore, state.loadingMore) {
        if (shouldLoadMore && state.hasMore && !state.loadingMore && !state.loadingPosts && state.posts.isNotEmpty()) onLoadMore()
    }

    val showScrollToTop by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex > 5
        }
    }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(bottom = if (state.compareItems.size >= 2) 150.dp else 100.dp),
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        ) {
            // ── Hero wallpaper — scrolls WITH the content (top of list) ──
            item(key = "hero_banner") {
                ExploreHeroBackdrop(categoryKey = state.ecosystemKey)
            }

            // ── Layer 2: 32dp Floating Curved Sheet Header ──
            item(key = "curved_sheet_header") {
                Surface(
                    shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                    color = MaterialTheme.colorScheme.background,
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth().offset(y = (-24).dp),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 16.dp, bottom = 6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        // 100% Escrow Protection Guarantee Ribbon (ONLY for Electronics / Category 1)
                        if (state.ecosystemKey?.lowercase() == "electronics") {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 2.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFF059669).copy(alpha = 0.08f),
                                border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Shield,
                                        contentDescription = null,
                                        tint = Color(0xFF059669),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Verified Local Marketplace",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = Color(0xFF059669),
                                        )
                                        Text(
                                            text = "Direct deals from verified local sellers • Inspect before you pay",
                                            fontSize = 10.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }

                        val searchCategoryName = when {
                            state.ecosystemKey?.lowercase() == "electronics" -> "Electronics"
                            state.ecosystemKey?.lowercase() == "vehicles" -> "Vehicles"
                            state.ecosystemKey?.lowercase() == "fashion" -> "Fashion"
                            state.ecosystemKey?.lowercase() == "others" || state.ecosystemKey?.lowercase() == "other" -> "Others"
                            !state.ecosystemKey.isNullOrBlank() -> state.ecosystemKey?.replaceFirstChar { it.uppercase() }
                            else -> null
                        }
                        val searchPlaceholder = if (searchCategoryName != null) {
                            "Search in $searchCategoryName..."
                        } else {
                            stringResource(R.string.explore_search_placeholder)
                        }

                        // Search Bar + Filter Button (inside curved sheet)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            OutlinedTextField(
                                value = state.searchQuery,
                                onValueChange = onQueryChange,
                                placeholder = { Text(searchPlaceholder, fontSize = 13.sp) },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(20.dp)) },
                                trailingIcon = {
                                    if (state.searchQuery.isNotBlank()) {
                                        IconButton(onClick = onClearSearch) {
                                            Icon(Icons.Default.Close, contentDescription = "Clear search")
                                        }
                                    }
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(22.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                ),
                                modifier = Modifier.weight(1f).height(46.dp).onFocusChanged { searchFocused = it.isFocused },
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(
                                    onSearch = {
                                        if (state.searchQuery.isNotBlank()) {
                                            onApplySuggestion(state.searchQuery)
                                            focusManager.clearFocus()
                                        }
                                    },
                                ),
                            )
                            BadgedBox(badge = { if (state.hasActiveFilters) Badge(containerColor = Color(0xFFF59E0B)) }) {
                                FilledIconButton(
                                    onClick = onOpenFilters,
                                    modifier = Modifier.size(46.dp),
                                    shape = RoundedCornerShape(22.dp),
                                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                                ) {
                                    Icon(Icons.Default.Tune, contentDescription = "Filters", tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }

                        // Live type-ahead suggestions while typing
                        AnimatedVisibility(visible = state.searchQuery.isNotBlank() && state.searchSuggestions.isNotEmpty()) {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = MaterialTheme.colorScheme.surface,
                                shadowElevation = 6.dp,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 4.dp),
                            ) {
                                Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                                    state.searchSuggestions.forEach { suggestion ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth().clickable { onApplySuggestion(suggestion) }.padding(horizontal = 14.dp, vertical = 10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        ) {
                                            Icon(Icons.AutoMirrored.Filled.TrendingUp, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                                            Text(suggestion, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                            Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                                        }
                                        HorizontalDivider(Modifier.padding(horizontal = 14.dp))
                                    }
                                }
                            }
                        }

                        // Recent searches chips (focused & empty query)
                        AnimatedVisibility(
                            visible = searchFocused && state.searchQuery.isBlank() && state.recentQueries.isNotEmpty(),
                        ) {
                            Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 4.dp)) {
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.History, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(Modifier.width(6.dp))
                                    Text("Recent searches", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                    Text(
                                        "Clear",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.clickable { onClearRecents() },
                                    )
                                }
                                Spacer(Modifier.height(4.dp))
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    items(state.recentQueries, key = { "rq_$it" }) { q ->
                                        Surface(
                                            onClick = { onApplySuggestion(q) },
                                            shape = RoundedCornerShape(20.dp),
                                            color = MaterialTheme.colorScheme.surfaceVariant,
                                        ) {
                                            Row(Modifier.padding(start = 10.dp, end = 4.dp, top = 5.dp, bottom = 5.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(q, style = MaterialTheme.typography.labelSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                Icon(
                                                    Icons.Default.Close,
                                                    contentDescription = "Remove",
                                                    modifier = Modifier.size(14.dp).clickable { onRemoveRecent(q) },
                                                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Quick Navigation Bar: My Home & For You — shown on the marketplace
                        // browse for every category (hidden only while searching or on For You)
                        if (!state.forYouMode && state.searchQuery.isBlank()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 2.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Surface(
                                    onClick = onOpenHome,
                                    shape = RoundedCornerShape(20.dp),
                                    color = Color(0xFF10B981).copy(alpha = 0.10f),
                                    border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.25f)),
                                    modifier = Modifier.weight(1f).height(36.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxSize(),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(Icons.Default.Home, null, tint = Color(0xFF10B981), modifier = Modifier.size(15.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text("My Home", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF10B981))
                                    }
                                }
                                Surface(
                                    onClick = onOpenForYou,
                                    shape = RoundedCornerShape(20.dp),
                                    color = Color(0xFF8B5CF6).copy(alpha = 0.10f),
                                    border = BorderStroke(1.dp, Color(0xFF8B5CF6).copy(alpha = 0.25f)),
                                    modifier = Modifier.weight(1f).height(36.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxSize(),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(Icons.Default.AutoAwesome, null, tint = Color(0xFF8B5CF6), modifier = Modifier.size(15.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text("For You", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF8B5CF6))
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // App Limited Banner (if restricted)
            if (state.restricted) {
                item(key = "restricted_banner") {
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 4.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "App Access Limited",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                                Text(
                                    text = "Purchase a plan and complete KYC verification to unlock full access.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.8f)
                                )
                            }
                        }
                    }
                }
            }
        if (state.searchQuery.isNotBlank()) {
            if (state.isSearching) {
                item(key = "search_loading") {
                    Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
            } else if (state.searchResults.isEmpty()) {
                item(key = "search_empty") {
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        AppEmptyState(icon = Icons.Outlined.ImageNotSupported, title = stringResource(R.string.explore_no_results_title), subtitle = stringResource(R.string.explore_no_results_subtitle))
                    }
                }
            } else {
                // Results header: count + shortcut into the full search page
                item(key = "search_results_header") {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            "${state.searchResults.size} result${if (state.searchResults.size != 1) "s" else ""} for \"${state.searchQuery}\"",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f),
                        )
                        TextButton(onClick = { onOpenSearch(state.searchQuery) }) {
                            Text("View all results", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                items(state.searchResults, key = { it.stableId }) { post ->
                    AllPostCard(post = post, onClick = { onOpenPost(post.stableId) }, isWishlisted = wishlisted.contains(post.stableId), onToggleWishlist = { onToggleWishlist(post.stableId) }, isCompared = state.compareItems.contains(post.stableId), onToggleCompare = { onToggleCompare(post.stableId) }, isInCart = state.cartItems.contains(post.stableId), onToggleCart = { onToggleCart(post.stableId) }, onInterested = { onInterested(post.stableId, post.displayTitle) }, onUserClick = { post.userId?.let(onOpenUser) }, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp).animateItem())
                }
            }
            return@LazyColumn
        }

        // For You mode — filter by selected preferences (subcategories, location, price range)
        val forYouSubs = SharedExploreStore.selectedSubcategories
        val forYouLocation = SharedExploreStore.selectedLocation
        val forYouMinPrice = SharedExploreStore.selectedMinPrice
        val forYouMaxPrice = SharedExploreStore.selectedMaxPrice

        // Category-specific subcategories selection filter
        val activeEcosystemKey = state.ecosystemKey
        val relevantForYouSubs = if (!activeEcosystemKey.isNullOrBlank()) {
            forYouSubs.filter { sub ->
                allSubcategories.any { it.first.equals(sub, ignoreCase = true) && it.second.equals(activeEcosystemKey, ignoreCase = true) }
            }
        } else {
            forYouSubs.toList()
        }

        val hasForYouPrefs = relevantForYouSubs.isNotEmpty() || forYouLocation != null || forYouMinPrice != null || forYouMaxPrice != null
        val forYouFilteredPosts = if (state.forYouMode && hasForYouPrefs) {
            state.posts
                .filter { post ->
                    if (relevantForYouSubs.isNotEmpty()) {
                        postMatchesForYouSubs(post, relevantForYouSubs)
                    } else true
                }
                .filter { post ->
                    if (forYouLocation != null) {
                        val postLoc = (post.location ?: post.city ?: "").lowercase()
                        postLoc.contains(forYouLocation.lowercase())
                    } else true
                }
                .filter { post ->
                    if (forYouMinPrice != null) (post.price ?: 0.0) >= forYouMinPrice.toDouble() else true
                }
                .filter { post ->
                    if (forYouMaxPrice != null) (post.price ?: 0.0) <= forYouMaxPrice.toDouble() else true
                }        } else if (state.forYouMode) {
            state.posts
        } else emptyList()

        if (state.forYouMode) {
            item(key = "for_you_header") {
                ForYouBrowseHeader(
                    resultCount = forYouFilteredPosts.size,
                    categoryCount = ecosystemSubcategories.size,
                    hasActiveFilters = state.hasActiveFilters,
                    autoRefresh = state.autoRefresh,
                    compareCount = state.compareItems.size,
                    onToggleAutoRefresh = onToggleAutoRefresh,
                    onShuffle = { onSetQuickFilter("shuffle") },
                    onOpenCompare = onOpenCompare,
                )
            }
        }

        // Sort + subcategory filter chips inside curved sheet
        item(key = "filters_section") {
            Surface(
                color = MaterialTheme.colorScheme.background,
            ) {
                Column {
                    if (state.forYouMode) {
                        val filteredToolbarSubcategories = if (ecosystemSubcategories.isNotEmpty()) {
                            allSubcategories.filter { ecosystemSubcategories.any { sub -> it.first.equals(sub, ignoreCase = true) } }
                        } else if (!state.ecosystemKey.isNullOrBlank()) {
                            allSubcategories.filter { it.second.equals(state.ecosystemKey, ignoreCase = true) }
                        } else {
                            allSubcategories
                        }
                        ForYouRefineToolbar(
                            activeQuickFilter = state.quickFilter,
                            isGridView = isGridView,
                            onSetQuickFilter = onSetQuickFilter,
                            onOpenFilters = onOpenFilters,
                            onToggleGrid = { isGridView = !isGridView },
                            onOpenPrefs = onOpenPrefs,
                            allSubcategories = filteredToolbarSubcategories,
                            selectedSubcategories = selectedSubcategories,
                        )
                    } else {
                        // Row 1: Subcategory filter pills (prominent when category is active)
                        if (ecosystemSubcategories.isNotEmpty()) {
                            val subScrollState = rememberScrollState()
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(subScrollState)
                                    .padding(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (state.filterSubcategory != null) {
                                    Surface(
                                        shape = RoundedCornerShape(20.dp),
                                        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f),
                                        modifier = Modifier.clickable { onSelectSubcategory(state.filterSubcategory ?: "") },
                                    ) {
                                        Text(
                                            "✕ Clear",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.onErrorContainer,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                        )
                                    }
                                }
                                ecosystemSubcategories.forEach { sub ->
                                    val selected = state.filterSubcategory?.equals(sub, ignoreCase = true) == true
                                    Surface(
                                        shape = RoundedCornerShape(20.dp),
                                        color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                        border = if (selected) null else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                                        modifier = Modifier.clickable { onSelectSubcategory(sub) },
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                                        ) {
                                            Text(subcategoryEmoji(sub), fontSize = 12.sp)
                                            Text(
                                                text = sub,
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Row 2: Sort options (horizontal scroll)
                        val sortScrollState = rememberScrollState()
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(sortScrollState)
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            sortOptions.forEach { (key, label) ->
                                val selected = state.sortBy == key
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = if (selected) MaterialTheme.colorScheme.secondaryContainer else Color.Transparent,
                                    border = if (selected) null else BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                                    modifier = Modifier.clickable { onSetSort(key) },
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        if (selected) {
                                            Icon(Icons.Default.Check, null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSecondaryContainer)
                                        }
                                        Text(
                                            label,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontSize = 11.sp,
                                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                            color = if (selected) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }



        if (!state.forYouMode) {
            item(key = "banner") { GreatDealsBanner(onShopNow = { onOpenSearch("") }) }
        }

        if (state.loadingPosts && state.posts.isEmpty()) {
            items(6, key = { "shimmer_$it" }) { i ->
                com.zaruda.app.ui.components.ListCardShimmer(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                )
            }
        } else if (!state.loadingPosts && state.posts.isEmpty()) {
            item(key = "empty") {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    AppEmptyState(icon = Icons.Outlined.ImageNotSupported, title = stringResource(R.string.explore_no_listings_title), subtitle = stringResource(R.string.explore_no_listings_subtitle))
                }
            }
        } else {
            // Posts header bar with List/Grid toggle at top-right corner
            item(key = "posts_view_header") {
                val postCount = if (state.forYouMode) forYouFilteredPosts.size else state.posts.size
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 16.dp, end = 16.dp, top = 6.dp, bottom = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = if (state.forYouMode) "For You ($postCount)" else "$postCount items",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.surface,
                        shadowElevation = 2.dp,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                        ),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = if (!isGridView) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                modifier = Modifier.clickable {
                                    browseHaptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                    isGridView = false
                                },
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.ViewList,
                                        contentDescription = "List view",
                                        modifier = Modifier.size(14.dp),
                                        tint = if (!isGridView) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Spacer(Modifier.width(4.dp))
                                    Text(
                                        "List",
                                        fontSize = 11.sp,
                                        fontWeight = if (!isGridView) FontWeight.Bold else FontWeight.Medium,
                                        color = if (!isGridView) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = if (isGridView) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                modifier = Modifier.clickable {
                                    browseHaptic.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.LongPress)
                                    isGridView = true
                                },
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        Icons.Default.GridView,
                                        contentDescription = "Grid view",
                                        modifier = Modifier.size(14.dp),
                                        tint = if (isGridView) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Spacer(Modifier.width(4.dp))
                                    Text(
                                        "Grid",
                                        fontSize = 11.sp,
                                        fontWeight = if (isGridView) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isGridView) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            if (isGridView) {
                // 2-column grid view (web parity) — ForYou also filters here
                val gridPosts = if (state.forYouMode) forYouFilteredPosts else state.posts
                if (state.forYouMode && gridPosts.isEmpty() && hasForYouPrefs) {
                    // ForYou grid with no matches — reuse the same guidance as list view
                    item(key = "for_you_no_match_grid") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 32.dp, vertical = 48.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Icon(
                                Icons.Outlined.Search,
                                contentDescription = null,
                                modifier = Modifier.size(56.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                            )
                            Spacer(Modifier.height(16.dp))
                            Text(
                                "No Posts Match Your Preferences",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Try adjusting your subcategory, location, or price range selection.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                            )
                            Spacer(Modifier.height(24.dp))
                            OutlinedButton(onClick = onOpenPrefs) {
                                Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Edit Preferences")
                            }
                        }
                    }
                } else {
                val chunked = gridPosts.chunked(2)
                items(chunked.size, key = { "grid_row_$it" }) { rowIdx ->
                    val row = chunked[rowIdx]
                    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { post ->
                            Card(
                                onClick = { onOpenPost(post.stableId) },
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.weight(1f),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(2.dp),
                            ) {
                                Column {
                                    Box(Modifier.fillMaxWidth().height(145.dp)) {
                                        if (post.primaryImage != null) {
                                            AsyncImage(
                                                model = post.primaryImage,
                                                contentDescription = null,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                                            )
                                        } else {
                                            Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                                                Icon(Icons.Outlined.ImageNotSupported, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(28.dp))
                                            }
                                        }

                                        // Subtle gradient scrim at bottom
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(50.dp)
                                                .align(Alignment.BottomCenter)
                                                .background(
                                                    Brush.verticalGradient(
                                                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.65f))
                                                    )
                                                )
                                        )

                                        // Price badge overlay (bottom-left)
                                        post.price?.let { price ->
                                            Surface(
                                                shape = RoundedCornerShape(6.dp),
                                                color = Color.Black.copy(alpha = 0.75f),
                                                border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.35f)),
                                                modifier = Modifier.align(Alignment.BottomStart).padding(6.dp),
                                            ) {
                                                Text(
                                                    "₹${"%,.0f".format(price)}",
                                                    color = Color.White,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                )
                                            }
                                        }

                                        // Wishlist save overlay (top-right) — glassmorphic circle
                                        val isWished = wishlisted.contains(post.stableId)
                                        Surface(
                                            shape = CircleShape,
                                            color = Color.Black.copy(alpha = 0.45f),
                                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
                                            modifier = Modifier
                                                .align(Alignment.TopEnd)
                                                .padding(6.dp)
                                                .size(28.dp),
                                            onClick = { onToggleWishlist(post.stableId) },
                                        ) {
                                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                                Icon(
                                                    imageVector = if (isWished) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                                                    contentDescription = null,
                                                    tint = if (isWished) Color(0xFFEF4444) else Color.White,
                                                    modifier = Modifier.size(14.dp),
                                                )
                                            }
                                        }
                                    }
                                    Column(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                        Text(
                                            text = post.displayTitle,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Surface(shape = RoundedCornerShape(3.dp), color = Color(0xFF059669).copy(alpha = 0.12f)) {
                                                Text("✔ Verified", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669), modifier = Modifier.padding(horizontal = 3.dp, vertical = 1.dp))
                                            }
                                            post.location?.let { loc ->
                                                Text(
                                                    text = loc,
                                                    fontSize = 10.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                    modifier = Modifier.weight(1f)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
                } // close grid else
            } else {
                val displayPosts = if (state.forYouMode) forYouFilteredPosts else state.posts
                if (state.forYouMode && displayPosts.isEmpty() && !hasForYouPrefs) {                    item(key = "for_you_empty_prefs") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 32.dp, vertical = 48.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Icon(
                                Icons.Default.AutoAwesome,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                            )
                            Spacer(Modifier.height(16.dp))
                            Text(
                                "Your Feed, Your Way",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Tell us what you like — pick categories, set a location, or choose a price range. We'll curate the best posts just for you.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                            )
                            Spacer(Modifier.height(24.dp))
                    Button(
                        onClick = { onOpenPrefs() },
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth(0.7f).height(48.dp),
                            ) {        Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Set Your Preferences", fontWeight = FontWeight.SemiBold)
        }
                        }
                    }
                } else if (state.forYouMode && displayPosts.isEmpty()) {
                    item(key = "for_you_no_match") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 32.dp, vertical = 48.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Icon(
                                Icons.Outlined.Search,
                                contentDescription = null,
                                modifier = Modifier.size(56.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                            )
                            Spacer(Modifier.height(16.dp))
                            Text(
                                "No Posts Match Your Preferences",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Try adjusting your subcategory, location, or price range selection.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,                                 textAlign = TextAlign.Center,
                        )
                        Spacer(Modifier.height(24.dp))
                        OutlinedButton(
                            onClick = onOpenPrefs,
                        ) {
                            Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Edit Preferences")
                        }
                        }
                    }
                } else {
                    items(displayPosts, key = { it.stableId }) { post ->
                        AllPostCard(post = post, onClick = { onOpenPost(post.stableId) }, isWishlisted = wishlisted.contains(post.stableId), onToggleWishlist = { onToggleWishlist(post.stableId) }, isCompared = state.compareItems.contains(post.stableId), onToggleCompare = { onToggleCompare(post.stableId) }, isInCart = state.cartItems.contains(post.stableId), onToggleCart = { onToggleCart(post.stableId) }, onInterested = { onInterested(post.stableId, post.displayTitle) }, onUserClick = { post.userId?.let(onOpenUser) }, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp).animateItem())
                    }
                }
            }
            item(key = "load_more") {
                if (state.loadingMore) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.primary)
                    }
                } else if (!state.hasMore && state.posts.isNotEmpty()) {
                    Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        Text("You've seen all listings", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
    // Floating Compare Panel — appears when ≥2 items selected (web parity)
    if (state.compareItems.size >= 2) {
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(12.dp),
            shape = RoundedCornerShape(16.dp),
            color = Color(0xFF1E293B),
            shadowElevation = 8.dp,
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text("${state.compareItems.size} items selected", fontWeight = FontWeight.SemiBold, color = Color.White, fontSize = 13.sp)
                    Text("Tap Compare to see side-by-side", fontSize = 11.sp, color = Color(0xFF94A3B8))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { state.compareItems.forEach { onToggleCompare(it) } },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFF475569)),
                    ) {
                        Text("Clear", fontSize = 12.sp)
                    }
                    Button(
                        onClick = onOpenCompare,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                    ) {
                        Text("Compare Now", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }


    // Scroll-to-top FAB — appears when scrolled past 5 items
    if (showScrollToTop) {
        val coroutineScope = rememberCoroutineScope()
        FloatingActionButton(
            onClick = { coroutineScope.launch { listState.animateScrollToItem(0) } },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 16.dp, bottom = 96.dp),
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ) {
            Icon(Icons.Default.ArrowUpward, contentDescription = "Scroll to top", modifier = Modifier.size(20.dp))
        }
    }
    } // end Box
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ForYouBrowseHeader(
    resultCount: Int,
    categoryCount: Int,
    hasActiveFilters: Boolean,
    autoRefresh: Boolean,
    compareCount: Int,
    onToggleAutoRefresh: () -> Unit,
    onShuffle: () -> Unit,
    onOpenCompare: () -> Unit,
) {
    val heroShape = RoundedCornerShape(22.dp)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp)
            .clip(heroShape)
            .background(
                Brush.linearGradient(
                    listOf(
                        Color(0xFF2563EB),
                        Color(0xFF4F46E5),
                        Color(0xFF14B8A6),
                    ),
                ),
            ),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White.copy(alpha = 0.88f),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp),
                    ) {
                        Icon(Icons.Default.AutoAwesome, null, tint = Color(0xFF4F46E5), modifier = Modifier.size(14.dp))
                        Text("AI curated", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4F46E5))
                    }
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(R.string.nav_for_you),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                    )
                    Text(
                        "Personalized marketplace picks ranked from activity, filters, and fresh listing signals.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.82f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ForYouMetricTile(
                    value = resultCount.toString(),
                    label = "Matched",
                    modifier = Modifier.weight(1f),
                )
                ForYouMetricTile(
                    value = categoryCount.coerceAtLeast(0).toString(),
                    label = "Categories",
                    modifier = Modifier.weight(1f),
                )
                ForYouMetricTile(
                    value = if (hasActiveFilters) "1" else "0",
                    label = "Filters",
                    modifier = Modifier.weight(1f),
                )
            }

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ForYouHeroAction("Browse", Icons.Default.Visibility, onClick = {})
                ForYouHeroAction("Shuffle", Icons.Default.AutoAwesome, onClick = onShuffle)
                ForYouHeroAction(
                    if (autoRefresh) "Live on" else "Live",
                    Icons.Default.AutoAwesome,
                    selected = autoRefresh,
                    onClick = onToggleAutoRefresh,
                )
                if (compareCount > 0) {
                    ForYouHeroAction(
                        "Compare $compareCount",
                        Icons.Default.Compare,
                        selected = true,
                        onClick = { if (compareCount >= 2) onOpenCompare() },
                    )
                }
            }
        }
    }
}

@Composable
private fun ForYouMetricTile(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurface)
            Text(label.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ForYouHeroAction(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    selected: Boolean = false,
    onClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(22.dp),
        color = if (selected) Color(0xFF1D4ED8) else MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
        onClick = onClick,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 13.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(icon, null, modifier = Modifier.size(15.dp), tint = if (selected) Color.White else MaterialTheme.colorScheme.primary)
            Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ForYouRefineToolbar(
    activeQuickFilter: String?,
    isGridView: Boolean,
    onSetQuickFilter: (String?) -> Unit,
    onOpenFilters: () -> Unit,
    onToggleGrid: () -> Unit,
    onOpenPrefs: () -> Unit = {},
    allSubcategories: List<Pair<String, String>> = emptyList(),
    selectedSubcategories: Set<String> = emptySet(),
    onToggleSubcategory: (String) -> Unit = {},
) {
    var interestsExpanded by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "Refine For You",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(onClick = onOpenPrefs, modifier = Modifier.size(34.dp)) {
                    Icon(
                        Icons.Default.AutoAwesome,
                        contentDescription = "Preferences",
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
                IconButton(onClick = onToggleGrid, modifier = Modifier.size(34.dp)) {
                    Icon(
                        if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                        contentDescription = "Toggle layout",
                        modifier = Modifier.size(19.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            ForYouRefineChip("Posted Today", activeQuickFilter == "today") { onSetQuickFilter("today") }
            ForYouRefineChip("Latest 10", activeQuickFilter == "latest10") { onSetQuickFilter("latest10") }
            ForYouRefineChip("Trending", activeQuickFilter == "trending") { onSetQuickFilter("trending") }
            ForYouRefineChip("More filters", false, onOpenFilters)
        }
        // Inline subcategory chips for quick toggling (collapsed by default)
        if (allSubcategories.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { interestsExpanded = !interestsExpanded }
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                androidx.compose.material3.Text(
                    "Your Interests",
                    style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold,
                    color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Icon(
                    imageVector = if (interestsExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = if (interestsExpanded) "Collapse interests" else "Expand interests",
                    tint = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
            }
            if (interestsExpanded) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    allSubcategories.forEach { (subName, _) ->
                        val isSelected = subName in selectedSubcategories
                        FilterChip(
                            selected = isSelected,
                            onClick = { onToggleSubcategory(subName) },
                            label = {
                                Text(
                                    subName,
                                    style = MaterialTheme.typography.labelSmall,
                                    maxLines = 1,
                                )
                            },
                            leadingIcon = if (isSelected) {
                                { Icon(Icons.Default.Check, null, modifier = Modifier.size(14.dp)) }
                            } else null,
                            shape = RoundedCornerShape(20.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ForYouRefineChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold) },
        leadingIcon = if (selected) {
            { Icon(Icons.Default.Check, null, modifier = Modifier.size(14.dp)) }
        } else null,
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = MaterialTheme.colorScheme.primary,
            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
            labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
        ),
        shape = RoundedCornerShape(20.dp),
    )
}
@Composable
private fun CategoryCard(
    category: Category,
    tint: Color,
    emoji: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = tint),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = emoji,
                style = MaterialTheme.typography.headlineSmall,
            )
            Text(
                text = category.displayName,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
    }
}

@Composable
fun AllPostCard(
    post: Post,
    onClick: () -> Unit,
    isWishlisted: Boolean = false,
    onToggleWishlist: () -> Unit = {},
    isCompared: Boolean = false,
    onToggleCompare: () -> Unit = {},
    onInterested: () -> Unit = {},
    isOwner: Boolean = false,
    onPromote: () -> Unit = {},
    isInCart: Boolean = false,
    onToggleCart: () -> Unit = {},
    onUserClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    var showFullDescription by remember { mutableStateOf(false) }
    var localLiked by remember { mutableStateOf(false) }
    val context = LocalContext.current
    var showPostMenu by remember { mutableStateOf(false) }

    val isElectronics = post.category?.lowercase()?.contains("electron") == true

    Card(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // ── Top: High-Fidelity Hero Image with Overlays ──
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(185.dp)
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = post.displayTitle,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp)),
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Outlined.ImageNotSupported,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                            modifier = Modifier.size(36.dp),
                        )
                    }
                }

                // Bottom gradient scrim for high contrast with price and condition
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.70f))
                            )
                        )
                )

                // Price badge (bottom-left)
                post.price?.let { price ->
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        shape = RoundedCornerShape(8.dp),
                        color = Color.Black.copy(alpha = 0.75f),
                        border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.35f)),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Text(
                                "₹${"%,.0f".format(price)}",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 15.sp,
                                color = Color.White
                            )
                            val origPrice = post.originalPrice
                            if (origPrice != null && origPrice > price && origPrice > 0) {
                                val pct = ((origPrice - price) / origPrice * 100).toInt()
                                Text(
                                    "₹${"%,.0f".format(origPrice)}",
                                    fontSize = 10.sp,
                                    color = Color.White.copy(alpha = 0.65f),
                                    textDecoration = TextDecoration.LineThrough
                                )
                                Text(
                                    "-$pct%",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF34D399)
                                )
                            }
                        }
                    }
                }

                // Condition badge (bottom-right)
                post.condition?.let { cond ->
                    val (condColor, condLabel) = when (cond.lowercase()) {
                        "new" -> Color(0xFF10B981) to "NEW"
                        "like new", "like_new" -> Color(0xFF3B82F6) to "LIKE NEW"
                        "good" -> Color(0xFFF59E0B) to "GOOD"
                        "fair" -> Color(0xFFEA580C) to "FAIR"
                        else -> Color(0xFF6366F1) to cond.uppercase().take(8)
                    }
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = condColor,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                    ) {
                        Text(
                            condLabel,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                // Top-right action: Heart Wishlist bookmark
                Surface(
                    shape = CircleShape,
                    color = Color.Black.copy(alpha = 0.45f),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(10.dp)
                        .size(36.dp),
                    onClick = onToggleWishlist,
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(
                            imageVector = if (isWishlisted) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                            contentDescription = "Wishlist",
                            tint = if (isWishlisted) Color(0xFFEF4444) else Color.White,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }

                // Top-left badges: Tier/Promo/Hot
                Row(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (post.isPromoted == true || (post.boostLevel ?: 0) > 0) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF59E0B)) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp),
                            ) {
                                Text("🔥", fontSize = 9.sp)
                                Text(
                                    post.promoLabel?.ifBlank { "PROMOTED" } ?: "PROMOTED",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                    val viewCount = post.viewCount ?: 0
                    if (viewCount > 50) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFEF4444)) {
                            Text("HOT", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }
            }

            // ── Body: Crisp editorial content below the photo ──
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Title + 3-dot menu row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = post.displayTitle,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = { showPostMenu = true }, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                    }
                }

                // Category & subcategory tags
                if (!post.category.isNullOrBlank()) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFF3B82F6).copy(alpha = 0.12f)) {
                            Text(post.category, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF2563EB), modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                        }
                        post.subcategory?.let { sub ->
                            Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFF10B981).copy(alpha = 0.12f)) {
                                Text(sub, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFF059669), modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                            }
                        }
                        if (post.isNegotiable == true || post.pricingType?.lowercase()?.contains("negoti") == true) {
                            Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF59E0B).copy(alpha = 0.12f)) {
                                Text("Negotiable", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Color(0xFFD97706), modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                            }
                        }
                    }
                }

                // Seller row: avatar, name, verified tag, location & date
                val sellerClickable = onUserClick != null && !post.userId.isNullOrBlank()
                Row(
                    modifier = if (sellerClickable) Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).clickable { onUserClick?.invoke() } else Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val initial = (post.userName?.firstOrNull() ?: post.sellerName?.firstOrNull() ?: 'S').uppercaseChar().toString()
                    Box(
                        modifier = Modifier.size(28.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(initial, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 12.sp)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = post.userName ?: post.sellerName ?: "Verified Seller",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            // Subtle green Verified check badge
                            Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFF059669).copy(alpha = 0.12f)) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF059669), modifier = Modifier.size(10.dp))
                                    Text("Verified", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                                }
                            }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = post.location ?: "Local network",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            post.createdAt?.take(10)?.let { date ->
                                Text("•", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 9.sp)
                                Text(date, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                // Tactile Action Row: Make Offer + Details/Escrow CTA
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(
                        onClick = onInterested,
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                        modifier = Modifier.weight(1f).height(38.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Outlined.LocalOffer, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Make Offer", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                        }
                    }

                    Surface(
                        onClick = onClick,
                        shape = RoundedCornerShape(12.dp),
                        color = if (isElectronics) Color(0xFF059669) else MaterialTheme.colorScheme.primary,
                        modifier = Modifier.weight(1.2f).height(38.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (isElectronics) {
                                Icon(Icons.Default.Shield, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Buy with Platform", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            } else {
                                Icon(Icons.Default.Visibility, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("View Details", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
    // Post action dialog — uses AlertDialog instead of DropdownMenu for reliable touch handling
    if (showPostMenu) {
        


AlertDialog(
            onDismissRequest = { showPostMenu = false },
            title = { Text("Post Actions", fontWeight = FontWeight.Bold) },
            text = {
                Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(onClick = { showPostMenu = false; onToggleCompare() }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.Compare, null, modifier = Modifier.size(20.dp))
                            Column { Text(if (isCompared) "Remove from Compare" else "Compare", fontWeight = FontWeight.Medium) }
                        }
                    }
                    Surface(onClick = { showPostMenu = false; onToggleWishlist() }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(if (isWishlisted) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, null, modifier = Modifier.size(20.dp), tint = if (isWishlisted) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurface)
                            Column { Text(if (isWishlisted) "Remove from Wishlist" else "Save to Wishlist", fontWeight = FontWeight.Medium) }
                        }
                    }
                    Surface(onClick = {
                        showPostMenu = false
                        val shareIntent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Check out this listing: " + post.displayTitle) }
                        context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                    }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Outlined.Share, null, modifier = Modifier.size(20.dp))
                            Column { Text("Share", fontWeight = FontWeight.Medium) }
                        }
                    }
                    Surface(onClick = { showPostMenu = false; onToggleCart() }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(if (isInCart) Icons.Default.RemoveShoppingCart else Icons.Outlined.ShoppingCart, null, modifier = Modifier.size(20.dp), tint = if (isInCart) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurface)
                            Column { Text(if (isInCart) "Remove from Cart" else "Add to Cart", fontWeight = FontWeight.Medium) }
                        }
                    }
                    if (isOwner) {
                        Surface(onClick = { showPostMenu = false; onPromote() }, shape = RoundedCornerShape(12.dp)) {
                            Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.AutoMirrored.Filled.TrendingUp, null, modifier = Modifier.size(20.dp), tint = Color(0xFFF59E0B))
                                Column { Text("Promote", fontWeight = FontWeight.Medium) }
                            }
                        }
                    }
                    Surface(onClick = { showPostMenu = false }, shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Outlined.Flag, null, modifier = Modifier.size(20.dp))
                            Column { Text("Report", fontWeight = FontWeight.Medium) }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showPostMenu = false }) { Text("Cancel") } },
            shape = RoundedCornerShape(22.dp),
        )
    }
}

@Composable
private fun TrendingCard(
    post: Post,
    onClick: () -> Unit,
    isWishlisted: Boolean = false,
    onToggleWishlist: () -> Unit = {},
    onAddToCompare: () -> Unit = {},
    modifier: Modifier = Modifier.width(170.dp),
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp, pressedElevation = 1.dp),
        modifier = modifier,
    ) {
        Column {
            // Image with overlays
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(Icons.Outlined.ImageNotSupported, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                // Price badge overlay
                post.price?.let {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF0F172A).copy(alpha = 0.82f),
                        modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                    ) {
                        Text(
                            "₹${"%,.0f".format(it)}",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                }
                // Condition badge (top-start)
                post.condition?.let { cond ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (cond.lowercase().contains("new")) Color(0xFF10B981).copy(alpha = 0.9f) else Color(0xFFF59E0B).copy(alpha = 0.9f),
                        modifier = Modifier.align(Alignment.TopStart).padding(8.dp),
                    ) {
                        Text(
                            cond,
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                // Save + Compare overlay (top-end)
                Row(
                    modifier = Modifier.align(Alignment.TopEnd).padding(6.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.5f),
                        modifier = Modifier.size(28.dp),
                        onClick = onToggleWishlist,
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Icon(
                                if (isWishlisted) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
                                contentDescription = null,
                                tint = if (isWishlisted) Color(0xFF6366F1) else Color.White,
                                modifier = Modifier.size(14.dp),
                            )

                        }
                    }
                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.5f),
                        modifier = Modifier.size(28.dp),
                        onClick = onAddToCompare,
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Icon(Icons.Filled.Compare, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }
            // Content area
            Column(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                // Seller row
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Surface(shape = CircleShape, color = Color(0xFF6366F1).copy(alpha = 0.15f), modifier = Modifier.size(18.dp)) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text((post.sellerName ?: post.userName ?: "?").take(1).uppercase(), fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF6366F1))
                        }
                    }
                    Text(
                        post.sellerName ?: post.userName ?: "Seller",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                }
                // Location + views
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(10.dp))
                            Text(loc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 70.dp))
                        }
                    }
                    post.viewCount?.let { views ->
                        if (views > 0) Text("$views views", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchResults(
    loading: Boolean,
    posts: List<Post>,
    onOpenPost: (String) -> Unit,
) {
    when {
        loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
        posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            AppEmptyState(
                icon = Icons.Default.Search,
                title = "No results found",
                subtitle = "Try a shorter or different search term.",
            )
        }
        else -> LazyColumn(
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(posts.size) { index ->
                AnimatedLazyItem(index = index, delayPerItemMs = 40) {
                    SearchResultCard(post = posts[index], onClick = { onOpenPost(posts[index].stableId) })
                }
            }
        }
    }
}

@Composable
private fun SearchResultCard(post: Post, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(Icons.Outlined.Category, contentDescription = null)
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                post.price?.let {
                    Text(
                        text = "₹${"%,.0f".format(it)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    post.categoryName?.let { cat ->
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Text(
                                text = cat,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                            )
                        }
                        Spacer(Modifier.width(6.dp))
                    }
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(12.dp),
                            )
                            Text(
                                text = loc,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )

                        }
                    }
                }
            }
        }
    }
}
