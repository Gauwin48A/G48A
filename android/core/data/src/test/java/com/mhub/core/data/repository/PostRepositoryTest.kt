package com.mhub.core.data.repository

import com.mhub.core.common.model.Post
import com.mhub.core.common.result.Result
import com.mhub.core.data.local.dao.PostDao
import com.mhub.core.data.local.entity.PostEntity
import com.mhub.core.network.api.PostsApi
import com.mhub.core.network.model.PostsListResponse
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.first
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
class PostRepositoryTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var postsApi: PostsApi
    private lateinit var postDao: PostDao
    private lateinit var repository: PostRepositoryImpl

    private val testPost = Post(
        id = 1,
        title = "Test Post",
        description = "A test post",
        price = 100.0,
        currency = "INR",
        images = listOf("https://example.com/image.jpg"),
        location = "Mumbai",
        condition = "New",
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        postsApi = mockk(relaxed = true)
        postDao = mockk(relaxed = true)
        repository = PostRepositoryImpl(postsApi, postDao)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `fetchPosts success stores in database`() = runTest {
        coEvery { postsApi.getPosts(any(), any(), any(), any()) } returns Response.success(
            PostsListResponse(posts = listOf(testPost), total = 1, page = 1, totalPages = 1)
        )
        coEvery { postDao.upsertAll(any()) } just Runs

        val result = repository.fetchPosts()
        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.size)
        coVerify { postDao.upsertAll(any()) }
    }

    @Test
    fun `fetchPosts failure returns error`() = runTest {
        coEvery { postsApi.getPosts(any(), any(), any(), any()) } throws RuntimeException("Network error")

        val result = repository.fetchPosts()
        assertTrue(result is Result.Error)
    }

    @Test
    fun `fetchPosts with search param`() = runTest {
        coEvery { postsApi.getPosts(any(), any(), any(), any(), search = "phone") } returns Response.success(
            PostsListResponse(posts = listOf(testPost), total = 1, page = 1, totalPages = 1)
        )

        val result = repository.fetchPosts(search = "phone")
        assertTrue(result is Result.Success)
    }

    @Test
    fun `createPost success`() = runTest {
        coEvery { postsApi.createPost(any()) } returns Response.success(
            com.mhub.core.network.model.PostDetailResponse(post = testPost)
        )
        coEvery { postDao.upsert(any()) } just Runs

        val request = com.mhub.core.network.model.CreatePostRequest(title = "Test")
        val result = repository.createPost(request)
        assertTrue(result is Result.Success)
    }

    @Test
    fun `deletePost success removes from database`() = runTest {
        val entity = mockk<PostEntity>(relaxed = true)
        coEvery { postsApi.deletePost(1) } returns Response.success(
            com.mhub.core.network.model.MessageResponse(success = true)
        )
        coEvery { postDao.getById(1) } returns entity
        coEvery { postDao.delete(any()) } just Runs

        val result = repository.deletePost(1)
        assertTrue(result is Result.Success)
        coVerify { postDao.delete(entity) }
    }
}
