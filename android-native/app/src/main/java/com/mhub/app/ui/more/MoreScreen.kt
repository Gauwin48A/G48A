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
import androidx.compose.material.icons.automirrored.outlined.Article
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
import androidx.compose.material.icons.outlined.Apps
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Report
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

private data class MoreSection(
    val header: String,
    val entries: List<MoreEntry>,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreScreen(
    // Existing (keep as required where was required, optional for new)
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
    // Trade & Shopping
    onOpenCart: () -> Unit = {},
    onOpenTierSelection: () -> Unit = {},
    onOpenCentre: () -> Unit = {},
    onOpenCategoryMode: () -> Unit = {},
    onOpenSavedSearches: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    onOpenCompare: () -> Unit = {},
    // Community
    onOpenFeed: () -> Unit = {},
    onOpenMyFeed: () -> Unit = {},
    onOpenChannels: () -> Unit = {},
    onOpenPublicWall: () -> Unit = {},
    onOpenMyReviews: () -> Unit = {},
    onOpenFeedback: () -> Unit = {},
    onOpenComplaints: () -> Unit = {},
    onOpenActivityHub: () -> Unit = {},
    // My Account
    onOpenProfile: () -> Unit = {},
    onOpenMyPosts: () -> Unit = {},
    onOpenBoughtPosts: () -> Unit = {},
    onOpenSoldPosts: () -> Unit = {},
    onOpenVerification: () -> Unit = {},
    onOpenAnalytics: () -> Unit = {},
    onOpenAccountDelete: () -> Unit = {},
    onOpenAdminPanel: () -> Unit = {},
    // Help & Support
    onOpenAboutUs: () -> Unit = {},
    onOpenContactUs: () -> Unit = {},
    onOpenFaq: () -> Unit = {},
    isAdmin: Boolean = false,
) {
    var searchQuery by remember { mutableStateOf("") }
    var isDarkMode by remember { mutableStateOf(false) }
    val sections = listOf(
        MoreSection("Trade & Shopping", listOf(
            MoreEntry("Sell", "Create or manage a listing", Icons.Outlined.ShoppingCart, Color(0xFF22C55E), onOpenCreatePost),
            MoreEntry("Plans & Tiers", "Upgrade your seller plan", Icons.Outlined.Star, Color(0xFFF59E0B), onOpenTierSelection),
            MoreEntry("Cart", "View items in your cart", Icons.Outlined.ShoppingCart, Color(0xFF3B82F6), onOpenCart),
            MoreEntry("Wishlist", "Saved products and quick reopen", Icons.Outlined.VolunteerActivism, Color(0xFFEC4899), onOpenWishlist),
            MoreEntry("Offers", "Manage price negotiations and bids", Icons.Outlined.LocalOffer, Color(0xFF7C3AED), onOpenOffers),
            MoreEntry("Recently Viewed", "Listings you browsed recently", Icons.Outlined.History, Color(0xFF6B7280), onOpenRecentlyViewed),
            MoreEntry("Saved Searches", "Your stored search filters", Icons.Outlined.Search, Color(0xFF8B5CF6), onOpenSavedSearches),
            MoreEntry("Compare", "Side-by-side listing comparison", Icons.Outlined.BarChart, Color(0xFF0EA5E9), onOpenCompare),
            MoreEntry("Centre", "Centre listings and services", Icons.Outlined.Category, Color(0xFF0284C7), onOpenCentre),
        )),
        MoreSection("Explore", listOf(
            MoreEntry("For You", "Personalized picks based on your activity", Icons.Outlined.Star, Color(0xFFF59E0B), onOpenForYou),
            MoreEntry("Nearby", "Listings close to your location", Icons.Outlined.LocationOn, Color(0xFF10B981), onOpenNearby),
            MoreEntry("Categories", "Open category hub and subcategories", Icons.Outlined.Category, Color(0xFF0EA5E9), onOpenCategories),
            MoreEntry("Category Mode", "Browse by category layout", Icons.Outlined.Apps, Color(0xFF6366F1), onOpenCategoryMode),
            MoreEntry("Scanner", "Scan QR codes and product barcodes", Icons.Outlined.QrCodeScanner, Color(0xFF00BCD4), onOpenScanner),
            MoreEntry("Search", "Global listing and service search", Icons.Outlined.Search, Color(0xFF8B5CF6), onOpenSearch),
        )),
        MoreSection("Community", listOf(
            MoreEntry("Feed", "Community posts and updates", Icons.AutoMirrored.Outlined.Article, Color(0xFF3B82F6), onOpenFeed),
            MoreEntry("My Feed", "Posts from people you follow", Icons.AutoMirrored.Outlined.Article, Color(0xFF6366F1), onOpenMyFeed),
            MoreEntry("Chat", "Conversations with buyers and sellers", Icons.AutoMirrored.Outlined.Chat, Color(0xFF2563EB), onOpenChat),
            MoreEntry("Channels", "Subscribe to seller channels", Icons.Outlined.Group, Color(0xFF7C3AED), onOpenChannels),
            MoreEntry("Public Wall", "Public community activity wall", Icons.Outlined.Group, Color(0xFF059669), onOpenPublicWall),
            MoreEntry("My Reviews", "Reviews you've given and received", Icons.Outlined.Star, Color(0xFFF59E0B), onOpenMyReviews),
            MoreEntry("Activity Hub", "Your notifications and activity log", Icons.Outlined.Dashboard, Color(0xFF3B82F6), onOpenActivityHub),
            MoreEntry("Feedback", "Send us product feedback", Icons.AutoMirrored.Outlined.HelpOutline, Color(0xFF22C55E), onOpenFeedback),
            MoreEntry("Complaints", "Report issues or violations", Icons.Outlined.Report, Color(0xFFEF4444), onOpenComplaints),
        )),
        MoreSection("My Account", listOf(
            MoreEntry("Profile", "View and edit your profile", Icons.Outlined.Person, Color(0xFF2563EB), onOpenProfile),
            MoreEntry("My Posts", "All your active listings", Icons.AutoMirrored.Outlined.Article, Color(0xFF22C55E), onOpenMyPosts),
            MoreEntry("Dashboard", "Account metrics and quick actions", Icons.Outlined.Dashboard, Color(0xFF3B82F6), onOpenDashboard),
            MoreEntry("Bought Posts", "Items you have purchased", Icons.Outlined.ShoppingCart, Color(0xFF7C3AED), onOpenBoughtPosts),
            MoreEntry("Sold Posts", "Items you have sold", Icons.Outlined.MonetizationOn, Color(0xFF059669), onOpenSoldPosts),
            MoreEntry("Rewards", "Points, milestones and referral bonuses", Icons.Outlined.EmojiEvents, Color(0xFFD97706), onOpenRewards),
            MoreEntry("Notifications", "Offers, alerts and order updates", Icons.Outlined.Notifications, Color(0xFFEF4444), onOpenNotifications),
            MoreEntry("Analytics", "Your sales and listing analytics", Icons.Outlined.BarChart, Color(0xFF3B82F6), onOpenAnalytics),
            MoreEntry("Verification", "KYC status and seller trust actions", Icons.Outlined.VerifiedUser, Color(0xFF059669), onOpenVerification),
            MoreEntry("KYC", "Complete identity verification", Icons.Outlined.Security, Color(0xFF059669), onOpenKyc),
            MoreEntry("Security & Settings", "App security, account and API settings", Icons.Outlined.Settings, Color(0xFF64748B), onOpenSettings),
        )),
        MoreSection("Help & Support", buildList {
            add(MoreEntry("About Us", "Learn about MHub platform", Icons.Outlined.Info, Color(0xFF2563EB), onOpenAboutUs))
            add(MoreEntry("Contact Us", "Reach our support team", Icons.Outlined.Email, Color(0xFF22C55E), onOpenContactUs))
            add(MoreEntry("FAQ", "Frequently asked questions", Icons.AutoMirrored.Outlined.HelpOutline, Color(0xFF6366F1), onOpenFaq))
            if (isAdmin) add(MoreEntry("Admin Panel", "Platform administration tools", Icons.Outlined.Security, Color(0xFFDC2626), onOpenAdminPanel))
            add(MoreEntry("Delete Account", "Permanently remove your account", Icons.Outlined.Delete, Color(0xFFEF4444), onOpenAccountDelete))
        }),
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
            val filteredSections = if (searchQuery.isBlank()) sections
            else sections.mapNotNull { section ->
                val filtered = section.entries.filter {
                    it.title.contains(searchQuery, ignoreCase = true) ||
                        it.subtitle.contains(searchQuery, ignoreCase = true)
                }
                if (filtered.isEmpty()) null else section.copy(entries = filtered)
            }
            filteredSections.forEach { section ->
                item(key = "hdr_${section.header}") {
                    Text(
                        section.header.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF2563EB),
                        modifier = Modifier.padding(top = 12.dp, bottom = 4.dp, start = 2.dp),
                    )
                }
                items(section.entries, key = { "${section.header}_${it.title}" }) { entry ->
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
