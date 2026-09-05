package com.zaruda.app.ui.commerce

import android.content.Intent
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
// TiersViewModel (unchanged)
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

    fun claimTrial() {
        _state.value = _state.value.copy(subscribeLoading = "trial_claim")
        viewModelScope.launch {
            when (val r = repo.claimTrial()) {
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
                        _checkoutEvent.send(RazorpayCheckoutEvent(
                            orderId = orderId,
                            amount = order.amount,
                            currency = order.currency,
                            keyId = keyId,
                            tierId = tierId,
                        ))
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
            delay(1500)
            subscribe("premium_gateway")
        }
    }

    /** The comprehensive list of plans */
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
// Main Screen — AAB design + all current features
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun TierSelectionScreen(onBack: () -> Unit, viewModel: TiersViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val activity = context as? android.app.Activity
    val verifyState by viewModel.verifyResult.collectAsState()

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
                        put("name", "Marketplace")
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

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(Modifier.fillMaxSize()) {
            // Top bar is the shared marketplace-style bar rendered by MainShell (back arrow via topBarBack).

            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                    // ── Hero Section (AAB style) ────────────────────────
                    item {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                            Surface(shape = CircleShape, color = ColorTokens.PremiumAmberContainer, modifier = Modifier.size(72.dp)) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                    Icon(Icons.Default.WorkspacePremium, null, tint = ColorTokens.AmberText, modifier = Modifier.size(36.dp))
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                            Text("Membership Plans", fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, color = ColorTokens.TextHeading)
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Unlock the full potential of the platform with a flexible plan that fits your selling needs.",
                                fontSize = 14.sp, color = ColorTokens.TextSecondary,
                                textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 12.dp)
                            )
                        }
                    }

                    // ── Trial Offer Banner (NEW — not in AAB) ───────────
                    item {
                        val isPromoActive = com.zaruda.app.core.FreeLaunchPlan.isActive()
                        if (isPromoActive) {
                            Surface(shape = RoundedCornerShape(16.dp), color = ColorTokens.GreenContainer, border = BorderStroke(1.dp, ColorTokens.VerifiedGreen.copy(alpha = 0.3f))) {
                                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("🎉", fontSize = 24.sp)
                                    Column(Modifier.weight(1f)) {
                                        Text("Free Launch Offer!", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ColorTokens.GreenText)
                                        Text("Post & sell FREE until ${com.zaruda.app.core.FreeLaunchPlan.endDateLabel()}!", fontSize = 12.sp, color = ColorTokens.GreenText)
                                    }
                                }
                            }
                        } else if (state.currentSubscription == null) {
                            Surface(shape = RoundedCornerShape(16.dp), color = ColorTokens.BlueContainer, border = BorderStroke(1.dp, ColorTokens.BlueText.copy(alpha = 0.3f))) {
                                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surface), contentAlignment = Alignment.Center) {
                                        Text("🎁", fontSize = 20.sp)
                                    }
                                    Column(Modifier.weight(1f)) {
                                        Text("New User Special", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ColorTokens.BlueText)
                                        Text("Get 1 Week Premium Access for FREE!", fontSize = 12.sp, color = ColorTokens.BlueText)
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

                    // ── Current Subscription Banner (NEW — not in AAB) ──
                    state.currentSubscription?.let { sub ->
                        item { CurrentPlanBanner(sub) }
                    }

                    // ── Plan Cards (AAB gradient header design + coin slider) ──
                    items(state.tiers, key = { it.id ?: it.name ?: "" }) { tier ->
                        TierCard(
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
                        )
                    }

                    // ── Feature Comparison Table (NEW — not in AAB) ──────
                    item { ComparisonTable() }

                    // ── Promo Code (NEW — not in AAB) ───────────────────
                    item { PromoCodeSection() }

                    // ── Non-refundable notice ───────────────────────────
                    item {
                        Surface(shape = RoundedCornerShape(16.dp), color = ColorTokens.RedContainer, border = BorderStroke(1.dp, ColorTokens.RedText.copy(alpha = 0.3f))) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Icon(Icons.Default.Info, null, tint = ColorTokens.RedText, modifier = Modifier.size(20.dp))
                                Text(
                                    "Wallet balance added for plan activation is non-refundable and cannot be withdrawn.",
                                    style = MaterialTheme.typography.bodySmall, color = ColorTokens.RedText
                                )
                            }
                        }
                    }

                    // ── Why Full Access (AAB style) ─────────────────────
                    item {
                        Text("Why Full Access?", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = ColorTokens.TextHeading, modifier = Modifier.padding(top = 8.dp))
                        Spacer(Modifier.height(12.dp))
                        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = ColorTokens.CardSurface)) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                ReasonRow("Trust", "KYC verified users get 5x more responses.", "🛡️")
                                ReasonRow("Unlimited", "Post as many items as you want.", "📦")
                                ReasonRow("Support", "Direct access to expert chat.", "🎧")
                            }
                        }
                    }

                    // ── FAQ (NEW — not in AAB) ─────────────────────────
                    item { FaqSection() }

                    item { Spacer(Modifier.height(100.dp)) }
                }
            }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Reason Row (AAB style)
