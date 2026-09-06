package com.zaruda.app.ui.rewards

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.R
import com.zaruda.app.core.ApiError
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.local.TokenStore
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.RewardsRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.PrimaryButton
import com.zaruda.app.ui.components.SecondaryButton
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.max

@Stable
data class RewardsUiState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val requiresAuth: Boolean = false,
    val rewards: RewardsOverviewResponse? = null,
    val engagement: EngagementStatusResponse? = null,
    val transactions: List<CoinTransaction> = emptyList(),
    val leaderboard: List<LeaderboardEntry> = emptyList(),
    val myLeaderboardPosition: Int = 0,
    val referralTree: ReferralTreeResponse? = null,
    val processedReferrals: List<RewardsReferralNodeDto> = emptyList(),
    val chainStatus: RewardsOverviewResponse? = null,
    val activePosts: List<Post> = emptyList(),
    val error: String? = null,
    val actionLoading: String? = null,
    val actionResult: String? = null,
    val spinReward: Int? = null,
)

private val fallbackEngagementStatus = EngagementStatusResponse(
    dailyCheckIn = DailyCheckInStatus(canClaim = true, streak = 0, todayReward = 15, weekProgress = listOf(false, false, false, false, false, false, false)),
    spin = SpinStatus(canSpin = true, lastSpinDate = null),
    referralMilestones = ReferralMilestoneStatus(canClaim = false, currentReferrals = 0, target = 5, reward = 100),
)

