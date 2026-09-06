package com.zaruda.app.ui.account

import com.zaruda.app.ui.theme.ColorTokens
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.R
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/* ═════════════════════════════════════════════════════════════════════════════
 *  Shared Home Page Standard Architectural Components for Account Screens
 *  Layer 1: Atmospheric Canvas Backdrop
 *  Layer 2: Pinned Floating Glassmorphic Top Bar
 *  Layer 3: 32dp Curved Content Sheet with Tactile Drag Handle
 * ═════════════════════════════════════════════════════════════════════════════ */

@Composable
private fun AccountAtmosphericBackdrop(
    baseColors: List<Color>,
    orb1Color: Color,
    orb2Color: Color,
    isDark: Boolean,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(230.dp)
            .background(Brush.verticalGradient(colors = baseColors))
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(orb1Color.copy(alpha = if (isDark) 0.30f else 0.40f), Color.Transparent),
                    center = Offset(size.width * 0.82f, 50.dp.toPx()),
                    radius = 160.dp.toPx(),
                )
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(orb2Color.copy(alpha = if (isDark) 0.20f else 0.30f), Color.Transparent),
                    center = Offset(size.width * 0.18f, 95.dp.toPx()),
                    radius = 140.dp.toPx(),
                )
            )
        }

        // Top vignette scrim
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(90.dp)
                .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.50f), Color.Transparent)))
        )

        // Bottom fade scrim
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp)
                .align(Alignment.BottomCenter)
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.35f))))
        )
    }
}

@Composable
private fun AccountFloatingTopBar(
    title: String,
    badgeText: String,
    badgeEmoji: String,
    badgeColor: Color,
    isDark: Boolean,
    onBack: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = if (isDark) Color.Black.copy(alpha = 0.65f) else Color.White.copy(alpha = 0.88f),
            border = BorderStroke(1.dp, if (isDark) Color.White.copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.08f)),
            shadowElevation = 6.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f, fill = false),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(34.dp),
                        onClick = onBack,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }

                    Text(
                        text = title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                    )
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = badgeColor.copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, badgeColor.copy(alpha = 0.30f)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(badgeEmoji, fontSize = 11.sp)
                        Text(
                            badgeText,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = badgeColor,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TactileDragHandle() {
    Box(
        modifier = Modifier
            .padding(top = 12.dp, bottom = 8.dp)
            .width(44.dp)
            .height(4.5.dp)
            .clip(RoundedCornerShape(2.5.dp))
            .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
    )
}

// ─── DashboardScreen ────────────────────────────────────────────────────────
data class DashboardUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val stats: List<DashboardStat> = emptyList(),
    val activity: List<DashboardActivity> = emptyList(),
    val userName: String = "User",
    val selectedPeriod: Int = 2,
    val viewMode: String = "seller",
    val userRank: String? = null,
    val coins: Int = 0,
    val dailyCode: String? = null,
    val topSellers: List<TopSeller> = emptyList(),
    val buyerStats: BuyerStats? = null,
)

data class TopSeller(val id: String, val name: String, val avatar: String?, val sales: Int, val rank: Int)
data class BuyerStats(val itemsBought: Int = 0, val offersMade: Int = 0, val savedItems: Int = 0, val inquiries: Int = 0)

@HiltViewModel
class DashboardViewModel @Inject constructor(private val repo: DashboardRepository) : ViewModel() {
    private val _state = MutableStateFlow(DashboardUiState())
    val state: StateFlow<DashboardUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        val dashDeferred = async { repo.get() }
        val coinsDeferred = async { repo.coinBalance() }
        val codeDeferred = async { repo.dailyCode() }
        when (val r = dashDeferred.await()) {
            is ApiResult.Success -> {
                val apiTopSellers = r.data.topSellers.mapIndexed { idx, u ->
                    TopSeller(u.stableId, u.displayName, u.avatar, 0, idx + 1)
                }
                val topSellers = apiTopSellers.ifEmpty { emptyList() }
                val rank = r.data.user?.rewardsRank
                _state.value = _state.value.copy(
                    loading = false,
                    stats = r.data.quickStats,
                    activity = r.data.recentActivity,
                    userName = r.data.user?.displayName ?: "User",
                    userRank = rank,
                    topSellers = topSellers,
                    buyerStats = BuyerStats(
                        itemsBought = r.data.quickStats.firstOrNull { it.labelKey == "items_bought" || it.label?.contains("bought", true) == true }?.value ?: 0,
                        offersMade = r.data.quickStats.firstOrNull { it.labelKey == "offers_made" || it.label?.contains("offer", true) == true }?.value ?: 0,
                        savedItems = r.data.quickStats.firstOrNull { it.labelKey == "saved_items" || it.label?.contains("saved", true) == true || it.label?.contains("wishlist", true) == true }?.value ?: 0,
                        inquiries = r.data.quickStats.firstOrNull { it.labelKey == "inquiries" || it.label?.contains("inquir", true) == true }?.value ?: 0,
                    ),
                )
            }
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
        }
        when (val c = coinsDeferred.await()) {
            is ApiResult.Success -> _state.value = _state.value.copy(coins = c.data.balance)
            is ApiResult.Failure -> {}
        }
        when (val d = codeDeferred.await()) {
            is ApiResult.Success -> _state.value = _state.value.copy(dailyCode = d.data.code.ifBlank { null })
            is ApiResult.Failure -> {}
        }
    } }
    fun selectPeriod(index: Int) { _state.value = _state.value.copy(selectedPeriod = index); load() }
    fun toggleView() { _state.value = _state.value.copy(viewMode = if (_state.value.viewMode == "seller") "buyer" else "seller") }
}

private val periodLabels = listOf("Today", "This Week", "This Month", "All Time")

