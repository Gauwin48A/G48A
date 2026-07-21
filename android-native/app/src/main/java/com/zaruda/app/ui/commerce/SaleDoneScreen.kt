package com.zaruda.app.ui.commerce

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
import com.zaruda.app.R
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.common.LinkColor
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class SaleDoneViewModel @Inject constructor(private val repo: TransactionsRepository) : ViewModel() {
    private val _state = MutableStateFlow(SaleDoneUiState())
    val state: StateFlow<SaleDoneUiState> = _state.asStateFlow()
    init { loadPending() }
    fun loadPending() { viewModelScope.launch {
        when (val r = repo.pending()) {
            is ApiResult.Success -> _state.value = _state.value.copy(pending = r.data)
            is ApiResult.Failure -> {}
        }
    } }
    fun setTab(t: String) { _state.value = _state.value.copy(tab = t, error = null) }
    fun setPostId(v: String) { _state.value = _state.value.copy(postId = v) }
    fun setBuyerId(v: String) { _state.value = _state.value.copy(buyerId = v) }
    fun setSaleAmount(v: String) { _state.value = _state.value.copy(saleAmount = v) }
    fun setTxnId(v: String) { _state.value = _state.value.copy(txnId = v) }
    fun setOtp(v: String) { _state.value = _state.value.copy(otp = v) }
    fun initiateSale() {
        val s = _state.value
        if (s.postId.isBlank() || s.buyerId.isBlank() || s.saleAmount.isBlank()) { _state.value = s.copy(error = "All fields are required: Post ID, Buyer ID, and Sale Amount"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.initiate(InitiateSaleRequest(postId = s.postId, buyerId = s.buyerId, agreedPrice = s.saleAmount.toDoubleOrNull() ?: 0.0))) {
                is ApiResult.Success -> {
                    val txnId = r.data.transaction?.transactionId ?: ""
                    val otp = r.data.transaction?.secretOTP
                    val expiresIn = r.data.transaction?.otpExpiresIn
                    _state.value = _state.value.copy(loading = false, initiatedTxnId = txnId, initiatedOtp = otp, initiatedOtpExpiresIn = expiresIn, txnId = txnId, step = 2, tab = "buyer")
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = mapSaleError(r.error.message))
            }
        }
    }
    fun confirmSale() {
        val s = _state.value
        if (s.txnId.isBlank() || s.otp.isBlank()) { _state.value = s.copy(error = "Both Transaction ID and OTP are required"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.confirm(ConfirmSaleRequest(transactionId = s.txnId, otp = s.otp))) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        loading = false, success = true, step = 4,
                        completedReceipt = r.data.receipt,
                        completedBuyer = r.data.buyer,
                        completedItem = r.data.item,
                        completedRewards = r.data.rewards,
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = mapSaleError(r.error.message))
            }
        }
    }
    private fun mapSaleError(msg: String?): String {
        val m = (msg ?: "").lowercase()
        return when {
            m.contains("auth") || m.contains("401") || m.contains("login") -> "Please sign in again and retry this action."
            m.contains("403") || m.contains("not authorized") -> "You are not authorized for this sale action."
            m.contains("404") || m.contains("not found") -> "Record not found. Verify Post ID / Transaction ID and retry."
            m.contains("otp") && m.contains("expired") -> "OTP expired. Seller must initiate a new sale."
            m.contains("schema") || m.contains("missing sale columns") -> "Backend sale schema is incomplete. Please contact support."
            else -> msg ?: "An error occurred. Please try again."
        }
    }
    fun resetForNewSale() {
        _state.value = SaleDoneUiState()
        loadPending()
    }
}


