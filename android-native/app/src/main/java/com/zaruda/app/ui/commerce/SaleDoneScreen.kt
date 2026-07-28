package com.zaruda.app.ui.commerce

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.res.stringResource
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

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

    // Suspension respond
    val showSuspensionRespond: Boolean = false,
    val suspensionRespondMessage: String = "",
    val suspensionRespondSuccess: Boolean = false,
) {
    val isSuspended: Boolean get() = suspensionStatus?.suspended == true
    val isPermanentlyLocked: Boolean get() = suspensionStatus?.permanentlyLocked == true
}

// ──────────────────────────────────────────────────────────────────────────────
// ViewModel
// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class SaleDoneViewModel @Inject constructor(
    private val salesRepo: SalesRepository,
    private val savedStateHandle: androidx.lifecycle.SavedStateHandle,
) : ViewModel() {

    private val _state = MutableStateFlow(SaleDoneUiState())
    val state: StateFlow<SaleDoneUiState> = _state.asStateFlow()

    init {
        val prefillPostId = savedStateHandle.get<String>("postId")
        val prefillSellerId = savedStateHandle.get<String>("sellerId")
        if (!prefillSellerId.isNullOrBlank() && !prefillPostId.isNullOrBlank()) {
            _state.update {
                it.copy(
                    sellerId = prefillSellerId,
                    postId = prefillPostId,
                    activeTab = 0,
                )
            }
        }
        loadAll()
    }

    // ── Setters ────────────────────────────────────────────────────────────────

    fun setSellerId(v: String) { _state.update { it.copy(sellerId = v, requestSuccess = false, error = null) } }
    fun setPostId(v: String) { _state.update { it.copy(postId = v, requestSuccess = false, error = null) } }
    fun setActiveTab(tab: Int) { _state.update { it.copy(activeTab = tab) } }

    fun setFraudDialog(saleId: Int?, reportedParty: String) {
        _state.update { it.copy(showFraudDialog = saleId != null, fraudSaleId = saleId, fraudReportedParty = reportedParty, fraudReason = "") }
    }
    fun setFraudReason(v: String) { _state.update { it.copy(fraudReason = v) } }
    fun dismissFraudDialog() { _state.update { it.copy(showFraudDialog = false, fraudSaleId = null, fraudReason = "") } }

    fun setSuspensionRespond(show: Boolean) { _state.update { it.copy(showSuspensionRespond = show, suspensionRespondMessage = "") } }
    fun setSuspensionRespondMessage(v: String) { _state.update { it.copy(suspensionRespondMessage = v) } }

    fun clearActionMessages() { _state.update { it.copy(actionError = null, actionSuccess = null) } }

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
            when (val r = salesRepo.requestSale(SaleRequest(postId = s.postId, sellerId = s.sellerId))) {
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

    fun markOrderReceived(saleId: Int) {
        _state.update { it.copy(actionLoading = true, actionError = null, actionSuccess = null) }
        viewModelScope.launch {
            when (val r = salesRepo.orderReceived(saleId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(actionLoading = false, actionSuccess = "Order received confirmed!") }
                    loadAll()
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
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()
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
                    stringResource(R.string.commerce_mark_sold),
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
                val tabs = listOf("Request", "Pending", "Active", "History")
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

        // ── Loading overlay ──────────────────────────────────────────────────
        if (state.actionLoading) {
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.3f)), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color.White)
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
}

// ──────────────────────────────────────────────────────────────────────────────
// Suspension Banner
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun SuspensionBanner(state: SaleDoneUiState, viewModel: SaleDoneViewModel) {
    val suspension = state.suspensionStatus ?: return
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()

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
// Tab: Request
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun RequestTab(state: SaleDoneUiState, viewModel: SaleDoneViewModel) {
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            "Request a Sale",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = if (isDark) Color.White else Color(0xFF1E293B),
        )
        Text(
            "Enter the Seller's ID and the Post ID to initiate a sale request.",
            fontSize = 13.sp,
            color = if (isDark) Color.Gray else Color(0xFF64748B),
        )

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
                        "Sale Request Sent!",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = if (isDark) Color(0xFF6EE7B7) else Color(0xFF14532D),
                    )
                    Text(
                        "The seller will review your request.",
                        fontSize = 13.sp,
                        color = if (isDark) Color.Gray else Color(0xFF475569),
                    )
                    OutlinedButton(onClick = { viewModel.resetForm() }) {
                        Text("Send Another")
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
                        label = "Seller ID",
                        value = state.sellerId,
                        onValueChange = viewModel::setSellerId,
                    )
                    MhubTextField(
                        label = "Post ID",
                        value = state.postId,
                        onValueChange = viewModel::setPostId,
                    )

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
                            Text("Send Sale Request")
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
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()

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
                Text("₹ ${sale.postPrice.toInt()}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
            }
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
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()

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
        "requested" -> "Pending Approval"
        "approved" -> "Approved — Awaiting Confirmation"
        "received" -> "Order Received (waiting for seller)"
        "settled" -> "Completed"
        "fraud" -> "⚠️ Fraud Reported"
        "rejected" -> "Rejected"
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
            if (sale.postPrice != null) {
                Text("₹ ${sale.postPrice.toInt()}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)
            }
            Surface(shape = RoundedCornerShape(6.dp), color = statusColor(sale.status).copy(alpha = 0.1f)) {
                Text(statusLabel, fontSize = 11.sp, color = statusColor(sale.status), fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
            }

            // Action buttons based on status
            if (sale.status == "approved") {
                HorizontalDivider()
                Text("Actions:", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Color.Gray)
                // Buyer row: Order Received + fraud
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Button(
                        onClick = { viewModel.markOrderReceived(sale.id) },
                        enabled = !state.actionLoading,
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
                // Seller row: Amount Received + fraud
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
    }
}

private fun statusColor(status: String?): Color = when (status) {
    "requested" -> Color(0xFFF59E0B)
    "approved" -> Color(0xFF2563EB)
    "received" -> Color(0xFF8B5CF6)
    "settled" -> Color(0xFF16A34A)
    "fraud" -> Color(0xFFDC2626)
    "rejected" -> Color(0xFF6B7280)
    else -> Color(0xFF6B7280)
}

// ──────────────────────────────────────────────────────────────────────────────
// Tab: History
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun HistoryTab(state: SaleDoneUiState, viewModel: SaleDoneViewModel) {
    val isDark = androidx.compose.foundation.isSystemInDarkTheme()

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
                                "settled" -> "✅ Settled"
                                "fraud" -> "⚠️ Fraud — " + (sale.fraudReason ?: "")
                                "rejected" -> "❌ Rejected"
                                else -> sale.status ?: ""
                            },
                            fontSize = 11.sp,
                            color = statusColor(sale.status),
                        )
                    }
                    if (sale.postPrice != null) {
                        Text("₹ ${sale.postPrice.toInt()}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
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
