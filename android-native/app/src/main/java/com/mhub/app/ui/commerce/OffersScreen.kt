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
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class OffersViewModel @Inject constructor(private val repo: OffersRepository) : ViewModel() {
    private val _state = MutableStateFlow(OffersUiState())
    val state: StateFlow<OffersUiState> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            val received = repo.list("received")
            val sent = repo.list("sent")
            _state.value = _state.value.copy(
                loading = false,
                received = (received as? ApiResult.Success)?.data ?: emptyList(),
                sent = (sent as? ApiResult.Success)?.data ?: emptyList(),
            )
        }
    }
    fun setTab(t: String) { _state.value = _state.value.copy(tab = t) }
    fun setStatusFilter(f: String?) { _state.value = _state.value.copy(statusFilter = f) }
    fun setSearch(v: String) { _state.value = _state.value.copy(search = v) }
    fun accept(id: String) { viewModelScope.launch { repo.accept(id); load() } }
    fun decline(id: String) { viewModelScope.launch { repo.decline(id); load() } }
    fun counter(id: String, price: Double) { viewModelScope.launch { repo.counter(id, price); load() } }
    fun filteredOffers(): List<Offer> {
        val s = _state.value
        val base = if (s.tab == "received") s.received else s.sent
        var filtered = base
        if (s.statusFilter != null) filtered = filtered.filter { it.status?.lowercase() == s.statusFilter }
        if (s.search.isNotBlank()) filtered = filtered.filter {
            (it.postTitle ?: "").contains(s.search, true) || (it.buyerName ?: "").contains(s.search, true)
        }
        return filtered
    }
}


@Composable
fun OffersScreen(onBack: () -> Unit, viewModel: OffersViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val tabs = listOf("received" to "Received", "sent" to "Sent")
    val offers = remember(state) { viewModel.filteredOffers() }
    val statusFilters = listOf(null to "All", "pending" to "Pending", "accepted" to "Accepted", "rejected" to "Rejected", "countered" to "Countered")
    val steps = listOf("Submitted", "Review", "Payment", "Verification", "Closed")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.offers_title), onBack)
            // Stepper
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                steps.forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(24.dp).clip(CircleShape).background(if (i == 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center) {
                            Text("${i + 1}", fontSize = 10.sp, color = if (i == 0) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), fontWeight = FontWeight.Bold)
                        }
                        Text(label, fontSize = 8.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                    }
                }
            }
            TabRow(selectedTabIndex = tabs.indexOfFirst { it.first == state.tab }.coerceAtLeast(0), containerColor = Color.Transparent) {
                tabs.forEach { (key, label) ->
                    Tab(selected = state.tab == key, onClick = { viewModel.setTab(key) },
                        text = { Text(label, fontWeight = if (state.tab == key) FontWeight.SemiBold else FontWeight.Normal) })
                }
            }
            // Search + status filters
            OutlinedTextField(value = state.search, onValueChange = { viewModel.setSearch(it) },
                placeholder = { Text(stringResource(R.string.commerce_search_name)) },
                leadingIcon = { Icon(Icons.Filled.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
                singleLine = true, shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant, focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp))
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                statusFilters.forEach { (key, label) ->
                    FilterChip(selected = state.statusFilter == key, onClick = { viewModel.setStatusFilter(key) },
                        label = { Text(label, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary))
                }
            }
            if (state.loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) }
            else if (offers.isEmpty()) EmptyState(
                icon = { Icon(Icons.Filled.LocalOffer, null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(64.dp)) },
                title = "No offers", subtitle = "Offers will appear here",
            )
            else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(offers, key = { it.stableId }) { offer ->
                    OfferCard(offer = offer, isReceived = state.tab == "received",
                        onAccept = { viewModel.accept(offer.stableId) },
                        onDecline = { viewModel.decline(offer.stableId) },
                        onCounter = { price -> viewModel.counter(offer.stableId, price) })
                }
            }
        }
    }
}

