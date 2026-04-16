package com.mhub.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
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
fun HomeScreen(
    onPostClick: (Int) -> Unit,
    onSearchClick: () -> Unit,
    onCategoryClick: (String) -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("MHub") },
                actions = {
                    IconButton(
                        onClick = onSearchClick,
                        modifier = Modifier.semantics { contentDescription = "Search" },
                    ) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                },
            )
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
                    title = "No listings yet",
                    message = "Be the first to post something!",
                    modifier = Modifier.padding(padding),
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Categories row
                    if (uiState.categories.isNotEmpty()) {
                        item {
                            Text(
                                "Categories",
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(bottom = 8.dp),
                            )
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(uiState.categories) { category ->
                                    FilterChip(
                                        onClick = { onCategoryClick(category.name) },
                                        label = { Text(category.name) },
                                        selected = false,
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                        }
                    }

                    // Posts
                    items(uiState.posts, key = { it.id }) { post ->
                        PostCard(
                            post = post,
                            onClick = { onPostClick(post.id) },
                        )
                    }

                    // Loading more indicator
                    if (uiState.isLoading) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
