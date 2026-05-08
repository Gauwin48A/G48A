package com.mhub.app.ui.more

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.VerifiedUser
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private data class MoreEntry(
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val tint: Color = Color(0xFF2563EB),
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
    onOpenForYou: () -> Unit,
    onOpenRewards: () -> Unit,
    onOpenOffers: () -> Unit = {},
    onOpenNearby: () -> Unit = {},
    onOpenDashboard: () -> Unit = {},
) {
    val entries = listOf(
        MoreEntry(
            title = "For You",
            subtitle = "Personalized picks based on your activity",
            icon = Icons.Outlined.Star,
            tint = Color(0xFFF59E0B),
            onClick = onOpenForYou,
        ),
        MoreEntry(
            title = "Rewards",
            subtitle = "Points, milestones and referral bonuses",
            icon = Icons.Outlined.EmojiEvents,
            tint = Color(0xFFD97706),
            onClick = onOpenRewards,
        ),
        MoreEntry(
            title = "Offers",
            subtitle = "Manage price negotiations and bids",
            icon = Icons.Outlined.LocalOffer,
            tint = Color(0xFF7C3AED),
            onClick = onOpenOffers,
        ),
        MoreEntry(
            title = "Nearby",
            subtitle = "Listings close to your location",
            icon = Icons.Outlined.LocationOn,
            tint = Color(0xFF10B981),
            onClick = onOpenNearby,
        ),
        MoreEntry(
            title = "Dashboard",
            subtitle = "Account metrics and quick actions",
            icon = Icons.Outlined.Dashboard,
            tint = Color(0xFF3B82F6),
            onClick = onOpenDashboard,
        ),
        MoreEntry(
            title = "Notifications",
            subtitle = "Offers, alerts and order updates",
            icon = Icons.Outlined.Notifications,
            tint = Color(0xFFEF4444),
            onClick = onOpenNotifications,
        ),
        MoreEntry(
            title = "Wishlist",
            subtitle = "Saved products and quick reopen",
            icon = Icons.Outlined.VolunteerActivism,
            tint = Color(0xFFEC4899),
            onClick = onOpenWishlist,
        ),
        MoreEntry(
            title = "Search",
            subtitle = "Global listing and service search",
            icon = Icons.Outlined.Search,
            tint = Color(0xFF8B5CF6),
            onClick = onOpenSearch,
        ),
        MoreEntry(
            title = "Categories",
            subtitle = "Open category hub and subcategories",
            icon = Icons.Outlined.Category,
            tint = Color(0xFF0EA5E9),
            onClick = onOpenCategories,
        ),
        MoreEntry(
            title = "Sell",
            subtitle = "Create or manage a listing",
            icon = Icons.Outlined.ShoppingCart,
            tint = Color(0xFF22C55E),
            onClick = onOpenCreatePost,
        ),
        MoreEntry(
            title = "Chat",
            subtitle = "Conversations with buyers and sellers",
            icon = Icons.AutoMirrored.Outlined.Chat,
            tint = Color(0xFF2563EB),
            onClick = onOpenChat,
        ),
        MoreEntry(
            title = "Verification",
            subtitle = "KYC status and seller trust actions",
            icon = Icons.Outlined.VerifiedUser,
            tint = Color(0xFF059669),
            onClick = onOpenKyc,
        ),
        MoreEntry(
            title = "Security & Settings",
            subtitle = "App security, account and API settings",
            icon = Icons.Outlined.Security,
            tint = Color(0xFF64748B),
            onClick = onOpenSettings,
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
            // Quick access header
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Quick Access", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text("All your tools in one place", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
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
                            .padding(horizontal = 12.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Box(
                            modifier = Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(entry.tint.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = entry.icon,
                                contentDescription = null,
                                tint = entry.tint,
                                modifier = Modifier.size(22.dp),
                            )
                        }
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
