package com.mhub.app.ui.commerce

import android.content.Intent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
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
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
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
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.ListShimmer
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
import androidx.compose.ui.graphics.vector.ImageVector
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────

data class CartUiState(
    val loading: Boolean = true,
    val items: List<CartItem> = emptyList(),
    val savedForLater: List<CartItem> = emptyList(),
    val pendingUndoItem: CartItem? = null,
    val total: Double = 0.0,
    val error: String? = null,
    val selectedIds: Set<String> = emptySet(),
    val deliveryAddress: String = "",
    val selectedPayment: String = "cod",
    val couponCode: String = "",
    val couponApplied: Boolean = false,
    val couponDiscount: Double = 0.0,
    val couponMessage: String? = null,
)

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

// ──────────────────────────────────────────────────────────────────────────────
// CartScreen — fully polished with Wishlist-grade UI
// ──────────────────────────────────────────────────────────────────────────────

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

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Shopping Cart", fontWeight = FontWeight.Bold)
                        if (state.items.isNotEmpty()) {
                            Text(
                                "${state.items.size} item${if (state.items.size != 1) "s" else ""}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(Modifier.fillMaxSize()) {
                when {
                    state.loading -> ListShimmer(count = 4, modifier = Modifier.fillMaxSize().padding(top = 8.dp))

                    state.items.isEmpty() && state.savedForLater.isEmpty() -> Box(
                        Modifier
                            .fillMaxSize()
                            .padding(vertical = 64.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        AppEmptyState(
                            icon = Icons.Default.ShoppingCart,
                            title = "Your cart is empty",
                            subtitle = "Add items to proceed to checkout",
                        )
                    }

                    else -> {
                        // Bulk selection toolbar
                        if (state.items.isNotEmpty()) {
                            Surface(
                                color = MaterialTheme.colorScheme.surface,
                                tonalElevation = 1.dp,
                            ) {
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    val allIds = state.items.mapNotNull { it.postId }.toSet()
                                    Checkbox(
                                        checked = state.selectedIds == allIds && allIds.isNotEmpty(),
                                        onCheckedChange = { viewModel.toggleSelectAll() },
                                    )
                                    Text(
                                        if (state.selectedIds.isEmpty()) "Select All"
                                        else "${state.selectedIds.size} selected",
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.weight(1f),
                                    )
                                    if (state.selectedIds.isNotEmpty()) {
                                        TextButton(onClick = { viewModel.bulkSaveForLater() }) {
                                            Text(stringResource(R.string.commerce_save_for_later), fontSize = 12.sp)
                                        }
                                        TextButton(
                                            onClick = { viewModel.bulkRemove() },
                                            colors = ButtonDefaults.textButtonColors(
                                                contentColor = MaterialTheme.colorScheme.error
                                            ),
                                        ) {
                                            Text(stringResource(R.string.btn_remove), fontSize = 12.sp)
                                        }
                                    }
                                }
                            }
                        }

                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            // Cart items section
                            if (state.items.isNotEmpty()) {
                                item(key = "cart_header") {
                                    SectionLabelWithCount("Cart", state.items.size)
                                }
                                items(state.items, key = { it.stableId }) { item ->
                                    val isChecked = (item.postId ?: "") in state.selectedIds
                                    SwipeToDismissCartItem(
                                        item = item,
                                        isSelected = isChecked,
                                        onToggleSelect = { viewModel.toggleSelect(item.postId ?: "") },
                                        onRemove = { viewModel.removeWithUndo(item.postId ?: "") },
                                        onQtyChange = { qty -> viewModel.updateQty(item.postId ?: "", qty) },
                                        onSaveForLater = { viewModel.saveForLater(item.postId ?: "") },
                                    )
                                }
                            }

                            // Saved for later section
                            if (state.savedForLater.isNotEmpty()) {
                                item(key = "sfl_header") {
                                    Spacer(Modifier.height(4.dp))
                                    SectionLabelWithCount("Saved for Later", state.savedForLater.size)
                                }
                                items(state.savedForLater, key = { "sfl_${it.stableId}" }) { item ->
                                    SavedForLaterCard(
                                        item = item,
                                        onMoveToCart = { viewModel.moveToCart(item.postId ?: "") },
                                        onRemove = { viewModel.remove(item.postId ?: "") },
                                    )
                                }
                            }

                            // Checkout sections
                            if (state.items.isNotEmpty()) {
                                // Delivery address
                                item(key = "delivery") {
                                    CheckoutSectionCard(
                                        title = "Delivery Address",
                                        icon = Icons.Filled.LocationOn,
                                    ) {
                                        OutlinedTextField(
                                            value = state.deliveryAddress,
                                            onValueChange = { viewModel.setDeliveryAddress(it) },
                                            placeholder = { Text(stringResource(R.string.commerce_delivery_address_hint)) },
                                            maxLines = 2,
                                            minLines = 2,
                                            shape = RoundedCornerShape(12.dp),
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                                unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                            ),
                                            modifier = Modifier.fillMaxWidth(),
                                        )
                                    }
                                }

                                // Payment method
                                item(key = "payment") {
                                    CheckoutSectionCard(
                                        title = "Payment Method",
                                        icon = Icons.Filled.Payment,
                                    ) {
                                        Row(
                                            Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            listOf(
                                                Triple("upi", "UPI", Icons.Filled.AccountBalance),
                                                Triple("card", "Card", Icons.Filled.CreditCard),
                                                Triple("cod", "Cash", Icons.Filled.Money),
                                            ).forEach { (key, label, icon) ->
                                                val sel = state.selectedPayment == key
                                                Surface(
                                                    onClick = { viewModel.setPayment(key) },
                                                    shape = RoundedCornerShape(12.dp),
                                                    color = if (sel) MaterialTheme.colorScheme.primaryContainer
                                                            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                                    border = if (sel) BorderStroke(
                                                        2.dp, MaterialTheme.colorScheme.primary
                                                    ) else BorderStroke(
                                                        1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                                                    ),
                                                    modifier = Modifier.weight(1f),
                                                ) {
                                                    Column(
                                                        Modifier.padding(12.dp),
                                                        horizontalAlignment = Alignment.CenterHorizontally,
                                                        verticalArrangement = Arrangement.spacedBy(6.dp),
                                                    ) {
                                                        Icon(
                                                            icon, null,
                                                            tint = if (sel) MaterialTheme.colorScheme.primary
                                                                   else MaterialTheme.colorScheme.onSurfaceVariant,
                                                            modifier = Modifier.size(22.dp),
                                                        )
                                                        Text(
                                                            label,
                                                            fontSize = 12.sp,
                                                            fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal,
                                                            color = if (sel) MaterialTheme.colorScheme.primary
                                                                    else MaterialTheme.colorScheme.onSurfaceVariant,
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // Coupon
                                item(key = "coupon") {
                                    CheckoutSectionCard(
                                        title = "Have a coupon?",
                                        icon = Icons.Filled.ConfirmationNumber,
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            OutlinedTextField(
                                                value = state.couponCode,
                                                onValueChange = { viewModel.setCouponCode(it) },
                                                placeholder = { Text(stringResource(R.string.commerce_enter_code)) },
                                                singleLine = true,
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier.weight(1f),
                                                colors = OutlinedTextFieldDefaults.colors(
                                                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                                                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                                ),
                                            )
                                            Button(
                                                onClick = { viewModel.applyCoupon() },
                                                shape = RoundedCornerShape(12.dp),
                                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                                            ) {
                                                Text(stringResource(R.string.commerce_apply))
                                            }
                                        }
                                        state.couponMessage?.let { msg ->
                                            Spacer(Modifier.height(6.dp))
                                            Text(
                                                msg,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = if (state.couponApplied) MaterialTheme.colorScheme.tertiary
                                                        else MaterialTheme.colorScheme.error,
                                            )
                                        }
                                    }
                                }

                                // Delivery ETA
                                item(key = "eta") {
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(
                                            Modifier.padding(14.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Icon(
                                                Icons.Filled.LocalShipping, null,
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(22.dp),
                                            )
                                            Spacer(Modifier.width(10.dp))
                                            Column {
                                                Text(
                                                    "Estimated Delivery",
                                                    fontWeight = FontWeight.SemiBold,
                                                    fontSize = 14.sp,
                                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                                )
                                                Text(
                                                    "3-5 business days",
                                                    fontSize = 12.sp,
                                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Summary footer
                        if (state.items.isNotEmpty()) {
                            CartSummaryFooter(viewModel)
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
}

// ──────────────────────────────────────────────────────────────────────────────
// Section label helper
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun SectionLabelWithCount(label: String, count: Int) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            label,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
        ) {
            Text(
                "$count",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
            )
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CheckoutSectionCard — reusable card for delivery, payment, coupon sections
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun CheckoutSectionCard(
    title: String,
    icon: ImageVector,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    icon, null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// SwipeToDismissCartItem — cart item card with swipe-to-dismiss
// ──────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeToDismissCartItem(
    item: CartItem,
    isSelected: Boolean,
    onToggleSelect: () -> Unit,
    onRemove: () -> Unit,
    onQtyChange: (Int) -> Unit,
    onSaveForLater: () -> Unit = {},
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                onRemove()
                true
            } else false
        },
    )
    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            Box(
                Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.error),
                contentAlignment = Alignment.CenterEnd,
            ) {
                Icon(
                    Icons.Filled.Delete, null,
                    tint = MaterialTheme.colorScheme.onError,
                    modifier = Modifier.padding(end = 20.dp).size(24.dp),
                )
            }
        },
        modifier = Modifier.clip(RoundedCornerShape(16.dp)),
    ) {
        CartItemCard(
            item = item,
            isSelected = isSelected,
            onToggleSelect = onToggleSelect,
            onRemove = onRemove,
            onQtyChange = onQtyChange,
            onSaveForLater = onSaveForLater,
        )
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CartItemCard — compact, Wishlist-grade card with inline selection
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun CartItemCard(
    item: CartItem,
    isSelected: Boolean,
    onToggleSelect: () -> Unit,
    onRemove: () -> Unit,
    onQtyChange: (Int) -> Unit,
    onSaveForLater: () -> Unit = {},
) {
    Card(
        onClick = onToggleSelect,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                           else MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            // Selection checkbox
            Checkbox(
                checked = isSelected,
                onCheckedChange = { onToggleSelect() },
                modifier = Modifier.size(24.dp),
            )

            // Image
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                if (item.imageUrl != null) {
                    AsyncImage(
                        model = item.imageUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(Icons.Outlined.ImageNotSupported, contentDescription = null,
                         tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                // Quantity badge
                if (item.quantity > 1) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp),
                    ) {
                        Text(
                            "×${item.quantity}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                        )
                    }
                }
            }

            // Info column
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                // Title
                Text(
                    text = item.title ?: "Item",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )

                // Seller
                item.sellerName?.let { seller ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.Store, null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(12.dp),
                        )
                        Spacer(Modifier.width(3.dp))
                        Text(
                            seller,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                        )
                    }
                }

                // Price
                item.price?.let { price ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "₹%,.0f".format(price),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        if (item.quantity > 1) {
                            Spacer(Modifier.width(6.dp))
                            Text(
                                "×${item.quantity} = ₹${"%,.0f".format(price * item.quantity)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                Spacer(Modifier.height(4.dp))

                // Quantity row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "Qty: ",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.size(30.dp).clickable(enabled = item.quantity > 1) {
                                onQtyChange(item.quantity - 1)
                            },
                        ) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Text(
                                    "−",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = if (item.quantity > 1) MaterialTheme.colorScheme.onSurface
                                            else MaterialTheme.colorScheme.outline,
                                )
                            }
                        }
                        Text(
                            "${item.quantity}",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.padding(horizontal = 12.dp),
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.size(30.dp).clickable(enabled = item.quantity < 10) {
                                onQtyChange(item.quantity + 1)
                            },
                        ) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Text(
                                    "+",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = if (item.quantity < 10) MaterialTheme.colorScheme.onSurface
                                            else MaterialTheme.colorScheme.outline,
                                )
                            }
                        }
                    }
                }

                // Action buttons
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                    modifier = Modifier.padding(vertical = 4.dp),
                )
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    TextButton(
                        onClick = onSaveForLater,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    ) {
                        Icon(
                            Icons.Filled.BookmarkBorder, null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(14.dp),
                        )
                        Spacer(Modifier.width(3.dp))
                        Text(
                            stringResource(R.string.commerce_save_for_later),
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                    TextButton(
                        onClick = onRemove,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = MaterialTheme.colorScheme.error,
                        ),
                    ) {
                        Icon(
                            Icons.Filled.Delete, null,
                            modifier = Modifier.size(14.dp),
                        )
                        Spacer(Modifier.width(3.dp))
                        Text(stringResource(R.string.btn_remove), fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// SavedForLaterCard — compact card
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun SavedForLaterCard(item: CartItem, onMoveToCart: () -> Unit, onRemove: () -> Unit) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            if (item.imageUrl != null) {
                AsyncImage(
                    model = item.imageUrl, contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                )
            } else {
                Box(
                    Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Image, null, tint = MaterialTheme.colorScheme.outline, modifier = Modifier.size(24.dp))
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    item.title ?: "Item",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                )
                if (item.price != null) {
                    Text(
                        "₹%,.0f".format(item.price),
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                FilledTonalButton(
                    onClick = onMoveToCart,
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Icon(Icons.Filled.Add, null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(3.dp))
                    Text(stringResource(R.string.commerce_move_to_cart), fontSize = 10.sp)
                }
                TextButton(
                    onClick = onRemove,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                ) {
                    Text("Remove", fontSize = 10.sp)
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CartSummaryFooter — polished checkout footer with gradient progress
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun CartSummaryFooter(viewModel: CartViewModel) {
    val state by viewModel.state.collectAsState()

    Surface(
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 3.dp,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            // Price breakdown
            Row(Modifier.fillMaxWidth()) {
                Text("Subtotal", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.weight(1f))
                Text("₹${viewModel.subtotal.toLong()}", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
            }
            Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
                Text("Shipping", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.weight(1f))
                Text(
                    if (viewModel.shipping == 0.0) "Free" else "₹${viewModel.shipping.toLong()}",
                    fontSize = 14.sp,
                    fontWeight = if (viewModel.shipping == 0.0) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (viewModel.shipping == 0.0) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurface,
                )
            }
            if (state.couponDiscount > 0) {
                Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
                    Text("Discount", fontSize = 14.sp, color = MaterialTheme.colorScheme.tertiary)
                    Spacer(Modifier.weight(1f))
                    Text("-₹${state.couponDiscount.toLong()}", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.tertiary)
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.padding(vertical = 10.dp))
            Row(Modifier.fillMaxWidth()) {
                Text("Total", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.weight(1f))
                Text("₹${viewModel.grandTotal.toLong()}", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.primary)
            }
            if (viewModel.shipping > 0) {
                Spacer(Modifier.height(10.dp))
                val freeThreshold = 500
                val pct = (viewModel.subtotal / freeThreshold).toFloat().coerceIn(0f, 1f)
                val animatedPct by animateFloatAsState(targetValue = pct, animationSpec = spring(), label = "ship")
                LinearProgressIndicator(progress = { animatedPct }, color = MaterialTheme.colorScheme.tertiary, trackColor = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)))
                Spacer(Modifier.height(6.dp))
                Text("Add ₹${(freeThreshold - viewModel.subtotal).toLong()} more for free shipping", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = {},
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                val paymentIcon = when (state.selectedPayment) { "upi" -> Icons.Filled.AccountBalance; "card" -> Icons.Filled.CreditCard; else -> Icons.Filled.Money }
                val paymentLabel = when (state.selectedPayment) { "upi" -> "Pay via UPI"; "card" -> "Pay via Card"; else -> "Place Order (COD)" }
                Icon(paymentIcon, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text(paymentLabel, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            }

            // Trust badges
            Spacer(Modifier.height(14.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                listOf(
                    Icons.Filled.Lock to "Secure",
                    Icons.Filled.VerifiedUser to "Protected",
                    Icons.Filled.Replay to "Easy Returns",
                ).forEach { (icon, label) ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            icon, null,
                            tint = MaterialTheme.colorScheme.tertiary,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            label,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

