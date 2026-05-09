package com.mhub.app.ui.wishlist

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.WishlistRepository
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WishlistState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val items: List<Post> = emptyList(),
    val error: String? = null,
    val selectedItems: Set<String> = emptySet(),
    val isMultiSelectMode: Boolean = false,
)

@HiltViewModel
class WishlistViewModel @Inject constructor(
    private val repo: WishlistRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(WishlistState())
    val state: StateFlow<WishlistState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = _state.value.copy(
            loading = _state.value.items.isEmpty(),
            refreshing = _state.value.items.isNotEmpty(),
            error = null,
        )
        viewModelScope.launch {
            when (val result = repo.list()) {
                is ApiResult.Success -> _state.value = WishlistState(
                    loading = false,
                    refreshing = false,
                    items = result.data,
                )
                is ApiResult.Failure -> _state.value = WishlistState(
                    loading = false,
                    refreshing = false,
                    error = result.error.message,
                )
            }
        }
    }

    fun remove(postId: String) {
        viewModelScope.launch {
            repo.remove(postId)
            _state.value = _state.value.copy(items = _state.value.items.filter { it.stableId != postId })
        }
    }
    
    fun toggleMultiSelect() {
        _state.value = _state.value.copy(
            isMultiSelectMode = !_state.value.isMultiSelectMode,
            selectedItems = if (!_state.value.isMultiSelectMode) emptySet() else _state.value.selectedItems,
        )
    }
    
    fun toggleItemSelection(postId: String) {
        val current = _state.value.selectedItems
        _state.value = _state.value.copy(
            selectedItems = if (postId in current) current - postId else current + postId,
        )
    }
    
    fun selectAll() {
        _state.value = _state.value.copy(selectedItems = _state.value.items.map { it.stableId }.toSet())
    }
    
    fun clearSelection() {
        _state.value = _state.value.copy(selectedItems = emptySet())
    }
    
    fun bulkAddToCart() {
        viewModelScope.launch {
            _state.value.selectedItems.forEach { postId ->
                // Call repo to add to cart (assuming CartRepository has an add method)
                // repo.addToCart(postId)
            }
            _state.value = _state.value.copy(selectedItems = emptySet(), isMultiSelectMode = false)
        }
    }
}

