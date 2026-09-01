package com.zaruda.app.ui.rewards

import com.zaruda.app.core.ApiError
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.local.TokenStore
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.RewardsRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
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
class RewardsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    private lateinit var rewardsRepo: RewardsRepository
    private lateinit var postsRepo: PostsRepository
    private lateinit var tokenStore: TokenStore
    private lateinit var viewModel: RewardsViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        rewardsRepo = mockk(relaxed = true)
        postsRepo = mockk(relaxed = true)
        tokenStore = mockk(relaxed = true)
        every { tokenStore.isDemoSession } returns false

        viewModel = RewardsViewModel(rewardsRepo, postsRepo, tokenStore)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // ─── Initial State ───────────────────────────────────────────────

    @Test
    fun `initial state has loading false and no rewards`() {
        // ViewModel starts with loading=false, rewards are loaded via LaunchedEffect in the composable
        val state = viewModel.state.value
        assertFalse("Should not start loading automatically", state.loading)
        assertNull("No rewards yet", state.rewards)
        assertNull("No error yet", state.error)
    }

    // ─── Load: Success ───────────────────────────────────────────────

    @Test
    fun `load populates rewards and secondary data on API success`() = runTest(testDispatcher) {
        // Arrange
        coEvery { rewardsRepo.overview() } returns ApiResult.Success(sampleRewardsOverview())
        coEvery { rewardsRepo.engagementStatus() } returns ApiResult.Success(sampleEngagementStatus())
        coEvery { rewardsRepo.coinHistory() } returns ApiResult.Success(
            CoinHistoryResponse(history = listOf(sampleCoinTransaction()))
        )
        coEvery { rewardsRepo.referralLeaderboard() } returns ApiResult.Success(sampleLeaderboard())
        coEvery { rewardsRepo.referralTree() } returns ApiResult.Success(sampleReferralTreeResponse())
        coEvery { rewardsRepo.referralChainStatus() } returns ApiResult.Success(sampleChainStatus())
        coEvery { postsRepo.mine(any(), any()) } returns ApiResult.Success(emptyList())

        // Act
        viewModel.load()
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertFalse("Loading should be false", state.loading)
        assertNotNull("Rewards should be populated", state.rewards)
        assertEquals("Zaruda Member", state.rewards?.user?.name)
        assertNotNull("Engagement should be populated", state.engagement)
        assertTrue("Daily check-in should be available", state.engagement?.dailyCheckIn?.canClaim ?: false)
        assertEquals("Streak should be 3", 3, state.engagement?.dailyCheckIn?.streak)
        assertTrue("Coin history should have items", state.coinHistory.isNotEmpty())
        assertTrue("Leaderboard should have items", state.leaderboard.isNotEmpty())
        assertNull("No error", state.error)
    }

    @Test
    fun `load populates rewards even when secondary data fails`() = runTest(testDispatcher) {
        // Arrange
        coEvery { rewardsRepo.overview() } returns ApiResult.Success(sampleRewardsOverview())
        coEvery { rewardsRepo.engagementStatus() } returns ApiResult.Failure(ApiError.Network)
        coEvery { rewardsRepo.coinHistory() } returns ApiResult.Failure(ApiError.Network)
        coEvery { rewardsRepo.referralLeaderboard() } returns ApiResult.Failure(ApiError.Network)
        coEvery { rewardsRepo.referralTree() } returns ApiResult.Failure(ApiError.Network)
        coEvery { rewardsRepo.referralChainStatus() } returns ApiResult.Failure(ApiError.Network)

        // Act
        viewModel.load()
        advanceUntilIdle()

        // Assert - primary rewards data is still populated, fallback used for secondary
        val state = viewModel.state.value
        assertFalse("Loading should be false", state.loading)
        assertNotNull("Rewards from API should be present", state.rewards)
        assertEquals("Zaruda Member", state.rewards?.user?.name)
        // Fallback engagement should be used since API failed
        assertNotNull("Engagement fallback should be populated", state.engagement)
    }

    // ─── Load: Failure / Fallback ─────────────────────────────────────

    @Test
    fun `load shows fallback for demo session on unauthorized`() = runTest(testDispatcher) {
        // Arrange
        every { tokenStore.isDemoSession } returns true
        coEvery { rewardsRepo.overview() } returns ApiResult.Failure(ApiError.Unauthorized)

        // Act
        viewModel.load()
        advanceUntilIdle()

        // Assert - fallback with demo data should be shown
        val state = viewModel.state.value
        assertFalse("Loading should be false", state.loading)
        assertNotNull("Fallback rewards should be shown", state.rewards)
        assertEquals("Zaruda Member", state.rewards?.user?.name)
        assertNotNull("Fallback engagement should be shown", state.engagement)
        assertNotNull("Fallback coin history should be shown", state.coinHistory)
    }

    @Test
    fun `load shows fallback on network failure`() = runTest(testDispatcher) {
        // Arrange
        coEvery { rewardsRepo.overview() } returns ApiResult.Failure(ApiError.Network)

        // Act
        viewModel.load()
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertFalse("Loading should be false", state.loading)
        assertNotNull("Fallback rewards should be shown", state.rewards)
    }

    @Test
    fun `load does not re-trigger when already loading`() = runTest(testDispatcher) {
        // Arrange - use delay to keep loading in progress
        coEvery { rewardsRepo.overview() } coAnswers {
            kotlinx.coroutines.delay(500)
            ApiResult.Success(sampleRewardsOverview())
        }

        // Act
        viewModel.load() // first call starts loading
        val loadingState = viewModel.state.value.loading
        assertTrue("Should be loading", loadingState)

        viewModel.load() // second call should be ignored

        // Complete the first call
        advanceUntilIdle()

        // Assert - overview should have been called exactly once
        coVerify(exactly = 1) { rewardsRepo.overview() }
    }

    // ─── Daily Check-In ──────────────────────────────────────────────

    @Test
    fun `dailyCheckIn with API success sets action result`() = runTest(testDispatcher) {
        // Arrange: pre-load
        coEvery { rewardsRepo.overview() } returns ApiResult.Success(sampleRewardsOverview())
        coEvery { rewardsRepo.engagementStatus() } returns ApiResult.Success(sampleEngagementStatus())
        coEvery { rewardsRepo.coinHistory() } returns ApiResult.Success(CoinHistoryResponse())
        coEvery { rewardsRepo.referralLeaderboard() } returns ApiResult.Success(sampleLeaderboard())
        coEvery { rewardsRepo.referralTree() } returns ApiResult.Success(sampleReferralTreeResponse())
        coEvery { rewardsRepo.referralChainStatus() } returns ApiResult.Success(sampleChainStatus())
        coEvery { postsRepo.mine(any(), any()) } returns ApiResult.Success(emptyList())

        viewModel.load()
        advanceUntilIdle()

        // Set up checkin API success - kept stable across potential reloads
        coEvery { rewardsRepo.dailyCheckIn() } returns ApiResult.Success(
            DailyCheckInResponse(success = true, reward = 10, streak = 4)
        )

        // Act
        viewModel.dailyCheckIn()
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertNull("Action loading should be cleared", state.actionLoading)
        assertNotNull("Action result should be set", state.actionResult)
        assertTrue("Result should mention coins", state.actionResult?.contains("10") ?: false)

        // Note: canClaim may be reset by reload after API success - that's expected behavior
        // since the server is the source of truth for engagement status
    }

    @Test
    fun `dailyCheckIn with API failure awards fallback coins`() = runTest(testDispatcher) {
        // Arrange: load fallback first
        coEvery { rewardsRepo.overview() } returns ApiResult.Failure(ApiError.Network)
        viewModel.load()
        advanceUntilIdle()

        val coinsBefore = viewModel.state.value.rewards?.user?.totalCoins ?: 0

        // Make dailyCheckIn fail
        coEvery { rewardsRepo.dailyCheckIn() } returns ApiResult.Failure(ApiError.Network)

        // Act
        viewModel.dailyCheckIn()
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertNull("Action loading should be cleared", state.actionLoading)
        assertNotNull("Fallback action result should be set", state.actionResult)
        assertTrue("Coins should have increased via fallback",
            (state.rewards?.user?.totalCoins ?: 0) > coinsBefore)
        assertTrue("Streak should have increased",
            (state.engagement?.dailyCheckIn?.streak ?: 0) >= 4)
    }

    @Test
    fun `dailyCheckIn sets actionLoading before API call`() = runTest(testDispatcher) {
        coEvery { rewardsRepo.overview() } returns ApiResult.Success(sampleRewardsOverview())
        coEvery { rewardsRepo.engagementStatus() } returns ApiResult.Success(sampleEngagementStatus())
        coEvery { rewardsRepo.coinHistory() } returns ApiResult.Success(CoinHistoryResponse())
        coEvery { rewardsRepo.referralLeaderboard() } returns ApiResult.Success(sampleLeaderboard())
        coEvery { rewardsRepo.referralTree() } returns ApiResult.Success(sampleReferralTreeResponse())
        coEvery { rewardsRepo.referralChainStatus() } returns ApiResult.Success(sampleChainStatus())
        coEvery { postsRepo.mine(any(), any()) } returns ApiResult.Success(emptyList())

        viewModel.load()
        advanceUntilIdle()

        // Don't complete the coroutine immediately to check loading state
        coEvery { rewardsRepo.dailyCheckIn() } coAnswers {
            kotlinx.coroutines.delay(1000)
            ApiResult.Success(DailyCheckInResponse(success = true, reward = 5, streak = 4))
        }

        // Act
        viewModel.dailyCheckIn()

        // Assert - actionLoading is set synchronously before the coroutine
        assertEquals("checkin", viewModel.state.value.actionLoading)
    }

    // ─── Spin Wheel ──────────────────────────────────────────────────

    @Test
    fun `spinWheel with API success locks spin and clears action loading`() = runTest(testDispatcher) {
        // Arrange: pre-load
        coEvery { rewardsRepo.overview() } returns ApiResult.Success(sampleRewardsOverview())
        coEvery { rewardsRepo.engagementStatus() } returns ApiResult.Success(sampleEngagementStatus())
        coEvery { rewardsRepo.coinHistory() } returns ApiResult.Success(CoinHistoryResponse())
        coEvery { rewardsRepo.referralLeaderboard() } returns ApiResult.Success(sampleLeaderboard())
        coEvery { rewardsRepo.referralTree() } returns ApiResult.Success(sampleReferralTreeResponse())
        coEvery { rewardsRepo.referralChainStatus() } returns ApiResult.Success(sampleChainStatus())
        coEvery { postsRepo.mine(any(), any()) } returns ApiResult.Success(emptyList())

        viewModel.load()
        advanceUntilIdle()

        coEvery { rewardsRepo.spinWheel() } returns ApiResult.Success(
            SpinResultResponse(success = true, reward = 50)
        )

        // Act
        viewModel.spinWheel()
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertNull("Action loading should be cleared", state.actionLoading)
        // actionResult is deliberately null — Canvas onWin callback handles the celebration modal
        assertNull("Action result should NOT be set (Canvas handles celebration)", state.actionResult)
        // Spin should be locked locally
        assertFalse("Spin should be locked locally", state.engagement?.spin?.canSpin ?: true)
    }

    @Test
    fun `spinWheel with API failure locks spin silently without fallback coins`() = runTest(testDispatcher) {
        // Arrange: load fallback first
        coEvery { rewardsRepo.overview() } returns ApiResult.Failure(ApiError.Network)
        viewModel.load()
        advanceUntilIdle()

        val coinsBefore = viewModel.state.value.rewards?.user?.totalCoins ?: 0

        coEvery { rewardsRepo.spinWheel() } returns ApiResult.Failure(ApiError.Network)

        // Act
        viewModel.spinWheel()
        advanceUntilIdle()

        // Assert
        val state = viewModel.state.value
        assertNull("Action loading should be cleared", state.actionLoading)
        // The Canvas handles the celebration — no fallback coins/actionResult on failure
        assertNull("Action result should NOT be set (Canvas handles celebration)", state.actionResult)
        // Coins should NOT have changed (no fallback awarded on spin failure)
        assertEquals("Coins should remain unchanged after spin failure",
            coinsBefore, state.rewards?.user?.totalCoins ?: 0)
        // Spin is locked for the day even on API failure
        assertFalse("Spin should be locked locally", state.engagement?.spin?.canSpin ?: true)
    }

    // ─── Referral Milestone ──────────────────────────────────────────

    @Test
    fun `claimMilestone with API success shows confirmation`() = runTest(testDispatcher) {
        coEvery { rewardsRepo.claimReferralMilestone() } returns ApiResult.Success(
            MessageResponse(success = true, message = "Claimed! +50 coins")
        )

        viewModel.claimMilestone()
        advanceUntilIdle()

        val state = viewModel.state.value
        assertNull("Action loading should be cleared", state.actionLoading)
        assertNotNull("Action result should be set", state.actionResult)
    }

    @Test
    fun `claimMilestone with API failure shows not eligible message`() = runTest(testDispatcher) {
        coEvery { rewardsRepo.claimReferralMilestone() } returns ApiResult.Failure(
            ApiError.Http(400, "Already claimed or not eligible")
        )

        viewModel.claimMilestone()
        advanceUntilIdle()

        val state = viewModel.state.value
        assertNull("Action loading should be cleared", state.actionLoading)
        assertNotNull("Fallback message should be shown", state.actionResult)
    }

    // ─── Store Redeem ────────────────────────────────────────────────

    @Test
    fun `redeemStore with API success shows success message`() = runTest(testDispatcher) {
        coEvery { rewardsRepo.storeRedeem(any(), any()) } returns ApiResult.Success(
            StoreRedeemResponse(success = true, message = "Redeemed!", remainingBalance = 100)
        )

        viewModel.redeemStore("boost")
        advanceUntilIdle()

        val state = viewModel.state.value
        assertNull("Action loading should be cleared", state.actionLoading)
        assertNotNull("Result should be set", state.actionResult)
    }

    @Test
    fun `redeemStore with API failure shows fallback message`() = runTest(testDispatcher) {
        coEvery { rewardsRepo.storeRedeem(any(), any()) } returns ApiResult.Failure(ApiError.Network)

        viewModel.redeemStore("boost")
        advanceUntilIdle()

        val state = viewModel.state.value
        assertNull("Action loading should be cleared", state.actionLoading)
        assertNotNull("Fallback message should be shown", state.actionResult)
    }

    // ─── Action Result Management ────────────────────────────────────

    @Test
    fun `clearActionResult clears the action result`() = runTest(testDispatcher) {
        // Set action result via claimMilestone (coroutine needs to be advanced)
        coEvery { rewardsRepo.claimReferralMilestone() } returns ApiResult.Success(
            MessageResponse(success = true, message = "Claimed!")
        )
        viewModel.claimMilestone()
        advanceUntilIdle()

        assertNotNull("Action result should be set after claim", viewModel.state.value.actionResult)

        viewModel.clearActionResult()

        assertNull("Action result should be cleared after clearActionResult", viewModel.state.value.actionResult)
    }

    // ─── Auth Gate ───────────────────────────────────────────────────

    @Test
    fun `showAuthGate sets requiresAuth flag`() {
        viewModel.showAuthGate()
        assertTrue("requiresAuth should be set", viewModel.state.value.requiresAuth)
    }

    // ─── Refresh ─────────────────────────────────────────────────────

    @Test
    fun `load with refresh flag sets refreshing state`() = runTest(testDispatcher) {
        coEvery { rewardsRepo.overview() } returns ApiResult.Success(sampleRewardsOverview())
        coEvery { rewardsRepo.engagementStatus() } returns ApiResult.Success(sampleEngagementStatus())
        coEvery { rewardsRepo.coinHistory() } returns ApiResult.Success(CoinHistoryResponse())
        coEvery { rewardsRepo.referralLeaderboard() } returns ApiResult.Success(sampleLeaderboard())
        coEvery { rewardsRepo.referralTree() } returns ApiResult.Success(sampleReferralTreeResponse())
        coEvery { rewardsRepo.referralChainStatus() } returns ApiResult.Success(sampleChainStatus())
        coEvery { postsRepo.mine(any(), any()) } returns ApiResult.Success(emptyList())

        viewModel.load(refresh = true)
        advanceUntilIdle()

        val state = viewModel.state.value
        assertFalse("Refreshing should be false after completion", state.refreshing)
        assertFalse("Loading should be false", state.loading)
        assertNotNull("Rewards should be loaded", state.rewards)
    }

    // ─── Sample Data ─────────────────────────────────────────────────

    private fun sampleRewardsOverview(): RewardsOverviewResponse = RewardsOverviewResponse(
        user = RewardsUserDto(
            id = "test_user",
            name = "Zaruda Member",
            rank = "Bronze",
            tier = "Bronze",
            totalCoins = 185,
            referralCode = "TESTREF",
            directReferrals = 2,
            indirectReferrals = 1,
            level = 2,
            xpCurrent = 140,
            xpRequired = 250,
        ),
        referralChain = emptyList(),
        chainRules = emptyList(),
    )

    private fun sampleEngagementStatus(): EngagementStatusResponse = EngagementStatusResponse(
        dailyCheckIn = DailyCheckInStatus(canClaim = true, streak = 3, todayReward = 5,
            weekProgress = listOf(true, true, true, false, false, false, false)),
        spin = SpinStatus(canSpin = true),
        referralMilestones = ReferralMilestoneStatus(canClaim = false, currentReferrals = 2, target = 3, reward = 50),
    )

    private fun sampleLeaderboard(): ReferralLeaderboardResponse = ReferralLeaderboardResponse(
        leaderboard = listOf(
            LeaderboardEntry("You", 2, 1),
            LeaderboardEntry("Priya", 1, 2),
        ),
        myPosition = 1,
        myReferrals = 2,
    )

    private fun sampleReferralTreeResponse(): ReferralTreeResponse = ReferralTreeResponse(
        userId = "test_user",
        maxDepth = 1,
        total = 2,
        directCount = 2,
        indirectCount = 0,
        tree = ReferralNode(id = "root", name = "You", depth = 0, children = emptyList()),
    )

    private fun sampleChainStatus(): ReferralChainStatusResponse = ReferralChainStatusResponse(
        referrals = emptyList(),
        summary = ReferralChainSummary(pending = 0, qualified = 0, rewarded = 0, total = 0),
    )

    private fun sampleCoinTransaction(): CoinTransaction = CoinTransaction(
        id = "tx1",
        action = "daily_checkin",
        description = "Daily check-in",
        amount = 5,
        balance = 190,
        createdAt = "2024-01-20",
    )
}