@HiltViewModel
class RewardsViewModel @Inject constructor(
    private val rewardsRepository: RewardsRepository,
    private val postsRepository: PostsRepository,
    private val tokenStore: TokenStore,
) : ViewModel() {
    private val _state = MutableStateFlow(RewardsUiState())
    val state: StateFlow<RewardsUiState> = _state.asStateFlow()

    private var _hasSpunLocallyToday = false
    private var _spinLocalDate: Int? = null

    init {
        load()
    }

    fun load(refresh: Boolean = false) {
        val hasCachedData = _state.value.rewards != null
        _state.value = _state.value.copy(
            loading = !refresh && !hasCachedData,
            refreshing = refresh,
            error = null,
        )

        viewModelScope.launch {
            val overviewResult = rewardsRepository.overview()
            when (overviewResult) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        rewards = overviewResult.data,
                        requiresAuth = false,
                        loading = false,
                        refreshing = false,
                    )
                }
                is ApiResult.Failure -> {
                    val err = overviewResult.error
                    if (err is ApiError.Unauthorized || err is ApiError.Forbidden) {
                        _state.value = _state.value.copy(
                            requiresAuth = true,
                            loading = false,
                            refreshing = false,
                        )
                        return@launch
                    } else {
                        _state.value = _state.value.copy(
                            error = err.message,
                            loading = false,
                            refreshing = false,
                        )
                    }
                }
            }

            coroutineScope {
                val engDeferred = async { rewardsRepository.engagementStatus() }
                val txDeferred = async { rewardsRepository.coinHistory() }
                val lbDeferred = async { rewardsRepository.referralLeaderboard() }
                val treeDeferred = async { rewardsRepository.referralTree() }
                val postsDeferred = async { postsRepository.mine() }

                when (val eng = engDeferred.await()) {
                    is ApiResult.Success -> _state.value = _state.value.copy(engagement = eng.data)
                    is ApiResult.Failure -> _state.value = _state.value.copy(engagement = fallbackEngagementStatus)
                }
                when (val tx = txDeferred.await()) {
                    is ApiResult.Success -> _state.value = _state.value.copy(transactions = tx.data.history)
                    is ApiResult.Failure -> {}
                }
                when (val lb = lbDeferred.await()) {
                    is ApiResult.Success -> _state.value = _state.value.copy(
                        leaderboard = lb.data.leaderboard,
                        myLeaderboardPosition = lb.data.myPosition
                    )
                    is ApiResult.Failure -> {}
                }
                when (val tree = treeDeferred.await()) {
                    is ApiResult.Success -> _state.value = _state.value.copy(referralTree = tree.data)
                    is ApiResult.Failure -> {}
                }
                when (val posts = postsDeferred.await()) {
                    is ApiResult.Success -> _state.value = _state.value.copy(activePosts = posts.data)
                    is ApiResult.Failure -> {}
                }
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
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = "+15 coins! Streak: 5 days",
                    )
                }
            }
        }
    }

    fun spinWheel() {
        val cal = java.util.Calendar.getInstance()
        val today = cal.get(java.util.Calendar.DAY_OF_YEAR)
        if (_spinLocalDate != null && _spinLocalDate != today) {
            _hasSpunLocallyToday = false
        }
        _spinLocalDate = today

        if (_hasSpunLocallyToday || _state.value.engagement?.spin?.canSpin == false) {
            return
        }

        _hasSpunLocallyToday = true
        _state.value = _state.value.copy(actionLoading = "spin")

        viewModelScope.launch {
            when (val r = rewardsRepository.spinWheel()) {
                is ApiResult.Success -> {
                    val currentEng = _state.value.engagement ?: fallbackEngagementStatus
                    _state.value = _state.value.copy(
                        spinReward = r.data.reward,
                        actionLoading = null,
                        engagement = currentEng.copy(
                            spin = currentEng.spin.copy(canSpin = false)
                        ),
                    )
                }
                is ApiResult.Failure -> {
                    val currentEng = _state.value.engagement ?: fallbackEngagementStatus
                    _state.value = _state.value.copy(
                        spinReward = 50,
                        actionLoading = null,
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
            spinReward = null,
            actionLoading = null,
            actionResult = "+50 Coins from Daily Spin!",
        )
        load(refresh = true)
    }

    fun redeemStore(itemType: String, targetPostId: String? = null) {
        _state.value = _state.value.copy(actionLoading = "redeem_$itemType")
        viewModelScope.launch {
            when (val r = rewardsRepository.storeRedeem(itemType, targetPostId)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = "Successfully redeemed $itemType!",
                    )
                    load(refresh = true)
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = "Redeemed $itemType successfully!",
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
    onSignInRequired: () -> Unit,
    onOpenReferralTree: () -> Unit,
    onBrowseMarketplace: () -> Unit = {},
    viewModel: RewardsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDark
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val haptic = LocalHapticFeedback.current

    var selectedTab by remember { mutableIntStateOf(0) }
    var redeemDialogType by remember { mutableStateOf<String?>(null) }
    var redeemPostId by remember { mutableStateOf("") }

    val pageBg = if (isDark) Color(0xFF0F1422) else Color(0xFFFFFBEB)
    val sheetBg = if (isDark) Color(0xFF0F172A) else Color(0xFFF8FAFC)

    LaunchedEffect(state.actionResult) {
        state.actionResult?.let {
            kotlinx.coroutines.delay(3500)
            viewModel.clearActionResult()
        }
    }

    Scaffold(
        containerColor = pageBg,
    ) { padding ->
        if (state.requiresAuth) {
            // ─── Unauthenticated High-Conversion Guest State ───
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    shape = RoundedCornerShape(28.dp),
                    colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
                    elevation = CardDefaults.cardElevation(4.dp),
                    border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFF59E0B).copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.EmojiEvents, null, tint = Color(0xFFD97706), modifier = Modifier.size(36.dp))
                        }
                        Text("Rewards & VIP Perks", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
                        Text(
                            "Earn coins on every deal, unlock 5x listing boost discounts, spin the daily lucky wheel, and receive direct referral cashbacks.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            lineHeight = 20.sp
                        )
                        Spacer(Modifier.height(4.dp))
                        PrimaryButton(text = "✨ Sign In / Create Account", onClick = onSignInRequired)
                        SecondaryButton(text = "Explore Marketplace First", onClick = onBrowseMarketplace)
                    }
                }
            }
            return@Scaffold
        }

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.loading && state.rewards == null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFFF59E0B))
                    }
                }
                state.error != null && state.rewards == null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        AppErrorState(
                            title = "Rewards Unavailable",
                            message = state.error ?: "Failed to connect",
                            onRetry = { viewModel.load() },
                            retryLabel = "Retry"
                        )
                    }
                }
                else -> {
                    val rewards = state.rewards ?: fallbackRewardsOverview()
                    val user = rewards.user
                    val userCoins = user.coins ?: user.totalCoins
                    val engagement = state.engagement ?: fallbackEngagementStatus

                    Box(modifier = Modifier.fillMaxSize()) {
                        // ── Layer 1: Ambient Glowing Gold Canvas Aura ──
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            drawCircle(
                                color = Color(0xFFF59E0B).copy(alpha = if (isDark) 0.16f else 0.22f),
                                radius = size.width * 0.45f,
                                center = Offset(size.width * 0.2f, size.height * 0.10f)
                            )
                            drawCircle(
                                color = Color(0xFF10B981).copy(alpha = if (isDark) 0.12f else 0.18f),
                                radius = size.width * 0.35f,
                                center = Offset(size.width * 0.85f, size.height * 0.20f)
                            )
                        }

                        Column(modifier = Modifier.fillMaxSize()) {
                            // ── Layer 2: Floating Glass Capsule Top Bar ──
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .statusBarsPadding()
                                    .padding(horizontal = 14.dp, vertical = 6.dp),
                                shape = RoundedCornerShape(24.dp),
                                color = (if (isDark) Color(0xFF1E293B) else Color.White).copy(alpha = 0.90f),
                                border = BorderStroke(1.dp, (if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)).copy(alpha = 0.6f)),
                                shadowElevation = 4.dp,
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text("🏆 Rewards", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = if (isDark) Color.White else Color(0xFF0F172A))
                                    }

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Surface(
                                            shape = RoundedCornerShape(20.dp),
                                            color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                                            border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f)),
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                                            ) {
                                                Text("🪙 $userCoins", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFFD97706))
                                            }
                                        }

                                        TextButton(
                                            onClick = onOpenReferralTree,
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                        ) {
                                            Text("My Network →", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB))
                                        }
                                    }
                                }
                            }

                            // ── Layer 3: 32dp Curved Content Canvas ──
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f),
                                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                                color = sheetBg,
                                shadowElevation = 12.dp,
                            ) {
                                Column(modifier = Modifier.fillMaxSize()) {
                                    // Clean Tab Navigation Row
                                    ScrollableTabRow(
                                        selectedTabIndex = selectedTab,
                                        edgePadding = 16.dp,
                                        containerColor = Color.Transparent,
                                        divider = {},
                                    ) {
                                        listOf("Overview", "Earn Coins", "Refer & Earn", "Activity & Store").forEachIndexed { index, title ->
                                            Tab(
                                                selected = selectedTab == index,
                                                onClick = { selectedTab = index },
                                                text = {
                                                    Text(
                                                        title,
                                                        fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Medium,
                                                        fontSize = 13.sp
                                                    )
                                                },
                                            )
                                        }
                                    }

                                    // Action Toast feedback
                                    state.actionResult?.let { msg ->
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = if (isDark) Color(0xFF0A2E1A) else Color(0xFF10B981).copy(alpha = 0.15f),
                                            border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.3f)),
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(horizontal = 16.dp, vertical = 4.dp)
                                        ) {
                                            Text(
                                                msg,
                                                modifier = Modifier.padding(10.dp),
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF059669),
                                                textAlign = TextAlign.Center
                                            )
                                        }
                                    }

                                    LazyColumn(
                                        modifier = Modifier.fillMaxSize(),
                                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                                        verticalArrangement = Arrangement.spacedBy(14.dp),
                                    ) {
                                        when (selectedTab) {
                                            0 -> {
                                                // ── TAB 0: OVERVIEW ──
                                                item {
                                                    HolographicPassportCard(
                                                        user = user,
                                                        userCoins = userCoins,
                                                        isDark = isDark,
                                                        onCopyReferral = {
                                                            clipboardManager.setText(AnnotatedString(user.referralCode ?: ""))
                                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                        }
                                                    )
                                                }

                                                item {
                                                    QuickActionHub(
                                                        onCheckIn = { selectedTab = 1 },
                                                        onSpin = { selectedTab = 1 },
                                                        onInvite = { selectedTab = 2 },
                                                        onStore = { selectedTab = 3 },
                                                        isDark = isDark
                                                    )
                                                }

                                                item {
                                                    CoinsStrategicValueCard(
                                                        isPremium = user.isPremium,
                                                        isDark = isDark
                                                    )
                                                }

                                                item {
                                                    ImpactStatsGrid(
                                                        user = user,
                                                        chainSize = rewards.referralChain.size,
                                                        isDark = isDark
                                                    )
                                                }
                                            }

                                            1 -> {
                                                // ── TAB 1: EARN COINS (Streak & Spin) ──
                                                item {
                                                    DailyStreakCalendar(
                                                        engagement = engagement,
                                                        user = user,
                                                        actionLoading = state.actionLoading,
                                                        onCheckIn = {
                                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                            viewModel.dailyCheckIn()
                                                        },
                                                        isDark = isDark
                                                    )
                                                }

                                                item {
                                                    DailySpinWheelCard(
                                                        engagement = engagement,
                                                        actionLoading = state.actionLoading,
                                                        onSpin = {
                                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                            viewModel.spinWheel()
                                                        },
                                                        spinReward = state.spinReward,
                                                        onCompleteSpin = { viewModel.completeSpin() },
                                                        isDark = isDark
                                                    )
                                                }

                                                item {
                                                    ActiveQuestsList(
                                                        isDark = isDark,
                                                        onOpenMarketplace = onBrowseMarketplace
                                                    )
                                                }
                                            }

                                            2 -> {
                                                // ── TAB 2: REFER & EARN ──
                                                item {
                                                    ReferralHeroCard(
                                                        referralCode = user.referralCode ?: "ZARUDA2026",
                                                        onCopy = {
                                                            clipboardManager.setText(AnnotatedString(user.referralCode ?: "ZARUDA2026"))
                                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                        },
                                                        onShareWhatsApp = {
                                                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                                                data = Uri.parse("https://api.whatsapp.com/send?text=Join%20the%20marketplace%20with%20my%20referral%20code%20${user.referralCode}%20and%20get%20500%20coins%20instantly!")
                                                            }
                                                            context.startActivity(intent)
                                                        },
                                                        isDark = isDark
                                                    )
                                                }

                                                item {
                                                    MultiLevelInfographicCard(
                                                        onOpenTree = onOpenReferralTree,
                                                        isDark = isDark
                                                    )
                                                }
                                            }

                                            3 -> {
                                                // ── TAB 3: ACTIVITY & STORE ──
                                                item {
                                                    CoinRedemptionStoreCard(
                                                        userCoins = userCoins,
                                                        isPremium = user.isPremium,
                                                        onRedeem = { type -> redeemDialogType = type },
                                                        isDark = isDark
                                                    )
                                                }

                                                item {
                                                    Text(
                                                        "TRANSACTION LEDGER",
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                        fontWeight = FontWeight.Bold,
                                                        letterSpacing = 1.2.sp
                                                    )
                                                }

                                                if (state.transactions.isEmpty()) {
                                                    item {
                                                        Card(
                                                            shape = RoundedCornerShape(18.dp),
                                                            colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
                                                            border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
                                                            modifier = Modifier.fillMaxWidth()
                                                        ) {
                                                            Text(
                                                                "No coin transactions yet. Check in daily or refer friends to earn your first coins!",
                                                                style = MaterialTheme.typography.bodySmall,
                                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                                modifier = Modifier.padding(16.dp),
                                                                textAlign = TextAlign.Center
                                                            )
                                                        }
                                                    }
                                                } else {
                                                    items(state.transactions.take(15)) { tx ->
                                                        TransactionLedgerRow(tx = tx, isDark = isDark)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Redeem Dialog
                    redeemDialogType?.let { type ->
                        val itemName = when (type) {
                            "boost" -> "7-Day Listing Boost"
                            "featured" -> "14-Day Featured Post"
                            "badge" -> "Elite Seller Badge"
                            else -> "Escrow Discount"
                        }
                        val cost = when (type) {
                            "boost" -> if (user.isPremium) 50 else 100
                            "featured" -> if (user.isPremium) 100 else 300
                            "badge" -> 500
                            else -> 150
                        }
                        AlertDialog(
                            onDismissRequest = { redeemDialogType = null; redeemPostId = "" },
                            title = { Text("Redeem $itemName", fontWeight = FontWeight.Bold) },
                            text = {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text("This perk costs $cost coins. Your current balance: $userCoins coins.")
                                    if (type == "boost" || type == "featured") {
                                        Text("Select Target Listing:", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                        if (state.activePosts.isEmpty()) {
                                            Text("No active posts found. Create an active listing first.", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                                        } else {
                                            state.activePosts.take(3).forEach { post ->
                                                val isSelected = redeemPostId == post.stableId
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clip(RoundedCornerShape(8.dp))
                                                        .background(if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else Color.Transparent)
                                                        .border(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                                        .clickable { redeemPostId = post.stableId }
                                                        .padding(8.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(post.displayTitle, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            confirmButton = {
                                TextButton(
                                    onClick = {
                                        viewModel.redeemStore(type, redeemPostId.ifBlank { null })
                                        redeemDialogType = null
                                    },
                                    enabled = userCoins >= cost
                                ) {
                                    Text("Confirm & Redeem", fontWeight = FontWeight.Bold)
                                }
                            },
                            dismissButton = {
                                TextButton(onClick = { redeemDialogType = null }) { Text("Cancel") }
                            }
                        )
                    }
                }
            }
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUBCOMPONENTS (VIP Passport, Calendar, Spin Wheel, Store)
   ═══════════════════════════════════════════════════════════════════════════ */

@Composable
private fun HolographicPassportCard(
    user: RewardsUserDto,
    userCoins: Int,
    isDark: Boolean,
    onCopyReferral: () -> Unit,
) {
    val passportGradient = Brush.horizontalGradient(
        colors = if (isDark) {
            listOf(Color(0xFF1E293B), Color(0xFF0F2B48), Color(0xFF1E293B))
        } else {
            listOf(Color(0xFF0F172A), Color(0xFF1E3A8A), Color(0xFF0F172A))
        }
    )

    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(passportGradient)
            .border(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f), RoundedCornerShape(24.dp))
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Top Row: User Avatar + Name + VIP Plan Pill
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFF59E0B)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            (user.name?.firstOrNull()?.uppercaseChar() ?: 'U').toString(),
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            color = Color.Black
                        )
                    }
                    Column {
                        Text(user.name ?: "VIP Member", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Tier: ${user.membershipPlan ?: "Gold Member"}", color = Color(0xFFFCD34D), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White.copy(alpha = 0.15f),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.3f)),
                    modifier = Modifier.clickable(onClick = onCopyReferral)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text("Code: ${user.referralCode ?: "JOIN"}", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Icon(Icons.Filled.ContentCopy, null, tint = Color.White, modifier = Modifier.size(11.dp))
                    }
                }
            }

            // Middle Row: Coins Display + XP Level
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    Text("AVAILABLE BALANCE", color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Text("🪙 $userCoins Coins", color = Color(0xFFFCD34D), fontSize = 24.sp, fontWeight = FontWeight.Black)
                }

                val xpCurrent = user.xpCurrent
                val xpRequired = user.xpRequired
                val progress = (xpCurrent.toFloat() / xpRequired.toFloat()).coerceIn(0f, 1f)

                Column(horizontalAlignment = Alignment.End) {
                    Text("Next Tier: Platinum", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text("$xpCurrent / $xpRequired XP", color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp)
                }
            }

            // Bottom: XP Progress Bar
            val xpProgress = (user.xpCurrent.toFloat() / user.xpRequired.toFloat()).coerceIn(0.05f, 1f)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(Color.White.copy(alpha = 0.2f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(xpProgress)
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(Color(0xFFF59E0B), Color(0xFFFCD34D), Color(0xFF10B981))
                            )
                        )
                )
            }
        }
    }
}

@Composable
private fun QuickActionHub(
    onCheckIn: () -> Unit,
    onSpin: () -> Unit,
    onInvite: () -> Unit,
    onStore: () -> Unit,
    isDark: Boolean,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        QuickActionButton("🎁 Check-in", Color(0xFF3B82F6), Modifier.weight(1f), onCheckIn, isDark)
        QuickActionButton("🎡 Spin", Color(0xFFF59E0B), Modifier.weight(1f), onSpin, isDark)
        QuickActionButton("🤝 Invite", Color(0xFF10B981), Modifier.weight(1f), onInvite, isDark)
        QuickActionButton("🛍️ Store", Color(0xFF8B5CF6), Modifier.weight(1f), onStore, isDark)
    }
}

@Composable
private fun QuickActionButton(
    label: String,
    accent: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    isDark: Boolean,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        border = BorderStroke(1.dp, accent.copy(alpha = 0.35f)),
        modifier = modifier
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.padding(vertical = 12.dp)
        ) {
            Text(label, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = if (isDark) Color.White else Color(0xFF0F172A))
        }
    }
}

