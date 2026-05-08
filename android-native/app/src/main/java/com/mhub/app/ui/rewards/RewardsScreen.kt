package com.mhub.app.ui.rewards

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Toll
import androidx.compose.material.icons.outlined.Upgrade
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiError
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.CoinTransaction
import com.mhub.app.data.remote.dto.EngagementStatusResponse
import com.mhub.app.data.remote.dto.LeaderboardEntry
import com.mhub.app.data.remote.dto.RewardsOverviewResponse
import com.mhub.app.data.repository.RewardsRepository
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.PrimaryButton
import com.mhub.app.ui.components.SecondaryButton
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.max

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
)

@HiltViewModel
class RewardsViewModel @Inject constructor(
    private val rewardsRepository: RewardsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(RewardsUiState())
    val state: StateFlow<RewardsUiState> = _state.asStateFlow()

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
            when (val result = rewardsRepository.overview()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false, refreshing = false, rewards = result.data,
                )
                is ApiResult.Failure -> {
                    if (result.error is ApiError.Unauthorized) {
                        _state.value = RewardsUiState(requiresAuth = true)
                    } else {
                        _state.value = _state.value.copy(
                            loading = false, refreshing = false, error = result.error.message,
                        )
                    }
                }
            }
            // Load engagement status
            when (val eng = rewardsRepository.engagementStatus()) {
                is ApiResult.Success -> _state.value = _state.value.copy(engagement = eng.data)
                is ApiResult.Failure -> {}
            }
            // Load coin history
            when (val hist = rewardsRepository.coinHistory()) {
                is ApiResult.Success -> _state.value = _state.value.copy(coinHistory = hist.data.history)
                is ApiResult.Failure -> {}
            }
            // Load leaderboard
            when (val lb = rewardsRepository.referralLeaderboard()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    leaderboard = lb.data.leaderboard,
                    myLeaderboardPosition = lb.data.myPosition,
                )
                is ApiResult.Failure -> {}
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
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    actionLoading = null, actionResult = r.error.message,
                )
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
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    actionLoading = null, actionResult = r.error.message,
                )
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
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    actionLoading = null, actionResult = r.error.message,
                )
            }
        }
    }

    fun redeemStore(type: String) {
        _state.value = _state.value.copy(actionLoading = "redeem")
        viewModelScope.launch {
            when (val r = rewardsRepository.storeRedeem(type)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        actionLoading = null,
                        actionResult = r.data.message ?: "Redeemed successfully!",
                    )
                    load(refresh = true)
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    actionLoading = null, actionResult = r.error.message,
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
    val darkTheme = isSystemInDarkTheme()

    LaunchedEffect(isAuthenticated) {
        if (!isAuthenticated) viewModel.showAuthGate() else viewModel.load()
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
                        Text("Rewards & Referrals", fontWeight = FontWeight.Bold)
                        Text("Track coins, tiers and invite progress", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                        Text("Sign in to view Rewards", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text("Earn coins, unlock perks and track referral progress.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                        Spacer(Modifier.height(4.dp))
                        PrimaryButton(text = "Sign in", onClick = onSignInRequired)
                        SecondaryButton(text = "Browse marketplace", onClick = onBrowseMarketplace)
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
                    val engagement = state.engagement
                    val referralTarget = engagement?.referralMilestones?.target ?: 3
                    val referralReward = engagement?.referralMilestones?.reward ?: 50
                    val directReferrals = user.directReferrals
                    val referralProgress = (directReferrals.toFloat() / referralTarget).coerceIn(0f, 1f)
                    val xpProgress = if (user.xpRequired <= 0) 0f else user.xpCurrent.toFloat() / user.xpRequired.toFloat()
                    val xpRemaining = max(0, user.xpRequired - user.xpCurrent)
                    val inviteText = "Join MHub with my referral code ${user.referralCode ?: "MHUB"} and start earning rewards! https://mhub.app/invite/${user.referralCode ?: ""}"

                    // Redeem confirmation dialog
                    var redeemDialogType by remember { mutableStateOf<String?>(null) }
                    redeemDialogType?.let { type ->
                        val itemName = when (type) { "boost" -> "Listing Boost (24h)"; "badge" -> "Featured Badge"; else -> "Top Placement (7d)" }
                        val itemCost = when (type) { "boost" -> 100; "badge" -> 200; else -> 500 }
                        AlertDialog(
                            onDismissRequest = { redeemDialogType = null },
                            title = { Text("Redeem $itemName") },
                            text = { Text("Spend $itemCost coins on $itemName?\n\nYour balance: ${user.totalCoins} coins") },
                            confirmButton = { TextButton(onClick = { viewModel.redeemStore(type); redeemDialogType = null }, enabled = state.actionLoading == null) { Text("Redeem") } },
                            dismissButton = { TextButton(onClick = { redeemDialogType = null }) { Text("Cancel") } },
                        )
                    }

                    var selectedTab by remember { mutableStateOf(0) }
                    Column(modifier = Modifier.fillMaxSize()) {
                    ScrollableTabRow(
                        selectedTabIndex = selectedTab,
                        edgePadding = 12.dp,
                        containerColor = MaterialTheme.colorScheme.surface,
                        divider = {},
                    ) {
                        listOf("Dashboard", "Earn", "Referrals", "Activity").forEachIndexed { index, title ->
                            Tab(
                                selected = selectedTab == index,
                                onClick = { selectedTab = index },
                                text = { Text(title, style = MaterialTheme.typography.labelMedium) },
                            )
                        }
                    }
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        // Action result toast
                        state.actionResult?.let { msg ->
                            item {
                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF10B981).copy(alpha = 0.12f), modifier = Modifier.fillMaxWidth()) {
                                    Text(msg, modifier = Modifier.padding(12.dp).fillMaxWidth(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Color(0xFF059669), textAlign = TextAlign.Center)
                                }
                            }
                        }

                        // ─── Hero Banner ────────────────────────────
                        if (selectedTab == 0) item {
                            Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Brush.horizontalGradient(if (darkTheme) listOf(Color(0xFF0B1220), Color(0xFF1B2542), Color(0xFF2A1F45)) else listOf(Color(0xFF0EA5E9), Color(0xFF3B82F6), Color(0xFF8B5CF6)))).padding(16.dp)) {
                                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text("REWARDS PROGRAM", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.85f), letterSpacing = 2.sp, fontWeight = FontWeight.SemiBold)
                                        Text("Rewards & Referrals", style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                    // Glassmorphism user card
                                    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = if (darkTheme) 0.07f else 0.14f)).border(1.dp, Color.White.copy(alpha = 0.22f), RoundedCornerShape(16.dp)).padding(14.dp)) {
                                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                                Box(contentAlignment = Alignment.TopEnd) {
                                                    Box(modifier = Modifier.size(52.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                                                        Text((user.name?.firstOrNull()?.uppercaseChar() ?: '?').toString(), style = MaterialTheme.typography.titleLarge, color = Color.White, fontWeight = FontWeight.Bold)
                                                    }
                                                    Box(modifier = Modifier.size(20.dp).clip(CircleShape).background(Color(0xFFF59E0B)).border(1.5.dp, Color.White, CircleShape), contentAlignment = Alignment.Center) {
                                                        Icon(Icons.Filled.EmojiEvents, null, tint = Color.White, modifier = Modifier.size(12.dp))
                                                    }
                                                }
                                                Column {
                                                    Text(user.name ?: "User", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
                                                    Text("Code: ${user.referralCode ?: "\u2014"}", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f))
                                                }
                                            }
                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                HeroChip("\uD83C\uDFC6 ${user.rank ?: "Bronze"}")
                                                HeroChip("Lv.${max(user.level, 1)}")
                                                HeroChip((user.currentPlan ?: user.membershipPlan ?: "Basic").replaceFirstChar { it.uppercase() })
                                            }
                                            // Daily Secret Code
                                            user.dailySecretCode?.let { code ->
                                                Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color.White.copy(alpha = 0.1f)).padding(horizontal = 10.dp, vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                                    Text("\uD83D\uDD11 Secret: $code", style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.9f))
                                                    Text("Copy", style = MaterialTheme.typography.labelSmall, color = Color(0xFF6EE7B7), fontWeight = FontWeight.Bold, modifier = Modifier.clickable { clipboardManager.setText(AnnotatedString(code)) })
                                                }
                                            }
                                            // XP progress
                                            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                    Text("Level progress", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.8f))
                                                    Text("${user.xpCurrent} / ${user.xpRequired} XP", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.9f), fontWeight = FontWeight.SemiBold)
                                                }
                                                GoldProgressBar(progress = xpProgress)
                                                Text("$xpRemaining XP to next level", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.7f))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Impact Dashboard ────────────────────────────
                        if (selectedTab == 0) item {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("IMPACT DASHBOARD", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    ImpactCard("Total Points", (user.totalCoins + user.chainEarnedPoints).toString(), "\uD83C\uDFC6", Color(0xFFF59E0B), Modifier.weight(1f))
                                    ImpactCard("Chain Depth", rewards.referralChain.size.toString(), "\uD83D\uDD17", Color(0xFF6366F1), Modifier.weight(1f))
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
                            AccentTopCard(listOf(Color(0xFFF59E0B), Color(0xFFD97706)), if (darkTheme) Color(0xFF1C1408) else Color(0xFFFFFBEB)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                                        Text("COIN BALANCE", style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFFFCD34D) else Color(0xFFD97706), letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold)
                                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(user.totalCoins.toString(), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black, color = if (darkTheme) Color(0xFFFCD34D) else Color(0xFFB45309), modifier = Modifier.graphicsLayer(scaleX = coinScale, scaleY = coinScale))
                                            Text("coins", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 4.dp))
                                        }
                                        val coinProgress = (user.totalCoins % 500) / 500f
                                        Box(modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(if (darkTheme) Color(0xFF2D1F00) else Color(0xFFFEF3C7))) {
                                            Box(modifier = Modifier.fillMaxWidth(coinProgress.coerceIn(0.05f, 1f)).height(6.dp).drawBehind {
                                                drawRect(Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFFBBF24), Color.White.copy(alpha = 0.5f), Color(0xFFFBBF24), Color(0xFFF59E0B)), startX = size.width * shimmerX, endX = size.width * (shimmerX + 1f)))
                                            }.clip(RoundedCornerShape(3.dp)))
                                        }
                                        Text("${user.totalCoins % 500}/500 coins to next reward", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Box(modifier = Modifier.size(52.dp).offset(y = coinFloat.dp).clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(if (darkTheme) Color(0xFF2D1F00) else Color(0xFFFEF3C7), if (darkTheme) Color(0xFF3D2900) else Color(0xFFFDE68A)))), contentAlignment = Alignment.Center) {
                                        Text("\uD83E\uDE99", style = MaterialTheme.typography.headlineMedium)
                                    }
                                }
                            }
                        }

                        // ─── Daily Actions (Check-in + Spin + Scratch) ───
                        if (selectedTab == 1) item {
                            val canCheckIn = engagement?.dailyCheckIn?.canClaim ?: true
                            val canSpin = engagement?.spin?.canSpin ?: false
                            val canScratch = engagement?.scratch?.canScratch ?: false
                            val scratchCount = engagement?.scratch?.available ?: 0
                            val streak = engagement?.dailyCheckIn?.streak ?: user.visitStreak
                            val weekProgress = engagement?.dailyCheckIn?.weekProgress ?: emptyList()
                            val todayReward = engagement?.dailyCheckIn?.todayReward ?: 5

                            AccentTopCard(listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)), if (darkTheme) Color(0xFF111827) else Color(0xFFF8FAFF)) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("DAILY ACTIONS", style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFFA5B4FC) else Color(0xFF4F46E5), letterSpacing = 1.5.sp, fontWeight = FontWeight.SemiBold)
                                        Surface(shape = RoundedCornerShape(999.dp), color = Color(0xFF6366F1).copy(alpha = 0.12f)) {
                                            Text("\uD83D\uDD25 $streak day streak", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = Color(0xFF6366F1), fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                    // 7-day calendar
                                    val days = listOf("M", "T", "W", "T", "F", "S", "S")
                                    val todayIndex = (java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_WEEK) + 5) % 7
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                        days.forEachIndexed { index, day ->
                                            val isCompleted = if (weekProgress.isNotEmpty()) weekProgress.getOrElse(index) { false } else index < todayIndex
                                            val isToday = index == todayIndex
                                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(day, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Box(
                                                    modifier = Modifier.size(32.dp).clip(CircleShape)
                                                        .background(when { isCompleted -> Color(0xFF6366F1); isToday -> Color(0xFF6366F1).copy(alpha = 0.15f); else -> if (darkTheme) Color(0xFF1F2937) else Color(0xFFF1F5F9) })
                                                        .then(if (isToday && !isCompleted) Modifier.border(2.dp, Color(0xFF6366F1).copy(alpha = 0.5f), CircleShape) else Modifier),
                                                    contentAlignment = Alignment.Center,
                                                ) {
                                                    if (isCompleted) Text("\u2713", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall)
                                                    else Text("${index + 1}", style = MaterialTheme.typography.labelSmall, color = if (isToday) Color(0xFF6366F1) else MaterialTheme.colorScheme.onSurfaceVariant)
                                                }
                                            }
                                        }
                                    }
                                    // Action buttons
                                    PrimaryButton(
                                        text = if (state.actionLoading == "checkin") "Claiming..." else if (canCheckIn) "Check in (+$todayReward \uD83E\uDE99)" else "Checked in \u2713",
                                        onClick = { if (canCheckIn) viewModel.dailyCheckIn() },
                                        enabled = canCheckIn && state.actionLoading == null,
                                    )
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { viewModel.spinWheel() }, modifier = Modifier.weight(1f).height(40.dp), enabled = canSpin && state.actionLoading == null, shape = RoundedCornerShape(12.dp)) {
                                            Text(if (state.actionLoading == "spin") "..." else if (canSpin) "\uD83C\uDFA1 Spin" else "\uD83C\uDFA1 Spun \u2713", style = MaterialTheme.typography.labelMedium)
                                        }
                                        OutlinedButton(onClick = { viewModel.scratchCard() }, modifier = Modifier.weight(1f).height(40.dp), enabled = canScratch && state.actionLoading == null, shape = RoundedCornerShape(12.dp)) {
                                            Text(if (state.actionLoading == "scratch") "..." else if (canScratch) "\uD83C\uDF9F Scratch ($scratchCount)" else "\uD83C\uDF9F None", style = MaterialTheme.typography.labelMedium)
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Referral Challenge ─────────────────────────
                        if (selectedTab == 2) item {
                            AccentTopCard(listOf(Color(0xFF10B981), Color(0xFF059669)), if (darkTheme) Color(0xFF0A1F15) else Color(0xFFF0FDF4)) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Column {
                                            Text("REFERRAL CHALLENGE", style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669), letterSpacing = 1.5.sp, fontWeight = FontWeight.SemiBold)
                                            Text("Invite $referralTarget friends \u2192 Get $referralReward coins", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
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
                                        Text("+$referralReward coins on completion", style = MaterialTheme.typography.labelMedium, color = if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669))
                                    }
                                }
                            }
                        }

                        // ─── Quick Share (proper deep links) ─────────────
                        if (selectedTab == 2) item {
                            AccentTopCard(listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)), if (darkTheme) Color(0xFF111827) else Color(0xFFF8FAFF)) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text("QUICK SHARE", style = MaterialTheme.typography.labelSmall, color = if (darkTheme) Color(0xFFA5B4FC) else Color(0xFF4F46E5), letterSpacing = 1.5.sp, fontWeight = FontWeight.SemiBold)
                                    Text("Share your referral code", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                            OutlinedButton(onClick = {
                                                val url = "https://wa.me/?text=${Uri.encode(inviteText)}"
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                            }, modifier = Modifier.weight(1f).height(44.dp), shape = CircleShape, border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF25D366).copy(alpha = 0.6f)), contentPadding = PaddingValues(horizontal = 8.dp)) {
                                                Text("\uD83D\uDCAC", style = MaterialTheme.typography.labelMedium); Spacer(Modifier.width(4.dp)); Text("WhatsApp", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                                            }
                                            OutlinedButton(onClick = {
                                                val url = "https://t.me/share/url?url=${Uri.encode("https://mhub.app/invite/${user.referralCode ?: ""}")}&text=${Uri.encode(inviteText)}"
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                            }, modifier = Modifier.weight(1f).height(44.dp), shape = CircleShape, border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF229ED9).copy(alpha = 0.6f)), contentPadding = PaddingValues(horizontal = 8.dp)) {
                                                Text("\u2708\uFE0F", style = MaterialTheme.typography.labelMedium); Spacer(Modifier.width(4.dp)); Text("Telegram", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                                            }
                                        }
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                            OutlinedButton(onClick = { clipboardManager.setText(AnnotatedString(inviteText)) }, modifier = Modifier.weight(1f).height(44.dp), shape = CircleShape, border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF6366F1).copy(alpha = 0.6f)), contentPadding = PaddingValues(horizontal = 8.dp)) {
                                                Text("\uD83D\uDD17", style = MaterialTheme.typography.labelMedium); Spacer(Modifier.width(4.dp)); Text("Copy Link", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                                            }
                                            OutlinedButton(onClick = {
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("sms:?body=${Uri.encode(inviteText)}")))
                                            }, modifier = Modifier.weight(1f).height(44.dp), shape = CircleShape, border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF8B5CF6).copy(alpha = 0.6f)), contentPadding = PaddingValues(horizontal = 8.dp)) {
                                                Text("\uD83D\uDCF1", style = MaterialTheme.typography.labelMedium); Spacer(Modifier.width(4.dp)); Text("SMS", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ─── How to Earn (real progress) ─────────────────
                        if (selectedTab == 1) item {
                            val stats = user.activityStats
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.95f)), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f), RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text("How to Earn", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    EarnPlaybookRow("\uD83D\uDC65", "Refer a friend", "+10 coins", (stats.referralsCount / 10f).coerceIn(0f, 1f), Color(0xFF6366F1))
                                    EarnPlaybookRow("\uD83D\uDCDD", "Post a listing", "+5 coins", (stats.postsCount / 10f).coerceIn(0f, 1f), Color(0xFF10B981))
                                    EarnPlaybookRow("\u2B50", "Complete a sale", "+25 coins", (stats.salesCount / 5f).coerceIn(0f, 1f), Color(0xFFF59E0B))
                                    EarnPlaybookRow("\uD83D\uDD17", "Build referral chain", "+25 coins", (rewards.referralChain.size / 5f).coerceIn(0f, 1f), Color(0xFF8B5CF6))
                                }
                            }
                        }

                        // ─── Redeem Store (clickable with dialog) ────────
                        if (selectedTab == 1) item {
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.95f)), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f), RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text("Redeem Store", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text("Spend your coins on exclusive perks", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        RedeemCard("\uD83D\uDE80", "Listing Boost", 100, user.totalCoins >= 100, Color(0xFF6366F1), darkTheme, Modifier.weight(1f)) { redeemDialogType = "boost" }
                                        RedeemCard("\u2B50", "Featured Badge", 200, user.totalCoins >= 200, Color(0xFFF59E0B), darkTheme, Modifier.weight(1f)) { redeemDialogType = "badge" }
                                        RedeemCard("\uD83D\uDC51", "Top Placement", 500, user.totalCoins >= 500, Color(0xFF8B5CF6), darkTheme, Modifier.weight(1f)) { redeemDialogType = "top_search" }
                                    }
                                }
                            }
                        }

                        // ─── My Rewards ─────────────────────────────────
                        if (selectedTab == 3) item {
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.95f)), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f), RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("My rewards", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
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
                                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.95f)), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f), RoundedCornerShape(20.dp))) {
                                    Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("Recent Activity", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        state.coinHistory.take(5).forEach { tx ->
                                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(tx.description ?: tx.action ?: "Activity", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                                    tx.createdAt?.take(10)?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                                }
                                                Text("${if (tx.amount >= 0) "+" else ""}${tx.amount}", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = if (tx.amount >= 0) Color(0xFF059669) else Color(0xFFDC2626))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Leaderboard ─────────────────────────────────
                        if (selectedTab == 3 && state.leaderboard.isNotEmpty()) {
                            item {
                                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.95f)), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f), RoundedCornerShape(20.dp))) {
                                    Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Weekly Leaderboard", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
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
                                                Text("${entry.referrals} refs", style = MaterialTheme.typography.labelMedium, color = Color(0xFF6366F1), fontWeight = FontWeight.SemiBold)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Milestone Badges ────────────────────────────
                        if (selectedTab == 2) item {
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.95f)), elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f), RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("Milestone Badges", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text("Unlock badges as you earn and grow", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                        MilestoneBadge("\uD83C\uDF1F", "First Coin", user.totalCoins > 0)
                                        MilestoneBadge("\uD83D\uDD25", "5 Referrals", user.directReferrals >= 5)
                                        MilestoneBadge("\uD83D\uDC8E", "100 Coins", user.totalCoins >= 100)
                                        MilestoneBadge("\uD83C\uDFC6", "Chain King", rewards.referralChain.size >= 3)
                                    }
                                }
                            }
                        }

                        // ─── Referral Network ────────────────────────────
                        if (selectedTab == 2) item {
                            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else Color(0xFFF8FAFC)), elevation = CardDefaults.cardElevation(3.dp), modifier = Modifier.fillMaxWidth().border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.18f) else Color(0xFFE2E8F0).copy(alpha = 0.6f), RoundedCornerShape(20.dp))) {
                                Column(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Referral network", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    if (rewards.referralChain.isEmpty()) {
                                        Text("No referrals yet. Share your code to start earning.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    } else {
                                        rewards.referralChain.take(5).forEachIndexed { index, node ->
                                            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                                Box(contentAlignment = Alignment.Center, modifier = Modifier.width(20.dp)) {
                                                    if (index > 0) Box(modifier = Modifier.width(2.dp).height(20.dp).offset(y = (-14).dp).background(Brush.verticalGradient(listOf(Color(0xFF6366F1).copy(alpha = 0.45f), Color(0xFF6366F1).copy(alpha = 0.08f)))))
                                                    Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF6366F1), Color(0xFF22D3EE)))))
                                                }
                                                Text(node.name ?: "User", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                                                Text("+${max(node.coins, 0)} coins", style = MaterialTheme.typography.labelLarge, color = Color(0xFF059669), fontWeight = FontWeight.SemiBold)
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
    val darkTheme = isSystemInDarkTheme()
    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.8f) else Color.White.copy(alpha = 0.95f)), elevation = CardDefaults.cardElevation(4.dp), modifier = modifier.border(1.dp, accentColor.copy(alpha = if (darkTheme) 0.3f else 0.15f), RoundedCornerShape(16.dp))) {
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
    val darkTheme = isSystemInDarkTheme()
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
    val darkTheme = isSystemInDarkTheme()
    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1F2937) else Color(0xFFF8FAFC)), modifier = Modifier.fillMaxWidth()) {
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
    val darkTheme = isSystemInDarkTheme()
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
    val darkTheme = isSystemInDarkTheme()
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(accentColor.copy(alpha = if (darkTheme) 0.15f else 0.08f)).border(1.dp, accentColor.copy(alpha = 0.18f), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
            Text(emoji, style = MaterialTheme.typography.titleSmall)
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(title, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                Text(reward, style = MaterialTheme.typography.labelSmall, color = accentColor, fontWeight = FontWeight.Bold)
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
            .background(if (affordable && !darkTheme) accentColor.copy(alpha = 0.04f) else Color.Transparent)
            .clickable(enabled = affordable, onClick = onClick)
            .padding(10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(emoji, style = MaterialTheme.typography.headlineSmall)
            Text(title, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center, maxLines = 2)
            Surface(shape = RoundedCornerShape(999.dp), color = if (affordable) accentColor.copy(alpha = 0.15f) else Color(0xFF94A3B8).copy(alpha = 0.12f)) {
                Text("$cost \uD83E\uDE99", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, color = if (affordable) accentColor else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
            }
        }
    }
}
