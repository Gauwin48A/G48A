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
import com.mhub.app.ui.explore.SharedExploreStore
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
class CartViewModel @Inject constructor(
    private val repo: CartRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(CartUiState())
    val state: StateFlow<CartUiState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L
    private var remoteCartItems: List<CartItem> = emptyList()

    init {
        syncCartItems(loading = SharedExploreStore.cartPosts.isEmpty())
        load()
        viewModelScope.launch {
            SharedExploreStore.cartFlow.collect {
                syncCartItems(loading = false)
            }
        }
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load() }
                lastLocaleVersion = version
            }
        }
    }

    private fun syncCartItems(loading: Boolean = _state.value.loading, error: String? = null) {
        val mergedItems = mergeCartItems(remoteCartItems, SharedExploreStore.cartPosts)
        _state.value = _state.value.copy(
            loading = loading,
            items = mergedItems,
            total = mergedItems.cartTotal(),
            error = if (mergedItems.isEmpty()) error else null,
        )
    }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(
                loading = _state.value.items.isEmpty() && SharedExploreStore.cartPosts.isEmpty(),
                error = null,
            )
            when (val result = repo.get()) {
                is ApiResult.Success -> {
                    remoteCartItems = result.data.items
                    syncCartItems(loading = false)
                }
                is ApiResult.Failure -> {
                    syncCartItems(loading = false, error = result.error.message)
                }
            }
        }
    }

    private fun removeLocalCartItem(postId: String) {
        remoteCartItems = remoteCartItems.filterNot { it.matchesPostId(postId) }
        SharedExploreStore.removeCart(postId)
        syncCartItems(loading = false)
    }

    fun remove(postId: String) {
        removeLocalCartItem(postId)
        viewModelScope.launch { repo.remove(postId) }
    }
    
    fun removeWithUndo(postId: String) {
        val item = _state.value.items.find { it.matchesPostId(postId) } ?: return
        removeLocalCartItem(postId)
        _state.value = _state.value.copy(pendingUndoItem = item)
    }

    fun undoRemove() {
        val item = _state.value.pendingUndoItem ?: return
        SharedExploreStore.addCart(item.toPost())
        _state.value = _state.value.copy(pendingUndoItem = null)
        syncCartItems(loading = false)
    }

    fun commitRemove() {
        val item = _state.value.pendingUndoItem ?: return
        _state.value = _state.value.copy(pendingUndoItem = null)
        viewModelScope.launch { repo.remove(item.postId ?: "") }
    }

    fun saveForLater(postId: String) {
        val item = _state.value.items.find { it.matchesPostId(postId) } ?: return
        remoteCartItems = remoteCartItems.filterNot { it.matchesPostId(postId) }
        SharedExploreStore.removeCart(postId)
        _state.value = _state.value.copy(
            items = _state.value.items.filterNot { it.matchesPostId(postId) },
            savedForLater = _state.value.savedForLater + item,
        )
        syncCartItems(loading = false)
        viewModelScope.launch { repo.remove(postId) }
    }

    fun moveToCart(postId: String) {
        val item = _state.value.savedForLater.find { it.matchesPostId(postId) } ?: return
        SharedExploreStore.addCart(item.toPost())
        _state.value = _state.value.copy(
            savedForLater = _state.value.savedForLater.filterNot { it.matchesPostId(postId) },
        )
        syncCartItems(loading = false)
        viewModelScope.launch { repo.add(postId) }
    }

    fun updateQty(postId: String, qty: Int) {
        if (qty < 1 || qty > 10) return
        viewModelScope.launch { repo.updateQty(postId, qty) }
    }
    fun setCouponCode(v: String) { _state.value = _state.value.copy(couponCode = v) }
    fun setPayment(v: String) { _state.value = _state.value.copy(selectedPayment = v) }
    fun setDeliveryAddress(v: String) { _state.value = _state.value.copy(deliveryAddress = v) }
    fun applyCoupon() {
        val code = _state.value.couponCode.trim()
        if (code.isBlank()) return
        viewModelScope.launch {
            when (val r = repo.applyCoupon(code)) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    couponApplied = r.data.success, couponDiscount = r.data.discount,
                    couponMessage = r.data.message ?: if (r.data.success) "Coupon applied!" else "Invalid coupon")
                is ApiResult.Failure -> _state.value = _state.value.copy(couponMessage = "Failed to apply coupon")
            }
        }
    }
    val subtotal: Double get() = _state.value.items.sumOf { (it.price ?: 0.0) * it.quantity }
    val shipping: Double get() = if (subtotal > 500) 0.0 else 49.0
    val grandTotal: Double get() = subtotal + shipping - _state.value.couponDiscount
    fun toggleSelect(postId: String) {
        val cur = _state.value.selectedIds
        _state.value = _state.value.copy(selectedIds = if (postId in cur) cur - postId else cur + postId)
    }
    fun toggleSelectAll() {
        val allIds = _state.value.items.mapNotNull { it.postId }.toSet()
        _state.value = _state.value.copy(selectedIds = if (_state.value.selectedIds == allIds) emptySet() else allIds)
    }
    fun bulkRemove() {
        val ids = _state.value.selectedIds
        ids.forEach { removeLocalCartItem(it) }
        _state.value = _state.value.copy(selectedIds = emptySet())
        viewModelScope.launch { ids.forEach { repo.remove(it) } }
    }
    fun bulkSaveForLater() {
        val ids = _state.value.selectedIds
        val (toSave, keep) = _state.value.items.partition { (it.postId ?: "") in ids }
        remoteCartItems = remoteCartItems.filterNot { (it.postId ?: it.id ?: it.stableId) in ids }
        ids.forEach { SharedExploreStore.removeCart(it) }
        _state.value = _state.value.copy(items = keep, savedForLater = _state.value.savedForLater + toSave, selectedIds = emptySet())
        syncCartItems(loading = false)
    }
}

