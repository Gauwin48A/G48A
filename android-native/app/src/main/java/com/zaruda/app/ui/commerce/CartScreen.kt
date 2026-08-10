package com.zaruda.app.ui.commerce

import android.content.Intent
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
import com.zaruda.app.R
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.ListShimmer
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.common.LinkColor
import com.zaruda.app.ui.explore.SharedExploreStore
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
)

// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class CartViewModel @Inject constructor(
    private val repo: CartRepository,
    private val cartItemDao: com.zaruda.app.data.local.db.CartItemDao,
    private val localeManager: com.zaruda.app.core.LocaleManager,
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
        val catFilter = _categoryFilter.value
        // Filter remote cart items by category too (CartItem now has category field)
        val filteredRemote = if (catFilter != null) {
            remoteCartItems.filter { it.category == catFilter }
        } else {
            remoteCartItems
        }
        val localPosts = if (catFilter != null) {
            SharedExploreStore.cartPosts.filter { it.category == catFilter }
        } else {
            SharedExploreStore.cartPosts
        }
        val mergedItems = mergeCartItems(filteredRemote, localPosts, roomCartItems)
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
}

private fun Post.toCartItem(quantity: Int = 1): CartItem = CartItem(
    postId = stableId,
    title = displayTitle,
    price = price,
    currency = currency,
    imageUrl = primaryImage,
    sellerName = sellerName ?: userName ?: location,
    quantity = quantity,
    category = category,
)

private fun CartItem.toPost(): Post = Post(
    id = postId ?: id ?: stableId,
    title = title,
    price = price,
    currency = currency,
    imageUrl = imageUrl,
    sellerName = sellerName,
    category = category,
)

private fun CartItem.matchesPostId(postId: String): Boolean =
    this.postId == postId || id == postId || stableId == postId

private fun mergeCartItems(remoteItems: List<CartItem>, localPosts: List<Post>, roomItems: List<CartItem> = emptyList()): List<CartItem> {
    // Dedupe across ALL sources by stableId — the same item may exist in Room,
    // SharedExploreStore, and the remote API (category screens write to both).
    return (remoteItems + roomItems + localPosts.map { it.toCartItem() })
        .distinctBy { it.stableId }
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
    quantity = quantity,
    category = category,
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
fun CartScreen(onBack: () -> Unit, categoryKey: String? = null, viewModel: CartViewModel = hiltViewModel()) {
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
                            title = "Your shortlist is empty",
                            subtitle = "Save items you're interested in from any category",
                        )
                    }

                    else -> {
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            // Cart items section
                            if (state.items.isNotEmpty()) {
                                item(key = "cart_header") {
                                    SectionLabelWithCount("Saved Items", state.items.size)
                                }
                                items(state.items, key = { it.stableId }) { item ->
                                    ShortlistItemCard(
                                        item = item,
                                        onRemove = { viewModel.removeWithUndo(item.postId ?: "") },
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
                        }

                        // Contact seller prompt at bottom
                        if (state.items.isNotEmpty()) {
                            Surface(
                                color = MaterialTheme.colorScheme.surface,
                                tonalElevation = 3.dp,
                                shadowElevation = 8.dp,
                            ) {
                                Column(Modifier.fillMaxWidth().padding(16.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.CompareArrows, null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(20.dp),
                                        )
                                        Text(
                                            "Interested in an item? Contact the seller directly to ask questions or arrange a meetup.",
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            lineHeight = 18.sp,
                                            modifier = Modifier.weight(1f),
                                        )
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

