package com.mhub.app.ui.notifications

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material.icons.filled.WarningAmber
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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.NotificationsRepository
import com.mhub.app.domain.model.Notification
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
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
)

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val repo: NotificationsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(NotificationsState())
    val state: StateFlow<NotificationsState> = _state.asStateFlow()

    init {
        load()
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
        t.contains("heart") || t.contains("like") || t.contains("wishlist") ->
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
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val unreadCount = state.items.count { !it.isRead }
    var searchQuery by remember { mutableStateOf("") }
    var showUnreadOnly by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current

    val displayItems = remember(state.items, searchQuery, showUnreadOnly) {
        state.items.filter { n ->
            (!showUnreadOnly || !n.isRead) &&
                (searchQuery.isBlank() ||
                    n.displayTitle.contains(searchQuery, ignoreCase = true) ||
                    n.displayMessage.contains(searchQuery, ignoreCase = true))
        }
    }
    val unread = displayItems.filter { !it.isRead }
    val read = displayItems.filter { it.isRead }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(text = "Notifications", fontWeight = FontWeight.Bold)
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
                    if (unreadCount > 0) {
                        TextButton(onClick = { viewModel.markAllRead() }) {
                            Icon(
                                Icons.Default.DoneAll,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                            )
                            Spacer(Modifier.width(4.dp))
                            Text("Mark all read", style = MaterialTheme.typography.labelMedium)
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
                state.loading && state.items.isEmpty() -> Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }

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
                    // Search bar
                    item {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Search notifications...") },
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
                        if (unread.isNotEmpty()) {
                            item {
                                SectionLabel("New (${unread.size})")
                            }
                            items(unread, key = { it.stableId }) { notif ->
                                NotificationRow(
                                    notification = notif,
                                    isUnread = true,
                                    onClick = {
                                        viewModel.markRead(notif.stableId)
                                        notif.postId?.let { onOpenPost(it) }
                                    },
                                )
                            }
                        }

                        if (read.isNotEmpty()) {
                            item {
                                SectionLabel("Earlier")
                            }
                            items(read, key = { it.stableId }) { notif ->
                                NotificationRow(
                                    notification = notif,
                                    isUnread = false,
                                    onClick = { notif.postId?.let { onOpenPost(it) } },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@Composable
private fun NotificationRow(
    notification: Notification,
    isUnread: Boolean,
    onClick: () -> Unit,
) {
    val style = notifStyle(notification.type)
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(0.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isUnread) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else MaterialTheme.colorScheme.surface,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
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
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
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
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                notification.createdAt?.let { ts ->
                    Text(
                        text = formatRelativeTime(ts),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    )
                }
            }
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
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

