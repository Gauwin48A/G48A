package com.zaruda.app.data.repository

import androidx.paging.PagingSource
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import kotlinx.coroutines.flow.Flow
import androidx.paging.PagingState
import com.zaruda.app.core.ApiResult
import com.zaruda.app.domain.model.Post
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Paging 3 PagingSource for the main post feed.
 * Wraps PostsRepository.feed() with proper page-based pagination,
 * key-extraction, and jump-support via PagingState.
 */
class PostsPagingSource(
    private val postsRepo: PostsRepository,
    private val categoryId: String? = null,
    private val query: String? = null,
    private val sort: String? = null,
    private val condition: String? = null,
    private val subcategory: String? = null,
) : PagingSource<Int, Post>() {

    override fun getRefreshKey(state: PagingState<Int, Post>): Int? {
        // Use the page of the closest item to the anchor position as the refresh key
        return state.anchorPosition?.let { anchorPos ->
            state.closestPageToPosition(anchorPos)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchorPos)?.nextKey?.minus(1)
        }
    }

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Post> {
        val page = params.key ?: 1
        val limit = params.loadSize.coerceIn(10, 50)

        return when (val result = postsRepo.feed(
            page = page,
            limit = limit,
            categoryId = categoryId,
            query = query,
            sort = sort,
            condition = condition,
            subcategory = subcategory,
        )) {
            is ApiResult.Success -> {
                val posts = result.data
                LoadResult.Page(
                    data = posts,
                    prevKey = if (page > 1) page - 1 else null,
                    nextKey = if (posts.size >= limit) page + 1 else null,
                )
            }
            is ApiResult.Failure -> {
                LoadResult.Error(Exception(result.error.message))
            }
        }
    }
}

/**
 * Factory wrapper so ViewModels can create typed PagingSources
 * without knowing the repository internals.
 */
@Singleton
class PostPagingSourceFactory @Inject constructor(
    private val postsRepo: PostsRepository,
) {
    fun feed(
        categoryId: String? = null,
        query: String? = null,
        sort: String? = null,
        condition: String? = null,
        subcategory: String? = null,
    ): PostsPagingSource = PostsPagingSource(
        postsRepo = postsRepo,
        categoryId = categoryId,
        query = query,
        sort = sort,
        condition = condition,
        subcategory = subcategory,
    )

    /**
     * Convenience: create a [Flow] of [PagingData] directly.
     * ViewModels call this to get a reactive paged stream.
     */
    fun feedFlow(
        categoryId: String? = null,
        query: String? = null,
        sort: String? = null,
        condition: String? = null,
        subcategory: String? = null,
        pageSize: Int = 20,
    ): Flow<PagingData<Post>> = Pager(
        PagingConfig(pageSize = pageSize, enablePlaceholders = false)
    ) {
        feed(
            categoryId = categoryId,
            query = query,
            sort = sort,
            condition = condition,
            subcategory = subcategory,
        )
    }.flow
}
