package com.mhub.app.ui.rewards

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Redeem
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Toll
import androidx.compose.material.icons.outlined.Upgrade
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiError
import com.mhub.app.core.ApiResult
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
import kotlin.math.min

data class RewardsUiState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val requiresAuth: Boolean = false,
    val error: String? = null,
    val rewards: RewardsOverviewResponse? = null,
)

private val rewardsHeroGradientLight = listOf(
    Color(0xFF0EA5E9),
    Color(0xFF3B82F6),
    Color(0xFF8B5CF6),
)

private val rewardsHeroGradientDark = listOf(
    Color(0xFF0B1220),
    Color(0xFF1B2542),
    Color(0xFF2A1F45),
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
                is ApiResult.Success -> _state.value = RewardsUiState(rewards = result.data)
                is ApiResult.Failure -> {
                    if (result.error is ApiError.Unauthorized) {
                        _state.value = RewardsUiState(requiresAuth = true)
                    } else {
                        _state.value = _state.value.copy(
                            loading = false,
                            refreshing = false,
                            error = result.error.message,
                        )
                    }
                }
            }
        }
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
    val darkTheme = isSystemInDarkTheme()
    val heroGradient = Brush.horizontalGradient(
        if (darkTheme) rewardsHeroGradientDark else rewardsHeroGradientLight,
    )

    LaunchedEffect(isAuthenticated) {
        if (!isAuthenticated) {
            viewModel.showAuthGate()
        } else {
            viewModel.load()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Rewards & Referrals", fontWeight = FontWeight.Bold)
                        Text(
                            "Track coins, tiers and invite progress",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.load(refresh = true) }) {
                        Icon(Icons.Outlined.EmojiEvents, contentDescription = "Refresh rewards")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        if (state.requiresAuth) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp, vertical = 20.dp),
                verticalArrangement = Arrangement.Top,
            ) {
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Surface(
                            shape = RoundedCornerShape(999.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Text(
                                "ACCOUNT REQUIRED",
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                        Icon(
                            imageVector = Icons.Outlined.Lock,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(30.dp),
                        )
                        Text("Sign in to view Rewards", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(
                            "Earn points and unlock referral perks after login.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        PrimaryButton(text = "Sign in", onClick = onSignInRequired)
                        SecondaryButton(text = "Browse marketplace", onClick = onBrowseMarketplace)
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
                .padding(padding),
        ) {
            when {
                state.loading && state.rewards == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }

                state.error != null && state.rewards == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = "Rewards unavailable",
                        message = state.error ?: "Failed to load rewards",
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry",
                    )
                }

                state.rewards != null -> {
                    val rewards = state.rewards!!
                    val user = rewards.user
                    val referralProgressTarget = 3
                    val directReferrals = user.directReferrals
                    val referralProgress = (directReferrals.toFloat() / referralProgressTarget.toFloat()).coerceIn(0f, 1f)
                    val xpProgress = if (user.xpRequired <= 0) 0f else user.xpCurrent.toFloat() / user.xpRequired.toFloat()
                    val nextLevelCoins = max(0, user.xpRequired - user.xpCurrent)
                    val inviteText = buildString {
                        append("Join MHub with my referral code ")
                        append(user.referralCode ?: "MHUB")
                        append(" and start earning rewards.")
                    }

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item {
                            Surface(
                                shape = RoundedCornerShape(18.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(heroGradient)
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text(
                                        "REWARDS PROGRAM",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = Color.White.copy(alpha = 0.9f),
                                    )
                                    Text(
                                        "Rewards & Referrals",
                                        style = MaterialTheme.typography.headlineSmall,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        "Track progress, earn points, and unlock perks for every milestone.",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = Color.White.copy(alpha = 0.94f),
                                    )
                                }
                            }
                        }

                        item {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (darkTheme) Color(0xCC0F172A) else Color.White,
                                ),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text(user.name ?: "User", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        RankChip("Rank: ${user.rank ?: "Bronze"}")
                                        RankChip("Level ${max(user.level, 1)}")
                                        RankChip((user.currentPlan ?: user.membershipPlan ?: "basic").replaceFirstChar { it.uppercase() })
                                    }
                                    Text("Level progress", style = MaterialTheme.typography.labelLarge)
                                    LinearProgressIndicator(
                                        progress = { xpProgress.coerceIn(0f, 1f) },
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                    Text(
                                        "$nextLevelCoins XP remaining",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }

                        item {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (darkTheme) Color(0x6629240D) else Color(0xFFFFFBEB),
                                ),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Text(
                                        "COIN BALANCE",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = if (darkTheme) Color(0xFFFCD34D) else Color(0xFFD97706),
                                    )
                                    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(
                                            user.totalCoins.toString(),
                                            style = MaterialTheme.typography.headlineLarge,
                                            fontWeight = FontWeight.Bold,
                                            color = if (darkTheme) Color(0xFFFCD34D) else Color(0xFFB45309),
                                        )
                                        Text("coins", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Text(
                                        "Next reward: Free Listing Boost",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }

                        item {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (darkTheme) Color(0x6610221A) else Color(0xFFF0FDF4),
                                ),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text("Invite 3 friends -> Get 50 coins", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        "Progress: $directReferrals/$referralProgressTarget",
                                        style = MaterialTheme.typography.bodyMedium,
                                    )
                                    LinearProgressIndicator(progress = { referralProgress }, modifier = Modifier.fillMaxWidth())
                                    Text(
                                        "+50 coins on completion",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF059669),
                                    )
                                }
                            }
                        }

                        item {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (darkTheme) Color(0x66203252) else Color(0xFFF8FAFF),
                                ),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text("Quick share", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    val channels = listOf("WhatsApp", "Telegram", "Copy Link", "SMS")
                                    channels.forEach { label ->
                                        OutlinedButton(
                                            onClick = {
                                                if (label == "Copy Link") {
                                                    val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                                        type = "text/plain"
                                                        putExtra(Intent.EXTRA_TEXT, inviteText)
                                                    }
                                                    context.startActivity(Intent.createChooser(sendIntent, "Share invite"))
                                                } else {
                                                    val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                                        type = "text/plain"
                                                        putExtra(Intent.EXTRA_TEXT, inviteText)
                                                    }
                                                    context.startActivity(Intent.createChooser(sendIntent, "Share via $label"))
                                                }
                                            },
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Text(label, modifier = Modifier.padding(start = 8.dp))
                                        }
                                    }
                                }
                            }
                        }

                        item {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (darkTheme) Color(0xCC0F172A) else Color.White,
                                ),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text("My rewards", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                                    RewardStatRow("Level", max(user.level, 1).toString(), Icons.Filled.Star)
                                    RewardStatRow("Rewards rank", user.rank ?: "Bronze", Icons.Outlined.EmojiEvents)
                                    RewardStatRow(
                                        "Membership plan",
                                        (user.currentPlan ?: user.membershipPlan ?: "basic").replaceFirstChar { it.uppercase() },
                                        Icons.Outlined.Upgrade,
                                    )
                                    RewardStatRow("Successful referrals", user.successfulRefs.toString(), Icons.Outlined.Groups)
                                    RewardStatRow("Chain rewards earned", "${user.chainEarnedPoints} coins", Icons.Outlined.Toll)

                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        PrimaryButton(
                                            text = "Invite friends",
                                            onClick = {
                                                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                                    type = "text/plain"
                                                    putExtra(Intent.EXTRA_TEXT, inviteText)
                                                }
                                                context.startActivity(Intent.createChooser(sendIntent, "Invite friends"))
                                            },
                                            modifier = Modifier.weight(1f),
                                        )
                                        SecondaryButton(
                                            text = "Redeem coins",
                                            onClick = {},
                                            modifier = Modifier.weight(1f),
                                        )
                                    }
                                }
                            }
                        }

                        item {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (darkTheme) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                                ),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text("Referral network", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    if (rewards.referralChain.isEmpty()) {
                                        Text(
                                            "No referrals yet. Share your code to start earning.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    } else {
                                        rewards.referralChain.take(5).forEach { node ->
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Text(node.name ?: "User", style = MaterialTheme.typography.bodyMedium)
                                                Text(
                                                    "+${max(node.coins, 0)} coins",
                                                    style = MaterialTheme.typography.labelLarge,
                                                    color = Color(0xFF059669),
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        item { Box(modifier = Modifier.height(56.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun RankChip(label: String) {
    val darkTheme = isSystemInDarkTheme()
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = if (darkTheme) Color(0xFF1E293B) else Color(0xFFEFF6FF),
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = if (darkTheme) Color(0xFFBFDBFE) else Color(0xFF1D4ED8),
        )
    }
}

@Composable
private fun RewardStatRow(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
) {
    val darkTheme = isSystemInDarkTheme()
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (darkTheme) Color(0xFF1F2937) else Color(0xFFF8FAFC),
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 9.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
            Column {
                Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
