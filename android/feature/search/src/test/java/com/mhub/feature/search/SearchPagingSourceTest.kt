package com.mhub.feature.search

import androidx.paging.PagingSource
import com.mhub.core.common.model.Post
import com.mhub.core.network.api.PostsApi
import com.mhub.core.network.model.PostsListResponse
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class SearchPagingSourceTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var postsApi: PostsApi

    private val testPosts = listOf(
        Post(id = 1, title = "Phone", price = 500.0),
        Post(id = 2, title = "Laptop", price = 1000.0),
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        postsApi = mockk(relaxed = true)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `load returns page when successful`() = runTest {
        coEvery {
            postsApi.getPosts(page = 1, limit = any(), search = "phone", category = null, sort = null, minPrice = null, maxPrice = null, condition = null)
        } returns Response.success(
            PostsListResponse(posts = testPosts, total = 2, page = 1, totalPages = 1)
        )

        val pagingSource = SearchPagingSource(postsApi, query = "phone")
        val result = pagingSource.load(PagingSource.LoadParams.Refresh(key = null, loadSize = 20, placeholdersEnabled = false))

        assertTrue(result is PagingSource.LoadResult.Page)
        val page = result as PagingSource.LoadResult.Page
        assertEquals(2, page.data.size)
        assertNull(page.prevKey)
        assertNull(page.nextKey)
    }

    @Test
    fun `load returns error on exception`() = runTest {
        coEvery { postsApi.getPosts(any(), any(), any(), any(), any(), any(), any(), any()) } throws RuntimeException("Network error")

        val pagingSource = SearchPagingSource(postsApi, query = "test")
        val result = pagingSource.load(PagingSource.LoadParams.Refresh(key = null, loadSize = 20, placeholdersEnabled = false))

        assertTrue(result is PagingSource.LoadResult.Error)
    }

    @Test
    fun `load returns nextKey when more pages available`() = runTest {
        coEvery { postsApi.getPosts(any(), any(), any(), any(), any(), any(), any(), any()) } returns Response.success(
            PostsListResponse(posts = testPosts, total = 40, page = 1, totalPages = 2)
        )

        val pagingSource = SearchPagingSource(postsApi, query = "test")
        val result = pagingSource.load(PagingSource.LoadParams.Refresh(key = null, loadSize = 20, placeholdersEnabled = false))

        assertTrue(result is PagingSource.LoadResult.Page)
        assertEquals(2, (result as PagingSource.LoadResult.Page).nextKey)
    }
}