@Composable
private fun OfferCard(offer: Offer, isReceived: Boolean, onAccept: () -> Unit, onDecline: () -> Unit, onCounter: (Double) -> Unit) {
    var showCounter by remember { mutableStateOf(false) }
    var counterPrice by remember { mutableStateOf("") }
    val statusColor = when (offer.status?.lowercase()) {
        "pending" -> Color(0xFFF59E0B)
        "accepted" -> Color(0xFF22C55E)
        "rejected" -> Color(0xFFEF4444)
        "countered" -> Color(0xFF3B82F6)
        "paid" -> Color(0xFF10B981)
        else -> Color(0xFF64748B)
    }
    
    // Expiry countdown
    val expiryLabel = remember(offer.expiresAt) {
        if (offer.expiresAt == null) null
        else try {
            val expiry = Instant.parse(if (offer.expiresAt.endsWith("Z")) offer.expiresAt else "${offer.expiresAt}Z")
            val now = Instant.now()
            val hoursLeft = ChronoUnit.HOURS.between(now, expiry)
            val minutesLeft = ChronoUnit.MINUTES.between(now, expiry)
            when {
                minutesLeft <= 0 -> "Expired"
                hoursLeft < 1 -> "${minutesLeft}m left"
                hoursLeft < 24 -> "${hoursLeft}h left"
                else -> "${hoursLeft / 24}d left"
            }
        } catch (_: Exception) { null }
    }
    
    // Savings percentage
    val savingsPercent = if (offer.originalPrice > 0 && offer.amount > 0) {
        ((offer.originalPrice - offer.amount) / offer.originalPrice * 100).toInt()
    } else 0

    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (offer.postImage != null) {
                    AsyncImage(model = offer.postImage, contentDescription = null, contentScale = ContentScale.Crop,
                        modifier = Modifier.size(50.dp).clip(RoundedCornerShape(8.dp)))
                    Spacer(Modifier.width(12.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(offer.postTitle ?: "Listing", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("₹${offer.amount.toLong()}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF2563EB))
                        if (offer.originalPrice > 0) {
                            Spacer(Modifier.width(6.dp))
                            Text("₹${offer.originalPrice.toLong()}", fontSize = 12.sp, color = Color(0xFF94A3B8),
                                style = androidx.compose.ui.text.TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough))
                        }
                        if (savingsPercent > 0) {
                            Spacer(Modifier.width(4.dp))
                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFDCFCE7)) {
                                Text("$savingsPercent% off", fontSize = 11.sp, color = Color(0xFF166534), fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                            }
                        }
                    }
                    Text(if (isReceived) "From: ${offer.buyerName ?: "Buyer"}" else "To: ${offer.sellerName ?: "Seller"}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    
                    // Expiry countdown with urgency badge
                    if (expiryLabel != null) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                            Icon(Icons.Filled.Schedule, null, tint = if (expiryLabel.contains("m left")) Color(0xFFEF4444) else Color(0xFF64748B), modifier = Modifier.size(12.dp))
                            Spacer(Modifier.width(3.dp))
                            Text(expiryLabel, fontSize = 11.sp, color = if (expiryLabel.contains("m left")) Color(0xFFEF4444) else Color(0xFF64748B), fontWeight = FontWeight.Medium)
                            if (expiryLabel.contains("m left") || (expiryLabel.contains("h left") && expiryLabel.startsWith("1") || expiryLabel.startsWith("2"))) {
                                Spacer(Modifier.width(4.dp))
                                Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFFEF4444)) {
                                    Text(stringResource(R.string.commerce_badge_urgent), fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                }
                            }
                        }
                    }
                }
                Surface(shape = RoundedCornerShape(12.dp), color = statusColor.copy(alpha = 0.15f)) {
                    Text(offer.status?.replaceFirstChar { it.uppercase() } ?: "Pending", fontSize = 11.sp,
                        color = statusColor, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
            if (isReceived && offer.status?.lowercase() == "pending") {
                Spacer(Modifier.height(12.dp))
                if (showCounter) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = counterPrice, onValueChange = { counterPrice = it }, singleLine = true,
                            placeholder = { Text(stringResource(R.string.commerce_counter_price)) }, shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant, focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface))
                        Button(onClick = { counterPrice.toDoubleOrNull()?.let { onCounter(it); showCounter = false } },
                            shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                            contentPadding = PaddingValues(horizontal = 12.dp)) { Text(stringResource(R.string.btn_send)) }
                    }
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = onDecline, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) { Text(stringResource(R.string.btn_decline), color = Color(0xFFDC2626)) }
                        OutlinedButton(onClick = { showCounter = true }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) { Text(stringResource(R.string.btn_counter), color = Color(0xFF3B82F6)) }
                        Button(onClick = onAccept, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text(stringResource(R.string.btn_accept)) }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CartScreen
// ──────────────────────────────────────────────────────────────────────────────
data class CartUiState(
    val loading: Boolean = true,
    val items: List<CartItem> = emptyList(),
    val savedForLater: List<CartItem> = emptyList(),
    val total: Double = 0.0,
    val error: String? = null,
    val couponCode: String = "",
    val couponDiscount: Double = 0.0,
    val couponMessage: String? = null,
    val couponApplied: Boolean = false,
    val selectedPayment: String = "upi",
    val deliveryAddress: String = "",
    val pendingUndoItem: CartItem? = null,
    val selectedIds: Set<String> = emptySet(),
)