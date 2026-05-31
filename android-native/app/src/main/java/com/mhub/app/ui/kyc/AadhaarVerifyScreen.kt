package com.mhub.app.ui.kyc

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.AadhaarSendOtpRequest
import com.mhub.app.data.remote.dto.AadhaarVerifyOtpRequest
import com.mhub.app.data.repository.KycRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── State ────────────────────────────────────────────────────────────────────

enum class AadhaarStep { ENTER_NUMBER, OTP_SENT, VERIFIED }

data class AadhaarVerifyState(
    val step: AadhaarStep = AadhaarStep.ENTER_NUMBER,
    val aadhaarNumber: String = "",
    val otp: String = "",
    val txnId: String = "",
    val loading: Boolean = false,
    val error: String? = null,
)

// ── ViewModel ────────────────────────────────────────────────────────────────

@HiltViewModel
class AadhaarVerifyViewModel @Inject constructor(
    private val kycRepo: KycRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(AadhaarVerifyState())
    val state: StateFlow<AadhaarVerifyState> = _state.asStateFlow()

    fun onAadhaarChange(v: String) {
        val digits = v.filter { it.isDigit() }.take(12)
        _state.value = _state.value.copy(aadhaarNumber = digits, error = null)
    }

    fun onOtpChange(v: String) {
        val digits = v.filter { it.isDigit() }.take(6)
        _state.value = _state.value.copy(otp = digits, error = null)
    }

    fun sendOtp() {
        val s = _state.value
        if (s.aadhaarNumber.length != 12) {
            _state.value = s.copy(error = "Enter a valid 12-digit Aadhaar number")
            return
        }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = safeCall { kycRepo.aadhaarSendOtp(AadhaarSendOtpRequest(aadhaarNumber = s.aadhaarNumber)) }) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false,
                    txnId = r.data.txnId ?: "",
                    step = AadhaarStep.OTP_SENT,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    error = r.error.message ?: "Failed to send OTP",
                )
            }
        }
    }

    fun verifyOtp() {
        val s = _state.value
        if (s.otp.isBlank()) {
            _state.value = s.copy(error = "Enter the OTP sent to your Aadhaar-registered mobile")
            return
        }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = safeCall { kycRepo.aadhaarVerifyOtp(AadhaarVerifyOtpRequest(aadhaarNumber = s.aadhaarNumber, otp = s.otp, txnId = s.txnId)) }) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false,
                    step = AadhaarStep.VERIFIED,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    error = r.error.message ?: "OTP verification failed",
                )
            }
        }
    }

    fun reset() {
        _state.value = AadhaarVerifyState()
    }

    private suspend fun <T> safeCall(block: suspend () -> ApiResult<T>): ApiResult<T> {
        return try { block() }
        catch (e: Exception) { ApiResult.Failure(com.mhub.app.core.ApiError.Unknown(e.message ?: "Unknown error")) }
    }
}

