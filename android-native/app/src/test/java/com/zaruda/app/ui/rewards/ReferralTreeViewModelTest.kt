package com.zaruda.app.ui.rewards

import com.zaruda.app.core.ApiError
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.ReferralNode
import com.zaruda.app.data.remote.dto.ReferralTreeResponse
import com.zaruda.app.data.repository.ReferralTreeRepository
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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ReferralTreeViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    private lateinit var repo: ReferralTreeRepository
    private lateinit var viewModel: ReferralTreeViewModel

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
    fun `init loads referral tree and separates direct and indirect`() = runTest(testDispatcher) {
        // Arrange - tree: Priya (depth 1 direct), Arjun (depth 1 direct), Meera via Priya (depth 2 indirect)
        val treeResponse = ReferralTreeResponse(
            userId = "user1",
            total = 3,
            directCount = 2,
            indirectCount = 1,
            maxDepth = 2,
            tree = ReferralNode(
                id = "root", name = "You", depth = 0,
                children = listOf(
                    ReferralNode(id = "ref1", name = "Priya", depth = 1, joinDate = "Today",
                        children = listOf(
                            ReferralNode(id = "ref3", name = "Meera", depth = 2, joinDate = "This month")
                        )
                    ),
                    ReferralNode(id = "ref2", name = "Arjun", depth = 1, joinDate = "This week"),
                )
            ),
        )
        coEvery { repo.tree() } returns ApiResult.Success(treeResponse)

        // Act
        viewModel = ReferralTreeViewModel(repo)
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertFalse("Loading should be false", state.loading)
        assertEquals("Total referrals should be 3", 3, state.totalReferrals)
        assertEquals("Direct count should be 2", 2, state.totalDirect)
        assertEquals("Indirect count should be 1", 1, state.totalIndirect)
        assertEquals("Should have 2 direct nodes", 2, state.directNodes.size)
        assertEquals("Should have 1 indirect node", 1, state.indirectNodes.size)
        assertEquals("First direct should be Priya", "Priya", state.directNodes[0].name)
        assertEquals("Second direct should be Arjun", "Arjun", state.directNodes[1].name)
        assertEquals("First indirect should be Meera", "Meera", state.indirectNodes[0].name)
    }

    @Test
    fun `init uses fallback data when API fails`() = runTest(testDispatcher) {
        // Arrange
        coEvery { repo.tree() } returns ApiResult.Failure(ApiError.Network)

        // Act
        viewModel = ReferralTreeViewModel(repo)
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertFalse("Loading should be false", state.loading)
        assertEquals("Fallback should have 3 referrals total", 3, state.totalReferrals)
        assertEquals("Fallback should have 2 direct", 2, state.totalDirect)
        assertEquals("Fallback should have 1 indirect", 1, state.totalIndirect)
        assertEquals("Fallback should have 2 direct nodes", 2, state.directNodes.size)
        assertEquals("Fallback should have 1 indirect node", 1, state.indirectNodes.size)
    }

    @Test
    fun `loading state is shown while API call is in progress`() = runTest(testDispatcher) {
        // Arrange - delay the API response
        coEvery { repo.tree() } coAnswers {
            kotlinx.coroutines.delay(500)
            ApiResult.Success(
                ReferralTreeResponse(
                    userId = "user1", total = 1, directCount = 1, indirectCount = 0,
                    tree = ReferralNode(id = "root", name = "You", depth = 0, children = emptyList()),
                )
            )
        }

        // Act
        viewModel = ReferralTreeViewModel(repo)

        // Assert - initially loading
        assertTrue("Should be loading", viewModel.state.value.loading)

        advanceUntilIdle()

        // After completion
        assertFalse("Should no longer be loading", viewModel.state.value.loading)
        assertEquals(1, viewModel.state.value.totalReferrals)
    }

    @Test
    fun `empty tree response results in empty direct and indirect`() = runTest(testDispatcher) {
        // Arrange - tree with root only (depth 0 is excluded by flatten)
        val emptyTree = ReferralTreeResponse(
            userId = "user1", total = 0, directCount = 0, indirectCount = 0,
            tree = ReferralNode(id = "root", name = "You", depth = 0),
        )
        coEvery { repo.tree() } returns ApiResult.Success(emptyTree)

        // Act
        viewModel = ReferralTreeViewModel(repo)
        advanceUntilIdle()

        // Assert
        assertFalse("Loading should be false", viewModel.state.value.loading)
        assertEquals("No referrals", 0, viewModel.state.value.totalReferrals)
        assertEquals("No direct referrals", 0, viewModel.state.value.totalDirect)
        assertEquals("No indirect referrals", 0, viewModel.state.value.totalIndirect)
        assertTrue("Direct nodes should be empty", viewModel.state.value.directNodes.isEmpty())
        assertTrue("Indirect nodes should be empty", viewModel.state.value.indirectNodes.isEmpty())
    }
}
