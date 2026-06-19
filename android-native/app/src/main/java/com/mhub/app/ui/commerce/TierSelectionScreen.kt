package com.mhub.app.ui.commerce

import android.content.Intent
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.common.LinkColor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class TiersViewModel @Inject constructor(
    private val repo: TiersRepository,
    private val rewardsRepo: RewardsRepository,
    private val tokenStore: com.mhub.app.data.local.TokenStore,
) : ViewModel() {
    private val _state = MutableStateFlow(TiersUiState())
    val state: StateFlow<TiersUiState> = _state.asStateFlow()

    init { load() }
    
    private fun load() {
        viewModelScope.launch {
            // Web Parity: Fetch latest pricing from server, fallback to 100rs plan
            when (val r = repo.list()) {
                is ApiResult.Success -> _state.value = TiersUiState(loading = false, tiers = r.data.ifEmpty { gatewayTiers })
                is ApiResult.Failure -> _state.value = TiersUiState(loading = false, tiers = gatewayTiers)
            }
            loadSubscriptionData()
            loadCoinBalance()
        }
    }

    private fun loadCoinBalance() {
        if (tokenStore.accessToken.value == null) return
        viewModelScope.launch {
            when (val r = rewardsRepo.overview()) {
                is ApiResult.Success -> _state.value = _state.value.copy(coinBalance = r.data.user.totalCoins)
                is ApiResult.Failure -> {}
            }
        }
    }

    private fun loadSubscriptionData() {
        if (tokenStore.accessToken.value == null) return
        viewModelScope.launch {
            _state.value = _state.value.copy(historyLoading = true)
            val mySub = repo.mySubscription()
            val history = repo.subscriptionHistory()
            _state.value = _state.value.copy(
                historyLoading = false,
                currentSubscription = (mySub as? ApiResult.Success)?.data?.subscription,
                subscriptionHistory = (history as? ApiResult.Success)?.data ?: emptyList(),
            )
        }
    }

    fun subscribe(tierId: String) {
        _state.value = _state.value.copy(subscribeLoading = tierId)
        viewModelScope.launch {
            // Web Parity: Subscribing to "Full Access" gateway
            when (val r = repo.subscribe(SubscribeRequest(tierId = tierId))) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(subscribeLoading = null, coinsApplied = 0)
                    loadSubscriptionData()
                    loadCoinBalance()
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(subscribeLoading = null, error = r.error.message)
                }
            }
        }
    }

    fun addMoneyToWallet(amount: Double) {
        _state.value = _state.value.copy(subscribeLoading = "wallet_add")
        viewModelScope.launch {
            // Simulated wallet top-up logic (Web Parity: /api/wallet/topup)
            delay(1500)
            subscribe("premium_gateway")
        }
    }

    fun claimTrial() {
        _state.value = _state.value.copy(subscribeLoading = "trial_claim")
        viewModelScope.launch {
            // Web Parity: 1-week free trial for any new user
            when (val r = repo.subscribe(SubscribeRequest(tierId = "trial_week"))) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(subscribeLoading = null)
                    loadSubscriptionData()
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(subscribeLoading = null, error = r.error.message)
                }
            }
        }
    }

    /** The restored comprehensive list of plans + new gateway */
    private val gatewayTiers = listOf(
        Tier(
            id = "premium_gateway",
            name = "Full Profile Access",
            price = 100.0,
            currency = "INR",
            duration = 90, // 3 months
            features = listOf(
                "✨ 3 Months Premium Status",
                "🆔 Verified Profile (KYC Included)",
                "✍️ Unlimited Post Creation",
                "📸 10 High-Res Photos per Listing",
                "💰 100 Coins Bonus Included",
                "🚫 Non-refundable / Non-withdrawable"
            ),
            popular = true
        ),
        Tier(
            id = "basic",
            name = "Basic",
            price = 500.0,
            currency = "INR",
            duration = 15,
            features = listOf("1 listing credit", "Standard reach", "15 days visibility", "1 photo per post"),
            popular = false
        ),
        Tier(
            id = "bronze",
            name = "Bronze",
            price = 850.0,
            currency = "INR",
            duration = 90,
            features = listOf("100 listings", "30 days visibility", "Seller badge", "3 photos per post", "Basic analytics"),
            popular = false
        ),
        Tier(
            id = "silver",
            name = "Silver",
            price = 1200.0,
            currency = "INR",
            duration = 180,
            features = listOf("200 listings", "Boosts & featured", "Verified badge", "5 photos per post", "7-day free trial", "Chat support"),
            popular = false
        ),
        Tier(
            id = "premium",
            name = "Premium",
            price = 1500.0,
            currency = "INR",
            duration = 365,
            features = listOf("Unlimited listings", "45 days visibility", "Crown badge", "10 photos per post", "Priority support", "14-day free trial", "Custom storefront"),
            popular = false
        )
    )
}


