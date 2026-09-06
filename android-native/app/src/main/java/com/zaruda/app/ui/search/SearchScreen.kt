package com.zaruda.app.ui.search

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.statusBars
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.SavedSearch
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.SavedSearchesRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.BackToTopButton
import com.zaruda.app.ui.components.ShareLinkBottomSheet
import com.zaruda.app.ui.components.BuyerInterestModal
import com.zaruda.app.ui.components.PostActionRow
import com.zaruda.app.ui.components.PromoBadgeRow
import com.zaruda.app.ui.components.ImageZoomDialog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchState(
    val query: String = "",
    val loading: Boolean = false,
    val items: List<Post> = emptyList(),
    val searched: Boolean = false,
    val error: String? = null,
    val savedSearches: List<SavedSearch> = emptyList(),
    val selectedCategory: String? = null,
    val selectedSubcategory: String? = null,
    val suggestions: List<String> = emptyList(),
    val refreshing: Boolean = false,
    /** Last 10 query strings shown as recent-search chips (web-parity: localStorage in SearchPage.jsx) */
    val recentQueries: List<String> = emptyList(),
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val savedSearchesRepo: SavedSearchesRepository,
    private val categoriesRepo: com.zaruda.app.data.repository.CategoriesRepository,
    private val brandsRepo: com.zaruda.app.data.repository.BrandsRepository,
    private val prefs: com.zaruda.app.data.local.AppPreferences,
    private val localeManager: com.zaruda.app.core.LocaleManager,
    private val analytics: com.zaruda.app.core.AnalyticsHelper,
) : ViewModel() {
    private val _state = MutableStateFlow(SearchState())
    val state: StateFlow<SearchState> = _state.asStateFlow()

    // Live brand/category name pools for autocomplete — loaded from API
    private var brandNames: List<String> = emptyList()
    private var categoryNames: List<String> = emptyList()

    private var job: Job? = null
    private var lastScopedCategory: String? = null

    private suspend fun persisted2(): List<String> = prefs.getRecentSearches()

    init {
        viewModelScope.launch {
            // Restore recent searches from DataStore
            val persisted = prefs.getRecentSearches()
            if (persisted.isNotEmpty()) _state.value = _state.value.copy(recentQueries = persisted)
        }
        viewModelScope.launch {
            // Watch the scope: when a category scope is set, swap in that category's recents
            _state.collect { s ->
                val scoped = s.selectedCategory
                if (scoped != lastScopedCategory) {
                    lastScopedCategory = scoped
                    val perCategory = scoped?.let { prefs.getRecentSearchesFor(it) } ?: emptyList()
                    val global = if (perCategory.isEmpty()) prefs.getRecentSearches() else emptyList()
                    _state.value = _state.value.copy(
                        recentQueries = if (scoped != null) perCategory else (global.ifEmpty { persisted2() }),
                    )
                }
            }
        }
        viewModelScope.launch {
            when (val r = savedSearchesRepo.list()) {
                is ApiResult.Success -> _state.value = _state.value.copy(savedSearches = r.data)
                is ApiResult.Failure -> {}
            }
        }
        // Load brand and category names for autocomplete from API
        viewModelScope.launch {
            when (val r = brandsRepo.list()) {
                is ApiResult.Success -> brandNames = r.data.mapNotNull { it.name }.filter { it.isNotBlank() }
                is ApiResult.Failure -> {} // use empty list — won't show brand suggestions
            }
        }
        viewModelScope.launch {
            when (val r = categoriesRepo.all()) {
                is ApiResult.Success -> categoryNames = r.data.mapNotNull { it.name }.filter { it.isNotBlank() }
                is ApiResult.Failure -> {} // use empty list
            }
        }
        viewModelScope.launch {
            localeManager.localeVersion.collect { /* recompose on locale change */ }
        }
    }

    fun setCategory(cat: String?) {
        // Switching category invalidates the subcategory — different category,
        // different subcategory set (prevents cross-category sub leakage).
        _state.value = _state.value.copy(selectedCategory = cat, selectedSubcategory = null)
        if (_state.value.query.isNotBlank()) {
            viewModelScope.launch { doSearch(_state.value.query) }
        }
    }

    /** Hard category scope (e.g. opened from inside the Fashion category app). */
    fun setScopedCategory(cat: String?) {
        if (cat != null && cat != _state.value.selectedCategory) {
            _state.value = _state.value.copy(selectedCategory = cat)
        }
    }

    /** Subcategory filter — ALWAYS sent as the subcategory param, never as category. */
    fun setSubcategory(sub: String?) {
        if (sub != _state.value.selectedSubcategory) {
            _state.value = _state.value.copy(selectedSubcategory = sub)
            if (_state.value.query.isNotBlank()) {
                viewModelScope.launch { doSearch(_state.value.query) }
            }
        }
    }

    fun onQueryChange(query: String) {
        _state.value = _state.value.copy(query = query)
        job?.cancel()
        if (query.isBlank()) {
            _state.value = _state.value.copy(items = emptyList(), searched = false, suggestions = emptyList())
            return
        }
        // Generate autocomplete suggestions from API-loaded brands + categories
        // Combined with recent queries that match the current input
        val matchedBrands = brandNames.filter { it.contains(query, ignoreCase = true) }
        val matchedCategories = categoryNames.filter { it.contains(query, ignoreCase = true) }
        val matchedRecent = _state.value.recentQueries.filter { it.contains(query, ignoreCase = true) }
        val allSuggestions = (matchedRecent + matchedBrands + matchedCategories).distinct().take(8)
        _state.value = _state.value.copy(suggestions = allSuggestions)

        job = viewModelScope.launch {
            delay(350)
            doSearch(query)
        }
    }

    fun search(query: String, minPrice: Double? = null, maxPrice: Double? = null, condition: String? = null, sortBy: String? = null, brand: String? = null, model: String? = null, locationRadius: Int? = null, dateFrom: String? = null, dateTo: String? = null) {
        job?.cancel()
        _state.value = _state.value.copy(query = query, loading = true, error = null, suggestions = emptyList())
        if (query.isNotBlank()) analytics.logSearch(query)
        job = viewModelScope.launch {
            when (val result = repo.feed(query = query, categoryId = _state.value.selectedCategory)) {
                is ApiResult.Success -> {
                    var list = result.data
                    if (minPrice != null) list = list.filter { (it.price ?: 0.0) >= minPrice }
                    if (maxPrice != null) list = list.filter { (it.price ?: Double.MAX_VALUE) <= maxPrice }
                    if (condition != null) list = list.filter { it.condition?.equals(condition, ignoreCase = true) == true }
                    if (brand != null) list = list.filter { it.brand?.contains(brand, ignoreCase = true) == true }
                    if (model != null) list = list.filter { it.model?.contains(model, ignoreCase = true) == true }
                    if (dateFrom != null) list = list.filter { (it.createdAt ?: "") >= dateFrom }
                    if (dateTo != null) list = list.filter { (it.createdAt ?: "") <= dateTo }
                    // Apply sorting
                    when (sortBy) {
                        "price_asc" -> list = list.sortedBy { it.price ?: Double.MAX_VALUE }
                        "price_desc" -> list = list.sortedByDescending { it.price ?: 0.0 }
                        "newest" -> list = list.sortedByDescending { it.createdAt ?: "" }
                        "popular" -> list = list.sortedByDescending { it.viewCount ?: 0 }
                        "trending" -> list = list.sortedByDescending { (it.viewCount ?: 0) * 0.7 + (it.likeCount ?: 0) * 0.3 }
                    }
                    _state.value = _state.value.copy(loading = false, items = list, searched = true)
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, searched = true, error = result.error.message)
            }
        }
    }

    fun refresh() {
        if (_state.value.query.isNotBlank()) {
            _state.value = _state.value.copy(refreshing = true)
            viewModelScope.launch {
                doSearch(_state.value.query)
                _state.value = _state.value.copy(refreshing = false)
            }
        }
    }

    fun saveSearch() {
        val q = _state.value.query
        if (q.isBlank()) return
        viewModelScope.launch {
            savedSearchesRepo.save(q, _state.value.selectedCategory)
            when (val r = savedSearchesRepo.list()) {
                is ApiResult.Success -> _state.value = _state.value.copy(savedSearches = r.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun deleteSavedSearch(id: String) {
        viewModelScope.launch {
            savedSearchesRepo.delete(id)
            when (val r = savedSearchesRepo.list()) {
                is ApiResult.Success -> _state.value = _state.value.copy(savedSearches = r.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    private suspend fun doSearch(query: String) {
        _state.value = _state.value.copy(loading = true, error = null)
        when (val result = repo.feed(
            query = query,
            categoryId = _state.value.selectedCategory,
            subcategory = _state.value.selectedSubcategory,
        )) {
            is ApiResult.Success -> {
                val ranked = rankSearchResults(result.data, query)
                // Persist to recent queries (keep last 10, deduplicate) — scoped searches
                // go to that category's own history so recents stay category-specific
                val trimmed = query.trim()
                val updated = (_state.value.recentQueries.filter { it != trimmed } + trimmed).takeLast(10).reversed()
                _state.value = _state.value.copy(loading = false, items = ranked, searched = true, recentQueries = updated)
                // Persist to DataStore (per-category bucket when scoped)
                viewModelScope.launch {
                    val scope = _state.value.selectedCategory
                    if (scope != null) prefs.saveRecentSearchesFor(scope, updated) else prefs.saveRecentSearches(updated)
                }
            }
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, searched = true, error = result.error.message)
        }
    }

    companion object {
        /** Non-keyword tokens that should never require a field match. */
        private val STOP_TOKENS = setOf(
            "under", "below", "less", "than", "over", "above", "above", "upto", "up", "to",
            "budget", "within", "around", "near", "me", "in", "at", "for", "with", "and",
            "or", "the", "a", "an", "of", "on", "best", "good", "cheap", "cheapest",
        )

        /**
         * Smart ranking: tolerant matching (no zero-result walls) + relevance ordering.
         *
         * - Price/budget phrases ("iphone under 50000") become a price filter, not a text token.
         * - Keyword tokens: core tokens must match (title/brand/category/…), descriptive
         *   tokens score instead of hard-fail, so "good condition" never kills results.
         * - Results sorted by match quality (title hit > brand > category > body),
         *   boosted listings and recency as tiebreakers.
         */
        fun rankSearchResults(posts: List<Post>, rawQuery: String): List<Post> {
            val q = rawQuery.trim().lowercase()
            if (q.isEmpty()) return posts

            // ── Budget parsing: "under/below/less than X" → maxPrice, "above/over X" → minPrice
            var minPrice: Double? = null
            var maxPrice: Double? = null
            val budgetRegex = Regex("""(?:under|below|upto|up\s+to|less\s+than|max)\s*(?:rs\.?|₹)?\s*([0-9][0-9,]*)|(?:above|over|more\s+than|min)\s*(?:rs\.?|₹)?\s*([0-9][0-9,]*)""")
            var textQuery = q
            budgetRegex.findAll(q).forEach { m ->
                val amount = (m.groupValues[1].ifBlank { m.groupValues[2] }).replace(",", "").toDoubleOrNull()
                if (amount != null) {
                    if (m.groupValues[1].isNotBlank()) maxPrice = amount else minPrice = amount
                }
                textQuery = textQuery.replace(m.value, " ")
            }

            val tokens = textQuery.split("\\s+".toRegex()).filter { it.isNotBlank() }
            if (tokens.isEmpty() && minPrice == null && maxPrice == null) return posts

            data class Scored(val post: Post, val score: Int)

            val scored = posts.mapNotNull { post ->
                // Budget filter first (hard constraint)
                val price = post.price
                if (maxPrice != null && price != null && price > maxPrice!!) return@mapNotNull null
                if (minPrice != null && price != null && price < minPrice!!) return@mapNotNull null

                val title = post.title?.lowercase().orEmpty()
                val brand = post.brand?.lowercase().orEmpty()
                val category = listOfNotNull(post.categoryName, post.subcategoryName).joinToString(" ").lowercase()
                val body = listOf(
                    post.description, post.model, post.location, post.city, post.state,
                    post.condition, post.color, post.size, post.tags?.joinToString(" "),
                    post.year?.toString(), post.mileage?.toString(), post.ramStorage,
                ).mapNotNull { it?.lowercase() }.joinToString(" ")

                var mustMatch = 0
                var score = 0
                for (token in tokens) {
                    if (token in STOP_TOKENS || token.length < 2) continue
                    val t = token.trim('\'', ',', '.', '!', '?')
                    if (t.isEmpty()) continue
                    val inTitle = t in title
                    val inBrand = t in brand
                    val inCategory = t in category
                    val inBody = t in body
                    if (inTitle) score += 10
                    if (inBrand) score += 6
                    if (inCategory) score += 5
                    if (inBody) score += 2
                    // Title must contain the token OR any field must — otherwise token is a
                    // "descriptive" token that scores but doesn't disqualify.
                    if (inTitle || inBrand || inCategory || inBody) mustMatch++
                }

                // Require at least one meaningful keyword hit somewhere (or a pure-budget search).
                if (mustMatch == 0 && tokens.any { it !in STOP_TOKENS && it.length >= 2 }) return@mapNotNull null

                // Boost & recency tiebreakers
                score += (post.boostLevel ?: 0) * 3
                if (post.createdAt?.take(10)?.let { it >= "2026-01-01" } == true) score += 1
                Scored(post, score)
            }

            return scored.sortedWith(
                compareByDescending<Scored> { it.score }
                    .thenByDescending { it.post.viewCount ?: 0 }
            ).map { it.post }
        }
    }

    fun removeRecentQuery(q: String) {
        val updated = _state.value.recentQueries.filter { it != q }
        _state.value = _state.value.copy(recentQueries = updated)
        viewModelScope.launch {
            val scope = _state.value.selectedCategory
            if (scope != null) prefs.saveRecentSearchesFor(scope, updated) else prefs.saveRecentSearches(updated)
        }
    }

    fun clearAllRecentSearches() {
        _state.value = _state.value.copy(recentQueries = emptyList())
        viewModelScope.launch {
            val scope = _state.value.selectedCategory
            if (scope != null) prefs.saveRecentSearchesFor(scope, emptyList()) else prefs.saveRecentSearches(emptyList())
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    prefillQuery: String = "",
    scopedCategory: String? = null,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val focusRequester = remember { FocusRequester() }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // Lock the category scope once (category-app search must never go cross-category)
    val scopeLabel = scopedCategory?.replaceFirstChar { it.uppercase() }
    LaunchedEffect(scopedCategory) {
        if (!scopedCategory.isNullOrBlank()) viewModel.setScopedCategory(scopedCategory)
    }
    // Apply prefill query from deep-link (B7: SavedSearches "Run")
    LaunchedEffect(prefillQuery) {
        if (prefillQuery.isNotBlank() && state.query.isBlank()) {
            viewModel.onQueryChange(prefillQuery)
            viewModel.search(prefillQuery)
            // avoid double-search with the scoped LaunchedEffect above
        }
    }
    var showFilters by remember { mutableStateOf(false) }
    var minPrice by remember { mutableStateOf("") }
    var maxPrice by remember { mutableStateOf("") }
    var selectedCondition by remember { mutableStateOf("") }
    var selectedBrand by remember { mutableStateOf("") }
    var selectedModel by remember { mutableStateOf("") }
    var locationRadius by remember { mutableStateOf("") }
    var dateFrom by remember { mutableStateOf("") }
    var dateTo by remember { mutableStateOf("") }
    var sortBy by remember { mutableStateOf("") }
    var sortDirection by remember { mutableStateOf("desc") }
    var showShareSheet by remember { mutableStateOf(false) }
    var sharePostId by remember { mutableStateOf("") }
    var sharePostTitle by remember { mutableStateOf("") }
    var showInterestModal by remember { mutableStateOf(false) }
    var interestPostId by remember { mutableStateOf("") }
    var interestPostTitle by remember { mutableStateOf("") }
    var zoomImages by remember { mutableStateOf<List<String>>(emptyList()) }
    val haptic = LocalHapticFeedback.current
    val activeFilterCount = listOf(minPrice.isNotBlank(), maxPrice.isNotBlank(), selectedCondition.isNotBlank(), sortBy.isNotBlank(), selectedBrand.isNotBlank(), selectedModel.isNotBlank(), locationRadius.isNotBlank(), dateFrom.isNotBlank(), dateTo.isNotBlank(), state.selectedSubcategory != null).count { it }

    val voiceLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val spokenText = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
        spokenText?.firstOrNull()?.let { text ->
            viewModel.onQueryChange(text)
            viewModel.search(text)
        }
    }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    if (showShareSheet) {
        ShareLinkBottomSheet(title = sharePostTitle, postId = sharePostId, onDismiss = { showShareSheet = false })
    }
    if (showInterestModal) {
        BuyerInterestModal(postId = interestPostId, postTitle = interestPostTitle, onDismiss = { showInterestModal = false }, onSubmit = { _, _, _ -> showInterestModal = false })
    }
    if (zoomImages.isNotEmpty()) {
        ImageZoomDialog(imageUrls = zoomImages, onDismiss = { zoomImages = emptyList() })
    }

    // Category-specific rotating hints when scoped; general hints otherwise
    val placeholderHints = remember(scopedCategory) {
        when (scopeLabel?.lowercase()) {
            "fashion" -> listOf(
                "Search 'Designer Sarees'...",
                "Search 'Levi's Jeans'...",
                "Search 'Nike Sneakers'...",
                "Search 'Michael Kors Bag'...",
                "Search in Fashion...",
            )
            "electronics" -> listOf(
                "Search 'iPhone 15 Pro'...",
                "Search 'Laptops under ₹50k'...",
                "Search 'Sony Alpha Cameras'...",
                "Search 'PS5 Console'...",
                "Search in Electronics...",
            )
            "vehicles" -> listOf(
                "Search 'Royal Enfield Himalayan'...",
                "Search 'Honda Activa'...",
                "Search 'Cars under 5 lakh'...",
                "Search 'Spare Parts'...",
                "Search in Vehicles...",
            )
            "others" -> listOf(
                "Search 'IKEA Shelf'...",
                "Search 'Basmati Rice 5kg'...",
                "Search 'Study Table'...",
                "Search in Others...",
            )
            else -> listOf(
                "Search 'iPhone 15 Pro'...",
                "Search 'Royal Enfield Himalayan'...",
                "Search 'Laptops under ₹50k'...",
                "Search 'Sony Alpha Cameras'...",
                "Search 'Designer Sarees & Kurtis'...",
                "Search verified local listings...",
            )
        }
    }
    var currentHintIndex by remember { mutableIntStateOf(0) }
    LaunchedEffect(scopedCategory) {
        currentHintIndex = 0
        while (true) {
            delay(3000)
            currentHintIndex = (currentHintIndex + 1) % placeholderHints.size
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        SearchHeroBackdrop()

        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(110.dp))
            
            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(modifier = Modifier.fillMaxSize().padding(top = 12.dp)) {
                    // Active category-scope banner — makes the scope obvious and removable
                    if (scopeLabel != null) {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Default.Category, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                Text(
                                    "Searching in $scopeLabel only",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.weight(1f),
                                )
                                TextButton(onClick = { viewModel.setScopedCategory(null); viewModel.setCategory(null) }) {
                                    Text("All categories", fontSize = 11.sp)
                                }
                            }
                        }
                    }

                    // Category-Scoped Trust Ribbon
                    val isCategoryOne = state.selectedCategory?.let { cat ->
                        cat == "1" || cat.lowercase().contains("electronic") || cat.lowercase().contains("gadget") || cat.lowercase().contains("mobile")
                    } == true || (state.query.isNotBlank() && listOf("iphone", "ps5", "phone", "laptop", "macbook", "samsung", "camera", "tv", "gadget", "electronics").any { state.query.lowercase().contains(it) })

                    if (isCategoryOne) {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF059669).copy(alpha = 0.08f),
                            border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Filled.Shield, contentDescription = null, tint = Color(0xFF059669), modifier = Modifier.size(18.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Verified Local Sellers",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = Color(0xFF059669),
                                    )
                                    Text(
                                        text = "Inspect the item before you pay",
                                        fontSize = 10.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    } else {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF2563EB).copy(alpha = 0.08f),
                            border = BorderStroke(1.dp, Color(0xFF2563EB).copy(alpha = 0.25f)),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Filled.Verified, contentDescription = null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Verified Marketplace Search",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = Color(0xFF2563EB),
                                    )
                                    Text(
                                        text = "Direct verified sellers & inspected listings across all categories",
                                        fontSize = 10.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }

            // Autocomplete suggestions dropdown
            AnimatedVisibility(visible = state.suggestions.isNotEmpty() && !state.searched) {
                Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 4.dp) {
                    Column(Modifier.fillMaxWidth()) {
                        state.suggestions.forEach { suggestion ->
                            Row(
                                Modifier.fillMaxWidth().clickable { viewModel.onQueryChange(suggestion); viewModel.search(suggestion) }.padding(horizontal = 16.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Icon(Icons.AutoMirrored.Filled.TrendingUp, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                                Text(suggestion, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }

            // Recent queries chips (web-parity: SearchPage.jsx recentSearches localStorage row)
            AnimatedVisibility(visible = state.recentQueries.isNotEmpty() && state.query.isBlank()) {
                Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.History, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(4.dp))
                        Text("Recent searches", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                    }
                    Spacer(Modifier.height(4.dp))
                    androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(state.recentQueries, key = { it }) { q ->
                            InputChip(
                                selected = false,
                                onClick = { viewModel.onQueryChange(q); viewModel.search(q) },
                                label = { Text(q, style = MaterialTheme.typography.labelSmall) },
                                trailingIcon = {
                                    Icon(Icons.Default.Close, null, modifier = Modifier.size(12.dp).clickable { viewModel.removeRecentQuery(q) })
                                },
                            )
                        }
                    }
                }
            }

            // Advanced Filter Panel
            AnimatedVisibility(visible = showFilters, enter = expandVertically(), exit = shrinkVertically()) {
                Surface(color = MaterialTheme.colorScheme.surface) {
                    Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Advanced Filters", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            if (activeFilterCount > 0) {
                                TextButton(onClick = { minPrice = ""; maxPrice = ""; selectedCondition = ""; sortBy = ""; selectedBrand = ""; selectedModel = ""; locationRadius = ""; dateFrom = ""; dateTo = ""; viewModel.setSubcategory(null) }) {
                                    Icon(Icons.Default.ClearAll, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Clear All")
                                }
                            }
                        }

                        // Price range with Quick Chips & Visual Distribution Bars
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text("Price Range", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(6.dp))

                            // Mini Histogram bars
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(28.dp)
                                    .padding(horizontal = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.Bottom,
                            ) {
                                val heights = listOf(0.25f, 0.45f, 0.70f, 1.0f, 0.85f, 0.60f, 0.40f, 0.20f)
                                heights.forEach { h ->
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .fillMaxHeight(h)
                                            .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                                            .background(
                                                if (minPrice.isNotBlank() || maxPrice.isNotBlank())
                                                    MaterialTheme.colorScheme.primary
                                                else
                                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)
                                            )
                                    )
                                }
                            }

                            Spacer(Modifier.height(6.dp))

                            // Quick Price Chips
                            Row(
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                listOf(
                                    "Under ₹1,000" to ("" to "1000"),
                                    "₹1k - ₹5k" to ("1000" to "5000"),
                                    "₹5k - ₹20k" to ("5000" to "20000"),
                                    "₹20k+" to ("20000" to ""),
                                ).forEach { (label, range) ->
                                    val isSelected = minPrice == range.first && maxPrice == range.second
                                    Surface(
                                        shape = RoundedCornerShape(16.dp),
                                        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                                        border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent),
                                        modifier = Modifier.clickable {
                                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                            if (isSelected) {
                                                minPrice = ""; maxPrice = ""
                                            } else {
                                                minPrice = range.first; maxPrice = range.second
                                            }
                                        },
                                    ) {
                                        Text(
                                            text = label,
                                            fontSize = 11.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                        )
                                    }
                                }
                            }

                            Spacer(Modifier.height(8.dp))

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = minPrice, onValueChange = { minPrice = it.filter(Char::isDigit) },
                                    label = { Text("Min ₹") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                                    modifier = Modifier.weight(1f),
                                )
                                OutlinedTextField(
                                    value = maxPrice, onValueChange = { maxPrice = it.filter(Char::isDigit) },
                                    label = { Text("Max ₹") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }

                        // Date Range
                        Text("Date Range", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = dateFrom, onValueChange = { dateFrom = it },
                                label = { Text("From (YYYY-MM-DD)") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                                modifier = Modifier.weight(1f),
                            )
                            OutlinedTextField(
                                value = dateTo, onValueChange = { dateTo = it },
                                label = { Text("To (YYYY-MM-DD)") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                                modifier = Modifier.weight(1f),
                            )
                        }

                        // Brand
                        Text("Brand", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            val brands = listOf("", "Apple", "Samsung", "Nike", "Sony", "Dell", "HP", "Xiaomi", "OnePlus")
                            items(brands, key = { "brand_$it" }) { brand ->
                                FilterChip(
                                    selected = selectedBrand == brand,
                                    onClick = { selectedBrand = brand },
                                    label = { Text(if (brand.isBlank()) "Any" else brand, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
                                )
                            }
                        }

                        // Model
                        OutlinedTextField(
                            value = selectedModel, onValueChange = { selectedModel = it },
                            label = { Text("Model / Description") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                            placeholder = { Text("e.g., iPhone 15 Pro, Galaxy S24") },
                            modifier = Modifier.fillMaxWidth(),
                        )

                        // Location Radius
                        Text("Location Radius (km)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            val radii = listOf("", "5", "10", "25", "50", "100")
                            items(radii, key = { "radius_$it" }) { radius ->
                                FilterChip(
                                    selected = locationRadius == radius,
                                    onClick = { locationRadius = radius },
                                    label = { Text(if (radius.isBlank()) "Any" else "${radius}km", style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
                                )
                            }
                        }

                        // Condition
                        Text("Condition", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(listOf("", "New", "Like New", "Used", "Refurbished"), key = { "cond_$it" }) { cond ->
                                FilterChip(
                                    selected = selectedCondition == cond,
                                    onClick = { selectedCondition = cond },
                                    label = { Text(if (cond.isBlank()) "Any" else cond, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
                                )
                            }
                        }

                        // Sort (6 options) + Direction Toggle
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Sort By", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Direction:", style = MaterialTheme.typography.labelSmall, fontSize = 11.sp)
                                Spacer(Modifier.width(4.dp))
                                FilterChip(
                                    selected = sortDirection == "asc",
                                    onClick = { sortDirection = "asc" },
                                    label = { Text("ASC", fontSize = 10.sp) },
                                    modifier = Modifier.height(28.dp),
                                )
                                Spacer(Modifier.width(4.dp))
                                FilterChip(
                                    selected = sortDirection == "desc",
                                    onClick = { sortDirection = "desc" },
                                    label = { Text("DESC", fontSize = 10.sp) },
                                    modifier = Modifier.height(28.dp),
                                )
                            }
                        }
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(listOf(
                                "" to "Relevance",
                                "newest" to "Newest",
                                "popular" to "Popular",
                                "price_asc" to "Price Low→High",
                                "price_desc" to "Price High→Low",
                                "trending" to "Trending"
                            ), key = { "sort_${it.first}" }) { (key, label) ->
                                FilterChip(
                                    selected = sortBy == key,
                                    onClick = { sortBy = key },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
                                )
                            }
                        }

                        // Apply
                        Button(
                            onClick = {
                                if (state.query.isNotBlank()) {
                                    viewModel.search(
                                        query = state.query,
                                        minPrice = minPrice.toDoubleOrNull(),
                                        maxPrice = maxPrice.toDoubleOrNull(),
                                        condition = selectedCondition.ifBlank { null },
                                        sortBy = sortBy.ifBlank { null },
                                        brand = selectedBrand.ifBlank { null },
                                        model = selectedModel.ifBlank { null },
                                        locationRadius = locationRadius.toIntOrNull(),
                                        dateFrom = dateFrom.ifBlank { null },
                                        dateTo = dateTo.ifBlank { null }
                                    )
                                }
                                showFilters = false
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                        ) { Text("Apply ${activeFilterCount} Filter${if (activeFilterCount != 1) "s" else ""}") }
                        HorizontalDivider()
                    }
                }
            }

            // Active filter chips
            if (activeFilterCount > 0 && !showFilters) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    if (minPrice.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { minPrice = "" }, label = { Text("Min ₹$minPrice") }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                    if (maxPrice.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { maxPrice = "" }, label = { Text("Max ₹$maxPrice") }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                    if (selectedCondition.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { selectedCondition = "" }, label = { Text(selectedCondition) }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                    if (selectedBrand.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { selectedBrand = "" }, label = { Text(selectedBrand) }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                    if (selectedModel.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { selectedModel = "" }, label = { Text("Model: $selectedModel") }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                    if (locationRadius.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { locationRadius = "" }, label = { Text("${locationRadius}km") }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                    if (dateFrom.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { dateFrom = "" }, label = { Text("From: $dateFrom") }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                    if (dateTo.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { dateTo = "" }, label = { Text("To: $dateTo") }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                    if (sortBy.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { sortBy = "" }, label = { Text("Sort: $sortBy") }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                    state.selectedSubcategory?.let { sub ->
                        item { InputChip(selected = true, onClick = { viewModel.setSubcategory(null) }, label = { Text("Sub: $sub") }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
                    }
                }
            }

            // Category + Subcategory scope chips
            Column {
                // Category chips
                val categories = listOf(null to "All", "electronics" to "Electronics", "fashion" to "Fashion", "vehicles" to "Vehicles", "mobiles" to "Mobiles", "grocery" to "Grocery", "furniture" to "Furniture", "others" to "Others")
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(categories, key = { it.first ?: "all" }) { (key, label) ->
                        FilterChip(
                            selected = state.selectedCategory == key,
                            onClick = { viewModel.setCategory(key) },
                            label = { Text(label, style = MaterialTheme.typography.labelMedium) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
                        )
                    }
                }
                // Subcategory chips (appears when category is selected)
                if (state.selectedCategory != null) {
                    val subcategories = when (state.selectedCategory) {
                        "electronics" -> listOf("", "Laptops", "Tablets", "TVs", "Cameras", "Headphones", "Speakers")
                        "fashion" -> listOf("", "Men", "Women", "Kids", "Accessories", "Footwear")
                        "vehicles" -> listOf("", "Cars", "Bikes", "Scooters", "Spare Parts")
                        "mobiles" -> listOf("", "Smartphones", "Feature Phones", "Accessories")
                        "furniture" -> listOf("", "Sofa", "Bed", "Table", "Chair", "Wardrobe")
                        else -> emptyList()
                    }
                    if (subcategories.isNotEmpty()) {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            items(subcategories, key = { "sub_$it" }) { sub ->
                                FilterChip(
                                    selected = (state.selectedSubcategory ?: "") == sub,
                                    onClick = { viewModel.setSubcategory(sub.ifBlank { null }) },
                                    label = { Text(if (sub.isBlank()) "All" else sub, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primaryContainer, selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer),
                                )
                            }
                        }
                    }
                }
            }

            PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize(),
            ) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    when {
                        state.loading -> CircularProgressIndicator()
                        state.error != null -> AppEmptyState(icon = Icons.Default.Search, title = "Search unavailable", subtitle = state.error ?: "Please try again.")

                        !state.searched && state.savedSearches.isNotEmpty() -> {
                            LazyColumn(
                                state = listState,
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                                modifier = Modifier.fillMaxSize(),
                            ) {
                                item {
                                    Text("Trending Searches", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 6.dp))
                                }
                                item {
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        val trending = when (scopeLabel?.lowercase()) {
                                            "fashion" -> listOf("Saree", "Kurti", "Sneakers", "Handbag", "Watch", "Jeans", "Lehenga", "Heels")
                                            "electronics" -> listOf("iPhone", "MacBook", "PS5", "Camera", "Headphones", "Smart TV", "Tablet", "Speaker")
                                            "vehicles" -> listOf("Bike", "Scooter", "Car", "Himalayan", "Activa", "Spare Parts", "Bicycle", "Tractor")
                                            "others" -> listOf("Fridge", "Sofa", "Study Table", "Books", "Cycle", "Pets", "Furniture", "Grocery")
                                            else -> listOf("iPhone", "MacBook", "Sneakers", "Car", "Laptop", "Watch", "Camera", "Bike", "Fridge", "TV")
                                        }
                                        items(trending) { topic ->
                                            Surface(onClick = { viewModel.onQueryChange(topic); viewModel.search(topic) }, shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                                                Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(Icons.AutoMirrored.Filled.TrendingUp, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                                                    Spacer(Modifier.width(4.dp))
                                                    Text(topic, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                                }
                                            }
                                        }
                                    }
                                }
                                item {
                                    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("Recent Searches", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        if (state.savedSearches.isNotEmpty() || state.recentQueries.isNotEmpty()) {
                                            Text(
                                                "Clear All",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.primary,
                                                fontWeight = FontWeight.Medium,
                                                modifier = Modifier.clickable { viewModel.clearAllRecentSearches() },
                                            )
                                        }
                                    }
                                }
                                items(state.savedSearches.take(10), key = { it.stableId }) { s ->
                                    Card(
                                        onClick = { viewModel.onQueryChange(s.displayQuery); viewModel.search(s.displayQuery) },
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                    ) {
                                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                            Icon(Icons.Default.History, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(s.displayQuery, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                                            s.category?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                            IconButton(onClick = { viewModel.deleteSavedSearch(s.stableId) }, modifier = Modifier.size(24.dp)) {
                                                Icon(Icons.Default.Close, "Delete", modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        !state.searched -> Column {
                            // Trending section
                            val trendingQueries = remember {
                                listOf("iPhone 15", "Samsung Galaxy S24", "MacBook Air", "Nike Air Max", "PS5", "Honda Activa", "Samsung TV", "Laptop under 50K")
                            }
                            Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.AutoMirrored.Filled.TrendingUp, null, modifier = Modifier.size(16.dp), tint = Color(0xFFEF4444))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Trending Now", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                                }
                                Spacer(Modifier.height(8.dp))
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    items(trendingQueries, key = { "trend_$it" }) { q ->
                                        Surface(
                                            onClick = { viewModel.onQueryChange(q); viewModel.search(q) },
                                            shape = RoundedCornerShape(20.dp),
                                            color = MaterialTheme.colorScheme.secondaryContainer,
                                        ) {
                                            Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.AutoMirrored.Filled.TrendingUp, null, modifier = Modifier.size(12.dp), tint = Color(0xFFEF4444))
                                                Spacer(Modifier.width(4.dp))
                                                Text(q, style = MaterialTheme.typography.labelMedium)
                                            }
                                        }
                                    }
                                }
                            }
                            AppEmptyState(icon = Icons.Default.Search, title = "Start searching", subtitle = "Try item name, brand, category, or location.")
                        }
                        state.items.isEmpty() -> Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
                            Icon(Icons.Outlined.SearchOff, null, modifier = Modifier.size(52.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(12.dp))
                            Text("No results for \"${state.query}\"", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                            Text("Save this search to receive alerts when matching items are listed!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                            
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = { viewModel.saveSearch() },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                modifier = Modifier.fillMaxWidth(0.9f).height(46.dp)
                            ) {
                                Icon(Icons.Default.BookmarkAdd, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Save Search & Get Alert", fontWeight = FontWeight.Bold)
                            }

                            Spacer(Modifier.height(16.dp))
                            Text("Try searching popular categories:", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                                val alts = listOf("Electronics", "Fashion", "Vehicles", "Mobiles")
                                items(alts) { alt -> Surface(onClick = { viewModel.onQueryChange(alt); viewModel.search(alt) }, shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.primaryContainer) { Text(alt, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp), style = MaterialTheme.typography.labelMedium) } }
                            }
                        }
                        else -> {
                            LazyColumn(
                                state = listState,
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Modifier.fillMaxSize(),
                            ) {
                                item {
                                    Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("${state.items.size} result${if (state.items.size != 1) "s" else ""} for \"${state.query}\"", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        if (activeFilterCount > 0) {
                                            Text("$activeFilterCount filter${if (activeFilterCount != 1) "s" else ""} active", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                                        }
                                    }
                                }
                                items(state.items, key = { it.stableId }) { post ->
                                    SearchResultCard(
                                        post = post,
                                        onClick = { onOpenPost(post.stableId) },
                                        onZoom = { img -> zoomImages = listOf(img) },
                                        onShare = { sharePostId = post.stableId; sharePostTitle = post.displayTitle; showShareSheet = true },
                                        onInterested = { interestPostId = post.stableId; interestPostTitle = post.displayTitle; showInterestModal = true },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } // inner Column
        } // Surface
        } // outer Column

        // ── Layer 3: Pinned Floating Glassmorphic Top Bar ──
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(horizontal = 12.dp, vertical = 8.dp),
            shape = RoundedCornerShape(24.dp),
            color = Color(0xFF0F172A).copy(alpha = 0.85f),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.15f)),
            shadowElevation = 8.dp,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Color.White) }
                
                OutlinedTextField(
                    value = state.query,
                    onValueChange = viewModel::onQueryChange,
                    singleLine = true,
                    placeholder = {
                        AnimatedContent(
                            targetState = placeholderHints[currentHintIndex],
                            transitionSpec = {
                                (slideInVertically { height -> height } + fadeIn()).togetherWith(
                                    slideOutVertically { height -> -height } + fadeOut()
                                )
                            },
                            label = "searchHint",
                        ) { hint ->
                            Text(hint, maxLines = 1, overflow = TextOverflow.Ellipsis, color = Color.White.copy(alpha = 0.7f))
                        }
                    },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.White.copy(alpha = 0.7f)) },
                    trailingIcon = {
                        if (state.query.isNotBlank()) {
                            IconButton(onClick = { viewModel.onQueryChange("") }) {
                                Icon(Icons.Default.Close, "Clear", tint = Color.White)
                            }
                        } else {
                            IconButton(onClick = {
                                val intent = android.content.Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                    putExtra(RecognizerIntent.EXTRA_PROMPT, "Search for items...")
                                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                                }
                                try { voiceLauncher.launch(intent) } catch (_: Exception) { }
                            }) {
                                Icon(Icons.Filled.Mic, "Voice search", tint = Color(0xFF10B981))
                            }
                        }
                    },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { if (state.query.isNotBlank()) viewModel.search(state.query) }),
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White.copy(alpha = 0.15f),
                        unfocusedContainerColor = Color.White.copy(alpha = 0.1f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        cursorColor = Color.White,
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent
                    ),
                    modifier = Modifier.weight(1f).height(50.dp).focusRequester(focusRequester),
                )

                if (state.query.isNotBlank() && state.searched) {
                    IconButton(onClick = { viewModel.saveSearch() }) {
                        Icon(Icons.Default.BookmarkAdd, "Save search", tint = Color(0xFF10B981))
                    }
                }
                IconButton(onClick = { showFilters = !showFilters }) {
                    Box {
                        Icon(Icons.Default.FilterList, null, tint = if (activeFilterCount > 0) Color(0xFF10B981) else Color.White)
                        if (activeFilterCount > 0) {
                            Surface(shape = CircleShape, color = Color(0xFF10B981), modifier = Modifier.align(Alignment.TopEnd).size(16.dp)) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                    Text("$activeFilterCount", style = MaterialTheme.typography.labelSmall, color = Color.White, fontSize = 9.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    } // Box
}

@Composable
fun SearchHeroBackdrop() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
    ) {
        coil.compose.AsyncImage(
            model = "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80",
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF0F172A).copy(alpha = 0.40f),
                            Color(0xFF0F172A).copy(alpha = 0.85f),
                        )
                    )
                )
        )
    }
}

@Composable
private fun SearchResultCard(
    post: Post,
    onClick: () -> Unit,
    onZoom: (String) -> Unit,
    onShare: () -> Unit,
    onInterested: () -> Unit
) {
    var wishlisted by remember { mutableStateOf(false) }
    val isElectronics = post.categoryId == "1" || 
        (post.category?.lowercase()?.contains("electronic") == true) || 
        (post.categoryName?.lowercase()?.contains("electronic") == true) ||
        (post.category?.lowercase()?.contains("mobile") == true) ||
        (post.categoryName?.lowercase()?.contains("mobile") == true) ||
        (post.category?.lowercase()?.contains("gadget") == true) ||
        (post.categoryName?.lowercase()?.contains("gadget") == true)

    Card(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column {
            // ── Top Hero Image with Scrim & Badges ──
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(185.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                post.primaryImage?.let { img ->
                    AsyncImage(
                        model = img,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clickable { onZoom(img) }
                    )
                } ?: Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Outlined.ImageNotSupported,
                        contentDescription = null,
                        modifier = Modifier.size(36.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    )
                }

                // Dark gradient scrim at bottom of image
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.65f)),
                                startY = 180f
                            )
                        )
                )

                // Overlaid Price Pill (Bottom-Left)
                post.price?.let { p ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color.Black.copy(alpha = 0.65f),
                        border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.3f)),
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(10.dp),
                    ) {
                        Text(
                            text = "₹" + "%,.0f".format(p),
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        )
                    }
                }

                // Wishlist Button (Top-Right)
                IconButton(
                    onClick = { wishlisted = !wishlisted },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .size(36.dp)
                        .background(Color.Black.copy(alpha = 0.45f), CircleShape),
                ) {
                    Icon(
                        imageVector = if (wishlisted) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder,
                        contentDescription = "Save",
                        tint = if (wishlisted) Color(0xFF10B981) else Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Top-Left Promotional / Condition Badges
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
                    post.condition?.let { cond ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (cond.lowercase() == "new") Color(0xFF10B981).copy(alpha = 0.85f) else Color.Black.copy(alpha = 0.55f),
                        ) {
                            Text(
                                text = cond.replaceFirstChar { it.uppercase() },
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            // ── Card Body Content ──
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Title
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )

                // Category & Subcategory tags
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (!post.category.isNullOrBlank()) {
                        Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF3B82F6).copy(alpha = 0.12f)) {
                            Text(post.category, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF2563EB), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                    post.subcategory?.let { sub ->
                        Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF10B981).copy(alpha = 0.12f)) {
                            Text(sub, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = Color(0xFF059669), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                    if (post.isNegotiable == true || post.pricingType?.lowercase()?.contains("negoti") == true) {
                        Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFF59E0B).copy(alpha = 0.12f)) {
                            Text("Negotiable", fontSize = 10.sp, fontWeight = FontWeight.Medium, color = Color(0xFFD97706), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }

                // Seller Row: Avatar, Name, Verified Badge & Location
                val sellerName = post.userName ?: post.sellerName ?: "Verified Seller"
                val initial = sellerName.firstOrNull()?.uppercaseChar()?.toString() ?: "S"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(initial, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 11.sp)
                    }
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = sellerName,
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFF059669).copy(alpha = 0.12f)) {
                            Row(
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(2.dp),
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF059669), modifier = Modifier.size(9.dp))
                                Text("Verified", fontSize = 8.5.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                            }
                        }
                    }
                    post.location?.let { loc ->
                        Text(
                            text = loc,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }

                // ── Tactile Action Row: Make Offer + Details/Escrow CTA ──
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(
                        onClick = onInterested,
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                        modifier = Modifier
                            .weight(1f)
                            .height(38.dp),
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
                        modifier = Modifier
                            .weight(1.2f)
                            .height(38.dp),
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
}
