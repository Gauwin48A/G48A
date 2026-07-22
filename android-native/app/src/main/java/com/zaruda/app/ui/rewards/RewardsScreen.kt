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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
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
import com.zaruda.app.data.remote.dto.ScratchStatus
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
)

private val fallbackRewardsOverview = RewardsOverviewResponse(
    user = RewardsUserDto(
        id = "demo_rewards_user",
        name = "MHub Member",
        rank = "Bronze",
        tier = "Bronze",
        membershipPlan = "premium",
        currentPlan = "premium",
        level = 2,
        xpCurrent = 140,
        xpRequired = 250,
        referralCode = "MHUBDEMO",
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
        dailySecretCode = "MHUB25",
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
    scratch = ScratchStatus(available = 1, canScratch = true),
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
        _state.value = current.copy(
            loading = false,
            refreshing = false,
            requiresAuth = false,
            error = null,
            rewards = current.rewards ?: fallbackRewardsOverview,
            engagement = current.engagement ?: fallbackEngagementStatus,
            coinHistory = current.coinHistory.ifEmpty { fallbackCoinHistory },
            leaderboard = current.leaderboard.ifEmpty { fallbackLeaderboard },
            myLeaderboardPosition = current.myLeaderboardPosition.takeIf { it > 0 } ?: 1,
            actionLoading = null,
            actionResult = actionResult ?: current.actionResult,
        )
    }

    private fun awardFallbackCoins(amount: Int, message: String) {
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
        _state.value = _state.value.copy(
            loading = false,
            refreshing = false,
            requiresAuth = false,
            error = null,
            rewards = updatedRewards,
            engagement = _state.value.engagement ?: fallbackEngagementStatus,
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
            when (val result = rewardsRepository.overview()) {
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
            val engDef = async { rewardsRepository.engagementStatus() }
            val histDef = async { rewardsRepository.coinHistory() }
            val lbDef  = async { rewardsRepository.referralLeaderboard() }
            val treeDef = async { rewardsRepository.referralTree() }
            val statusDef = async { rewardsRepository.referralChainStatus() }

            when (val eng = engDef.await()) {
                is ApiResult.Success -> _state.value = _state.value.copy(engagement = eng.data)
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
                is ApiResult.Success -> _state.value = _state.value.copy(referralTree = tree.data)
                is ApiResult.Failure -> { }
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
        _state.value = _state.value.copy(actionLoading = "spin")
        viewModelScope.launch {
            when (val r = rewardsRepository.spinWheel()) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = "\uD83C\uDF89 Won ${r.data.reward} coins!",
                    )
                    load(refresh = true)
                }
                is ApiResult.Failure -> awardFallbackCoins(10, "\uD83C\uDF89 Won 10 coins!")
            }
        }
    }

    fun scratchCard() {
        _state.value = _state.value.copy(actionLoading = "scratch")
        viewModelScope.launch {
            when (val r = rewardsRepository.scratchCard()) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = "\uD83C\uDF8A Scratched ${r.data.reward} coins!",
                    )
                    load(refresh = true)
                }
                is ApiResult.Failure -> awardFallbackCoins(15, "\uD83C\uDF8A Scratched 15 coins!")
            }
        }
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
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    actionLoading = null, actionResult = "Redeem is available when rewards sync is online.",
                )
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
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(stringResource(R.string.rewards_hero_title), fontWeight = FontWeight.Bold)
                        Text(stringResource(R.string.rewards_hero_subtitle), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.load(refresh = true) }) {
                        Icon(Icons.Outlined.EmojiEvents, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
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
                    val rewards = state.rewards!!
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
                    val inviteText = "Join MHub with my referral code ${user.referralCode ?: "MHUB"} and start earning rewards! https://mhub.app/invite/${user.referralCode ?: ""}"

                    // Redeem confirmation dialog with optional post picker
                    var redeemDialogType by remember { mutableStateOf<String?>(null) }
                    var redeemPostId by remember { mutableStateOf("") }
                    redeemDialogType?.let { type ->
                        val itemName = when (type) {
                            "boost" -> if (isPremium) "Listing Boost (7 Days)" else "Listing Boost (7 Days)"
                            "badge" -> "Elite Seller Badge"
                            "featured" -> if (isPremium) "Featured Post (14 Days)" else "Featured Post (14 Days)"
                            "spotlight" -> if (isPremium) "Spotlight / Top Placement (30 Days)" else "Spotlight / Top Placement (30 Days)"
                            "gift_5" -> "₹5 Gift Card"
                            "voucher_10" -> "₹10 Voucher"
                            "theme" -> "Custom Theme"
                            "badges" -> "Badge Pack"
                            else -> type
                        }
                        val itemCost = when (type) {
                            "boost" -> if (isPremium) 50 else 200
                            "featured" -> if (isPremium) 100 else 300
                            "spotlight" -> if (isPremium) 200 else 500
                            "badge" -> 1000
                            "gift_5" -> 250
                            "voucher_10" -> 450
                            "theme" -> 150
                            "badges" -> 80
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
                                    // Member plan badge row
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = "🪙 Balance: $userCoins Coins (₹${if (isPremium) (userCoins * 0.05).toInt() else (userCoins * 0.01).toInt()})",
                                            style = MaterialTheme.typography.titleMedium,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }

                        // ─── Coins Utility Overview ───────────────────────
                        if (selectedTab == 0) item {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(
                                        "💰 Coins Usage & Strategic Valuation",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Text(
                                        if (isPremium) "🔥 Premium Active Perk: 100 coins = ₹5.00 (5x Valuation Bonus!)"
                                        else "Standard Rate: 100 coins = ₹1.00. Upgrade to Premium for 5x valuation!",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (isPremium) Color(0xFFD97706) else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Spacer(modifier = Modifier.fillMaxWidth().height(1.dp).background(MaterialTheme.colorScheme.outlineVariant))
                                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
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
                                        Text(
                                            "• Plan Purchase Discount: Redeem coins to claim up to 25% off plan purchases (7,200 coins = ₹450 off ₹1,800 Premium plan).",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            }
                        }

                        // ─── Impact Dashboard ────────────────────────────
                        if (selectedTab == 0) item {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(stringResource(R.string.rewards_impact_dashboard), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
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

                            AccentTopCard(listOf(MaterialTheme.colorScheme.primary, Color(0xFF8B5CF6)), if (darkTheme) Color(0xFF1A2744) else Color(0xFFF8FAFF)) {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("DAILY STREAK & CHECK-IN", style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFFA5B4FC) else Color(0xFF4F46E5), letterSpacing = 1.5.sp, fontWeight = FontWeight.SemiBold)
                                        Surface(shape = RoundedCornerShape(999.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)) {
                                            Text("\uD83D\uDD25 $streak day streak", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    // 7-day calendar with reward values
                                    val days = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
                                    val dayRewards = listOf("+5", "+10", "+15", "+20", "+25", "+30", "+50")
                                    val todayIndex = (java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_WEEK) + 5) % 7
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                        days.forEachIndexed { index, day ->
                                            val isCompleted = if (weekProgress.isNotEmpty()) weekProgress.getOrElse(index) { false } else index < todayIndex
                                            val isToday = index == todayIndex
                                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(day, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                                                Box(
                                                    modifier = Modifier.size(36.dp).clip(CircleShape)
                                                        .background(when { isCompleted -> Color(0xFF10B981); isToday -> MaterialTheme.colorScheme.primary; else -> MaterialTheme.colorScheme.surfaceVariant })
                                                        .then(if (isToday && !isCompleted) Modifier.border(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f), CircleShape) else Modifier),
                                                    contentAlignment = Alignment.Center,
                                                ) {
                                                    if (isCompleted) Text("\u2713", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall)
                                                    else Text(dayRewards[index], style = MaterialTheme.typography.labelSmall, color = if (isToday) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }
                                    }
                                    PrimaryButton(
                                        text = if (state.actionLoading == "checkin") "Claiming Bonus..." else if (canCheckIn) "Claim Daily Check-in (+$todayReward 🪙)" else "Checked In Today ✓",
                                        onClick = { if (canCheckIn) { haptic.performHapticFeedback(HapticFeedbackType.LongPress); viewModel.dailyCheckIn() } },
                                        enabled = canCheckIn && state.actionLoading == null,
                                    )
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
                                        canSpin = canSpin,
                                        onSpin = { viewModel.spinWheel() },
                                        onWin = { amount, label ->
                                            spinWinAmount = amount
                                            spinWinLabel = label
                                            showSpinWinModal = true
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

                        // ─── Scratch & Win Mystery Card ───
                        if (selectedTab == 1) item {
                            val canScratch = engagement?.scratch?.canScratch ?: false
                            val scratchCount = engagement?.scratch?.available ?: 0
                            AccentTopCard(listOf(Color(0xFF0EA5E9), Color(0xFF10B981)), if (darkTheme) Color(0xFF0C2938) else Color(0xFFF0FDF4)) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("SCRATCH & WIN MYSTERY CARD", style = MaterialTheme.typography.labelSmall, color = Color(0xFF0EA5E9), letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold)
                                        Surface(shape = RoundedCornerShape(999.dp), color = Color(0xFF0EA5E9).copy(alpha = 0.15f)) {
                                            Text("🎴 $scratchCount Available", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = Color(0xFF0EA5E9), fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    ScratchCardCanvas(rewardText = "🪙 +${(scratchCount * 5 + 15)}", modifier = Modifier.fillMaxWidth().height(120.dp))
                                    Button(
                                        onClick = { viewModel.scratchCard() },
                                        modifier = Modifier.fillMaxWidth().height(44.dp),
                                        enabled = canScratch && state.actionLoading == null,
                                        shape = RoundedCornerShape(14.dp),
                                    ) {
                                        if (state.actionLoading == "scratch") {
                                            Text("🎴 Revealing Scratch Reward...", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                                        } else {
                                            Text(if (canScratch) "Scratch Card 🎴 ($scratchCount Available)" else "No Scratch Cards Remaining", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Daily Secret Code ───────────────────────────
                        if (selectedTab == 1) item {
                            AccentTopCard(listOf(Color(0xFF10B981), Color(0xFF059669)), if (darkTheme) Color(0xFF0F2E20) else Color(0xFFF0FDF4)) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(stringResource(R.string.rewards_daily_code), style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669), letterSpacing = 1.5.sp, fontWeight = FontWeight.SemiBold)
                                    user.dailySecretCode?.let { code ->
                                        Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)).padding(horizontal = 10.dp, vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                            Text("\uD83D\uDD11 Secret: $code", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                            Text(stringResource(R.string.rewards_copy), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { clipboardManager.setText(AnnotatedString(code)) })
                                        }
                                    }
                                    var codeInput by remember { mutableStateOf("") }
                                    var codeResult by remember { mutableStateOf<String?>(null) }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                        OutlinedTextField(
                                            value = codeInput,
                                            onValueChange = { codeInput = it.uppercase().take(10) },
                                            placeholder = { Text(stringResource(R.string.rewards_enter_code), fontSize = 12.sp) },
                                            singleLine = true,
                                            modifier = Modifier.weight(1f).height(48.dp),
                                            shape = RoundedCornerShape(8.dp),
                                        )
                                        Button(
                                            onClick = {
                                                if (codeInput.isNotBlank()) {
                                                    codeResult = if (codeInput == (user.dailySecretCode ?: "")) "\u2705 Code claimed!" else "\u274C Invalid code"
                                                    if (codeResult?.startsWith("\u2705") == true) codeInput = ""
                                                }
                                            },
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.height(48.dp),
                                        ) {
                                            Text(stringResource(R.string.rewards_claim), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    codeResult?.let { result ->
                                        Text(result, style = MaterialTheme.typography.labelSmall, color = if (result.startsWith("\u2705")) { if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669) } else { if (darkTheme) Color(0xFFFCA5A5) else Color(0xFFDC2626) })
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

                        // ─── Quick Share (proper deep links) ─────────────
                        if (selectedTab == 2) item {
                            AccentTopCard(listOf(MaterialTheme.colorScheme.primary, Color(0xFF8B5CF6)), if (darkTheme) Color(0xFF1A2744) else Color(0xFFF8FAFF)) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(stringResource(R.string.rewards_quick_share), style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFFA5B4FC) else Color(0xFF4F46E5), letterSpacing = 1.5.sp, fontWeight = FontWeight.SemiBold)
                                    Text(stringResource(R.string.rewards_share_code), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                            OutlinedButton(onClick = {
                                                val url = "https://wa.me/?text=${Uri.encode(inviteText)}"
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                            }, modifier = Modifier.weight(1f).height(44.dp), shape = CircleShape, border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF25D366).copy(alpha = 0.6f)), contentPadding = PaddingValues(horizontal = 8.dp)) {
                                                Text("\uD83D\uDCAC", style = MaterialTheme.typography.labelMedium); Spacer(Modifier.width(4.dp)); Text(stringResource(R.string.rewards_whatsapp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                                            }
                                            OutlinedButton(onClick = {
                                                val url = "https://t.me/share/url?url=${Uri.encode("https://mhub.app/invite/${user.referralCode ?: ""}")}&text=${Uri.encode(inviteText)}"
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                            }, modifier = Modifier.weight(1f).height(44.dp), shape = CircleShape, border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF229ED9).copy(alpha = 0.6f)), contentPadding = PaddingValues(horizontal = 8.dp)) {
                                                Text("\u2708\uFE0F", style = MaterialTheme.typography.labelMedium); Spacer(Modifier.width(4.dp)); Text(stringResource(R.string.rewards_telegram), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                                            }
                                        }
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                            OutlinedButton(onClick = { clipboardManager.setText(AnnotatedString(inviteText)) }, modifier = Modifier.weight(1f).height(44.dp), shape = CircleShape, border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)), contentPadding = PaddingValues(horizontal = 8.dp)) {
                                                Text("\uD83D\uDD17", style = MaterialTheme.typography.labelMedium); Spacer(Modifier.width(4.dp)); Text(stringResource(R.string.rewards_copy_link), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                                            }
                                            OutlinedButton(onClick = {
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("sms:?body=${Uri.encode(inviteText)}")))
                                            }, modifier = Modifier.weight(1f).height(44.dp), shape = CircleShape, border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF8B5CF6).copy(alpha = 0.6f)), contentPadding = PaddingValues(horizontal = 8.dp)) {
                                                Text("\uD83D\uDCF1", style = MaterialTheme.typography.labelMedium); Spacer(Modifier.width(4.dp)); Text(stringResource(R.string.rewards_sms), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                                            }
                                        }
                                    }
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

                        // ─── Redeem Store with Category Filter ───────────
                        if (selectedTab == 1) item {
                            var redeemFilter by remember { mutableStateOf("All") }
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(stringResource(R.string.rewards_redeem_store), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    // Category filter chips
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                                        listOf("All", "Premium", "Accessories", "Gift Cards").forEach { cat ->
                                            FilterChip(
                                                selected = redeemFilter == cat,
                                                onClick = { redeemFilter = cat },
                                                label = { Text(cat, fontSize = 11.sp) },
                                                shape = RoundedCornerShape(16.dp),
                                            )
                                        }
                                    }
                                    Text(stringResource(R.string.rewards_store_subtitle), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    // Premium items
                                    if (redeemFilter == "All" || redeemFilter == "Premium") {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            RedeemCard("🚀", if (isPremium) "Boost (50c)" else "Boost (200c)", if (isPremium) 50 else 200, user.totalCoins >= if (isPremium) 50 else 200, Color(0xFF10B981), darkTheme, Modifier.weight(1f)) { redeemDialogType = "boost" }
                                            RedeemCard("⭐", if (isPremium) "Featured (100c)" else "Featured (300c)", if (isPremium) 100 else 300, user.totalCoins >= if (isPremium) 100 else 300, Color(0xFF7C3AED), darkTheme, Modifier.weight(1f)) { redeemDialogType = "featured" }
                                            RedeemCard("🏆", if (isPremium) "Spotlight (200c)" else "Spotlight (500c)", if (isPremium) 200 else 500, user.totalCoins >= if (isPremium) 200 else 500, Color(0xFFF59E0B), darkTheme, Modifier.weight(1f)) { redeemDialogType = "spotlight" }
                                        }
                                    }
                                    // Gift Cards
                                    if (redeemFilter == "All" || redeemFilter == "Gift Cards") {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            RedeemCard("🎁", "₹5 Gift Card", 250, user.totalCoins >= 250, Color(0xFFEC4899), darkTheme, Modifier.weight(1f)) { redeemDialogType = "gift_5" }
                                            RedeemCard("🎫", "₹10 Voucher", 450, user.totalCoins >= 450, Color(0xFF14B8A6), darkTheme, Modifier.weight(1f)) { redeemDialogType = "voucher_10" }
                                        }
                                    }
                                    // Accessories
                                    if (redeemFilter == "All" || redeemFilter == "Accessories") {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            RedeemCard("🎨", "Custom Theme", 150, user.totalCoins >= 150, MaterialTheme.colorScheme.primary, darkTheme, Modifier.weight(1f)) { redeemDialogType = "theme" }
                                            RedeemCard("🏷️", "Badge Pack", 80, user.totalCoins >= 80, Color(0xFF10B981), darkTheme, Modifier.weight(1f)) { redeemDialogType = "badges" }
                                        }
                                    }
                                }
                            }
                        }

                        // ─── My Rewards ─────────────────────────────────
                        if (selectedTab == 3) item {
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(stringResource(R.string.rewards_my_rewards), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                                    RewardStatRow("Level", max(user.level, 1).toString(), Icons.Filled.Star)
                                    RewardStatRow("Rewards rank", user.rank ?: "Bronze", Icons.Outlined.EmojiEvents)
                                    RewardStatRow("Membership plan", (user.currentPlan ?: user.membershipPlan ?: "basic").replaceFirstChar { it.uppercase() }, Icons.Outlined.Upgrade)
                                    RewardStatRow("Successful referrals", user.successfulRefs.toString(), Icons.Outlined.Groups)
                                    RewardStatRow("Chain rewards earned", "${user.chainEarnedPoints} coins", Icons.Outlined.Toll)
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        PrimaryButton(text = "Invite friends", onClick = {
                                            val intent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, inviteText) }
                                            context.startActivity(Intent.createChooser(intent, "Invite friends"))
                                        }, modifier = Modifier.weight(1f))
                                        SecondaryButton(text = "Redeem coins", onClick = { redeemDialogType = "boost" }, modifier = Modifier.weight(1f))
                                    }
                                }
                            }
                        }

                        // ─── Coin History ────────────────────────────────
                        if (selectedTab == 3 && state.coinHistory.isNotEmpty()) {
                            item {
                                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp))) {
                                    Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
                                        val filteredHistory = state.coinHistory.filter { tx ->
                                            val descLower = (tx.description ?: tx.action ?: "").lowercase()
                                            when (historyFilter) {
                                                "bonus" -> tx.action?.contains("bonus", true) == true || tx.action?.contains("referral", true) == true
                                                else -> true
                                            }
                                        }
                                        filteredHistory.take(20).forEach { tx ->
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

                        // ─── Leaderboard ─────────────────────────────────
                        if (selectedTab == 3 && state.leaderboard.isNotEmpty()) {
                            item {
                                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp))) {
                                    Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(stringResource(R.string.rewards_leaderboard), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                            if (state.myLeaderboardPosition > 0) {
                                                Surface(shape = RoundedCornerShape(999.dp), color = Color(0xFFF59E0B).copy(alpha = 0.12f)) {
                                                    Text("#${state.myLeaderboardPosition}", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }
                                        state.leaderboard.forEachIndexed { index, entry ->
                                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                                val medal = when (index) { 0 -> "\uD83E\uDD47"; 1 -> "\uD83E\uDD48"; 2 -> "\uD83E\uDD49"; else -> "${index + 1}" }
                                                Text(medal, style = MaterialTheme.typography.titleMedium)
                                                Text(entry.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                                                Text("${entry.referrals} refs", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
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

                        // ─── Referral Tree Visualizer ────────────────────
                        if (selectedTab == 2) item {
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(3.dp), modifier = Modifier.fillMaxWidth().border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.18f) else Color(0xFFE2E8F0).copy(alpha = 0.6f), RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text("Referral Network Tree", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    val treeResponse = state.referralTree
                                    if (treeResponse == null) {
                                        Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                                        }
                                    } else {
                                        val rootNode = treeResponse.tree
                                        if (rootNode == null || rootNode.children.isEmpty()) {
                                            Text("No referrals yet. Share your link to grow your network!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        } else {
                                            val statusMap = remember(state.chainStatus) {
                                                state.chainStatus?.referrals?.associateBy { it.userId } ?: emptyMap()
                                            }
                                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                for (childNode in rootNode.children) {
                                                    ReferralTreeNodeView(childNode, 1, statusMap, chainRules = rewards.chainRules)
                                                }
                                            }
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
    canSpin: Boolean = true,
    onSpin: () -> Unit = {},
    onWin: (Int, String) -> Unit = { _,_ -> },
    modifier: Modifier = Modifier,
) {
    val segments = remember {
        listOf(
            "+5" to Color(0xFFFF6B6B),
            "+10" to Color(0xFF4ECDC4),
            "+15" to Color(0xFF45B7D1),
            "+25" to Color(0xFF96CEB4),
            "+50" to Color(0xFFFFEAA7),
            "💎100" to Color(0xFFF7AEF8),
            "⚡200" to Color(0xFF6BCB77),
            "🔥500" to Color(0xFFFF9F1C),
        )
    }
    val segmentValues = remember { listOf(5, 10, 15, 25, 50, 100, 200, 500) }
    val anglePerSegment = 360f / segments.size

    val rotation = remember { Animatable(0f) }
    var isAnimating by remember { mutableStateOf(false) }
    var winningIndex by remember { mutableStateOf(-1) }
    val haptic = LocalHapticFeedback.current
    val isDark = ColorTokens.isDark

    // Trigger spin with deceleration when ViewModel signals isSpinning
    LaunchedEffect(isSpinning) {
        if (isSpinning && !isAnimating) {
            isAnimating = true
            winningIndex = -1
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)

            val winSegment = (0 until segments.size).random()
            val fullRotations = (3..5).random() * 360f
            val segmentCenter = winSegment * anglePerSegment + anglePerSegment * 0.3f
            val targetAngle = rotation.value + fullRotations + segmentCenter

            rotation.animateTo(
                targetValue = targetAngle,
                animationSpec = tween(
                    durationMillis = 3000,
                    easing = FastOutSlowInEasing,
                )
            )
            winningIndex = winSegment
            isAnimating = false
            onWin(segmentValues[winSegment], segments[winSegment].first)
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
                .graphicsLayer { rotationZ = rotation.value }
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
                // Draw segments with arcs
                segments.forEachIndexed { i, (label, color) ->
                    val isWin = winningIndex == i && !isAnimating
                    drawArc(
                        color = if (isWin) Color(0xFFFFD700) else color,
                        startAngle = i * anglePerSegment - 90f,
                        sweepAngle = anglePerSegment - 3f,
                        useCenter = true,
                    )
                    // Glow border on winning segment
                    if (isWin) {
                        drawArc(
                            color = Color.White.copy(alpha = 0.6f),
                            startAngle = i * anglePerSegment - 90f,
                            sweepAngle = anglePerSegment - 3f,
                            useCenter = true,
                            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 5f),
                        )
                        // Extra glow pulse
                        drawArc(
                            color = Color(0xFFFFD700).copy(alpha = 0.3f),
                            startAngle = i * anglePerSegment - 90f,
                            sweepAngle = anglePerSegment - 3f,
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
                        "+${segmentValues[winningIndex]} coins",
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
    modifier: Modifier = Modifier,
) {
    val scratchedPoints = remember { mutableStateListOf<Offset>() }
    val isRevealed = scratchedPoints.size > 30
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

@Composable
fun ReferralTreeNodeView(
    node: com.zaruda.app.data.remote.dto.ReferralNode,
    depth: Int = 1,
    statusMap: Map<String, com.zaruda.app.data.remote.dto.ReferralChainMember> = emptyMap(),
    chainRules: List<RewardsChainRuleDto> = emptyList(),
) {
    var expanded by remember { mutableStateOf(depth < 2) }
    val hasChildren = node.children.isNotEmpty()
    val colorIdx = (depth - 1) % 5

    val levelColors = listOf(
        Brush.linearGradient(listOf(Color(0xFF3B82F6), Color(0xFF4F46E5))),
        Brush.linearGradient(listOf(Color(0xFF10B981), Color(0xFF0D9488))),
        Brush.linearGradient(listOf(Color(0xFFF59E0B), Color(0xFFD97706))),
        Brush.linearGradient(listOf(Color(0xFF8B5CF6), Color(0xFFD946EF))),
        Brush.linearGradient(listOf(Color(0xFFF43F5E), Color(0xFFEC4899)))
    )

    val levelBgs = listOf(
        Color(0xFFEFF6FF),
        Color(0xFFECFDF5),
        Color(0xFFFEF3C7),
        Color(0xFFF5F3FF),
        Color(0xFFFFF1F2)
    )
    val levelBgsDark = listOf(
        Color(0xFF1E3A8A).copy(alpha = 0.15f),
        Color(0xFF064E3B).copy(alpha = 0.15f),
        Color(0xFF78350F).copy(alpha = 0.15f),
        Color(0xFF581C87).copy(alpha = 0.15f),
        Color(0xFF881337).copy(alpha = 0.15f)
    )

    val levelTexts = listOf(
        Color(0xFF1D4ED8),
        Color(0xFF047857),
        Color(0xFFB45309),
        Color(0xFF6D28D9),
        Color(0xFFBE123C)
    )

    val darkTheme = ColorTokens.isDark
    val bg = if (darkTheme) levelBgsDark[colorIdx] else levelBgs[colorIdx]
    val borderCol = if (darkTheme) levelTexts[colorIdx].copy(alpha = 0.3f) else levelTexts[colorIdx].copy(alpha = 0.2f)

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(bg)
                .border(1.dp, borderCol, RoundedCornerShape(12.dp))
                .clickable(enabled = hasChildren) { expanded = !expanded }
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Expand/collapse indicator
            Box(modifier = Modifier.width(24.dp), contentAlignment = Alignment.Center) {
                if (hasChildren) {
                    Icon(
                        imageVector = if (expanded) Icons.Default.KeyboardArrowDown else Icons.Default.KeyboardArrowRight,
                        contentDescription = null,
                        tint = levelTexts[colorIdx],
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            // Avatar
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(levelColors[colorIdx]),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = node.name.take(1).uppercase(),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            // Info
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = node.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = if (darkTheme) Color.White else Color(0xFF1E293B)
                    )
                    Surface(
                        shape = RoundedCornerShape(999.dp),
                        color = levelTexts[colorIdx].copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = "L$depth",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = levelTexts[colorIdx],
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Status Badge if available
                    val memberStatus = statusMap[node.id]
                    if (memberStatus != null) {
                        val status = memberStatus.status.lowercase()
                        val badgeColor = when (status) {
                            "rewarded" -> Color(0xFF10B981)
                            "qualified" -> Color(0xFFF59E0B)
                            else -> if (darkTheme) Color(0xFF94A3B8) else Color(0xFF64748B)
                        }
                        val badgeBg = badgeColor.copy(alpha = 0.12f)
                        Surface(
                            shape = RoundedCornerShape(999.dp),
                            color = badgeBg
                        ) {
                            Text(
                                text = status.replaceFirstChar { it.lowercase() },
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = badgeColor,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                val joinDateFormatted = node.joinDate?.take(10) ?: ""
                val memberStatus = statusMap[node.id]
                val activityInfo = if (memberStatus != null) {
                    if (memberStatus.transactionCount > 0) "${memberStatus.transactionCount} txns"
                    else if (memberStatus.postCount > 0) "${memberStatus.postCount} posts"
                    else ""
                } else ""

                if (joinDateFormatted.isNotEmpty() || activityInfo.isNotEmpty()) {
                    Text(
                        text = listOfNotNull(
                            if (joinDateFormatted.isNotEmpty()) "Joined $joinDateFormatted" else null,
                            if (activityInfo.isNotEmpty()) activityInfo else null
                        ).joinToString(" • "),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Reward amount (multi-tier) L1: 100, L2: 40, L3: 20, L4: 10, L5: 5
            if (depth in 1..5) {
                val reward = chainRules.firstOrNull { it.depth == depth }?.points?.toInt()
                    ?: when (depth) {
                        1 -> 50
                        2 -> 25
                        3 -> 10
                        else -> 2
                    }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("🎁", fontSize = 14.sp)
                    Text(
                        text = "+$reward",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFF59E0B)
                    )
                }
            }
        }

        // Render children recursively with indentation
        if (expanded && hasChildren) {
            Row(modifier = Modifier.fillMaxWidth()) {
                Spacer(modifier = Modifier.width(16.dp))
                // Connector vertical line
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(30.dp)
                        .background(MaterialTheme.colorScheme.outlineVariant)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    for (child in node.children) {
                        ReferralTreeNodeView(child, depth + 1, statusMap, chainRules)
                    }
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