@Composable
fun TierSelectionScreen(onBack: () -> Unit, viewModel: TiersViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()
    val context = LocalContext.current
    
    val bgGrad = if (isDark) Brush.verticalGradient(listOf(Color(0xFF0F1422), Color(0xFF131B2E), Color(0xFF152035)))
        else Brush.verticalGradient(listOf(Color(0xFFF8FAFC), Color(0xFFEFF6FF), Color(0xFFF0F9FF)))
    
    Box(Modifier.fillMaxSize().background(bgGrad)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Premium Gateway", onBack)
            
            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            } else {
                LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                    // Gateway Hero Section
                    item {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                            Surface(shape = CircleShape, color = Color(0xFFF59E0B).copy(alpha = 0.12f), modifier = Modifier.size(72.dp)) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                    Icon(Icons.Default.WorkspacePremium, null, tint = Color(0xFFD97706), modifier = Modifier.size(36.dp))
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                            Text("Membership Plans", fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, color = if (isDark) Color.White else Color(0xFF1E1B4B))
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Unlock the full potential of MHub with a flexible plan that fits your selling needs.",
                                fontSize = 14.sp, color = if (isDark) Color(0xFF94A3B8) else Color(0xFF475569),
                                textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 12.dp)
                            )
                        }
                    }

                    // Trial period offer for new users
                    item {
                        val isPromoActive = com.mhub.app.core.FreeLaunchPlan.isActive()
                        if (isPromoActive) {
                            Surface(shape = RoundedCornerShape(16.dp), color = if (isDark) Color(0xFF062010) else Color(0xFFECFDF5), border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.3f))) {
                                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("🎉", fontSize = 24.sp)
                                    Column(Modifier.weight(1f)) {
                                        Text("Free Launch Offer!", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (isDark) Color(0xFF4ADE80) else Color(0xFF065F46))
                                        Text("Post & sell FREE until ${com.mhub.app.core.FreeLaunchPlan.endDateLabel()}!", fontSize = 12.sp, color = if (isDark) Color(0xFF86EFAC) else Color(0xFF047857))
                                    }
                                }
                            }
                        } else if (state.currentSubscription == null) {
                            Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFFEFF6FF), border = BorderStroke(1.dp, Color(0xFF2563EB).copy(alpha = 0.2f))) {
                                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(Modifier.size(40.dp).clip(CircleShape).background(Color.White), contentAlignment = Alignment.Center) {
                                        Text("🎁", fontSize = 20.sp)
                                    }
                                    Column(Modifier.weight(1f)) {
                                        Text("New User Special", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E40AF))
                                        Text("Get 1 Week Premium Access for FREE!", fontSize = 12.sp, color = Color(0xFF1D4ED8))
                                    }
                                    Button(
                                        onClick = { viewModel.claimTrial() },
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.height(36.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp)
                                    ) {
                                        if (state.subscribeLoading == "trial_claim") CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                                        else Text("Claim", fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    }

                    // List all plans from state
                    items(state.tiers, key = { it.id ?: it.name ?: "" }) { tier ->
                        TierCard(
                            tier = tier,
                            perPostCost = when (tier.id) {
                                "basic" -> "₹500/post"
                                "bronze" -> "₹8.50/post"
                                "silver" -> "₹6/post"
                                "premium" -> "Unlimited"
                                "premium_gateway" -> "₹1.11/day"
                                else -> ""
                            },
                            coinBalance = state.coinBalance,
                            maxDiscountPct = when (tier.id?.lowercase()) { "premium", "silver" -> 30; else -> 50 },
                            isLoading = state.subscribeLoading == tier.id,
                            onSelect = {
                                if (tier.id == "premium_gateway") viewModel.addMoneyToWallet(100.0)
                                else viewModel.subscribe(tier.id ?: "")
                            },
                        )
                    }

                    // Notice section
                    item {
                        Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFFFEF2F2).copy(alpha = 0.5f), border = BorderStroke(1.dp, Color(0xFFFCA5A5).copy(alpha = 0.3f))) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Icon(Icons.Default.Info, null, tint = Color(0xFFDC2626), modifier = Modifier.size(20.dp))
                                Text(
                                    "Wallet balance added for plan activation is non-refundable and cannot be withdrawn.",
                                    style = MaterialTheme.typography.bodySmall, color = Color(0xFF991B1B)
                                )
                            }
                        }
                    }

                    // Why KYC?
                    item {
                        Text("Why Full Access?", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(top = 8.dp))
                        Spacer(Modifier.height(12.dp))
                        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White)) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                ReasonRow("Trust", "KYC verified users get 5x more responses.", "🛡️")
                                ReasonRow("Unlimited", "Post as many items as you want.", "📦")
                                ReasonRow("Support", "Direct access to expert chat.", "🎧")
                            }
                        }
                    }
                    
                    item { Spacer(Modifier.height(100.dp)) }
                }
            }
        }
    }
}