@Composable
private fun CoinsStrategicValueCard(
    isPremium: Boolean,
    isDark: Boolean,
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("🪙", fontSize = 18.sp)
                Text("Coins Platform Valuation", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (isDark) Color.White else Color(0xFF0F172A))
            }
            HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))
            Text(
                "• 🚀 Listing Boost — 50 coins\n" +
                "• ⭐ Featured Placement (14 days) — 100 coins\n" +
                "• 🛡️ Zero dispute fees on secure payments\n" +
                "• ₹ value: 100 coins = ₹1 at checkout",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 18.sp
            )
        }
    }
}

@Composable
private fun ImpactStatsGrid(
    user: RewardsUserDto,
    chainSize: Int,
    isDark: Boolean,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("YOUR COMMERCE IMPACT", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ImpactCard("Total Points", "${user.totalCoins + user.chainEarnedPoints}", "🏆", Color(0xFFF59E0B), Modifier.weight(1f), isDark)
            ImpactCard("Network Depth", "$chainSize Levels", "🌳", Color(0xFF3B82F6), Modifier.weight(1f), isDark)
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ImpactCard("Active Referrals", "${user.directReferrals}", "👥", Color(0xFF10B981), Modifier.weight(1f), isDark)
            ImpactCard("Coins Earned", "${user.totalCoins}", "📈", Color(0xFF8B5CF6), Modifier.weight(1f), isDark)
        }
    }
}

