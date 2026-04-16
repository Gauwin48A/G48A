package com.mhub.feature.search

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.mhub.core.common.model.Post
import com.mhub.core.network.api.PostsApi

class SearchPagingSource(
    private val postsApi: PostsApi,
    private val query: String,
    private val category: String? = null,
    private val sort: String? = null,
    private val minPrice: Double? = null,
    private val maxPrice: Double? = null,
    private val condition: String? = null,
) : PagingSource<Int, Post>() {

    override fun getRefreshKey(state: PagingState<Int, Post>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            state.closestPageToPosition(anchorPosition)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchorPosition)?.nextKey?.minus(1)
        }
    }

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Post> {
        val page = params.key ?: 1
        return try {
            val response = postsApi.getPosts(
                page = page,
                limit = params.loadSize,
                search = query.ifBlank { null },
                category = category,
                sort = sort,
                minPrice = minPrice,
                maxPrice = maxPrice,
                condition = condition,
            )
            if (response.isSuccessful) {
                val body = response.body()
                val posts = body?.posts ?: emptyList()
                val totalPages = body?.totalPages ?: 1
                LoadResult.Page(
                    data = posts,
                    prevKey = if (page == 1) null else page - 1,
                    nextKey = if (page >= totalPages) null else page + 1,
                )
            } else {
                LoadResult.Error(Exception("Search failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }
}
