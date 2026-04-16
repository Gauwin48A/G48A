package com.mhub.feature.listings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mhub.core.ui.components.MhubEmptyState
import com.mhub.core.ui.components.MhubErrorState
import com.mhub.core.ui.components.MhubLoadingIndicator
import com.mhub.core.ui.components.PostCard

@Composable
fun ListingsScreen(
    onPostClick: (Int) -> Unit,
    isSearchMode: Boolean = false,
    viewModel: ListingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            if (isSearchMode) {
                SearchBar(
                    query = uiState.searchQuery,
                    onQueryChange = viewModel::updateSearch,
                    onSearch = viewModel::search,
                    active = true,
                    onActiveChange = {},
                    placeholder = { Text("Search listings...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                    trailingIcon = {
                        if (uiState.searchQuery.isNotEmpty()) {
                            IconButton(onClick = { viewModel.updateSearch("") }) {
                                Icon(Icons.Default.Close, contentDescription = "Clear search")
                            }
                        }
                    },
                    modifier = Modifier.semantics { contentDescription = "Search bar" },
                ) {}
            } else {
                TopAppBar(title = { Text("All Listings") })
            }
        },
    ) { padding ->
        when {
            uiState.isLoading && uiState.posts.isEmpty() -> {
                MhubLoadingIndicator(modifier = Modifier.padding(padding))
            }
            uiState.error != null && uiState.posts.isEmpty() -> {
                MhubErrorState(
                    message = uiState.error!!,
                    onRetry = viewModel::refresh,
                    modifier = Modifier.padding(padding),
                )
            }
            uiState.posts.isEmpty() -> {
                MhubEmptyState(
                    title = if (isSearchMode) "No results found" else "No listings yet",
                    modifier = Modifier.padding(padding),
                )
            }
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(uiState.posts, key = { it.id }) { post ->
                        PostCard(
                            post = post,
                            onClick = { onPostClick(post.id) },
                        )
                    }
                }
            }
        }
    }
}