@Composable
private fun ReasonRow(title: String, desc: String, emoji: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
            Text(emoji, fontSize = 20.sp)
        }
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(desc, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun TierCard(tier: Tier, perPostCost: String, coinBalance: Int, maxDiscountPct: Int, isLoading: Boolean, onSelect: () -> Unit) {
    val isPopular = tier.popular
    val cardColors = if (isPopular) {
        listOf(Color(0xFF1E40AF), Color(0xFF2563EB), Color(0xFF3B82F6))
    } else null

    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (isPopular) Color.Transparent else Color.White,
        border = if (!isPopular) BorderStroke(1.dp, Color(0xFFE2E8F0)) else null,
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = if (isPopular) 8.dp else 3.dp,
    ) {
        Box(
            modifier = if (isPopular) Modifier.background(Brush.linearGradient(cardColors!!)).padding(1.dp) else Modifier,
        ) {
            Column(
                Modifier
                    .then(if (isPopular) Modifier.background(Color(0xFFF0F9FF), RoundedCornerShape(19.dp)) else Modifier)
                    .padding(20.dp)
            ) {
                if (isPopular) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(bottom = 12.dp)) {
                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF2563EB)) {
                            Row(Modifier.padding(horizontal = 10.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(Icons.Filled.Star, null, tint = Color(0xFFFBBF24), modifier = Modifier.size(12.dp))
                                Text(stringResource(R.string.plans_recommended), fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFDCFCE7)) {
                            Text("BEST VALUE", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                    }
                }
                Row(verticalAlignment = Alignment.Bottom) {
                    Column(Modifier.weight(1f)) {
                        Text(tier.name ?: "", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF0F172A))
                        if (tier.duration > 0) {
                            val durationText = when {
                                tier.duration >= 365 -> "${tier.duration / 365} year"
                                tier.duration >= 30 -> "${tier.duration / 30} months"
                                else -> "${tier.duration} days"
                            }
                            Text(durationText, fontSize = 12.sp, color = Color(0xFF64748B))
                        }
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        if (tier.price == 0.0) {
                            Text(stringResource(R.string.plans_free), fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, color = Color(0xFF22C55E))
                        } else {
                            Text("₹${tier.price.toLong()}", fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, color = if (isPopular) Color(0xFF1E40AF) else Color(0xFF0F172A))
                            val period = when {
                                tier.duration >= 365 -> stringResource(R.string.plans_per_year)
                                tier.duration >= 180 -> stringResource(R.string.plans_per_half_year)
                                tier.duration >= 90 -> stringResource(R.string.plans_per_quarter)
                                else -> stringResource(R.string.plans_per_listing)
                            }
                            Text(period, fontSize = 11.sp, color = Color(0xFF94A3B8))
                        }
                    }
                }
                // Per-post cost badge
                if (perPostCost.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFECFDF5)) {
                        Text("⚡ $perPostCost", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF059669), modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                    }
                }
                // Coin discount hint
                if (coinBalance > 0 && tier.price > 0) {
                    Spacer(Modifier.height(4.dp))
                    val maxSave = (tier.price * maxDiscountPct / 100.0).toLong().coerceAtMost(coinBalance.toLong())
                    Text("🪙 Save up to ₹$maxSave with your coins ($maxDiscountPct% max)", fontSize = 10.sp, color = Color(0xFFB45309))
                }
                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = if (isPopular) Color(0xFFBFDBFE) else Color(0xFFF1F5F9))
                Spacer(Modifier.height(14.dp))
                tier.features.forEach { feature ->
                    Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = CircleShape, color = Color(0xFFDCFCE7), modifier = Modifier.size(20.dp)) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Icon(Icons.Filled.Check, null, tint = Color(0xFF16A34A), modifier = Modifier.size(12.dp))
                            }
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(feature, fontSize = 13.sp, color = Color(0xFF374151), lineHeight = 18.sp)
                    }
                }
                Spacer(Modifier.height(18.dp))
                Button(
                    onClick = onSelect,
                    enabled = !isLoading,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isPopular) Color(0xFF2563EB) else Color(0xFF0F172A),
                    ),
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = if (isPopular) 6.dp else 2.dp),
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                    } else {
                        Text(
                            if (tier.price == 0.0) stringResource(R.string.plans_get_started_free) else stringResource(R.string.plans_subscribe_now),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                        )
                        if (isPopular) {
                            Spacer(Modifier.width(8.dp))
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Color.White, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}
