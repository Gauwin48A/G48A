package com.mhub.app.ui.search

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.SavedSearch
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.SavedSearchesRepository
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppEmptyState
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
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val savedSearchesRepo: SavedSearchesRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(SearchState())
    val state: StateFlow<SearchState> = _state.asStateFlow()

    private var job: Job? = null

    init {
        viewModelScope.launch {
            when (val r = savedSearchesRepo.list()) {
                is ApiResult.Success -> _state.value = _state.value.copy(savedSearches = r.data)
                is ApiResult.Failure -> {}
            }
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
            _state.value = _state.value.copy(items = emptyList(), searched = false)
            return
        }
        job = viewModelScope.launch {
            delay(300)
            doSearch(query)
        }
    }

    fun search(query: String, minPrice: Double? = null, maxPrice: Double? = null, condition: String? = null, sortBy: String? = null) {
        job?.cancel()
        _state.value = _state.value.copy(query = query, loading = true, error = null)
        job = viewModelScope.launch {
            when (val result = repo.feed(query = query, categoryId = _state.value.selectedCategory)) {
                is ApiResult.Success -> {
                    var list = result.data
                    if (minPrice != null) list = list.filter { (it.price ?: 0.0) >= minPrice }
                    if (maxPrice != null) list = list.filter { (it.price ?: Double.MAX_VALUE) <= maxPrice }
                    if (condition != null) list = list.filter { it.condition?.equals(condition, ignoreCase = true) == true }
                    if (sortBy == "price_asc") list = list.sortedBy { it.price ?: Double.MAX_VALUE }
                    if (sortBy == "price_desc") list = list.sortedByDescending { it.price ?: 0.0 }
                    _state.value = _state.value.copy(loading = false, items = list, searched = true)
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, searched = true, error = result.error.message)
            }
        }
    }

    private suspend fun doSearch(query: String) {
        _state.value = _state.value.copy(loading = true, error = null)
        when (val result = repo.feed(query = query, categoryId = _state.value.selectedCategory)) {
            is ApiResult.Success -> _state.value = _state.value.copy(loading = false, items = result.data, searched = true)
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, searched = true, error = result.error.message)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val focusRequester = remember { FocusRequester() }
    var showFilters by remember { mutableStateOf(false) }
    var minPrice by remember { mutableStateOf("") }
    var maxPrice by remember { mutableStateOf("") }
    var selectedCondition by remember { mutableStateOf("") }
    var sortBy by remember { mutableStateOf("") }
    val activeFilterCount = listOf(minPrice.isNotBlank(), maxPrice.isNotBlank(), selectedCondition.isNotBlank(), sortBy.isNotBlank()).count { it }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    OutlinedTextField(
                        value = state.query,
                        onValueChange = viewModel::onQueryChange,
                        singleLine = true,
                        placeholder = { Text("Search listings") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surface,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                        ),
                        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    IconButton(onClick = { showFilters = !showFilters }) {
                        Box {
                            Icon(Icons.Default.FilterList, null, tint = if (activeFilterCount > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                            if (activeFilterCount > 0) {
                                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primary, modifier = Modifier.align(Alignment.TopEnd).size(14.dp)) {
                                    Text("$activeFilterCount", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimary)
                                }
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // â”€â”€ Advanced Filter Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            AnimatedVisibility(visible = showFilters, enter = expandVertically(), exit = shrinkVertically()) {
                Surface(color = MaterialTheme.colorScheme.surface) {
                    Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Filters", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                        
                        // Price range
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = minPrice, onValueChange = { minPrice = it.filter(Char::isDigit) },
                                label = { Text("Min â‚¹") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                                modifier = Modifier.weight(1f),
                            )
                            OutlinedTextField(
                                value = maxPrice, onValueChange = { maxPrice = it.filter(Char::isDigit) },
                                label = { Text("Max â‚¹") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                                modifier = Modifier.weight(1f),
                            )
                        }

                        // Condition
                        Text("Condition", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(listOf("", "New", "Like New", "Used", "Refurbished"), key = { it }) { cond ->
                                FilterChip(
                                    selected = selectedCondition == cond,
                                    onClick = { selectedCondition = cond },
                                    label = { Text(if (cond.isBlank()) "Any" else cond, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
                                )
                            }
                        }

                        // Sort
                        Text("Sort By", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(listOf("" to "Relevance", "price_asc" to "Price â†‘", "price_desc" to "Price â†“"), key = { it.first }) { (key, label) ->
                                FilterChip(
                                    selected = sortBy == key,
                                    onClick = { sortBy = key },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
                                )
                            }
                        }

                        // Apply / Clear
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (activeFilterCount > 0) {
                                TextButton(onClick = { minPrice = ""; maxPrice = ""; selectedCondition = ""; sortBy = "" }) { Text("Clear All") }
                            }
                            androidx.compose.material3.Button(
                                onClick = {
                                    if (state.query.isNotBlank()) {
                                        viewModel.search(state.query, minPrice = minPrice.toDoubleOrNull(), maxPrice = maxPrice.toDoubleOrNull(), condition = selectedCondition.ifBlank { null }, sortBy = sortBy.ifBlank { null })
                                    }
                                    showFilters = false
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                            ) { Text("Apply Filters") }
                        }
                        HorizontalDivider()
                    }
                }
            }

            // â”€â”€ Category scope chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            val categories = listOf(null to "All", "electronics" to "Electronics", "fashion" to "Fashion", "vehicles" to "Vehicles", "others" to "Others")
            LazyRow(
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(categories, key = { it.first ?: "all" }) { (key, label) ->
                    FilterChip(
                        selected = state.selectedCategory == key,
                        onClick = { viewModel.setCategory(key) },
                        label = { Text(label, style = MaterialTheme.typography.labelMedium) },
                    )
                }
            }

            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                when {
                    state.loading -> CircularProgressIndicator()

                    state.error != null -> AppEmptyState(
                        icon = Icons.Default.Search,
                        title = "Search unavailable",
                        subtitle = state.error ?: "Please try again.",
                    )

                    !state.searched && state.savedSearches.isNotEmpty() -> {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            item {
                                Text("Trending Searches", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 6.dp))
                            }
                            item {
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    val trending = listOf("iPhone", "MacBook", "Sneakers", "Car", "Laptop", "Watch", "Camera")
                                    items(trending) { topic ->
                                        Surface(onClick = { viewModel.onQueryChange(topic) }, shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                                            Text(topic, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
                                        }
                                    }
                                }
                            }
                            item {
                                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text("Recent Searches", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            items(state.savedSearches.take(8), key = { it.stableId }) { s ->
                                Card(
                                    onClick = { viewModel.onQueryChange(s.displayQuery) },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                ) {
                                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Icon(Icons.Default.Search, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text(s.displayQuery, style = MaterialTheme.typography.bodyMedium)
                                        s.category?.let { Spacer(Modifier.weight(1f)); Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    }
                                }
                            }
                        }
                    }

                    !state.searched -> AppEmptyState(icon = Icons.Default.Search, title = "Start searching", subtitle = "Try item name, category, or location.")
                    state.items.isEmpty() -> AppEmptyState(icon = Icons.Default.Search, title = "No results", subtitle = "Try a broader query or adjust filters.")
                    else -> {
                        LazyColumn(
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
                                SearchResultCard(post = post, onClick = { onOpenPost(post.stableId) })
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchResultCard(post: Post, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(72.dp).background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                } else {
                    Icon(Icons.Outlined.ImageNotSupported, contentDescription = null)
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(text = post.displayTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                post.price?.let {
                    Text(text = "â‚¹${"%,.0f".format(it)}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    post.condition?.let { cond ->
                        Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                            Text(cond, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                    post.location?.let { loc ->
                        Text(loc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}
