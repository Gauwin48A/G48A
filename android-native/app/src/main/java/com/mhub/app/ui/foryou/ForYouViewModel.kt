package com.mhub.app.ui.foryou

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.Stable
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.SponsoredRepository
import com.mhub.app.data.repository.RecommendationsRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.CartRepository
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.data.repository.ProfileRepository
import com.mhub.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
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
    val cartItems: Set<String> = emptySet(),
    /** Loaded from API: null key = "All" */
    val categories: List<Pair<String?, String>> = listOf(null to "All"),
    val autoRefresh: Boolean = false,
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
    private var autoRefreshJob: Job? = null
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

    /** Toggle auto-refresh on/off — polls every 30s matching ExploreScreen behavior. */
    fun toggleAutoRefresh() {
        val newVal = !_state.value.autoRefresh
        _state.value = _state.value.copy(autoRefresh = newVal)
        if (newVal) startAutoRefresh() else autoRefreshJob?.cancel()
    }

    private fun startAutoRefresh() {
        autoRefreshJob?.cancel()
        autoRefreshJob = viewModelScope.launch {
            while (true) {
                delay(30_000L)
                if (_state.value.autoRefresh) refresh() else break
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
        // Tier 1: Personalised recommendations (Page 1 only as API returns top N)
        if (page == 1) {
            when (val r = recommendationsRepo.forYou()) {
                is ApiResult.Success -> if (r.data.isNotEmpty()) return r.data
                is ApiResult.Failure -> {}
            }
        }
        
        // Tier 1b: GET /posts/for-you (Paginated sponsored feed)
        when (val r = sponsoredRepo.forYou(limit = 20, page = page)) {
            is ApiResult.Success -> if (r.data.isNotEmpty()) return r.data
            is ApiResult.Failure -> {}
        }

        // Tier 2: preference-filtered posts (Web Parity: filtered by interests)
        val preferredCategoryId: String? = when (val pref = profileRepo.preferences()) {
            is ApiResult.Success -> pref.data.categories?.firstOrNull()
            is ApiResult.Failure -> null
        }
        if (preferredCategoryId != null) {
            when (val r = postsRepo.feed(page = page, limit = 20, categoryId = preferredCategoryId)) {
                is ApiResult.Success -> if (r.data.isNotEmpty()) return r.data
                is ApiResult.Failure -> {}
            }
        }
        
        // Tier 3: general feed fallback (Page 1 only to prevent loops)
        return if (page == 1) {
            when (val f = postsRepo.feed(limit = 20)) {
                is ApiResult.Success -> f.data
                is ApiResult.Failure -> if (com.mhub.app.BuildConfig.DEBUG) MOCK_FOR_YOU_POSTS else emptyList()
            }
        } else emptyList()
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
