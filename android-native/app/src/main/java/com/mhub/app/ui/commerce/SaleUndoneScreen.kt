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
import com.mhub.app.ui.theme.ColorTokens
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
class SaleUndoneViewModel @Inject constructor(private val repo: TransactionsRepository) : ViewModel() {
    private val _state = MutableStateFlow(SaleUndoneUiState())
    val state: StateFlow<SaleUndoneUiState> = _state.asStateFlow()
    private val reasons = listOf(
        "no_buyers_found", "buyer_not_interested", "buyer_changed_mind",
        "price_too_high", "item_condition_issue", "location_issue",
        "communication_failed", "payment_issue", "want_to_relist", "other",
    )
    fun getReasons() = reasons
    init { loadHistory() }
    fun loadHistory() { viewModelScope.launch {
        when (val r = repo.undoneHistory()) {
            is ApiResult.Success -> _state.value = _state.value.copy(history = r.data)
            is ApiResult.Failure -> {}
        }
    } }
    fun setPostId(v: String) { _state.value = _state.value.copy(postId = v) }
    fun setReason(v: String) { _state.value = _state.value.copy(reason = v) }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v) }
    fun reset() { val history = _state.value.history; _state.value = SaleUndoneUiState(history = history) }
    fun submit() {
        val s = _state.value
        val raw = s.postId.trim()
        val cleaned = raw.replace(Regex("^(?i)(?:post\\s*)?id[:\\s-]*"), "").trim()
        if (cleaned.isBlank()) { 
            _state.value = s.copy(error = "Post ID is required")
            return 
        }
        if (!Regex("^[A-Za-z0-9_\\-]+$").matches(cleaned)) {
            _state.value = s.copy(error = "Enter a valid Post ID (letters, numbers, dashes only).")
            return
        }
        // Description required only when reason === "other" (web parity: SaleUndone.jsx)
        if (s.reason == "other" && s.description.isBlank()) { 
            _state.value = s.copy(error = "Please add a short note for this reason")
            return 
        }
        _state.value = s.copy(postId = cleaned, loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.undoSale(UndoSaleRequest(postId = cleaned, reason = s.reason, description = s.description.ifBlank { null }))) {
                is ApiResult.Success -> { _state.value = _state.value.copy(loading = false, success = true, transactionId = null); loadHistory() }
                is ApiResult.Failure -> {
                    val msg = r.error.message ?: ""
                    val mapped = when {
                        msg.lowercase().contains("401") || msg.lowercase().contains("auth") -> "Please sign in again to continue."
                        msg.lowercase().contains("403") -> "You are not authorized to undo this sale."
                        msg.lowercase().contains("404") || msg.lowercase().contains("not found") -> "Post not found. Verify the Post ID and try again."
                        msg.lowercase().contains("already active") -> "This listing is already active."
                        else -> msg.ifBlank { "Failed to undo sale. Please try again." }
                    }
                    _state.value = _state.value.copy(loading = false, error = mapped)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)

@Composable
fun SaleUndoneScreen(onBack: () -> Unit, viewModel: SaleUndoneViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val steps = listOf(stringResource(R.string.commerce_step_listed), stringResource(R.string.commerce_step_marked_sold), stringResource(R.string.commerce_step_issue_found), stringResource(R.string.commerce_step_undo_request), stringResource(R.string.commerce_step_reactivated))
    var expanded by remember { mutableStateOf(false) }
    var showConfirmDialog by remember { mutableStateOf(false) }
    val isDark = ColorTokens.isDark
    val bgGradient = if (isDark) Brush.verticalGradient(listOf(Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF1E3A5F))) else Brush.verticalGradient(listOf(Color(0xFFF8FAFC), Color(0xFFEFF6FF), Color(0xFFF0F9FF)))
    
    // Confirmation AlertDialog (web parity)
    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text("Confirm Undo Sale", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            text = { Text("Are you sure you want to undo this sale? This will reactivate the listing and notify the buyer.", fontSize = 14.sp, color = ColorTokens.TextSecondary) },
            confirmButton = {
                Button(
                    onClick = { showConfirmDialog = false; viewModel.submit() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Text("Yes, Undo Sale", fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showConfirmDialog = false },
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Text("Cancel")
                }
            },
        )
    }
    
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.commerce_undo_sale), onBack)
            // Hero gradient card (web parity: mhub-hero-card "Sale Undone")
            Box(
                modifier = Modifier.fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFEF4444), Color(0xFFDC2626)))),
            ) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("SALE REACTIVATION", fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp, color = Color.White.copy(alpha = 0.7f))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Autorenew, null, tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                        Text("Sale Undone", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color.White)
                    }
                    Text("Undo a sale and reactivate your listing.", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("🛡 Safe Process", "✓ Listing Restored", "📣 Buyer Notified").forEach { badge ->
                            Surface(shape = RoundedCornerShape(8.dp), color = Color.White.copy(alpha = 0.15f)) {
                                Text(badge, fontSize = 10.sp, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                    }
                }
            }
            // Stepper with connector lines (web parity)
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                val currentStep = if (state.success) 4 else 2
                steps.forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(30.dp).clip(CircleShape).background(
                            when { i < currentStep -> Color(0xFFF59E0B); i == currentStep -> Color(0xFF3B82F6); else -> if (isDark) Color(0xFF475569) else Color(0xFFE2E8F0) }
                        ), contentAlignment = Alignment.Center) {
                            if (i < currentStep) Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            else Text("${i + 1}", fontSize = 11.sp, color = if (i <= currentStep) Color.White else if (isDark) Color(0xFF94A3B8) else Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(2.dp))
                        Text(label, fontSize = 8.sp, color = if (i <= currentStep) ColorTokens.TextHeading else if (isDark) Color(0xFF94A3B8) else Color(0xFF94A3B8), maxLines = 1, textAlign = TextAlign.Center)
                    }
                    if (i < steps.size - 1) {
                        HorizontalDivider(modifier = Modifier.weight(0.5f).padding(bottom = 14.dp), color = if (i < currentStep) Color(0xFFF59E0B) else if (isDark) Color(0xFF475569) else Color(0xFFE2E8F0), thickness = 2.dp)
                    }
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                state.error?.let { Text(it, color = ColorTokens.RedText, fontSize = 13.sp) }
                if (state.success) {
                    Surface(shape = RoundedCornerShape(20.dp), color = ColorTokens.GreenContainer, border = BorderStroke(1.dp, ColorTokens.GreenText.copy(alpha = 0.5f)), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Box(Modifier.size(96.dp).clip(CircleShape).background(Brush.radialGradient(listOf(Color(0xFF4ADE80), Color(0xFF22C55E), Color(0xFF16A34A)))), contentAlignment = Alignment.Center) {
                                Icon(Icons.Filled.Autorenew, null, tint = Color.White, modifier = Modifier.size(52.dp))
                            }
                            Text("✅ " + stringResource(R.string.commerce_listing_reactivated), fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = ColorTokens.GreenText)
                            Text(stringResource(R.string.commerce_undo_success_msg), fontSize = 14.sp, color = ColorTokens.GreenText, textAlign = TextAlign.Center)
                            // Active | Visible status panel (web parity)
                            Surface(shape = RoundedCornerShape(12.dp), color = if (isDark) Color(0xFF064E3B) else Color(0xFFDCFCE7), border = BorderStroke(1.dp, ColorTokens.GreenText.copy(alpha = if (isDark) 0.3f else 0.5f)), modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Filled.CheckCircle, null, tint = ColorTokens.GreenText, modifier = Modifier.size(28.dp))
                                        Text("Active", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.GreenText)
                                        Text("Post Status", fontSize = 11.sp, color = ColorTokens.TextSecondary)
                                    }
                                    Box(modifier = Modifier.width(1.dp).height(48.dp).background(ColorTokens.GreenText.copy(alpha = 0.3f)))
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Filled.Visibility, null, tint = ColorTokens.GreenText, modifier = Modifier.size(28.dp))
                                        Text("Visible", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.GreenText)
                                        Text("To Buyers", fontSize = 11.sp, color = ColorTokens.TextSecondary)
                                    }
                                }
                            }
                            state.transactionId?.let { txnId ->
                                Surface(shape = RoundedCornerShape(8.dp), color = if (isDark) Color(0xFF1E293B) else Color(0xFFF0F9FF)) {
                                    Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.Tag, null, tint = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB), modifier = Modifier.size(14.dp))
                                        Text("Reference: $txnId", fontSize = 12.sp, color = if (isDark) Color(0xFFBFDBFE) else Color(0xFF2563EB), fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                            // Action buttons
                            OutlinedButton(
                                onClick = { viewModel.reset() },
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                border = BorderStroke(1.5.dp, Color(0xFF22C55E)),
                            ) {
                                Icon(Icons.Filled.Autorenew, null, tint = Color(0xFF16A34A), modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Reactivate Another", fontWeight = FontWeight.SemiBold, color = Color(0xFF16A34A))
                            }
                            Button(onClick = onBack, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.fillMaxWidth().height(48.dp), elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)) {
                                Icon(Icons.Filled.Home, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Go to My Home", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                } else {
                    MhubTextField(stringResource(R.string.commerce_field_post_id), state.postId, viewModel::setPostId)
                    // Reason dropdown (ExposedDropdownMenuBox for proper scroll-safe rendering)
                    val reasonLabels = remember { mapOf(
                        "no_buyers_found" to "No buyers found",
                        "buyer_not_interested" to "Buyer not interested",
                        "buyer_changed_mind" to "Buyer changed mind",
                        "price_too_high" to "Price too high",
                        "item_condition_issue" to "Item condition concerns",
                        "location_issue" to "Location not convenient",
                        "communication_failed" to "Communication failed",
                        "payment_issue" to "Payment issue",
                        "want_to_relist" to "Want to relist with new details",
                        "other" to "Other reason",
                    ) }
                    Column {
                        Text(stringResource(R.string.commerce_field_reason), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = ColorTokens.TextBody)
                        Spacer(Modifier.height(4.dp))
                        ExposedDropdownMenuBox(
                            expanded = expanded,
                            onExpandedChange = { expanded = it },
                        ) {
                            OutlinedTextField(
                                value = if (state.reason.isBlank()) "Select reason" else (reasonLabels[state.reason] ?: state.reason.replace("_", " ").replaceFirstChar { it.uppercase() }),
                                onValueChange = {},
                                readOnly = true,
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = if (isDark) Color(0xFF93C5FD) else Color(0xFF3B82F6), unfocusedBorderColor = if (isDark) Color(0xFF475569) else Color(0xFFE5E7EB), focusedContainerColor = if (isDark) Color(0xFF1E293B) else Color.White, unfocusedContainerColor = if (isDark) Color(0xFF1E293B) else Color.White),
                                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
                            )
                            ExposedDropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false },
                            ) {
                                // Web parity: first option is empty (optional)
                                DropdownMenuItem(
                                    text = { Text("Select reason (optional)", color = ColorTokens.TextSecondary) },
                                    onClick = { viewModel.setReason(""); expanded = false },
                                )
                                viewModel.getReasons().forEach { r ->
                                    DropdownMenuItem(
                                        text = { Text(reasonLabels[r] ?: r.replace("_", " ").replaceFirstChar { it.uppercase() }) },
                                        onClick = { viewModel.setReason(r); expanded = false },
                                    )
                                }
                            }
                        }
                    }
                    // Web parity: description only required when reason == "other"
                    Column {
                        MhubTextField(
                            label = if (state.reason == "other") "Description (required)" else "Description (optional)",
                            value = state.description,
                            onValueChange = viewModel::setDescription,
                            maxLines = 5,
                            minLines = 3,
                        )
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Spacer(Modifier.weight(1f))
                            Text("${state.description.length}/2000", fontSize = 11.sp, color = ColorTokens.TextSecondary)
                        }
                    }
                    Button(onClick = { showConfirmDialog = true }, enabled = !state.loading,
                        shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        modifier = Modifier.fillMaxWidth().height(50.dp)) {
                        Text(if (state.loading) stringResource(R.string.commerce_processing) else stringResource(R.string.commerce_undo_sale), fontWeight = FontWeight.SemiBold, color = Color.White)
                    }
                }
                // History
                if (state.history.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Text(stringResource(R.string.commerce_undo_history), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.TextHeading)
                    state.history.forEach { rec ->
                        Surface(shape = RoundedCornerShape(12.dp), color = ColorTokens.CardSurface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                if (rec.postImage != null) {
                                    AsyncImage(model = rec.postImage, contentDescription = null, contentScale = ContentScale.Crop,
                                        modifier = Modifier.size(48.dp).clip(RoundedCornerShape(8.dp)))
                                }
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(rec.postTitle ?: "Listing", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = ColorTokens.TextHeading)
                                    Text(rec.reason ?: "", fontSize = 11.sp, color = ColorTokens.TextSecondary)
                                }
                                Text("₹${rec.amount.toLong()}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = ColorTokens.PremiumAmber)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// PaymentScreen — 5-step stepper: Select Plan → Pay → Submit UTR → Verification → Active
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