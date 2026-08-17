package com.zaruda.app.ui.account
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.R
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.userFacingMessage
import com.zaruda.app.data.remote.dto.PayoutStatusResponse
import com.zaruda.app.data.repository.PayoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private val payoutBgGradient: Brush
    @Composable get() {
        val isDark = ColorTokens.isDarkTheme()
        return if (isDark) Brush.verticalGradient(listOf(Color(0xFF0F1422), Color(0xFF131B2E), Color(0xFF152035)))
        else Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))
    }

@Composable
private fun PayoutTopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = MaterialTheme.colorScheme.primary)
        }
        Spacer(Modifier.width(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
    }
}

data class PayoutUiState(
    val loading: Boolean = true,
    val status: PayoutStatusResponse? = null,
    val kycVerified: Boolean? = null,
    val method: String = "upi", // "upi" | "bank_account"
    val upiId: String = "",
    val accountNumber: String = "",
    val ifsc: String = "",
    val beneficiaryName: String = "",
    val linking: Boolean = false,
    val error: String? = null,
    val message: String? = null,
) {
    val hasLinkedUpi: Boolean get() = status?.payoutMethods?.any { it.type == "upi" && it.linked } == true
    val hasLinkedBank: Boolean get() = status?.payoutMethods?.any { it.type == "bank_account" && it.linked } == true
    val linkedUpiId: String? get() = status?.payoutMethods?.firstOrNull { it.type == "upi" }?.upiDisplay
    val linkedBankDisplay: String? get() = status?.payoutMethods?.firstOrNull { it.type == "bank_account" }?.let {
        val acc = it.accountNumberDisplay ?: ""
        val ifsc = it.ifscDisplay ?: ""
        listOf(acc, ifsc).filter { s -> s.isNotBlank() }.joinToString(" · ")
    }
    val isSandbox: Boolean get() = status?.razorpayContactId?.startsWith("contact_mock_") == true
}

@HiltViewModel
class PayoutViewModel @Inject constructor(
    private val repo: PayoutRepository,
    private val authRepo: com.zaruda.app.data.repository.AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(PayoutUiState())
    val state: StateFlow<PayoutUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            loadKycStatus()
            when (val r = repo.status()) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(loading = false, status = r.data)
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(
                        loading = false,
                        error = r.error.userFacingMessage("load payout status"),
                    )
                }
            }
        }
    }

    /** Reload payout status in place (no full-screen spinner) after linking. */
    private fun refreshStatus() {
        viewModelScope.launch {
            when (val r = repo.status()) {
                is ApiResult.Success -> _state.value = _state.value.copy(status = r.data, error = null)
                is ApiResult.Failure -> {}
            }
        }
    }

    private suspend fun loadKycStatus() {
        if (authRepo.isDemoSession) {
            _state.value = _state.value.copy(kycVerified = true)
            return
        }
        when (val r = authRepo.me()) {
            is ApiResult.Success -> _state.value = _state.value.copy(kycVerified = r.data.isKycVerified)
            is ApiResult.Failure -> _state.value = _state.value.copy(kycVerified = null)
        }
    }

    fun setMethod(method: String) { _state.value = _state.value.copy(method = method) }
    fun setUpiId(v: String) { _state.value = _state.value.copy(upiId = v) }
    fun setAccountNumber(v: String) { _state.value = _state.value.copy(accountNumber = v) }
    fun setIfsc(v: String) { _state.value = _state.value.copy(ifsc = v.uppercase()) }
    fun setBeneficiaryName(v: String) { _state.value = _state.value.copy(beneficiaryName = v) }

    fun link() {
        val s = _state.value
        val validationError = when (s.method) {
            "upi" -> if (!isValidUpi(s.upiId.trim())) "Enter a valid UPI ID (e.g. name@upi)" else null
            "bank_account" -> when {
                s.accountNumber.trim().length < 9 -> "Enter a valid account number (min 9 digits)"
                s.ifsc.trim().length != 11 -> "Enter a valid 11-character IFSC code"
                s.beneficiaryName.trim().isBlank() -> "Enter the beneficiary name as per bank records"
                else -> null
            }
            else -> "Select a payout method"
        }
        if (validationError != null) {
            _state.value = s.copy(error = validationError, message = null)
            return
        }

        _state.value = s.copy(linking = true, error = null, message = null)
        viewModelScope.launch {
            val result = when (s.method) {
                "upi" -> repo.linkUpi(s.upiId.trim())
                else -> repo.linkBankAccount(s.accountNumber.trim(), s.ifsc.trim(), s.beneficiaryName.trim())
            }
            when (result) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        linking = false,
                        message = result.data.message ?: "Payout account linked successfully",
                        upiId = "",
                        accountNumber = "",
                        ifsc = "",
                        beneficiaryName = "",
                    )
                    refreshStatus() // update the linked-method card in place, no spinner
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(
                        linking = false,
                        error = result.error.userFacingMessage("link your payout account"),
                    )
                }
            }
        }
    }

    fun dismissMessages() { _state.value = _state.value.copy(error = null, message = null) }

    private fun isValidUpi(v: String): Boolean {
        if (v.isBlank()) return false
        return Regex("^[a-zA-Z0-9.\\-_]{2,256}@[a-zA-Z0-9]{2,64}$").matches(v)
    }
}

