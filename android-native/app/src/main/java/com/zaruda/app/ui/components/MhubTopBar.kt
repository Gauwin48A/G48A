package com.zaruda.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BookmarkAdd
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.LightMode
import com.zaruda.app.data.local.ThemeMode
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.zaruda.app.R
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.NotificationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/* ── ViewModel ──────────────────────────────────────────────────────────── */

@HiltViewModel
class TopBarViewModel @Inject constructor(
    private val notificationsRepo: NotificationsRepository,
) : ViewModel() {
    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            when (val r = notificationsRepo.list(page = 1)) {
                is ApiResult.Success -> _unreadCount.value = r.data.count { !it.isRead }
                is ApiResult.Failure -> {}
            }
        }
    }
}

/* ── MhubTopBar ─────────────────────────────────────────────────────────── */

@Composable
fun MhubTopBar(
    onSearch: () -> Unit,
    onWishlist: () -> Unit = {},
    onRecentlyViewed: () -> Unit = {},
    currentThemeMode: ThemeMode = ThemeMode.SYSTEM,
    onToggleTheme: () -> Unit = {},
    onNotifications: () -> Unit = {},
    onCart: () -> Unit = {},
    onProfile: () -> Unit = {},
    onFilter: () -> Unit = {},
    activeFilterCount: Int = 0,
    unreadNotifCount: Int = 0,
    cartItemCount: Int = 0,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.horizontalGradient(
                    listOf(Color(0xFF1A3A8F), Color(0xFF2F66EA), Color(0xFF4338CA)),
                ),
            )
            .windowInsetsPadding(WindowInsets.statusBars)
            .height(56.dp),
    ) {
        // Subtle frosted overlay
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .background(Color.Black.copy(alpha = 0.08f)),
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Logo chip
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.15f))
                    .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 6.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = stringResource(R.string.topbar_logo),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    letterSpacing = 0.3.sp,
                )
            }

            // Actions row — compact: only essential icons visible, rest in overflow
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Profile (person icon — moved from bottom nav to top bar)
                IconButton(onClick = onProfile, modifier = Modifier.size(36.dp)) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = "Profile",
                        tint = Color.White.copy(alpha = 0.92f),
                        modifier = Modifier.size(20.dp),
                    )
                }

                // Notifications with badge (high-value: badge shows unread count)
                BadgedBox(badge = { if (unreadNotifCount > 0) Badge(containerColor = Color(0xFFEF4444)) { Text(if (unreadNotifCount > 99) "99+" else "$unreadNotifCount", color = Color.White, fontSize = 9.sp) } }) {
                    IconButton(onClick = onNotifications, modifier = Modifier.size(36.dp)) {
                        Icon(
                            Icons.Default.Notifications,
                            contentDescription = "Notifications",
                            tint = Color.White.copy(alpha = 0.92f),
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }

                // Cart with badge (high-value: shows item count)
                BadgedBox(badge = { if (cartItemCount > 0) Badge(containerColor = Color(0xFF10B981)) { Text(if (cartItemCount > 99) "99+" else "$cartItemCount", color = Color.White, fontSize = 9.sp) } }) {
                    IconButton(onClick = onCart, modifier = Modifier.size(36.dp)) {
                        Icon(
                            Icons.Default.ShoppingCart,
                            contentDescription = "Cart",
                            tint = Color.White.copy(alpha = 0.92f),
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }

                // Overflow menu: Wishlist, Dark Mode, Recently Viewed
                var showOverflow by remember { mutableStateOf(false) }
                Box {
                    IconButton(onClick = { showOverflow = true }, modifier = Modifier.size(36.dp)) {
                        Icon(
                            Icons.Default.MoreVert,
                            contentDescription = "More options",
                            tint = Color.White.copy(alpha = 0.92f),
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    DropdownMenu(
                        expanded = showOverflow,
                        onDismissRequest = { showOverflow = false },
                    ) {
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.topbar_wishlist)) },
                            leadingIcon = { Icon(Icons.Default.BookmarkAdd, null, modifier = Modifier.size(18.dp)) },
                            onClick = { showOverflow = false; onWishlist() },
                        )
                        DropdownMenuItem(
                            text = { Text(if (currentThemeMode == ThemeMode.DARK) "Light Mode" else "Dark Mode") },
                            leadingIcon = {
                                Icon(
                                    if (currentThemeMode == ThemeMode.DARK) Icons.Outlined.LightMode else Icons.Outlined.DarkMode,
                                    null,
                                    modifier = Modifier.size(18.dp),
                                )
                            },
                            onClick = { showOverflow = false; onToggleTheme() },
                        )
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.more_recently_viewed)) },
                            leadingIcon = { Icon(Icons.Default.History, null, modifier = Modifier.size(18.dp)) },
                            onClick = { showOverflow = false; onRecentlyViewed() },
                        )
                    }
                }
            }
        }
    }
}
