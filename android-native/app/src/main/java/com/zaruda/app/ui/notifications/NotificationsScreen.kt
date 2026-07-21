package com.zaruda.app.ui.notifications

import androidx.compose.ui.res.stringResource
import com.zaruda.app.R
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.foundation.layout.height
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.NotificationsRepository
import com.zaruda.app.domain.model.Notification
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.ListShimmer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationsState(
    val loading: Boolean = true,
    val items: List<Notification> = emptyList(),
    val error: String? = null,
    val expandedItems: Set<String> = emptySet(),
    val showSettings: Boolean = false,
    val selectedItems: Set<String> = emptySet(),
    val selectMode: Boolean = false,
    val snoozedItems: Set<String> = emptySet(),
)

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val repo: NotificationsRepository,
    private val localeManager: com.zaruda.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(NotificationsState())
    val state: StateFlow<NotificationsState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L

    init {
        load()
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load() }
                lastLocaleVersion = version
            }
        }
    }

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val result = repo.list()) {
                is ApiResult.Success -> _state.value = NotificationsState(loading = false, items = result.data)
                is ApiResult.Failure -> _state.value = NotificationsState(
                    loading = false,
                    error = result.error.message,
                )
            }
        }
    }

    fun markRead(id: String) {
        viewModelScope.launch {
            repo.markRead(id)
            _state.value = _state.value.copy(
                items = _state.value.items.map { item ->
                    if (item.stableId == id) item.copy(isRead = true) else item
                },
            )
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            repo.markAllRead()
            _state.value = _state.value.copy(items = _state.value.items.map { it.copy(isRead = true) })
        }
    }

    fun dismiss(id: String) {
        _state.value = _state.value.copy(items = _state.value.items.filter { it.stableId != id })
        viewModelScope.launch { repo.delete(id) }
    }
    
    fun toggleExpanded(id: String) {
        val current = _state.value.expandedItems
        _state.value = _state.value.copy(
            expandedItems = if (id in current) current - id else current + id,
        )
    }
    
    fun toggleSettings() {
        _state.value = _state.value.copy(showSettings = !_state.value.showSettings)
    }

    // ── Bulk selection ────────────────────────────────────────
    fun toggleSelectMode() {
        val newMode = !_state.value.selectMode
        _state.value = _state.value.copy(
            selectMode = newMode,
            selectedItems = if (newMode) _state.value.selectedItems else emptySet(),
        )
    }

    fun toggleSelected(id: String) {
        val current = _state.value.selectedItems
        _state.value = _state.value.copy(
            selectedItems = if (id in current) current - id else current + id,
        )
    }

    fun selectAll() {
        _state.value = _state.value.copy(
            selectedItems = _state.value.items.map { it.stableId }.toSet(),
        )
    }

    fun deselectAll() {
        _state.value = _state.value.copy(selectedItems = emptySet())
    }

    fun deleteSelected() {
        val toDelete = _state.value.selectedItems
        _state.value = _state.value.copy(
            items = _state.value.items.filter { it.stableId !in toDelete },
            selectedItems = emptySet(),
            selectMode = false,
        )
        viewModelScope.launch {
            toDelete.forEach { id -> repo.delete(id) }
        }
    }

    fun deleteAll() {
        val allIds = _state.value.items.map { it.stableId }
        _state.value = _state.value.copy(items = emptyList(), selectedItems = emptySet(), selectMode = false)
        viewModelScope.launch {
            allIds.forEach { id -> repo.delete(id) }
        }
    }

    fun snooze(id: String) {
        // Hide from view (add to snoozed set), re-show after delay
        _state.value = _state.value.copy(
            snoozedItems = _state.value.snoozedItems + id,
        )
        viewModelScope.launch {
            repo.snooze(id)
            kotlinx.coroutines.delay(3_600_000L) // 1 hour
            _state.value = _state.value.copy(
                snoozedItems = _state.value.snoozedItems - id,
            )
        }
    }
}

private data class NotifIconStyle(val icon: ImageVector, val tint: Color, val bg: Color)

