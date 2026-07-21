package com.zaruda.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Shared paginated feed wrapper that standardizes pull-to-refresh + load-more
 * behavior across all content screens (AllPosts, Feed, ForYou, etc.).
 *
 * Usage:
 * ```kotlin
 * PaginatedFeed(
 *     isRefreshing = state.refreshing,
 *     onRefresh = { viewModel.refresh() },
 *     hasMore = state.hasMore,
 *     loadingMore = state.loadingMore,
 *     onLoadMore = viewModel::loadMore,
 *     items = state.posts.size,
 *     listState = listState,
 * ) {
 *     items(state.posts, key = { it.stableId }) { post ->
 *         PostCard(post = post, ...)
 *     }
 * }
 * ```
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaginatedFeed(
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    hasMore: Boolean,
    loadingMore: Boolean,
    onLoadMore: () -> Unit,
    itemCount: Int,
    listState: LazyListState = rememberLazyListState(),
    contentPadding: PaddingValues = PaddingValues(
        start = 12.dp,
        end = 12.dp,
        top = 8.dp,
        bottom = 80.dp,
    ),
    verticalSpacing: Arrangement.Vertical = Arrangement.spacedBy(8.dp),
    modifier: Modifier = Modifier,
    emptyContent: @Composable (() -> Unit)? = null,
    loadingContent: @Composable (() -> Unit)? = null,
    content: LazyListScope.() -> Unit,
) {
    // Auto-load more when approaching the end of the list
    val shouldLoadMore by remember {
        derivedStateOf {
            val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: return@derivedStateOf false
            lastVisible >= listState.layoutInfo.totalItemsCount - 3
        }
    }

    // Key on both shouldLoadMore AND loadingMore so the effect re-evaluates
    // after a page finishes loading (when loadingMore transitions true → false)
    LaunchedEffect(shouldLoadMore, loadingMore) {
        if (shouldLoadMore && hasMore && !loadingMore && itemCount > 0) {
            onLoadMore()
        }
    }

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = modifier.fillMaxSize(),
    ) {
        when {
            // Loading skeleton state (no items yet)
            loadingContent != null && itemCount == 0 && isRefreshing -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    loadingContent()
                }
            }
            // Empty state
            itemCount == 0 && emptyContent != null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    emptyContent()
                }
            }
            // Normal content
            else -> {
                LazyColumn(
                    state = listState,
                    contentPadding = contentPadding,
                    verticalArrangement = verticalSpacing,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    content()

                    // Load more indicator
                    if (hasMore) {
                        item(key = "load_more") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                if (loadingMore) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        strokeWidth = 2.dp,
                                        color = MaterialTheme.colorScheme.primary,
                                    )
                                }
                            }
                        }
                    }

                    // End-of-list indicator
                    if (!hasMore && itemCount > 0) {
                        item(key = "end_of_list") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "You've seen all items",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.Medium,
                                )
                            }
                        }
                    }

                    // Bottom spacer for FAB clearance
                    item(key = "bottom_spacer") {
                        Box(modifier = Modifier.height(56.dp))
                    }
                }
            }
        }
    }
}
