package com.zaruda.app.ui.commerce
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
import com.zaruda.app.R
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.JwtHelper
import com.zaruda.app.data.local.TokenStore
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.razorpay.Checkout
import org.json.JSONObject

// ──────────────────────────────────────────────────────────────────────────────
// UI State
// ──────────────────────────────────────────────────────────────────────────────

data class SaleDoneUiState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val activeTab: Int = 0,
    val error: String? = null,

    // Request form
    val sellerId: String = "",
    val postId: String = "",
    val requestSuccess: Boolean = false,
    // "IN_APP" (escrow) or "OUTSIDE" (direct cash/UPI)
    val selectedPaymentMode: String = "IN_APP",
    // True when opened from a post (Buy Now) so we show a clean confirmation card
    // instead of raw Seller ID / Post ID fields.
    val prefilledFromPost: Boolean = false,

    // Escrow eligibility of the post being bought (fetched from the server).
    // true  = Electronics → in-app escrow (IN_APP) is forced
    // false = other categories → direct/outside (OUTSIDE) is forced
    // null  = not yet known (manual form, no post fetched yet)
    val escrowEligible: Boolean? = null,
    val escrowFeePct: Double? = null,

    // Lists
    val pendingRequests: List<SaleInfo> = emptyList(),
    val activeSales: List<SaleInfo> = emptyList(),
    val historySales: List<SaleInfo> = emptyList(),

    // Suspension
    val suspensionStatus: SuspensionStatusResponse? = null,
    val suspensionCheckDone: Boolean = false,

    // Action states
    val actionLoading: Boolean = false,
    val actionError: String? = null,
    val actionSuccess: String? = null,

    // Fraud report dialog
    val showFraudDialog: Boolean = false,
    val fraudSaleId: Int? = null,
    val fraudReportedParty: String = "",
    val fraudReason: String = "",

    // Buyer rating dialog
    val showRateDialog: Boolean = false,
    val rateSaleId: Int? = null,
    val selectedRating: Int = 5,
    val rateComment: String = "",

    // Suspension respond
    val showSuspensionRespond: Boolean = false,
    val suspensionRespondMessage: String = "",
    val suspensionRespondSuccess: Boolean = false,

    // In-app sale payment (Razorpay)
    val payResult: SalePayResult? = null,

    // Mark-as-shipped sheet (shipment evidence captured in-app)
    val showShipSheet: Boolean = false,
    val shipSaleId: Int? = null,
    val courierName: String = "",
    val trackingNumber: String = "",
    val shipError: String? = null,
) {
    val isSuspended: Boolean get() = suspensionStatus?.suspended == true
    val isPermanentlyLocked: Boolean get() = suspensionStatus?.permanentlyLocked == true
}

data class SalePayResult(val success: Boolean, val message: String)

data class RazorpaySaleCheckoutEvent(
    val orderId: String,
    val amount: Double,
    val currency: String,
    val keyId: String,
    val saleId: Int,
    val saleTitle: String,
)