private fun notifStyle(type: String?): NotifIconStyle {
    val t = type?.lowercase() ?: ""
    return when {
        t.contains("order") || t.contains("sale") || t.contains("package") ->
            NotifIconStyle(Icons.Default.ShoppingBag, Color(0xFFFF6B2B), Color(0xFFFFF0E8))
        t.contains("payment") || t.contains("wallet") || t.contains("money") ->
            NotifIconStyle(Icons.Default.Wallet, Color(0xFF059669), Color(0xFFE6FFF5))
        t.contains("security") || t.contains("auth") ->
            NotifIconStyle(Icons.Default.Security, Color(0xFFDC2626), Color(0xFFFFE8E8))
        t.contains("message") || t.contains("chat") || t.contains("inquiry") ->
            NotifIconStyle(Icons.AutoMirrored.Filled.Chat, Color(0xFF2563EB), Color(0xFFE8F0FF))
        t.contains("gift") || t.contains("promo") || t.contains("reward") ->
            NotifIconStyle(Icons.Default.Campaign, Color(0xFF7C3AED), Color(0xFFF0E8FF))
        t.contains("wishlist") || t.contains("saved") ->
            NotifIconStyle(Icons.Default.Bookmark, Color(0xFF6366F1), Color(0xFFF5F3FF))
        t.contains("heart") || t.contains("like") ->
            NotifIconStyle(Icons.Default.Favorite, Color(0xFFDB2777), Color(0xFFFFE8F5))
        t.contains("star") || t.contains("subscription") || t.contains("tier") ->
            NotifIconStyle(Icons.Default.Star, Color(0xFFD97706), Color(0xFFFFF8E0))
        t.contains("offer") || t.contains("price") || t.contains("deal") ->
            NotifIconStyle(Icons.Default.LocalOffer, Color(0xFF0891B2), Color(0xFFE0F8FF))
        t.contains("trend") ->
            NotifIconStyle(Icons.AutoMirrored.Filled.TrendingUp, Color(0xFF0F766E), Color(0xFFE6FFF9))
        t.contains("alert") || t.contains("warning") ->
            NotifIconStyle(Icons.Default.WarningAmber, Color(0xFFB45309), Color(0xFFFFF3E0))
        else ->
            NotifIconStyle(Icons.Default.Notifications, Color(0xFF4F46E5), Color(0xFFEEF0FF))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onOpenPost: (String) -> Unit,
    onAcceptOffer: (String) -> Unit = {},
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val unreadCount = state.items.count { !it.isRead }
    var searchQuery by remember { mutableStateOf("") }
    var showUnreadOnly by remember { mutableStateOf(false) }
    var selectedFilter by rememberSaveable { mutableStateOf("All") }
    val focusManager = LocalFocusManager.current

    val filterOptions = listOf("All", "Offers", "Chat", "System")

    val displayItems = remember(state.items, searchQuery, showUnreadOnly, selectedFilter, state.snoozedItems) {
        state.items.filter { n ->
            n.stableId !in state.snoozedItems &&
            (!showUnreadOnly || !n.isRead) &&
                (searchQuery.isBlank() ||
                    n.displayTitle.contains(searchQuery, ignoreCase = true) ||
                    n.displayMessage.contains(searchQuery, ignoreCase = true)) &&
                (selectedFilter == "All" || run {
                    val t = n.type?.lowercase() ?: ""
                    when (selectedFilter) {
                        "Offers" -> t.contains("offer") || t.contains("price") || t.contains("deal")
                        "Chat" -> t.contains("message") || t.contains("chat") || t.contains("inquiry")
                        "System" -> t.contains("security") || t.contains("auth") || t.contains("alert") || t.contains("system")
                        else -> true
                    }
                })
        }
    }
    val unread = displayItems.filter { !it.isRead }
    val read = displayItems.filter { it.isRead }

    // Date grouping helper
    val dateGrouped = remember(displayItems) {
        val now = java.time.LocalDate.now()
        val groups = mutableListOf<Pair<String, List<Notification>>>()
        val grouped = displayItems.groupBy { notif ->
            val ts = notif.createdAt
            if (ts.isNullOrBlank()) "Older"
            else try {
                val date = java.time.Instant.parse(ts).atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                val days = java.time.temporal.ChronoUnit.DAYS.between(date, now)
                when {
                    days == 0L -> "Today"
                    days == 1L -> "Yesterday"
                    days < 7L -> "This Week"
                    days < 30L -> "This Month"
                    else -> "Older"
                }
            } catch (_: Exception) { "Older" }
        }
        // Maintain order
        listOf("Today", "Yesterday", "This Week", "This Month", "Older").forEach { label ->
            grouped[label]?.let { items -> if (items.isNotEmpty()) groups.add(label to items) }
        }
        groups
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(text = stringResource(R.string.notif_title), fontWeight = FontWeight.Bold)
                        if (unreadCount > 0) {
                            Text(
                                text = "$unreadCount unread",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                },
                actions = {
                    if (state.selectMode) {
                        TextButton(onClick = {
                            if (state.selectedItems.size == displayItems.size) viewModel.deselectAll()
                            else viewModel.selectAll()
                        }) {
                            Text(
                                if (state.selectedItems.size == displayItems.size) "Deselect All" else "Select All",
                                style = MaterialTheme.typography.labelMedium,
                            )
                        }
                        IconButton(
                            onClick = { viewModel.deleteSelected() },
                            enabled = state.selectedItems.isNotEmpty(),
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete selected", tint = if (state.selectedItems.isNotEmpty()) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        TextButton(onClick = { viewModel.toggleSelectMode() }) {
                            Text("Cancel", style = MaterialTheme.typography.labelMedium)
                        }
                    } else {
                        IconButton(onClick = { viewModel.toggleSelectMode() }) {
                            Icon(Icons.Default.CheckCircle, contentDescription = "Select")
                        }
                        IconButton(onClick = { viewModel.toggleSettings() }) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings")
                        }
                        if (unreadCount > 0) {
                            TextButton(onClick = { viewModel.markAllRead() }) {
                                Icon(
                                    Icons.Default.DoneAll,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                )
                                Spacer(Modifier.width(4.dp))
                                Text(stringResource(R.string.notif_mark_all_read), style = MaterialTheme.typography.labelMedium)
                            }
                        }
                        if (state.items.isNotEmpty()) {
                            var showDeleteAllDialog by remember { mutableStateOf(false) }
                            IconButton(onClick = { showDeleteAllDialog = true }) {
                                Icon(Icons.Default.DeleteSweep, contentDescription = "Delete all")
                            }
                            if (showDeleteAllDialog) {
                                AlertDialog(
                                    onDismissRequest = { showDeleteAllDialog = false },
                                    title = { Text(stringResource(R.string.notif_delete_all_title)) },
                                    text = { Text(stringResource(R.string.notif_delete_all_confirm, state.items.size)) },
                                    confirmButton = { TextButton(onClick = { viewModel.deleteAll(); showDeleteAllDialog = false }) { Text(stringResource(R.string.notif_delete_all)) } },
                                    dismissButton = { TextButton(onClick = { showDeleteAllDialog = false }) { Text(stringResource(R.string.notif_cancel)) } },
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.loading && state.items.isNotEmpty(),
            onRefresh = { viewModel.load() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.loading && state.items.isEmpty() -> ListShimmer(
                    count = 6,
                    modifier = Modifier.fillMaxSize().padding(top = 8.dp),
                )

                state.error != null && state.items.isEmpty() -> Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    AppErrorState(
                        title = "Notifications unavailable",
                        message = state.error ?: "Unable to load notifications",
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry",
                    )
                }

                else -> LazyColumn(
                    contentPadding = PaddingValues(bottom = 90.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    // Gradient hero header (web parity)
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().background(Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF6366F1), Color(0xFFA855F7)))).padding(horizontal = 16.dp, vertical = 14.dp),
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Box(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Notifications, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
                                }
                                Column {
                                    Text("Notifications", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
                                    if (unreadCount > 0) Text("$unreadCount unread messages", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.85f))
                                    else Text("You're all caught up", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.85f))
                                }
                            }
                        }
                    }

                    // Search bar
                    item {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text(stringResource(R.string.notif_search_hint)) },
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

                    // Notification statistics card
                    if (state.items.isNotEmpty()) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)),
                            ) {
                                Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("${state.items.size}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                                        Text("Total", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("$unreadCount", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = Color(0xFFEF4444))
                                        Text("Unread", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        val readPct = if (state.items.isNotEmpty()) ((state.items.size - unreadCount) * 100 / state.items.size) else 0
                                        Text("${readPct}%", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = Color(0xFF22C55E))
                                        Text("Read Rate", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }

                    // Category filter chips
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            filterOptions.forEach { filter ->
                                FilterChip(
                                    selected = selectedFilter == filter,
                                    onClick = { selectedFilter = filter },
                                    label = { Text(filter) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }

                    // Unread filter toggle
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                text = if (showUnreadOnly) "Showing unread only" else "All notifications",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Unread",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Spacer(Modifier.width(8.dp))
                                Switch(
                                    checked = showUnreadOnly,
                                    onCheckedChange = { showUnreadOnly = it },
                                )
                            }
                        }
                    }

                    if (displayItems.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 64.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                AppEmptyState(
                                    icon = Icons.Default.Notifications,
                                    title = "All caught up",
                                    subtitle = "New activity and offers will appear here.",
                                )
                            }
                        }
                    } else {
                        dateGrouped.forEach { (label, groupItems) ->
                            item {
                                SectionLabel(label)
                            }
                            items(groupItems, key = { it.stableId }) { notif ->
                                SwipeToDismissNotification(
                                    onDismiss = { viewModel.dismiss(notif.stableId) },
                                ) {
                                    NotificationRow(
                                        notification = notif,
                                        isUnread = !notif.isRead,
                                        isExpanded = notif.stableId in state.expandedItems,
                                        isSelected = state.selectMode && notif.stableId in state.selectedItems,
                                        selectMode = state.selectMode,
                                        onToggleExpand = { viewModel.toggleExpanded(notif.stableId) },
                                        onClick = {
                                            if (state.selectMode) {
                                                viewModel.toggleSelected(notif.stableId)
                                            } else {
                                                viewModel.markRead(notif.stableId)
                                                notif.postId?.let { onOpenPost(it) }
                                            }
                                        },
                                        onAcceptOffer = { onAcceptOffer(notif.stableId) },
                                        onSnooze = { viewModel.snooze(notif.stableId) },
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Settings dialog
    if (state.showSettings) {
        ModalBottomSheet(
            onDismissRequest = { viewModel.toggleSettings() },
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(stringResource(R.string.notif_preferences), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(stringResource(R.string.notif_preferences_subtitle),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)

                listOf(
                    Triple("Offers & Deals", "Get notified about price drops and offers", true),
                    Triple("Messages & Chat", "New messages from buyers and sellers", true),
                    Triple("System Updates", "Account security and app updates", true),
                    Triple("Marketing", "Promotional offers and campaigns", false),
                    Triple("Order Updates", "Shipping and delivery notifications", true),
                    Triple("New Followers", "When someone follows your profile", false),
                ).forEach { (title, desc, checked) ->
                    var isChecked by remember { mutableStateOf(checked) }
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text(desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Switch(checked = isChecked, onCheckedChange = { isChecked = it })
                    }
                    HorizontalDivider(thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
                }
                Spacer(Modifier.height(8.dp))
                Button(onClick = { viewModel.toggleSettings() }, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.notif_save))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationRow(
    notification: Notification,
    isUnread: Boolean = false,
    isExpanded: Boolean = false,
    isSelected: Boolean = false,
    selectMode: Boolean = false,
    onToggleExpand: () -> Unit = {},
    onClick: () -> Unit,
    onAcceptOffer: () -> Unit = {},
    onSnooze: () -> Unit = {},
) {
    val style = notifStyle(notification.type)
    val isOfferNotification = notification.type?.lowercase()?.contains("offer") == true
    val hasActions = isOfferNotification || notification.postId != null
    
    Card(
        onClick = { if (!hasActions) onClick() },
        shape = RoundedCornerShape(0.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
            else if (isUnread) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else MaterialTheme.colorScheme.surface,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onToggleExpand() }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                // Icon circle
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(style.bg),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = style.icon,
                        contentDescription = null,
                        tint = style.tint,
                        modifier = Modifier.size(22.dp),
                    )
                }

                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = notification.displayTitle,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (isUnread) FontWeight.SemiBold else FontWeight.Normal,
                            maxLines = if (isExpanded) Int.MAX_VALUE else 1,
                            overflow = if (isExpanded) TextOverflow.Visible else TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f),
                        )
                        if (isUnread) {
                            Spacer(Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary),
                            )
                        }
                    }
                    Text(
                        text = notification.displayMessage,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = if (isExpanded) Int.MAX_VALUE else 2,
                        overflow = if (isExpanded) TextOverflow.Visible else TextOverflow.Ellipsis,
                    )
                    notification.createdAt?.let { ts ->
                        Text(
                            text = formatRelativeTime(ts),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        )
                    }
                    notification.expiresAt?.let { exp ->
                        val expiryText = try {
                            val expiresInstant = java.time.Instant.parse(exp)
                            val now = java.time.Instant.now()
                            if (expiresInstant.isAfter(now)) {
                                val mins = java.time.Duration.between(now, expiresInstant).toMinutes()
                                when {
                                    mins < 60 -> "Expires in ${mins}m"
                                    mins < 1440 -> "Expires in ${mins / 60}h"
                                    else -> "Expires in ${mins / 1440}d"
                                }
                            } else "Expired"
                        } catch (_: Exception) { null }
                        expiryText?.let { txt ->
                            Text(
                                text = txt,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (txt == "Expired") MaterialTheme.colorScheme.error
                                       else MaterialTheme.colorScheme.tertiary,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
                
                // Expand/collapse icon
                if (hasActions) {
                    Icon(
                        if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = if (isExpanded) "Collapse" else "Expand",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
            
            // Action buttons (shown when expanded)
            if (isExpanded && hasActions) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (isOfferNotification) {
                        Button(
                            onClick = onAcceptOffer,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.notif_accept_offer), fontSize = 13.sp)
                        }
                    }
                    if (notification.postId != null) {
                        OutlinedButton(
                            onClick = onClick,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                        ) {
                            Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.notif_view_post), fontSize = 13.sp)
                        }
                    }
                    OutlinedButton(
                        onClick = onSnooze,
                        shape = RoundedCornerShape(10.dp),
                    ) {
                        Icon(Icons.Default.NotificationsOff, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(stringResource(R.string.notif_snooze), fontSize = 13.sp)
                    }
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
        }
    }
}

private fun formatRelativeTime(iso: String): String {
    return try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
        val date = sdf.parse(iso.take(19)) ?: return iso
        val diff = System.currentTimeMillis() - date.time
        val mins = diff / 60000
        val hrs = mins / 60
        val days = hrs / 24
        when {
            mins < 2 -> "Just now"
            mins < 60 -> "${mins}m ago"
            hrs < 24 -> "${hrs}h ago"
            days < 7 -> "${days}d ago"
            else -> {
                val out = java.text.SimpleDateFormat("MMM d", java.util.Locale.getDefault())
                out.format(date)
            }
        }
    } catch (e: Exception) {
        iso.take(10)
    }
}

@Composable
private fun SectionLabel(label: String) {
    Text(
        text = label,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeToDismissNotification(
    onDismiss: () -> Unit,
    content: @Composable () -> Unit,
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = {
            if (it == SwipeToDismissBoxValue.EndToStart) {
                onDismiss()
                true
            } else false
        },
    )
    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFEF4444))
                    .padding(horizontal = 20.dp),
                contentAlignment = Alignment.CenterEnd,
            ) {
                Icon(Icons.Default.Close, contentDescription = "Delete", tint = Color.White)
            }
        },
        enableDismissFromStartToEnd = false,
    ) {
        content()
    }
}
