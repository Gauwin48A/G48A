package com.zaruda.app.ui.rewards

import com.zaruda.app.core.ApiError
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.DailyCodeResponse
import com.zaruda.app.data.repository.DailyCodeRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DailyCodeViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    private lateinit var repo: DailyCodeRepository
    private lateinit var viewModel: DailyCodeViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        repo = mockk(relaxed = true)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `init loads daily code from API`() = runTest(testDispatcher) {
        // Arrange
        val codeResponse = DailyCodeResponse(
            code = "DAY123ABC",
            reward = 10,
            expiresAt = "2024-12-31T23:59:59Z",
            claimed = false,
        )
        coEvery { repo.get() } returns ApiResult.Success(codeResponse)

        // Act
        viewModel = DailyCodeViewModel(repo)
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertFalse("Loading should be false", state.loading)
        assertEquals("Code should match", "DAY123ABC", state.code)
        assertEquals("Reward should be 10", 10, state.reward)
        assertNotNull("Expires at should be set", state.expiresAt)
    }

    @Test
    fun `init shows null code when API fails`() = runTest(testDispatcher) {
        // Arrange
        coEvery { repo.get() } returns ApiResult.Failure(ApiError.Network)

        // Act
        viewModel = DailyCodeViewModel(repo)
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertFalse("Loading should be false", state.loading)
        assertNull("Code should be null on failure", state.code)
    }

    @Test
    fun `loading state is shown while API call is in progress`() = runTest(testDispatcher) {
        // Arrange - delay the API response
        coEvery { repo.get() } coAnswers {
            kotlinx.coroutines.delay(500)
            ApiResult.Success(DailyCodeResponse(code = "DAY999XYZ", reward = 5))
        }

        // Act
        viewModel = DailyCodeViewModel(repo)

        // Assert - initially loading
        assertTrue("Should be loading initially", viewModel.state.value.loading)

        advanceUntilIdle()

        // After completion
        assertFalse("Should not be loading after data arrives", viewModel.state.value.loading)
        assertEquals("Code should be set", "DAY999XYZ", viewModel.state.value.code)
        assertEquals("Reward should be 5", 5, viewModel.state.value.reward)
    }

    @Test
    fun `handles code with zero reward`() = runTest(testDispatcher) {
        // Arrange
        val codeResponse = DailyCodeResponse(
            code = "DAY999OLD",
            reward = 0,
            expiresAt = "2020-01-01T00:00:00Z",
            claimed = false,
        )
        coEvery { repo.get() } returns ApiResult.Success(codeResponse)

        // Act
        viewModel = DailyCodeViewModel(repo)
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertFalse("Loading should be false", state.loading)
        assertEquals("Code should be returned", "DAY999OLD", state.code)
        assertEquals("Reward is 0", 0, state.reward)
        assertNotNull("Expiry info should be present", state.expiresAt)
    }
}
