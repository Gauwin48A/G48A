package com.zaruda.app.ui.search

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
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

    init {
        viewModelScope.launch {
            // Restore recent searches from DataStore
            val persisted = prefs.getRecentSearches()
            if (persisted.isNotEmpty()) _state.value = _state.value.copy(recentQueries = persisted)
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
        _state.value = _state.value.copy(selectedCategory = cat)
        if (_state.value.query.isNotBlank()) {
            viewModelScope.launch { doSearch(_state.value.query) }
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
        when (val result = repo.feed(query = query, categoryId = _state.value.selectedCategory)) {
            is ApiResult.Success -> {
                // 20-field multi-token AND-logic (web-parity: SearchPage.jsx matchesAllTokens)
                val tokens = query.trim().lowercase().split("\\s+".toRegex()).filter { it.isNotBlank() }
                val filtered = if (tokens.isEmpty()) result.data else result.data.filter { post ->
                    val searchable = listOf(
                        post.title, post.description, post.brand, post.model,
                        post.categoryName, post.subcategoryName, post.location,
                        post.city, post.state, post.condition, post.color,
                        post.size, post.tags?.joinToString(" "), post.userName,
                        post.userHandle, post.hashtags?.joinToString(" "),
                        post.price?.toLong()?.toString(), post.year?.toString(),
                        post.mileage?.toString(), post.ramStorage,
                    ).mapNotNull { it?.lowercase() }.joinToString(" ")
                    tokens.all { token -> searchable.contains(token) }
                }
                // Persist to recent queries (keep last 10, deduplicate)
                val trimmed = query.trim()
                val updated = (_state.value.recentQueries.filter { it != trimmed } + trimmed).takeLast(10).reversed()
                _state.value = _state.value.copy(loading = false, items = filtered, searched = true, recentQueries = updated)
                // Persist to DataStore
                viewModelScope.launch { prefs.saveRecentSearches(updated) }
            }
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, searched = true, error = result.error.message)
        }
    }

    fun removeRecentQuery(q: String) {
        val updated = _state.value.recentQueries.filter { it != q }
        _state.value = _state.value.copy(recentQueries = updated)
        viewModelScope.launch { prefs.saveRecentSearches(updated) }
    }

    fun clearAllRecentSearches() {
        _state.value = _state.value.copy(recentQueries = emptyList())
        viewModelScope.launch { prefs.saveRecentSearches(emptyList()) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    prefillQuery: String = "",
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val focusRequester = remember { FocusRequester() }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    // Apply prefill query from deep-link (B7: SavedSearches "Run")
    LaunchedEffect(prefillQuery) {
        if (prefillQuery.isNotBlank() && state.query.isBlank()) {
            viewModel.onQueryChange(prefillQuery)
            viewModel.search(prefillQuery)
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
    var selectedSubcategory by remember { mutableStateOf("") }
    var showShareSheet by remember { mutableStateOf(false) }
    var sharePostId by remember { mutableStateOf("") }
    var sharePostTitle by remember { mutableStateOf("") }
    var showInterestModal by remember { mutableStateOf(false) }
    var interestPostId by remember { mutableStateOf("") }
    var interestPostTitle by remember { mutableStateOf("") }
    var zoomImages by remember { mutableStateOf<List<String>>(emptyList()) }
    val activeFilterCount = listOf(minPrice.isNotBlank(), maxPrice.isNotBlank(), selectedCondition.isNotBlank(), sortBy.isNotBlank(), selectedBrand.isNotBlank(), selectedModel.isNotBlank(), locationRadius.isNotBlank(), dateFrom.isNotBlank(), dateTo.isNotBlank(), selectedSubcategory.isNotBlank()).count { it }

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

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    OutlinedTextField(
                        value = state.query,
                        onValueChange = viewModel::onQueryChange,
                        singleLine = true,
                        placeholder = { Text("Search listings, brands, categories...") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        trailingIcon = {
                            if (state.query.isNotBlank()) {
                                IconButton(onClick = { viewModel.onQueryChange("") }) {
                                    Icon(Icons.Default.Close, "Clear")
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
                                    Icon(Icons.Filled.Mic, "Voice search", tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { if (state.query.isNotBlank()) viewModel.search(state.query) }),
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surface,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                        ),
                        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
                    )
                },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) } },
                actions = {
                    // Save search button
                    if (state.query.isNotBlank() && state.searched) {
                        IconButton(onClick = { viewModel.saveSearch() }) {
                            Icon(Icons.Default.BookmarkAdd, "Save search", tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                    IconButton(onClick = { showFilters = !showFilters }) {
                        Box {
                            Icon(Icons.Default.FilterList, null, tint = if (activeFilterCount > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                            if (activeFilterCount > 0) {
                                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primary, modifier = Modifier.align(Alignment.TopEnd).size(16.dp)) {
                                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                        Text("$activeFilterCount", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimary, fontSize = 9.sp)
                                    }
                                }
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        floatingActionButton = { BackToTopButton(listState, scope) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
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
                                TextButton(onClick = { minPrice = ""; maxPrice = ""; selectedCondition = ""; sortBy = ""; selectedBrand = ""; selectedModel = ""; locationRadius = ""; dateFrom = ""; dateTo = ""; selectedSubcategory = "" }) {
                                    Icon(Icons.Default.ClearAll, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Clear All")
                                }
                            }
                        }

                        // Price range
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
                    if (selectedSubcategory.isNotBlank()) {
                        item { InputChip(selected = true, onClick = { selectedSubcategory = "" }, label = { Text("Sub: $selectedSubcategory") }, trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(14.dp)) }) }
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
                                    selected = selectedSubcategory == sub,
                                    onClick = { selectedSubcategory = sub },
                                    label = { Text(if (sub.isBlank()) "All ${state.selectedCategory}" else sub, style = MaterialTheme.typography.labelSmall) },
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
                                        val trending = listOf("iPhone", "MacBook", "Sneakers", "Car", "Laptop", "Watch", "Camera", "Bike", "Fridge", "TV")
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
        }
    }
}

@Composable
private fun SearchResultCard(post: Post, onClick: () -> Unit, onZoom: (String) -> Unit, onShare: () -> Unit, onInterested: () -> Unit) {
    var wishlisted by remember { mutableStateOf(false) }
    var liked by remember { mutableStateOf(false) }

    Card(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column {
            // Full image with overlays
            Box(Modifier.fillMaxWidth().height(180.dp).background(MaterialTheme.colorScheme.surfaceVariant)) {
                post.primaryImage?.let { img ->
                    AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clickable { onZoom(img) })
                } ?: Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.ImageNotSupported, null, modifier = Modifier.size(32.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.4f)), startY = 100f)))
                post.price?.let { p ->
                    Text("₹${"%,.0f".format(p)}", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp, modifier = Modifier.align(Alignment.BottomStart).padding(12.dp))
                }
                IconButton(
                    onClick = { wishlisted = !wishlisted },
                    modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(32.dp).background(Color.Black.copy(alpha = 0.25f), CircleShape),
                ) {
                    Icon(if (wishlisted) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, null, tint = if (wishlisted) MaterialTheme.colorScheme.primary else Color.White, modifier = Modifier.size(16.dp))
                }
                PromoBadgeRow(modifier = Modifier.align(Alignment.TopStart).padding(8.dp))
            }

            Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                // Seller header
                val sellerName = post.sellerName ?: post.userName
                if (sellerName != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(20.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                            Text(sellerName.take(1).uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                        Spacer(Modifier.width(4.dp))
                        Text(sellerName, fontSize = 11.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        if (post.sellerName != null) Icon(Icons.Default.VerifiedUser, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(12.dp))
                    }
                }

                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, fontSize = 14.sp)

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    post.condition?.let { cond ->
                        Surface(shape = RoundedCornerShape(4.dp), color = if (cond.lowercase() == "new") Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant) {
                            Text(cond.replaceFirstChar { c -> c.uppercase() }, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = if (cond.lowercase() == "new") Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp))
                        }
                    }
                    post.brand?.let { b ->
                        Surface(shape = RoundedCornerShape(4.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                            Text(b, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(11.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(loc, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }

                HorizontalDivider(thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
                PostActionRow(
                    postId = post.stableId,
                    viewCount = post.viewCount ?: 0,
                    isLiked = liked,
                    isWishlisted = wishlisted,
                    onLike = { liked = !liked },
                    onWishlist = { wishlisted = !wishlisted },
                    onInterested = onInterested,
                    onShare = onShare,
                )
            }
        }
    }
}