@Composable
fun PayoutScreen(
    onBack: () -> Unit,
    viewModel: PayoutViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Box(Modifier.fillMaxSize().background(payoutBgGradient)) {
        Column(Modifier.fillMaxSize()) {
            PayoutTopBar("Payout Account", onBack)

            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    // ── How payouts work info card ──
                    item {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                                Icon(
                                    Icons.Filled.Lock,
                                    null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp).padding(top = 2.dp),
                                )
                                Spacer(Modifier.width(10.dp))
                                Column {
                                    Text(
                                        "Get paid for your sales",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        "When a buyer pays in-app, funds are held securely in escrow until the sale is confirmed, then paid out to the UPI ID or bank account you link here.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        lineHeight = 17.sp,
                                    )
                                }
                            }
                        }
                    }

                    // ── Current linked status ──
                    item {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surface,
                            shadowElevation = 2.dp,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        "Linked Payout Method",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.weight(1f),
                                    )
                                    if (state.status?.linked == true) {
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = Color(0xFF22C55E).copy(alpha = 0.12f),
                                        ) {
                                            Row(
                                                Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                            ) {
                                                Icon(
                                                    Icons.Filled.CheckCircle,
                                                    null,
                                                    tint = Color(0xFF22C55E),
                                                    modifier = Modifier.size(12.dp),
                                                )
                                                Text(
                                                    "Linked",
                                                    fontSize = 11.sp,
                                                    color = Color(0xFF22C55E),
                                                    fontWeight = FontWeight.SemiBold,
                                                )
                                            }
                                        }
                                    } else {
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = Color(0xFFF59E0B).copy(alpha = 0.12f),
                                        ) {
                                            Text(
                                                "Not linked",
                                                fontSize = 11.sp,
                                                color = Color(0xFFB45309),
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                            )
                                        }
                                    }
                                }

                                if (state.status?.linked == true) {
                                    Spacer(Modifier.height(12.dp))
                                    if (state.hasLinkedUpi) {
                                        PayoutMethodRow(
                                            icon = "🔹",
                                            label = "UPI",
                                            value = state.linkedUpiId ?: "Linked UPI",
                                        )
                                    }
                                    if (state.hasLinkedBank) {
                                        PayoutMethodRow(
                                            icon = "🏦",
                                            label = "Bank Account",
                                            value = state.linkedBankDisplay ?: "Linked bank account",
                                        )
                                    }
                                    if (state.isSandbox) {
                                        Spacer(Modifier.height(8.dp))
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Color(0xFFFEF3C7),
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(
                                                    Icons.Filled.Warning,
                                                    null,
                                                    tint = Color(0xFFB45309),
                                                    modifier = Modifier.size(14.dp),
                                                )
                                                Spacer(Modifier.width(6.dp))
                                                Text(
                                                    "Sandbox mode — live payout requires Razorpay credentials.",
                                                    fontSize = 11.sp,
                                                    color = Color(0xFF92400E),
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ── Feedback ──
                    state.message?.let { msg ->
                        item {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFDCFCE7),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(msg, fontSize = 13.sp, color = Color(0xFF166534), modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                    state.error?.let { err ->
                        item {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFFEE2E2),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.Warning, null, tint = Color(0xFFDC2626), modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(err, fontSize = 13.sp, color = Color(0xFF991B1B), modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }

                    // ── Method selector ──
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(
                                selected = state.method == "upi",
                                onClick = { viewModel.setMethod("upi") },
                                label = { Text("UPI ID", fontSize = 12.sp) },
                                colors = FilterChipDefaultsColors(),
                            )
                            FilterChip(
                                selected = state.method == "bank_account",
                                onClick = { viewModel.setMethod("bank_account") },
                                label = { Text("Bank Account", fontSize = 12.sp) },
                                colors = FilterChipDefaultsColors(),
                            )
                        }
                    }

                    // ── Form ──
                    item {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surface,
                            shadowElevation = 2.dp,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                if (state.method == "upi") {
                                    Text(
                                        "Enter your UPI ID",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Text(
                                        "e.g. yourname@okhdfcbank or yourname@upi. You'll receive payouts to this VPA.",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Spacer(Modifier.height(2.dp))
                                    OutlinedTextField(
                                        value = state.upiId,
                                        onValueChange = viewModel::setUpiId,
                                        placeholder = { Text("name@upi", color = Color(0xFF94A3B8)) },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = PayoutFieldColors(),
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                } else {
                                    Text(
                                        "Enter your bank details",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    Text(
                                        "Account must be in the same name as your verified profile. Funds go to this account after sales settle.",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Spacer(Modifier.height(2.dp))
                                    OutlinedTextField(
                                        value = state.beneficiaryName,
                                        onValueChange = viewModel::setBeneficiaryName,
                                        placeholder = { Text("Beneficiary name", color = Color(0xFF94A3B8)) },
                                        singleLine = true,
                                        shape = RoundedCornerShape(12.dp),
                                        colors = PayoutFieldColors(),
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                    OutlinedTextField(
                                        value = state.accountNumber,
                                        onValueChange = viewModel::setAccountNumber,
                                        placeholder = { Text("Account number", color = Color(0xFF94A3B8)) },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = PayoutFieldColors(),
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                    OutlinedTextField(
                                        value = state.ifsc,
                                        onValueChange = viewModel::setIfsc,
                                        placeholder = { Text("IFSC code (e.g. HDFC0001234)", color = Color(0xFF94A3B8)) },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = PayoutFieldColors(),
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                }

                                Spacer(Modifier.height(4.dp))
                                Button(
                                    onClick = { viewModel.link() },
                                    enabled = !state.linking,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                    modifier = Modifier.fillMaxWidth().height(50.dp),
                                ) {
                                    Text(
                                        if (state.linking) "Linking…" else "Link Payout Account",
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                            }
                        }
                    }

                    // ── KYC notice (conditional on real status) ──
                    if (state.kycVerified != true) {
                        item {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color(0xFFFFF7ED),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                                    Icon(
                                        Icons.Filled.VerifiedUser,
                                        null,
                                        tint = Color(0xFFB45309),
                                        modifier = Modifier.size(20.dp).padding(top = 2.dp),
                                    )
                                    Spacer(Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            "KYC required for payouts",
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurface,
                                        )
                                        Spacer(Modifier.height(2.dp))
                                        Text(
                                            "Complete KYC verification before payouts are released. Verified sellers receive funds faster and with lower risk flags.",
                                            fontSize = 11.sp,
                                            color = Color(0xFF92400E),
                                            lineHeight = 16.sp,
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        item {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color(0xFFDCFCE7),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Filled.CheckCircle,
                                        null,
                                        tint = Color(0xFF22C55E),
                                        modifier = Modifier.size(18.dp),
                                    )
                                    Spacer(Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            "KYC verified — you're ready for payouts",
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp,
                                            color = Color(0xFF166534),
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

@Composable
private fun PayoutMethodRow(icon: String, label: String, value: String) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(34.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center,
        ) {
            Text(icon, fontSize = 15.sp)
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(label, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, fontWeight = FontWeight.Medium, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
        }
    }
}

@Composable
private fun FilterChipDefaultsColors() = androidx.compose.material3.FilterChipDefaults.filterChipColors(
    selectedContainerColor = Color(0xFF2563EB),
    selectedLabelColor = Color.White,
)

@Composable
private fun PayoutFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Color(0xFF3B82F6),
    unfocusedBorderColor = Color(0xFFE5E7EB),
    focusedContainerColor = MaterialTheme.colorScheme.surface,
    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
)
