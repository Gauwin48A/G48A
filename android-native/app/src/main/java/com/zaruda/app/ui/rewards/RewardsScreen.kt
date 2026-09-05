package com.zaruda.app.ui.rewards

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import com.zaruda.app.ui.theme.ColorTokens
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Toll
import androidx.compose.material.icons.outlined.Upgrade
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.zaruda.app.R
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiError
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.CoinTransaction
import com.zaruda.app.data.remote.dto.DailyCheckInStatus
import com.zaruda.app.data.remote.dto.EngagementStatusResponse
import com.zaruda.app.data.remote.dto.LeaderboardEntry
import com.zaruda.app.data.remote.dto.ReferralMilestoneStatus
import com.zaruda.app.data.remote.dto.RewardsOverviewResponse
import com.zaruda.app.data.remote.dto.RewardsChainRuleDto
import com.zaruda.app.data.remote.dto.RewardsReferralNodeDto
import com.zaruda.app.data.remote.dto.RewardsUserDto
import com.zaruda.app.data.remote.dto.SpinStatus
import com.zaruda.app.data.repository.RewardsRepository
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.PrimaryButton
import com.zaruda.app.ui.components.SecondaryButton
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import androidx.compose.runtime.Stable
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.TextStyle
import javax.inject.Inject
import kotlin.math.max

@Stable
data class RewardsUiState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val requiresAuth: Boolean = false,
    val error: String? = null,
    val rewards: RewardsOverviewResponse? = null,
    val engagement: EngagementStatusResponse? = null,
    val coinHistory: List<CoinTransaction> = emptyList(),
    val leaderboard: List<LeaderboardEntry> = emptyList(),
    val myLeaderboardPosition: Int = 0,
    val actionLoading: String? = null,
    val actionResult: String? = null,
    val referralTree: com.zaruda.app.data.remote.dto.ReferralTreeResponse? = null,
    val chainStatus: com.zaruda.app.data.remote.dto.ReferralChainStatusResponse? = null,
    val activePosts: List<com.zaruda.app.domain.model.Post> = emptyList(),
    val processedReferrals: List<RewardsReferralNodeDto> = emptyList(),
    val spinReward: Int? = null,
)

private val fallbackRewardsOverview = RewardsOverviewResponse(
    user = RewardsUserDto(
        id = "demo_rewards_user",
        name = "Demo User",
        rank = "Bronze",
        tier = "Bronze",
        membershipPlan = "premium",
        currentPlan = "premium",
        level = 2,
        xpCurrent = 140,
        xpRequired = 250,
        referralCode = "DEMO001",
        totalReferrals = 2,
        directReferrals = 2,
        indirectReferrals = 1,
        totalCoins = 185,
        directPoints = 80,
        indirectPoints = 25,
        potentialReferralPoints = 150,
        chainEarnedPoints = 25,
        qualifiedReferrals = 1,
        successfulRefs = 1,
        streak = 3,
        visitStreak = 4,
        postStreak = 1,
        profileComplete = true,
        hasPosted = true,
        dailySecretCode = "DAILY25",
    ),
    referralChain = listOf(
        RewardsReferralNodeDto(id = "demo_ref_1", name = "Priya", depth = 1, type = "Direct", coins = 50, joinDate = "Today"),
        RewardsReferralNodeDto(id = "demo_ref_2", name = "Arjun", depth = 1, type = "Direct", coins = 30, joinDate = "This week"),
        RewardsReferralNodeDto(id = "demo_ref_3", name = "Meera", depth = 2, type = "Indirect", coins = 15, joinDate = "This month"),
    ),
    chainRules = listOf(
        RewardsChainRuleDto(depth = 1, points = 50.0),
        RewardsChainRuleDto(depth = 2, points = 25.0),
        RewardsChainRuleDto(depth = 3, points = 10.0),
    ),
)

private val fallbackEngagementStatus = EngagementStatusResponse(
    dailyCheckIn = DailyCheckInStatus(canClaim = true, streak = 3, todayReward = 5, weekProgress = listOf(true, true, true, false, false, false, false)),
    spin = SpinStatus(canSpin = true),
    referralMilestones = ReferralMilestoneStatus(canClaim = false, currentReferrals = 2, target = 3, reward = 50),
)

private val fallbackCoinHistory = listOf(
    CoinTransaction(id = "demo_coin_1", action = "daily_checkin", description = "Daily check-in reward", amount = 5, balance = 185, createdAt = "Today"),
    CoinTransaction(id = "demo_coin_2", action = "referral", description = "Referral bonus", amount = 50, balance = 180, createdAt = "This week"),
    CoinTransaction(id = "demo_coin_3", action = "post_created", description = "Posted a listing", amount = 10, balance = 130, createdAt = "This week"),
)

private val fallbackLeaderboard = listOf(
    LeaderboardEntry(name = "You", referrals = 2, position = 1),
    LeaderboardEntry(name = "Priya", referrals = 1, position = 2),
    LeaderboardEntry(name = "Arjun", referrals = 1, position = 3),
)

private val fallbackProcessedReferrals = listOf(
    RewardsReferralNodeDto(id = "demo_ref_1", name = "Priya", depth = 1, type = "Direct", coins = 50, joinDate = "Today"),
    RewardsReferralNodeDto(id = "demo_ref_2", name = "Arjun", depth = 1, type = "Direct", coins = 30, joinDate = "This week"),
    RewardsReferralNodeDto(id = "demo_ref_3", name = "Meera", depth = 2, type = "Indirect", coins = 15, joinDate = "This month"),
)

private val fallbackReferralTree = com.zaruda.app.data.remote.dto.ReferralTreeResponse(
    userId = "demo", maxDepth = 3, total = 3, directCount = 2, indirectCount = 1,
    tree = com.zaruda.app.data.remote.dto.ReferralNode(id = "root", name = "You", depth = 0, children = listOf(
        com.zaruda.app.data.remote.dto.ReferralNode(id = "demo_ref_1", name = "Priya", depth = 1),
        com.zaruda.app.data.remote.dto.ReferralNode(id = "demo_ref_2", name = "Arjun", depth = 1),
        com.zaruda.app.data.remote.dto.ReferralNode(id = "demo_ref_3", name = "Meera", depth = 2),
    ))
)

