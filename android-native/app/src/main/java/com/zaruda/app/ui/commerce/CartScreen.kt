package com.zaruda.app.ui.commerce

import android.content.Intent
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
import androidx.compose.material.icons.outlined.LocalOffer
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
import com.zaruda.app.R
import com.zaruda.app.ui.components.AppEmptyIllustration
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.ListShimmer
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.common.LinkColor
import com.zaruda.app.ui.explore.SharedExploreStore
import com.zaruda.app.ui.wishlist.normalizeMarketplaceCategoryKey
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

data class CartUiState(
    val loading: Boolean = true,
    val items: List<CartItem> = emptyList(),
    val savedForLater: List<CartItem> = emptyList(),
    val pendingUndoItem: CartItem? = null,
    val total: Double = 0.0,
    val error: String? = null,
    /** Electronics item the buyer is initiating a platform-purchase for. */
    val buyingItem: CartItem? = null,
    val buying: Boolean = false,
    val buyMessage: String? = null,
)

// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class CartViewModel @Inject constructor(
    private val repo: CartRepository,
    private val salesRepo: SalesRepository,
    private val cartItemDao: com.zaruda.app.data.local.db.CartItemDao,
    private val localeManager: com.zaruda.app.core.LocaleManager,
    private val analytics: com.zaruda.app.core.AnalyticsHelper,
) : ViewModel() {
    private val _state = MutableStateFlow(CartUiState())
    val state: StateFlow<CartUiState> = _state.asStateFlow()
    private val _categoryFilter = MutableStateFlow<String?>(null)
    private var lastLocaleVersion = 0L
    private var remoteCartItems: List<CartItem> = emptyList()
    private var roomCartItems: List<CartItem> = emptyList()

    init {
        syncCartItems(loading = SharedExploreStore.cartPosts.isEmpty())
        loadLocalRoomItems()
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

    fun setCategoryFilter(cat: String?) {
        _categoryFilter.value = cat
        syncCartItems(loading = false)
    }

    /** Load Room-persisted cart items so items added offline/from category apps survive restart. */
    private fun loadLocalRoomItems() {
        viewModelScope.launch {
            roomCartItems = cartItemDao.getAll().map { it.toCartItem() }
            syncCartItems(loading = false)
        }
    }

    private fun syncCartItems(loading: Boolean = _state.value.loading, error: String? = null) {
        // Show ALL cart items regardless of category context (web parity: Cart.jsx fix)
        val mergedItems = mergeCartItems(remoteCartItems, SharedExploreStore.cartPosts, roomCartItems)
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
        roomCartItems = roomCartItems.filterNot { it.matchesPostId(postId) }
        SharedExploreStore.removeCart(postId)
        viewModelScope.launch { runCatching { cartItemDao.delete(postId) } }
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
        val post = item.toPost()
        SharedExploreStore.addCart(post)
        roomCartItems = roomCartItems + item
        _state.value = _state.value.copy(pendingUndoItem = null)
        syncCartItems(loading = false)
        viewModelScope.launch {
            runCatching { cartItemDao.insert(item.toCartEntity()) }
        }
    }

    fun commitRemove() {
        val item = _state.value.pendingUndoItem ?: return
        _state.value = _state.value.copy(pendingUndoItem = null)
        viewModelScope.launch { repo.remove(item.postId ?: "") }
    }

    fun saveForLater(postId: String) {
        val item = _state.value.items.find { it.matchesPostId(postId) } ?: return
        remoteCartItems = remoteCartItems.filterNot { it.matchesPostId(postId) }
        roomCartItems = roomCartItems.filterNot { it.matchesPostId(postId) }
        SharedExploreStore.removeCart(postId)
        _state.value = _state.value.copy(
            items = _state.value.items.filterNot { it.matchesPostId(postId) },
            savedForLater = _state.value.savedForLater + item,
        )
        syncCartItems(loading = false)
        viewModelScope.launch {
            runCatching { cartItemDao.delete(postId) }
            repo.remove(postId)
        }
    }

    fun moveToCart(postId: String) {
        val item = _state.value.savedForLater.find { it.matchesPostId(postId) } ?: return
        val post = item.toPost()
        SharedExploreStore.addCart(post)
        roomCartItems = roomCartItems + item
        _state.value = _state.value.copy(
            savedForLater = _state.value.savedForLater.filterNot { it.matchesPostId(postId) },
        )
        syncCartItems(loading = false)
        viewModelScope.launch {
            runCatching { cartItemDao.insert(item.toCartEntity()) }
            repo.add(postId)
        }
    }

    fun updateQty(postId: String, qty: Int) {
        if (qty < 1 || qty > 10) return
        val item = _state.value.items.find { it.matchesPostId(postId) }
        if (item != null) {
            roomCartItems = roomCartItems.map { if (it.matchesPostId(postId)) it.copy(quantity = qty) else it }
            syncCartItems(loading = false)
        }
        viewModelScope.launch {
            runCatching { cartItemDao.updateQuantity(postId, qty) }
            repo.updateQty(postId, qty)
        }
    }

    // ── Electronics in-app purchase (escrow) ──────────────────────────────

    /** Confirm dialog for a specific electronics item. */
    fun confirmBuy(item: CartItem) {
        _state.value = _state.value.copy(buyingItem = item, buyMessage = null, error = null)
    }

    fun dismissBuy() {
        _state.value = _state.value.copy(buyingItem = null, buying = false)
    }

    /**
     * Initiate the escrow sale for an Electronics cart item.
     * Server forces payment_mode = IN_APP for Electronics (never client-trusted);
     * seller then approves, buyer pays in-app, funds held in escrow.
     */
    fun requestPlatformBuy() {
        val item = _state.value.buyingItem ?: return
        val postId = item.postId ?: item.id ?: return
        val sellerId = item.sellerId ?: return
        _state.value = _state.value.copy(buying = true, buyMessage = null, error = null)
        viewModelScope.launch {
            when (val r = salesRepo.requestSale(
                SaleRequest(postId = postId, sellerId = sellerId, paymentMode = "IN_APP")
            )) {
                is ApiResult.Success -> {
                    val itemTitle = item.title ?: item.postId ?: "item"
                    analytics.logAddToCart(item.postId ?: "unknown", itemTitle, item.price ?: 0.0)
                    _state.value = _state.value.copy(
                        buying = false,
                        buyingItem = null,
                        buyMessage = r.data.message ?: "Purchase request sent! The seller will confirm shortly.",
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    buying = false,
                    buyingItem = null,
                    error = r.error.message ?: "Could not send the purchase request.",
                )
            }
        }
    }

    fun dismissBuyMessage() { _state.value = _state.value.copy(buyMessage = null) }

    /** Surface a transient UI error (e.g. a listing missing seller info). */
    fun setError(msg: String) { _state.value = _state.value.copy(error = msg) }

    fun clearError() { _state.value = _state.value.copy(error = null) }
}

private fun Post.toCartItem(quantity: Int = 1): CartItem = CartItem(
    postId = stableId,
    title = displayTitle,
    price = price,
    currency = currency,
    imageUrl = primaryImage,
    sellerName = sellerName ?: userName ?: location,
    sellerId = userId,
    quantity = quantity,
    category = category,
    categoryName = category,
)

private fun CartItem.toPost(): Post = Post(
    id = postId ?: id ?: stableId,
    title = title,
    price = price,
    currency = currency,
    imageUrl = imageUrl,
    sellerName = sellerName,
    category = categoryName ?: category,
)

private fun CartItem.matchesPostId(postId: String): Boolean =
    this.postId == postId || id == postId || stableId == postId

private fun mergeCartItems(remoteItems: List<CartItem>, localPosts: List<Post>, roomItems: List<CartItem> = emptyList()): List<CartItem> {
    // Dedupe across ALL sources by stableId — the same item may exist in Room,
    // SharedExploreStore, and the remote API (category screens write to both).
    // Prefer LOCAL copies (Room + SharedExploreStore) over the remote copy so an item
    // added in a category app keeps its local category even when the server's copy
    // lacks or mislabels it (mirrors the wishlist merge).
    val remoteById = remoteItems.associateBy { it.stableId }
    return (roomItems + localPosts.map { it.toCartItem() } + remoteItems)
        .distinctBy { it.stableId }
        // Enrich local-first copies with the server's seller_id / category_name so the
        // Electronics "Buy with Platform" button works even when the item was added
        // offline or from a category app (the server knows the real seller + category).
        .map { item ->
            val remote = remoteById[item.stableId] ?: return@map item
            if (item.sellerId != null && item.categoryName != null) item
            else item.copy(sellerId = item.sellerId ?: remote.sellerId, categoryName = item.categoryName ?: remote.categoryName)
        }
}

/** Convert a Room cart entity into the UI CartItem model. */
private fun com.zaruda.app.data.local.db.CartItemEntity.toCartItem(): CartItem = CartItem(
    id = id,
    postId = postId.ifBlank { id },
    title = title,
    price = price,
    currency = null,
    imageUrl = imageUrl,
    sellerName = brand,
    sellerId = sellerId,
    quantity = quantity,
    category = category,
    categoryName = category,
)

/** Convert a UI CartItem back into a Room cart entity (for undo / move-to-cart persistence). */
private fun CartItem.toCartEntity(): com.zaruda.app.data.local.db.CartItemEntity = com.zaruda.app.data.local.db.CartItemEntity(
    id = postId ?: id ?: stableId,
    postId = postId ?: id ?: stableId,
    title = title.orEmpty(),
    price = price ?: 0.0,
    originalPrice = price ?: 0.0,
    imageUrl = imageUrl.orEmpty(),
    category = category.orEmpty(),
    brand = sellerName.orEmpty(),
    sellerId = sellerId,
    selectedColor = "",
    selectedSize = "",
    quantity = quantity,
    inStock = true,
)

private fun List<CartItem>.cartTotal(): Double = sumOf { (it.price ?: 0.0) * it.quantity }

// ──────────────────────────────────────────────────────────────────────────────
// CartScreen — fully polished with Wishlist-grade UI
// ──────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(
    onBack: () -> Unit,
    categoryKey: String? = null,
    onCheckout: (() -> Unit)? = null,
    viewModel: CartViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Apply category filter when categoryKey changes
    LaunchedEffect(categoryKey) {
        viewModel.setCategoryFilter(categoryKey)
    }

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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // ── Layer 1: Scenic Hero Backdrop ──
                item(key = "cart_hero") {
                    CartHeroBackdrop()
                }

                // ── Layer 2: 32dp Floating Curved Sheet Header ──
                item(key = "curved_sheet_header") {
                    Surface(
                        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                        color = MaterialTheme.colorScheme.background,
                        shadowElevation = 8.dp,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 14.dp, bottom = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            // Centered tactile drag handle (40.dp x 4.dp)
                            Box(
                                modifier = Modifier
                                    .size(width = 40.dp, height = 4.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f))
                            )

                            Spacer(Modifier.height(10.dp))

                        }
                    }
                }

                when {
                    state.loading -> {
                        item(key = "loading") {
                            ListShimmer(count = 4, modifier = Modifier.fillMaxWidth().padding(16.dp))
                        }
                    }
                    state.items.isEmpty() && state.savedForLater.isEmpty() -> {
                        item(key = "empty_cart") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 64.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                AppEmptyIllustration(
                                    icon = Icons.Default.ShoppingCart,
                                    accentIcon = Icons.Default.VerifiedUser,
                                    accentIcon2 = Icons.Outlined.LocalOffer,
                                    title = "Your cart is empty",
                                    subtitle = "Add Electronics listings with Add to Cart and buy them securely here",
                                )
                            }
                        }
                    }
                    else -> {
                        if (state.items.isNotEmpty()) {
                            item(key = "free_delivery_meter") {
                                val freeDeliveryThreshold = 1500.0
                                val progress = (state.total / freeDeliveryThreshold).coerceIn(0.0, 1.0).toFloat()
                                val remaining = (freeDeliveryThreshold - state.total).coerceAtLeast(0.0)
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (remaining == 0.0) Color(0xFFDCFCE7) else MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f),
                                    border = BorderStroke(1.dp, if (remaining == 0.0) Color(0xFF22C55E) else MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)),
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 4.dp)
                                ) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text(if (remaining == 0.0) "🎉" else "🚚", fontSize = 16.sp)
                                            Text(
                                                text = if (remaining == 0.0) "You unlocked FREE Insured Delivery!" else "Add ₹" + "%,.0f".format(remaining) + " more for Free Insured Delivery",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (remaining == 0.0) Color(0xFF15803D) else MaterialTheme.colorScheme.onSurface
                                            )
                                        }
                                        LinearProgressIndicator(
                                            progress = { progress },
                                            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                            color = if (remaining == 0.0) Color(0xFF22C55E) else MaterialTheme.colorScheme.primary,
                                            trackColor = MaterialTheme.colorScheme.surfaceVariant
                                        )
                                    }
                                }
                            }

                            item(key = "cart_header") {
                                Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                                    SectionLabelWithCount("Saved Items", state.items.size)
                                }
                            }

                            items(state.items, key = { it.stableId }) { item ->
                                Box(modifier = Modifier.padding(horizontal = 14.dp, vertical = 2.dp)) {
                                    ShortlistItemCard(
                                        item = item,
                                        onRemove = { viewModel.removeWithUndo(item.postId ?: "") },
                                        onSaveForLater = { viewModel.saveForLater(item.postId ?: "") },
                                        onBuyWithPlatform = {
                                            // Escrow is Electronics-only (platform policy);
                                            // the button only renders for electronics items,
                                            // but guard here too so non-electronics can never
                                            // reach the IN_APP flow.
                                            if (onCheckout != null) onCheckout()
                                            else if (item.isElectronics && item.sellerId != null) viewModel.confirmBuy(item)
                                            else viewModel.setError("Platform purchase is available for Electronics listings only.")
                                        },
                                    )
                                }
                            }
                        }

                        if (state.savedForLater.isNotEmpty()) {
                            item(key = "sfl_header") {
                                Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                                    SectionLabelWithCount("Saved for Later", state.savedForLater.size)
                                }
                            }
                            items(state.savedForLater, key = { "sfl_${it.stableId}" }) { item ->
                                Box(modifier = Modifier.padding(horizontal = 14.dp, vertical = 2.dp)) {
                                    SavedForLaterCard(
                                        item = item,
                                        onMoveToCart = { viewModel.moveToCart(item.postId ?: "") },
                                        onRemove = { viewModel.remove(item.postId ?: "") },
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Pinned Sticky Bottom Checkout Bar
            if (state.items.isNotEmpty()) {
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 6.dp,
                    shadowElevation = 12.dp,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                ) {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(
                                    "Total Payable",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.Medium,
                                )
                                Text(
                                    "₹%,.0f".format(state.total),
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF059669).copy(alpha = 0.1f),
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Text("🛡️", fontSize = 11.sp)
                                    Text("100% Insured", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                                }
                            }
                        }

                        Button(
                            onClick = {
                                if (onCheckout != null) onCheckout()
                                else {
                                    // Escrow only ever targets an Electronics item (IN_APP);
                                    // anything else in the cart is direct/outside by policy.
                                    val target = state.items.firstOrNull { it.isElectronics && (it.sellerId != null) }
                                    if (target != null) viewModel.confirmBuy(target)
                                    else viewModel.setError("No Electronics item in cart — platform purchase applies to Electronics only.")
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Filled.Security, null, tint = Color.White, modifier = Modifier.size(20.dp))
                                Text("🛡️ Proceed to Checkout", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                            }
                        }
                    }
                }
            }
        }

        // Layer 3: Pinned Floating Glassmorphic Top Bar
        CartFloatingTopBar(
            itemCount = state.items.size,
            onBack = onBack,
        )

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 80.dp),
        )
    }

    // ── Electronics purchase confirm dialog ────────────────────────────────
    val buyingItem = state.buyingItem
    if (buyingItem != null) {
        AlertDialog(
            onDismissRequest = { if (!state.buying) viewModel.dismissBuy() },
            icon = { Text("🛡️", fontSize = 30.sp) },
            title = { Text("Buy with Platform", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "\"${buyingItem.title ?: "This item"}\"\n₹%,.0f".format(buyingItem.price ?: 0.0),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                    )
                    Text(
                        "• You pay securely inside the app.\n" +
                        "• The seller ships, you confirm receipt, then the payment is released.\n" +
                        "• If the item never arrives or isn't as described, raise a dispute and get your money back.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 19.sp,
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.requestPlatformBuy() },
                    enabled = !state.buying,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    if (state.buying) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White)
                        Spacer(Modifier.width(6.dp))
                    }
                    Text(if (state.buying) "Sending…" else "Request Purchase", fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.dismissBuy() }, enabled = !state.buying) { Text("Cancel") }
            },
        )
    }

    // ── Error feedback (e.g. purchase request failed) ───────────────────────
    state.error?.let { err ->
        AlertDialog(
            onDismissRequest = { viewModel.clearError() },
            title = { Text("Couldn't start purchase", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            text = { Text(err, fontSize = 13.sp, color = MaterialTheme.colorScheme.error) },
            confirmButton = {
                Button(onClick = { viewModel.clearError() }, shape = RoundedCornerShape(10.dp)) { Text("OK") }
            },
        )
    }

    // ── Success feedback ────────────────────────────────────────────────────
    state.buyMessage?.let { message ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissBuyMessage() },
            icon = { Text("✅", fontSize = 28.sp) },
            title = { Text("Purchase request sent!", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            text = {
                Text(
                    "$message\n\nOnce the seller approves, you'll pay securely inside the app.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            confirmButton = {
                Button(onClick = { viewModel.dismissBuyMessage() }, shape = RoundedCornerShape(10.dp)) { Text("OK") }
            },
        )
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
// CartItemCard — compact, Wishlist-grade card with inline selection
// ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun ShortlistItemCard(
    item: CartItem,
    onRemove: () -> Unit,
    onSaveForLater: () -> Unit = {},
    onBuyWithPlatform: (() -> Unit)? = null,
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
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
                    Text(
                        "₹%,.0f".format(price),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }

                // Action buttons
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                    modifier = Modifier.padding(vertical = 4.dp),
                )
                // Electronics only → in-app platform purchase button (per post)
                if (item.isElectronics && onBuyWithPlatform != null) {
                    Button(
                        onClick = onBuyWithPlatform,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        modifier = Modifier.fillMaxWidth().height(36.dp),
                    ) {
                        Icon(Icons.Filled.VerifiedUser, null, tint = Color.White, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(5.dp))
                        Text("Buy with Platform", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }

                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
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

@Composable
private fun CartHeroBackdrop() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF064E3B),
                        Color(0xFF0F172A),
                    )
                )
            )
    ) {
        // Decorative trolley watermark — a cart visual, not an unrelated stock photo
        Icon(
            imageVector = Icons.Filled.ShoppingCart,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.08f),
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 12.dp)
                .size(150.dp)
        )
        Icon(
            imageVector = Icons.Filled.ShoppingBag,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.05f),
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(start = 20.dp, top = 8.dp)
                .size(72.dp)
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 20.dp, vertical = 24.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF059669).copy(alpha = 0.35f),
                border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.6f)),
                modifier = Modifier.padding(bottom = 6.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF22C55E)))
                    Text(
                        text = "SECURE IN-APP BUY",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }
            Text(
                text = "Shopping Cart 🛒",
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = "Pay safely inside the app • released after you confirm delivery",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

@Composable
private fun CartFloatingTopBar(
    itemCount: Int,
    onBack: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(24.dp),
        color = Color(0xFF0F172A).copy(alpha = 0.85f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.15f)),
        shadowElevation = 8.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier.size(34.dp)
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(Modifier.width(8.dp))
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color.White.copy(alpha = 0.12f),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "🛍️ Cart",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                    if (itemCount > 0) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF10B981),
                            modifier = Modifier.size(18.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "$itemCount",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.weight(1f))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFF059669).copy(alpha = 0.3f),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("🛡️", fontSize = 12.sp)
                    Text("In-App Buy", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                }
            }
        }
    }
}


