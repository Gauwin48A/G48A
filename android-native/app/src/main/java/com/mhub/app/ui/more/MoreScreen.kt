package com.mhub.app.ui.more

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.outlined.ViewList
import androidx.compose.material.icons.outlined.VolunteerActivism
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

private data class MoreEntry(
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreScreen(
    onOpenNotifications: () -> Unit,
    onOpenWishlist: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenCategories: () -> Unit,
    onOpenCreatePost: () -> Unit,
    onOpenChat: () -> Unit,
    onOpenKyc: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenParityHub: () -> Unit,
) {
    val entries = listOf(
        MoreEntry(
            title = "Notifications",
            subtitle = "Offers, alerts and order updates",
            icon = Icons.Outlined.Notifications,
            onClick = onOpenNotifications,
        ),
        MoreEntry(
            title = "Wishlist",
            subtitle = "Saved products and quick reopen",
            icon = Icons.Outlined.VolunteerActivism,
            onClick = onOpenWishlist,
        ),
        MoreEntry(
            title = "Search",
            subtitle = "Global listing and service search",
            icon = Icons.Outlined.Search,
            onClick = onOpenSearch,
        ),
        MoreEntry(
            title = "Categories",
            subtitle = "Open category hub and subcategories",
            icon = Icons.Outlined.Category,
            onClick = onOpenCategories,
        ),
        MoreEntry(
            title = "Sell",
            subtitle = "Create or manage a listing",
            icon = Icons.Outlined.ShoppingCart,
            onClick = onOpenCreatePost,
        ),
        MoreEntry(
            title = "Chat",
            subtitle = "Conversations with buyers and sellers",
            icon = Icons.AutoMirrored.Outlined.Chat,
            onClick = onOpenChat,
        ),
        MoreEntry(
            title = "Verification",
            subtitle = "KYC status and seller trust actions",
            icon = Icons.Outlined.VerifiedUser,
            onClick = onOpenKyc,
        ),
        MoreEntry(
            title = "Security & Settings",
            subtitle = "App security, account and API settings",
            icon = Icons.Outlined.Security,
            onClick = onOpenSettings,
        ),
        MoreEntry(
            title = "Web Parity Hub",
            subtitle = "Reference every localhost route mapping",
            icon = Icons.Outlined.ViewList,
            onClick = onOpenParityHub,
        ),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("More", fontWeight = FontWeight.Bold)
                        Text(
                            "Secondary routes and account tools",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(entries, key = { it.title }) { entry ->
                Card(
                    onClick = entry.onClick,
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Icon(
                            imageVector = entry.icon,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(entry.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            Text(
                                entry.subtitle,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            item {
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Icon(Icons.AutoMirrored.Outlined.HelpOutline, contentDescription = null)
                        Text(
                            "This menu mirrors web routes while keeping Android spacing, touch targets, and typography readable on smaller screens.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}