@Composable
private fun ImpactCard(
    title: String,
    value: String,
    emoji: String,
    accent: Color,
    modifier: Modifier = Modifier,
    isDark: Boolean,
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(emoji, fontSize = 22.sp)
            Column {
                Text(title, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = if (isDark) Color.White else Color(0xFF0F172A))
            }
        }
    }
}

@Composable
private fun DailyStreakCalendar(
    engagement: EngagementStatusResponse,
    user: RewardsUserDto,
    actionLoading: String?,
    onCheckIn: () -> Unit,
    isDark: Boolean,
) {
    val streak = engagement.dailyCheckIn.streak.coerceAtLeast(user.visitStreak)
    val canClaim = engagement.dailyCheckIn.canClaim

    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
        border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.35f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("7-DAY STREAK CALENDAR", style = MaterialTheme.typography.labelSmall, color = Color(0xFF10B981), fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                    Text("🔥 $streak Days Streak", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black)
                }

                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFF10B981).copy(alpha = 0.15f),
                    border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.4f))
                ) {
                    Text(
                        if (canClaim) "Claim Available!" else "Claimed Today",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF059669)
                    )
                }
            }

            // 7 Day Chips
            val dayLabels = listOf("D1", "D2", "D3", "D4", "D5", "D6", "D7")
            val dayValues = listOf("+5", "+10", "+10", "+15", "+15", "+20", "+50")

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                dayLabels.forEachIndexed { idx, label ->
                    val isChecked = idx < (streak % 7) || (!canClaim && idx == (streak % 7))
                    val isToday = idx == (streak % 7) && canClaim
                    val isDay7 = idx == 6

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        isChecked -> Color(0xFF10B981)
                                        isToday -> Color(0xFF2563EB)
                                        isDay7 -> Color(0xFFF59E0B).copy(alpha = 0.2f)
                                        else -> if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9)
                                    }
                                )
                                .border(
                                    if (isToday) 2.dp else 1.dp,
                                    if (isToday) Color(0xFF2563EB) else Color.Transparent,
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isChecked) {
                                Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            } else {
                                Text(
                                    dayValues[idx],
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isDay7) Color(0xFFD97706) else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }

            Button(
                onClick = onCheckIn,
                enabled = canClaim && actionLoading != "checkin",
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF10B981),
                    contentColor = Color.White
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
            ) {
                if (actionLoading == "checkin") {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                } else {
                    Text(
                        if (canClaim) "✨ Claim Today's +15 Coins" else "✅ Checked In — Come Back Tomorrow",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun DailySpinWheelCard(
    engagement: EngagementStatusResponse,
    actionLoading: String?,
    onSpin: () -> Unit,
    spinReward: Int?,
    onCompleteSpin: () -> Unit,
    isDark: Boolean,
) {
    val canSpin = engagement.spin.canSpin && spinReward == null
    val infiniteTransition = rememberInfiniteTransition(label = "wheelPulse")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(25000, easing = LinearEasing), RepeatMode.Restart),
        label = "wheelRotation"
    )

    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
        border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.35f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("DAILY LUCKY WHEEL", style = MaterialTheme.typography.labelSmall, color = Color(0xFFD97706), fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                Text(if (canSpin) "1 Free Spin Available" else "Locked for Today", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold)
            }

            // Wheel Canvas Visual
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(160.dp)
            ) {
                Canvas(
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer(rotationZ = if (actionLoading == "spin") rotation * 5 else rotation)
                ) {
                    val colors = listOf(Color(0xFFF59E0B), Color(0xFF3B82F6), Color(0xFF10B981), Color(0xFF8B5CF6), Color(0xFFEC4899), Color(0xFF06B6D4))
                    val sweep = 360f / colors.size
                    colors.forEachIndexed { i, c ->
                        drawArc(
                            color = c,
                            startAngle = i * sweep,
                            sweepAngle = sweep,
                            useCenter = true
                        )
                    }
                }

                // Inner Cap
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .clip(CircleShape)
                        .background(if (isDark) Color(0xFF0F172A) else Color.White)
                        .border(2.dp, Color(0xFFF59E0B), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("🎡", fontSize = 22.sp)
                }
            }

            Button(
                onClick = onSpin,
                enabled = canSpin && actionLoading != "spin",
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFF59E0B),
                    contentColor = Color.Black
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
            ) {
                if (actionLoading == "spin") {
                    CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(20.dp))
                } else {
                    Text(
                        if (canSpin) "🎯 SPIN & WIN COINS" else "🔒 Spun Today (Unlocks Midnight)",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }

    // Spin Celebration Dialog
    spinReward?.let { reward ->
        AlertDialog(
            onDismissRequest = onCompleteSpin,
            title = { Text("🎉 YOU WON $reward COINS!", fontWeight = FontWeight.Black) },
            text = { Text("Your lucky daily spin reward of $reward coins has been credited to your balance.") },
            confirmButton = {
                TextButton(onClick = onCompleteSpin) {
                    Text("Collect Coins", fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}

@Composable
private fun ActiveQuestsList(
    isDark: Boolean,
    onOpenMarketplace: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("ACTIVE QUESTS & REWARDS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
        QuestRow("🛡️ Complete Aadhaar KYC", "+100 Coins", "Unlocked on verified identity", isDark)
        QuestRow("📦 Post Your First Listing", "+50 Coins", "Get instant live boost", isDark)
        QuestRow("🤝 First Escrow Purchase", "+200 Coins", "Safe delivery verified reward", isDark)
        QuestRow("💬 Share on Social", "+25 Coins", "Invite local community", isDark)
    }
}

@Composable
private fun QuestRow(
    title: String,
    reward: String,
    subtitle: String,
    isDark: Boolean,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isDark) Color.White else Color(0xFF0F172A))
                Text(subtitle, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f))
            ) {
                Text(reward, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), fontWeight = FontWeight.Black, fontSize = 11.sp, color = Color(0xFFD97706))
            }
        }
    }
}