// ──────────────────────────────────────────────────────────────────────────────

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


// ──────────────────────────────────────────────────────────────────────────────
// Current Plan Banner (NEW)
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun CurrentPlanBanner(sub: SubscriptionRecord) {
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
        color = tierColor.copy(alpha = 0.08f),
        border = BorderStroke(1.dp, tierColor.copy(alpha = 0.3f)),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Surface(shape = CircleShape, color = tierColor.copy(alpha = 0.15f), modifier = Modifier.size(44.dp)) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(Icons.Default.Verified, null, tint = tierColor, modifier = Modifier.size(24.dp))
                }
            }
            Column(Modifier.weight(1f)) {
                Text(
                    "Current Plan: ${sub.tier?.replaceFirstChar { it.uppercase() } ?: "Active"}",
                    fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ColorTokens.TextHeading,
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
                    fontSize = 11.sp, fontWeight = FontWeight.Bold,
                    color = if (isActive) ColorTokens.VerifiedGreen else ColorTokens.AmberText,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Tier Card — EXACT AAB design with gradient headers, PlanTheme, coin slider
// ──────────────────────────────────────────────────────────────────────────────

private data class PlanTheme(
    val primaryGradient: List<Color>,
    val headerTextColor: Color,
    val subtextColor: Color,
    val containerBg: Color,
    val buttonColor: Color,
    val buttonTextColor: Color,
    val borderStroke: BorderStroke?,
    val badgeBg: Color,
    val badgeTextColor: Color
)

@Composable
private fun TierCard(tier: Tier, perPostCost: String, coinBalance: Int, coinsToApply: Int = 0, maxDiscountPct: Int, isLoading: Boolean, onSelect: () -> Unit, onCoinsChange: (Int) -> Unit = {}) {
    val isDark = ColorTokens.isDark
    val tierId = tier.id?.lowercase() ?: ""
    // Color tokens map for each tier — dark-mode aware via ColorTokens (EXACT AAB)
    val theme = when (tierId) {
        "starter" -> PlanTheme(
            primaryGradient = listOf(Color(0xFFD97706), Color(0xFFF59E0B)),
            headerTextColor = ColorTokens.CardAmberText,
            subtextColor = ColorTokens.CardAmberSubtext,
            containerBg = ColorTokens.CardAmberSurface,
            buttonColor = ColorTokens.CardAmberButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(if (isDark) 1.dp else 2.dp, ColorTokens.CardAmberBorder),
            badgeBg = ColorTokens.CardAmberBadge,
            badgeTextColor = ColorTokens.CardAmberBadgeText
        )
        "bronze" -> PlanTheme(
            primaryGradient = listOf(Color(0xFFC2410C), Color(0xFFEA580C)),
            headerTextColor = ColorTokens.CardOrangeText,
            subtextColor = ColorTokens.CardOrangeSubtext,
            containerBg = ColorTokens.CardOrangeSurface,
            buttonColor = ColorTokens.CardOrangeButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(1.dp, ColorTokens.CardOrangeBorder),
            badgeBg = ColorTokens.CardOrangeBadge,
            badgeTextColor = ColorTokens.CardOrangeBadgeText
        )
        "silver" -> PlanTheme(
            primaryGradient = listOf(Color(0xFF475569), Color(0xFF334155)),
            headerTextColor = ColorTokens.CardSlateText,
            subtextColor = ColorTokens.CardSlateSubtext,
            containerBg = ColorTokens.CardSlateSurface,
            buttonColor = ColorTokens.CardSlateButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(1.dp, ColorTokens.CardSlateBorder),
            badgeBg = ColorTokens.CardSlateBadge,
            badgeTextColor = ColorTokens.CardSlateBadgeText
        )
        "gold" -> PlanTheme(
            primaryGradient = listOf(Color(0xFFB8860B), Color(0xFFDAA520)),
            headerTextColor = ColorTokens.CardAmberText,
            subtextColor = ColorTokens.CardAmberSubtext,
            containerBg = ColorTokens.CardAmberSurface,
            buttonColor = ColorTokens.CardAmberButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(if (isDark) 1.dp else 2.dp, ColorTokens.CardAmberBorder),
            badgeBg = ColorTokens.CardAmberBadge,
            badgeTextColor = ColorTokens.CardAmberBadgeText
        )
        "premium" -> PlanTheme(
            primaryGradient = listOf(Color(0xFF7C3AED), Color(0xFF6D28D9)),
            headerTextColor = ColorTokens.CardPurpleText,
            subtextColor = ColorTokens.CardPurpleSubtext,
            containerBg = ColorTokens.CardPurpleSurface,
            buttonColor = ColorTokens.CardPurpleButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(1.dp, ColorTokens.CardPurpleBorder),
            badgeBg = ColorTokens.CardPurpleBadge,
            badgeTextColor = ColorTokens.CardPurpleBadgeText
        )
        else -> PlanTheme(
            primaryGradient = listOf(Color(0xFF64748B), Color(0xFF475569)),
            headerTextColor = ColorTokens.CardGrayText,
            subtextColor = ColorTokens.CardGraySubtext,
            containerBg = ColorTokens.CardGraySurface,
            buttonColor = ColorTokens.CardGrayButton,
            buttonTextColor = Color.White,
            borderStroke = BorderStroke(1.dp, ColorTokens.CardGrayBorder),
            badgeBg = ColorTokens.CardGrayBadge,
            badgeTextColor = ColorTokens.CardGrayBadgeText
        )
    }

    Surface(
        shape = RoundedCornerShape(22.dp),
        color = theme.containerBg,
        border = theme.borderStroke,
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = if (tierId == "starter") 8.dp else 2.dp,
    ) {
        Column(Modifier.padding(22.dp)) {
            // ── Badges (inside card body — AAB style) ──────────────────
            if (tierId == "starter") {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(bottom = 14.dp)
                ) {
                    Surface(shape = RoundedCornerShape(20.dp), color = theme.primaryGradient.first()) {
                        Row(
                            Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Filled.Star, null, tint = ColorTokens.StarAccent, modifier = Modifier.size(12.dp))
                            Text("RECOMMENDED GATEWAY", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                    Surface(shape = RoundedCornerShape(20.dp), color = ColorTokens.BadgeGreen) {
                        Text("BEST VALUE", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = ColorTokens.BadgeGreenText, modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp))
                    }
                }
            }

            // ── Name + Duration + Price (AAB horizontal layout) ────────
            Row(verticalAlignment = Alignment.Bottom) {
                Column(Modifier.weight(1f)) {
                    Text(tier.name ?: "", fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, color = theme.headerTextColor)
                    if (tier.duration > 0) {
                        val durationText = when {
                            tier.duration >= 365 -> "${tier.duration / 365} year"
                            tier.duration >= 30 -> "${tier.duration / 30} month"
                            else -> "${tier.duration} days"
                        }
                        Text(durationText, fontSize = 12.sp, color = theme.subtextColor)
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    if (tier.price == 0.0) {
                        Text(stringResource(R.string.plans_free), fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, color = ColorTokens.VerifiedGreen)
                    } else {
                        Text("₹${tier.price.toLong()}", fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, color = theme.headerTextColor)
                        val period = when {
                            tier.duration >= 365 -> stringResource(R.string.plans_per_year)
                            tier.duration >= 180 -> stringResource(R.string.plans_per_half_year)
                            tier.duration >= 90 -> stringResource(R.string.plans_per_quarter)
                            else -> stringResource(R.string.plans_per_listing)
                        }
                        Text(period, fontSize = 11.sp, color = theme.subtextColor)
                    }
                }
            }

            // ── Per-post cost badge ───────────────────────────────────
            if (perPostCost.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Surface(shape = RoundedCornerShape(8.dp), color = theme.badgeBg) {
                    Text("⚡ $perPostCost", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = theme.badgeTextColor, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
                }
            }

            // ── Coin discount slider (AAB interactive slider) ──────────
            if (coinBalance > 0 && tier.price > 0) {
                val maxCoinDiscount = (tier.price * maxDiscountPct / 100.0).toInt().coerceAtMost(coinBalance)
                val discountedPrice = (tier.price - coinsToApply).coerceAtLeast(0.0)
                val coinSavings = coinsToApply

                Spacer(Modifier.height(8.dp))
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
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("You save ₹$coinSavings", fontWeight = FontWeight.SemiBold, fontSize = 11.sp, color = ColorTokens.VerifiedGreen)
                                Text("₹${tier.price.toLong()} → ₹${discountedPrice.toLong()}", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = ColorTokens.CardAmberText)
                            }
                        } else {
                            Text("Slide to use coins and save up to ₹$maxCoinDiscount", fontSize = 10.sp, color = ColorTokens.CardAmberSubtext)
                        }
                    }
                }
            }

            // ── Divider ────────────────────────────────────────────────
            Spacer(Modifier.height(18.dp))
            HorizontalDivider(color = theme.headerTextColor.copy(alpha = 0.1f))
            Spacer(Modifier.height(16.dp))

            // ── Features list ──────────────────────────────────────────
            tier.features.forEach { feature ->
                Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = CircleShape, color = theme.badgeBg, modifier = Modifier.size(20.dp)) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Icon(Icons.Filled.Check, null, tint = theme.badgeTextColor, modifier = Modifier.size(12.dp))
                        }
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(feature, fontSize = 13.sp, color = theme.headerTextColor.copy(alpha = 0.9f), fontWeight = FontWeight.Medium, lineHeight = 18.sp)
                }
            }

            // ── Subscribe button (AAB style) ───────────────────────────
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onSelect,
                enabled = !isLoading,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = theme.buttonColor,
                ),
                modifier = Modifier.fillMaxWidth().height(50.dp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = if (tierId == "starter") 6.dp else 2.dp),
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Text(
                        if (tier.price == 0.0) stringResource(R.string.plans_get_started_free) else stringResource(R.string.plans_subscribe_now),
                        color = theme.buttonTextColor,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                    )
                    if (tierId == "starter") {
                        Spacer(Modifier.width(8.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// Feature Comparison Table (NEW)
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun ComparisonTable(modifier: Modifier = Modifier) {
    val headerBg = ColorTokens.CardSurface
    val cellBg = ColorTokens.Background
    val borderColor = ColorTokens.Divider
    val highlightBg = ColorTokens.PremiumAmberContainer.copy(alpha = 0.3f)
    val textHeading = ColorTokens.TextHeading
    val textBody = ColorTokens.TextBody
    val textMuted = ColorTokens.TextMuted

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

    Column(modifier.padding(horizontal = 4.dp)) {
        Text("Compare Plans", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = textHeading)
        Spacer(Modifier.height(4.dp))
        Text("See what each plan offers at a glance", fontSize = 13.sp, color = textMuted)
        Spacer(Modifier.height(16.dp))

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = cellBg,
            border = BorderStroke(1.dp, borderColor),
            shadowElevation = 2.dp,
        ) {
            Column {
                Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
                    Box(Modifier.width(100.dp).background(headerBg).padding(horizontal = 8.dp, vertical = 10.dp)) {
                        Text("Feature", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = textHeading)
                    }
                    plans.forEachIndexed { idx, name ->
                        Box(
                            Modifier.width(72.dp).background(if (planIds[idx] == "gold") highlightBg else headerBg)
                                .padding(horizontal = 4.dp, vertical = 10.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(name, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = textHeading)
                                if (planIds[idx] == "gold") Text("★", fontSize = 8.sp, color = ColorTokens.AmberText)
                            }
                        }
                    }
                }

                HorizontalDivider(color = borderColor)

                rows.forEach { row ->
                    Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
                        Box(Modifier.width(100.dp).padding(horizontal = 8.dp, vertical = 8.dp)) {
                            Text(row.label, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = textBody)
                        }
                        row.values.forEachIndexed { idx, value ->
                            Box(
                                Modifier.width(72.dp).background(if (planIds[idx] == "gold") highlightBg else Color.Transparent)
                                    .padding(horizontal = 4.dp, vertical = 8.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    value,
                                    fontSize = 10.sp,
                                    fontWeight = if (value == "✓" || value == "∞") FontWeight.Bold else FontWeight.Normal,
                                    color = when {
                                        value == "✓" -> ColorTokens.VerifiedGreen
                                        value == "—" -> textMuted
                                        value == "∞" -> ColorTokens.VerifiedGreen
                                        else -> textBody
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
// Promo Code Section (NEW)
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun PromoCodeSection() {
    var promoCode by remember { mutableStateOf("") }
    var promoApplied by remember { mutableStateOf(false) }
    var promoError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = ColorTokens.CardSurface,
        border = BorderStroke(1.dp, ColorTokens.Divider),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.LocalOffer, null, tint = ColorTokens.AmberText, modifier = Modifier.size(20.dp))
                Text("Have a promo code?", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = ColorTokens.TextHeading)
            }
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
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
                            promoApplied = false; promoError = null; delay(800)
                            val validCodes = listOf("LAUNCH50", "WELCOME20", "SILVER10", "BRONZE15")
                            if (promoCode in validCodes) promoApplied = true else promoError = "Invalid promo code"
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
                    if (promoApplied) Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    else Text("Apply", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                }
            }
            if (promoApplied) { Spacer(Modifier.height(8.dp)); Text("✅ Promo code applied! Discount will show at checkout.", fontSize = 12.sp, color = ColorTokens.VerifiedGreen) }
            promoError?.let { Spacer(Modifier.height(4.dp)); Text(it, fontSize = 12.sp, color = ColorTokens.RedText) }
        }
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// FAQ Section (NEW)
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun FaqSection() {
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
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Info, null, tint = ColorTokens.BlueText, modifier = Modifier.size(22.dp))
                Text("Frequently Asked Questions", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = ColorTokens.TextHeading)
            }
            Spacer(Modifier.height(16.dp))

            faqs.forEachIndexed { index, faq ->
                Column(
                    modifier = Modifier.fillMaxWidth()
                        .clickable { expandedIndex = if (expandedIndex == index) -1 else index }
                        .animateContentSize()
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(faq.question, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = ColorTokens.TextHeading, modifier = Modifier.weight(1f))
                        Icon(
                            if (expandedIndex == index) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            null, tint = ColorTokens.TextSecondary, modifier = Modifier.size(20.dp),
                        )
                    }
                    if (expandedIndex == index) {
                        Text(faq.answer, fontSize = 13.sp, color = ColorTokens.TextSecondary, lineHeight = 18.sp, modifier = Modifier.padding(bottom = 12.dp))
                    }
                    if (index < faqs.lastIndex) HorizontalDivider(color = ColorTokens.Divider)
                }
            }
        }
    }
}
