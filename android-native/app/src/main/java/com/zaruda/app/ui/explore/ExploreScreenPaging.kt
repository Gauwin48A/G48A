package com.zaruda.app.ui.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Compare
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.LoadState
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.PostPagingSourceFactory
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.LocalActiveCategoryKey
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.PostCard
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Filter parameters that drive the Paging 3 Pager for ExploreScreen.
 * When any field changes, the Pager is invalidated and a fresh
 * PagingSource is created.
 *
 * @property revision monotonic counter incremented on [ExplorePagingViewModel.refresh]
 *   so [distinctUntilChanged] sees a new value even when filter values haven't changed.
 */
data class PagingFilterParams(
    val revision: Int = 0,
    val ecosystemKey: String? = null,
    val searchQuery: String = "",
    val sortBy: String = "newest",
    val filterCondition: String? = null,
    val filterSubcategory: String? = null,
)

/**
 * Paging-enabled ViewModel for ExploreScreen.
 * Provides a production-grade [PagingData] flow that automatically
 * invalidates and re-fetches when any filter parameter changes.
 */
@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
@HiltViewModel
class ExplorePagingViewModel @Inject constructor(
    private val pagingSourceFactory: PostPagingSourceFactory,
    private val postsRepository: PostsRepository,
) : ViewModel() {

    private val _filterParams = MutableStateFlow(PagingFilterParams())
    val filterParams: StateFlow<PagingFilterParams> = _filterParams.asStateFlow()
    private val _compareSaving = MutableStateFlow(false)
    val compareSaving: StateFlow<Boolean> = _compareSaving.asStateFlow()
    private val _compareError = MutableStateFlow<String?>(null)
    val compareError: StateFlow<String?> = _compareError.asStateFlow()

    /** Reactive PagingData flow — invalidates on any filter change. */
    val pagingPosts: Flow<PagingData<Post>> = _filterParams
        .flatMapLatest { params ->
            Pager(PagingConfig(pageSize = 20, enablePlaceholders = false)) {
                pagingSourceFactory.feed(
                    categoryId = params.ecosystemKey,
                    query = params.searchQuery.takeIf { it.isNotBlank() },
                    sort = params.sortBy,
                    condition = params.filterCondition,
                    subcategory = params.filterSubcategory,
                )
            }.flow
        }
        .cachedIn(viewModelScope)

    fun setEcosystem(key: String?) {
        _filterParams.value = _filterParams.value.copy(ecosystemKey = key)
    }

    fun setSortBy(sort: String) {
        _filterParams.value = _filterParams.value.copy(sortBy = sort)
    }

    fun setFilterCondition(condition: String?) {
        _filterParams.value = _filterParams.value.copy(
            filterCondition = condition?.takeIf { it != "any" }
        )
    }

    fun setFilterSubcategory(sub: String?) {
        _filterParams.value = _filterParams.value.copy(filterSubcategory = sub)
    }

    fun setSearchQuery(query: String) {
        _filterParams.value = _filterParams.value.copy(searchQuery = query)
    }

    fun clearFilters() {
        _filterParams.value = _filterParams.value.copy(
            ecosystemKey = null,
            searchQuery = "",
            sortBy = "newest",
            filterCondition = null,
            filterSubcategory = null,
            revision = _filterParams.value.revision + 1,
        )
    }

    /** Force-refresh by incrementing the revision counter. */
    fun refresh() {
        _filterParams.value = _filterParams.value.copy(
            revision = _filterParams.value.revision + 1
        )
    }

    fun reportCompareError(message: String) {
        _compareError.value = message
        viewModelScope.launch {
            kotlinx.coroutines.delay(3000)
            _compareError.value = null
        }
    }

    fun commitCompareSelection(postIds: List<String>, onComplete: () -> Unit) {
        val ids = postIds.distinct().take(4)
        if (ids.size < 2) {
            _compareError.value = "Select at least 2 posts to compare"
            return
        }
        viewModelScope.launch {
            _compareSaving.value = true
            _compareError.value = null
            val clearResult = postsRepository.clearCompare()
            if (clearResult is ApiResult.Failure) {
                _compareSaving.value = false
                _compareError.value = clearResult.error.message ?: "Could not prepare compare list"
                return@launch
            }
            for (id in ids) {
                when (val result = postsRepository.addToCompare(id)) {
                    is ApiResult.Success -> Unit
                    is ApiResult.Failure -> {
                        _compareSaving.value = false
                        _compareError.value = result.error.message ?: "Could not add selected post to compare"
                        return@launch
                    }
                }
            }
            _compareSaving.value = false
            onComplete()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreenWithPaging(
    onOpenPost: (String) -> Unit,
    onOpenSearch: () -> Unit = {},
    onOpenCategories: () -> Unit = {},
    onOpenCompare: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onAddPost: () -> Unit = {},
    viewModel: ExplorePagingViewModel = hiltViewModel(),
) {
    val lazyPosts = viewModel.pagingPosts.collectAsLazyPagingItems()
    val compareSaving by viewModel.compareSaving.collectAsState()
    val compareError by viewModel.compareError.collectAsState()
    val focusManager = LocalFocusManager.current
    var searchQuery by remember { mutableStateOf("") }
    var selectedSubcategory by remember { mutableStateOf<String?>(null) }
    // Track locally which posts are selected for compare (stores Post objects for subcategory validation)
    val comparePosts = remember { mutableStateMapOf<String, Post>() }
    // Sort options
    val sortOptions = listOf("newest" to "Newest", "popular" to "Popular", "price_asc" to "Price ↑", "price_desc" to "Price ↓")
    var selectedSort by remember { mutableStateOf("newest") }

    // Read active ecosystem from CompositionLocal (set when user selects category from Home)
    val ecosystemKey = LocalActiveCategoryKey.current
    val ecosystemLabel = remember(ecosystemKey) {
        when (ecosystemKey) {
            "electronics" -> "💻 Electronics"
            "fashion" -> "👗 Fashion"
            "vehicles" -> "🚗 Vehicles"
            "others" -> "✨ Others"
            else -> null
        }
    }
    val ecosystemSubcategories = remember(ecosystemKey) {
        when (ecosystemKey) {
            "electronics" -> listOf("Phones", "Laptops", "Cameras", "Audio", "Gaming", "Accessories")
            "fashion" -> listOf("Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Watches")
            "vehicles" -> listOf("Cars", "Motorcycles", "Bicycles", "Trucks", "Spare Parts")
            "others" -> listOf("Home & Furniture", "Books", "Sports", "Health & Beauty", "Services")
            else -> emptyList()
        }
    }

    // Sync ecosystem to ViewModel for filtered paging
    LaunchedEffect(viewModel, ecosystemKey) { viewModel.setEcosystem(ecosystemKey) }

    Column(modifier = Modifier.fillMaxSize()) {
        // All Posts Header with gradient
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.horizontalGradient(listOf(Color(0xFF4F46E5), Color(0xFF6366F1)))),
        ) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Default.Explore, null, tint = Color.White.copy(alpha = 0.9f), modifier = Modifier.size(22.dp))
                    Text("All Listings", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = Color.White)
                }
                if (ecosystemLabel != null) {
                    Text("Browsing $ecosystemLabel", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                } else {
                    Text("Browse marketplace listings", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                }
            }
        }

        // Search Bar + Sort + Filter row
        Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp) {
            Column(modifier = Modifier.padding(bottom = 8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { 
                            searchQuery = it
                            // Debounced search — paging source invalidates on filter change
                            viewModel.setSearchQuery(it)
                        },
                        singleLine = true,
                        placeholder = { Text("Search title, desc or category...", style = MaterialTheme.typography.bodyMedium) },
                        leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp)) },
                        trailingIcon = {
                            if (searchQuery.isNotBlank()) {
                                IconButton(onClick = { 
                                    searchQuery = ""
                                    viewModel.setSearchQuery("")
                                    focusManager.clearFocus() 
                                }) {
                                    Icon(Icons.Default.Close, null, modifier = Modifier.size(18.dp))
                                }
                            }
                        },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f).height(48.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Color.White, unfocusedContainerColor = Color.White)
                    )
                    // Sort dropdown
                    Box {
                        FilterChip(
                            selected = false,
                            onClick = { /* cycle sort */
                                val idx = sortOptions.indexOfFirst { it.first == selectedSort }
                                val next = sortOptions[(idx + 1) % sortOptions.size]
                                selectedSort = next.first
                                viewModel.setSortBy(next.first)
                            },
                            label = { Text(sortOptions.first { it.first == selectedSort }.second, style = MaterialTheme.typography.labelSmall) },
                            leadingIcon = { Text("\u2195", fontSize = 12.sp) },
                            shape = RoundedCornerShape(12.dp),
                        )
                    }
                }

                // Subcategory filter chips — show category-specific when ecosystem is active
                if (ecosystemSubcategories.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ecosystemSubcategories.forEach { sub ->
                            val isSelected = selectedSubcategory == sub
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    val newSub = if (isSelected) null else sub
                                    selectedSubcategory = newSub
                                    viewModel.setFilterSubcategory(newSub)
                                },
                                label = { Text(sub, fontSize = 10.sp) },
                                shape = RoundedCornerShape(20.dp),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }
            }
        }

        // Main content
        PullToRefreshBox(
            isRefreshing = lazyPosts.loadState.refresh is LoadState.Loading,
            onRefresh = { lazyPosts.refresh() },
            modifier = Modifier.fillMaxSize(),
        ) {
            Box(Modifier.fillMaxSize()) {
                LazyColumn(
                    contentPadding = PaddingValues(
                        start = 0.dp,
                        top = 8.dp,
                        end = 0.dp,
                        bottom = if (comparePosts.isNotEmpty()) 120.dp else 80.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    val refreshState = lazyPosts.loadState.refresh

                    if (refreshState is LoadState.Loading && lazyPosts.itemCount == 0) {
                        items(6) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp)
                                    .padding(horizontal = 12.dp, vertical = 4.dp)
                                    .background(
                                        MaterialTheme.colorScheme.surfaceVariant,
                                        RoundedCornerShape(12.dp)
                                    )
                            )
                        }
                    } else if (refreshState is LoadState.Error && lazyPosts.itemCount == 0) {
                        item {
                            AppEmptyState(
                                icon = Icons.Outlined.CloudOff,
                                title = "Could not load listings",
                                subtitle = refreshState.error.message ?: "Check your connection",
                            )
                        }
                    } else if (lazyPosts.itemCount == 0) {
                        item {
                            AppEmptyState(
                                icon = Icons.Outlined.ImageNotSupported,
                                title = "No listings found",
                                subtitle = "Try a different category or filter",
                            )
                        }
                    } else {
                        items(count = lazyPosts.itemCount) { index ->
                            val item: Post? = lazyPosts[index]
                            if (item != null) {
                                PostCard(
                                    post = item,
                                    onClick = { onOpenPost(item.stableId) },
                                    isWishlisted = false,
                                    onToggleWishlist = {},
                                    isCompared = comparePosts.containsKey(item.stableId),
                                    onToggleCompare = {
                                        val id = item.stableId
                                        if (comparePosts.containsKey(id)) {
                                            comparePosts.remove(id)
                                        } else if (comparePosts.size < 4) {
                                            // Subcategory match check: only allow comparing same type of products
                                            val canCompare = comparePosts.isEmpty() ||
                                                comparePosts.values.first().subcategory == null ||
                                                item.subcategory == null ||
                                                comparePosts.values.first().subcategory.equals(item.subcategory, ignoreCase = true)
                                            if (canCompare) {
                                                comparePosts[id] = item
                                            } else {
                                                val firstSub = comparePosts.values.first().subcategory ?: ""
                                                viewModel.reportCompareError("Can only compare similar products ($firstSub)")
                                            }
                                        }
                                    },
                                    showCompare = true,
                                    showCart = true,
                                    showActions = true,
                                    imageHeight = 190.dp,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                )
                            }
                        }
                        if (lazyPosts.loadState.append is LoadState.Loading) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                        if (lazyPosts.loadState.append is LoadState.NotLoading && lazyPosts.itemCount > 0) {
                            item {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        "You've seen all listings",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }

                // Floating Compare Panel
                val selectedCount = comparePosts.size
                if (selectedCount >= 2) {
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
                                Text("$selectedCount items selected", fontWeight = FontWeight.SemiBold, color = Color.White, fontSize = 13.sp)
                                Text(
                                    compareError ?: "Tap Compare to see side-by-side",
                                    fontSize = 11.sp,
                                    color = if (compareError == null) Color(0xFF94A3B8) else Color(0xFFFCA5A5),
                                )
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { comparePosts.clear() },
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF475569)),
                                ) {
                                    Text("Clear", fontSize = 12.sp)
                                }
                                Button(
                                    onClick = {
                                        viewModel.commitCompareSelection(
                                            comparePosts.keys.toList(),
                                            onOpenCompare,
                                        )
                                    },
                                    enabled = !compareSaving,
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                                ) {
                                    Text(if (compareSaving) "Saving..." else "Compare Now", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
