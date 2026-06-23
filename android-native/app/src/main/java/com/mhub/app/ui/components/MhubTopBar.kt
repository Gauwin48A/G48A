package com.mhub.app.ui.components

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
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.mhub.app.R
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.NotificationsRepository
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
    onLanguage: () -> Unit = {},
    onLocation: () -> Unit = {},
    onToggleTheme: () -> Unit = {},
    onNotifications: () -> Unit = {},
    onCart: () -> Unit = {},
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

            // Actions row
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Notifications with badge
                BadgedBox(badge = { if (unreadNotifCount > 0) Badge(containerColor = Color(0xFFEF4444)) { Text(if (unreadNotifCount > 99) "99+" else "$unreadNotifCount", color = Color.White, fontSize = 9.sp) } }) {
                    IconButton(onClick = onNotifications) {
                        Icon(
                            Icons.Default.Notifications,
                            contentDescription = "Notifications",
                            tint = Color.White.copy(alpha = 0.92f),
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }

                // Cart with badge
                BadgedBox(badge = { if (cartItemCount > 0) Badge(containerColor = Color(0xFF10B981)) { Text(if (cartItemCount > 99) "99+" else "$cartItemCount", color = Color.White, fontSize = 9.sp) } }) {
                    IconButton(onClick = onCart) {
                        Icon(
                            Icons.Default.ShoppingCart,
                            contentDescription = "Cart",
                            tint = Color.White.copy(alpha = 0.92f),
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }

                // Wishlist (bookmark icon)
                IconButton(onClick = onWishlist) {
                    Icon(
                        Icons.Outlined.BookmarkBorder,
                        contentDescription = stringResource(R.string.topbar_wishlist),
                        tint = Color.White.copy(alpha = 0.92f),
                        modifier = Modifier.size(22.dp),
                    )
                }

                // Recently Viewed (matches web's clock icon)
                IconButton(onClick = onRecentlyViewed) {
                    Icon(
                        Icons.Default.History,
                        contentDescription = "Recently Viewed",
                        tint = Color.White.copy(alpha = 0.92f),
                        modifier = Modifier.size(22.dp),
                    )
                }

                // Language selector
                IconButton(onClick = onLanguage) {
                    Icon(
                        Icons.Default.Language,
                        contentDescription = "Language",
                        tint = Color.White.copy(alpha = 0.92f),
                        modifier = Modifier.size(22.dp),
                    )
                }

                // Location filter
                IconButton(onClick = onLocation) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = "Location",
                        tint = Color.White.copy(alpha = 0.92f),
                        modifier = Modifier.size(22.dp),
                    )
                }

                // Dark/Light theme toggle
                IconButton(onClick = onToggleTheme) {
                    Icon(
                        Icons.Outlined.DarkMode,
                        contentDescription = "Theme",
                        tint = Color.White.copy(alpha = 0.92f),
                        modifier = Modifier.size(22.dp),
                    )
                }
            }
        }
    }
}