@Composable
fun DashboardScreen(onBack: () -> Unit, viewModel: DashboardViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDarkTheme()
    val statMeta = listOf(
        Icons.AutoMirrored.Filled.List to MaterialTheme.colorScheme.primary,
        Icons.Filled.ShoppingCart to Color(0xFF22C55E),
        Icons.Filled.Visibility to Color(0xFF8B5CF6),
        Icons.Filled.Stars to Color(0xFFF59E0B),
    )

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Layer 1: Atmospheric Canvas Backdrop
        AccountAtmosphericBackdrop(
            baseColors = if (isDark) listOf(Color(0xFF0F172A), Color(0xFF1E1B4B), Color(0xFF1E293B))
            else listOf(Color(0xFF3B82F6), Color(0xFF2563EB), Color(0xFF1D4ED8)),
            orb1Color = Color(0xFF6366F1),
            orb2Color = Color(0xFF059669),
            isDark = isDark,
        )

        // Layer 3: 32dp Curved Content Sheet
        Column(Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    TactileDragHandle()

                    if (state.loading) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            // ── Escrow Commerce Protection Ribbon ──
                            item {
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = Color(0xFF059669).copy(alpha = 0.08f),
                                    border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(
                                        Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        Text("🛡️", fontSize = 22.sp)
                                        Column(Modifier.weight(1f)) {
                                            Text(
                                                "100% Escrow Protected Marketplace",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp,
                                                color = Color(0xFF059669),
                                            )
                                            Text(
                                                "Zero-chat automated settlements. Payouts and buyer funds are held safely until OTP inspection.",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                lineHeight = 15.sp,
                                            )
                                        }
                                    }
                                }
                            }

                            // ── View Mode Segmented Selector ──
                            item {
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(Modifier.padding(4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Surface(
                                            onClick = { if (state.viewMode != "seller") viewModel.toggleView() },
                                            shape = RoundedCornerShape(12.dp),
                                            color = if (state.viewMode == "seller") MaterialTheme.colorScheme.primary else Color.Transparent,
                                            shadowElevation = if (state.viewMode == "seller") 2.dp else 0.dp,
                                            modifier = Modifier.weight(1f),
                                        ) {
                                            Row(
                                                Modifier.padding(vertical = 10.dp),
                                                horizontalArrangement = Arrangement.Center,
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Icon(
                                                    Icons.Filled.Store,
                                                    null,
                                                    tint = if (state.viewMode == "seller") MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                                    modifier = Modifier.size(17.dp),
                                                )
                                                Spacer(Modifier.width(6.dp))
                                                Text(
                                                    stringResource(R.string.account_seller_view),
                                                    fontWeight = FontWeight.SemiBold,
                                                    fontSize = 13.sp,
                                                    color = if (state.viewMode == "seller") MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }

                                        Surface(
                                            onClick = { if (state.viewMode != "buyer") viewModel.toggleView() },
                                            shape = RoundedCornerShape(12.dp),
                                            color = if (state.viewMode == "buyer") MaterialTheme.colorScheme.primary else Color.Transparent,
                                            shadowElevation = if (state.viewMode == "buyer") 2.dp else 0.dp,
                                            modifier = Modifier.weight(1f),
                                        ) {
                                            Row(
                                                Modifier.padding(vertical = 10.dp),
                                                horizontalArrangement = Arrangement.Center,
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Icon(
                                                    Icons.Filled.ShoppingBag,
                                                    null,
                                                    tint = if (state.viewMode == "buyer") MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                                    modifier = Modifier.size(17.dp),
                                                )
                                                Spacer(Modifier.width(6.dp))
                                                Text(
                                                    stringResource(R.string.account_buyer_view),
                                                    fontWeight = FontWeight.SemiBold,
                                                    fontSize = 13.sp,
                                                    color = if (state.viewMode == "buyer") MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // ── User Profile Welcome Card ──
                            item {
                                Surface(
                                    shape = RoundedCornerShape(18.dp),
                                    color = MaterialTheme.colorScheme.primary,
                                    shadowElevation = 3.dp,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            Modifier
                                                .size(50.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.20f)),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text(
                                                state.userName.take(1).uppercase(),
                                                color = MaterialTheme.colorScheme.onPrimary,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 22.sp,
                                            )
                                        }
                                        Spacer(Modifier.width(14.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(
                                                stringResource(R.string.account_welcome_back),
                                                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.80f),
                                                fontSize = 12.sp,
                                            )
                                            Text(
                                                state.userName,
                                                color = MaterialTheme.colorScheme.onPrimary,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 18.sp,
                                            )
                                        }
                                        Surface(
                                            shape = RoundedCornerShape(20.dp),
                                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.18f),
                                        ) {
                                            Text(
                                                if (state.viewMode == "seller") "Seller Mode" else "Buyer Mode",
                                                color = MaterialTheme.colorScheme.onPrimary,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                            )
                                        }
                                    }
                                }
                            }

                            // ── User Rank Badge ──
                            if (state.userRank != null) {
                                item {
                                    val rankColor = when (state.userRank) {
                                        "Gold" -> Color(0xFFFBBF24)
                                        "Silver" -> Color(0xFF94A3B8)
                                        "Bronze" -> Color(0xFFF97316)
                                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                                    }
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = MaterialTheme.colorScheme.surface,
                                        border = BorderStroke(1.dp, rankColor.copy(alpha = 0.35f)),
                                        shadowElevation = 1.dp,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                Modifier
                                                    .size(42.dp)
                                                    .clip(CircleShape)
                                                    .background(rankColor.copy(alpha = 0.15f)),
                                                contentAlignment = Alignment.Center,
                                            ) {
                                                Icon(Icons.Filled.EmojiEvents, null, tint = rankColor, modifier = Modifier.size(24.dp))
                                            }
                                            Spacer(Modifier.width(12.dp))
                                            Column {
                                                Text(
                                                    stringResource(R.string.account_your_rank),
                                                    fontSize = 11.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                                Text(
                                                    "${state.userRank} Member",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 16.sp,
                                                    color = rankColor,
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // ── Coins Display with Vault Aesthetics ──
                            item {
                                Surface(
                                    shape = RoundedCornerShape(18.dp),
                                    color = MaterialTheme.colorScheme.surface,
                                    border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.3f)),
                                    shadowElevation = 2.dp,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Column(Modifier.padding(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                Modifier
                                                    .size(44.dp)
                                                    .clip(RoundedCornerShape(12.dp))
                                                    .background(Color(0xFFFEF3C7)),
                                                contentAlignment = Alignment.Center,
                                            ) {
                                                Icon(Icons.Filled.Stars, null, tint = Color(0xFFD97706), modifier = Modifier.size(26.dp))
                                            }
                                            Spacer(Modifier.width(12.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(
                                                    stringResource(R.string.account_total_coins),
                                                    fontSize = 12.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                                val animatedCoins by animateIntAsState(
                                                    targetValue = state.coins,
                                                    animationSpec = tween(durationMillis = 600),
                                                    label = "coins_anim",
                                                )
                                                Text(
                                                    "$animatedCoins",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 30.sp,
                                                    color = Color(0xFFD97706),
                                                )
                                            }
                                        }

                                        if (state.dailyCode != null) {
                                            Spacer(Modifier.height(12.dp))
                                            Surface(
                                                shape = RoundedCornerShape(10.dp),
                                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                            ) {
                                                Row(
                                                    Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                ) {
                                                    Text("⚡ Daily Bonus Code:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                    Spacer(Modifier.width(8.dp))
                                                    Text(
                                                        state.dailyCode ?: "",
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 14.sp,
                                                        color = MaterialTheme.colorScheme.primary,
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // ── Period Filter Chips ──
                            item {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                    periodLabels.forEachIndexed { index, label ->
                                        FilterChip(
                                            selected = state.selectedPeriod == index,
                                            onClick = { viewModel.selectPeriod(index) },
                                            label = { Text(label, fontSize = 12.sp) },
                                            shape = RoundedCornerShape(20.dp),
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                            ),
                                        )
                                    }
                                }
                            }

                            // ── Mode-Specific Content ──
                            if (state.viewMode == "seller") {
                                item {
                                    val statsToShow = state.stats.take(4)
                                    Text(
                                        stringResource(R.string.account_quick_stats),
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    if (statsToShow.isEmpty()) {
                                        Text(
                                            stringResource(R.string.account_no_stats),
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    } else {
                                        for (i in statsToShow.indices step 2) {
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                                modifier = Modifier.padding(bottom = 12.dp),
                                            ) {
                                                val m1 = statMeta.getOrElse(i) { Icons.Filled.Info to Color(0xFF64748B) }
                                                val trend1 = statsToShow[i].trend
                                                StatCardWithTrend(
                                                    Modifier.weight(1f),
                                                    "${statsToShow[i].value}",
                                                    statsToShow[i].label ?: statsToShow[i].labelKey ?: "Stat",
                                                    m1.second,
                                                    m1.first,
                                                    trend1,
                                                )
                                                if (i + 1 < statsToShow.size) {
                                                    val m2 = statMeta.getOrElse(i + 1) { Icons.Filled.Info to Color(0xFF64748B) }
                                                    val trend2 = statsToShow[i + 1].trend
                                                    StatCardWithTrend(
                                                        Modifier.weight(1f),
                                                        "${statsToShow[i + 1].value}",
                                                        statsToShow[i + 1].label ?: statsToShow[i + 1].labelKey ?: "Stat",
                                                        m2.second,
                                                        m2.first,
                                                        trend2,
                                                    )
                                                } else {
                                                    Spacer(Modifier.weight(1f))
                                                }
                                            }
                                        }
                                    }
                                }

                                if (state.topSellers.isNotEmpty()) {
                                    item {
                                        Text(
                                            stringResource(R.string.account_top_sellers),
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 15.sp,
                                            color = MaterialTheme.colorScheme.onSurface,
                                        )
                                    }
                                    item {
                                        Surface(
                                            shape = RoundedCornerShape(16.dp),
                                            color = MaterialTheme.colorScheme.surface,
                                            shadowElevation = 2.dp,
                                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Column(Modifier.padding(14.dp)) {
                                                state.topSellers.forEach { seller ->
                                                    Row(
                                                        Modifier
                                                            .fillMaxWidth()
                                                            .padding(vertical = 8.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                    ) {
                                                        val medal = when (seller.rank) {
                                                            1 -> "🥇"
                                                            2 -> "🥈"
                                                            3 -> "🥉"
                                                            else -> "${seller.rank}"
                                                        }
                                                        Text(medal, fontSize = 20.sp, modifier = Modifier.width(36.dp))
                                                        Box(
                                                            Modifier
                                                                .size(36.dp)
                                                                .clip(CircleShape)
                                                                .background(MaterialTheme.colorScheme.primaryContainer),
                                                            contentAlignment = Alignment.Center,
                                                        ) {
                                                            Text(
                                                                seller.name.take(1).uppercase(),
                                                                fontWeight = FontWeight.Bold,
                                                                fontSize = 14.sp,
                                                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                                            )
                                                        }
                                                        Spacer(Modifier.width(10.dp))
                                                        Column(Modifier.weight(1f)) {
                                                            Text(
                                                                seller.name,
                                                                fontWeight = FontWeight.SemiBold,
                                                                fontSize = 13.sp,
                                                                color = MaterialTheme.colorScheme.onSurface,
                                                            )
                                                            Text(
                                                                "${seller.sales} sales",
                                                                fontSize = 11.sp,
                                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                            )
                                                        }
                                                    }
                                                    if (seller.rank < 5) {
                                                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), thickness = 1.dp)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                state.buyerStats?.let { bs ->
                                    item {
                                        Text(
                                            stringResource(R.string.account_buyer_activity),
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 15.sp,
                                            color = MaterialTheme.colorScheme.onSurface,
                                        )
                                        Spacer(Modifier.height(8.dp))
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                                            modifier = Modifier.padding(bottom = 12.dp),
                                        ) {
                                            BuyerStatCard(Modifier.weight(1f), "${bs.itemsBought}", "Items Bought", Icons.Filled.ShoppingCart, Color(0xFF22C55E))
                                            BuyerStatCard(Modifier.weight(1f), "${bs.offersMade}", "Offers Made", Icons.Filled.LocalOffer, Color(0xFFF59E0B))
                                        }
                                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                            BuyerStatCard(Modifier.weight(1f), "${bs.savedItems}", "Saved Items", Icons.Filled.Bookmark, Color(0xFF8B5CF6))
                                            BuyerStatCard(Modifier.weight(1f), "${bs.inquiries}", "Inquiries", Icons.Filled.NotificationsActive, Color(0xFF2563EB))
                                        }
                                    }
                                }
                            }

                            if (state.activity.isNotEmpty()) {
                                item {
                                    Text(
                                        stringResource(R.string.account_recent_activity),
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                }
                                items(state.activity.take(10), key = { it.id ?: it.createdAt ?: "" }) { a ->
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = MaterialTheme.colorScheme.surface,
                                        shadowElevation = 1.dp,
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                Modifier
                                                    .size(36.dp)
                                                    .clip(CircleShape)
                                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                                contentAlignment = Alignment.Center,
                                            ) {
                                                Icon(
                                                    Icons.Filled.Notifications,
                                                    null,
                                                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                                    modifier = Modifier.size(18.dp),
                                                )
                                            }
                                            Spacer(Modifier.width(12.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(
                                                    a.title ?: "Activity",
                                                    fontWeight = FontWeight.Medium,
                                                    fontSize = 13.sp,
                                                    color = MaterialTheme.colorScheme.onSurface,
                                                    maxLines = 1,
                                                )
                                                if (a.createdAt != null) {
                                                    Text(
                                                        a.createdAt.take(10),
                                                        fontSize = 11.sp,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Layer 2: Floating Glassmorphic Top Bar
        AccountFloatingTopBar(
            title = "Account Dashboard",
            badgeText = "Verified Seller",
            badgeEmoji = "🛡️",
            badgeColor = Color(0xFF059669),
            isDark = isDark,
            onBack = onBack,
        )
    }
}

@Composable
private fun StatCard(modifier: Modifier, value: String, label: String, color: Color, icon: ImageVector) {
    val targetValue = value.toIntOrNull() ?: 0
    val animatedValue by animateIntAsState(targetValue = targetValue, animationSpec = tween(durationMillis = 800), label = "stat_anim")
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, color.copy(alpha = 0.2f)),
        shadowElevation = 2.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(color.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text(if (targetValue > 0) "$animatedValue" else value, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(label.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        }
    }
}

@Composable
private fun StatCardWithTrend(modifier: Modifier, value: String, label: String, color: Color, icon: ImageVector, trend: String?) {
    val targetValue = value.toIntOrNull() ?: 0
    val animatedValue by animateIntAsState(targetValue = targetValue, animationSpec = tween(durationMillis = 800), label = "stat_anim")
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, color.copy(alpha = 0.2f)),
        shadowElevation = 2.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(color.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
                }
                Spacer(Modifier.weight(1f))
                trend?.let {
                    val isPositive = it.startsWith("+")
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = (if (isPositive) Color(0xFF22C55E) else Color(0xFFEF4444)).copy(alpha = 0.12f),
                    ) {
                        Text(
                            it,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isPositive) Color(0xFF22C55E) else Color(0xFFEF4444),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(if (targetValue > 0) "$animatedValue" else value, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(label.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        }
    }
}

@Composable
private fun BuyerStatCard(modifier: Modifier, value: String, label: String, icon: ImageVector, color: Color) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, color.copy(alpha = 0.2f)),
        shadowElevation = 2.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(color.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        }
    }
}

// ─── SecurityScreen ──────────────────────────────────────────────────────────
data class SecurityUiState(
    val loading: Boolean = true,
    val sessions: List<UserSession> = emptyList(),
    val twoFaEnabled: Boolean = false,
    val error: String? = null,
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val changingPassword: Boolean = false,
    val passwordChanged: Boolean = false,
    val passwordError: String? = null,
    val twoFaCode: String = "",
    val twoFaQr: String? = null,
    val twoFaBackupCodes: List<String> = emptyList(),
    val settingUp2fa: Boolean = false,
)

@HiltViewModel
class SecurityViewModel @Inject constructor(private val repo: SecurityRepository) : ViewModel() {
    private val _state = MutableStateFlow(SecurityUiState())
    val state: StateFlow<SecurityUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true)
        val sessions = repo.sessions()
        val twoFa = repo.twoFaStatus()
        _state.value = _state.value.copy(loading = false, sessions = (sessions as? ApiResult.Success)?.data ?: emptyList(), twoFaEnabled = (twoFa as? ApiResult.Success)?.data?.enabled ?: false)
    } }
    fun revokeSession(id: String) { viewModelScope.launch { repo.revokeSession(id); load() } }
    fun revokeAll() { viewModelScope.launch { repo.revokeAll(); load() } }
    fun setCurrentPassword(v: String) { _state.value = _state.value.copy(currentPassword = v) }
    fun setNewPassword(v: String) { _state.value = _state.value.copy(newPassword = v) }
    fun setConfirmPassword(v: String) { _state.value = _state.value.copy(confirmPassword = v) }
    fun changePassword() {
        val s = _state.value
        if (s.currentPassword.isBlank()) { _state.value = s.copy(passwordError = "Current password required"); return }
        if (s.newPassword.length < 12) { _state.value = s.copy(passwordError = "Min 12 characters required"); return }
        if (s.newPassword != s.confirmPassword) { _state.value = s.copy(passwordError = "Passwords do not match"); return }
        _state.value = s.copy(changingPassword = true, passwordError = null)
        viewModelScope.launch {
            when (repo.changePassword(s.currentPassword, s.newPassword)) {
                is ApiResult.Success -> _state.value = _state.value.copy(changingPassword = false, passwordChanged = true, currentPassword = "", newPassword = "", confirmPassword = "")
                is ApiResult.Failure -> _state.value = _state.value.copy(changingPassword = false, passwordError = "Failed to change password")
            }
        }
    }
    fun setTwoFaCode(v: String) { _state.value = _state.value.copy(twoFaCode = v) }
    fun setup2fa() { viewModelScope.launch {
        _state.value = _state.value.copy(settingUp2fa = true)
        when (val r = repo.twoFaSetup()) {
            is ApiResult.Success -> _state.value = _state.value.copy(settingUp2fa = false, twoFaQr = r.data.qrCode)
            is ApiResult.Failure -> _state.value = _state.value.copy(settingUp2fa = false, error = "2FA setup failed")
        }
    } }
    fun verify2fa() { viewModelScope.launch {
        val code = _state.value.twoFaCode
        if (code.length != 6) return@launch
        when (val r = repo.twoFaVerify(code)) {
            is ApiResult.Success -> _state.value = _state.value.copy(twoFaEnabled = true, twoFaBackupCodes = r.data.backupCodes, twoFaCode = "", twoFaQr = null)
            is ApiResult.Failure -> _state.value = _state.value.copy(error = "Invalid 6-digit code")
        }
    } }
    fun disable2fa() { viewModelScope.launch {
        val code = _state.value.twoFaCode
        if (code.length != 6) return@launch
        when (repo.twoFaDisable(code)) {
            is ApiResult.Success -> _state.value = _state.value.copy(twoFaEnabled = false, twoFaCode = "")
            is ApiResult.Failure -> _state.value = _state.value.copy(error = "Invalid 6-digit code")
        }
    } }
}

@Composable
fun SecurityScreen(onBack: () -> Unit, viewModel: SecurityViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDarkTheme()

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Layer 1: Atmospheric Canvas Backdrop
        AccountAtmosphericBackdrop(
            baseColors = if (isDark) listOf(Color(0xFF0F172A), Color(0xFF1E1B4B), Color(0xFF0F1422))
            else listOf(Color(0xFF1E3A8A), Color(0xFF1D4ED8), Color(0xFF2563EB)),
            orb1Color = Color(0xFF3B82F6),
            orb2Color = Color(0xFF059669),
            isDark = isDark,
        )

        // Layer 3: 32dp Curved Content Sheet
        Column(Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    TactileDragHandle()

                    if (state.loading) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            // ── Bank-Grade Security Assurance Banner ──
                            item {
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = Color(0xFF059669).copy(alpha = 0.08f),
                                    border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(
                                        Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        Text("🔒", fontSize = 22.sp)
                                        Column(Modifier.weight(1f)) {
                                            Text(
                                                "Zaruda Vault Session Protection",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp,
                                                color = Color(0xFF059669),
                                            )
                                            Text(
                                                "Session tokens are cryptographically signed with Argon2id hashing. Active 2FA enforces payout and withdrawal security.",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                lineHeight = 15.sp,
                                            )
                                        }
                                    }
                                }
                            }

                            // ── Password Change Section ──
                            item {
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = MaterialTheme.colorScheme.surface,
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                                    shadowElevation = 2.dp,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Column(Modifier.padding(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.Lock, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                                            Spacer(Modifier.width(8.dp))
                                            Text(
                                                stringResource(R.string.account_change_password),
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 15.sp,
                                                color = MaterialTheme.colorScheme.onSurface,
                                            )
                                        }
                                        Spacer(Modifier.height(12.dp))

                                        if (state.passwordChanged) {
                                            Surface(
                                                shape = RoundedCornerShape(10.dp),
                                                color = Color(0xFFDCFCE7),
                                                border = BorderStroke(1.dp, Color(0xFF22C55E).copy(alpha = 0.4f)),
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Row(
                                                    Modifier.padding(12.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                ) {
                                                    Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                                                    Text(
                                                        stringResource(R.string.account_password_changed),
                                                        color = Color(0xFF166534),
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                    )
                                                }
                                            }
                                        } else {
                                            state.passwordError?.let {
                                                Surface(
                                                    shape = RoundedCornerShape(8.dp),
                                                    color = Color(0xFFFEE2E2),
                                                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                                                ) {
                                                    Text(
                                                        it,
                                                        color = Color(0xFFDC2626),
                                                        fontSize = 12.sp,
                                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                    )
                                                }
                                            }

                                            SecureField("Current Password", state.currentPassword, viewModel::setCurrentPassword)
                                            Spacer(Modifier.height(8.dp))
                                            SecureField("New Password (min 12 chars)", state.newPassword, viewModel::setNewPassword)

                                            // Dynamic Password Strength Meter
                                            val strength = when {
                                                state.newPassword.length >= 16 && state.newPassword.any { it.isDigit() } && state.newPassword.any { !it.isLetterOrDigit() } -> "Strong (Bank Grade)" to Color(0xFF22C55E)
                                                state.newPassword.length >= 12 -> "Good" to Color(0xFFF59E0B)
                                                state.newPassword.isNotEmpty() -> "Too Weak (< 12 chars)" to Color(0xFFEF4444)
                                                else -> null
                                            }
                                            strength?.let { (label, color) ->
                                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                                                    Box(
                                                        Modifier
                                                            .weight(1f)
                                                            .height(4.dp)
                                                            .clip(RoundedCornerShape(2.dp))
                                                            .background(color.copy(alpha = 0.25f))
                                                    ) {
                                                        Box(
                                                            Modifier
                                                                .fillMaxHeight()
                                                                .fillMaxWidth(
                                                                    when (label.take(4)) {
                                                                        "Stro" -> 1f
                                                                        "Good" -> 0.66f
                                                                        else -> 0.33f
                                                                    }
                                                                )
                                                                .clip(RoundedCornerShape(2.dp))
                                                                .background(color)
                                                        )
                                                    }
                                                    Spacer(Modifier.width(8.dp))
                                                    Text(label, fontSize = 11.sp, color = color, fontWeight = FontWeight.SemiBold)
                                                }
                                            }

                                            Spacer(Modifier.height(8.dp))
                                            SecureField("Confirm New Password", state.confirmPassword, viewModel::setConfirmPassword)
                                            Spacer(Modifier.height(14.dp))

                                            Button(
                                                onClick = { viewModel.changePassword() },
                                                enabled = !state.changingPassword,
                                                shape = RoundedCornerShape(12.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                                modifier = Modifier.fillMaxWidth().height(46.dp),
                                            ) {
                                                if (state.changingPassword) {
                                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                                                    Spacer(Modifier.width(8.dp))
                                                }
                                                Text(if (state.changingPassword) "Updating Password…" else "Update Password", fontWeight = FontWeight.SemiBold)
                                            }
                                        }
                                    }
                                }
                            }

                            // ── 2FA Section ──
                            item {
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = MaterialTheme.colorScheme.surface,
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                                    shadowElevation = 2.dp,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Column(Modifier.padding(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.Security, null, tint = Color(0xFF2563EB), modifier = Modifier.size(22.dp))
                                            Spacer(Modifier.width(10.dp))
                                            Text(
                                                stringResource(R.string.account_2fa_title),
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 15.sp,
                                                color = MaterialTheme.colorScheme.onSurface,
                                                modifier = Modifier.weight(1f),
                                            )
                                            Surface(
                                                shape = RoundedCornerShape(12.dp),
                                                color = if (state.twoFaEnabled) Color(0xFFDCFCE7) else Color(0xFFFEE2E2),
                                                border = BorderStroke(1.dp, if (state.twoFaEnabled) Color(0xFF22C55E).copy(alpha = 0.4f) else Color(0xFFEF4444).copy(alpha = 0.4f)),
                                            ) {
                                                Text(
                                                    if (state.twoFaEnabled) "Enabled" else "Disabled",
                                                    fontSize = 11.sp,
                                                    color = if (state.twoFaEnabled) Color(0xFF166534) else Color(0xFF991B1B),
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                                )
                                            }
                                        }

                                        Spacer(Modifier.height(10.dp))

                                        if (state.twoFaQr != null) {
                                            Text(
                                                stringResource(R.string.account_2fa_qr_hint),
                                                fontSize = 12.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                            Surface(
                                                shape = RoundedCornerShape(10.dp),
                                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                            ) {
                                                Text(
                                                    state.twoFaQr ?: "",
                                                    fontSize = 11.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    modifier = Modifier.padding(12.dp),
                                                )
                                            }
                                        }

                                        if (state.twoFaBackupCodes.isNotEmpty()) {
                                            Text(
                                                stringResource(R.string.account_backup_codes),
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 12.sp,
                                                color = Color(0xFFEA580C),
                                            )
                                            Surface(
                                                shape = RoundedCornerShape(10.dp),
                                                color = Color(0xFFFFF7ED),
                                                border = BorderStroke(1.dp, Color(0xFFF97316).copy(alpha = 0.3f)),
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                            ) {
                                                Text(
                                                    state.twoFaBackupCodes.joinToString("\n"),
                                                    fontSize = 12.sp,
                                                    color = Color(0xFF9A3412),
                                                    modifier = Modifier.padding(12.dp),
                                                )
                                            }
                                        }

                                        if (!state.twoFaEnabled) {
                                            if (state.twoFaQr == null) {
                                                Button(
                                                    onClick = { viewModel.setup2fa() },
                                                    enabled = !state.settingUp2fa,
                                                    shape = RoundedCornerShape(12.dp),
                                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                                    modifier = Modifier.fillMaxWidth().height(42.dp),
                                                ) {
                                                    Text(if (state.settingUp2fa) "Configuring…" else "Set Up Two-Factor Auth", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                                }
                                            } else {
                                                OutlinedTextField(
                                                    value = state.twoFaCode,
                                                    onValueChange = viewModel::setTwoFaCode,
                                                    placeholder = { Text(stringResource(R.string.account_enter_6digit)) },
                                                    singleLine = true,
                                                    shape = RoundedCornerShape(10.dp),
                                                    modifier = Modifier.fillMaxWidth(),
                                                    colors = OutlinedTextFieldDefaults.colors(
                                                        focusedBorderColor = Color(0xFF3B82F6),
                                                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                                                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                                                        unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                                                    ),
                                                )
                                                Spacer(Modifier.height(8.dp))
                                                Button(
                                                    onClick = { viewModel.verify2fa() },
                                                    shape = RoundedCornerShape(12.dp),
                                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                                                    modifier = Modifier.fillMaxWidth().height(42.dp),
                                                ) {
                                                    Text(stringResource(R.string.account_verify_enable), fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                                }
                                            }
                                        } else {
                                            OutlinedTextField(
                                                value = state.twoFaCode,
                                                onValueChange = viewModel::setTwoFaCode,
                                                placeholder = { Text(stringResource(R.string.account_enter_6digit)) },
                                                singleLine = true,
                                                shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.fillMaxWidth(),
                                                colors = OutlinedTextFieldDefaults.colors(
                                                    focusedBorderColor = Color(0xFF3B82F6),
                                                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                                                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                                                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                                                ),
                                            )
                                            Spacer(Modifier.height(8.dp))
                                            OutlinedButton(
                                                onClick = { viewModel.disable2fa() },
                                                shape = RoundedCornerShape(12.dp),
                                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                                                border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.5f)),
                                                modifier = Modifier.fillMaxWidth().height(42.dp),
                                            ) {
                                                Text(stringResource(R.string.account_disable_2fa), fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                            }
                                        }
                                    }
                                }
                            }

                            // ── Active Sessions Section ──
                            item {
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        "Active Sessions (${state.sessions.size})",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Spacer(Modifier.weight(1f))
                                    if (state.sessions.size > 1) {
                                        TextButton(onClick = { viewModel.revokeAll() }) {
                                            Text(stringResource(R.string.account_revoke_all), color = Color(0xFFDC2626), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                }
                            }

                            if (state.sessions.isEmpty()) {
                                item {
                                    Text(
                                        stringResource(R.string.account_no_sessions),
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }

                            items(state.sessions, key = { it.stableId }) { session ->
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = MaterialTheme.colorScheme.surface,
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                                    shadowElevation = 1.dp,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Column(Modifier.padding(14.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                Modifier
                                                    .size(34.dp)
                                                    .clip(CircleShape)
                                                    .background(Color(0xFFDBEAFE)),
                                                contentAlignment = Alignment.Center,
                                            ) {
                                                Icon(Icons.Filled.DeviceHub, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                            }
                                            Spacer(Modifier.width(10.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(
                                                    session.displayDevice,
                                                    fontWeight = FontWeight.SemiBold,
                                                    fontSize = 13.sp,
                                                    color = MaterialTheme.colorScheme.onSurface,
                                                    maxLines = 1,
                                                )
                                                Text("IP: ${session.maskedIp}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                if (session.userAgent != null) {
                                                    Text(session.userAgent.take(50), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f), maxLines = 1)
                                                }
                                            }
                                            OutlinedButton(
                                                onClick = { session.sessionId?.let { viewModel.revokeSession(it) } },
                                                shape = RoundedCornerShape(8.dp),
                                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                                                border = BorderStroke(1.dp, Color(0xFFDC2626).copy(alpha = 0.4f)),
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                                modifier = Modifier.height(32.dp),
                                            ) {
                                                Text(stringResource(R.string.account_revoke), fontSize = 11.sp)
                                            }
                                        }
                                        if (session.lastActivity != null) {
                                            Spacer(Modifier.height(4.dp))
                                            Text(
                                                "Last active: ${session.lastActivity.take(16).replace("T", " ")}",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Layer 2: Floating Glassmorphic Top Bar
        AccountFloatingTopBar(
            title = "Security & Privacy",
            badgeText = "256-Bit SSL",
            badgeEmoji = "🔒",
            badgeColor = Color(0xFF2563EB),
            isDark = isDark,
            onBack = onBack,
        )
    }
}

@Composable
private fun SecureField(label: String, value: String, onValueChange: (String) -> Unit) {
    Column {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(3.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF3B82F6),
                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
            ),
        )
    }
}

// ─── AccountDeleteScreen ─────────────────────────────────────────────────────
data class DeleteAccountUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val confirmed: Boolean = false,
    val reason: String = "",
)

@HiltViewModel
class DeleteAccountViewModel @Inject constructor(private val repo: AccountRepository) : ViewModel() {
    private val _state = MutableStateFlow(DeleteAccountUiState())
    val state: StateFlow<DeleteAccountUiState> = _state.asStateFlow()
    fun setReason(v: String) { _state.value = _state.value.copy(reason = v) }
    fun confirm() { _state.value = _state.value.copy(confirmed = true) }
    fun cancel() { _state.value = _state.value.copy(confirmed = false) }
    fun delete(onDeleted: () -> Unit) {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.deleteAccount(_state.value.reason.ifBlank { null })) {
                is ApiResult.Success -> onDeleted()
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, confirmed = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun AccountDeleteScreen(onBack: () -> Unit, viewModel: DeleteAccountViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDarkTheme()

    val reasonOptions = listOf(
        "No longer using Zaruda",
        "Privacy or security concerns",
        "Opening a new account",
        "Active orders completed",
    )

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Layer 1: Atmospheric Canvas Backdrop
        AccountAtmosphericBackdrop(
            baseColors = if (isDark) listOf(Color(0xFF450A0A), Color(0xFF7F1D1D), Color(0xFF0F1422))
            else listOf(Color(0xFFDC2626), Color(0xFFB91C1C), Color(0xFF991B1B)),
            orb1Color = Color(0xFFEF4444),
            orb2Color = Color(0xFFF59E0B),
            isDark = isDark,
        )

        // Layer 3: 32dp Curved Content Sheet
        Column(Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    TactileDragHandle()

                    Column(
                        Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        // ── Escrow & Wallet Safeguard Notice ──
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = Color(0xFFFFF7ED),
                            border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f)),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                                Icon(Icons.Filled.Warning, null, tint = Color(0xFFD97706), modifier = Modifier.size(24.dp))
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(
                                        stringResource(R.string.account_permanent_action),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFF9A3412),
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        stringResource(R.string.account_delete_warning),
                                        fontSize = 12.sp,
                                        color = Color(0xFFC2410C),
                                        lineHeight = 16.sp,
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        "🛡️ Escrow Safeguard: Ensure all active transactions are resolved and your wallet balance has been withdrawn before proceeding. Unclaimed balances cannot be recovered.",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Color(0xFF9A3412),
                                    )
                                }
                            }
                        }

                        // ── Quick Reason Chips ──
                        Column {
                            Text(
                                "Reason for leaving (optional)",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Spacer(Modifier.height(6.dp))
                            reasonOptions.forEach { reason ->
                                Surface(
                                    onClick = { viewModel.setReason(reason) },
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (state.reason == reason) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                                    border = BorderStroke(
                                        1.dp,
                                        if (state.reason == reason) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                                    ),
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                                ) {
                                    Row(
                                        Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            if (state.reason == reason) "✓ " + reason else reason,
                                            fontSize = 12.sp,
                                            fontWeight = if (state.reason == reason) FontWeight.SemiBold else FontWeight.Normal,
                                            color = if (state.reason == reason) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface,
                                        )
                                    }
                                }
                            }
                        }

                        // ── Detailed Notes Field ──
                        Column {
                            Text(
                                stringResource(R.string.account_delete_reason),
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.height(4.dp))
                            OutlinedTextField(
                                value = state.reason,
                                onValueChange = viewModel::setReason,
                                placeholder = { Text(stringResource(R.string.account_delete_reason_hint), color = MaterialTheme.colorScheme.onSurfaceVariant) },
                                shape = RoundedCornerShape(12.dp),
                                maxLines = 3,
                                minLines = 2,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFFEF4444),
                                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                                ),
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }

                        state.error?.let {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFFEE2E2),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(
                                    it,
                                    color = Color(0xFFDC2626),
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(10.dp),
                                )
                            }
                        }

                        Spacer(Modifier.height(8.dp))

                        // ── Actions ──
                        if (!state.confirmed) {
                            Button(
                                onClick = { viewModel.confirm() },
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                            ) {
                                Icon(Icons.Filled.DeleteForever, null, tint = Color.White, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(stringResource(R.string.account_delete_btn), fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = Color(0xFFFEF2F2),
                                border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.5f)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        stringResource(R.string.account_delete_sure),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFF991B1B),
                                        textAlign = TextAlign.Center,
                                    )
                                    Spacer(Modifier.height(12.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        OutlinedButton(
                                            onClick = { viewModel.cancel() },
                                            modifier = Modifier.weight(1f).height(44.dp),
                                            shape = RoundedCornerShape(10.dp),
                                        ) {
                                            Text("Cancel")
                                        }
                                        Button(
                                            onClick = { viewModel.delete(onBack) },
                                            enabled = !state.loading,
                                            modifier = Modifier.weight(1f).height(44.dp),
                                            shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                                        ) {
                                            if (state.loading) {
                                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                                Spacer(Modifier.width(6.dp))
                                            }
                                            Text(if (state.loading) "Deleting…" else "Yes, Delete", fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Layer 2: Floating Glassmorphic Top Bar
        AccountFloatingTopBar(
            title = "Delete Account",
            badgeText = "Permanent",
            badgeEmoji = "⚠️",
            badgeColor = Color(0xFFEF4444),
            isDark = isDark,
            onBack = onBack,
        )
    }
}

// ─── VerificationScreen ──────────────────────────────────────────────────────
data class VerificationUiState(
    val loading: Boolean = true,
    val status: String? = null,
    val submitting: Boolean = false,
    val error: String? = null,
    val docType: String = "aadhaar",
    val docNumber: String = "",
)

@HiltViewModel
class VerificationViewModel @Inject constructor(private val repo: AccountRepository) : ViewModel() {
    private val _state = MutableStateFlow(VerificationUiState())
    val state: StateFlow<VerificationUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        when (val r = repo.verificationStatus()) {
            is ApiResult.Success -> _state.value = VerificationUiState(loading = false, status = r.data.status)
            is ApiResult.Failure -> _state.value = VerificationUiState(loading = false)
        }
    } }
    fun setDocType(v: String) { _state.value = _state.value.copy(docType = v) }
    fun setDocNumber(v: String) { _state.value = _state.value.copy(docNumber = v) }
    fun submit() {
        val s = _state.value
        if (s.docNumber.isBlank()) { _state.value = s.copy(error = "Document number is required"); return }
        _state.value = s.copy(submitting = true, error = null)
        viewModelScope.launch {
            when (val r = repo.requestVerification(VerificationRequest(docType = s.docType, docNumber = s.docNumber))) {
                is ApiResult.Success -> _state.value = VerificationUiState(loading = false, status = "pending")
                is ApiResult.Failure -> _state.value = s.copy(submitting = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun VerificationScreen(onBack: () -> Unit, viewModel: VerificationViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDarkTheme()

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Layer 1: Atmospheric Canvas Backdrop
        AccountAtmosphericBackdrop(
            baseColors = if (isDark) listOf(Color(0xFF064E3B), Color(0xFF0F172A), Color(0xFF022C22))
            else listOf(Color(0xFF059669), Color(0xFF047857), Color(0xFF065F46)),
            orb1Color = Color(0xFF10B981),
            orb2Color = Color(0xFF3B82F6),
            isDark = isDark,
        )

        // Layer 3: 32dp Curved Content Sheet
        Column(Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    TactileDragHandle()

                    if (state.loading) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                        }
                    } else {
                        when (state.status) {
                            "verified" -> {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .verticalScroll(rememberScrollState())
                                        .padding(24.dp),
                                ) {
                                    Spacer(Modifier.height(16.dp))
                                    Box(
                                        Modifier
                                            .size(80.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFDCFCE7)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(Icons.Filled.Verified, null, tint = Color(0xFF16A34A), modifier = Modifier.size(46.dp))
                                    }
                                    Spacer(Modifier.height(16.dp))
                                    Text(
                                        stringResource(R.string.account_verified_title),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 20.sp,
                                        color = Color(0xFF166534),
                                        textAlign = TextAlign.Center,
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        stringResource(R.string.account_verified_msg),
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        textAlign = TextAlign.Center,
                                        lineHeight = 18.sp,
                                    )
                                    Spacer(Modifier.height(20.dp))

                                    // Trust Breakdown Cards
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = MaterialTheme.colorScheme.surface,
                                        border = BorderStroke(1.dp, Color(0xFF22C55E).copy(alpha = 0.3f)),
                                        shadowElevation = 1.dp,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                            VerificationPerkRow("✓", "Official Escrow Trust Badge displayed on all listings")
                                            VerificationPerkRow("✓", "Instant penny-drop automated payouts unlocked")
                                            VerificationPerkRow("✓", "Priority buyer & seller dispute resolution desk")
                                        }
                                    }
                                }
                            }

                            "pending" -> {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .verticalScroll(rememberScrollState())
                                        .padding(24.dp),
                                ) {
                                    Spacer(Modifier.height(20.dp))
                                    Box(
                                        Modifier
                                            .size(72.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFFEF3C7)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(Icons.Filled.HourglassTop, null, tint = Color(0xFFD97706), modifier = Modifier.size(38.dp))
                                    }
                                    Spacer(Modifier.height(16.dp))
                                    Text(
                                        stringResource(R.string.account_pending_title),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 20.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        textAlign = TextAlign.Center,
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        stringResource(R.string.account_pending_msg),
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        textAlign = TextAlign.Center,
                                        lineHeight = 18.sp,
                                    )
                                    Spacer(Modifier.height(20.dp))

                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(
                                            Modifier.padding(14.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        ) {
                                            Text("⏱️", fontSize = 18.sp)
                                            Text(
                                                "Verification SLAs are typically 2-4 business hours. You will receive an instant notification upon approval.",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                    }
                                }
                            }

                            else -> {
                                Column(
                                    Modifier
                                        .fillMaxSize()
                                        .verticalScroll(rememberScrollState())
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(14.dp),
                                ) {
                                    // KYC Guarantee Banner
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = Color(0xFF059669).copy(alpha = 0.08f),
                                        border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(
                                            Modifier.padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        ) {
                                            Text("🏛️", fontSize = 22.sp)
                                            Column(Modifier.weight(1f)) {
                                                Text(
                                                    "Bank-Grade RBI KYC Compliance",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 12.sp,
                                                    color = Color(0xFF059669),
                                                )
                                                Text(
                                                    "Identity verification unlocks unlimited escrow transactions and the Zaruda Verified Seller Trust Shield.",
                                                    fontSize = 11.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    lineHeight = 15.sp,
                                                )
                                            }
                                        }
                                    }

                                    Text(
                                        stringResource(R.string.account_verify_submit_hint),
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )

                                    state.error?.let {
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Color(0xFFFEE2E2),
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Text(
                                                it,
                                                color = Color(0xFFDC2626),
                                                fontSize = 12.sp,
                                                modifier = Modifier.padding(10.dp),
                                            )
                                        }
                                    }

                                    Column {
                                        Text(
                                            "Select Document Type",
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurface,
                                        )
                                        Spacer(Modifier.height(6.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            listOf("aadhaar" to "Aadhaar Card", "pan" to "PAN Card", "passport" to "Passport").forEach { (key, label) ->
                                                FilterChip(
                                                    selected = state.docType == key,
                                                    onClick = { viewModel.setDocType(key) },
                                                    label = { Text(label, fontSize = 12.sp) },
                                                    shape = RoundedCornerShape(20.dp),
                                                    colors = FilterChipDefaults.filterChipColors(
                                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                                    ),
                                                )
                                            }
                                        }
                                    }

                                    Column {
                                        Text(
                                            "Document Number",
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurface,
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        OutlinedTextField(
                                            value = state.docNumber,
                                            onValueChange = viewModel::setDocNumber,
                                            placeholder = {
                                                Text(
                                                    when (state.docType) {
                                                        "aadhaar" -> "Enter 12-digit Aadhaar number"
                                                        "pan" -> "Enter 10-character PAN number"
                                                        else -> "Enter Passport number"
                                                    },
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            },
                                            shape = RoundedCornerShape(12.dp),
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = Color(0xFF3B82F6),
                                                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                                                focusedContainerColor = MaterialTheme.colorScheme.surface,
                                                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                                            ),
                                            modifier = Modifier.fillMaxWidth(),
                                        )
                                    }

                                    Spacer(Modifier.height(8.dp))

                                    Button(
                                        onClick = { viewModel.submit() },
                                        enabled = !state.submitting,
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                        modifier = Modifier.fillMaxWidth().height(48.dp),
                                    ) {
                                        if (state.submitting) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                                            Spacer(Modifier.width(8.dp))
                                        }
                                        Text(if (state.submitting) "Submitting…" else "Submit for Verification", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Layer 2: Floating Glassmorphic Top Bar
        AccountFloatingTopBar(
            title = "Government ID Verification",
            badgeText = "RBI KYC Safe",
            badgeEmoji = "🏛️",
            badgeColor = Color(0xFF059669),
            isDark = isDark,
            onBack = onBack,
        )
    }
}

@Composable
private fun VerificationPerkRow(check: String, perk: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(
            Modifier
                .size(20.dp)
                .clip(CircleShape)
                .background(Color(0xFFDCFCE7)),
            contentAlignment = Alignment.Center,
        ) {
            Text(check, color = Color(0xFF16A34A), fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
        Text(perk, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
    }
}

// ─── AnalyticsScreen ─────────────────────────────────────────────────────────
data class AnalyticsUiState(
    val loading: Boolean = true,
    val data: AnalyticsResponse? = null,
    val sellerStats: SellerAnalyticsResponse? = null,
    val postAnalytics: List<PostAnalytic> = emptyList(),
    val categoryAnalytics: List<CategoryAnalytic> = emptyList(),
    val error: String? = null,
    val timeRange: String = "30d",
)

@HiltViewModel
class AnalyticsViewModel @Inject constructor(private val repo: AnalyticsRepository) : ViewModel() {
    private val _state = MutableStateFlow(AnalyticsUiState())
    val state: StateFlow<AnalyticsUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true)
        val range = _state.value.timeRange
        when (val r = repo.get()) {
            is ApiResult.Success -> _state.value = _state.value.copy(data = r.data)
            is ApiResult.Failure -> {}
        }
        when (val r = repo.sellerStats(range)) {
            is ApiResult.Success -> _state.value = _state.value.copy(sellerStats = r.data)
            is ApiResult.Failure -> {}
        }
        when (val r = repo.postAnalytics(range)) {
            is ApiResult.Success -> _state.value = _state.value.copy(postAnalytics = r.data)
            is ApiResult.Failure -> {}
        }
        when (val r = repo.categoryAnalytics(range)) {
            is ApiResult.Success -> _state.value = _state.value.copy(categoryAnalytics = r.data)
            is ApiResult.Failure -> {}
        }
        _state.value = _state.value.copy(loading = false)
    } }
    fun setTimeRange(r: String) { _state.value = _state.value.copy(timeRange = r); load() }
}

@Composable
fun AnalyticsScreen(onBack: () -> Unit, viewModel: AnalyticsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDarkTheme()
    val ss = state.sellerStats
    val d = state.data
    val timeRanges = listOf("7d" to "7 Days", "30d" to "30 Days", "90d" to "90 Days", "all" to "All Time")

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Layer 1: Atmospheric Canvas Backdrop
        AccountAtmosphericBackdrop(
            baseColors = if (isDark) listOf(Color(0xFF1E1B4B), Color(0xFF312E81), Color(0xFF0F1422))
            else listOf(Color(0xFF4F46E5), Color(0xFF4338CA), Color(0xFF3730A3)),
            orb1Color = Color(0xFF8B5CF6),
            orb2Color = Color(0xFF059669),
            isDark = isDark,
        )

        // Layer 3: 32dp Curved Content Sheet
        Column(Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    TactileDragHandle()

                    if (state.loading) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            // ── Time Range Filter Chips ──
                            item {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    timeRanges.forEach { (key, label) ->
                                        FilterChip(
                                            selected = state.timeRange == key,
                                            onClick = { viewModel.setTimeRange(key) },
                                            label = { Text(label, fontSize = 11.sp) },
                                            shape = RoundedCornerShape(20.dp),
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                            ),
                                        )
                                    }
                                }
                            }

                            // ── Overview Stats (4-card grid) ──
                            item {
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    AStatCard(Modifier.weight(1f), "${ss?.totalViews ?: d?.postViews ?: 0}", "Total Views", Icons.Filled.Visibility, Color(0xFF8B5CF6))
                                    AStatCard(Modifier.weight(1f), "${ss?.totalInquiries ?: d?.profileVisits ?: 0}", "Inquiries", Icons.Filled.QuestionAnswer, Color(0xFF2563EB))
                                }
                            }

                            item {
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    AStatCard(Modifier.weight(1f), "${ss?.soldPosts ?: d?.totalSales ?: 0}", "Sold Posts", Icons.Filled.ShoppingCart, Color(0xFF22C55E))
                                    AStatCard(Modifier.weight(1f), "${ss?.activePosts ?: d?.totalListings ?: 0}", "Active Posts", Icons.AutoMirrored.Filled.List, Color(0xFFF59E0B))
                                }
                            }

                            // ── Revenue + Conversion Hero Card ──
                            item {
                                Surface(
                                    shape = RoundedCornerShape(18.dp),
                                    color = MaterialTheme.colorScheme.surface,
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                                    shadowElevation = 2.dp,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Column(Modifier.padding(16.dp)) {
                                        Text(
                                            stringResource(R.string.account_revenue),
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 14.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Spacer(Modifier.height(6.dp))
                                        Text(
                                            "₹${(ss?.totalRevenue ?: d?.totalRevenue ?: 0.0).toLong()}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 28.sp,
                                            color = Color(0xFF22C55E),
                                        )
                                        Spacer(Modifier.height(12.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                            Column {
                                                Text("Conversion", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(
                                                    "${"%.1f".format((ss?.conversionRate ?: d?.conversionRate ?: 0f) * 100)}%",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 15.sp,
                                                    color = Color(0xFF2563EB),
                                                )
                                            }
                                            Column {
                                                Text("Avg Rating", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(
                                                    "${"%.1f".format(ss?.avgRating ?: 0f)} ★",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 15.sp,
                                                    color = Color(0xFFF59E0B),
                                                )
                                            }
                                            Column {
                                                Text("Reviews", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(
                                                    "${ss?.totalReviews ?: 0}",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 15.sp,
                                                    color = MaterialTheme.colorScheme.onSurface,
                                                )
                                            }
                                        }

                                        // Simple Performance Funnel Chart
                                        Spacer(Modifier.height(14.dp))
                                        Text(
                                            stringResource(R.string.account_performance),
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurface,
                                        )
                                        Spacer(Modifier.height(8.dp))
                                        val maxVal = maxOf(ss?.totalViews ?: 1, ss?.totalInquiries ?: 1, ss?.soldPosts ?: 1, 1).toFloat()
                                        listOf(
                                            "Views" to (ss?.totalViews ?: d?.postViews ?: 0) to Color(0xFF8B5CF6),
                                            "Inquiries" to (ss?.totalInquiries ?: 0) to Color(0xFF2563EB),
                                            "Sales" to (ss?.soldPosts ?: d?.totalSales ?: 0) to Color(0xFF22C55E),
                                        ).forEach { (pair, color) ->
                                            val (label, value) = pair
                                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                                                Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(64.dp))
                                                Box(Modifier.weight(1f).height(16.dp).clip(RoundedCornerShape(4.dp)).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))) {
                                                    Box(Modifier.fillMaxHeight().fillMaxWidth((value / maxVal).coerceIn(0f, 1f)).clip(RoundedCornerShape(4.dp)).background(color))
                                                }
                                                Text("$value", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(40.dp).padding(start = 6.dp))
                                            }
                                        }
                                    }
                                }
                            }

                            // ── Post Analytics ──
                            if (state.postAnalytics.isNotEmpty()) {
                                item {
                                    Text(
                                        stringResource(R.string.account_post_performance),
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                }
                                items(state.postAnalytics.take(10), key = { it.postId ?: it.title ?: "" }) { pa ->
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = MaterialTheme.colorScheme.surface,
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                                        shadowElevation = 1.dp,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                Modifier
                                                    .size(32.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(Color(0xFFDCFCE7)),
                                                contentAlignment = Alignment.Center,
                                            ) {
                                                Icon(Icons.AutoMirrored.Filled.TrendingUp, null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                                            }
                                            Spacer(Modifier.width(10.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(pa.title ?: "Post", fontWeight = FontWeight.Medium, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
                                                Text("${pa.views} views · ${pa.inquiries} inquiries · ${pa.offers} offers", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }

                            // ── Category Analytics ──
                            if (state.categoryAnalytics.isNotEmpty()) {
                                item {
                                    Text(
                                        stringResource(R.string.account_category_breakdown),
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                }
                                items(state.categoryAnalytics, key = { it.category ?: "" }) { ca ->
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = MaterialTheme.colorScheme.surface,
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                                        shadowElevation = 1.dp,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Column(Modifier.weight(1f)) {
                                                Text(ca.category ?: "Category", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                                Text("${ca.listings} listings · ${ca.views} views · ${ca.sales} sales", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }

                            if (d != null && d.topPerforming.isNotEmpty()) {
                                item {
                                    Text(
                                        stringResource(R.string.account_top_listings),
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                }
                                items(d.topPerforming.take(5)) { post ->
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = MaterialTheme.colorScheme.surface,
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                                        shadowElevation = 1.dp,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                Modifier
                                                    .size(32.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(Color(0xFFDCFCE7)),
                                                contentAlignment = Alignment.Center,
                                            ) {
                                                Icon(Icons.AutoMirrored.Filled.TrendingUp, null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                                            }
                                            Spacer(Modifier.width(10.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(post.displayTitle, fontWeight = FontWeight.Medium, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
                                                if (post.viewCount != null) {
                                                    Text("${post.viewCount} views", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                }
                                            }
                                            if (post.price != null) {
                                                Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF2563EB))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Layer 2: Floating Glassmorphic Top Bar
        AccountFloatingTopBar(
            title = "Seller Analytics",
            badgeText = "Live Performance",
            badgeEmoji = "📈",
            badgeColor = Color(0xFF8B5CF6),
            isDark = isDark,
            onBack = onBack,
        )
    }
}

@Composable
private fun AStatCard(modifier: Modifier, value: String, label: String, icon: ImageVector, color: Color) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, color.copy(alpha = 0.2f)),
        shadowElevation = 2.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(color.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