private fun Post.toCartItem(quantity: Int = 1): CartItem = CartItem(
    postId = stableId,
    title = displayTitle,
    price = price,
    currency = currency,
    imageUrl = primaryImage,
    sellerName = sellerName ?: userName ?: location,
    quantity = quantity,
)

private fun CartItem.toPost(): Post = Post(
    id = postId ?: id ?: stableId,
    title = title,
    price = price,
    currency = currency,
    imageUrl = imageUrl,
    sellerName = sellerName,
)

private fun CartItem.matchesPostId(postId: String): Boolean =
    this.postId == postId || id == postId || stableId == postId

private fun mergeCartItems(remoteItems: List<CartItem>, localPosts: List<Post>): List<CartItem> {
    val remoteIds = remoteItems.map { it.postId ?: it.id ?: it.stableId }.toSet()
    val localItems = localPosts
        .filterNot { post ->
            listOfNotNull(post.stableId, post.postId, post.id).any { it in remoteIds }
        }
        .map { it.toCartItem() }
    return remoteItems + localItems
}

private fun List<CartItem>.cartTotal(): Double = sumOf { (it.price ?: 0.0) * it.quantity }

@OptIn(ExperimentalMaterial3Api::class)

@Composable
fun CartScreen(onBack: () -> Unit, viewModel: CartViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Fire-and-forget snackbar when an item is pending undo
    LaunchedEffect(state.pendingUndoItem) {
        val item = state.pendingUndoItem ?: return@LaunchedEffect
        val result = snackbarHostState.showSnackbar(
            message = "${item.title ?: "Item"} removed",
            actionLabel = "UNDO",
            duration = SnackbarDuration.Short,
        )
        if (result == SnackbarResult.ActionPerformed) {
            viewModel.undoRemove()
        } else {
            viewModel.commitRemove()
        }
    }

    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("${stringResource(R.string.cart_title)} (${state.items.size})", onBack)

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.items.isEmpty() && state.savedForLater.isEmpty() -> EmptyState(
                    icon = { Icon(Icons.Filled.ShoppingCart, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                    title = "Your cart is empty", subtitle = "Add items to proceed to checkout",
                )
                else -> Column(Modifier.fillMaxSize()) {
                    // Bulk selection toolbar
                    if (state.items.isNotEmpty()) {
                        Surface(color = Color.White, shadowElevation = 1.dp) {
                            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                val allIds = state.items.mapNotNull { it.postId }.toSet()
                                Checkbox(checked = state.selectedIds == allIds && allIds.isNotEmpty(), onCheckedChange = { viewModel.toggleSelectAll() })
                                Text(if (state.selectedIds.isEmpty()) "Select All" else "${state.selectedIds.size} selected",
                                    fontSize = 13.sp, color = Color(0xFF374151), modifier = Modifier.weight(1f))
                                if (state.selectedIds.isNotEmpty()) {
                                    TextButton(onClick = { viewModel.bulkSaveForLater() }) { Text(stringResource(R.string.commerce_save_for_later), fontSize = 12.sp) }
                                    TextButton(onClick = { viewModel.bulkRemove() }, colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))) { Text(stringResource(R.string.btn_remove), fontSize = 12.sp) }
                                }
                            }
                        }
                    }
                    LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        // Cart items
                        if (state.items.isNotEmpty()) {
                            item { Text("Cart (${state.items.size})", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151)) }
                            items(state.items, key = { it.stableId }) { item ->
                                val checked = (item.postId ?: "") in state.selectedIds
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(checked = checked, onCheckedChange = { viewModel.toggleSelect(item.postId ?: "") }, modifier = Modifier.size(32.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Box(Modifier.weight(1f)) {
                                val dismissState = rememberSwipeToDismissBoxState(
                                    confirmValueChange = { value ->
                                        if (value == SwipeToDismissBoxValue.EndToStart || value == SwipeToDismissBoxValue.StartToEnd) {
                                            viewModel.removeWithUndo(item.postId ?: "")
                                            true
                                        } else false
                                    },
                                    positionalThreshold = { it * 0.4f },
                                )
                                SwipeToDismissBox(
                                    state = dismissState,
                                    backgroundContent = {
                                        val color by animateColorAsState(
                                            if (dismissState.dismissDirection == SwipeToDismissBoxValue.Settled) Color.Transparent
                                            else Color(0xFFEF4444),
                                            label = "swipe_bg",
                                        )
                                        Box(
                                            Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)).background(color),
                                            contentAlignment = Alignment.CenterEnd,
                                        ) {
                                            Icon(
                                                Icons.Filled.Delete, contentDescription = "Remove",
                                                tint = Color.White, modifier = Modifier.padding(end = 20.dp),
                                            )
                                        }
                                    },
                                ) {
                                    CartItemCard(
                                        item = item,
                                        onRemove = { viewModel.removeWithUndo(item.postId ?: "") },
                                        onQtyChange = { qty -> viewModel.updateQty(item.postId ?: "", qty) },
                                        onSaveForLater = { viewModel.saveForLater(item.postId ?: "") },
                                    )
                                }
                                    } // Box
                                } // Row
                            }
                        }

                        // Saved for later
                        if (state.savedForLater.isNotEmpty()) {
                            item {
                                Spacer(Modifier.height(4.dp))
                                Text("Saved for Later (${state.savedForLater.size})", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                            }
                            items(state.savedForLater, key = { "sfl_${it.stableId}" }) { item ->
                                SavedForLaterCard(item = item,
                                    onMoveToCart = { viewModel.moveToCart(item.postId ?: "") },
                                    onRemove = { viewModel.remove(item.postId ?: "") })
                            }
                        }

                        if (state.items.isNotEmpty()) {
                            // Delivery address
                            item {
                                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(14.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Text(stringResource(R.string.commerce_delivery_address), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                        }
                                        Spacer(Modifier.height(8.dp))
                                        OutlinedTextField(
                                            value = state.deliveryAddress, onValueChange = { viewModel.setDeliveryAddress(it) },
                                            placeholder = { Text(stringResource(R.string.commerce_delivery_address_hint)) },
                                            maxLines = 2, minLines = 2, shape = RoundedCornerShape(10.dp),
                                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                            modifier = Modifier.fillMaxWidth(),
                                        )
                                    }
                                }
                            }

                            // Payment method
                            item {
                                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(14.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.Payment, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Text(stringResource(R.string.commerce_payment_method), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                        }
                                        Spacer(Modifier.height(10.dp))
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            listOf(
                                                Triple("upi", "UPI", Icons.Filled.AccountBalance),
                                                Triple("card", "Card", Icons.Filled.CreditCard),
                                                Triple("cod", "Cash", Icons.Filled.Money),
                                            ).forEach { (key, label, icon) ->
                                                val sel = state.selectedPayment == key
                                                Surface(
                                                    onClick = { viewModel.setPayment(key) },
                                                    shape = RoundedCornerShape(10.dp),
                                                    color = if (sel) Color(0xFFEFF6FF) else Color(0xFFF8FAFC),
                                                    border = if (sel) ButtonDefaults.outlinedButtonBorder(enabled = true).copy(width = 2.dp) else ButtonDefaults.outlinedButtonBorder(enabled = true),
                                                    modifier = Modifier.weight(1f),
                                                ) {
                                                    Column(
                                                        Modifier.padding(10.dp),
                                                        horizontalAlignment = Alignment.CenterHorizontally,
                                                        verticalArrangement = Arrangement.spacedBy(4.dp),
                                                    ) {
                                                        Icon(icon, null, tint = if (sel) Color(0xFF2563EB) else Color(0xFF64748B), modifier = Modifier.size(20.dp))
                                                        Text(label, fontSize = 12.sp, fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal, color = if (sel) Color(0xFF2563EB) else Color(0xFF64748B))
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Coupon section
                            item {
                                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(14.dp)) {
                                        Text(stringResource(R.string.commerce_have_coupon), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                        Spacer(Modifier.height(8.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            OutlinedTextField(value = state.couponCode, onValueChange = { viewModel.setCouponCode(it) },
                                                placeholder = { Text(stringResource(R.string.commerce_enter_code)) }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.weight(1f),
                                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                                            Button(onClick = { viewModel.applyCoupon() }, shape = RoundedCornerShape(10.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)) { Text(stringResource(R.string.commerce_apply)) }
                                        }
                                        state.couponMessage?.let { msg ->
                                            Spacer(Modifier.height(4.dp))
                                            Text(msg, fontSize = 12.sp, color = if (state.couponApplied) Color(0xFF22C55E) else Color(0xFFEF4444))
                                        }
                                    }
                                }
                            }

                            // Delivery ETA
                            item {
                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFF0FDF4), modifier = Modifier.fillMaxWidth()) {
                                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.LocalShipping, null, tint = Color(0xFF22C55E), modifier = Modifier.size(20.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text(stringResource(R.string.commerce_est_delivery), fontSize = 13.sp, color = Color(0xFF166534))
                                    }
                                }
                            }
                        }
                    }
                    // Summary footer (only if there are cart items)
                    if (state.items.isNotEmpty()) {
                        Surface(color = Color.White, shadowElevation = 8.dp) {
                            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                                Row(Modifier.fillMaxWidth()) {
                                    Text(stringResource(R.string.commerce_subtotal), fontSize = 14.sp, color = Color(0xFF64748B))
                                    Spacer(Modifier.weight(1f))
                                    Text("₹${viewModel.subtotal.toLong()}", fontSize = 14.sp, color = Color(0xFF1E293B))
                                }
                                Row(Modifier.fillMaxWidth()) {
                                    Text(stringResource(R.string.commerce_shipping), fontSize = 14.sp, color = Color(0xFF64748B))
                                    Spacer(Modifier.weight(1f))
                                    Text(if (viewModel.shipping == 0.0) "Free" else "₹${viewModel.shipping.toLong()}", fontSize = 14.sp, color = if (viewModel.shipping == 0.0) Color(0xFF22C55E) else Color(0xFF1E293B))
                                }
                                if (state.couponDiscount > 0) {
                                    Row(Modifier.fillMaxWidth()) {
                                        Text(stringResource(R.string.commerce_discount), fontSize = 14.sp, color = Color(0xFF22C55E))
                                        Spacer(Modifier.weight(1f))
                                        Text("-₹${state.couponDiscount.toLong()}", fontSize = 14.sp, color = Color(0xFF22C55E))
                                    }
                                }
                                HorizontalDivider(color = Color(0xFFE2E8F0), modifier = Modifier.padding(vertical = 8.dp))
                                Row(Modifier.fillMaxWidth()) {
                                    Text(stringResource(R.string.commerce_total), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                                    Spacer(Modifier.weight(1f))
                                    Text("₹${viewModel.grandTotal.toLong()}", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF2563EB))
                                }
                                Spacer(Modifier.height(12.dp))
                                Button(onClick = {}, shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                    modifier = Modifier.fillMaxWidth().height(50.dp)) {
                                    Text(
                                        when (state.selectedPayment) {
                                            "upi" -> "Pay via UPI"
                                            "card" -> "Pay via Card"
                                            else -> "Place Order (COD)"
                                        },
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                                Spacer(Modifier.height(12.dp))
                                // Trust badges
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                    listOf(Icons.Filled.Lock to "Secure", Icons.Filled.VerifiedUser to "Protected", Icons.Filled.Replay to "Easy Returns").forEach { (icon, label) ->
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(icon, null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                                            Text(label, fontSize = 10.sp, color = Color(0xFF64748B))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@Composable
private fun CartItemCard(item: CartItem, onRemove: () -> Unit, onQtyChange: (Int) -> Unit, onSaveForLater: () -> Unit = {}) {
    Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                if (item.imageUrl != null) {
                    AsyncImage(model = item.imageUrl, contentDescription = null, contentScale = ContentScale.Crop,
                        modifier = Modifier.size(60.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)))
                } else {
                    Box(Modifier.size(60.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(24.dp))
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(item.title ?: "Item", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 2)
                    if (item.price != null) Text("₹${item.price.toLong()}", fontSize = 14.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.Bold)
                    if (item.sellerName != null) Text(item.sellerName, fontSize = 12.sp, color = Color(0xFF64748B))
                    // Qty controls
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF1F5F9), modifier = Modifier.size(28.dp).clickable { onQtyChange(item.quantity - 1) }) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) { Text("−", fontWeight = FontWeight.Bold, color = Color(0xFF374151)) }
                        }
                        Text("${item.quantity}", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), modifier = Modifier.padding(horizontal = 12.dp))
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF1F5F9), modifier = Modifier.size(28.dp).clickable { onQtyChange(item.quantity + 1) }) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) { Text("+", fontWeight = FontWeight.Bold, color = Color(0xFF374151)) }
                        }
                    }
                }
                IconButton(onClick = onRemove) {
                    Icon(Icons.Filled.Delete, null, tint = Color(0xFFEF4444))
                }
            }
            // Save for later
            TextButton(
                onClick = onSaveForLater,
                modifier = Modifier.padding(start = 8.dp, bottom = 4.dp),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
            ) {
                Icon(Icons.Filled.Bookmark, null, tint = Color(0xFF2563EB), modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(4.dp))
                Text(stringResource(R.string.commerce_save_for_later), fontSize = 12.sp, color = Color(0xFF2563EB))
            }
        }
    }
}

@Composable
private fun SavedForLaterCard(item: CartItem, onMoveToCart: () -> Unit, onRemove: () -> Unit) {
    Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFFF8FAFC), shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            if (item.imageUrl != null) {
                AsyncImage(model = item.imageUrl, contentDescription = null, contentScale = ContentScale.Crop,
                    modifier = Modifier.size(50.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)))
            } else {
                Box(Modifier.size(50.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(20.dp))
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.title ?: "Item", fontSize = 13.sp, color = Color(0xFF374151), maxLines = 1)
                if (item.price != null) Text("₹${item.price.toLong()}", fontSize = 13.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.Bold)
            }
            TextButton(onClick = onMoveToCart, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) {
                Text(stringResource(R.string.commerce_move_to_cart), fontSize = 11.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold)
            }
            IconButton(onClick = onRemove, modifier = Modifier.size(30.dp)) {
                Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
            }
        }
    }
}



// ──────────────────────────────────────────────────────────────────────────────
// RecentlyViewedScreen
// ──────────────────────────────────────────────────────────────────────────────
data class RecentlyViewedUiState(val loading: Boolean = true, val posts: List<Post> = emptyList(), val error: String? = null)
