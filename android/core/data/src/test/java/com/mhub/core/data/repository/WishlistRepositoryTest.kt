package com.mhub.core.data.repository

import com.mhub.core.common.model.Post
import com.mhub.core.common.result.Result
import com.mhub.core.network.api.WishlistApi
import com.mhub.core.network.model.MessageResponse
import com.mhub.core.network.model.PostsListResponse
import io.mockk.*
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
class WishlistRepositoryTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var wishlistApi: WishlistApi
    private lateinit var repository: WishlistRepositoryImpl

    private val testPost = Post(id = 1, title = "Test", price = 50.0)

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        wishlistApi = mockk(relaxed = true)
        repository = WishlistRepositoryImpl(wishlistApi)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `getWishlist success`() = runTest {
        coEvery { wishlistApi.getWishlist() } returns Response.success(
            PostsListResponse(posts = listOf(testPost))
        )

        val result = repository.getWishlist()
        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.size)
    }

    @Test
    fun `addToWishlist success updates internal set`() = runTest {
        coEvery { wishlistApi.addToWishlist(1) } returns Response.success(
            MessageResponse(success = true)
        )

        val result = repository.addToWishlist(1)
        assertTrue(result is Result.Success)
        assertTrue(repository.isInWishlist(1))
    }

    @Test
    fun `removeFromWishlist success`() = runTest {
        // First add
        coEvery { wishlistApi.addToWishlist(1) } returns Response.success(MessageResponse(success = true))
        repository.addToWishlist(1)

        // Then remove
        coEvery { wishlistApi.removeFromWishlist(1) } returns Response.success(MessageResponse(success = true))
        val result = repository.removeFromWishlist(1)
        assertTrue(result is Result.Success)
        assertFalse(repository.isInWishlist(1))
    }

    @Test
    fun `isInWishlist returns false for unknown post`() = runTest {
        assertFalse(repository.isInWishlist(999))
    }
}