// ──────────────────────────────────────────────────────────────────────────────
// ViewModel
// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class SaleDoneViewModel @Inject constructor(
    private val salesRepo: SalesRepository,
    private val paymentsRepo: PaymentsRepository,
    private val postsRepo: PostsRepository,
    private val tokenStore: TokenStore,
    private val savedStateHandle: androidx.lifecycle.SavedStateHandle,
) : ViewModel() {

    private val _state = MutableStateFlow(SaleDoneUiState())
    val state: StateFlow<SaleDoneUiState> = _state.asStateFlow()

    /** Guards against stale escrow lookups when the user edits the post ID rapidly. */
    private var escrowLoadJob: kotlinx.coroutines.Job? = null

    /** Current logged-in user id (from the JWT) — used to gate buyer actions. */
    val currentUserId: String? = run {
        val token = tokenStore.accessToken.value ?: return@run null
        JwtHelper.extractClaim(token, "sub")
            ?: JwtHelper.extractClaim(token, "userId")
            ?: JwtHelper.extractClaim(token, "id")
    }

    private val _saleCheckoutEvent = Channel<RazorpaySaleCheckoutEvent>(Channel.BUFFERED)
    val saleCheckoutEvent: Flow<RazorpaySaleCheckoutEvent> = _saleCheckoutEvent.receiveAsFlow()

    init {
        // Notification tap / deep link: open on a specific tab (0=Start, 1=Pending, 2=Active, 3=History)
        savedStateHandle.get<Int>("tab")?.let { tab ->
            _state.update { it.copy(activeTab = tab.coerceIn(0, 3)) }
        }
        val prefillPostId = savedStateHandle.get<String>("postId")
        val prefillSellerId = savedStateHandle.get<String>("sellerId")
        if (!prefillSellerId.isNullOrBlank() && !prefillPostId.isNullOrBlank()) {
            // Owner tapped "Sell Now" on their own listing → open the manage-requests
            // (Pending) tab instead of the buyer confirmation card.
            val isOwner = prefillSellerId == currentUserId
            _state.update {
                it.copy(
                    sellerId = prefillSellerId,
                    postId = prefillPostId,
                    prefilledFromPost = !isOwner,
                    activeTab = if (isOwner) 1 else 0,
                )
            }
            loadEscrowInfo(prefillPostId)
        }
        loadAll()
    }

    // ── Setters ────────────────────────────────────────────────────────────────

    fun setSellerId(v: String) { _state.update { it.copy(sellerId = v, requestSuccess = false, error = null, prefilledFromPost = false) } }
    fun setPostId(v: String) {
        _state.update {
            it.copy(
                postId = v,
                requestSuccess = false,
                error = null,
                prefilledFromPost = false,
                escrowEligible = null,
                escrowFeePct = null,
            )
        }
        if (v.isNotBlank()) loadEscrowInfo(v)
    }
    fun setPaymentMode(mode: String) { _state.update { it.copy(selectedPaymentMode = mode) } }
    fun clearPrefill() { _state.update { it.copy(prefilledFromPost = false, requestSuccess = false, error = null) } }
    fun setActiveTab(tab: Int) { _state.update { it.copy(activeTab = tab) } }

    /**
     * Fetch the post to determine its escrow eligibility, then force the payment
     * mode to match the platform rule: Electronics → IN_APP (in-app escrow),
     * every other category → OUTSIDE (direct/outside payment).
     * The server enforces the identical rule independently — this keeps the UI
     * honest so the user never sees an option that would be rejected.
     */
    fun loadEscrowInfo(postId: String) {
        if (postId.isBlank()) return
        escrowLoadJob?.cancel()
        escrowLoadJob = viewModelScope.launch {
            when (val r = postsRepo.detail(postId)) {
                is ApiResult.Success -> {
                    // Ignore a stale response if the user already moved to another post.
                    if (postId != _state.value.postId) return@launch
                    val post = r.data
                    val cat = (post.category ?: post.categoryName ?: "").lowercase()
                    val eligible = post.isEscrowEligible
                        ?: (cat.contains("electron") || cat.contains("mobile") || cat.contains("phone") || cat.contains("gadget"))
                    _state.update {
                        it.copy(
                            escrowEligible = eligible,
                            escrowFeePct = post.escrowFeePct,
                            selectedPaymentMode = if (eligible) "IN_APP" else "OUTSIDE",
                        )
                    }
                }
                is ApiResult.Failure -> {
                    // Post couldn't be fetched — keep the current choice; the
                    // server still enforces the correct mode on request.
                }
            }
        }
    }

    fun setFraudDialog(saleId: Int?, reportedParty: String) {
        _state.update { it.copy(showFraudDialog = saleId != null, fraudSaleId = saleId, fraudReportedParty = reportedParty, fraudReason = "") }
    }
    fun setFraudReason(v: String) { _state.update { it.copy(fraudReason = v) } }
    fun dismissFraudDialog() { _state.update { it.copy(showFraudDialog = false, fraudSaleId = null, fraudReason = "") } }

    fun setRateDialog(show: Boolean, saleId: Int? = null) {
        _state.update { it.copy(showRateDialog = show, rateSaleId = saleId, selectedRating = 5, rateComment = "") }
    }
    fun setSelectedRating(rating: Int) { _state.update { it.copy(selectedRating = rating.coerceIn(1, 5)) } }
    fun setRateComment(comment: String) { _state.update { it.copy(rateComment = comment) } }

    fun submitRating() {
        val saleId = _state.value.rateSaleId ?: return
        val rating = _state.value.selectedRating
        val comment = _state.value.rateComment
        if (_state.value.actionLoading) return
        _state.update { it.copy(actionLoading = true, actionError = null, actionSuccess = null) }
        viewModelScope.launch {
            when (val r = salesRepo.rateCompletedSale(saleId, rating, comment)) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            actionLoading = false,
                            showRateDialog = false,
                            rateSaleId = null,
                            actionSuccess = "Thank you! Your rating and review have been recorded.",
                        )
                    }
                    loadAll()
                }
                is ApiResult.Failure -> {
                    _state.update {
                        it.copy(
                            actionLoading = false,
                            actionError = r.error.message ?: "Failed to submit rating",
                        )
                    }
                }
            }
        }
    }

    fun setSuspensionRespond(show: Boolean) { _state.update { it.copy(showSuspensionRespond = show, suspensionRespondMessage = "") } }
    fun setSuspensionRespondMessage(v: String) { _state.update { it.copy(suspensionRespondMessage = v) } }

    fun clearActionMessages() { _state.update { it.copy(actionError = null, actionSuccess = null) } }

    fun dismissPayResult() { _state.update { it.copy(payResult = null) } }

    // ── In-app sale payment (Razorpay escrow) ────────────────────────────────

    /** Buyer pays an approved IN_APP sale — creates the Razorpay order & opens checkout. */
    fun paySale(sale: SaleInfo) {
        val amount = sale.payableAmount
        if (amount <= 0) {
            _state.update { it.copy(actionError = "Sale amount is not available yet.") }
            return
        }
        if (_state.value.actionLoading) return
        _state.update { it.copy(actionLoading = true, actionError = null, actionSuccess = null, payResult = null) }
        viewModelScope.launch {
            when (val r = paymentsRepo.createSaleOrder(sale.id, amount)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(actionLoading = false) }
                    val order = r.data
                    if (order.orderId != null && order.keyId != null) {
                        _saleCheckoutEvent.send(
                            RazorpaySaleCheckoutEvent(
                                orderId = order.orderId,
                                amount = order.amount,
                                currency = order.currency,
                                keyId = order.keyId,
                                saleId = sale.id,
                                saleTitle = sale.postTitle ?: "Sale #${sale.id}",
                            )
                        )
                    } else {
                        _state.update {
                            it.copy(payResult = SalePayResult(false, "Payment order missing order ID."))
                        }
                    }
                }
                is ApiResult.Failure -> {
                    _state.update {
                        it.copy(
                            actionLoading = false,
                            payResult = SalePayResult(false, r.error.message ?: "Failed to start payment"),
                        )
                    }
                }
            }
        }
    }

    /** Finalize an in-app sale payment after the Razorpay sheet returns. */
    fun verifySalePayment(saleId: Int, orderId: String, paymentId: String, signature: String) {
        viewModelScope.launch {
            when (val r = paymentsRepo.verifySalePayment(orderId, paymentId, signature)) {
                is ApiResult.Success -> {
                    val ok = r.data.success && r.data.paymentStatus.equals("PAID", ignoreCase = true)
                    _state.update {
                        it.copy(
                            payResult = SalePayResult(
                                ok,
                                r.data.message
                                    ?: if (ok) "Payment verified! Funds are held securely until you confirm receipt."
                                    else "Payment could not be verified.",
                            ),
                        )
                    }
                    if (ok) refresh() else loadAll()
                }
                is ApiResult.Failure -> {
                    _state.update {
                        it.copy(payResult = SalePayResult(false, r.error.message ?: "Payment verification failed"))
                    }
                }
            }
        }
    }

    // ── Load ───────────────────────────────────────────────────────────────────

    fun loadAll() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            // Load suspension status first
            val suspensionResult = salesRepo.suspensionStatus()
            val suspension = when (suspensionResult) {
                is ApiResult.Success -> suspensionResult.data
                else -> null
            }
            _state.update { it.copy(suspensionStatus = suspension, suspensionCheckDone = true) }

            // Load sales data
            val pendingResult = salesRepo.pendingRequests()
            val activeResult = salesRepo.myActive()
            val historyResult = salesRepo.myHistory()

            val pending = when (pendingResult) {
                is ApiResult.Success -> pendingResult.data
                else -> emptyList()
            }
            val active = when (activeResult) {
                is ApiResult.Success -> activeResult.data
                else -> emptyList()
            }
            val history = when (historyResult) {
                is ApiResult.Success -> historyResult.data
                else -> emptyList()
            }
            val err = when {
                pendingResult is ApiResult.Failure -> pendingResult.error.message
                activeResult is ApiResult.Failure -> activeResult.error.message
                historyResult is ApiResult.Failure -> historyResult.error.message
                else -> null
            }

            _state.update {
                it.copy(
                    loading = false,
                    pendingRequests = pending,
                    activeSales = active,
                    historySales = history,
                    error = err,
                )
            }
        }
    }

    fun refresh() {
        _state.update { it.copy(refreshing = true) }
        viewModelScope.launch {
            // Reload all
            val pendingResult = salesRepo.pendingRequests()
            val activeResult = salesRepo.myActive()
            val historyResult = salesRepo.myHistory()
            val suspensionResult = salesRepo.suspensionStatus()

            _state.update {
                it.copy(
                    refreshing = false,
                    pendingRequests = when (pendingResult) { is ApiResult.Success -> pendingResult.data else -> it.pendingRequests },
                    activeSales = when (activeResult) { is ApiResult.Success -> activeResult.data else -> it.activeSales },
                    historySales = when (historyResult) { is ApiResult.Success -> historyResult.data else -> it.historySales },
                    suspensionStatus = when (suspensionResult) { is ApiResult.Success -> suspensionResult.data else -> it.suspensionStatus },
                    suspensionCheckDone = true,
                )
            }
        }
    }

    // ── Actions ────────────────────────────────────────────────────────────────

    fun requestSale() {
        val s = _state.value
        if (s.sellerId.isBlank() || s.postId.isBlank()) {
            _state.update { it.copy(error = "Both Seller ID and Post ID are required") }
            return
        }
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            when (val r = salesRepo.requestSale(SaleRequest(postId = s.postId, sellerId = s.sellerId, paymentMode = s.selectedPaymentMode))) {
                is ApiResult.Success -> {
                    _state.update { it.copy(loading = false, requestSuccess = true, sellerId = "", postId = "", actionSuccess = r.data.message ?: "Sale request sent!") }
                    loadAll()
                }
                is ApiResult.Failure -> {
                    _state.update { it.copy(loading = false, error = r.error.message ?: "Failed to send sale request") }
                }
            }
        }
    }

    fun approveSale(saleId: Int) {
        _state.update { it.copy(actionLoading = true, actionError = null, actionSuccess = null) }
        viewModelScope.launch {
            when (val r = salesRepo.approve(saleId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(actionLoading = false, actionSuccess = "Sale approved!") }
                    loadAll()
                }
                is ApiResult.Failure -> {
                    _state.update { it.copy(actionLoading = false, actionError = r.error.message ?: "Failed to approve") }
                }
            }
        }
    }

    fun rejectSale(saleId: Int) {
        _state.update { it.copy(actionLoading = true, actionError = null, actionSuccess = null) }
        viewModelScope.launch {
            when (val r = salesRepo.reject(saleId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(actionLoading = false, actionSuccess = "Sale rejected.") }
                    loadAll()
                }
                is ApiResult.Failure -> {
                    _state.update { it.copy(actionLoading = false, actionError = r.error.message ?: "Failed to reject") }
                }
            }
        }
    }

    /** Buyer withdraws their own pending request. */
    fun cancelSale(saleId: Int) {
        _state.update { it.copy(actionLoading = true, actionError = null, actionSuccess = null) }
        viewModelScope.launch {
            when (val r = salesRepo.cancel(saleId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(actionLoading = false, actionSuccess = "Request cancelled.") }
                    loadAll()
                }
                is ApiResult.Failure -> {
                    _state.update { it.copy(actionLoading = false, actionError = r.error.message ?: "Failed to cancel request") }
                }
            }
        }
    }

    // ── Mark as Shipped (shipment evidence sheet) ─────────────────────────────

    fun setShipSheet(show: Boolean, saleId: Int? = null) {
        _state.update { it.copy(showShipSheet = show, shipSaleId = saleId, courierName = "", trackingNumber = "", shipError = null) }
    }
    fun setCourierName(v: String) { _state.update { it.copy(courierName = v, shipError = null) } }
    fun setTrackingNumber(v: String) { _state.update { it.copy(trackingNumber = v, shipError = null) } }

    /** Seller confirms shipment with courier + tracking details captured in-app. */
    fun submitShipment() {
        val saleId = _state.value.shipSaleId ?: return
        val courier = _state.value.courierName.trim()
        val tracking = _state.value.trackingNumber.trim()
        if (courier.isBlank() && tracking.isBlank()) {
            _state.update { it.copy(shipError = "Add a courier name or tracking number so the buyer can follow the shipment.") }
            return
        }
        _state.update { it.copy(actionLoading = true, actionError = null, actionSuccess = null) }
        viewModelScope.launch {
            when (val r = salesRepo.markShipped(saleId, trackingNumber = tracking, courierName = courier)) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            actionLoading = false,
                            showShipSheet = false,
                            shipSaleId = null,
                            actionSuccess = "Marked as shipped!",
                        )
                    }
                    loadAll()
                }
                is ApiResult.Failure -> {
                    _state.update { it.copy(actionLoading = false, shipError = r.error.message ?: "Failed to mark shipped") }
                }
            }
        }
    }

    fun markOrderReceived(saleId: Int) {
        _state.update { it.copy(actionLoading = true, actionError = null, actionSuccess = null) }
        viewModelScope.launch {
            when (val r = salesRepo.orderReceived(saleId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(actionLoading = false, actionSuccess = "Order received confirmed!") }
                    loadAll()
                    // Trust loop: the buyer can rate the completed sale right away
                    setRateDialog(true, saleId)
                }
                is ApiResult.Failure -> {
                    _state.update { it.copy(actionLoading = false, actionError = r.error.message ?: "Failed to confirm order received") }
                }
            }
        }
    }

    fun markAmountReceived(saleId: Int) {
        _state.update { it.copy(actionLoading = true, actionError = null, actionSuccess = null) }
        viewModelScope.launch {
            when (val r = salesRepo.amountReceived(saleId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(actionLoading = false, actionSuccess = "Amount received confirmed!") }
                    loadAll()
                }
                is ApiResult.Failure -> {
                    _state.update { it.copy(actionLoading = false, actionError = r.error.message ?: "Failed to confirm amount received") }
                }
            }
        }
    }

    fun submitFraudReport() {
        val s = _state.value
        val saleId = s.fraudSaleId ?: return
        if (s.fraudReason.isBlank()) {
            _state.update { it.copy(actionError = "Please describe the fraud reason") }
            return
        }
        _state.update { it.copy(actionLoading = true, showFraudDialog = false) }
        viewModelScope.launch {
            when (val r = salesRepo.reportFraud(saleId, s.fraudReportedParty, s.fraudReason)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(actionLoading = false, actionSuccess = "Fraud reported. Admin will review.", fraudSaleId = null, fraudReason = "") }
                    loadAll()
                }
                is ApiResult.Failure -> {
                    _state.update { it.copy(actionLoading = false, actionError = r.error.message ?: "Failed to report fraud") }
                }
            }
        }
    }

    fun respondToFraudFlag() {
        val s = _state.value
        val suspension = s.suspensionStatus ?: return
        val saleId = suspension.reason?.let { parseSaleId(it) } ?: return
        if (s.suspensionRespondMessage.isBlank()) {
            _state.update { it.copy(actionError = "Please write your response") }
            return
        }
        _state.update { it.copy(actionLoading = true, actionError = null) }
        viewModelScope.launch {
            when (val r = salesRepo.respondToFraud(saleId, s.suspensionRespondMessage)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(actionLoading = false, suspensionRespondSuccess = true, actionSuccess = "Response submitted! Admin will review within 24hrs.") }
                    refresh()
                }
                is ApiResult.Failure -> {
                    _state.update { it.copy(actionLoading = false, actionError = r.error.message ?: "Failed to submit response") }
                }
            }
        }
    }

    fun resetForm() {
        _state.update { SaleDoneUiState() }
        loadAll()
    }

    private fun parseSaleId(reason: String?): Int? {
        // Try to extract sale ID from suspension reason text like "Fraud reported on sale #42"
        return reason?.let {
            val match = Regex("""#(\d+)""").find(it)
            match?.groupValues?.get(1)?.toIntOrNull()
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Screen Composables
// ──────────────────────────────────────────────────────────────────────────────

@Composable
fun SaleDoneScreen(onBack: () -> Unit, viewModel: SaleDoneViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDarkTheme()
    val backgroundBrush = if (isDark) {
        Brush.verticalGradient(listOf(Color(0xFF0D1B1E), Color(0xFF0A1412), Color(0xFF0D1B1E)))
    } else {
        Brush.verticalGradient(listOf(Color(0xFFF0FDF4), Color(0xFFECFDF5), Color(0xFFF0FDF4)))
    }

    Box(Modifier.fillMaxSize().background(backgroundBrush)) {
        Column(Modifier.fillMaxSize()) {
            // ── Header ───────────────────────────────────────────────────────
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
                    stringResource(R.string.commerce_sale_hub_title),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (isDark) Color.White else Color(0xFF1E293B),
                    modifier = Modifier.weight(1f),
                )
                // Refresh button
                IconButton(onClick = { viewModel.refresh() }) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = "Refresh",
                        tint = if (isDark) Color.White else Color(0xFF1E293B)
                    )
                }
            }

            if (!state.suspensionCheckDone && state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                if (state.isSuspended) {
                    SuspensionBanner(state, viewModel)
                }

                // ── Action Messages ──────────────────────────────────────────
                state.actionSuccess?.let { msg ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isDark) Color(0xFF064E3B) else Color(0xFFDCFCE7),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    ) {
                        Text(
                            msg,
                            color = if (isDark) Color(0xFF86EFAC) else Color(0xFF166534),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                    LaunchedEffect(msg) {
                        delay(4000)
                        viewModel.clearActionMessages()
                    }
                }
                state.actionError?.let { msg ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isDark) Color(0xFF450A0A) else Color(0xFFFEE2E2),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    ) {
                        Text(
                            msg,
                            color = if (isDark) Color(0xFFFCA5A5) else Color(0xFF991B1B),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                }

                // ── Tabs ────────────────────────────────────────────────────
                val tabs = listOf(
                    stringResource(R.string.commerce_tab_start),
                    stringResource(R.string.commerce_tab_requests),
                    stringResource(R.string.commerce_tab_active),
                    stringResource(R.string.commerce_tab_history),
                )
                TabRow(
                    selectedTabIndex = state.activeTab,
                    containerColor = Color.Transparent,
                    contentColor = if (isDark) Color.White else Color(0xFF1E293B),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = state.activeTab == index,
                            onClick = { viewModel.setActiveTab(index) },
                            text = {
                                val count = when (index) {
                                    1 -> state.pendingRequests.size
                                    2 -> state.activeSales.size
                                    3 -> state.historySales.size
                                    else -> null
                                }
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(title, fontWeight = if (state.activeTab == index) FontWeight.Bold else FontWeight.Normal, fontSize = 13.sp)
                                    if (count != null && count > 0) {
                                        Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primary) {
                                            Text("$count", fontSize = 10.sp, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                }
                            },
                        )
                    }
                }

                // ── Tab Content ─────────────────────────────────────────────
                when (state.activeTab) {
                    0 -> RequestTab(state, viewModel)
                    1 -> PendingTab(state, viewModel)
                    2 -> ActiveTab(state, viewModel)
                    3 -> HistoryTab(state, viewModel)
                }
            }
        }

        // ── Rate & Review Dialog ──────────────────────────────────────────────
        if (state.showRateDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.setRateDialog(false) },
                title = { Text("Rate Your Purchase", fontWeight = FontWeight.Bold) },
                text = {
                    Column {
                        Text("How was your experience with this purchase?", fontSize = 13.sp, color = Color.Gray)
                        Spacer(Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center
                        ) {
                            (1..5).forEach { star ->
                                IconButton(onClick = { viewModel.setSelectedRating(star) }) {
                                    Icon(
                                        imageVector = if (star <= state.selectedRating) Icons.Default.Star else Icons.Default.StarBorder,
                                        contentDescription = "Star $star",
                                        tint = if (star <= state.selectedRating) Color(0xFFFFB800) else Color.Gray,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = state.rateComment,
                            onValueChange = { viewModel.setRateComment(it) },
                            label = { Text("Review / Feedback (optional)") },
                            modifier = Modifier.fillMaxWidth(),
                            maxLines = 3,
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = { viewModel.submitRating() },
                        enabled = !state.actionLoading
                    ) {
                        Text(if (state.actionLoading) "Submitting..." else "Submit Rating")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.setRateDialog(false) }) {
                        Text("Cancel")
                    }
                }
            )
        }

        // ── Loading overlay ──────────────────────────────────────────────────
        if (state.actionLoading) {
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.3f)), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color.White)
            }
        }
    }

    // ── Razorpay sale-checkout observer (native sheet) ────────────────────────
    val context = LocalContext.current
    val activity = context as? android.app.Activity
    LaunchedEffect(Unit) {
        viewModel.saleCheckoutEvent.collect { event ->
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
                        put("description", "Sale: ${event.saleTitle}")
                        put("theme", JSONObject().apply { put("color", "#16A34A") })
                    }
                    if (activity is com.zaruda.app.MainActivity) {
                        activity.onRazorpayCallback = { _, response ->
                            val orderId = response.optString("razorpay_order_id", "")
                            val paymentId = response.optString("razorpay_payment_id", "")
                            val signature = response.optString("razorpay_signature", "")
                            if (orderId.isNotBlank() && paymentId.isNotBlank() && signature.isNotBlank()) {
                                viewModel.verifySalePayment(event.saleId, orderId, paymentId, signature)
                            } else {
                                viewModel.dismissPayResult()
                            }
                        }
                    }
                    checkout.open(activity, options)
                } catch (e: Exception) {
                    android.util.Log.e("Razorpay", "Sale checkout error: ${e.message}")
                    viewModel.dismissPayResult()
                }
            }
        }
    }

    // ── Fraud Report Dialog ────────────────────────────────────────────────────
    if (state.showFraudDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.dismissFraudDialog() },
            title = { Text("Report Fraud", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Reporting: ${state.fraudReportedParty}", fontSize = 13.sp, color = Color.Gray)
                    OutlinedTextField(
                        value = state.fraudReason,
                        onValueChange = viewModel::setFraudReason,
                        label = { Text("Describe the fraud issue") },
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        maxLines = 5,
                    )
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.submitFraudReport() }, enabled = state.fraudReason.isNotBlank() && !state.actionLoading) {
                    Text("Report")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.dismissFraudDialog() }) { Text("Cancel") }
            }
        )
    }

    // ── Sale payment result dialog ─────────────────────────────────────────────
    state.payResult?.let { result ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissPayResult() },
            title = {
                Text(
                    if (result.success) "✅ Payment Successful" else "❌ Payment Failed",
                    fontWeight = FontWeight.Bold,
                    color = if (result.success) Color(0xFF16A34A) else Color(0xFFDC2626),
                )
            },
            text = { Text(result.message, fontSize = 14.sp) },
            confirmButton = {
                Button(onClick = { viewModel.dismissPayResult() }) { Text("OK") }
            },
        )
    }

    // ── Mark as Shipped sheet (shipment evidence) ──────────────────────────────
    if (state.showShipSheet) {
        MarkShippedSheet(
            courierName = state.courierName,
            trackingNumber = state.trackingNumber,
            submitting = state.actionLoading,
            error = state.shipError,
            onCourierChange = viewModel::setCourierName,
            onTrackingChange = viewModel::setTrackingNumber,
            onSubmit = viewModel::submitShipment,
            onDismiss = { viewModel.setShipSheet(false) },
        )
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Suspension Banner
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun SuspensionBanner(state: SaleDoneUiState, viewModel: SaleDoneViewModel) {
    val suspension = state.suspensionStatus ?: return
    val isDark = ColorTokens.isDarkTheme()

    Surface(
        shape = RoundedCornerShape(0.dp),
        color = if (isDark) Color(0xFF450A0A) else Color(0xFFFEF2F2),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Warning, null, tint = if (isDark) Color(0xFFFCA5A5) else Color(0xFFDC2626), modifier = Modifier.size(24.dp))
                Text(
                    if (state.isPermanentlyLocked) "Account Permanently Locked" else "Account Suspended",
                    fontWeight = FontWeight.Bold,
                    color = if (isDark) Color(0xFFFCA5A5) else Color(0xFF991B1B),
                    fontSize = 16.sp,
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                suspension.reason ?: "Suspension reason not specified",
                color = if (isDark) Color(0xFFFCA5A5).copy(alpha = 0.85f) else Color(0xFF7F1D1D),
                fontSize = 13.sp,
            )
            if (!state.isPermanentlyLocked) {
                Spacer(Modifier.height(4.dp))
                Text(
                    "Time remaining: ${suspension.remainingHours}h ${suspension.remainingMinutes}m",
                    color = if (isDark) Color(0xFFF87171) else Color(0xFFB91C1C),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                )
                Spacer(Modifier.height(8.dp))
                if (!state.suspensionRespondSuccess && !state.showSuspensionRespond) {
                    OutlinedButton(onClick = { viewModel.setSuspensionRespond(true) }) {
                        Text("Respond to Suspension")
                    }
                }
                if (state.showSuspensionRespond && !state.suspensionRespondSuccess) {
                    OutlinedTextField(
                        value = state.suspensionRespondMessage,
                        onValueChange = viewModel::setSuspensionRespondMessage,
                        label = { Text("Explain your situation") },
                        modifier = Modifier.fillMaxWidth().height(100.dp),
                        maxLines = 4,
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { viewModel.respondToFraudFlag() }, enabled = state.suspensionRespondMessage.isNotBlank()) {
                            Text("Submit Response")
                        }
                        TextButton(onClick = { viewModel.setSuspensionRespond(false) }) {
                            Text("Cancel")
                        }
                    }
                }
                if (state.suspensionRespondSuccess) {
                    Text(
                        "Response submitted! Admin will review.",
                        color = Color(0xFF166534),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                    )
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(
                "Only the Sale Done page is accessible during suspension.",
                color = Color(0xFF6B7280),
                fontSize = 11.sp,
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
            )
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Sale Flow Stepper — explains the escrow process step by step
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun SaleFlowStepper(isDark: Boolean) {
    val steps = listOf(
        Triple(stringResource(R.string.commerce_buy_flow_step1_title), stringResource(R.string.commerce_buy_flow_step1_desc), "📝"),
        Triple(stringResource(R.string.commerce_buy_flow_step2_title), stringResource(R.string.commerce_buy_flow_step2_desc), "✅"),
        Triple(stringResource(R.string.commerce_buy_flow_step3_title), stringResource(R.string.commerce_buy_flow_step3_desc), "💳"),
        Triple(stringResource(R.string.commerce_buy_flow_step4_title), stringResource(R.string.commerce_buy_flow_step4_desc), "📦"),
        Triple(stringResource(R.string.commerce_buy_flow_step5_title), stringResource(R.string.commerce_buy_flow_step5_desc), "💰"),
    )
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.9f) else Color(0xFFF0FDF4),
        border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.35f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("🛡️", fontSize = 14.sp)
                Text(
                    stringResource(R.string.commerce_buy_flow_title),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = if (isDark) Color.White else Color(0xFF1E293B),
                )
            }
            steps.forEach { (title, desc, emoji) ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF059669).copy(alpha = 0.12f), modifier = Modifier.size(30.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(emoji, fontSize = 13.sp)
                        }
                    }
                    Column(Modifier.weight(1f)) {
                        Text(title, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = if (isDark) Color.White else Color(0xFF1E293B))
                        Text(desc, fontSize = 11.sp, color = if (isDark) Color.Gray else Color(0xFF64748B))
                    }
                }
            }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = if (isDark) Color(0xFF1C1408) else Color(0xFFFEF3C7),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    "⚠️ " + stringResource(R.string.commerce_buy_flow_fraud_note),
                    fontSize = 10.5.sp,
                    color = if (isDark) Color(0xFFFDE68A) else Color(0xFF78350F),
                    modifier = Modifier.padding(10.dp),
                )
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Payment mode selector — in-app escrow vs outside-app direct
// The mode is category-driven and server-enforced: Electronics → in-app escrow
// only; every other category → direct/outside only. The full selector only
// appears while the post's eligibility is still unknown (null).
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun PaymentModeSection(state: SaleDoneUiState, viewModel: SaleDoneViewModel) {
    val isDark = ColorTokens.isDarkTheme()
    when (state.escrowEligible) {
        true -> {
            // ── Electronics: in-app escrow is the only option ──────────────
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFF059669).copy(alpha = if (isDark) 0.18f else 0.08f),
                border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("🛡️", fontSize = 16.sp)
                    Column {
                        Text(
                            "Escrow Protected — this Electronics listing is paid inside the app. Your money is held securely and released only after you confirm receipt.",
                            fontSize = 11.5.sp,
                            lineHeight = 15.sp,
                            color = if (isDark) Color(0xFFA7F3D0) else Color(0xFF065F46),
                        )
                        if (state.escrowFeePct != null) {
                            Spacer(Modifier.height(2.dp))
                            Text(
                                "Platform fee ${state.escrowFeePct}% applies on sale completion (seller side).",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF047857),
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            PaymentModeOption(
                selected = true,
                title = "Pay inside the app (escrow)",
                subtitle = "Required for Electronics listings — safest for both parties.",
                emoji = "🛡️",
                onClick = { viewModel.setPaymentMode("IN_APP") },
            )
        }
        false -> {
            // ── Other categories: direct/outside is the only option ─────────
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFFF59E0B).copy(alpha = if (isDark) 0.15f else 0.08f),
                border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("🤝", fontSize = 16.sp)
                    Text(
                        "Direct payment — this category doesn't use in-app escrow. You and the seller arrange payment directly (cash / UPI); the sale is still tracked here.",
                        fontSize = 11.5.sp,
                        lineHeight = 15.sp,
                        color = if (isDark) Color(0xFFFDE68A) else Color(0xFF92400E),
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            PaymentModeOption(
                selected = true,
                title = "Pay outside the app",
                subtitle = "Cash / direct UPI between you and the seller. Sale is still tracked here.",
                emoji = "🤝",
                onClick = { viewModel.setPaymentMode("OUTSIDE") },
            )
        }
        null -> {
            // ── Unknown yet: show both, the server enforces the final mode ──
            Text("How do you want to pay?", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
            PaymentModeOption(
                selected = state.selectedPaymentMode == "IN_APP",
                title = "Pay inside the app (escrow)",
                subtitle = "Money is held securely and released only after you confirm receipt. Safest.",
                emoji = "🛡️",
                onClick = { viewModel.setPaymentMode("IN_APP") },
            )
            PaymentModeOption(
                selected = state.selectedPaymentMode == "OUTSIDE",
                title = "Pay outside the app",
                subtitle = "Cash / direct UPI between you and the seller. Sale is still tracked here.",
                emoji = "🤝",
                onClick = { viewModel.setPaymentMode("OUTSIDE") },
            )
        }
    }
}

@Composable
private fun PaymentModeOption(
    selected: Boolean,
    title: String,
    subtitle: String,
    emoji: String,
    onClick: () -> Unit,
) {
    val isDark = ColorTokens.isDarkTheme()
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = if (selected) Color(0xFF059669).copy(alpha = if (isDark) 0.25f else 0.12f) else (if (isDark) Color(0xFF0F172A).copy(alpha = 0.7f) else Color(0xFFF8FAFC)),
        border = BorderStroke(if (selected) 1.5.dp else 1.dp, if (selected) Color(0xFF059669) else Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(emoji, fontSize = 18.sp)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isDark) Color.White else Color(0xFF1E293B))
                Text(subtitle, fontSize = 11.sp, color = if (isDark) Color.Gray else Color(0xFF64748B))
            }
            if (selected) {
                Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF059669), modifier = Modifier.size(20.dp))
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Mark as Shipped sheet — seller captures courier + tracking evidence
// ──────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MarkShippedSheet(
    courierName: String,
    trackingNumber: String,
    submitting: Boolean,
    error: String?,
    onCourierChange: (String) -> Unit,
    onTrackingChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = if (ColorTokens.isDarkTheme()) Color(0xFF0F172A) else Color.White,
    ) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("📦 Mark as Shipped", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(
                "Add shipment details so the buyer can track the parcel. At least one field is required.",
                fontSize = 13.sp,
                color = Color.Gray,
            )
            OutlinedTextField(
                value = courierName,
                onValueChange = onCourierChange,
                label = { Text("Courier / delivery partner (e.g. BlueDart, DTDC)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = trackingNumber,
                onValueChange = onTrackingChange,
                label = { Text("Tracking number (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            error?.let {
                Text(it, color = Color(0xFFDC2626), fontSize = 12.sp)
            }
            Button(
                onClick = onSubmit,
                enabled = !submitting,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0EA5E9)),
            ) {
                Text(if (submitting) "Submitting..." else "Confirm Shipment", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Tab: Request
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun RequestTab(state: SaleDoneUiState, viewModel: SaleDoneViewModel) {
    val isDark = ColorTokens.isDarkTheme()

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            stringResource(R.string.commerce_request_title),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = if (isDark) Color.White else Color(0xFF1E293B),
        )
        Text(
            stringResource(R.string.commerce_request_desc),
            fontSize = 13.sp,
            color = if (isDark) Color.Gray else Color(0xFF64748B),
        )

        // ── How Buy via App works — escrow stepper (Electronics only) ───────
        if (state.escrowEligible != false) {
            SaleFlowStepper(isDark)
        }

        if (state.requestSuccess) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White,
                shadowElevation = 4.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("✅", fontSize = 36.sp)
                    Text(
                        stringResource(R.string.commerce_request_sent),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF14532D),
                    )
                    Text(
                        stringResource(R.string.commerce_request_sent_desc),
                        fontSize = 13.sp,
                        color = if (isDark) Color.Gray else Color(0xFF475569),
                    )
                    Spacer(Modifier.height(4.dp))
                    SaleProgressTracker(SaleInfo(status = "requested"), isDark)
                    Spacer(Modifier.height(4.dp))
                    OutlinedButton(onClick = { viewModel.resetForm() }) {
                        Text("Send Another")
                    }
                }
            }
        } else if (state.prefilledFromPost) {
            // ── Clean confirmation card — opened from a post via Buy Now ──────
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White,
                shadowElevation = 4.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF059669).copy(alpha = 0.12f), modifier = Modifier.size(42.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.ShoppingBag, null, tint = Color(0xFF059669), modifier = Modifier.size(22.dp))
                            }
                        }
                        Column(Modifier.weight(1f)) {
                            Text(
                                stringResource(R.string.commerce_request_confirm_title),
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = if (isDark) Color.White else Color(0xFF1E293B),
                            )
                            Text(
                                stringResource(R.string.commerce_request_confirm_desc),
                                fontSize = 12.sp,
                                color = if (isDark) Color.Gray else Color(0xFF64748B),
                            )
                        }
                    }
                    HorizontalDivider()
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.Inventory, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
                            Column {
                                Text(stringResource(R.string.commerce_field_listing), fontSize = 10.sp, color = Color.Gray)
                                Text(state.postId.take(12), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                        Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.Person, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
                            Column {
                                Text(stringResource(R.string.commerce_field_seller), fontSize = 10.sp, color = Color.Gray)
                                Text(state.sellerId.take(12), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    // ── How do you want to pay? (category-driven) ──
                    PaymentModeSection(state, viewModel)
                    state.error?.let { err ->
                        Text(err, color = Color(0xFFDC2626), fontSize = 12.sp)
                    }
                    Button(
                        onClick = { viewModel.requestSale() },
                        enabled = !state.loading,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                    ) {
                        if (state.loading) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                        } else {
                            Icon(Icons.Default.Send, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(stringResource(R.string.commerce_request_confirm_button), fontWeight = FontWeight.Bold)
                        }
                    }
                    TextButton(
                        onClick = { viewModel.clearPrefill() },
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                    ) {
                        Text(stringResource(R.string.commerce_request_edit), color = Color(0xFF3B82F6), fontSize = 13.sp)
                    }
                }
            }
        } else {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White,
                shadowElevation = 4.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    MhubTextField(
                        label = stringResource(R.string.commerce_field_seller),
                        value = state.sellerId,
                        onValueChange = viewModel::setSellerId,
                    )
                    MhubTextField(
                        label = stringResource(R.string.commerce_field_listing),
                        value = state.postId,
                        onValueChange = viewModel::setPostId,
                    )
                    Spacer(Modifier.height(2.dp))
                    // ── How do you want to pay? (category-driven) ──
                    PaymentModeSection(state, viewModel)

                    state.error?.let { err ->
                        Text(err, color = Color(0xFFDC2626), fontSize = 12.sp)
                    }

                    Button(
                        onClick = { viewModel.requestSale() },
                        enabled = state.sellerId.isNotBlank() && state.postId.isNotBlank() && !state.loading,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        if (state.loading) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                        } else {
                            Icon(Icons.Default.Send, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(stringResource(R.string.commerce_send_request))
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Tab: Pending (seller view — pending incoming requests)
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun PendingTab(state: SaleDoneUiState, viewModel: SaleDoneViewModel) {
    val isDark = ColorTokens.isDarkTheme()

    if (state.loading && state.pendingRequests.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    if (state.pendingRequests.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Inbox, null, modifier = Modifier.size(48.dp), tint = Color.Gray)
                Spacer(Modifier.height(8.dp))
                Text("No pending requests", color = Color.Gray, fontSize = 14.sp)
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(state.pendingRequests, key = { it.id }) { sale ->
            PendingRequestCard(sale, state, viewModel, isDark)
        }
    }
}

@Composable
private fun PendingRequestCard(sale: SaleInfo, state: SaleDoneUiState, viewModel: SaleDoneViewModel, isDark: Boolean) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White,
        shadowElevation = 4.dp,
        modifier = Modifier.fillMaxWidth().animateContentSize(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Person, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text(sale.buyerName ?: "Unknown Buyer", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("wants to buy:", fontSize = 12.sp, color = Color.Gray)
                }
            }
            Text(sale.postTitle ?: "Unknown Post", fontWeight = FontWeight.Medium, fontSize = 14.sp)
            if (sale.postPrice != null) {
                Text("₹ ${(sale.postPrice ?: 0.0).toInt()}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
            }
            SaleProgressTracker(sale, isDark)
            Spacer(Modifier.height(2.dp))
            HorizontalDivider()
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { viewModel.approveSale(sale.id) },
                    enabled = !state.actionLoading,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                ) {
                    Text("Approve", color = Color.White)
                }
                OutlinedButton(
                    onClick = { viewModel.rejectSale(sale.id) },
                    enabled = !state.actionLoading,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                ) {
                    Text("Reject")
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Tab: Active (buyer & seller views)
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun ActiveTab(state: SaleDoneUiState, viewModel: SaleDoneViewModel) {
    val isDark = ColorTokens.isDarkTheme()

    if (state.loading && state.activeSales.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    if (state.activeSales.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.ShoppingCart, null, modifier = Modifier.size(48.dp), tint = Color.Gray)
                Spacer(Modifier.height(8.dp))
                Text("No active sales", color = Color.Gray, fontSize = 14.sp)
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(state.activeSales, key = { it.id }) { sale ->
            ActiveSaleCard(sale, state, viewModel, isDark)
        }
    }
}

@Composable
private fun ActiveSaleCard(sale: SaleInfo, state: SaleDoneUiState, viewModel: SaleDoneViewModel, isDark: Boolean) {
    // Determine user role based on sale status and fields
    val isBuyerView = sale.status == "received" // If order is already marked received, buyer has acted
    val statusLabel = when (sale.status) {
        "requested" -> "📨 Waiting for seller to accept your request"
        "approved" -> if (sale.isInApp && !sale.isPaid) "✅ Approved — pay securely to continue (money is held)" else "✅ Approved — awaiting confirmation"
        "shipped" -> "🚚 Shipped — confirm once you receive it"
        "received" -> "📦 Order received — funds will release to the seller"
        "settled" -> "✅ Completed — funds paid to the seller"
        "fraud" -> "⚠️ Dispute — funds frozen, support is reviewing"
        "rejected" -> "❌ Rejected by the seller"
        else -> sale.status ?: "Unknown"
    }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White,
        shadowElevation = 4.dp,
        modifier = Modifier.fillMaxWidth().animateContentSize(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Description, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text(sale.postTitle ?: "Post #${sale.id}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Sale #${sale.id} — ${sale.sellerName ?: "Seller"}", fontSize = 12.sp, color = Color.Gray)
                }
            }
            // ── Route tracking badge (Origin → Destination) ──
            sale.routeTag?.let { route ->
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isDark) Color(0xFF1E3A5F).copy(alpha = 0.4f) else Color(0xFFDBEAFE),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text("🚚", fontSize = 12.sp)
                        Text(
                            "Origin: $route",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isDark) Color(0xFF93C5FD) else Color(0xFF1D4ED8),
                        )
                    }
                }
            }
            if (sale.postPrice != null) {
                Text("₹ ${(sale.postPrice ?: 0.0).toInt()}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)
            }
            // ── Mid-flow status tracker ──────────────────────────────────────
            SaleProgressTracker(sale, isDark)
            Spacer(Modifier.height(2.dp))
            Surface(shape = RoundedCornerShape(6.dp), color = statusColor(sale.status).copy(alpha = 0.1f)) {
                Text(statusLabel, fontSize = 11.sp, color = statusColor(sale.status), fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
            }

            // ── Shipping evidence — visible to both parties after the seller ships ──
            if (!sale.shippingCourier.isNullOrBlank() || !sale.shippingTracking.isNullOrBlank()) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF0EA5E9).copy(alpha = 0.1f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text("📦", fontSize = 12.sp)
                        Text(
                            listOfNotNull(
                                sale.shippingCourier,
                                sale.shippingTracking?.let { "Tracking: $it" },
                            ).joinToString(" · "),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF0369A1),
                        )
                    }
                }
            }

            // In-app escrow payment status
            if (sale.isInApp) {
                val (payLabel, payColor) = when (sale.paymentStatus?.uppercase()) {
                    "PAID" -> "🔒 Paid — your money is held safely until you confirm receipt" to Color(0xFF16A34A)
                    "ORDER_CREATED" -> "Payment started — complete it below" to Color(0xFFF59E0B)
                    "FAILED" -> "Payment failed — retry below" to Color(0xFFDC2626)
                    else -> "Awaiting payment — pay securely, money is held" to Color(0xFF2563EB)
                }
                Surface(shape = RoundedCornerShape(6.dp), color = payColor.copy(alpha = 0.1f)) {
                    Text(payLabel, fontSize = 11.sp, color = payColor, fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                }
            }

            // Actions based on status + role — each party only sees their own actions
            val isBuyer = sale.buyerId?.equals(viewModel.currentUserId, ignoreCase = true) == true
            val isSeller = sale.sellerId?.equals(viewModel.currentUserId, ignoreCase = true) == true

            // Buyer's pending request — withdraw before the seller acts
            if (sale.status == "requested" && isBuyer) {
                HorizontalDivider()
                OutlinedButton(
                    onClick = { viewModel.cancelSale(sale.id) },
                    enabled = !state.actionLoading,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                ) {
                    Icon(Icons.Default.Close, null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Cancel Request", color = Color(0xFFDC2626), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }

            if (sale.status == "approved" || sale.status == "shipped") {
                HorizontalDivider()
                Text("Actions:", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Color.Gray)

                // Buyer: Pay Now (IN_APP escrow) — only for the actual buyer
                if (sale.isInApp && !sale.isPaid && isBuyer) {
                    Button(
                        onClick = { viewModel.paySale(sale) },
                        enabled = !state.actionLoading,
                        modifier = Modifier.fillMaxWidth().height(44.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                    ) {
                        if (state.actionLoading) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                        } else {
                            Text("💳 Pay ₹${(sale.payableAmount ?: 0.0).toInt()} — money held until you confirm", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                }

                // Seller: Mark as Shipped (opens shipment-evidence sheet)
                if (isSeller && sale.status == "approved") {
                    Button(
                        onClick = { viewModel.setShipSheet(true, sale.id) },
                        enabled = !state.actionLoading,
                        modifier = Modifier.fillMaxWidth().height(44.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0EA5E9)),
                    ) {
                        Text("📦 Mark as Shipped", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(4.dp))
                }

                // Buyer: Order Received + fraud
                if (isBuyer) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Button(
                            onClick = { viewModel.markOrderReceived(sale.id) },
                            enabled = !state.actionLoading && (!sale.isInApp || sale.isPaid),
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                        ) {
                            Text("✅ Order Received", color = Color.White, fontSize = 10.sp)
                        }
                        OutlinedButton(
                            onClick = { viewModel.setFraudDialog(sale.id, "seller") },
                            enabled = !state.actionLoading,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                        ) {
                            Icon(Icons.Default.Flag, null, modifier = Modifier.size(12.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("⬇ Not Received", fontSize = 10.sp, color = Color(0xFFDC2626))
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                }

                // Seller: Amount Received + fraud
                if (isSeller) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Button(
                            onClick = { viewModel.markAmountReceived(sale.id) },
                            enabled = !state.actionLoading,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                        ) {
                            Text("💰 Amount Received", color = Color.White, fontSize = 10.sp)
                        }
                        OutlinedButton(
                            onClick = { viewModel.setFraudDialog(sale.id, "buyer") },
                            enabled = !state.actionLoading,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                        ) {
                            Icon(Icons.Default.Flag, null, modifier = Modifier.size(12.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("💰 Not Received", fontSize = 10.sp, color = Color(0xFFDC2626))
                        }
                    }
                }
            }

            // 'received' reached two ways:
            //  - seller marked paid first (agreedPrice set) → buyer confirms receipt to complete
            //  - buyer confirmed first (agreedPrice null) → seller confirms payment to complete
            if (sale.status == "received" && isBuyer && sale.agreedPrice != null) {
                HorizontalDivider()
                Button(
                    onClick = { viewModel.markOrderReceived(sale.id) },
                    enabled = !state.actionLoading,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                ) {
                    Text("✅ Confirm Receipt & Complete", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(4.dp))
                OutlinedButton(
                    onClick = { viewModel.setFraudDialog(sale.id, "seller") },
                    enabled = !state.actionLoading,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                ) {
                    Text("⬇ Didn't receive the item?", fontSize = 12.sp, color = Color(0xFFDC2626))
                }
            }

            if (sale.status == "received" && isSeller && sale.agreedPrice == null) {
                HorizontalDivider()
                Button(
                    onClick = { viewModel.markAmountReceived(sale.id) },
                    enabled = !state.actionLoading,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                ) {
                    Text("💰 Amount Received — Complete Sale", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(4.dp))
                OutlinedButton(
                    onClick = { viewModel.setFraudDialog(sale.id, "buyer") },
                    enabled = !state.actionLoading,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                ) {
                    Text("💰 Didn't receive the payment?", fontSize = 12.sp, color = Color(0xFFDC2626))
                }
            }
        }
    }
}

private fun statusColor(status: String?): Color = when (status) {
    "requested" -> Color(0xFFF59E0B)
    "approved" -> Color(0xFF2563EB)
    "shipped" -> Color(0xFF0EA5E9)
    "received" -> Color(0xFF8B5CF6)
    "settled" -> Color(0xFF16A34A)
    "fraud" -> Color(0xFFDC2626)
    "rejected" -> Color(0xFF6B7280)
    else -> Color(0xFF6B7280)
}

// ──────────────────────────────────────────────────────────────────────────────
// Mid-flow progress tracker — Request → Accepted → Paid → Delivered
// ──────────────────────────────────────────────────────────────────────────────

private data class TrackerStep(
    val label: String,
    val hint: String,
    val icon: ImageVector,
)

/** Maps a sale status to (stepsCompleted, currentStepHint). */
private fun saleProgressSteps(sale: SaleInfo): Pair<Int, String> {
    val status = sale.status ?: ""
    val paid = sale.isPaid || status == "shipped" || status == "received" || status == "settled"
    return when (status) {
        "requested" -> 1 to "Waiting for seller to accept"
        "approved" -> if (paid) 3 to "Money held — confirm when you receive it" else 2 to "Pay securely to continue (money held)"
        "shipped" -> 3 to "Confirm once you receive the item"
        "received" -> 4 to "Funds releasing to the seller"
        "settled" -> 4 to "Completed — funds paid to the seller"
        "fraud" -> 1 to "Dispute — funds frozen, support reviewing"
        "rejected" -> 1 to "Rejected by the seller"
        else -> 0 to ""
    }
}

/**
 * Visual stepper showing where a sale is in the escrow flow.
 * done = number of completed steps (0..4). Connector lines are drawn
 * behind the circles so they connect edge-to-edge at the correct height.
 */
@Composable
private fun SaleProgressTracker(sale: SaleInfo?, isDark: Boolean) {
    val (done, hint) = if (sale != null) saleProgressSteps(sale) else 0 to ""
    val isHalted = sale?.status == "fraud" || sale?.status == "rejected"
    val stepColor = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
    val lineColor = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)
    val doneColor = Color(0xFF10B981)
    val blockedColor = Color(0xFFDC2626)
    val steps = listOf(
        TrackerStep("Request", "Sent to seller", Icons.Default.Send),
        TrackerStep("Accepted", "Seller approved", Icons.Default.CheckCircle),
        TrackerStep("Paid", "Money held", Icons.Default.Lock),
        TrackerStep("Delivered", "Confirmed", Icons.Default.LocalShipping),
    )

    // Pulsing glow for the current step
    val infinite = rememberInfiniteTransition(label = "tracker")
    val pulse by infinite.animateFloat(
        initialValue = 0.25f,
        targetValue = 0.6f,
        animationSpec = infiniteRepeatable(tween(1100), RepeatMode.Reverse),
        label = "pulse",
    )

    Column(Modifier.fillMaxWidth()) {
        // ── Row 1: nodes with connector lines behind them (edge-to-edge) ─────
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            steps.forEachIndexed { index, step ->
                val isDone = index < done
                val isCurrent = index == done && !isHalted && done < 4
                val isBlocked = index == done && isHalted

                Box(
                    Modifier.weight(1f).height(44.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    // Left segment (from previous node center to this node center)
                    if (index > 0) {
                        Box(
                            Modifier
                                .align(Alignment.CenterStart)
                                .fillMaxWidth(0.5f)
                                .height(3.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(
                                    when {
                                        index < done -> doneColor
                                        isBlocked -> blockedColor.copy(alpha = 0.55f)
                                        else -> lineColor
                                    }
                                ),
                        )
                    }
                    // Right segment (from this node center to the next node center)
                    if (index < steps.lastIndex) {
                        Box(
                            Modifier
                                .align(Alignment.CenterEnd)
                                .fillMaxWidth(0.5f)
                                .height(3.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(
                                    when {
                                        index + 1 < done -> doneColor
                                        isHalted && index + 1 == done -> blockedColor.copy(alpha = 0.55f)
                                        else -> lineColor
                                    }
                                ),
                        )
                    }
                    // Glow ring behind the current node
                    if (isCurrent) {
                        Box(
                            Modifier.size(46.dp).clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = pulse)),
                        )
                    }
                    // Node circle
                    Surface(
                        shape = CircleShape,
                        color = when {
                            isDone -> doneColor
                            isBlocked -> blockedColor
                            isCurrent -> MaterialTheme.colorScheme.primary
                            else -> stepColor.copy(alpha = 0.16f)
                        },
                        border = if (!isDone && !isCurrent && !isBlocked) BorderStroke(1.5.dp, stepColor.copy(alpha = 0.6f)) else null,
                        modifier = Modifier.size(34.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            when {
                                isDone -> Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                                isBlocked -> Icon(Icons.Default.Close, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                else -> Icon(step.icon, contentDescription = null, tint = if (isCurrent) Color.White else stepColor, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }
            }
        }
        // ── Row 2: labels (same weight split so each centers under its node) ─
        Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
            steps.forEachIndexed { index, step ->
                val isDone = index < done
                val isCurrent = index == done && !isHalted && done < 4
                val isBlocked = index == done && isHalted
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        step.label,
                        fontSize = 10.sp,
                        fontWeight = if (isDone || isCurrent) FontWeight.Bold else FontWeight.Medium,
                        color = when {
                            isDone -> doneColor
                            isBlocked -> blockedColor
                            isCurrent -> MaterialTheme.colorScheme.primary
                            else -> if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
                        },
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                    )
                }
            }
        }
        // ── Hint banner ───────────────────────────────────────────────────────
        if (hint.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = if (isHalted) blockedColor.copy(alpha = 0.12f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    hint,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isHalted) blockedColor else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Tab: History
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun HistoryTab(state: SaleDoneUiState, viewModel: SaleDoneViewModel) {
    val isDark = ColorTokens.isDarkTheme()

    if (state.loading && state.historySales.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    if (state.historySales.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.History, null, modifier = Modifier.size(48.dp), tint = Color.Gray)
                Spacer(Modifier.height(8.dp))
                Text("No sale history yet", color = Color.Gray, fontSize = 14.sp)
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(state.historySales, key = { it.id }) { sale ->
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White,
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(sale.postTitle ?: "Post #${sale.id}", fontWeight = FontWeight.Medium, fontSize = 13.sp)
                        Text(
                            when (sale.status) {
                                "settled", "received" -> "✅ Completed"
                                "fraud" -> "⚠️ Fraud — " + (sale.fraudReason ?: "")
                                "rejected" -> "❌ Rejected"
                                else -> sale.status ?: ""
                            },
                            fontSize = 11.sp,
                            color = statusColor(sale.status),
                        )
                        if (sale.buyerRating != null) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                                Text("⭐ ${sale.buyerRating}/5", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFFB800))
                                if (!sale.buyerComment.isNullOrBlank()) {
                                    Text(" — \"${sale.buyerComment}\"", fontSize = 12.sp, color = Color.Gray, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        if (sale.postPrice != null) {
                            Text("₹ ${(sale.postPrice ?: 0.0).toInt()}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        if (listOf("received", "settled").contains(sale.status) && sale.buyerRating == null && sale.buyerId == viewModel.currentUserId) {
                            Spacer(Modifier.height(4.dp))
                            Button(
                                onClick = { viewModel.setRateDialog(true, sale.id) },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.height(28.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Text("Rate & Review", fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// SaleUndoneUiState — required by SaleUndoneScreen.kt
// ──────────────────────────────────────────────────────────────────────────────

data class SaleUndoneUiState(
    val loading: Boolean = false,
    val postId: String = "",
    val reason: String = "",
    val description: String = "",
    val success: Boolean = false,
    val error: String? = null,
    val transactionId: String? = null,
    val history: List<com.zaruda.app.data.remote.dto.UndoneRecord> = emptyList(),
)
