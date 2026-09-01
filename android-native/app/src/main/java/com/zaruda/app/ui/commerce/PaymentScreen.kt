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

data class PaymentUiState(
    val step: Int = 0,
    val loading: Boolean = true,
    val upiId: String? = null,
    val merchantName: String? = null,
    val instructions: List<String> = emptyList(),
    val history: List<PaymentHistoryItem> = emptyList(),
    val selectedPlan: String? = null,
    val transactionId: String = "",
    val submitting: Boolean = false,
    val success: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class PaymentViewModel @Inject constructor(private val repo: PaymentsRepository) : ViewModel() {
    private val _state = MutableStateFlow(PaymentUiState())
    val state: StateFlow<PaymentUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true)
        when (val r = repo.upiDetails()) {
            is ApiResult.Success -> _state.value = _state.value.copy(loading = false, upiId = r.data.upiId, merchantName = r.data.merchantName, instructions = r.data.instructions)
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false)
        }
        when (val r = repo.history()) {
            is ApiResult.Success -> _state.value = _state.value.copy(history = r.data)
            is ApiResult.Failure -> {}
        }
    } }
    fun selectPlan(plan: String) { _state.value = _state.value.copy(selectedPlan = plan, step = 1) }
    fun advanceStep() { _state.value = _state.value.copy(step = _state.value.step + 1) }
    fun setTransactionId(v: String) { _state.value = _state.value.copy(transactionId = v) }
    fun submitPayment() {
        val s = _state.value
        if (s.transactionId.isBlank()) { _state.value = s.copy(error = "Enter transaction ID"); return }
        _state.value = s.copy(submitting = true, error = null)
        viewModelScope.launch {
            when (repo.submit(SubmitPaymentRequest(transactionId = s.transactionId, plan = s.selectedPlan))) {
                is ApiResult.Success -> _state.value = _state.value.copy(submitting = false, success = true, step = 4)
                is ApiResult.Failure -> _state.value = _state.value.copy(submitting = false, error = "Submission failed")
            }
        }
    }
}


@Composable
fun PaymentScreen(onBack: () -> Unit, viewModel: PaymentViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val steps = listOf("Select Plan", "Pay", "Submit UTR", "Verification", "Active")
    val plans = listOf(
        "starter" to "Starter Premium Gateway (₹111/mo)",
        "silver" to "Silver Plan (₹149/mo)",
        "gold" to "Gold Plan (₹299/mo)",
        "platinum" to "Platinum Plan (₹999/mo)"
    )
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.checkout_payment_title), onBack)
            // Stepper
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                steps.forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(28.dp).clip(CircleShape).background(if (i <= state.step) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center) {
                            if (i < state.step) Icon(Icons.Filled.Check, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(16.dp))
                            else Text("${i + 1}", fontSize = 11.sp, color = if (i <= state.step) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), fontWeight = FontWeight.Bold)
                        }
                        Text(label, fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                    }
                }
            }
            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) }
            } else {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp) }
                    if (state.success) {
                        Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.tertiaryContainer, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(56.dp))
                                Spacer(Modifier.height(12.dp))
                                Text("Payment Submitted!", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.onTertiaryContainer)
                                Text("Your payment is being verified. This usually takes 2-24 hours.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.8f))
                            }
                        }
                    } else when (state.step) {
                        0 -> {
                            Text("Choose Your Plan", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                            
                            // Plan comparison
                            val planFeatures = mapOf(
                                "starter" to listOf("✨ 1 Month Premium Status", "🆔 Aadhaar & PAN KYC Included", "✍️ Limit: 1 Post Per Day", "🛡️ Inclusive of GST & KYC fees"),
                                "silver" to listOf("Up to 10 posts", "Basic support", "Standard delivery"),
                                "gold" to listOf("Up to 50 posts", "Priority support", "Featured badge", "Fast delivery"),
                                "platinum" to listOf("Unlimited posts", "24/7 VIP support", "Homepage placement", "Instant delivery", "Custom branding"),
                            )
                            
                            plans.forEach { (key, label) ->
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = if (state.selectedPlan == key) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f) else MaterialTheme.colorScheme.surface,
                                    shadowElevation = if (state.selectedPlan == key) 4.dp else 2.dp,
                                    border = if (state.selectedPlan == key) BorderStroke(2.dp, Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF2563EB)))) else ButtonDefaults.outlinedButtonBorder(enabled = true),
                                    modifier = Modifier.fillMaxWidth().clickable { viewModel.selectPlan(key) }
                                ) {
                                    Column(Modifier.padding(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            RadioButton(
                                                selected = state.selectedPlan == key,
                                                onClick = { viewModel.selectPlan(key) },
                                                colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF2563EB))
                                            )
                                            Text(label, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                                            if (key == "gold") {
                                                Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF2563EB)) {
                                                    Text("POPULAR", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                }
                                            }
                                        }
                                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f), modifier = Modifier.padding(vertical = 8.dp))
                                        planFeatures[key]?.forEach { feature ->
                                            Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(14.dp))
                                                Spacer(Modifier.width(6.dp))
                                                Text(feature, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                                Spacer(Modifier.height(10.dp))
                            }
                        }
                        1 -> {
                            Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(20.dp)) {
                                    Text("Pay via UPI", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                                    Spacer(Modifier.height(12.dp))
                                    if (state.upiId != null) {
                                        Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f), modifier = Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(14.dp)) {
                                                Text("UPI ID", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(state.upiId ?: "", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF2563EB))
                                                if (state.merchantName != null) Text("Merchant: ${state.merchantName}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    state.instructions.forEach { Text("• $it", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    Spacer(Modifier.height(16.dp))
                                    Button(onClick = { viewModel.advanceStep() }, shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                        modifier = Modifier.fillMaxWidth().height(48.dp)) {
                                        Text("I've Paid → Enter UTR", fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                        else -> {
                            Text("Enter Transaction ID (UTR)", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                            ZarudaTextField("Transaction ID / UTR", state.transactionId, viewModel::setTransactionId)
                            Button(onClick = { viewModel.submitPayment() }, enabled = !state.submitting,
                                shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                modifier = Modifier.fillMaxWidth().height(50.dp)) {
                                Text(if (state.submitting) "Submitting…" else "Submit for Verification", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                    // Payment history
                    if (state.history.isNotEmpty()) {
                        Spacer(Modifier.height(8.dp))
                        Text("Payment History", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                        state.history.forEach { pay ->
                            val statusColor = when (pay.status?.lowercase()) {
                                "verified" -> Color(0xFF22C55E)
                                "rejected" -> Color(0xFFEF4444)
                                else -> Color(0xFFF59E0B)
                            }
                            Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text(pay.plan ?: pay.purpose ?: "Payment", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                        Text(pay.transactionId ?: "", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Surface(shape = RoundedCornerShape(12.dp), color = statusColor.copy(alpha = 0.15f)) {
                                        Text(pay.status?.replaceFirstChar { it.uppercase() } ?: "Pending", fontSize = 11.sp,
                                            color = statusColor, fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
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