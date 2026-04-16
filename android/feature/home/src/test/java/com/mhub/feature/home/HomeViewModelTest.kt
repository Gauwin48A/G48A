package com.mhub.feature.home

import com.mhub.core.common.model.Category
import com.mhub.core.common.model.Post
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.CategoryRepository
import com.mhub.core.data.repository.PostRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var postRepository: PostRepository
    private lateinit var categoryRepository: CategoryRepository
    private lateinit var viewModel: HomeViewModel

    private val testPosts = listOf(
        Post(id = 1, title = "Test Post 1", price = 100.0),
        Post(id = 2, title = "Test Post 2", price = 200.0),
    )

    private val testCategories = listOf(
        Category(id = 1, name = "Electronics", slug = "electronics"),
        Category(id = 2, name = "Vehicles", slug = "vehicles"),
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        postRepository = mockk(relaxed = true)
        categoryRepository = mockk(relaxed = true)

        coEvery { postRepository.observePosts() } returns flowOf(testPosts)
        coEvery { categoryRepository.observeCategories() } returns flowOf(testCategories)
        coEvery { postRepository.fetchPosts(any(), any(), any()) } returns Result.Success(testPosts)
        coEvery { categoryRepository.fetchCategories() } returns Result.Success(testCategories)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `init loads posts and categories`() = runTest {
        viewModel = HomeViewModel(postRepository, categoryRepository)

        val state = viewModel.uiState.value
        assertEquals(2, state.posts.size)
        assertEquals(2, state.categories.size)
        assertFalse(state.isLoading)
    }

    @Test
    fun `refresh updates state on error`() = runTest {
        coEvery { postRepository.fetchPosts(any(), any(), any()) } returns Result.Error(
            Exception("Network error"), "Network error"
        )

        viewModel = HomeViewModel(postRepository, categoryRepository)
        viewModel.refresh()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
    }
}
