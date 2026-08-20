package com.zaruda.app.ui.commerce

import android.content.Intent
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.zaruda.app.R
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.ui.theme.ColorTokens
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import com.razorpay.Checkout

// ──────────────────────────────────────────────────────────────────────────────
// TiersViewModel (unchanged — lives here because TiersUiState is in EditPostScreen.kt)
// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class TiersViewModel @Inject constructor(
    private val repo: TiersRepository,
    private val paymentsRepo: PaymentsRepository,
    private val rewardsRepo: RewardsRepository,
    private val tokenStore: com.zaruda.app.data.local.TokenStore,
) : ViewModel() {
    private val _state = MutableStateFlow(TiersUiState())
    val state: StateFlow<TiersUiState> = _state.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
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

    // ── Razorpay Checkout ────────────────────────────────────────────────
    private val _checkoutEvent = Channel<RazorpayCheckoutEvent>(Channel.BUFFERED)
    val checkoutEvent: Flow<RazorpayCheckoutEvent> = _checkoutEvent.receiveAsFlow()

    private val _verifyResult = MutableStateFlow<RazorpayVerifyState?>(null)
    val verifyResult: StateFlow<RazorpayVerifyState?> = _verifyResult.asStateFlow()

    data class RazorpayCheckoutEvent(
        val orderId: String,
        val amount: Double,
        val currency: String,
        val keyId: String,
        val tierId: String,
        val prefillEmail: String = "",
        val prefillContact: String = "",
    )

    sealed class RazorpayVerifyState {
        data class Success(val message: String, val title: String = "✅ Payment Successful!") : RazorpayVerifyState()
        data class Failure(val error: String) : RazorpayVerifyState()
    }

    fun setCoinsToApply(coins: Int) {
        _state.value = _state.value.copy(coinsToApply = coins, error = null)
    }

    fun initiateRazorpayCheckout(tierId: String, amount: Double) {
        val coinsToApply = _state.value.coinsToApply
        _state.value = _state.value.copy(subscribeLoading = tierId, error = null)
        viewModelScope.launch {
            when (val r = paymentsRepo.createRazorpayOrder(amount = amount, tierId = tierId, coinsToApply = coinsToApply)) {
                is ApiResult.Success -> {
                    val order = r.data
                    val orderId = order.orderId
                    val keyId = order.keyId
                    if (orderId != null && keyId != null) {
                        _checkoutEvent.send(
                            RazorpayCheckoutEvent(
                                orderId = orderId,
                                amount = order.amount,
                                currency = order.currency,
                                keyId = keyId,
                                tierId = tierId,
                            )
                        )
                    } else {
                        _state.value = _state.value.copy(
                            subscribeLoading = null,
                            error = "Failed to create payment order. Missing order ID."
                        )
                    }
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(
                        subscribeLoading = null,
                        error = r.error.message ?: "Failed to initiate payment"
                    )
                }
            }
        }
    }

    fun verifyRazorpayPayment(
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
    ) {
        viewModelScope.launch {
            _verifyResult.value = null
            when (val r = paymentsRepo.verifyRazorpayPayment(
                orderId = razorpayOrderId,
                paymentId = razorpayPaymentId,
                signature = razorpaySignature,
            )) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(subscribeLoading = null, coinsApplied = 0)
                    _verifyResult.value = RazorpayVerifyState.Success(
                        "Payment verified! Your plan is now active."
                    )
                    loadSubscriptionData()
                    loadCoinBalance()
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(subscribeLoading = null)
                    _verifyResult.value = RazorpayVerifyState.Failure(
                        r.error.message ?: "Payment verification failed"
                    )
                }
            }
        }
    }

    fun dismissVerifyResult() {
        _verifyResult.value = null
    }

    fun addMoneyToWallet(amount: Double) {
        _state.value = _state.value.copy(subscribeLoading = "wallet_add")
        viewModelScope.launch {
            kotlinx.coroutines.delay(1500)
            subscribe("premium_gateway")
        }
    }

    /** The restored comprehensive list of plans + new gateway */
    private val gatewayTiers = listOf(
        Tier(
            id = "starter",
            name = "Starter Plan",
            price = 111.0,
            currency = "INR",
            duration = 30,
            features = listOf(
                "✨ 1 Month Access (30 Days)",
                "📸 1 Photo per Post",
                "✍️ 1 Post Per Day",
                "💰 100 Coins Bonus on Activation",
                "🆔 KYC Verification Included",
                "🛡️ Inclusive of GST & all fees"
            ),
            popular = true
        ),
        Tier(
            id = "basic",
            name = "Basic",
            price = 500.0,
            currency = "INR",
            duration = 30,
            features = listOf(
                "📄 1 Post Credit",
                "⏱️ 30 Days Visibility",
                "📸 1 Photo per Post",
                "✍️ 1 Post Per Day"
            ),
            popular = false
        ),
        Tier(
            id = "bronze",
            name = "Bronze",
            price = 850.0,
            currency = "INR",
            duration = 90,
            features = listOf(
                "📦 Up to 100 Posts",
                "⏱️ 30 Days Visibility/Post",
                "📸 1 Photo per Post",
                "✍️ 1 Post Per Day",
                "🏅 Seller Badge",
                "📊 Basic Analytics"
            ),
            popular = false
        ),
        Tier(
            id = "silver",
            name = "Silver",
            price = 1200.0,
            currency = "INR",
            duration = 180,
            features = listOf(
                "📦 Up to 200 Posts",
                "⏱️ 30 Days Visibility/Post",
                "📸 3 Photos per Post",
                "✍️ 1 Post Per Day",
                "🚀 5 Boosts + 5 Featured + 5 Spotlights / 6 Months",
                "✅ Verified Badge",
                "🔝 Priority Search Ranking",
                "📊 Full Analytics Dashboard"
            ),
            popular = false
        ),
        Tier(
            id = "gold",
            name = "Gold",
            price = 1500.0,
            currency = "INR",
            duration = 270,
            features = listOf(
                "📦 Up to 500 Posts",
                "⏱️ 30 Days Visibility/Post",
                "📸 5 Photos per Post",
                "✍️ 2 Posts Per Day",
                "🚀 5 Boosts + 5 Featured + 5 Spotlights / 9 Months",
                "🥇 Gold Badge",
                "🔝 Top Search Priority",
                "📊 Full Analytics Dashboard"
            ),
            popular = true
        ),
        Tier(
            id = "premium",
            name = "Premium",
            price = 1800.0,
            currency = "INR",
            duration = 365,
            features = listOf(
                "📦 Unlimited Posts",
                "⏱️ 45 Days Visibility",
                "🔥 10 Photos per Post",
                "🔥 5x Coin Valuation (100c = ₹5.00)",
                "🚀 10 Boosts + 10 Featured + 10 Spotlights/Month",
                "👑 Crown Badge & Priority Support",
                "🔝 Top of Feed Priority",
                "📊 Full Analytics Dashboard"
            ),
            popular = false
        )
    )
}


