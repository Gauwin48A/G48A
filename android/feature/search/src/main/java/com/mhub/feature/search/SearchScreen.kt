package com.mhub.feature.search

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemKey
import com.mhub.core.ui.components.PostCard

@Composable
fun SearchScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPost: (Int) -> Unit,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val query by viewModel.query.collectAsState()
    val filters by viewModel.filters.collectAsState()
    val recentSearches by viewModel.recentSearches.collectAsState()
    val searchResults = viewModel.searchResults.collectAsLazyPagingItems()
    val focusRequester = remember { FocusRequester() }
    var showFilterSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    Scaffold(
        topBar = {
            SearchBar(
                inputField = {
                    SearchBarDefaults.InputField(
                        query = query,
                        onQueryChange = viewModel::updateQuery,
                        onSearch = { viewModel.submitSearch() },
                        expanded = false,
                        onExpandedChange = {},
                        modifier = Modifier.focusRequester(focusRequester),
                        placeholder = { Text("Search posts...") },
                        leadingIcon = {
                            IconButton(onClick = onNavigateBack) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                            }
                        },
                        trailingIcon = {
                            Row {
                                if (query.isNotEmpty()) {
                                    IconButton(onClick = { viewModel.updateQuery("") }) {
                                        Icon(Icons.Default.Close, "Clear")
                                    }
                                }
                                IconButton(onClick = { showFilterSheet = true }) {
                                    Badge(containerColor = if (filters != SearchFilters()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface) {
                                        Icon(Icons.Default.Tune, "Filters")
                                    }
                                }
                            }
                        },
                    )
                },
                expanded = false,
                onExpandedChange = {},
                modifier = Modifier.fillMaxWidth(),
            ) {}
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            // Active filter chips
            if (filters != SearchFilters()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    filters.category?.let { cat ->
                        item {
                            FilterChip(
                                selected = true,
                                onClick = { viewModel.updateFilters(filters.copy(category = null)) },
                                label = { Text(cat) },
                                trailingIcon = { Icon(Icons.Default.Close, "Remove", Modifier.size(16.dp)) },
                            )
                        }
                    }
                    filters.condition?.let { cond ->
                        item {
                            FilterChip(
                                selected = true,
                                onClick = { viewModel.updateFilters(filters.copy(condition = null)) },
                                label = { Text(cond) },
                                trailingIcon = { Icon(Icons.Default.Close, "Remove", Modifier.size(16.dp)) },
                            )
                        }
                    }
                    if (filters.minPrice != null || filters.maxPrice != null) {
                        item {
                            val priceLabel = buildString {
                                append("$")
                                append(filters.minPrice?.toInt() ?: 0)
                                append(" - $")
                                append(filters.maxPrice?.toInt() ?: "∞")
                            }
                            FilterChip(
                                selected = true,
                                onClick = { viewModel.updateFilters(filters.copy(minPrice = null, maxPrice = null)) },
                                label = { Text(priceLabel) },
                                trailingIcon = { Icon(Icons.Default.Close, "Remove", Modifier.size(16.dp)) },
                            )
                        }
                    }
                    item {
                        TextButton(onClick = { viewModel.clearFilters() }) {
                            Text("Clear all")
                        }
                    }
                }
            }

            // Show recent searches if query is empty
            if (query.isBlank() && recentSearches.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Recent Searches", style = MaterialTheme.typography.titleSmall)
                    TextButton(onClick = { viewModel.clearRecentSearches() }) {
                        Text("Clear")
                    }
                }
                recentSearches.forEach { search ->
                    ListItem(
                        headlineContent = { Text(search, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        leadingContent = { Icon(Icons.Default.History, null) },
                        modifier = Modifier.clickable { viewModel.selectRecentSearch(search) },
                    )
                }
            }

            // Search results
            if (query.isNotBlank()) {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(
                        count = searchResults.itemCount,
                        key = searchResults.itemKey { it.id },
                    ) { index ->
                        searchResults[index]?.let { post ->
                            PostCard(
                                post = post,
                                onClick = { onNavigateToPost(post.id) },
                            )
                        }
                    }

                    when (searchResults.loadState.append) {
                        is LoadState.Loading -> {
                            item {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator()
                                }
                            }
                        }
                        is LoadState.Error -> {
                            item {
                                Text(
                                    text = "Failed to load more results",
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                    color = MaterialTheme.colorScheme.error,
                                )
                            }
                        }
                        else -> {}
                    }

                    if (searchResults.loadState.refresh is LoadState.NotLoading && searchResults.itemCount == 0) {
                        item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(48.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Default.SearchOff,
                                        contentDescription = null,
                                        modifier = Modifier.size(64.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Spacer(Modifier.height(16.dp))
                                    Text("No results found", style = MaterialTheme.typography.titleMedium)
                                    Text(
                                        "Try different keywords or filters",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }

                if (searchResults.loadState.refresh is LoadState.Loading) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }
            }
        }
    }

    if (showFilterSheet) {
        SearchFilterSheet(
            currentFilters = filters,
            onApply = {
                viewModel.updateFilters(it)
                showFilterSheet = false
            },
            onDismiss = { showFilterSheet = false },
        )
    }
}

@Composable
private fun SearchFilterSheet(
    currentFilters: SearchFilters,
    onApply: (SearchFilters) -> Unit,
    onDismiss: () -> Unit,
) {
    var category by remember { mutableStateOf(currentFilters.category ?: "") }
    var sort by remember { mutableStateOf(currentFilters.sort ?: "newest") }
    var minPrice by remember { mutableStateOf(currentFilters.minPrice?.toString() ?: "") }
    var maxPrice by remember { mutableStateOf(currentFilters.maxPrice?.toString() ?: "") }
    var condition by remember { mutableStateOf(currentFilters.condition ?: "") }

    val sortOptions = listOf("newest", "oldest", "price_low", "price_high")
    val conditionOptions = listOf("New", "Like New", "Good", "Fair")

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier.padding(horizontal = 24.dp).padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Filters", style = MaterialTheme.typography.headlineSmall)

            // Sort
            Text("Sort by", style = MaterialTheme.typography.titleSmall)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(sortOptions) { option ->
                    FilterChip(
                        selected = sort == option,
                        onClick = { sort = option },
                        label = {
                            Text(
                                option.replace("_", " ").replaceFirstChar { it.uppercase() }
                            )
                        },
                    )
                }
            }

            // Condition
            Text("Condition", style = MaterialTheme.typography.titleSmall)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(conditionOptions) { option ->
                    FilterChip(
                        selected = condition == option,
                        onClick = { condition = if (condition == option) "" else option },
                        label = { Text(option) },
                    )
                }
            }

            // Price range
            Text("Price range", style = MaterialTheme.typography.titleSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = minPrice,
                    onValueChange = { minPrice = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Min") },
                    prefix = { Text("$") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = maxPrice,
                    onValueChange = { maxPrice = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Max") },
                    prefix = { Text("$") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                OutlinedButton(
                    onClick = {
                        onApply(SearchFilters())
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Reset")
                }
                Button(
                    onClick = {
                        onApply(
                            SearchFilters(
                                category = category.ifBlank { null },
                                sort = sort.ifBlank { null },
                                minPrice = minPrice.toDoubleOrNull(),
                                maxPrice = maxPrice.toDoubleOrNull(),
                                condition = condition.ifBlank { null },
                            )
                        )
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Apply")
                }
            }
        }
    }
}
