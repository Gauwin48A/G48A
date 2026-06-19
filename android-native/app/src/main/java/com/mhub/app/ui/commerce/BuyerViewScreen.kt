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
class BuyerViewViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val brandsRepo: BrandsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(BuyerViewUiState())
    val state: StateFlow<BuyerViewUiState> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            val brandsResult = brandsRepo.list()
            if (brandsResult is ApiResult.Success) _state.value = _state.value.copy(brands = brandsResult.data)
            when (val r = postsRepo.feed(limit = 60, categoryId = null, query = _state.value.search.ifBlank { null })) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, posts = r.data, error = null)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
    fun setSearch(v: String) { _state.value = _state.value.copy(search = v) }
    fun setBrand(v: String?) { _state.value = _state.value.copy(selectedBrand = v) }
    fun setPriceRange(v: String?) { _state.value = _state.value.copy(priceRange = v) }
    fun resetFilters() { _state.value = _state.value.copy(search = "", selectedBrand = null, priceRange = null); load() }

    fun filteredPosts(): List<Post> {
        val s = _state.value
        var filtered = s.posts
        if (!s.search.isBlank()) filtered = filtered.filter {
            it.displayTitle.contains(s.search, true) || (it.location ?: "").contains(s.search, true)
        }
        if (s.selectedBrand != null) filtered = filtered.filter {
            it.displayTitle.contains(s.selectedBrand ?: "", true)
        }
        when (s.priceRange) {
            "0-25k" -> filtered = filtered.filter { (it.price ?: 0.0) < 25000 }
            "25k-50k" -> filtered = filtered.filter { val p = it.price ?: 0.0; p in 25000.0..50000.0 }
            "50k-75k" -> filtered = filtered.filter { val p = it.price ?: 0.0; p in 50000.0..75000.0 }
            "75k+" -> filtered = filtered.filter { (it.price ?: 0.0) > 75000 }
        }
        return filtered
    }
}


@Composable
fun BuyerViewScreen(onBack: () -> Unit, viewModel: BuyerViewViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val filtered = remember(state) { viewModel.filteredPosts() }
    val priceRanges = listOf(null to "All", "0-25k" to "Under ₹25K", "25k-50k" to "₹25K-50K", "50k-75k" to "₹50K-75K", "75k+" to "₹75K+")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Browse Listings", onBack)
            // Search bar
            OutlinedTextField(
                value = state.search, onValueChange = { viewModel.setSearch(it) },
                placeholder = { Text(stringResource(R.string.commerce_search_bought)) },
                leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                singleLine = true, shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
            )
            // Price filter chips
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                priceRanges.forEach { (key, label) ->
                    FilterChip(
                        selected = state.priceRange == key,
                        onClick = { viewModel.setPriceRange(key) },
                        label = { Text(label, fontSize = 11.sp) },
                        shape = RoundedCornerShape(20.dp),
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White),
                    )
                }
            }
            // Brand filter
            if (state.brands.isNotEmpty()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilterChip(selected = state.selectedBrand == null, onClick = { viewModel.setBrand(null) },
                        label = { Text(stringResource(R.string.commerce_all_brands), fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                    state.brands.take(5).forEach { brand ->
                        FilterChip(selected = state.selectedBrand == brand.name, onClick = { viewModel.setBrand(brand.name) },
                            label = { Text(brand.name ?: "", fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                    }
                }
            }
            // Results
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                filtered.isEmpty() -> EmptyState(
                    icon = { Icon(Icons.Filled.SearchOff, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                    title = "No listings found", subtitle = "Try adjusting your filters",
                )
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item { Text("${filtered.size} listings", fontSize = 13.sp, color = Color(0xFF64748B)) }
                    items(filtered, key = { it.stableId }) { post ->
                        BuyerPostCard(post)
                    }
                }
            }
        }
    }
}

@Composable
private fun BuyerPostCard(post: Post) {
    Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Column {
            Box(Modifier.fillMaxWidth().height(160.dp)) {
                if (post.primaryImage != null) {
                    AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)))
                } else {
                    Box(Modifier.fillMaxSize().background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(48.dp))
                    }
                }
                // Price overlay
                if (post.price != null) {
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF1E293B).copy(alpha = 0.85f),
                        modifier = Modifier.align(Alignment.BottomStart).padding(8.dp)) {
                        Text("₹${post.price.toLong()}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                    }
                }
            }
            Column(Modifier.padding(12.dp)) {
                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B), maxLines = 2)
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (post.userName != null) {
                        Icon(Icons.Filled.Person, null, tint = Color(0xFF64748B), modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(post.userName ?: "", fontSize = 12.sp, color = Color(0xFF64748B))
                        Spacer(Modifier.width(12.dp))
                    }
                    if (post.location != null) {
                        Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF64748B), modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(2.dp))
                        Text(post.location ?: "", fontSize = 12.sp, color = Color(0xFF64748B), maxLines = 1)
                    }
                }
                post.status?.let { c ->
                    Spacer(Modifier.height(4.dp))
                    StatusChip(c)
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// SaleDoneScreen — 2-tab: Mark as Sold (seller initiate + buyer confirm)
// ──────────────────────────────────────────────────────────────────────────────
data class SaleDoneUiState(
    val step: Int = 0,
    val loading: Boolean = false,
    val pending: List<PendingSale> = emptyList(),
    val postId: String = "",
    val buyerId: String = "",
    val saleAmount: String = "",
    val txnId: String = "",
    val otp: String = "",
    // initiate result
    val initiatedTxnId: String? = null,
    val initiatedOtp: String? = null,
    val initiatedOtpExpiresIn: String? = null,
    // confirm result
    val completedReceipt: SaleReceiptInfo? = null,
    val completedBuyer: SalePartyInfo? = null,
    val completedItem: SaleItemInfo? = null,
    val completedRewards: SaleRewardsInfo? = null,
    val error: String? = null,
    val success: Boolean = false,
    val tab: String = "seller",      // seller | buyer
)