// ──────────────────────────────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun TierSelectionScreen(onBack: () -> Unit, viewModel: TiersViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    val activity = context as? android.app.Activity
    val verifyState by viewModel.verifyResult.collectAsState()
    val scope = rememberCoroutineScope()

    // Razorpay checkout observer
    LaunchedEffect(Unit) {
        viewModel.checkoutEvent.collect { event ->
            if (activity != null) {
                try {
                    val checkout = Checkout()
                    checkout.setKeyID(event.keyId)
                    val options = JSONObject().apply {
                        put("key", event.keyId)
                        put("amount", (event.amount * 100).toLong())
                        put("currency", event.currency)
                        put("order_id", event.orderId)
                        put("name", "Zaruda Marketplace")
                        put("description", "Plan: ${event.tierId}")
                        put("theme", JSONObject().apply { put("color", "#3B82F6") })
                        put("prefill", JSONObject().apply {
                            put("email", event.prefillEmail)
                            put("contact", event.prefillContact)
                        })
                    }
                    if (activity is com.zaruda.app.MainActivity) {
                        activity.onRazorpayCallback = { paymentId, response ->
                            val orderId = response.optString("razorpay_order_id", "")
                            val paymentId2 = response.optString("razorpay_payment_id", "")
                            val signature = response.optString("razorpay_signature", "")
                            if (orderId.isNotBlank() && paymentId2.isNotBlank() && signature.isNotBlank()) {
                                viewModel.verifyRazorpayPayment(orderId, paymentId2, signature)
                            }
                        }
                    }
                    checkout.open(activity, options)
                } catch (e: Exception) {
                    android.util.Log.e("Razorpay", "Checkout error: ${e.message}")
                }
            }
        }
    }

    // Payment verification result dialog
    verifyState?.let { vState ->
        when (vState) {
            is TiersViewModel.RazorpayVerifyState.Success -> {
                AlertDialog(
                    onDismissRequest = { viewModel.dismissVerifyResult() },
                    title = { Text(vState.title, fontWeight = FontWeight.Bold) },
                    text = { Text(vState.message, fontSize = 14.sp, color = ColorTokens.TextSecondary) },
                    confirmButton = {
                        Button(onClick = { viewModel.dismissVerifyResult() }) { Text("Great!") }
                    },
                )
            }
            is TiersViewModel.RazorpayVerifyState.Failure -> {
                AlertDialog(
                    onDismissRequest = { viewModel.dismissVerifyResult() },
                    title = { Text("❌ Payment Failed", fontWeight = FontWeight.Bold) },
                    text = { Text(vState.error, fontSize = 14.sp, color = ColorTokens.RedText) },
                    confirmButton = {
                        Button(onClick = { viewModel.dismissVerifyResult() }) { Text("OK") }
                    },
                )
            }
        }
    }

    Box(Modifier.fillMaxSize().background(ColorTokens.Background)) {
        Column(Modifier.fillMaxSize()) {
            // ── Top Bar ─────────────────────────────────────────────────────
            ScreenTopBar("Premium Gateway", onBack)

            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(bottom = 120.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                ) {
                    // ── Hero Section ────────────────────────────────────────
                    item { PlanHeroSection() }

                    // ── Current Subscription Banner ─────────────────────────
                    state.currentSubscription?.let { sub ->
                        item { CurrentPlanBanner(sub) }
                    }

                    // ── Feature Comparison Table ────────────────────────────
                    item {
                        ComparisonTable(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp)
                        )
                    }

                    // ── Plan Cards ──────────────────────────────────────────
                    items(state.tiers, key = { it.id ?: it.name ?: "" }) { tier ->
                        TierCardEnhanced(
                            tier = tier,
                            perPostCost = when (tier.id) {
                                "basic" -> "₹500/post"
                                "bronze" -> "₹8.50/post"
                                "silver" -> "₹6/post"
                                "gold" -> "₹3/post"
                                "premium" -> "No per-post cost"
                                "starter" -> "Taste Premium"
                                else -> ""
                            },
                            coinBalance = state.coinBalance,
                            coinsToApply = state.coinsToApply,
                            maxDiscountPct = when (tier.id?.lowercase()) { "premium", "silver", "gold" -> 30; else -> 50 },
                            isLoading = state.subscribeLoading == tier.id,
                            onSelect = {
                                val tId = tier.id ?: ""
                                if (tier.price > 0) {
                                    viewModel.initiateRazorpayCheckout(tId, tier.price)
                                } else {
                                    viewModel.subscribe(tId)
                                }
                            },
                            onCoinsChange = { viewModel.setCoinsToApply(it) },
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                    }

                    // ── Promo Code ──────────────────────────────────────────
                    item { PromoCodeSection(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) }

                    // ── Non-refundable notice ───────────────────────────────
                    item {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = ColorTokens.RedContainer,
                            border = BorderStroke(1.dp, ColorTokens.RedText.copy(alpha = 0.3f)),
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        ) {
                            Row(
                                Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Icon(Icons.Default.Info, null, tint = ColorTokens.RedText, modifier = Modifier.size(20.dp))
                                Text(
                                    "Wallet balance added for plan activation is non-refundable and cannot be withdrawn.",
                                    style = MaterialTheme.typography.bodySmall, color = ColorTokens.RedText,
                                )
                            }
                        }
                    }

                    // ── Why Full Access ─────────────────────────────────────
                    item { WhyFullAccessSection(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) }

                    // ── FAQ ─────────────────────────────────────────────────
                    item { FaqSection(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) }
                }
            }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Hero Section
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun PlanHeroSection() {
    val isDark = ColorTokens.isDark
    val infiniteTransition = rememberInfiniteTransition(label = "hero")
    val shimmer by infiniteTransition.animateFloat(
        initialValue = 0.6f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(2000, easing = LinearEasing), RepeatMode.Reverse),
        label = "shimmer",
    )

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    if (isDark) listOf(Color(0xFF1A1145), Color(0xFF0F172A))
                    else listOf(Color(0xFF3B82F6), Color(0xFF6366F1))
                )
            )
            .padding(vertical = 36.dp, horizontal = 24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // Animated premium icon
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .shadow(12.dp, CircleShape)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.WorkspacePremium, null,
                    tint = Color.White.copy(alpha = shimmer),
                    modifier = Modifier.size(44.dp),
                )
            }

            Spacer(Modifier.height(20.dp))

            Text(
                "Membership Plans",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 28.sp,
                color = Color.White,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Unlock the full potential of Zaruda\nwith a plan that fits your selling needs.",
                fontSize = 14.sp,
                color = Color.White.copy(alpha = 0.85f),
                textAlign = TextAlign.Center,
                lineHeight = 20.sp,
            )

            Spacer(Modifier.height(20.dp))

            // Quick stats row
            Row(
                horizontalArrangement = Arrangement.spacedBy(24.dp),
                modifier = Modifier.padding(top = 4.dp),
            ) {
                HeroStat("6", "Plans")
                HeroStat("₹111", "Starting")
                HeroStat("45d", "Max Visibility")
            }
        }
    }
}