// ── Screen ────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AadhaarVerifyScreen(
    onBack: () -> Unit,
    viewModel: AadhaarVerifyViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Aadhaar Verification", fontWeight = FontWeight.Bold)
                        Text("Verify your identity securely", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Hero card
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(Brush.horizontalGradient(listOf(Color(0xFF1D4ED8), Color(0xFF7C3AED)))),
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            modifier = Modifier.size(44.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Default.Shield, null, tint = Color.White, modifier = Modifier.size(26.dp))
                        }
                        Column {
                            Text("AADHAAR VERIFICATION", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.8f), letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold)
                            Text("Secure Identity Verification", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                    Text(
                        "Verify your Aadhaar to unlock seller features and increase buyer trust.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.85f),
                    )
                }
            }

            // Step indicator
            StepIndicator(step = state.step)

            // Error
            state.error?.let { err ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(err, modifier = Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodySmall)
                }
            }

            when (state.step) {
                AadhaarStep.ENTER_NUMBER -> {
                    // Form
                    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Text("Enter Aadhaar Number", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            OutlinedTextField(
                                value = state.aadhaarNumber,
                                onValueChange = viewModel::onAadhaarChange,
                                label = { Text("12-digit Aadhaar number") },
                                placeholder = { Text("XXXX XXXX XXXX") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                                singleLine = true,
                                isError = state.error != null,
                                supportingText = { Text("${state.aadhaarNumber.length}/12 digits") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                            )
                            Button(
                                onClick = viewModel::sendOtp,
                                enabled = state.aadhaarNumber.length == 12 && !state.loading,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8)),
                            ) {
                                Text(if (state.loading) "Sending OTP…" else "Send OTP", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }

                AadhaarStep.OTP_SENT -> {
                    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Text("Enter OTP", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            Text(
                                "OTP has been sent to the mobile number registered with Aadhaar ending in ****${state.aadhaarNumber.takeLast(4)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            OutlinedTextField(
                                value = state.otp,
                                onValueChange = viewModel::onOtpChange,
                                label = { Text("Enter 6-digit OTP") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                                singleLine = true,
                                isError = state.error != null,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                            )
                            Button(
                                onClick = viewModel::verifyOtp,
                                enabled = state.otp.length == 6 && !state.loading,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8)),
                            ) {
                                Text(if (state.loading) "Verifying…" else "Verify OTP", fontWeight = FontWeight.SemiBold)
                            }
                            androidx.compose.material3.TextButton(
                                onClick = viewModel::reset,
                                modifier = Modifier.align(Alignment.CenterHorizontally),
                            ) {
                                Text("Wrong number? Change Aadhaar", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }

                AadhaarStep.VERIFIED -> {
                    // Success card
                    Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFF0FDF4), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF86EFAC)), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(modifier = Modifier.size(80.dp).clip(CircleShape).background(Color(0xFF22C55E)), contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.CheckCircle, null, tint = Color.White, modifier = Modifier.size(48.dp))
                            }
                            Text("Aadhaar Verified!", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFF14532D))
                            Text("Your identity has been verified successfully. You can now access all seller features.", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF166534), textAlign = TextAlign.Center)
                        }
                    }

                    // Rewards card
                    Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFFFF7ED), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFBBF24)), modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(modifier = Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(Color(0xFFFEF3C7)), contentAlignment = Alignment.Center) {
                                Text("�", fontSize = 26.sp)
                            }
                            Column {
                                Text("Reward Earned", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF92400E))
                                Text("+50 coins for completing Aadhaar verification!", fontSize = 13.sp, color = Color(0xFFB45309))
                            }
                        }
                    }

                    Button(
                        onClick = onBack,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                    ) {
                        Text("Done", fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            // Benefits section
            Text("Benefits of Verification", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                AadhaarBenefit("�️", "Verified Badge", "Display a trust badge on your profile and listings")
                AadhaarBenefit("⭐", "Boost Listings", "Verified sellers get higher visibility in search")
                AadhaarBenefit("�", "Build Trust", "Buyers prefer verified sellers for higher-value items")
                AadhaarBenefit("�", "Earn Coins", "Get 50 bonus coins on successful verification")
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun StepIndicator(step: AadhaarStep) {
    val steps = listOf("Enter Aadhaar", "Verify OTP", "Verified")
    val currentIndex = step.ordinal

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
        steps.forEachIndexed { index, label ->
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                index < currentIndex -> Color(0xFF22C55E)
                                index == currentIndex -> Color(0xFF1D4ED8)
                                else -> MaterialTheme.colorScheme.surfaceVariant
                            },
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    if (index < currentIndex) {
                        Icon(Icons.Default.CheckCircle, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    } else {
                        Text(
                            "${index + 1}",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (index <= currentIndex) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    color = when {
                        index < currentIndex -> Color(0xFF22C55E)
                        index == currentIndex -> Color(0xFF1D4ED8)
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun AadhaarBenefit(emoji: String, title: String, description: String) {
    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(emoji, fontSize = 22.sp)
            Column {
                Text(title, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// GetVerifiedScreen — Aadhaar OTP Wizard (web-parity: GetVerified.jsx)
// 4 steps: Enter Aadhaar → Get OTP → Verify OTP + Capture Details → Done
// ─────────────────────────────────────────────────────────────────────────────

data class GetVerifiedState(
    val step: Int = 0,          // 0=aadhaar, 1=otp, 2=details, 3=done
    val aadhaar: String = "",
    val txnId: String = "",
    val otp: String = "",
    val fullName: String = "",
    val dob: String = "",
    val address: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val verified: Boolean = false,
)

@HiltViewModel
class GetVerifiedViewModel @Inject constructor(
    private val authRepo: com.mhub.app.data.repository.AuthRepository,
) : ViewModel() {
    private val _state = kotlinx.coroutines.flow.MutableStateFlow(GetVerifiedState())
    val state: kotlinx.coroutines.flow.StateFlow<GetVerifiedState> = _state.asStateFlow()

    fun setAadhaar(v: String) { _state.value = _state.value.copy(aadhaar = v.filter(Char::isDigit).take(12)) }
    fun setOtp(v: String) { _state.value = _state.value.copy(otp = v.filter(Char::isDigit).take(6)) }
    fun setFullName(v: String) { _state.value = _state.value.copy(fullName = v) }
    fun setDob(v: String) { _state.value = _state.value.copy(dob = v) }
    fun setAddress(v: String) { _state.value = _state.value.copy(address = v) }

    fun requestOtp() {
        if (_state.value.aadhaar.length != 12) {
            _state.value = _state.value.copy(error = "Enter a valid 12-digit Aadhaar number"); return
        }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            kotlinx.coroutines.delay(1200)
            // Simulate: real impl calls MhubApi.startAadhaarOtp(aadhaar)
            val txnId = "TXN-${System.currentTimeMillis()}"
            _state.value = _state.value.copy(loading = false, step = 1, txnId = txnId)
        }
    }

    fun verifyOtp() {
        if (_state.value.otp.length != 6) {
            _state.value = _state.value.copy(error = "Enter the 6-digit OTP"); return
        }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            kotlinx.coroutines.delay(1000)
            _state.value = _state.value.copy(loading = false, step = 2)
        }
    }

    fun submitDetails() {
        val st = _state.value
        if (st.fullName.isBlank() || st.dob.isBlank()) {
            _state.value = _state.value.copy(error = "Full name and date of birth are required"); return
        }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            kotlinx.coroutines.delay(1500)
            // Real impl: call MhubApi.verifyAadhaarOtp(txnId, otp, fullName, dob, address)
            _state.value = _state.value.copy(loading = false, step = 3, verified = true)
        }
    }

    fun clearError() { _state.value = _state.value.copy(error = null) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GetVerifiedScreen(onBack: () -> Unit, onDone: () -> Unit = {}, viewModel: GetVerifiedViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val stepLabels = listOf("Aadhaar", "OTP", "Details", "Done")

    androidx.compose.material3.Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Get Verified", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = Color(0xFFF0FDF4),
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Step progress bar
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                stepLabels.forEachIndexed { i, label ->
                    val done = i < state.step
                    val active = i == state.step
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(28.dp).clip(CircleShape).background(
                            when { done -> Color(0xFF22C55E); active -> Color(0xFF1D4ED8); else -> Color(0xFFE2E8F0) }
                        ), contentAlignment = Alignment.Center) {
                            if (done) Icon(Icons.Default.CheckCircle, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            else Text("${i + 1}", color = if (active) Color.White else Color(0xFF94A3B8), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        }
                        Text(label, style = MaterialTheme.typography.labelSmall, color = when { done -> Color(0xFF22C55E); active -> Color(0xFF1D4ED8); else -> Color(0xFF94A3B8) })
                    }
                    if (i < stepLabels.lastIndex) HorizontalDivider(Modifier.weight(1f).padding(bottom = 12.dp), color = if (done) Color(0xFF22C55E) else Color(0xFFE2E8F0))
                }
            }

            state.error?.let { err ->
                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFFEE2E2)) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Warning, null, tint = Color(0xFFDC2626)); Text(err, style = MaterialTheme.typography.bodySmall, color = Color(0xFFDC2626), modifier = Modifier.weight(1f))
                    }
                }
            }

            when (state.step) {
                0 -> {
                    // Step 1 — Enter Aadhaar
                    Text("Enter your Aadhaar Number", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Your Aadhaar details are used only for KYC verification and are never stored.", style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B))
                    OutlinedTextField(
                        value = state.aadhaar, onValueChange = { viewModel.setAadhaar(it) },
                        label = { Text("Aadhaar Number (12 digits)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                        isError = state.aadhaar.isNotBlank() && state.aadhaar.length != 12,
                        supportingText = { if (state.aadhaar.isNotBlank() && state.aadhaar.length != 12) Text("Must be 12 digits") },
                    )
                    Button(
                        onClick = { viewModel.clearError(); viewModel.requestOtp() },
                        enabled = state.aadhaar.length == 12 && !state.loading,
                        shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8)),
                    ) {
                        if (state.loading) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                        else Text("Send OTP", fontWeight = FontWeight.SemiBold)
                    }
                }
                1 -> {
                    // Step 2 — Enter OTP
                    Text("Enter OTP", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("A 6-digit OTP was sent to the mobile linked to Aadhaar ${state.aadhaar.take(4)}XXXX${state.aadhaar.takeLast(4)}.", style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B))
                    Text("Transaction ID: ${state.txnId}", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                    OutlinedTextField(
                        value = state.otp, onValueChange = { viewModel.setOtp(it) },
                        label = { Text("6-digit OTP") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = { viewModel.clearError(); viewModel.verifyOtp() },
                        enabled = state.otp.length == 6 && !state.loading,
                        shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8)),
                    ) {
                        if (state.loading) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                        else Text("Verify OTP", fontWeight = FontWeight.SemiBold)
                    }
                    TextButton(onClick = { viewModel.requestOtp() }) { Text("Resend OTP") }
                }
                2 -> {
                    // Step 3 — Capture details
                    Text("Your Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Please confirm the details linked to your Aadhaar.", style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B))
                    OutlinedTextField(value = state.fullName, onValueChange = { viewModel.setFullName(it) }, label = { Text("Full Name *") }, singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = state.dob, onValueChange = { viewModel.setDob(it) }, label = { Text("Date of Birth * (YYYY-MM-DD)") }, singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    OutlinedTextField(value = state.address, onValueChange = { viewModel.setAddress(it) }, label = { Text("Address") }, minLines = 2, maxLines = 4, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth())
                    Button(
                        onClick = { viewModel.clearError(); viewModel.submitDetails() },
                        enabled = state.fullName.isNotBlank() && state.dob.isNotBlank() && !state.loading,
                        shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8)),
                    ) {
                        if (state.loading) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                        else Text("Submit & Verify", fontWeight = FontWeight.SemiBold)
                    }
                }
                else -> {
                    // Step 4 — Done
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.VerifiedUser, null, tint = Color(0xFF22C55E), modifier = Modifier.size(72.dp))
                            Text("Identity Verified!", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color(0xFF22C55E))
                            Text("Your KYC is complete. You can now list items on MHub and unlock full marketplace features.", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF64748B), textAlign = TextAlign.Center)
                            Button(onClick = onDone, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(50.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))) {
                                Text("Continue to MHub", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }
        }
    }
}