@HiltViewModel
class RewardsViewModel @Inject constructor(
    private val rewardsRepository: RewardsRepository,
    private val postsRepository: com.zaruda.app.data.repository.PostsRepository,
    private val tokenStore: com.zaruda.app.data.local.TokenStore,
) : ViewModel() {
    private val _state = MutableStateFlow(RewardsUiState())
    val state: StateFlow<RewardsUiState> = _state.asStateFlow()

    private fun showFallbackRewards(actionResult: String? = null) {
        val current = _state.value
        val baseRewards = current.rewards ?: fallbackRewardsOverview
        // Always merge fallback referral chain into rewards so referral tab has demo data
        val mergedRewards = if (baseRewards.referralChain.isEmpty()) {
            baseRewards.copy(referralChain = fallbackRewardsOverview.referralChain, chainRules = fallbackRewardsOverview.chainRules)
        } else baseRewards
        // Also populate fallback referral tree for the stats grid
        val mergedTree = current.referralTree ?: fallbackReferralTree
        // Populate processed referrals from fallback
        val mergedProcessed = if (current.processedReferrals.isEmpty()) {
            fallbackProcessedReferrals
        } else current.processedReferrals
        _state.value = current.copy(
            loading = false,
            refreshing = false,
            requiresAuth = false,
            error = null,
            rewards = mergedRewards,
            referralTree = mergedTree,
            processedReferrals = mergedProcessed,
            engagement = current.engagement ?: fallbackEngagementStatus,
            coinHistory = current.coinHistory.ifEmpty { fallbackCoinHistory },
            leaderboard = current.leaderboard.ifEmpty { fallbackLeaderboard },
            myLeaderboardPosition = current.myLeaderboardPosition.takeIf { it > 0 } ?: 1,
            actionLoading = null,
            actionResult = actionResult ?: current.actionResult,
        )
    }

    companion object {
        /** Process-scoped cache — set true on first spin today, reset on app process death.
         *  Also persists the spin date in TokenStore so multiple spins are prevented even after
         *  process death or ViewModel recreation. */
        @Volatile
        private var _hasSpunLocallyToday = false
        /** Day-of-year of the last spin, used to auto-reset the flag on calendar rollover. */
        @Volatile
        private var _spinLocalDate: Int? = null
    }

    /** On initialization, restore the persisted spin date from TokenStore so the lock
     *  survives process death. If the stored date matches today, lock immediately. */
    init {
        val storedDate = tokenStore.getLastSpinDate()
        if (storedDate != null) {
            val cal = java.util.Calendar.getInstance()
            val todayStr = "%04d-%02d-%02d".format(
                cal.get(java.util.Calendar.YEAR),
                cal.get(java.util.Calendar.MONTH) + 1,
                cal.get(java.util.Calendar.DAY_OF_MONTH),
            )
            if (storedDate == todayStr) {
                _hasSpunLocallyToday = true
                _spinLocalDate = cal.get(java.util.Calendar.DAY_OF_YEAR)
            }
        }
    }

    private fun awardFallbackCoins(amount: Int, message: String, lockSpin: Boolean = false) {
        val currentRewards = _state.value.rewards ?: fallbackRewardsOverview
        val currentUser = currentRewards.user
        val updatedRewards = currentRewards.copy(
            user = currentUser.copy(
                totalCoins = currentUser.totalCoins + amount,
                xpCurrent = currentUser.xpCurrent + amount,
                streak = max(currentUser.streak, fallbackEngagementStatus.dailyCheckIn.streak),
            )
        )
        val transaction = CoinTransaction(
            id = "local_reward_${System.currentTimeMillis()}",
            action = "local_reward",
            description = message,
            amount = amount,
            balance = updatedRewards.user.totalCoins,
            createdAt = "Just now",
        )
        // Lock daily check-in until next day after claiming
        val updatedEngagement = (_state.value.engagement ?: fallbackEngagementStatus).copy(
            dailyCheckIn = (_state.value.engagement?.dailyCheckIn ?: fallbackEngagementStatus.dailyCheckIn).copy(
                canClaim = false,
                streak = (_state.value.engagement?.dailyCheckIn?.streak ?: fallbackEngagementStatus.dailyCheckIn.streak) + 1,
            ),
            spin = if (lockSpin) (_state.value.engagement?.spin ?: fallbackEngagementStatus.spin).copy(canSpin = false) else _state.value.engagement?.spin ?: fallbackEngagementStatus.spin,
        )
        _state.value = _state.value.copy(
            loading = false,
            refreshing = false,
            requiresAuth = false,
            error = null,
            rewards = updatedRewards,
            engagement = updatedEngagement,
            coinHistory = listOf(transaction) + _state.value.coinHistory.ifEmpty { fallbackCoinHistory },
            leaderboard = _state.value.leaderboard.ifEmpty { fallbackLeaderboard },
            myLeaderboardPosition = _state.value.myLeaderboardPosition.takeIf { it > 0 } ?: 1,
            actionLoading = null,
            actionResult = message,
        )
    }

    fun showAuthGate() {
        _state.value = RewardsUiState(requiresAuth = true)
    }

    fun load(refresh: Boolean = false) {
        if (_state.value.loading || _state.value.refreshing) return
        _state.value = _state.value.copy(
            loading = !refresh && _state.value.rewards == null,
            refreshing = refresh,
            requiresAuth = false,
            error = null,
        )
        viewModelScope.launch {
            // Load overview first (critical for fallback logic); secondary data fires concurrently
            // Wrap with timeout so the UI never hangs permanently if server is unreachable
            val overviewResult = kotlinx.coroutines.withTimeoutOrNull(5000L) { rewardsRepository.overview() }
                ?: ApiResult.Failure(ApiError.Timeout)
            when (val result = overviewResult) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        loading = false, refreshing = false, rewards = result.data,
                    )
                    loadSecondaryData()
                    loadActivePosts()
                }
                is ApiResult.Failure -> {
                    if (result.error is ApiError.Unauthorized || result.error is ApiError.Forbidden) {
                        if (tokenStore.isDemoSession) {
                            // Demo sessions always get 401 — skip retry, use fallback data
                            showFallbackRewards()
                            return@launch
                        }
                        // Retry once before showing auth gate
                        kotlinx.coroutines.delay(800)
                        when (val retry = rewardsRepository.overview()) {
                            is ApiResult.Success -> {
                                _state.value = _state.value.copy(
                                    loading = false, refreshing = false, rewards = retry.data,
                                )
                                loadSecondaryData()
                                loadActivePosts()
                            }
                            is ApiResult.Failure -> showFallbackRewards()
                        }
                    } else {
                        showFallbackRewards()
                    }
                }
            }
        }
    }

    fun loadActivePosts() {
        viewModelScope.launch {
            when (val r = postsRepository.mine(userId = "me")) {
                is ApiResult.Success -> {
                    val active = r.data.filter { (it.status ?: "").lowercase() == "active" }
                    _state.value = _state.value.copy(activePosts = active)
                }
                is ApiResult.Failure -> { }
            }
        }
    }

    /** Fire engagement, coin history, leaderboard, referral tree, and chain status concurrently. */
    private suspend fun loadSecondaryData() {
        coroutineScope {
            val engDef = async { kotlinx.coroutines.withTimeoutOrNull(5000L) { rewardsRepository.engagementStatus() } ?: ApiResult.Failure(ApiError.Timeout) }
            val histDef = async { kotlinx.coroutines.withTimeoutOrNull(5000L) { rewardsRepository.coinHistory() } ?: ApiResult.Failure(ApiError.Timeout) }
            val lbDef  = async { kotlinx.coroutines.withTimeoutOrNull(5000L) { rewardsRepository.referralLeaderboard() } ?: ApiResult.Failure(ApiError.Timeout) }
            val treeDef = async { kotlinx.coroutines.withTimeoutOrNull(5000L) { rewardsRepository.referralTree() } ?: ApiResult.Failure(ApiError.Timeout) }
            val statusDef = async { kotlinx.coroutines.withTimeoutOrNull(5000L) { rewardsRepository.referralChainStatus() } ?: ApiResult.Failure(ApiError.Timeout) }

            when (val eng = engDef.await()) {
                is ApiResult.Success -> {
                    // Server doesn't send canSpin field, so compute it:
                    // false if lastSpinDate is today (already spun) OR flagged locally
                    val serverSpin = eng.data.spin
                    val lastDate = serverSpin.lastSpinDate?.take(10) // "YYYY-MM-DD"
                    val cal = java.util.Calendar.getInstance()
                    val todayStr = "%04d-%02d-%02d".format(
                        cal.get(java.util.Calendar.YEAR),
                        cal.get(java.util.Calendar.MONTH) + 1,
                        cal.get(java.util.Calendar.DAY_OF_MONTH),
                    )
                    val alreadySpunFromServer = lastDate == todayStr
                    val fixedSpin = serverSpin.copy(
                        canSpin = !alreadySpunFromServer && !_hasSpunLocallyToday
                    )
                    _state.value = _state.value.copy(
                        engagement = eng.data.copy(spin = fixedSpin)
                    )
                }
                is ApiResult.Failure -> { }
            }
            when (val hist = histDef.await()) {
                is ApiResult.Success -> _state.value = _state.value.copy(coinHistory = hist.data.history)
                is ApiResult.Failure -> { }
            }
            when (val lb = lbDef.await()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    leaderboard = lb.data.leaderboard,
                    myLeaderboardPosition = lb.data.myPosition,
                )
                is ApiResult.Failure -> { }
            }
            when (val tree = treeDef.await()) {
                is ApiResult.Success -> {
                    val treeData = tree.data
                    // Flatten the hierarchical tree into a flat list of RewardsReferralNodeDto for the referral tab
                    val flatList = treeData.tree?.flatten()?.map { node ->
                        RewardsReferralNodeDto(
                            id = node.id,
                            name = node.name,
                            depth = node.depth,
                            type = if (node.depth == 1) "Direct" else "Indirect",
                            coins = 0,
                            joinDate = node.joinDate,
                        )
                    } ?: emptyList()
                    // Enrich coin data from the overview referralChain if available
                    val existingChain = _state.value.rewards?.referralChain ?: emptyList()
                    val coinMap = existingChain.filter { it.coins > 0 }.associateBy { it.id ?: it.name ?: "" }
                    val enriched = flatList.map { node ->
                        val match = coinMap[node.id] ?: coinMap[node.name]
                        if (match != null) node.copy(coins = match.coins) else node
                    }
                    val merged = when {
                        enriched.isNotEmpty() -> enriched
                        existingChain.isNotEmpty() -> existingChain
                        else -> fallbackProcessedReferrals
                    }
                    _state.value = _state.value.copy(
                        referralTree = treeData,
                        processedReferrals = merged,
                    )
                }
                is ApiResult.Failure -> {
                    // Ensure referral tree fallback is populated
                    if (_state.value.referralTree == null) {
                        _state.value = _state.value.copy(referralTree = fallbackReferralTree)
                    }
                    // Also populate processed referrals from fallback if still empty
                    if (_state.value.processedReferrals.isEmpty()) {
                        _state.value = _state.value.copy(
                            processedReferrals = fallbackProcessedReferrals
                        )
                    }
                }
            }
            when (val status = statusDef.await()) {
                is ApiResult.Success -> _state.value = _state.value.copy(chainStatus = status.data)
                is ApiResult.Failure -> { }
            }
        }
    }

    fun dailyCheckIn() {
        _state.value = _state.value.copy(actionLoading = "checkin")
        viewModelScope.launch {
            when (val r = rewardsRepository.dailyCheckIn()) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = "+${r.data.reward} coins! Streak: ${r.data.streak} days",
                    )
                    load(refresh = true)
                }
                is ApiResult.Failure -> awardFallbackCoins(5, "+5 coins! Streak: ${fallbackEngagementStatus.dailyCheckIn.streak} days")
            }
        }
    }

    fun spinWheel() {
        // Clear any stale action result from previous actions (e.g. daily check-in) to avoid redundant popups
        _state.value = _state.value.copy(actionResult = null)

        // Reset the local spin flag when a new calendar day starts
        val cal = java.util.Calendar.getInstance()
        val today = cal.get(java.util.Calendar.DAY_OF_YEAR)
        if (_spinLocalDate != null && _spinLocalDate != today) {
            _hasSpunLocallyToday = false
        }
        _spinLocalDate = today

        // Also check the persisted spin date (survives process death)
        val persistedDate = tokenStore.getLastSpinDate()
        if (persistedDate != null) {
            val todayStr = "%04d-%02d-%02d".format(
                cal.get(java.util.Calendar.YEAR),
                cal.get(java.util.Calendar.MONTH) + 1,
                cal.get(java.util.Calendar.DAY_OF_MONTH),
            )
            if (persistedDate == todayStr && !_hasSpunLocallyToday) {
                // Restore the lock from persistence
                _hasSpunLocallyToday = true
            }
        }

        // Prevent multiple spins per day — check both the persistent local flag AND the engagement state
        val alreadyLocked = _state.value.engagement?.spin?.canSpin == false
        if (_hasSpunLocallyToday || alreadyLocked) {
            _state.value = _state.value.copy(
                actionLoading = null,
            )
            return
        }

        // Persist the spin date FIRST before any API call so the lock survives even if
        // the app crashes between here and the API response.
        val todayPersist = "%04d-%02d-%02d".format(
            cal.get(java.util.Calendar.YEAR),
            cal.get(java.util.Calendar.MONTH) + 1,
            cal.get(java.util.Calendar.DAY_OF_MONTH),
        )
        tokenStore.saveLastSpinDate(todayPersist)

        // Lock immediately BEFORE launching coroutine to prevent race conditions from rapid double-clicks
        _hasSpunLocallyToday = true
        _state.value = _state.value.copy(actionLoading = "spin")

        viewModelScope.launch {
            // The flag was already set to true above, so proceed directly to the API.
            // No need to re-check — the outer guard already validated the lock state.
            when (val r = rewardsRepository.spinWheel()) {
                is ApiResult.Success -> {
                    val currentEng = _state.value.engagement ?: fallbackEngagementStatus
                    _state.value = _state.value.copy(
                        spinReward = r.data.reward,
                        engagement = currentEng.copy(
                            spin = currentEng.spin.copy(canSpin = false)
                        ),
                    )
                }
                is ApiResult.Failure -> {
                    val currentEng = _state.value.engagement ?: fallbackEngagementStatus
                    _state.value = _state.value.copy(
                        loading = false,
                        actionLoading = null,
                        spinReward = null,
                        engagement = currentEng.copy(
                            spin = currentEng.spin.copy(canSpin = false)
                        ),
                    )
                }
            }
        }
    }

    fun completeSpin() {
        _state.value = _state.value.copy(
            actionLoading = null,
            spinReward = null
        )
        load(refresh = true)
    }

    fun redeemStore(type: String, postId: String? = null) {
        _state.value = _state.value.copy(actionLoading = "redeem")
        viewModelScope.launch {
            when (val r = rewardsRepository.storeRedeem(type, postId)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = r.data.message ?: "Redeemed successfully!",
                    )
                    load(refresh = true)
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = r.error.message.ifBlank { "Redemption failed. Please check your coin balance." },
                    )
                }
            }
        }
    }

    fun claimMilestone() {
        _state.value = _state.value.copy(actionLoading = "milestone")
        viewModelScope.launch {
            when (rewardsRepository.claimReferralMilestone()) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = "Milestone reward claimed! \uD83C\uDF89",
                    )
                    load(refresh = true)
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    actionLoading = null, actionResult = "Already claimed or not eligible",
                )
            }
        }
    }

    fun claimDailyCode(code: String) {
        val trimmed = code.trim().uppercase()
        if (trimmed.isBlank()) return
        _state.value = _state.value.copy(actionLoading = "daily_code")
        viewModelScope.launch {
            when (val r = rewardsRepository.claimDailyCode(trimmed)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = r.data.message ?: "\uD83C\uDF89 +15 coins claimed with daily code!",
                    )
                    load(refresh = true)
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = r.error.message.ifBlank { "Invalid code or already claimed today" },
                    )
                }
            }
        }
    }

    fun clearActionResult() {
        _state.value = _state.value.copy(actionResult = null)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RewardsScreen(
    isAuthenticated: Boolean,
    onSignInRequired: () -> Unit,
    onBrowseMarketplace: () -> Unit,
    onOpenReferralTree: () -> Unit = {},
    viewModel: RewardsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val haptic = LocalHapticFeedback.current
    val darkTheme = ColorTokens.isDark
    var showSpinWinModal by remember { mutableStateOf(false) }
    var spinWinAmount by remember { mutableStateOf(0) }
    var spinWinLabel by remember { mutableStateOf("") }

    // Always attempt to load on mount — ViewModel handles 401 internally.
    // Never pre-emptively show auth gate from token-buffer fluctuations.
    LaunchedEffect(Unit) {
        viewModel.load()
    }
    // Silently re-load when user logs back in (e.g. from the in-screen auth gate)
    LaunchedEffect(isAuthenticated) {
        if (isAuthenticated && state.requiresAuth) viewModel.load()
    }

    // Auto-clear action result
    state.actionResult?.let { msg ->
        LaunchedEffect(msg) {
            kotlinx.coroutines.delay(3000)
            viewModel.clearActionResult()
        }
    }

    Scaffold(
        // Top bar is the shared marketplace-style bar rendered by MainShell.
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        if (state.requiresAuth) {
            Box(modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp), contentAlignment = Alignment.Center) {
                Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp)) {
                    Column(modifier = Modifier.fillMaxWidth().padding(28.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Outlined.Lock, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(40.dp))
                        Text(stringResource(R.string.rewards_sign_in_title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(stringResource(R.string.rewards_sign_in_subtitle), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(4.dp))
                        PrimaryButton(text = stringResource(R.string.action_sign_in), onClick = onSignInRequired)
                        SecondaryButton(text = stringResource(R.string.rewards_browse_marketplace), onClick = onBrowseMarketplace)
                    }
                }
            }
            return@Scaffold
        }

        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = { viewModel.load(refresh = true) }, modifier = Modifier.fillMaxSize().padding(padding)) {
            when {
                state.loading && state.rewards == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.error != null && state.rewards == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(title = "Rewards unavailable", message = state.error ?: "Failed to load", onRetry = { viewModel.load() }, retryLabel = "Retry")
                }
                state.rewards != null -> {
                    val rewards = state.rewards!! // Safe: null check guaranteed by enclosing when branch
                    val user = rewards.user
                    val userCoins = user.coins ?: 0
                    val isPremium = user.isPremium
                    val engagement = state.engagement
                    val referralTarget = engagement?.referralMilestones?.target ?: 3
                    val referralReward = engagement?.referralMilestones?.reward ?: 50
                    val directReferrals = user.directReferrals
                    val referralProgress = (directReferrals.toFloat() / referralTarget).coerceIn(0f, 1f)
                    val xpProgress = if (user.xpRequired <= 0) 0f else user.xpCurrent.toFloat() / user.xpRequired.toFloat()
                    val xpRemaining = max(0, user.xpRequired - user.xpCurrent)
                    val inviteText = "Join with my referral code ${user.referralCode ?: "JOINME"} and start earning rewards!"

                    // Redeem confirmation dialog with optional post picker
                    var redeemDialogType by remember { mutableStateOf<String?>(null) }
                    var redeemPostId by remember { mutableStateOf("") }
                    redeemDialogType?.let { type ->
                        val itemName = when (type) {
                            "boost" -> "Listing Boost (7 Days)"
                            "featured" -> "Featured Post (14 Days)"
                            "spotlight" -> "Top Search Spotlight (30 Days)"
                            "badge" -> "Elite Seller Badge"
                            else -> type
                        }
                        val itemCost = when (type) {
                            "boost" -> if (isPremium) 50 else 100
                            "featured" -> if (isPremium) 100 else 300
                            "spotlight" -> if (isPremium) 200 else 500
                            "badge" -> if (isPremium) 500 else 1000
                            else -> if (isPremium) 50 else 200
                        }
                        AlertDialog(
                            onDismissRequest = { redeemDialogType = null; redeemPostId = "" },
                            title = { Text(stringResource(R.string.rewards_redeem_item, itemName)) },
                            text = {
                                Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(stringResource(R.string.rewards_redeem_confirm, itemCost, itemName, user.totalCoins))
                                    if (type == "boost" || type == "featured" || type == "spotlight") {
                                        Spacer(Modifier.height(8.dp))
                                        Text("Select Post:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                                        if (state.activePosts.isEmpty()) {
                                            Text("No active posts found. Please create an active listing first.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                                        } else {
                                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                                state.activePosts.forEach { post ->
                                                    val isSelected = redeemPostId == post.id
                                                    Row(
                                                        modifier = Modifier
                                                            .fillMaxWidth()
                                                            .clip(RoundedCornerShape(8.dp))
                                                            .background(if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else Color.Transparent)
                                                            .border(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp))
                                                            .clickable { redeemPostId = post.id ?: "" }
                                                            .padding(10.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Box(
                                                            modifier = Modifier
                                                                .size(16.dp)
                                                                .clip(CircleShape)
                                                                .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                                                        )
                                                        Spacer(Modifier.width(10.dp))
                                                        Column {
                                                            Text(post.title ?: "Untitled", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                                            Text("ID: ${post.id}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            confirmButton = {
                                val canConfirm = state.actionLoading == null &&
                                        ((type != "boost" && type != "featured" && type != "spotlight") || redeemPostId.isNotBlank())
                                TextButton(
                                    onClick = {
                                        viewModel.redeemStore(type, redeemPostId.ifBlank { null })
                                        redeemDialogType = null
                                        redeemPostId = ""
                                    },
                                    enabled = canConfirm
                                ) {
                                    Text(stringResource(R.string.rewards_redeem))
                                }
                            },
                            dismissButton = { TextButton(onClick = { redeemDialogType = null; redeemPostId = "" }) { Text(stringResource(R.string.rewards_cancel)) } },
                        )
                    }

                    SpinWinCelebrationModal(
                        show = showSpinWinModal,
                        rewardAmount = spinWinAmount,
                        rewardLabel = spinWinLabel,
                        onDismiss = { showSpinWinModal = false },
                    )

                    var selectedTab by remember { mutableStateOf(0) }
                    Column(modifier = Modifier.fillMaxSize()) {
                    ScrollableTabRow(
                        selectedTabIndex = selectedTab,
                        edgePadding = 12.dp,
                        containerColor = MaterialTheme.colorScheme.surface,
                        divider = {},
                    ) {
                        listOf(
                            "Overview",
                            stringResource(R.string.rewards_tab_earn),
                            stringResource(R.string.rewards_tab_referrals),
                            stringResource(R.string.rewards_tab_activity),
                        ).forEachIndexed { index, title ->
                            Tab(
                                selected = selectedTab == index,
                                onClick = { selectedTab = index },
                                text = { Text(title, style = MaterialTheme.typography.labelMedium) },
                            )
                        }
                    }
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        // Action result toast
                        state.actionResult?.let { msg ->
                            item {
                                Surface(shape = RoundedCornerShape(12.dp), color = if (darkTheme) Color(0xFF0A2E1A) else Color(0xFF10B981).copy(alpha = 0.12f), modifier = Modifier.fillMaxWidth()) {
                                    Text(msg, modifier = Modifier.padding(12.dp).fillMaxWidth(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669), textAlign = TextAlign.Center)
                                }
                            }
                        }

                        // ─── Hero Banner ────────────────────────────
                        if (selectedTab == 0) item {
                            Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Brush.horizontalGradient(if (darkTheme) listOf(Color(0xFF1A2744), Color(0xFF2D3A6E), Color(0xFF3D2D6B)) else listOf(Color(0xFF0EA5E9), Color(0xFF3B82F6), Color(0xFF8B5CF6)))).padding(14.dp)) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    // Compact header row with user info
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Box(contentAlignment = Alignment.TopEnd) {
                                            Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                                                Text((user.name?.firstOrNull()?.uppercaseChar() ?: '?').toString(), style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
                                            }
                                            Box(modifier = Modifier.size(18.dp).clip(CircleShape).background(Color(0xFFF59E0B)).border(1.5.dp, Color.White, CircleShape), contentAlignment = Alignment.Center) {
                                                Icon(Icons.Filled.EmojiEvents, null, tint = Color.White, modifier = Modifier.size(10.dp))
                                            }
                                        }
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(user.name ?: "User", style = MaterialTheme.typography.titleSmall, color = Color.White, fontWeight = FontWeight.Bold)
                                            Text(stringResource(R.string.rewards_referral_code, user.referralCode ?: "\u2014"), style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f))
                                        }
                                        // Active Plan chip
                                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            HeroChip("✨ ${user.membershipPlan?.replaceFirstChar { it.uppercase() } ?: "Premium"} Plan")
                                        }
                                    }
                                    // Stats & Tier Progress Row
                                    Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Column {
                                            Text(
                                                text = "🪙 $userCoins Coins",
                                                style = MaterialTheme.typography.titleLarge,
                                                color = Color.White,
                                                fontWeight = FontWeight.Black
                                            )
                                            Text(
                                                text = "Marketplace Credits",
                                                style = MaterialTheme.typography.labelMedium,
                                                color = Color.White.copy(alpha = 0.8f)
                                            )
                                        }
                                        
                                        // Tiered Progress Ring Canvas
                                        val xpCurrent = user.xpCurrent ?: 0
                                        val xpRequired = user.xpRequired ?: 100
                                        val progress = if (xpRequired > 0) (xpCurrent.toFloat() / xpRequired.toFloat()).coerceIn(0f, 1f) else 1f
                                        val nextTier = when (user.tier?.lowercase()) {
                                            "bronze" -> "Silver"
                                            "silver" -> "Gold"
                                            "gold" -> "Platinum"
                                            else -> "Max"
                                        }
                                        
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                            Column(horizontalAlignment = Alignment.End) {
                                                Text("Next: $nextTier", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                                Text("$xpCurrent / $xpRequired XP", color = Color.White.copy(alpha = 0.7f), fontSize = 11.sp)
                                            }
                                            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(48.dp)) {
                                                androidx.compose.foundation.Canvas(modifier = Modifier.size(48.dp)) {
                                                    drawArc(
                                                        color = Color.White.copy(alpha = 0.2f),
                                                        startAngle = 0f, sweepAngle = 360f,
                                                        useCenter = false, style = androidx.compose.ui.graphics.drawscope.Stroke(4.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round)
                                                    )
                                                    drawArc(
                                                        color = Color(0xFFFCD34D), // Gold/Amber accent
                                                        startAngle = -90f, sweepAngle = progress * 360f,
                                                        useCenter = false, style = androidx.compose.ui.graphics.drawscope.Stroke(4.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round)
                                                    )
                                                }
                                                Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFCD34D), modifier = Modifier.size(20.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Coins Utility Overview (collapsed by default) ──
                        if (selectedTab == 0) item {
                            CollapsibleAccordion(
                                title = "\uD83D\uDCB0 Coins Usage & Strategic Valuation",
                                emoji = "\uD83D\uDCB0",
                                accentColor = Color(0xFFF59E0B),
                                darkTheme = darkTheme,
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(
                                        if (isPremium) "🔥 Premium Active Perk: Save up to 5x on Listing Boosts & Spotlights!"
                                        else "Standard Rate: 100 coins = ₹1.00 in platform value. Upgrade to Premium for 5x boost discounts!",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (isPremium) Color(0xFFD97706) else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    HorizontalDivider()
                                    Text(
                                        if (isPremium) "🔥 Post Boost (50 coins): Top priority placement for 7 days."
                                        else "📢 Post Boost (200 coins): Top priority placement for 7 days (50c for Premium).",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        if (isPremium) "🔥 Featured Post (100 coins): Highlighted badge & featured placement for 14 days."
                                        else "📢 Featured Post (300 coins): Highlighted placement for 14 days (100c for Premium).",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        if (isPremium) "🔥 Spotlight / Top Placement (200 coins): Premium top feed placement for 30 days."
                                        else "📢 Spotlight / Top Placement (500 coins): Top placement for 30 days (200c for Premium).",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    HorizontalDivider()
                                    Text(
                                        "• Plan Purchase Discount: Redeem coins to claim up to 25% off plan purchases (7,200 coins = ₹450 off ₹1,800 Premium plan).",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }

                        // ─── Impact Dashboard (collapsed by default) ───
                        if (selectedTab == 0) item {
                            CollapsibleAccordion(
                                title = stringResource(R.string.rewards_impact_dashboard),
                                emoji = "\uD83D\uDCCA",
                                accentColor = Color(0xFF3B82F6),
                                darkTheme = darkTheme,
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        ImpactCard("Total Points", (user.totalCoins + user.chainEarnedPoints).toString(), "\uD83C\uDFC6", Color(0xFFF59E0B), Modifier.weight(1f))
                                        ImpactCard("Chain Depth", rewards.referralChain.size.toString(), "\uD83D\uDD17", MaterialTheme.colorScheme.primary, Modifier.weight(1f))
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        ImpactCard("Active Referrals", user.directReferrals.toString(), "\uD83D\uDC65", Color(0xFF10B981), Modifier.weight(1f))
                                        ImpactCard("Success Rate", if (user.directReferrals == 0) "\u2014" else "${(user.successfulRefs.toFloat() / user.directReferrals * 100).toInt()}%", "\uD83D\uDCC8", Color(0xFF0EA5E9), Modifier.weight(1f))
                                    }
                                }
                            }
                        }

                        // ─── Coin Balance ────────────────────────────────
                        if (selectedTab == 0) item {
                            val coinPulse = rememberInfiniteTransition(label = "coinPulse")
                            val coinScale by coinPulse.animateFloat(1f, 1.06f, infiniteRepeatable(tween(3000, easing = LinearEasing), RepeatMode.Reverse), label = "coinScale")
                            val coinFloat by coinPulse.animateFloat(0f, -6f, infiniteRepeatable(tween(3000, easing = LinearEasing), RepeatMode.Reverse), label = "coinFloat")
                            val shimmerX by coinPulse.animateFloat(-0.5f, 1.5f, infiniteRepeatable(tween(2500, easing = LinearEasing), RepeatMode.Restart), label = "shimmerX")
                            AccentTopCard(listOf(Color(0xFFF59E0B), Color(0xFFD97706)), if (darkTheme) Color(0xFF2D210E) else Color(0xFFFFFBEB)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                                        Text(stringResource(R.string.rewards_coin_balance), style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFFFCD34D) else Color(0xFFD97706), letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold)
                                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(user.totalCoins.toString(), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black, color = if (darkTheme) Color(0xFFFCD34D) else Color(0xFFB45309), modifier = Modifier.graphicsLayer(scaleX = coinScale, scaleY = coinScale))
                                            Text(stringResource(R.string.rewards_coins_label), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 4.dp))
                                        }
                                        val coinProgress = (user.totalCoins % 500) / 500f
                                        Box(modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(if (darkTheme) Color(0xFF2D1F00) else Color(0xFFFEF3C7))) {
                                            Box(modifier = Modifier.fillMaxWidth(coinProgress.coerceIn(0.05f, 1f)).height(6.dp).drawBehind {
                                                drawRect(Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFFBBF24), Color.White.copy(alpha = 0.5f), Color(0xFFFBBF24), Color(0xFFF59E0B)), startX = size.width * shimmerX, endX = size.width * (shimmerX + 1f)))
                                            }.clip(RoundedCornerShape(3.dp)))
                                        }
                                        Text(stringResource(R.string.rewards_coins_to_next, user.totalCoins % 500), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Box(modifier = Modifier.size(52.dp).offset(y = coinFloat.dp).clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(if (darkTheme) Color(0xFF2D1F00) else Color(0xFFFEF3C7), if (darkTheme) Color(0xFF3D2900) else Color(0xFFFDE68A)))), contentAlignment = Alignment.Center) {
                                        Text("\uD83E\uDE99", style = MaterialTheme.typography.headlineMedium)
                                    }
                                }
                            }
                        }

                        // ─── Daily Streak & Check-In ───
                        if (selectedTab == 1) item {
                            val canCheckIn = engagement?.dailyCheckIn?.canClaim ?: true
                            val streak = engagement?.dailyCheckIn?.streak ?: user.visitStreak
                            val weekProgress = engagement?.dailyCheckIn?.weekProgress ?: emptyList()
                            val todayReward = engagement?.dailyCheckIn?.todayReward ?: 5

                            // ── Countdown to next claim ──
                            var countdownTxt by remember { mutableStateOf("") }
                            LaunchedEffect(canCheckIn) {
                                while (true) {
                                    if (!canCheckIn) {
                                        val cal = java.util.Calendar.getInstance()
                                        val now = cal.timeInMillis
                                        cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
                                        cal.set(java.util.Calendar.MINUTE, 0)
                                        cal.set(java.util.Calendar.SECOND, 0)
                                        cal.set(java.util.Calendar.MILLISECOND, 0)
                                        cal.add(java.util.Calendar.DAY_OF_YEAR, 1)
                                        val midnight = cal.timeInMillis
                                        val diff = midnight - now
                                        val h = diff / 3600000
                                        val m = (diff % 3600000) / 60000
                                        val s = (diff % 60000) / 1000
                                        countdownTxt = "Next claim in %02d:%02d:%02d".format(h, m, s)
                                    } else {
                                        countdownTxt = ""
                                    }
                                    kotlinx.coroutines.delay(1000)
                                }
                            }

                            // ── Celebration state ──
                            var showCheckinCelebration by remember { mutableStateOf(false) }
                            var claimedAmount by remember { mutableStateOf(0) }
                            val checkinActionResult = state.actionResult
                            LaunchedEffect(checkinActionResult) {
                                if (checkinActionResult != null && state.actionLoading != "checkin") {
                                    val amt = """(\d+)""".toRegex().find(checkinActionResult)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: todayReward
                                    claimedAmount = amt
                                    showCheckinCelebration = true
                                    kotlinx.coroutines.delay(2500)
                                    showCheckinCelebration = false
                                }
                            }

                            AccentTopCard(listOf(MaterialTheme.colorScheme.primary, Color(0xFF8B5CF6)), if (darkTheme) Color(0xFF1A2744) else Color(0xFFF8FAFF)) {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("DAILY STREAK & CHECK-IN", style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFFA5B4FC) else Color(0xFF4F46E5), letterSpacing = 1.5.sp, fontWeight = FontWeight.SemiBold)
                                        Surface(shape = RoundedCornerShape(999.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)) {
                                            Text("\uD83D\uDD25 $streak day streak", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    // Streak milestones
                                    if (streak == 7) {
                                        Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFFFD700).copy(alpha = 0.15f), modifier = Modifier.fillMaxWidth()) {
                                            Text("🏆 7-Day Streak Complete! Keep checking in daily!", modifier = Modifier.padding(8.dp), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = Color(0xFFB45309))
                                        }
                                    } else if (streak % 3 == 0 && streak > 0) {
                                        Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF10B981).copy(alpha = 0.1f), modifier = Modifier.fillMaxWidth()) {
                                            Text("\uD83D\uDD25 $streak-day milestone! Keep going!", modifier = Modifier.padding(8.dp), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = Color(0xFF059669))
                                        }
                                    }
                                    // 7-day streak progression ladder with escalating reward values
                                    val days = listOf("Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7")
                                    val dayRewards = listOf("+5", "+10", "+10", "+15", "+15", "+20", "+50")
                                    val activeDayIndex = if (canCheckIn) (streak % 7) else ((streak - 1).coerceAtLeast(0) % 7)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                        days.forEachIndexed { index, day ->
                                            val isCompleted = index < (if (canCheckIn) streak % 7 else ((streak - 1).coerceAtLeast(0) % 7) + 1)
                                            val isToday = index == activeDayIndex
                                            val isMilestone = listOf(2, 4, 6).contains(index)
                                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(day, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                                                Box(
                                                    modifier = Modifier.size(38.dp).clip(CircleShape)
                                                        .background(when {
                                                            isCompleted -> Color(0xFF10B981)
                                                            isToday && canCheckIn -> Color(0xFF4F46E5)
                                                            isMilestone -> Color(0xFFFFD700).copy(alpha = 0.3f)
                                                            else -> MaterialTheme.colorScheme.surfaceVariant
                                                        })
                                                        .then(if (isToday && canCheckIn) Modifier.border(2.dp, Color(0xFF4F46E5), CircleShape) else Modifier)
                                                        .then(if (isMilestone && !isCompleted && !isToday) Modifier.border(1.dp, Color(0xFFFFD700).copy(alpha = 0.5f), CircleShape) else Modifier),
                                                    contentAlignment = Alignment.Center,
                                                ) {
                                                    if (isCompleted) Text("\u2713", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall)
                                                    else {
                                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                            Text(dayRewards[index], style = MaterialTheme.typography.labelSmall, color = if (isToday && canCheckIn) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                                        }
                                                    }
                                                }
                                                if (isMilestone) {
                                                    val bonus = when (index) { 2 -> "\uD83C\uDFC5"; 4 -> "\uD83C\uDF96"; 6 -> "\uD83C\uDFC6"; else -> "" }
                                                    Text(bonus, fontSize = 8.sp)
                                                }
                                            }
                                        }
                                    }
                                    // Countdown and claim button
                                    if (!canCheckIn && countdownTxt.isNotEmpty()) {
                                        Text(countdownTxt, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                                    }
                                    Box(modifier = Modifier.fillMaxWidth()) {
                                        PrimaryButton(
                                            text = when {
                                                state.actionLoading == "checkin" -> "\u23F3 Claiming..."
                                                canCheckIn -> "\u2705 Check In (+$todayReward \uD83E\uDE99)"
                                                else -> "\u2705 Checked In Today"
                                            },
                                            onClick = {
                                                if (canCheckIn) {
                                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                    viewModel.dailyCheckIn()
                                                }
                                            },
                                            enabled = canCheckIn && state.actionLoading == null,
                                        )
                                    }
                                }
                            }

                            // ── Check-in celebration overlay ──
                            if (showCheckinCelebration) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(200.dp)
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(Color(0xFF10B981).copy(alpha = 0.9f)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        val celebScale = remember { Animatable(0f) }
                                        LaunchedEffect(Unit) {
                                            celebScale.animateTo(1.2f, spring(dampingRatio = 0.3f, stiffness = 300f))
                                            celebScale.animateTo(1f, spring(dampingRatio = 0.5f, stiffness = 200f))
                                        }
                                        Text("\uD83C\uDF89", fontSize = 48.sp, modifier = Modifier.graphicsLayer(scaleX = celebScale.value, scaleY = celebScale.value))
                                        Text("+$claimedAmount coins earned!", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                                        Text("Day $streak streak", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.85f))
                                    }
                                }
                            }
                        }

                        // ─── Spin & Win Wheel Card ───
                        if (selectedTab == 1) item {
                            val canSpin = engagement?.spin?.canSpin ?: false
                            AccentTopCard(listOf(Color(0xFF8B5CF6), Color(0xFFEC4899)), if (darkTheme) Color(0xFF23173A) else Color(0xFFFAF5FF)) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("SPIN & WIN WHEEL", style = MaterialTheme.typography.labelSmall, color = Color(0xFFA855F7), letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold)
                                        Surface(shape = RoundedCornerShape(999.dp), color = Color(0xFFA855F7).copy(alpha = 0.15f)) {
                                            Text(if (canSpin) "🎰 1 Spin Available" else "🎰 Spun Today", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = Color(0xFFA855F7), fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    SpinWheelCanvas(
                                        isSpinning = state.actionLoading == "spin",
                                        targetReward = state.spinReward,
                                        canSpin = canSpin,
                                        onSpin = { viewModel.spinWheel() },
                                        onWin = { amount, label ->
                                            spinWinAmount = amount
                                            spinWinLabel = label
                                            showSpinWinModal = true
                                            viewModel.completeSpin()
                                        },
                                        modifier = Modifier.fillMaxWidth().height(200.dp),
                                    )
                                    Button(
                                        onClick = { viewModel.spinWheel() },
                                        modifier = Modifier.fillMaxWidth().height(44.dp),
                                        enabled = canSpin && state.actionLoading == null,
                                        shape = RoundedCornerShape(14.dp),
                                    ) {
                                        if (state.actionLoading == "spin") {
                                            val spinTransition = rememberInfiniteTransition(label = "spinAnim")
                                            val spinRot by spinTransition.animateFloat(0f, 360f, infiniteRepeatable(tween(700, easing = LinearEasing), RepeatMode.Restart), label = "spinRot")
                                            Text("🎰 Spinning...", modifier = Modifier.graphicsLayer(rotationZ = spinRot), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                                        } else {
                                            Text(if (canSpin) "Spin Now 🎰" else "Already Spun Today ✓", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }



                        // ─── Referral Challenge ─────────────────────────
                        if (selectedTab == 2) item {
                            AccentTopCard(listOf(Color(0xFF10B981), Color(0xFF059669)), if (darkTheme) Color(0xFF0F2E20) else Color(0xFFF0FDF4)) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Column {
                                            Text(stringResource(R.string.rewards_referral_challenge), style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669), letterSpacing = 1.5.sp, fontWeight = FontWeight.SemiBold)
                                            Text(stringResource(R.string.rewards_invite_goal, referralTarget, referralReward), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                        }
                                        Text("$directReferrals/$referralTarget", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669))
                                    }
                                    Box(modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(if (darkTheme) Color(0xFF1F3D2E) else Color(0xFFD1FAE5))) {
                                        Box(modifier = Modifier.fillMaxWidth(referralProgress).height(8.dp).background(Brush.horizontalGradient(listOf(Color(0xFF34D399), Color(0xFF059669))), RoundedCornerShape(4.dp)))
                                    }
                                    if (directReferrals >= referralTarget && (engagement?.referralMilestones?.canClaim != false)) {
                                        PrimaryButton(
                                            text = if (state.actionLoading == "milestone") "Claiming..." else "\uD83C\uDF89 Claim $referralReward coins!",
                                            onClick = { viewModel.claimMilestone() },
                                            enabled = state.actionLoading == null,
                                        )
                                    } else {
                                        Text(stringResource(R.string.rewards_coins_on_complete, referralReward), style = MaterialTheme.typography.labelMedium, color = if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669))
                                    }
                                }
                            }
                        }

                        // ─── Referral Code (Copy + Share) ────────────────────────
                        if (selectedTab == 2) item {
                            AccentTopCard(listOf(MaterialTheme.colorScheme.primary, Color(0xFF8B5CF6)), if (darkTheme) Color(0xFF1A2744) else Color(0xFFF8FAFF)) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(stringResource(R.string.rewards_share_code), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    Row(
                                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)).padding(horizontal = 16.dp, vertical = 14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            text = user.referralCode ?: "JOINME",
                                            style = MaterialTheme.typography.headlineSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary,
                                            letterSpacing = 2.sp,
                                        )
                                        OutlinedButton(
                                            onClick = { clipboardManager.setText(AnnotatedString(user.referralCode ?: "JOINME")); haptic.performHapticFeedback(HapticFeedbackType.LongPress) },
                                            shape = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        ) {
                                            Text("\uD83D\uDCCB Copy", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Text("Share this code with friends to earn rewards!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                                    // Share buttons row
                                    val shareText = "🛍️ Join the marketplace! Use my invite code ${user.referralCode ?: "JOINME"} to unlock ₹100 bonus on your first deal: https://zaruda.app/invite/${user.referralCode ?: "JOINME"}"
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        // WhatsApp share
                                        Button(
                                            onClick = {
                                                val intent = Intent(Intent.ACTION_SEND).apply {
                                                    type = "text/plain"
                                                    putExtra(Intent.EXTRA_TEXT, shareText)
                                                    setPackage("com.whatsapp")
                                                }
                                                try {
                                                    context.startActivity(intent)
                                                } catch (_: android.content.ActivityNotFoundException) {
                                                    // WhatsApp not installed, open chooser
                                                    val chooser = Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                                                        type = "text/plain"
                                                        putExtra(Intent.EXTRA_TEXT, shareText)
                                                    }, "Share referral code")
                                                    context.startActivity(chooser)
                                                }
                                            },
                                            modifier = Modifier.weight(1f).height(38.dp),
                                            shape = RoundedCornerShape(10.dp),
                                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                        ) {
                                            Text("WhatsApp", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        }
                                        // SMS share
                                        Button(
                                            onClick = {
                                                val intent = Intent(Intent.ACTION_SENDTO).apply {
                                                    data = Uri.parse("smsto:")
                                                    putExtra("sms_body", shareText)
                                                }
                                                try {
                                                    context.startActivity(intent)
                                                } catch (_: android.content.ActivityNotFoundException) {
                                                    val chooser = Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                                                        type = "text/plain"
                                                        putExtra(Intent.EXTRA_TEXT, shareText)
                                                    }, "Share referral code")
                                                    context.startActivity(chooser)
                                                }
                                            },
                                            modifier = Modifier.weight(1f).height(38.dp),
                                            shape = RoundedCornerShape(10.dp),
                                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                        ) {
                                            Text("SMS", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        }
                                        // General share
                                        Button(
                                            onClick = {
                                                val intent = Intent(Intent.ACTION_SEND).apply {
                                                    type = "text/plain"
                                                    putExtra(Intent.EXTRA_TEXT, shareText)
                                                }
                                                context.startActivity(Intent.createChooser(intent, "Share referral code"))
                                            },
                                            modifier = Modifier.weight(1f).height(38.dp),
                                            shape = RoundedCornerShape(10.dp),
                                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                        ) {
                                            Text("Share", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Scratch Card Gamification ───
                        if (selectedTab == 1) item {
                            var isScratched by remember { mutableStateOf(false) }
                            AccentTopCard(listOf(Color(0xFFFFD700), Color(0xFFF59E0B)), if (darkTheme) Color(0xFF2D210E) else Color(0xFFFFFBEB)) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("DAILY SCRATCH CARD", style = MaterialTheme.typography.labelSmall, color = Color(0xFFD97706), letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold)
                                        Surface(shape = RoundedCornerShape(999.dp), color = Color(0xFFF59E0B).copy(alpha = 0.15f)) {
                                            Text(if (isScratched) "✨ Claimed!" else "🎁 1 Scratch Available", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = Color(0xFFD97706), fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    ScratchCardCanvas(
                                        rewardText = "150 Coins!",
                                        isScratchable = !isScratched,
                                        onRevealed = {
                                            isScratched = true
                                            spinWinAmount = 150
                                            spinWinLabel = "Daily Scratch Card"
                                            showSpinWinModal = true
                                            // Ideally call a viewModel function to claim
                                        },
                                        modifier = Modifier.fillMaxWidth().height(140.dp)
                                    )
                                }
                            }
                        }

                        // ─── 7 Challenge Types ───────────────────────────
                        if (selectedTab == 1) item {
                            val stats = user.activityStats
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(stringResource(R.string.rewards_challenge_board), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    EarnPlaybookRow("👥", "Invite Friends", "+10 coins", (stats.referralsCount / 10f).coerceIn(0f, 1f), MaterialTheme.colorScheme.primary)
                                    EarnPlaybookRow("📅", "Daily Visit", "+2 coins", (user.visitStreak / 7f).coerceIn(0f, 1f), Color(0xFF10B981))
                                    EarnPlaybookRow("✍️", "Create Post", "+5 coins", (stats.postsCount / 10f).coerceIn(0f, 1f), Color(0xFF0EA5E9))
                                    EarnPlaybookRow("📤", "Share Post", "+3 coins", (stats.sharesCount / 10f).coerceIn(0f, 1f), Color(0xFF8B5CF6))
                                    EarnPlaybookRow("✅", "Complete Profile", "+15 coins", if ((user.email ?: "").isNotBlank() && (user.phone ?: "").isNotBlank()) 1f else 0.5f, Color(0xFFF59E0B))
                                    EarnPlaybookRow("💰", "Complete Sale", "+25 coins", (stats.salesCount / 5f).coerceIn(0f, 1f), Color(0xFF059669))
                                    EarnPlaybookRow("🛒", "Make Purchase", "+10 coins", (stats.purchasesCount / 5f).coerceIn(0f, 1f), Color(0xFFEC4899))
                                }
                            }
                        }

                        // ─── Rules & Valuation Guide (Accordion) ──────
                        if (selectedTab == 1) item {
                            CollapsibleAccordion(
                                title = stringResource(R.string.rewards_accordion_rules_title),
                                emoji = "\u2139\uFE0F",
                                accentColor = Color(0xFF3B82F6),
                                darkTheme = darkTheme,
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    // Coin Valuation
                                    Text("\uD83D\uDCB0 Coin Valuation", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                                    Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f), modifier = Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text("100 coins = \u20B91", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                                            Text("500 coins = \u20B95", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("1000 coins = \u20B910", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                    HorizontalDivider()
                                    // Referral Chain Rules
                                    Text("\uD83D\uDD17 Referral Chain Depth", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                                    val chainRules = rewards.chainRules
                                    if (chainRules.isNotEmpty()) {
                                        chainRules.forEach { rule ->
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                                Text("Depth ${rule.depth}", style = MaterialTheme.typography.bodySmall)
                                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF10B981).copy(alpha = 0.12f)) {
                                                    Text("+${rule.points.toInt()} coins", modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = Color(0xFF059669))
                                                }
                                            }
                                        }
                                    } else {
                                        Text("Depth 1 = +50 coins \u2022 Depth 2 = +25 coins \u2022 Depth 3 = +10 coins", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    HorizontalDivider()
                                    // Boost Pricing
                                    Text("\uD83D\uDE80 Boost Pricing", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Surface(modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp), color = Color(0xFF10B981).copy(alpha = 0.08f)) {
                                            Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text("Boost", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(if (isPremium) "50c" else "100c", fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                                                Text("7 days", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                        Surface(modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp), color = Color(0xFF7C3AED).copy(alpha = 0.08f)) {
                                            Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text("Featured", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(if (isPremium) "100c" else "300c", fontWeight = FontWeight.Bold, color = Color(0xFF7C3AED))
                                                Text("14 days", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                        Surface(modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp), color = Color(0xFFF59E0B).copy(alpha = 0.08f)) {
                                            Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text("Spotlight", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(if (isPremium) "200c" else "500c", fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
                                                Text("30 days", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ─── How Referral Chain Works (Accordion) ─────
                        if (selectedTab == 2) item {
                            CollapsibleAccordion(
                                title = stringResource(R.string.rewards_accordion_referral_title),
                                emoji = "\uD83D\uDD04",
                                accentColor = Color(0xFF8B5CF6),
                                darkTheme = darkTheme,
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("When you invite a friend, you earn coins at every level of their network:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    // Visual chain
                                    Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f), modifier = Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Text("\uD83D\uDC64", fontSize = 16.sp)
                                                Text("You", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                                                Text("\u2192", color = MaterialTheme.colorScheme.primary)
                                                Text("Direct friend", style = MaterialTheme.typography.bodySmall)
                                                Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF10B981).copy(alpha = 0.15f)) {
                                                    Text("+50", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                                                }
                                            }
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Text("\u251C\u2500", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text("Friend\'s friend", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(start = 4.dp))
                                                Text("\u2192", color = Color(0xFF3B82F6))
                                                Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF3B82F6).copy(alpha = 0.15f)) {
                                                    Text("+25", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = Color(0xFF2563EB))
                                                }
                                            }
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Text("\u2514\u2500\u2500", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text("Third level", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(start = 4.dp))
                                                Text("\u2192", color = Color(0xFF8B5CF6))
                                                Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF8B5CF6).copy(alpha = 0.15f)) {
                                                    Text("+10", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = Color(0xFF7C3AED))
                                                }
                                            }
                                        }
                                    }
                                    Text("Deeper levels earn fewer coins. Focus on inviting quality referrals who stay active!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }

                        // ─── Redeem Store with Category Filter ───────────
                        if (selectedTab == 1) item {
                            var redeemFilter by remember { mutableStateOf("All") }
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(stringResource(R.string.rewards_redeem_store), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    // Category filter chips
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                                        listOf("All", "Listing Boosts", "Seller Badges").forEach { cat ->
                                            FilterChip(
                                                selected = redeemFilter == cat,
                                                onClick = { redeemFilter = cat },
                                                label = { Text(cat, fontSize = 11.sp) },
                                                shape = RoundedCornerShape(16.dp),
                                            )
                                        }
                                    }
                                    Text("Redeem your hard-earned coins for search priority and verified badges", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    // Listing Boost items
                                    if (redeemFilter == "All" || redeemFilter == "Listing Boosts") {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            RedeemCard("🚀", if (isPremium) "Boost (50c)" else "Boost (100c)", if (isPremium) 50 else 100, user.totalCoins >= if (isPremium) 50 else 100, Color(0xFF10B981), darkTheme, Modifier.weight(1f)) { redeemDialogType = "boost" }
                                            RedeemCard("⭐", if (isPremium) "Featured (100c)" else "Featured (300c)", if (isPremium) 100 else 300, user.totalCoins >= if (isPremium) 100 else 300, Color(0xFF7C3AED), darkTheme, Modifier.weight(1f)) { redeemDialogType = "featured" }
                                            RedeemCard("🏆", if (isPremium) "Spotlight (200c)" else "Spotlight (500c)", if (isPremium) 200 else 500, user.totalCoins >= if (isPremium) 200 else 500, Color(0xFFF59E0B), darkTheme, Modifier.weight(1f)) { redeemDialogType = "spotlight" }
                                        }
                                    }
                                    // Seller Badges
                                    if (redeemFilter == "All" || redeemFilter == "Seller Badges") {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            RedeemCard("💎", if (isPremium) "Elite Badge (500c)" else "Elite Badge (1000c)", if (isPremium) 500 else 1000, user.totalCoins >= if (isPremium) 500 else 1000, Color(0xFF0EA5E9), darkTheme, Modifier.weight(1f)) { redeemDialogType = "badge" }
                                        }
                                    }
                                }
                            }
                        }

                        // ─── My Rewards ─────────────────────────────────
                        // ─── Coin History (Always shown on Tab 3 with Empty State) ──
                        if (selectedTab == 3) {
                            item {
                                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp))) {
                                    Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Text(stringResource(R.string.rewards_coin_history), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        var historyFilter by remember { mutableStateOf("all") }
                                        val filterChips = listOf(
                                            "all" to "All",
                                            "earned" to "Earned",
                                            "spent" to "Spent",
                                            "referral" to "Referrals",
                                            "daily" to "Daily"
                                        )
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            filterChips.forEach { (key, label) ->
                                                val sel = historyFilter == key
                                                Surface(
                                                    shape = RoundedCornerShape(999.dp),
                                                    color = if (sel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                                    onClick = { historyFilter = key },
                                                ) {
                                                    Text(label, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), style = MaterialTheme.typography.labelSmall, color = if (sel) Color.White else MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                                                }
                                            }
                                        }

                                        if (state.coinHistory.isEmpty()) {
                                            Box(modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp), contentAlignment = Alignment.Center) {
                                                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                                    Text("🪙", fontSize = 32.sp)
                                                    Text("No coin activity yet", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                                    Text("Check in daily, spin the wheel, or invite friends to earn coins!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                                                }
                                            }
                                        } else {
                                            val filteredHistory = state.coinHistory.filter { tx ->
                                                val text = ((tx.description ?: "") + " " + (tx.action ?: "")).lowercase()
                                                when (historyFilter) {
                                                    "earned" -> tx.amount > 0
                                                    "spent" -> tx.amount < 0
                                                    "referral" -> text.contains("referral") || text.contains("milestone") || text.contains("invite")
                                                    "daily" -> text.contains("checkin") || text.contains("check-in") || text.contains("spin") || text.contains("daily")
                                                    else -> true
                                                }
                                            }

                                            if (filteredHistory.isEmpty()) {
                                                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), contentAlignment = Alignment.Center) {
                                                    Text("No transactions found in this category", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                }
                                            } else {
                                                filteredHistory.take(25).forEach { tx ->
                                                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                                        Column(modifier = Modifier.weight(1f)) {
                                                            Text(tx.description ?: tx.action ?: "Activity", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                                            tx.createdAt?.take(10)?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                                        }
                                                        Text("${if (tx.amount >= 0) "+" else ""}${tx.amount}", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = if (tx.amount >= 0) { if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669) } else { if (darkTheme) Color(0xFFFCA5A5) else Color(0xFFDC2626) })
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }



                        // ─── Milestone Badges ────────────────────────────
                        if (selectedTab == 2) item {
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text(stringResource(R.string.rewards_milestone_badges), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text(stringResource(R.string.rewards_badges_subtitle), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                        MilestoneBadge("\uD83C\uDF1F", "First Coin", user.totalCoins > 0)
                                        MilestoneBadge("\uD83D\uDD25", "5 Referrals", user.directReferrals >= 5)
                                        MilestoneBadge("\uD83D\uDC8E", "100 Coins", user.totalCoins >= 100)
                                        MilestoneBadge("\uD83C\uDFC6", "Chain King", rewards.referralChain.size >= 3)
                                    }
                                }
                            }
                        }

                        // ─── Referral Network Stats Grid ─────────────────
                        if (selectedTab == 2) item {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                    Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else Color(0xFFF1F5F9))) {
                                        Column(Modifier.padding(12.dp)) {
                                            Text("Direct Referrals", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("${user.directReferrals}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else Color(0xFFF1F5F9))) {
                                        Column(Modifier.padding(12.dp)) {
                                            Text("Total Network", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("${state.referralTree?.total ?: user.totalReferrals}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                    Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else Color(0xFFF1F5F9))) {
                                        Column(Modifier.padding(12.dp)) {
                                            Text("Direct Earned", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("${user.directPoints} coins", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else Color(0xFFF1F5F9))) {
                                        Column(Modifier.padding(12.dp)) {
                                            Text("Chain Earned", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("${user.chainEarnedPoints} coins", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Referral Network Tabs (Direct / Indirect) ────
                        if (selectedTab == 2) item {
                            val referralChainNodes = state.processedReferrals.ifEmpty { rewards.referralChain }
                            val directNodes = referralChainNodes.filter { it.type == "Direct" }
                            val indirectNodes = referralChainNodes.filter { it.type == "Indirect" }
                            var referralTabIndex by remember { mutableStateOf(0) }
                            Card(
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(3.dp),
                                modifier = Modifier.fillMaxWidth().border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.18f) else Color(0xFFE2E8F0).copy(alpha = 0.6f), RoundedCornerShape(20.dp)),
                            ) {
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    // ── Tab Row ────────────────────────────────
                                    val tabTitles = listOf("Direct", "Indirect")
                                    TabRow(
                                        selectedTabIndex = referralTabIndex,
                                        containerColor = Color.Transparent,
                                        contentColor = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                    ) {
                                        tabTitles.forEachIndexed { idx, title ->
                                            val tabCount = if (idx == 0) directNodes.size else indirectNodes.size
                                            Tab(
                                                selected = referralTabIndex == idx,
                                                onClick = { referralTabIndex = idx },
                                                text = {
                                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                        Text(title, fontWeight = if (referralTabIndex == idx) FontWeight.Bold else FontWeight.Normal, fontSize = 13.sp)
                                                        Surface(
                                                            shape = RoundedCornerShape(12.dp),
                                                            color = if (referralTabIndex == idx) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                                        ) {
                                                            Text(
                                                                "$tabCount",
                                                                fontSize = 11.sp,
                                                                color = if (referralTabIndex == idx) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                                                fontWeight = FontWeight.SemiBold,
                                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                                            )
                                                        }
                                                    }
                                                },
                                            )
                                        }
                                    }
                                    // ── Summary Header Card ───────────────────
                                    val isDirectTab = referralTabIndex == 0
                                    val tabAccent = if (isDirectTab) Color(0xFF10B981) else Color(0xFF3B82F6)
                                    val tabAccentBg = if (isDirectTab) Color(0xFFD1FAE5) else Color(0xFFDBEAFE)
                                    val currentNodes = if (isDirectTab) directNodes else indirectNodes

                                    Column(Modifier.padding(horizontal = 14.dp, vertical = 4.dp)) {
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = tabAccent,
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Row(
                                                Modifier.padding(16.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                            ) {
                                                Column {
                                                    Text(
                                                        if (isDirectTab) "Direct Referrals" else "Indirect Referrals",
                                                        fontSize = 11.sp,
                                                        color = Color.White.copy(alpha = 0.75f),
                                                    )
                                                    Text(
                                                        "${currentNodes.size}",
                                                        fontSize = 28.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Color.White,
                                                    )
                                                }
                                                if (isDirectTab && indirectNodes.isNotEmpty()) {
                                                    Text(
                                                        "${indirectNodes.size} also\nfrom network",
                                                        fontSize = 11.sp,
                                                        color = Color.White.copy(alpha = 0.65f),
                                                        lineHeight = 14.sp,
                                                        textAlign = TextAlign.End,
                                                    )
                                                }
                                                if (!isDirectTab && directNodes.isNotEmpty()) {
                                                    Text(
                                                        "${directNodes.size} direct\nreferrals",
                                                        fontSize = 11.sp,
                                                        color = Color.White.copy(alpha = 0.65f),
                                                        lineHeight = 14.sp,
                                                        textAlign = TextAlign.End,
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    // ── Referral Nodes List ───────────────────
                                    if (currentNodes.isEmpty()) {
                                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text(
                                                    if (isDirectTab) "\uD83D\uDC65" else "\uD83D\uDD17",
                                                    fontSize = 28.sp,
                                                )
                                                Text(
                                                    if (isDirectTab) "No direct referrals yet" else "No indirect referrals yet",
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    fontWeight = FontWeight.SemiBold,
                                                )
                                                Text(
                                                    if (isDirectTab) "Share your code to invite friends!" else "Indirect referrals come when your direct referrals invite others.",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    textAlign = TextAlign.Center,
                                                )
                                            }
                                        }
                                    } else {
                                        Column(
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                                            verticalArrangement = Arrangement.spacedBy(6.dp),
                                        ) {
                                            currentNodes.take(5).forEach { node ->
                                                val nodeAccent = if (isDirectTab) Color(0xFF059669) else Color(0xFF2563EB)
                                                val nodeBg = if (isDirectTab) Color(0xFF10B981).copy(alpha = 0.06f) else Color(0xFF3B82F6).copy(alpha = 0.06f)
                                                Surface(
                                                    shape = RoundedCornerShape(12.dp),
                                                    color = nodeBg,
                                                    modifier = Modifier.fillMaxWidth(),
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(12.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                                    ) {
                                                        Box(
                                                            modifier = Modifier.size(36.dp).clip(CircleShape).background(nodeAccent.copy(alpha = 0.2f)),
                                                            contentAlignment = Alignment.Center,
                                                        ) {
                                                            Text(
                                                                (node.name?.firstOrNull()?.uppercaseChar() ?: '?').toString(),
                                                                fontWeight = FontWeight.Bold,
                                                                color = nodeAccent,
                                                                fontSize = 14.sp,
                                                            )
                                                        }
                                                        Column(modifier = Modifier.weight(1f)) {
                                                            Text(node.name ?: "Unknown", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                                                            Text(
                                                                "Level ${node.depth} \u2022 ${node.joinDate?.take(10) ?: "Joined"}",
                                                                fontSize = 11.sp,
                                                                color = Color(0xFF64748B),
                                                            )
                                                        }
                                                        Surface(
                                                            shape = RoundedCornerShape(8.dp),
                                                            color = tabAccentBg,
                                                        ) {
                                                            Text(
                                                                "+${node.coins.coerceAtLeast(10)}",
                                                                fontSize = 11.sp,
                                                                color = nodeAccent,
                                                                fontWeight = FontWeight.SemiBold,
                                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                            )
                                                        }
                                                    }
                                                }
                                            }

                                            if (currentNodes.size > 5) {
                                                Surface(
                                                    shape = RoundedCornerShape(10.dp),
                                                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                                    modifier = Modifier.fillMaxWidth(),
                                                    onClick = onOpenReferralTree,
                                                ) {
                                                    Text(
                                                        "+${currentNodes.size - 5} more \u2014 View Full Network \u2192",
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        color = MaterialTheme.colorScheme.primary,
                                                        textAlign = TextAlign.Center,
                                                        modifier = Modifier.padding(vertical = 12.dp),
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    // ── View Full Network Button ──────────────
                                    if (referralChainNodes.isNotEmpty()) {
                                        Spacer(Modifier.height(4.dp))
                                        Surface(
                                            onClick = onOpenReferralTree,
                                            shape = RoundedCornerShape(0.dp, 0.dp, 20.dp, 20.dp),
                                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Row(
                                                Modifier.padding(vertical = 14.dp),
                                                horizontalArrangement = Arrangement.Center,
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Text(
                                                    "View Full Referral Network",
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = MaterialTheme.colorScheme.primary,
                                                )
                                                Spacer(Modifier.width(4.dp))
                                                Text("\u2192", fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Referral Leaderboard ────────────────────────
                        if (selectedTab == 2 && state.leaderboard.isNotEmpty()) item {
                            Card(
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(4.dp),
                                modifier = Modifier.fillMaxWidth().border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp))
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("🏆 Referral Leaderboard", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        Surface(shape = RoundedCornerShape(999.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)) {
                                            Text(
                                                "Your Rank: #${state.myLeaderboardPosition}",
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.primary,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                    Text("Top referrers this week", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    state.leaderboard.take(5).forEachIndexed { idx, entry ->
                                        val medal = when (idx) {
                                            0 -> "🥇"
                                            1 -> "🥈"
                                            2 -> "🥉"
                                            else -> "#${idx + 1}"
                                        }
                                        Row(
                                            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(if (idx < 3) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f) else Color.Transparent).padding(horizontal = 10.dp, vertical = 8.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        ) {
                                            Text(medal, fontSize = if (idx < 3) 16.sp else 13.sp, fontWeight = FontWeight.Bold)
                                            Text(entry.name ?: "User", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                            Text("${entry.referrals} referrals", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        item { Spacer(Modifier.height(56.dp)) }
                    } // end LazyColumn
                    } // end Column
                }
            }
        }
    }
}

// ──────────────────────────── Helpers ────────────────────────────────

@Composable
private fun ImpactCard(label: String, value: String, emoji: String, accentColor: Color, modifier: Modifier = Modifier) {
    val darkTheme = ColorTokens.isDark
    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(4.dp), modifier = modifier.border(1.dp, accentColor.copy(alpha = if (darkTheme) 0.3f else 0.15f), RoundedCornerShape(16.dp))) {
        Box {
            Box(modifier = Modifier.fillMaxWidth().height(3.dp).background(Brush.horizontalGradient(listOf(accentColor, accentColor.copy(alpha = 0.6f)))))
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(emoji, style = MaterialTheme.typography.titleMedium)
                    Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 0.5.sp)
                }
                Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, color = accentColor)
            }
        }
    }
}

@Composable
private fun CollapsibleAccordion(
    title: String,
    emoji: String,
    accentColor: Color,
    darkTheme: Boolean,
    initiallyExpanded: Boolean = false,
    content: @Composable () -> Unit,
) {
    var expanded by remember { mutableStateOf(initiallyExpanded) }
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(
                1.dp,
                if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.15f) else Color(0xFFE2E8F0),
                RoundedCornerShape(16.dp),
            ),
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded }
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = accentColor.copy(alpha = 0.12f),
                    modifier = Modifier.size(36.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(emoji, fontSize = 18.sp)
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        if (expanded) "Tap to collapse" else "Tap to expand",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Icon(
                    imageVector = if (expanded) Icons.Filled.KeyboardArrowDown else Icons.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            AnimatedVisibility(
                visible = expanded,
                enter = expandVertically(),
                exit = shrinkVertically(),
            ) {
                Column(modifier = Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp)) {
                    content()
                }
            }
        }
    }
}

@Composable
private fun AccentTopCard(accentColors: List<Color>, containerColor: Color, content: @Composable () -> Unit) {
    val darkTheme = ColorTokens.isDark
    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = containerColor), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.fillMaxWidth().border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.2f) else Color(0xFFE2E8F0).copy(alpha = 0.6f), RoundedCornerShape(20.dp))) {
        Box {
            Box(modifier = Modifier.fillMaxWidth().height(3.dp).background(Brush.horizontalGradient(accentColors)))
            Column(modifier = Modifier.padding(top = 3.dp).padding(14.dp)) { content() }
        }
    }
}

@Composable
private fun HeroChip(label: String) {
    Surface(shape = RoundedCornerShape(999.dp), color = Color.White.copy(alpha = 0.15f), border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.3f))) {
        Text(text = label, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun GoldProgressBar(progress: Float) {
    val shimmer = rememberInfiniteTransition(label = "goldShimmer")
    val shimmerX by shimmer.animateFloat(-0.5f, 1.5f, infiniteRepeatable(tween(2500, easing = LinearEasing), RepeatMode.Restart), label = "goldShimmerX")
    Box(modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(Color.White.copy(alpha = 0.2f))) {
        Box(modifier = Modifier.fillMaxWidth(progress.coerceIn(0f, 1f)).height(8.dp).drawBehind {
            drawRect(Brush.horizontalGradient(listOf(Color(0xFFFBBF24), Color(0xFFF59E0B), Color.White.copy(alpha = 0.5f), Color(0xFFF59E0B), Color(0xFFEA580C)), startX = size.width * shimmerX, endX = size.width * (shimmerX + 1f)))
        }.clip(RoundedCornerShape(4.dp)))
    }
}

@Composable
private fun RewardStatRow(label: String, value: String, icon: ImageVector) {
    val darkTheme = ColorTokens.isDark
    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1F2937) else Color(0xFFF1F5F9)), modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 9.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
            Column {
                Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun MilestoneBadge(emoji: String, label: String, unlocked: Boolean) {
    val darkTheme = ColorTokens.isDark
    val scale by animateFloatAsState(if (unlocked) 1f else 0.85f, spring(dampingRatio = 0.5f, stiffness = 300f), label = "badgeScale")
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.graphicsLayer(scaleX = scale, scaleY = scale)) {
        Box(modifier = Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(if (unlocked) Brush.linearGradient(listOf(Color(0xFFFBBF24).copy(alpha = 0.22f), Color(0xFFF59E0B).copy(alpha = 0.12f))) else Brush.linearGradient(listOf(Color(0xFF94A3B8).copy(alpha = 0.2f), Color(0xFFE2E8F0).copy(alpha = 0.2f)))).border(1.dp, if (unlocked) Color(0xFFF59E0B).copy(alpha = 0.3f) else Color(0xFF94A3B8).copy(alpha = 0.25f), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
            Text(emoji, style = MaterialTheme.typography.headlineSmall)
        }
        Text(label, style = MaterialTheme.typography.labelSmall, color = if (unlocked) { if (darkTheme) Color(0xFFFCD34D) else Color(0xFFB45309) } else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f), fontWeight = if (unlocked) FontWeight.SemiBold else FontWeight.Normal, textAlign = TextAlign.Center)
    }
}

@Composable
private fun EarnPlaybookRow(emoji: String, title: String, reward: String, progress: Float, accentColor: Color) {
    val darkTheme = ColorTokens.isDark
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(accentColor.copy(alpha = if (darkTheme) 0.15f else 0.08f)).border(1.dp, accentColor.copy(alpha = 0.18f), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
            Text(emoji, style = MaterialTheme.typography.titleSmall)
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(title, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                Text(reward, style = MaterialTheme.typography.labelSmall, color = if (darkTheme) accentColor.copy(alpha = 0.9f) else accentColor, fontWeight = FontWeight.Bold)
            }
            Box(modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(accentColor.copy(alpha = if (darkTheme) 0.15f else 0.1f))) {
                Box(modifier = Modifier.fillMaxWidth(progress.coerceIn(0f, 1f)).height(6.dp).background(Brush.horizontalGradient(listOf(accentColor, accentColor.copy(alpha = 0.7f))), RoundedCornerShape(3.dp)))
            }
        }
    }
}

@Composable
private fun RedeemCard(emoji: String, title: String, cost: Int, affordable: Boolean, accentColor: Color, darkTheme: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .border(1.5.dp, if (affordable) accentColor.copy(alpha = 0.5f) else Color(0xFF94A3B8).copy(alpha = 0.3f), RoundedCornerShape(14.dp))
            .background(
                if (affordable) {
                    if (darkTheme) accentColor.copy(alpha = 0.15f) else accentColor.copy(alpha = 0.04f)
                } else if (darkTheme) {
                    Color(0xFF1E293B)
                } else {
                    Color.Transparent
                }
            )
            .clickable(enabled = affordable, onClick = onClick)
            .padding(10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(emoji, style = MaterialTheme.typography.headlineSmall)
            Text(title, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center, maxLines = 2)
            Surface(shape = RoundedCornerShape(999.dp), color = if (affordable) accentColor.copy(alpha = 0.15f) else Color(0xFF94A3B8).copy(alpha = 0.12f)) {
                Text("$cost \uD83E\uDE99", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, color = if (affordable) { if (darkTheme) accentColor.copy(alpha = 0.95f) else accentColor } else { if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.8f) else MaterialTheme.colorScheme.onSurfaceVariant }, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun TierCard(title: String, perks: List<String>, unlocked: Boolean, accentColor: Color) {
    val darkTheme = ColorTokens.isDark
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else Color.White),
        elevation = CardDefaults.cardElevation(if (unlocked) 8.dp else 2.dp),
        modifier = Modifier.width(180.dp).border(2.dp, if (unlocked) accentColor else Color.Transparent, RoundedCornerShape(16.dp)),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = accentColor)
            perks.forEach { perk ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Box(modifier = Modifier.size(6.dp).background(if (unlocked) accentColor else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f), CircleShape))
                    Text(perk, style = MaterialTheme.typography.bodySmall, color = if (unlocked) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                }
            }
            if (!unlocked) {
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Text("🔒 Locked", modifier = Modifier.padding(vertical = 4.dp), style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun ConfettiAnimation() {
    val context = androidx.compose.ui.platform.LocalContext.current
    // Simple confetti effect using animated emojis
    var showConfetti by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(2000)
        showConfetti = false
    }
    if (showConfetti) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                repeat(5) { i ->
                    val offset by rememberInfiniteTransition(label = "confetti$i").animateFloat(
                        -50f, 50f, infiniteRepeatable(tween(800 + i * 100), RepeatMode.Reverse), label = "offset$i"
                    )
                    Text("🎉", style = MaterialTheme.typography.displayLarge, modifier = Modifier.offset(x = offset.dp, y = (i * 20).dp))
                }
            }
        }
    }
}

@Composable
fun SpinWheelCanvas(
    isSpinning: Boolean,
    targetReward: Int? = null,
    canSpin: Boolean = true,
    onSpin: () -> Unit = {},
    onWin: (Int, String) -> Unit = { _,_ -> },
    modifier: Modifier = Modifier,
) {
    val segments = remember {
        listOf(
            "+50" to Color(0xFFFFD700),
            "+25" to Color(0xFF10B981),
            "+15" to Color(0xFF3B82F6),
            "+10" to Color(0xFF8B5CF6),
            "+5" to Color(0xFFF59E0B),
            "XP" to Color(0xFF06B6D4),
        )
    }
    val segmentValues = remember { listOf(50, 25, 15, 10, 5, 0) }
    val anglePerSegment = 360f / segments.size

    val rotation = remember { Animatable(0f) }
    var isAnimating by remember { mutableStateOf(false) }
    var winningIndex by remember { mutableStateOf(-1) }
    val haptic = LocalHapticFeedback.current
    val isDark = ColorTokens.isDark
    val textMeasurer = rememberTextMeasurer()

    // Trigger spin with deceleration when ViewModel returns targetReward
    LaunchedEffect(targetReward) {
        if (targetReward != null && !isAnimating) {
            isAnimating = true
            winningIndex = -1
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)

            val targetIdx = segmentValues.indexOf(targetReward).coerceAtLeast(0)
            val fullRotations = (3..5).random() * 360f
            val segmentCenter = targetIdx * anglePerSegment + anglePerSegment * 0.5f
            val targetAngle = rotation.value + fullRotations + (270f - segmentCenter)

            rotation.animateTo(
                targetValue = targetAngle,
                animationSpec = tween(
                    durationMillis = 3000,
                    easing = FastOutSlowInEasing,
                )
            )
            winningIndex = targetIdx
            isAnimating = false
            onWin(segmentValues[targetIdx], segments[targetIdx].first)
        }
    }

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        // Pointer arrow at top (fixed, outside rotating wheel)
        Text(
            "▼",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = if (isDark) Color(0xFFFCD34D) else Color(0xFFDC2626),
            modifier = Modifier.offset(y = (-98).dp),
        )

        // Rotating wheel container
        Box(
            modifier = Modifier
                .size(180.dp)
                .drawBehind {
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(Color(0xFFFFD700).copy(alpha = 0.5f), Color.Transparent)
                        ),
                        radius = size.minDimension / 2 + 40f
                    )
                }
                .graphicsLayer { rotationZ = rotation.value }
                .border(
                    width = 4.dp,
                    brush = Brush.sweepGradient(
                        listOf(
                            Color(0xFFFF6B6B), Color(0xFFFFD700), Color(0xFF6BCB77),
                            Color(0xFF45B7D1), Color(0xFFF7AEF8), Color(0xFFFF6B6B)
                        )
                    ),
                    shape = CircleShape
                )
                .clip(CircleShape)
                .background(Color(0xFF1E293B))
                .clickable(enabled = canSpin && !isAnimating && !isSpinning) { onSpin() },
            contentAlignment = Alignment.Center,
        ) {                Canvas(modifier = Modifier.fillMaxSize()) {
                val canvasSize = size.minDimension
                // LED glow aura ring (outer)
                drawCircle(
                    brush = Brush.horizontalGradient(
                        listOf(
                            Color(0xFFFF6B6B).copy(alpha = 0.4f),
                            Color(0xFF45B7D1).copy(alpha = 0.4f),
                            Color(0xFF96CEB4).copy(alpha = 0.4f),
                            Color(0xFFFFEAA7).copy(alpha = 0.4f),
                            Color(0xFFF7AEF8).copy(alpha = 0.4f),
                            Color(0xFF6BCB77).copy(alpha = 0.4f),
                            Color(0xFFFF9F1C).copy(alpha = 0.4f),
                            Color(0xFFFF6B6B).copy(alpha = 0.4f),
                        )
                    ),
                    radius = canvasSize * 0.52f,
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 6f),
                )
                // LED glow aura ring (inner glow)
                drawCircle(
                    brush = Brush.radialGradient(
                        listOf(
                            Color.Transparent,
                            Color(0xFFFFD700).copy(alpha = 0.08f),
                        )
                    ),
                    radius = canvasSize * 0.5f,
                )
                // Draw segments with arcs and prize labels
                segments.forEachIndexed { i, (segmentLabel, color) ->
                    val isWin = winningIndex == i && !isAnimating
                    val startAngle = i * anglePerSegment - 90f
                    val sweepAngle = anglePerSegment - 3f
                    drawArc(
                        color = if (isWin) Color(0xFFFFD700) else color,
                        startAngle = startAngle,
                        sweepAngle = sweepAngle,
                        useCenter = true,
                    )
                    // Draw prize label text on segment
                    val midAngle = Math.toRadians((startAngle + sweepAngle / 2).toDouble())
                    val textRadius = canvasSize * 0.32f
                    val textX = (size.width / 2 + textRadius * kotlin.math.cos(midAngle)).toFloat() - 20f
                    val textY = (size.height / 2 + textRadius * kotlin.math.sin(midAngle)).toFloat() - 12f
                    val textLayout = textMeasurer.measure(
                        text = AnnotatedString(segmentLabel),
                        style = TextStyle(
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,

                        ),
                        maxLines = 1,
                    )
                    drawText(textLayout, topLeft = Offset(textX, textY))
                    // Glow border on winning segment
                    if (isWin) {
                        drawArc(
                            color = Color.White.copy(alpha = 0.6f),
                            startAngle = startAngle,
                            sweepAngle = sweepAngle,
                            useCenter = true,
                            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 5f),
                        )
                        // Extra glow pulse
                        drawArc(
                            color = Color(0xFFFFD700).copy(alpha = 0.3f),
                            startAngle = startAngle,
                            sweepAngle = sweepAngle,
                            useCenter = true,
                            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 12f),
                        )
                    }
                }
                // Outer border ring
                drawCircle(
                    color = if (isDark) Color(0xFF334155) else Color(0xFF9CA3AF),
                    radius = canvasSize * 0.50f,
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.5f),
                )
                // Center hub with gradient
                drawCircle(
                    brush = Brush.radialGradient(
                        listOf(Color.White, if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB))
                    ),
                    radius = canvasSize * 0.16f,
                )
                drawCircle(
                    color = if (isDark) Color(0xFF1F2937) else Color(0xFF4B5563),
                    radius = canvasSize * 0.12f,
                )
            }

            // Center label
            Text(
                text = when {
                    isAnimating -> "🎰"
                    winningIndex >= 0 -> "🎉"
                    else -> "SPIN"
                },
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )

        // Prize result shown below the wheel
        if (winningIndex >= 0 && !isAnimating) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFF10B981),
                modifier = Modifier
                    .offset(y = 86.dp)
                    .padding(horizontal = 8.dp),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("🎉", fontSize = 14.sp)
                    Text(
                        if (segmentValues[winningIndex] == 0) "+25 XP bonus!" else "+${segmentValues[winningIndex]} coins",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                }
            }
        }
    }
}
}

@Composable
fun ScratchCardCanvas(
    rewardText: String = "₹50",
    isScratchable: Boolean = true,
    onRevealed: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val scratchedPoints = remember { mutableStateListOf<Offset>() }
    val isRevealed = scratchedPoints.size > 30

    // Trigger onRevealed exactly once when the threshold is crossed
    LaunchedEffect(isRevealed) {
        if (isRevealed) {
            onRevealed()
        }
    }

    // Reset if it becomes scratchable again
    LaunchedEffect(isScratchable) {
        if (!isScratchable && !isRevealed) {
            // Already claimed or can't scratch
        } else if (isScratchable && isRevealed) {
            // Reset for a new card
            scratchedPoints.clear()
        }
    }

    val haptic = LocalHapticFeedback.current
    LaunchedEffect(isRevealed) { 
        if (isRevealed) haptic.performHapticFeedback(HapticFeedbackType.LongPress) 
    }
    Box(
        modifier = modifier
            .size(200.dp, 100.dp)
            .clip(RoundedCornerShape(12.dp)),
    ) {
        // Reward content underneath
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF059669)),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🎁", fontSize = 28.sp)
                Text(rewardText, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                if (isRevealed) {
                    Text(
                        text = "🎉 Coins Credited to Your Wallet!",
                        color = Color(0xFFFFD700),
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        }
        // Scratchable silver overlay
        if (!isRevealed) {
            Canvas(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)
                    .pointerInput(Unit) {
                        detectDragGestures { change, _ ->
                            scratchedPoints.add(change.position)
                        }
                    },
            ) {
                // Draw silver base
                drawRect(Color(0xFFC0C0C0))
                // Scratch away — clear circles at drag points
                scratchedPoints.forEach { point ->
                    drawCircle(
                        color = Color.Transparent,
                        radius = 28f,
                        center = point,
                        blendMode = BlendMode.Clear,
                    )
                }
            }
            if (scratchedPoints.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    val scratchDark = ColorTokens.isDark
                    Text("✋ Scratch here!", color = if (scratchDark) Color(0xFF94A3B8) else Color(0xFF4B5563), fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
            }
        }
    }
}

// ─── Spin Win Celebration Modal ──────────────────────────────────────────
@Composable
private fun SpinWinCelebrationModal(
    show: Boolean,
    rewardAmount: Int,
    rewardLabel: String,
    onDismiss: () -> Unit,
) {
    if (!show) return
    val isDark = ColorTokens.isDark
    val transition = rememberInfiniteTransition(label = "celebration")
    val scale by transition.animateFloat(0.8f, 1.15f, infiniteRepeatable(tween(600, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "pulse")
    val glowAlpha by transition.animateFloat(0.3f, 0.8f, infiniteRepeatable(tween(1200, easing = LinearEasing), RepeatMode.Reverse), label = "glow")
    
    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
    ) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Box(
                    modifier = Modifier
                        .size(180.dp)
                        .drawBehind {
                            drawCircle(
                                brush = Brush.radialGradient(
                                    listOf(Color(0xFFFFD700).copy(alpha = glowAlpha), Color.Transparent)
                                ),
                                radius = size.minDimension * 0.5f,
                            )
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Text("🎉", fontSize = 64.sp, modifier = Modifier.graphicsLayer(scaleX = scale, scaleY = scale))
                }
                
                Card(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
                    elevation = CardDefaults.cardElevation(8.dp),
                    modifier = Modifier.fillMaxWidth(0.85f),
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text("🎊 Congratulations! 🎊", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(CircleShape)
                                .background(Brush.horizontalGradient(listOf(Color(0xFFFFD700), Color(0xFFFFA500)))),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("💰", fontSize = 36.sp)
                        }
                        Text(
                            text = "You earned $rewardLabel!",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = if (isDark) Color(0xFFFFD700) else Color(0xFFB45309),
                            textAlign = TextAlign.Center,
                        )
                        Text(
                            text = "+$rewardAmount coins added to your balance",
                            style = MaterialTheme.typography.bodyLarge,
                            color = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280),
                            textAlign = TextAlign.Center,
                        )
                        Spacer(Modifier.height(8.dp))
                        Button(
                            onClick = onDismiss,
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Text("Awesome! 🚀", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