@Composable
private fun HeroStat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color.White)
        Text(label, fontSize = 11.sp, color = Color.White.copy(alpha = 0.7f))
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Current Plan Banner
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun CurrentPlanBanner(sub: SubscriptionRecord) {
    val isDark = ColorTokens.isDark
    val tierColor = when (sub.tier?.lowercase()) {
        "premium" -> Color(0xFF7C3AED)
        "gold" -> Color(0xFFDAA520)
        "silver" -> Color(0xFF64748B)
        "bronze" -> Color(0xFFEA580C)
        "starter" -> Color(0xFFF59E0B)
        else -> Color(0xFF3B82F6)
    }
    val isActive = sub.status?.lowercase() == "active"

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (isDark) tierColor.copy(alpha = 0.12f) else tierColor.copy(alpha = 0.08f),
        border = BorderStroke(1.dp, tierColor.copy(alpha = 0.3f)),
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Surface(
                shape = CircleShape,
                color = tierColor.copy(alpha = 0.15f),
                modifier = Modifier.size(44.dp),
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(Icons.Default.Verified, null, tint = tierColor, modifier = Modifier.size(24.dp))
                }
            }
            Column(Modifier.weight(1f)) {
                Text(
                    "Current Plan: ${sub.tier?.replaceFirstChar { it.uppercase() } ?: "Active"}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = ColorTokens.TextHeading,
                )
                sub.expiresAt?.take(10)?.let { exp ->
                    Text("Expires: $exp", fontSize = 12.sp, color = ColorTokens.TextSecondary)
                }
            }
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = if (isActive) ColorTokens.VerifiedGreen.copy(alpha = 0.15f)
                        else ColorTokens.AmberText.copy(alpha = 0.15f),
            ) {
                Text(
                    if (isActive) "Active" else sub.status?.uppercase() ?: "—",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isActive) ColorTokens.VerifiedGreen else ColorTokens.AmberText,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Feature Comparison Table
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun ComparisonTable(modifier: Modifier = Modifier) {
    val isDark = ColorTokens.isDark
    val headerBg = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9)
    val cellBg = if (isDark) Color(0xFF0F172A) else Color.White
    val borderColor = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)
    val highlightBg = if (isDark) Color(0xFF1A1145).copy(alpha = 0.3f) else Color(0xFFEEF2FF)
    val checkColor = ColorTokens.VerifiedGreen
    val crossColor = ColorTokens.TextMuted

    val plans = listOf("Starter", "Basic", "Bronze", "Silver", "Gold", "Premium")
    val planIds = listOf("starter", "basic", "bronze", "silver", "gold", "premium")

    data class FeatureRow(val label: String, val values: List<String>)
    val rows = listOf(
        FeatureRow("Price", listOf("₹111", "₹500", "₹850", "₹1,200", "₹1,500", "₹1,800")),
        FeatureRow("Duration", listOf("1 mo", "1 listing", "3 mo", "6 mo", "9 mo", "12 mo")),
        FeatureRow("Max Posts", listOf("1/day", "1", "100", "200", "500", "∞")),
        FeatureRow("Photos/Post", listOf("1", "1", "1", "3", "5", "10")),
        FeatureRow("Posts/Day", listOf("1", "1", "1", "1", "2", "2")),
        FeatureRow("Visibility", listOf("30d", "30d", "30d", "30d", "30d", "45d")),
        FeatureRow("Boosts", listOf("—", "—", "—", "5/6mo", "5/9mo", "10/mo")),
        FeatureRow("Featured", listOf("—", "—", "—", "5/6mo", "5/9mo", "10/mo")),
        FeatureRow("Spotlights", listOf("—", "—", "—", "5/6mo", "5/9mo", "10/mo")),
        FeatureRow("Badge", listOf("—", "—", "🏅", "✅", "🥇", "👑")),
        FeatureRow("Analytics", listOf("—", "—", "Basic", "Full", "Full", "Full")),
        FeatureRow("Priority Search", listOf("—", "—", "—", "✓", "✓", "✓")),
        FeatureRow("Priority Support", listOf("—", "—", "—", "—", "✓", "✓")),
        FeatureRow("Per-Post Cost", listOf("Free", "₹500", "₹8.50", "₹6", "₹3", "Free")),
    )

    Column(modifier) {
        Text(
            "Compare Plans",
            fontWeight = FontWeight.Bold,
            fontSize = 20.sp,
            color = ColorTokens.TextHeading,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "See what each plan offers at a glance",
            fontSize = 13.sp,
            color = ColorTokens.TextSecondary,
        )
        Spacer(Modifier.height(16.dp))

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = cellBg,
            border = BorderStroke(1.dp, borderColor),
            shadowElevation = 2.dp,
        ) {
            Column {
                // Header row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                ) {
                    // Feature label column
                    Box(
                        Modifier
                            .width(100.dp)
                            .background(headerBg)
                            .padding(horizontal = 8.dp, vertical = 10.dp)
                    ) {
                        Text("Feature", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = ColorTokens.TextHeading)
                    }
                    // Plan header columns
                    plans.forEachIndexed { idx, name ->
                        Box(
                            Modifier
                                .width(72.dp)
                                .background(if (planIds[idx] == "gold") highlightBg else headerBg)
                                .padding(horizontal = 4.dp, vertical = 10.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(name, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = ColorTokens.TextHeading)
                                if (planIds[idx] == "gold") {
                                    Text("★", fontSize = 8.sp, color = ColorTokens.AmberText)
                                }
                            }
                        }
                    }
                }

                HorizontalDivider(color = borderColor)

                // Data rows
                rows.forEach { row ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                    ) {
                        Box(
                            Modifier
                                .width(100.dp)
                                .padding(horizontal = 8.dp, vertical = 8.dp)
                        ) {
                            Text(row.label, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = ColorTokens.TextBody)
                        }
                        row.values.forEachIndexed { idx, value ->
                            Box(
                                Modifier
                                    .width(72.dp)
                                    .background(if (planIds[idx] == "gold") highlightBg else Color.Transparent)
                                    .padding(horizontal = 4.dp, vertical = 8.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    value,
                                    fontSize = 10.sp,
                                    fontWeight = if (value == "✓" || value == "∞") FontWeight.Bold else FontWeight.Normal,
                                    color = when {
                                        value == "✓" -> checkColor
                                        value == "—" -> crossColor
                                        value == "∞" -> ColorTokens.VerifiedGreen
                                        else -> ColorTokens.TextBody
                                    },
                                    textAlign = TextAlign.Center,
                                )
                            }
                        }
                    }
                    HorizontalDivider(color = borderColor.copy(alpha = 0.5f))
                }
            }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Enhanced Tier Card
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun TierCardEnhanced(
    tier: Tier,
    perPostCost: String,
    coinBalance: Int,
    coinsToApply: Int = 0,
    maxDiscountPct: Int,
    isLoading: Boolean,
    onSelect: () -> Unit,
    onCoinsChange: (Int) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val isDark = ColorTokens.isDark
    val tierId = tier.id?.lowercase() ?: ""

    // Theme for each tier
    data class TierTheme(
        val headerGradient: Brush,
        val headerTextColor: Color,
        val subtextColor: Color,
        val containerBg: Color,
        val buttonColor: Color,
        val buttonTextColor: Color,
        val borderStroke: BorderStroke?,
        val badgeBg: Color,
        val badgeTextColor: Color,
        val accentColor: Color,
    )

    val theme = when (tierId) {
        "starter" -> TierTheme(
            headerGradient = Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFF97316))),
            headerTextColor = ColorTokens.CardAmberText,
            subtextColor = ColorTokens.CardAmberSubtext,
            containerBg = ColorTokens.CardAmberSurface,
            buttonColor = ColorTokens.CardAmberButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(if (isDark) 1.dp else 2.dp, ColorTokens.CardAmberBorder),
            badgeBg = ColorTokens.CardAmberBadge,
            badgeTextColor = ColorTokens.CardAmberBadgeText,
            accentColor = Color(0xFFF59E0B),
        )
        "basic" -> TierTheme(
            headerGradient = Brush.horizontalGradient(listOf(Color(0xFF64748B), Color(0xFF475569))),
            headerTextColor = ColorTokens.CardGrayText,
            subtextColor = ColorTokens.CardGraySubtext,
            containerBg = ColorTokens.CardGraySurface,
            buttonColor = ColorTokens.CardGrayButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(1.dp, ColorTokens.CardGrayBorder),
            badgeBg = ColorTokens.CardGrayBadge,
            badgeTextColor = ColorTokens.CardGrayBadgeText,
            accentColor = Color(0xFF64748B),
        )
        "bronze" -> TierTheme(
            headerGradient = Brush.horizontalGradient(listOf(Color(0xFFEA580C), Color(0xFFF97316))),
            headerTextColor = ColorTokens.CardOrangeText,
            subtextColor = ColorTokens.CardOrangeSubtext,
            containerBg = ColorTokens.CardOrangeSurface,
            buttonColor = ColorTokens.CardOrangeButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(1.dp, ColorTokens.CardOrangeBorder),
            badgeBg = ColorTokens.CardOrangeBadge,
            badgeTextColor = ColorTokens.CardOrangeBadgeText,
            accentColor = Color(0xFFEA580C),
        )
        "silver" -> TierTheme(
            headerGradient = Brush.horizontalGradient(listOf(Color(0xFF64748B), Color(0xFF334155))),
            headerTextColor = ColorTokens.CardSlateText,
            subtextColor = ColorTokens.CardSlateSubtext,
            containerBg = ColorTokens.CardSlateSurface,
            buttonColor = ColorTokens.CardSlateButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(1.dp, ColorTokens.CardSlateBorder),
            badgeBg = ColorTokens.CardSlateBadge,
            badgeTextColor = ColorTokens.CardSlateBadgeText,
            accentColor = Color(0xFF475569),
        )
        "gold" -> TierTheme(
            headerGradient = Brush.horizontalGradient(listOf(Color(0xFFDAA520), Color(0xFFB8860B))),
            headerTextColor = ColorTokens.CardAmberText,
            subtextColor = ColorTokens.CardAmberSubtext,
            containerBg = ColorTokens.CardAmberSurface,
            buttonColor = ColorTokens.CardAmberButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(if (isDark) 1.dp else 2.dp, ColorTokens.CardAmberBorder),
            badgeBg = ColorTokens.CardAmberBadge,
            badgeTextColor = ColorTokens.CardAmberBadgeText,
            accentColor = Color(0xFFDAA520),
        )
        "premium" -> TierTheme(
            headerGradient = Brush.horizontalGradient(listOf(Color(0xFF7C3AED), Color(0xFF6D28D9))),
            headerTextColor = ColorTokens.CardPurpleText,
            subtextColor = ColorTokens.CardPurpleSubtext,
            containerBg = ColorTokens.CardPurpleSurface,
            buttonColor = ColorTokens.CardPurpleButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(1.dp, ColorTokens.CardPurpleBorder),
            badgeBg = ColorTokens.CardPurpleBadge,
            badgeTextColor = ColorTokens.CardPurpleBadgeText,
            accentColor = Color(0xFF7C3AED),
        )
        else -> TierTheme(
            headerGradient = Brush.horizontalGradient(listOf(Color(0xFF64748B), Color(0xFF475569))),
            headerTextColor = ColorTokens.CardGrayText,
            subtextColor = ColorTokens.CardGraySubtext,
            containerBg = ColorTokens.CardGraySurface,
            buttonColor = ColorTokens.CardGrayButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(1.dp, ColorTokens.CardGrayBorder),
            badgeBg = ColorTokens.CardGrayBadge,
            badgeTextColor = ColorTokens.CardGrayBadgeText,
            accentColor = Color(0xFF64748B),
        )
    }

    Surface(
        shape = RoundedCornerShape(24.dp),
        color = theme.containerBg,
        border = theme.borderStroke,
        modifier = modifier.fillMaxWidth(),
        shadowElevation = if (tierId == "gold" || tierId == "premium") 6.dp else 2.dp,
    ) {
        Column {
            // Gradient header with price + name
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(theme.headerGradient)
                    .padding(20.dp),
            ) {
                Column {
                    // Badges row
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(bottom = 12.dp),
                    ) {
                        if (tierId == "gold") {
                            Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.25f)) {
                                Row(
                                    Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Icon(Icons.Filled.Star, null, tint = Color.White, modifier = Modifier.size(12.dp))
                                    Text("MOST POPULAR", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                        if (tierId == "starter") {
                            Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.25f)) {
                                Row(
                                    Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Icon(Icons.Filled.LocalOffer, null, tint = Color.White, modifier = Modifier.size(12.dp))
                                    Text("BEST VALUE", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                        if (tierId == "premium") {
                            Surface(shape = RoundedCornerShape(20.dp), color = Color.White.copy(alpha = 0.25f)) {
                                Row(
                                    Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Icon(Icons.Filled.EmojiEvents, null, tint = Color.White, modifier = Modifier.size(12.dp))
                                    Text("FULL POWER", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    // Name + Duration
                    Text(tier.name ?: "", fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Color.White)
                    if (tier.duration > 0) {
                        val durationText = when {
                            tier.duration >= 365 -> "${tier.duration / 365} year"
                            tier.duration >= 30 -> "${tier.duration / 30} month"
                            else -> "${tier.duration} days"
                        }
                        Text(durationText, fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                    }

                    Spacer(Modifier.height(16.dp))

                    // Price row
                    Row(verticalAlignment = Alignment.Bottom) {
                        if (tier.price == 0.0) {
                            Text("FREE", fontWeight = FontWeight.ExtraBold, fontSize = 32.sp, color = Color.White)
                        } else {
                            Text("₹${tier.price.toLong()}", fontWeight = FontWeight.ExtraBold, fontSize = 32.sp, color = Color.White)
                            Spacer(Modifier.width(6.dp))
                            Column(modifier = Modifier.padding(bottom = 4.dp)) {
                                val period = when {
                                    tier.duration >= 365 -> "/year"
                                    tier.duration >= 180 -> "/6 months"
                                    tier.duration >= 90 -> "/quarter"
                                    else -> "/listing"
                                }
                                Text(period, fontSize = 13.sp, color = Color.White.copy(alpha = 0.75f))
                            }
                        }
                    }

                    // Per-post cost badge
                    if (perPostCost.isNotEmpty()) {
                        Spacer(Modifier.height(10.dp))
                        Surface(shape = RoundedCornerShape(8.dp), color = Color.White.copy(alpha = 0.2f)) {
                            Text(
                                "⚡ $perPostCost",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            )
                        }
                    }
                }
            }

            // Card body
            Column(Modifier.padding(20.dp)) {
                // Coin discount slider
                if (coinBalance > 0 && tier.price > 0) {
                    val maxCoinDiscount = (tier.price * maxDiscountPct / 100.0).toInt().coerceAtMost(coinBalance)
                    val discountedPrice = (tier.price - coinsToApply).coerceAtLeast(0.0)

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = ColorTokens.CardAmberBadge.copy(alpha = 0.15f),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Default.MonetizationOn, null, tint = ColorTokens.AmberText, modifier = Modifier.size(16.dp))
                                    Text("Coins", fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = ColorTokens.CardAmberText)
                                }
                                Text(
                                    "$coinsToApply / $maxCoinDiscount",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = if (coinsToApply > 0) ColorTokens.VerifiedGreen else ColorTokens.CardAmberText,
                                )
                            }
                            Spacer(Modifier.height(4.dp))
                            Slider(
                                value = coinsToApply.toFloat(),
                                onValueChange = { onCoinsChange(it.toInt().coerceIn(0, maxCoinDiscount)) },
                                valueRange = 0f..maxCoinDiscount.toFloat(),
                                steps = if (maxCoinDiscount > 1) maxCoinDiscount - 1 else 0,
                                modifier = Modifier.fillMaxWidth().height(24.dp),
                                colors = SliderDefaults.colors(
                                    thumbColor = ColorTokens.AmberText,
                                    activeTrackColor = ColorTokens.AmberText,
                                    inactiveTrackColor = ColorTokens.CardAmberBadge.copy(alpha = 0.3f),
                                ),
                            )
                            if (coinsToApply > 0) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text("You save ₹$coinsToApply", fontWeight = FontWeight.SemiBold, fontSize = 11.sp, color = ColorTokens.VerifiedGreen)
                                    Text("₹${tier.price.toLong()} → ₹${discountedPrice.toLong()}", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = ColorTokens.CardAmberText)
                                }
                            } else {
                                Text("Slide to use coins and save up to ₹$maxCoinDiscount", fontSize = 10.sp, color = ColorTokens.CardAmberSubtext)
                            }
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }

                // Features list
                tier.features.forEach { feature ->
                    Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = CircleShape, color = theme.badgeBg, modifier = Modifier.size(22.dp)) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Icon(Icons.Filled.Check, null, tint = theme.badgeTextColor, modifier = Modifier.size(13.dp))
                            }
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(feature, fontSize = 13.sp, color = theme.headerTextColor.copy(alpha = 0.9f), fontWeight = FontWeight.Medium, lineHeight = 18.sp)
                    }
                }

                Spacer(Modifier.height(20.dp))

                // Subscribe button
                Button(
                    onClick = onSelect,
                    enabled = !isLoading,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = theme.buttonColor,
                        disabledContainerColor = theme.buttonColor.copy(alpha = 0.5f),
                    ),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = if (tierId == "gold") 6.dp else 2.dp),
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
                    } else {
                        Text(
                            if (tier.price == 0.0) "Get Started Free" else "Subscribe Now",
                            color = theme.buttonTextColor,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                        )
                        if (tierId == "gold" || tierId == "starter" || tierId == "premium") {
                            Spacer(Modifier.width(8.dp))
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Color.White, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Promo Code Section
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun PromoCodeSection(modifier: Modifier = Modifier) {
    val isDark = ColorTokens.isDark
    var promoCode by remember { mutableStateOf("") }
    var promoApplied by remember { mutableStateOf(false) }
    var promoError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = ColorTokens.CardSurface,
        border = BorderStroke(1.dp, ColorTokens.Divider),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.LocalOffer, null, tint = ColorTokens.AmberText, modifier = Modifier.size(20.dp))
                Text("Have a promo code?", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = ColorTokens.TextHeading)
            }
            Spacer(Modifier.height(10.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = promoCode,
                    onValueChange = { promoCode = it.uppercase(); promoError = null },
                    placeholder = { Text("Enter code", color = ColorTokens.TextMuted) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = ColorTokens.AmberText,
                        unfocusedBorderColor = ColorTokens.Divider,
                        focusedContainerColor = ColorTokens.CardSurface,
                        unfocusedContainerColor = ColorTokens.CardSurface,
                    ),
                    modifier = Modifier.weight(1f).height(48.dp),
                )
                Button(
                    onClick = {
                        scope.launch {
                            promoApplied = false
                            promoError = null
                            // Simulated promo validation (server handles real validation)
                            delay(800)
                            val validCodes = listOf("LAUNCH50", "WELCOME20", "SILVER10", "BRONZE15")
                            if (promoCode in validCodes) {
                                promoApplied = true
                            } else {
                                promoError = "Invalid promo code"
                            }
                        }
                    },
                    enabled = promoCode.isNotBlank() && !promoApplied,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ColorTokens.AmberText,
                        disabledContainerColor = ColorTokens.AmberText.copy(alpha = 0.4f),
                    ),
                    modifier = Modifier.height(48.dp),
                ) {
                    if (promoApplied) {
                        Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    } else {
                        Text("Apply", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                    }
                }
            }
            if (promoApplied) {
                Spacer(Modifier.height(8.dp))
                Text("✅ Promo code applied! Discount will show at checkout.", fontSize = 12.sp, color = ColorTokens.VerifiedGreen)
            }
            promoError?.let {
                Spacer(Modifier.height(4.dp))
                Text(it, fontSize = 12.sp, color = ColorTokens.RedText)
            }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Why Full Access Section
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun WhyFullAccessSection(modifier: Modifier = Modifier) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = ColorTokens.CardSurface,
        border = BorderStroke(1.dp, ColorTokens.Divider),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(20.dp)) {
            Text("Why Full Access?", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = ColorTokens.TextHeading)
            Spacer(Modifier.height(16.dp))

            data class Reason(val title: String, val desc: String, val emoji: String, val color: Color)
            val reasons = listOf(
                Reason("Trust", "KYC verified sellers get 5x more responses from buyers.", "🛡️", Color(0xFF3B82F6)),
                Reason("Visibility", "Your listings appear higher in search results with priority ranking.", "🔍", Color(0xFF8B5CF6)),
                Reason("Unlimited", "Post as many items as you want — no daily or monthly limits.", "📦", Color(0xFF22C55E)),
                Reason("Analytics", "Track views, clicks, and conversions with a full analytics dashboard.", "📊", Color(0xFFF59E0B)),
                Reason("Support", "Direct access to priority expert support when you need it.", "🎧", Color(0xFFEC4899)),
            )

            reasons.forEach { reason ->
                Row(
                    Modifier.padding(vertical = 8.dp),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = reason.color.copy(alpha = 0.12f),
                        modifier = Modifier.size(40.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text(reason.emoji, fontSize = 18.sp)
                        }
                    }
                    Column {
                        Text(reason.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ColorTokens.TextHeading)
                        Text(reason.desc, fontSize = 12.sp, color = ColorTokens.TextSecondary, lineHeight = 16.sp)
                    }
                }
            }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// FAQ Section
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun FaqSection(modifier: Modifier = Modifier) {
    data class Faq(val question: String, val answer: String)
    val faqs = listOf(
        Faq("How do plans work?", "Plans give you posting privileges for a set duration. Higher tiers unlock more posts, photos, boosts, and priority features."),
        Faq("Can I upgrade my plan?", "Yes! You can upgrade to a higher tier at any time. You'll only pay the difference."),
        Faq("What happens when my plan expires?", "Your listing privileges reset to basic. Existing active listings remain visible until their expiry date."),
        Faq("Are coins transferable?", "Coins earned on the platform can be used to get discounts on plan purchases. They cannot be withdrawn as cash."),
        Faq("Is the Starter Plan really ₹111?", "Yes! The Starter Plan is an affordable way to experience premium features for 30 days, including KYC verification."),
    )

    var expandedIndex by remember { mutableIntStateOf(-1) }

    Surface(
        shape = RoundedCornerShape(20.dp),
        color = ColorTokens.CardSurface,
        border = BorderStroke(1.dp, ColorTokens.Divider),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.HelpOutline, null, tint = ColorTokens.BlueText, modifier = Modifier.size(22.dp))
                Text("Frequently Asked Questions", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = ColorTokens.TextHeading)
            }
            Spacer(Modifier.height(16.dp))

            faqs.forEachIndexed { index, faq ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { expandedIndex = if (expandedIndex == index) -1 else index }
                        .animateContentSize()
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            faq.question,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = ColorTokens.TextHeading,
                            modifier = Modifier.weight(1f),
                        )
                        Icon(
                            if (expandedIndex == index) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            null,
                            tint = ColorTokens.TextSecondary,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    if (expandedIndex == index) {
                        Text(
                            faq.answer,
                            fontSize = 13.sp,
                            color = ColorTokens.TextSecondary,
                            lineHeight = 18.sp,
                            modifier = Modifier.padding(bottom = 12.dp),
                        )
                    }
                    if (index < faqs.lastIndex) {
                        HorizontalDivider(color = ColorTokens.Divider)
                    }
                }
            }
        }
    }
}