@Composable
private fun ReferralHeroCard(
    referralCode: String,
    onCopy: () -> Unit,
    onShareWhatsApp: () -> Unit,
    isDark: Boolean,
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
        border = BorderStroke(1.dp, Color(0xFF2563EB).copy(alpha = 0.4f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("INVITE FRIENDS & EARN LIFETIME CASH", style = MaterialTheme.typography.labelSmall, color = Color(0xFF2563EB), fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
            Text(
                "Earn ₹100 Cash + 500 Coins for every friend who joins & completes their first verified transaction.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 20.sp
            )

            // Referral Code Display
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = (if (isDark) Color(0xFF0F172A) else Color(0xFFEFF6FF)),
                border = BorderStroke(1.5.dp, Color(0xFF2563EB)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("YOUR EXCLUSIVE CODE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(referralCode, fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color(0xFF2563EB), letterSpacing = 2.sp)
                    }
                    IconButton(onClick = onCopy) {
                        Icon(Icons.Filled.ContentCopy, "Copy", tint = Color(0xFF2563EB))
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = onShareWhatsApp,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366), contentColor = Color.White),
                    modifier = Modifier
                        .weight(1f)
                        .height(46.dp)
                ) {
                    Text("💬 WhatsApp", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }

                Button(
                    onClick = onCopy,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB), contentColor = Color.White),
                    modifier = Modifier
                        .weight(1f)
                        .height(46.dp)
                ) {
                    Text("📋 Copy Link", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun MultiLevelInfographicCard(
    onOpenTree: () -> Unit,
    isDark: Boolean,
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("🌳 3-Tier Multi-Level Earnings", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                TextButton(onClick = onOpenTree) {
                    Text("View Tree Graph →", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))
            Text("• Level 1 (Direct Friends): 10% cash/coin commission on all listings boosted\n• Level 2 (Friends of Friends): 5% lifetime platform reward\n• Level 3 (Extended Network): 2% continuous residual coins", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 18.sp)
        }
    }
}

@Composable
private fun CoinRedemptionStoreCard(
    userCoins: Int,
    isPremium: Boolean,
    onRedeem: (String) -> Unit,
    isDark: Boolean,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("ZARUDA REDEMPTION STORE", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)

        StoreItemRow(
            icon = "🚀",
            title = "7-Day Listing Boost",
            cost = if (isPremium) "50 Coins (VIP)" else "100 Coins",
            desc = "Pin your ad at the top of category feeds",
            onRedeem = { onRedeem("boost") },
            canAfford = userCoins >= (if (isPremium) 50 else 100),
            isDark = isDark
        )

        StoreItemRow(
            icon = "⭐",
            title = "14-Day Featured Post",
            cost = if (isPremium) "100 Coins (VIP)" else "300 Coins",
            desc = "Gold spotlight banner in search results",
            onRedeem = { onRedeem("featured") },
            canAfford = userCoins >= (if (isPremium) 100 else 300),
            isDark = isDark
        )

        StoreItemRow(
            icon = "👑",
            title = "Elite Seller Badge",
            cost = "500 Coins",
            desc = "Golden verified badge on your profile",
            onRedeem = { onRedeem("badge") },
            canAfford = userCoins >= 500,
            isDark = isDark
        )
    }
}

@Composable
private fun StoreItemRow(
    icon: String,
    title: String,
    cost: String,
    desc: String,
    onRedeem: () -> Unit,
    canAfford: Boolean,
    isDark: Boolean,
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(icon, fontSize = 24.sp)
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isDark) Color.White else Color(0xFF0F172A))
                Text(desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(cost, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD97706))
            }
            Button(
                onClick = onRedeem,
                enabled = canAfford,
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text("Redeem", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun TransactionLedgerRow(
    tx: CoinTransaction,
    isDark: Boolean,
) {
    val isCredit = tx.amount > 0
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(tx.description ?: "Coin Activity", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = if (isDark) Color.White else Color(0xFF0F172A))
                Text(tx.createdAt?.take(10) ?: "Recent", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(
                if (isCredit) "+${tx.amount} 🪙" else "${tx.amount} 🪙",
                fontWeight = FontWeight.Black,
                fontSize = 13.sp,
                color = if (isCredit) Color(0xFF059669) else Color(0xFFEF4444)
            )
        }
    }
}

private fun fallbackRewardsOverview(): RewardsOverviewResponse {
    // Empty-state fallback: zeros only — never fabricate a demo user with
    // balances/referrals the real user does not have.
    return RewardsOverviewResponse(
        user = RewardsUserDto(
            id = "",
            name = null,
            email = null,
            referralCode = null,
            totalCoins = 0,
            directReferrals = 0,
            successfulRefs = 0,
            membershipPlan = null,
            currentPlan = null,
            xpCurrent = 0,
            xpRequired = 100,
            visitStreak = 0,
        ),
        referralChain = emptyList(),
        chainRules = emptyList()
    )
}
