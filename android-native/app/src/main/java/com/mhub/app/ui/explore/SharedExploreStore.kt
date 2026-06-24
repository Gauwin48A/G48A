package com.mhub.app.ui.explore

import com.mhub.app.data.remote.dto.FeedItem
import com.mhub.app.domain.model.Post
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Simple in-memory store that bridges selected posts between ExploreScreen
 * and CompareScreen/CartScreen. These screens normally load from API calls
 * that may fail (no backend). This store provides a local fallback.
 */
object SharedExploreStore {
    private val _comparePosts = MutableStateFlow<List<Post>>(emptyList())
    private val _cartPosts = MutableStateFlow<List<Post>>(emptyList())
    private val _wishlistPosts = MutableStateFlow<List<Post>>(emptyList())
    private val _recentlyViewedPosts = MutableStateFlow<List<Post>>(emptyList())

    val compareFlow: StateFlow<List<Post>> = _comparePosts.asStateFlow()
    val cartFlow: StateFlow<List<Post>> = _cartPosts.asStateFlow()
    val wishlistFlow: StateFlow<List<Post>> = _wishlistPosts.asStateFlow()
    val recentlyViewedFlow: StateFlow<List<Post>> = _recentlyViewedPosts.asStateFlow()

    val comparePosts: List<Post> get() = _comparePosts.value
    val cartPosts: List<Post> get() = _cartPosts.value
    val wishlistPosts: List<Post> get() = _wishlistPosts.value
    val recentlyViewedPosts: List<Post> get() = _recentlyViewedPosts.value

    fun addCompare(post: Post) {
        _comparePosts.update { posts ->
            if (posts.any { it.stableId == post.stableId }) posts else posts + post
        }
    }

    fun removeCompare(postId: String) {
        _comparePosts.update { posts -> posts.filterNot { it.stableId == postId } }
    }

    fun clearCompare() {
        _comparePosts.value = emptyList()
    }

    fun addCart(post: Post) {
        _cartPosts.update { posts ->
            if (posts.any { it.stableId == post.stableId }) posts else posts + post
        }
    }

    fun removeCart(postId: String) {
        _cartPosts.update { posts -> posts.filterNot { it.stableId == postId } }
    }

    fun clearCart() {
        _cartPosts.value = emptyList()
    }

    fun addWishlist(post: Post) {
        _wishlistPosts.update { posts ->
            if (posts.any { it.stableId == post.stableId }) posts else posts + post
        }
    }

    fun removeWishlist(postId: String) {
        _wishlistPosts.update { posts -> posts.filterNot { it.stableId == postId } }
    }

    fun clearWishlist() {
        _wishlistPosts.value = emptyList()
    }

    fun addRecentlyViewed(post: Post) {
        _recentlyViewedPosts.update { posts ->
            (listOf(post) + posts.filterNot { it.stableId == post.stableId }).take(50)
        }
    }

    fun addRecentlyViewedFeed(item: FeedItem) {
        addRecentlyViewed(item.toRecentPost())
    }

    fun removeRecentlyViewed(postId: String) {
        _recentlyViewedPosts.update { posts -> posts.filterNot { it.stableId == postId } }
    }

    fun clearRecentlyViewed() {
        _recentlyViewedPosts.value = emptyList()
    }

    private fun FeedItem.toRecentPost(): Post {
        val titleText = title ?: displayContent.take(80).ifBlank { "Feed update" }
        return Post(
            id = stableId,
            postId = postId,
            title = titleText,
            description = displayContent,
            price = price,
            imageUrl = primaryImage,
            images = images,
            categoryName = categoryName,
            subcategoryName = subcategoryName,
            location = location ?: area ?: city,
            city = city,
            createdAt = createdAt,
            userId = userId,
            userName = displayName,
            status = "feed",
            viewCount = effectiveViews,
            likeCount = effectiveLikes,
        )
    }
}