@Composable
fun SaleDoneScreen(onBack: () -> Unit, viewModel: SaleDoneViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
    val steps = listOf(stringResource(R.string.commerce_step_listing_live), stringResource(R.string.commerce_step_deal_agreed), stringResource(R.string.commerce_step_payment), stringResource(R.string.commerce_step_confirmation), stringResource(R.string.commerce_step_complete))
    var showTestingGuide by remember { mutableStateOf(false) }
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()
    val backgroundBrush = if (isDark) {
        Brush.verticalGradient(listOf(Color(0xFF0D1B1E), Color(0xFF0A1412), Color(0xFF0D1B1E)))
    } else {
        Brush.verticalGradient(listOf(Color(0xFFF0FDF4), Color(0xFFECFDF5), Color(0xFFF0FDF4)))
    }
    Box(Modifier.fillMaxSize().background(backgroundBrush)) {
        Column(Modifier.fillMaxSize()) {
            // Header with Back Button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = if (isDark) Color.White else Color(0xFF1E293B)
                    )
                }
                Text(
                    stringResource(R.string.commerce_mark_sold),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (isDark) Color.White else Color(0xFF1E293B)
                )
            }
            // Hero gradient card (web parity: mhub-hero-card "Sale Confirmation")
            Box(
                modifier = Modifier.fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(Color(0xFF16A34A), Color(0xFF059669), Color(0xFF0D9488)))),
            ) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(stringResource(R.string.commerce_sale_verification_label), fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp, color = Color.White.copy(alpha = 0.7f))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.CheckCircle, null, tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                        Text(stringResource(R.string.commerce_sale_confirmation_title), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color.White)
                    }
                    Text(stringResource(R.string.commerce_sale_confirmation_subtitle), fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            stringResource(R.string.commerce_badge_secure),
                            stringResource(R.string.commerce_badge_rewarded),
                            stringResource(R.string.commerce_badge_verified),
                        ).forEach { badge ->
                            Surface(shape = RoundedCornerShape(8.dp), color = Color.White.copy(alpha = 0.15f)) {
                                Text(badge, fontSize = 10.sp, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                    }
                }
            }
            // Premium Stepper with connecting lines
            Surface(shape = RoundedCornerShape(16.dp), color = if (isDark) Color(0xFF1E293B) else Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                        steps.forEachIndexed { i, label ->
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                                Box(
                                    Modifier.size(32.dp).clip(CircleShape).background(
                                        when {
                                            i < state.step -> Brush.linearGradient(listOf(Color(0xFF22C55E), Color(0xFF22C55E)))
                                            i == state.step -> Brush.linearGradient(listOf(Color(0xFF22C55E), Color(0xFF16A34A)))
                                            else -> Brush.linearGradient(listOf(Color(0xFFE2E8F0), Color(0xFFE2E8F0)))
                                        }
                                    ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (i < state.step) Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(18.dp))
                                    else Text("${i + 1}", fontSize = 12.sp, color = if (i == state.step) Color.White else Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(label, fontSize = 8.sp, color = if (i <= state.step) Color(0xFF16A34A) else Color(0xFF94A3B8), maxLines = 2, textAlign = TextAlign.Center, fontWeight = if (i == state.step) FontWeight.Bold else FontWeight.Normal)
                            }
                        }
                    }
                }
            }
            // Seller / Buyer tabs (web parity: Saledone.jsx)
            Surface(shape = RoundedCornerShape(12.dp), color = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                Row(Modifier.padding(4.dp)) {
                    listOf(
                        "seller" to stringResource(R.string.commerce_tab_seller),
                        "buyer" to stringResource(R.string.commerce_tab_buyer_confirm),
                    ).forEach { (key, label) ->
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (state.tab == key) { if (isDark) Color(0xFF0F172A) else Color.White } else Color.Transparent,
                            shadowElevation = if (state.tab == key) 2.dp else 0.dp,
                            modifier = Modifier.weight(1f).clickable { viewModel.setTab(key) },
                        ) {
                            Text(label, fontSize = 12.sp, fontWeight = if (state.tab == key) FontWeight.Bold else FontWeight.Normal, color = if (state.tab == key) Color(0xFF22C55E) else if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B), textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 10.dp), maxLines = 1)
                        }
                    }
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                state.error?.let {
                    Surface(shape = RoundedCornerShape(12.dp), color = ColorTokens.RedContainer) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Filled.Error, null, tint = ColorTokens.RedText, modifier = Modifier.size(18.dp))
                            Text(it, color = ColorTokens.RedText, fontSize = 13.sp)
                        }
                    }
                }
                // Testing Guide (web parity: collapsible "How to test this page")
                if (!state.success) {
                    Surface(shape = RoundedCornerShape(12.dp), color = if (isDark) Color(0xFF1E293B) else Color(0xFFEFF6FF), border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFBFDBFE)), modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth().clickable { showTestingGuide = !showTestingGuide }.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Filled.Info, null, tint = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                                Text("How to test this page — tap to expand", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (isDark) Color(0xFF93C5FD) else Color(0xFF1D4ED8), modifier = Modifier.weight(1f))
                                Icon(if (showTestingGuide) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, null, tint = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                            }
                            if (showTestingGuide) {
                                Column(Modifier.padding(horizontal = 12.dp).padding(bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf(
                                        "Step 1 — Find your Post ID" to "Go to My Home → tap any active listing → copy the Post ID from the URL.",
                                        "Step 2 — Get Buyer's User ID" to "Ask the buyer to share their User ID from Profile → Settings → Account Info.",
                                        "Step 3 — Seller initiates" to "Enter Post ID, Buyer ID and agreed amount → tap Initiate Sale. Share Transaction ID + OTP with buyer.",
                                        "Step 4 — Buyer confirms" to "Switch to 'Confirm Purchase' tab. Enter Transaction ID + OTP → tap Confirm Purchase. Post moves to Sold.",
                                    ).forEach { (title, desc) ->
                                        Surface(shape = RoundedCornerShape(8.dp), color = if (isDark) Color(0xFF26324A) else Color.White, modifier = Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                                Text(title, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (isDark) Color(0xFF93C5FD) else Color(0xFF1E40AF))
                                                Text(desc, fontSize = 11.sp, color = if (isDark) Color(0xFFBFDBFE) else Color(0xFF3B82F6))
                                            }
                                        }
                                    }
                                    Text("OTPs expire in 24 hours. If expired, seller must re-initiate.", fontSize = 10.sp, color = if (isDark) Color(0xFFBFDBFE) else Color(0xFF3B82F6))
                                }
                            }
                        }
                    }
                }
                if (state.tab == "seller") {
                    if (state.success) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            // Success animation card
                            Surface(shape = RoundedCornerShape(24.dp), color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White, shadowElevation = 6.dp, modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                    Box(Modifier.size(88.dp).clip(CircleShape).background(Brush.radialGradient(listOf(Color(0xFF22C55E), Color(0xFF16A34A)))), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Filled.CheckCircle, null, tint = Color.White, modifier = Modifier.size(52.dp))
                                    }
                                    Text(stringResource(R.string.commerce_sale_completed), fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF14532D))
                                    Text(stringResource(R.string.commerce_sale_confirmed_msg), fontSize = 14.sp, color = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B), textAlign = TextAlign.Center)
                                }
                            }
                            // Receipt card
                            Surface(shape = RoundedCornerShape(20.dp), color = ColorTokens.GreenContainer, border = BorderStroke(1.dp, ColorTokens.GreenText.copy(alpha = 0.5f)), modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Icon(Icons.Filled.Receipt, null, tint = ColorTokens.GreenText, modifier = Modifier.size(18.dp))
                                        Text(stringResource(R.string.commerce_transaction_receipt), fontWeight = FontWeight.Bold, fontSize = 12.sp, color = ColorTokens.GreenText, letterSpacing = 1.sp)
                                    }
                                    HorizontalDivider(color = ColorTokens.GreenText.copy(alpha = 0.3f))
                                    // Item title
                                    state.completedItem?.title?.let { title ->
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Item", fontSize = 13.sp, color = ColorTokens.TextSecondary)
                                            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = ColorTokens.TextHeading, modifier = Modifier.weight(1f, fill = false), textAlign = TextAlign.End)
                                        }
                                    }
                                    // Buyer name
                                    state.completedBuyer?.name?.let { name ->
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Buyer", fontSize = 13.sp, color = ColorTokens.TextSecondary)
                                            Text(name, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = ColorTokens.TextHeading)
                                        }
                                    }
                                    // Receipt ID
                                    state.completedReceipt?.receiptId?.let { rid ->
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(stringResource(R.string.commerce_receipt_id), fontSize = 13.sp, color = ColorTokens.TextSecondary)
                                            Text(rid, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = ColorTokens.TextHeading)
                                        }
                                    }
                                    // Transaction ID with copy
                                    val txId = state.completedReceipt?.transactionId ?: state.initiatedTxnId
                                    if (txId != null) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                            Text(stringResource(R.string.commerce_transaction), fontSize = 13.sp, color = ColorTokens.TextSecondary)
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(txId, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = ColorTokens.TextHeading)
                                                IconButton(onClick = { clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(txId)) }, modifier = Modifier.size(20.dp)) {
                                                    Icon(Icons.Default.ContentCopy, null, tint = ColorTokens.TextSecondary, modifier = Modifier.size(12.dp))
                                                }
                                            }
                                        }
                                    }
                                    // Amount
                                    val amount = state.completedReceipt?.amount ?: state.saleAmount.toDoubleOrNull()
                                    if (amount != null) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(stringResource(R.string.commerce_amount), fontSize = 13.sp, color = ColorTokens.TextSecondary)
                                            Text("₹${amount.toLong()}", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = ColorTokens.GreenText)
                                        }
                                    }
                                    // Completed at
                                    state.completedReceipt?.completedAt?.let { ts ->
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Completed", fontSize = 13.sp, color = ColorTokens.TextSecondary)
                                            Text(ts.take(19).replace("T", " "), fontSize = 11.sp, color = ColorTokens.TextSecondary)
                                        }
                                    }
                                }
                            }
                            // Reward earned card — show actual points from API
                            val rewardsInfo = state.completedRewards
                            val totalPoints = rewardsInfo?.totalPoints ?: 0
                            if (totalPoints > 0) {
                            Surface(shape = RoundedCornerShape(20.dp), color = ColorTokens.AmberContainer, border = BorderStroke(1.dp, ColorTokens.AmberText.copy(alpha = 0.5f)), modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("✅", fontSize = 22.sp)
                                        Text("Rewards Earned!", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ColorTokens.AmberText)
                                    }
                                    // 4-metric breakdown (web parity)
                                    val metricsRow1 = listOf(
                                        "Seller Points" to (rewardsInfo?.sellerPoints ?: 0),
                                        "Buyer Points" to (rewardsInfo?.buyerPoints ?: 0),
                                    )
                                    val metricsRow2 = listOf(
                                        "Bonus Points" to (rewardsInfo?.bonusPoints ?: 0),
                                        "Referral Points" to ((rewardsInfo?.referralPoints ?: 0) + (rewardsInfo?.chainPoints ?: 0)),
                                    )
                                    listOf(metricsRow1, metricsRow2).forEach { row ->
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            row.forEach { (label, pts) ->
                                                Surface(shape = RoundedCornerShape(10.dp), color = if (isDark) Color(0xFF2D1F00) else Color(0xFFFEF3C7), modifier = Modifier.weight(1f)) {
                                                    Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                        Text("+$pts", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = ColorTokens.AmberText)
                                                        Text(label, fontSize = 10.sp, color = ColorTokens.AmberText, textAlign = TextAlign.Center)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            }
                            // Sold Item Card (web parity)
                            state.completedItem?.let { item ->
                                Surface(shape = RoundedCornerShape(20.dp), color = if (isDark) Color(0xFF1E293B) else Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Icon(Icons.Filled.Inventory2, null, tint = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                                            Text("Sold Item", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isDark) Color.White else Color(0xFF1E293B))
                                        }
                                        HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0))
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                                            // Item image
                                            item.imageUrl?.let { url ->
                                                AsyncImage(
                                                    model = url,
                                                    contentDescription = null,
                                                    modifier = Modifier.size(60.dp).clip(RoundedCornerShape(8.dp)),
                                                    contentScale = ContentScale.Crop,
                                                )
                                            } ?: Surface(shape = RoundedCornerShape(8.dp), color = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0), modifier = Modifier.size(60.dp)) {
                                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                                    Icon(Icons.Filled.Image, null, tint = if (isDark) Color(0xFF64748B) else Color(0xFF94A3B8), modifier = Modifier.size(28.dp))
                                                }
                                            }
                                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                item.title?.let { Text(it, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = if (isDark) Color.White else Color(0xFF0F172A), maxLines = 2) }
                                                item.categoryName?.let { cat ->
                                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                        Text(cat, fontSize = 11.sp, color = ColorTokens.TextSecondary)
                                                        item.subcategoryName?.let { sub -> Text("· $sub", fontSize = 11.sp, color = ColorTokens.TextSecondary) }
                                                    }
                                                }
                                                item.location?.let { Text("📍 $it", fontSize = 11.sp, color = ColorTokens.TextSecondary) }
                                                // Agreed vs listing price
                                                val agreed = item.agreedPrice ?: item.price
                                                val listing = item.listingPrice ?: item.price
                                                if (agreed != null) {
                                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                        Text("₹${agreed.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ColorTokens.GreenText)
                                                        if (listing != null && listing != agreed) {
                                                            Text("₹${listing.toLong()}", fontSize = 12.sp, color = ColorTokens.TextSecondary, textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Buyer Details Card (web parity)
                            state.completedBuyer?.let { buyer ->
                                Surface(shape = RoundedCornerShape(20.dp), color = if (isDark) Color(0xFF1E293B) else Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Icon(Icons.Filled.Person, null, tint = if (isDark) Color(0xFFA78BFA) else Color(0xFF7C3AED), modifier = Modifier.size(16.dp))
                                            Text("Buyer Details", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isDark) Color.White else Color(0xFF1E293B))
                                        }
                                        HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0))
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            // Avatar circle
                                            val purpleColor = if (isDark) Color(0xFFA78BFA) else Color(0xFF7C3AED)
                                            Surface(shape = CircleShape, color = purpleColor.copy(alpha = 0.15f), modifier = Modifier.size(48.dp)) {
                                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                                    Text(buyer.name?.firstOrNull()?.uppercase() ?: "?", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = purpleColor)
                                                }
                                            }
                                            Column(Modifier.weight(1f)) {
                                                buyer.name?.let { Text(it, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = if (isDark) Color.White else Color(0xFF0F172A)) }
                                                buyer.username?.let { Text("@$it", fontSize = 12.sp, color = ColorTokens.TextSecondary) }
                                                val buyerIdDisplay = buyer.userId ?: buyer.id
                                                buyerIdDisplay?.let { uid ->
                                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                        Text("ID: $uid", fontSize = 11.sp, color = ColorTokens.TextSecondary)
                                                        IconButton(onClick = { clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(uid)) }, modifier = Modifier.size(18.dp)) {
                                                            Icon(Icons.Default.ContentCopy, null, tint = ColorTokens.TextSecondary, modifier = Modifier.size(12.dp))
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Receipt Actions row (web parity: copy/share)
                            val btnContent = if (isDark) Color.White else Color.Unspecified
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                // Copy receipt
                                OutlinedButton(
                                    onClick = {
                                        val receiptText = buildString {
                                            append("Transaction: ${state.completedReceipt?.transactionId ?: state.initiatedTxnId ?: ""}\n")
                                            append("Amount: ₹${state.completedReceipt?.amount?.toLong() ?: state.saleAmount}")
                                        }
                                        clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(receiptText))
                                    },
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Icon(Icons.Default.ContentCopy, null, tint = btnContent, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Copy", style = MaterialTheme.typography.labelMedium, color = btnContent)
                                }
                                // Share receipt
                                OutlinedButton(
                                    onClick = {
                                        val shareText = buildString {
                                            append("MHub Sale Receipt\n")
                                            append("Transaction: ${state.completedReceipt?.transactionId ?: state.initiatedTxnId ?: ""}\n")
                                            append("Amount: ₹${state.completedReceipt?.amount?.toLong() ?: state.saleAmount}")
                                        }
                                        val intent = Intent(Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(Intent.EXTRA_TEXT, shareText)
                                            putExtra(Intent.EXTRA_SUBJECT, "Sale Receipt")
                                        }
                                        context.startActivity(Intent.createChooser(intent, "Share Receipt"))
                                    },
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Icon(Icons.Outlined.Share, null, tint = btnContent, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Share", style = MaterialTheme.typography.labelMedium, color = btnContent)
                                }
                            }
                            // Next Steps Section (web parity)
                            Surface(shape = RoundedCornerShape(16.dp), color = if (isDark) Color(0xFF1E293B) else Color(0xFFEFF6FF), border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFBFDBFE)), modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Next Steps", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isDark) Color(0xFF93C5FD) else Color(0xFF1D4ED8))
                                    listOf(
                                        "📦" to "View your post in My Home → Sold tab",
                                        "⭐" to "Leave a review for the buyer",
                                        "🚀" to "List more items to grow your sales",
                                    ).forEach { (emoji, text) ->
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                                            Text(emoji, fontSize = 14.sp)
                                            Text(text, fontSize = 12.sp, color = if (isDark) Color(0xFFBFDBFE) else Color(0xFF1E40AF))
                                        }
                                    }
                                }
                            }
                            // Action buttons
                            OutlinedButton(
                                onClick = { viewModel.resetForNewSale() },
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                border = BorderStroke(1.5.dp, Color(0xFF16A34A)),
                            ) {
                                Icon(Icons.Default.Add, null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Confirm Another Sale", fontWeight = FontWeight.SemiBold, color = Color(0xFF16A34A))
                            }
                            OutlinedButton(
                                onClick = onBack,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                border = BorderStroke(1.5.dp, Color(0xFF6366F1)),
                            ) {
                                Icon(Icons.Filled.Star, null, tint = Color(0xFF6366F1), modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Leave Feedback", fontWeight = FontWeight.SemiBold, color = Color(0xFF6366F1))
                            }
                            Button(onClick = onBack, shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.fillMaxWidth().height(50.dp), elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)) {
                                Icon(Icons.Filled.Home, null, tint = Color.White, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("View My Listings", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    } else {
                        // Seller initiation form
                        Surface(shape = RoundedCornerShape(20.dp), color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Surface(shape = CircleShape, color = if (isDark) Color(0xFF064E3B) else Color(0xFFDCFCE7), modifier = Modifier.size(36.dp)) {
                                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                            Icon(Icons.Filled.Sell, null, tint = ColorTokens.GreenText, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                    Text("Initiate Sale", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.TextHeading)
                                }
                                MhubTextField(stringResource(R.string.commerce_field_post_id), state.postId, viewModel::setPostId)
                                MhubTextField(stringResource(R.string.commerce_field_buyer_id), state.buyerId, viewModel::setBuyerId)
                                MhubTextField(stringResource(R.string.commerce_field_sale_amount), state.saleAmount, viewModel::setSaleAmount)
                                Button(
                                    onClick = { viewModel.initiateSale() },
                                    enabled = !state.loading,
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                                    modifier = Modifier.fillMaxWidth().height(52.dp),
                                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                                ) {
                                    if (state.loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                    else {
                                        Icon(Icons.Filled.Favorite, null, tint = Color.White, modifier = Modifier.size(20.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text(stringResource(R.string.commerce_initiate_sale), fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                                    }
                                }
                            }
                        }
                        // Blue info card: show transaction ID + OTP after successful initiation (web parity: initiatedSale card in Saledone.jsx)
                        if (state.initiatedTxnId != null) {
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = if (isDark) Color(0xFF1E293B) else Color(0xFFEFF6FF),
                                border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFBFDBFE)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("Transaction Created", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = if (isDark) Color(0xFF93C5FD) else Color(0xFF1D4ED8))
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("Transaction ID:", fontSize = 12.sp, color = if (isDark) Color(0xFFBFDBFE) else Color(0xFF2563EB))
                                        Text(state.initiatedTxnId!!, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = if (isDark) Color(0xFF93C5FD) else Color(0xFF1E40AF), modifier = Modifier.weight(1f, fill = false), maxLines = 1)
                                    }
                                    if (state.initiatedOtp != null) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("OTP to share with buyer:", fontSize = 12.sp, color = if (isDark) Color(0xFFBFDBFE) else Color(0xFF2563EB))
                                            Text(state.initiatedOtp!!, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = if (isDark) Color(0xFF93C5FD) else Color(0xFF1E40AF))
                                        }
                                    } else {
                                        Text("OTP sent to buyer's notification channel.", fontSize = 12.sp, color = if (isDark) Color(0xFFBFDBFE) else Color(0xFF3B82F6))
                                    }
                                    state.initiatedOtpExpiresIn?.let { expiry ->
                                        Text("Expires in: $expiry", fontSize = 11.sp, color = if (isDark) Color(0xFF94A3B8) else Color(0xFF60A5FA))
                                    }
                                    Text("Switch to 'Confirm Purchase' tab to complete the sale.", fontSize = 11.sp, color = if (isDark) Color(0xFF64748B) else Color(0xFF93C5FD))
                                }
                            }
                        }
                    }
                } else {
                    // Buyer confirmation form
                    Surface(shape = RoundedCornerShape(20.dp), color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Surface(shape = CircleShape, color = if (isDark) Color(0xFF2D1B4E) else Color(0xFFEDE9FE), modifier = Modifier.size(36.dp)) {
                                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                            Icon(Icons.Filled.Verified, null, tint = ColorTokens.CardPurpleText, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                    Text("Confirm Purchase", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.TextHeading)
                                }
                            MhubTextField(stringResource(R.string.commerce_field_txn_id), state.txnId, viewModel::setTxnId)
                            MhubTextField(stringResource(R.string.commerce_field_otp), state.otp, viewModel::setOtp)
                            Button(
                                onClick = { viewModel.confirmSale() },
                                enabled = !state.loading,
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED)),
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                            ) {
                                if (state.loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                else {
                                    Icon(Icons.Filled.Verified, null, tint = Color.White, modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(stringResource(R.string.commerce_confirm_sale), fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                                }
                            }
                        }
                    }
                }
                // Pending sales
                if (state.pending.isNotEmpty()) {
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Filled.PendingActions, null, tint = ColorTokens.PremiumAmber, modifier = Modifier.size(20.dp))
                        Text(stringResource(R.string.commerce_pending_sales), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.TextHeading)
                    }
                    state.pending.forEach { sale ->
                        Surface(shape = RoundedCornerShape(14.dp), color = if (isDark) Color(0xFF1E293B) else Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Surface(shape = RoundedCornerShape(10.dp), color = ColorTokens.PremiumAmberContainer, modifier = Modifier.size(40.dp)) {
                                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                        Icon(Icons.Filled.Timer, null, tint = ColorTokens.PremiumAmber, modifier = Modifier.size(20.dp))
                                    }
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(sale.postTitle ?: stringResource(R.string.commerce_listing), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = ColorTokens.TextHeading)
                                    Text(stringResource(R.string.commerce_buyer_label) + (sale.buyerName ?: stringResource(R.string.commerce_unknown_buyer)), fontSize = 12.sp, color = ColorTokens.TextSecondary)
                                }
                                Surface(shape = RoundedCornerShape(8.dp), color = ColorTokens.GreenContainer) {
                                    Text("₹${sale.amount.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = ColorTokens.GreenText, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(60.dp))
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// SaleUndoneScreen — 5-step stepper with undo form + history
// ──────────────────────────────────────────────────────────────────────────────
data class SaleUndoneUiState(
    val loading: Boolean = false,
    val postId: String = "",
    val reason: String = "",
    val description: String = "",
    val history: List<UndoneRecord> = emptyList(),
    val success: Boolean = false,
    val transactionId: String? = null,
    val error: String? = null,
)