private enum class WishlistSort(val label: String) {
    SAVED("Saved"),
    PRICE_ASC("Price ↑"),
    PRICE_DESC("Price ↓"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WishlistScreen(
    onBack: () -> Unit = {},
    onOpenPost: (String) -> Unit,
    viewModel: WishlistViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var gridMode by remember { mutableStateOf(false) }
    var sortBy by remember { mutableStateOf(WishlistSort.SAVED) }
    val focusManager = LocalFocusManager.current

    val filteredItems = remember(state.items, searchQuery, sortBy) {
        state.items
            .filter { post ->
                searchQuery.isBlank() ||
                    post.displayTitle.contains(searchQuery, ignoreCase = true) ||
                    post.location?.contains(searchQuery, ignoreCase = true) == true ||
                    post.categoryName?.contains(searchQuery, ignoreCase = true) == true
            }
            .let { list ->
                when (sortBy) {
                    WishlistSort.SAVED -> list
                    WishlistSort.PRICE_ASC -> list.sortedBy { it.price ?: Double.MAX_VALUE }
                    WishlistSort.PRICE_DESC -> list.sortedByDescending { it.price ?: 0.0 }
                }
            }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(text = if (state.isMultiSelectMode) "Select Items" else "Saved", fontWeight = FontWeight.Bold)
                        if (state.isMultiSelectMode && state.selectedItems.isNotEmpty()) {
                            Text(
                                text = "${state.selectedItems.size} selected",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        } else if (state.items.isNotEmpty()) {
                            Text(
                                text = "${state.items.size} item${if (state.items.size != 1) "s" else ""}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (state.isMultiSelectMode) {
                            viewModel.toggleMultiSelect()
                        } else {
                            onBack()
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (state.isMultiSelectMode) {
                        TextButton(onClick = { viewModel.selectAll() }) {
                            Text("Select All", style = MaterialTheme.typography.labelMedium)
                        }
                        TextButton(onClick = { viewModel.clearSelection() }) {
                            Text("Clear", style = MaterialTheme.typography.labelMedium)
                        }
                    } else {
                        if (state.items.isNotEmpty()) {
                            IconButton(onClick = { viewModel.toggleMultiSelect() }) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Multi-select")
                            }
                        }
                        IconButton(onClick = { gridMode = !gridMode }) {
                            Icon(
                                imageVector = if (gridMode) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                                contentDescription = "Toggle view",
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
        floatingActionButton = {
            if (state.isMultiSelectMode && state.selectedItems.isNotEmpty()) {
                androidx.compose.material3.ExtendedFloatingActionButton(
                    text = { Text("Add ${state.selectedItems.size} to Cart") },
                    icon = { Icon(Icons.Default.ShoppingCart, contentDescription = null) },
                    onClick = { viewModel.bulkAddToCart() },
                    containerColor = MaterialTheme.colorScheme.primary,
                )
            }
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }

                state.error != null && state.items.isEmpty() -> Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    AppErrorState(
                        title = "Wishlist unavailable",
                        message = state.error ?: "Unable to load wishlist",
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry",
                    )
                }

                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(bottom = 90.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        // Search bar
                        item {
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text("Search your saved items...") },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                trailingIcon = {
                                    if (searchQuery.isNotBlank()) {
                                        IconButton(onClick = { searchQuery = "" }) {
                                            Icon(Icons.Default.Close, contentDescription = "Clear")
                                        }
                                    }
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(16.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                                    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                                ),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                            )
                        }

                        // Sort chips
                        item {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                            ) {
                                WishlistSort.entries.forEach { option ->
                                    FilterChip(
                                        selected = sortBy == option,
                                        onClick = { sortBy = option },
                                        label = { Text(option.label, style = MaterialTheme.typography.labelMedium) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        ),
                                    )
                                }
                            }
                        }

                        if (state.items.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 64.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    AppEmptyState(
                                        icon = Icons.Default.Favorite,
                                        title = "Nothing saved yet",
                                        subtitle = "Tap the heart icon on listings to save them here.",
                                    )
                                }
                            }
                        } else if (filteredItems.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 64.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    AppEmptyState(
                                        icon = Icons.Default.Search,
                                        title = "No items match",
                                        subtitle = "Try adjusting your filters.",
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

@Composable
private fun WishlistListCard(
    post: Post,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
    isMultiSelectMode: Boolean = false,
    isSelected: Boolean = false,
    onToggleSelect: () -> Unit = {},
) {
    // Calculate price drop (mock data for now - in reality would compare with previous price)
    val priceDrop = if (post.price != null && post.price < 10000) 15 else null  // Mock 15% drop
    
    // Mock date added (in reality, would come from API)
    val dateAdded = remember { 
        val daysAgo = (post.stableId.hashCode().and(0xFF)) % 30
        val instant = java.time.Instant.now().minus(daysAgo.toLong(), java.time.temporal.ChronoUnit.DAYS)
        java.time.format.DateTimeFormatter.ofPattern("MMM d")
            .format(instant.atZone(java.time.ZoneId.systemDefault()))
    }

    Card(
        onClick = { if (isMultiSelectMode) onToggleSelect() else onOpen() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) 
                           else MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            // Checkbox for multi-select mode
            if (isMultiSelectMode) {
                androidx.compose.material3.Checkbox(
                    checked = isSelected,
                    onCheckedChange = { onToggleSelect() },
                )
            }
            
            // Image
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(Icons.Outlined.ImageNotSupported, contentDescription = null)
                }
                
                // Price drop badge
                if (priceDrop != null) {
                    androidx.compose.material3.Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFEF4444),
                        modifier = Modifier.align(Alignment.TopStart).padding(4.dp),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("↓", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            Text("${priceDrop}%", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                post.price?.let {
                    Text(
                        text = "₹${"%,.0f".format(it)}",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                post.categoryName?.let { cat ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                    ) {
                        Text(
                            text = cat,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                post.location?.let { loc ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(12.dp),
                        )
                        Spacer(Modifier.width(2.dp))
                        Text(
                            text = loc,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                
                // Date added
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(11.dp),
                    )
                    Spacer(Modifier.width(3.dp))
                    Text(
                        text = "Added $dateAdded",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (!isMultiSelectMode) {
                TextButton(onClick = onRemove) {
                    Icon(Icons.Default.Close, contentDescription = "Remove", modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
private fun WishlistGridCard(
    post: Post,
    onOpen: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Calculate price drop (mock data)
    val priceDrop = if (post.price != null && post.price < 10000) 15 else null

    Card(
        onClick = onOpen,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier,
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
            ) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)),
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.ImageNotSupported, contentDescription = null)
                    }
                }
                
                // Price drop badge
                if (priceDrop != null) {
                    androidx.compose.material3.Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFEF4444),
                        modifier = Modifier.align(Alignment.TopStart).padding(6.dp),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("↓", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            Text("${priceDrop}%", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                post.price?.let {
                    Text(
                        text = "₹${"%,.0f".format(it)}",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                    )
                }
                IconButton(
                    onClick = onRemove,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(32.dp),
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Remove",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
            Column(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = post.displayTitle,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                post.location?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}
