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
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.VolunteerActivism
import androidx.compose.material3.Card
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.offset
import androidx.compose.material3.IconButton
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
    onOpenScanner: () -> Unit = {},
) {
    var searchQuery by remember { mutableStateOf("") }
    var isDarkMode by remember { mutableStateOf(false) }
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
            title = "Scanner",
            subtitle = "Scan QR codes and product barcodes",
            icon = Icons.Outlined.QrCodeScanner,
            tint = Color(0xFF00BCD4),
            onClick = onOpenScanner,
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
            // Search in menu
            item {
                OutlinedTextField(
                    value = searchQuery, onValueChange = { searchQuery = it },
                    placeholder = { Text("Search menu items…") },
                    leadingIcon = { Icon(Icons.Outlined.Search, null) },
                    trailingIcon = { if (searchQuery.isNotEmpty()) IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Filled.Close, null) } },
                    singleLine = true, shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF2563EB), unfocusedBorderColor = Color(0xFFE5E7EB)),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)
                )
            }
            // Theme toggle
            item {
                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = if (isDarkMode) Color(0xFF1E293B) else MaterialTheme.colorScheme.primaryContainer.copy(0.3f)), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(if (isDarkMode) Icons.Outlined.DarkMode else Icons.Outlined.LightMode, null, tint = if (isDarkMode) Color(0xFFF59E0B) else Color(0xFF2563EB))
                            Spacer(Modifier.width(8.dp))
                            Text(if (isDarkMode) "Dark Mode" else "Light Mode", fontWeight = FontWeight.SemiBold, color = if (isDarkMode) Color.White else Color(0xFF1E293B))
                        }
                        Switch(checked = isDarkMode, onCheckedChange = { isDarkMode = it })
                    }
                }
            }
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
            // Admin panel (conditional)
            // Uncomment when user has admin role:
            // item {
            //     Card(onClick = {}, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)), modifier = Modifier.fillMaxWidth()) {
            //         Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            //             Icon(Icons.Outlined.AdminPanelSettings, null, tint = Color(0xFFDC2626))
            //             Spacer(Modifier.width(12.dp))
            //             Text("Admin Panel", fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
            //         }
            //     }
            // }
            val filteredEntries = if (searchQuery.isBlank()) entries else entries.filter { it.title.contains(searchQuery, ignoreCase = true) || it.subtitle.contains(searchQuery, ignoreCase = true) }
            items(filteredEntries, key = { it.title }) { entry ->
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
                            // Badge counts
                            if (entry.title == "Notifications") {
                                Box(Modifier.align(Alignment.TopEnd).offset(x = 6.dp, y = (-6).dp).size(16.dp).clip(CircleShape).background(Color(0xFFEF4444)), contentAlignment = Alignment.Center) {
                                    Text("3", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            if (entry.title == "Wishlist") {
                                Box(Modifier.align(Alignment.TopEnd).offset(x = 6.dp, y = (-6).dp).size(16.dp).clip(CircleShape).background(Color(0xFF7C3AED)), contentAlignment = Alignment.Center) {
                                    Text("12", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                }
                            }
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
