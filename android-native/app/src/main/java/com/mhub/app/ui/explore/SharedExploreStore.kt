package com.mhub.app.ui.explore

import com.mhub.app.domain.model.Post

/**
 * Simple in-memory store that bridges selected posts between ExploreScreen
 * and CompareScreen/CartScreen. These screens normally load from API calls
 * that may fail (no backend). This store provides a local fallback.
 */
object SharedExploreStore {
    val comparePosts = mutableListOf<Post>()
    val cartPosts = mutableListOf<Post>()

    fun addCompare(post: Post) {
        if (comparePosts.none { it.stableId == post.stableId }) {
            comparePosts.add(post)
        }
    }

    fun removeCompare(postId: String) {
        comparePosts.removeAll { it.stableId == postId }
    }

    fun clearCompare() {
        comparePosts.clear()
    }

    fun addCart(post: Post) {
        if (cartPosts.none { it.stableId == post.stableId }) {
            cartPosts.add(post)
        }
    }

    fun removeCart(postId: String) {
        cartPosts.removeAll { it.stableId == postId }
    }

    fun clearCart() {
        cartPosts.clear()
    }
}
