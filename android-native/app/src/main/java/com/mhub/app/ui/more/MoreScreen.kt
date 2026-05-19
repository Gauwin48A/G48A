package com.mhub.app.ui.more

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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.offset
import androidx.compose.material3.HorizontalDivider
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Apps
import androidx.compose.material.icons.outlined.Accessibility
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.automirrored.outlined.Login
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Report
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
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.Switch
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mhub.app.R
import com.mhub.app.data.local.ThemeMode

private data class QuickTile(
    val title: String,
    val icon: ImageVector,
    val iconBg: Color,
    val iconTint: Color,
    val badge: String? = null,
    val onClick: () -> Unit,
)

private data class MenuRow(
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val iconBg: Color,
    val iconTint: Color,
    val badge: String? = null,
    val onClick: () -> Unit,
)

@OptIn(ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun MoreScreen(
    onDismiss: () -> Unit = {},
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
    onOpenCart: () -> Unit = {},
    onOpenTierSelection: () -> Unit = {},
    onOpenCentre: () -> Unit = {},
    onOpenCategoryMode: () -> Unit = {},
    onOpenSavedSearches: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    onOpenCompare: () -> Unit = {},
    onOpenFeed: () -> Unit = {},
    onOpenPublicWall: () -> Unit = {},
    onOpenMyReviews: () -> Unit = {},
    onOpenFeedback: () -> Unit = {},
    onOpenComplaints: () -> Unit = {},
    onOpenProfile: () -> Unit = {},
    onOpenVerification: () -> Unit = {},
    onOpenAccountDelete: () -> Unit = {},
    onOpenAdminPanel: () -> Unit = {},
    onOpenSubcategories: () -> Unit = {},
    onOpenLogin: () -> Unit = {},
    onLogout: () -> Unit = {},
    onLanguageChange: (String) -> Unit = {},
    isAdmin: Boolean = false,
    isLoggedIn: Boolean = true,
    currentThemeMode: ThemeMode = ThemeMode.SYSTEM,
    onSetThemeMode: (ThemeMode) -> Unit = {},
) {
    var prefsExpanded by rememberSaveable { mutableStateOf(false) }

    // â”€â”€ Quick tiles: 4-per-row icon grid (most-used features) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    val quickTiles = listOf(
        QuickTile("Sell", Icons.Outlined.ShoppingCart, Color(0xFFDCFCE7), Color(0xFF16A34A), onClick = onOpenCreatePost),
        QuickTile("Cart", Icons.Outlined.ShoppingCart, Color(0xFFDBEAFE), Color(0xFF1D4ED8), badge = "2", onClick = onOpenCart),
        QuickTile("Wishlist", Icons.Outlined.VolunteerActivism, Color(0xFFFCE7F3), Color(0xFFBE185D), onClick = onOpenWishlist),
        QuickTile("Notifications", Icons.Outlined.Notifications, Color(0xFFFEF3C7), Color(0xFFD97706), badge = "3", onClick = onOpenNotifications),
        QuickTile("Nearby", Icons.Outlined.LocationOn, Color(0xFFECFDF5), Color(0xFF059669), onClick = onOpenNearby),
        QuickTile("Chat", Icons.AutoMirrored.Outlined.Chat, Color(0xFFEDE9FE), Color(0xFF7C3AED), onClick = onOpenChat),
        QuickTile("Compare", Icons.Outlined.BarChart, Color(0xFFE0F2FE), Color(0xFF0369A1), onClick = onOpenCompare),
        QuickTile("Plans", Icons.Outlined.Star, Color(0xFFFFF7ED), Color(0xFFEA580C), onClick = onOpenTierSelection),
    )

    // â”€â”€ My Activity section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    val activityRows = listOf(
        MenuRow("Mark Sale Done", "Confirm a completed transaction", Icons.Outlined.VerifiedUser, Color(0xFFDCFCE7), Color(0xFF16A34A), onClick = {
            onOpenProfile() // navigates to sold posts where Mark Sale Done is accessible
        }),
        MenuRow("My Offers", "Offers you've received", Icons.Outlined.LocalOffer, Color(0xFFEDE9FE), Color(0xFF7C3AED), onClick = onOpenOffers),
        MenuRow("Sold Posts", "Items you've sold", Icons.Outlined.Dashboard, Color(0xFFDBEAFE), Color(0xFF1D4ED8), onClick = onOpenDashboard),
        MenuRow("Recently Viewed", "Your browsing history", Icons.Outlined.History, Color(0xFFF1F5F9), Color(0xFF64748B), onClick = onOpenRecentlyViewed),
        MenuRow("Saved Searches", "Your saved search filters", Icons.Outlined.Search, Color(0xFFEDE9FE), Color(0xFF8B5CF6), onClick = onOpenSavedSearches),
    )

    // â”€â”€ Discover section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    val discoverRows = listOf(
        MenuRow("All Categories", "Browse all product categories", Icons.Outlined.Category, Color(0xFFE0F2FE), Color(0xFF0369A1), onClick = onOpenCategories),
        MenuRow("Category Mode", "Switch to category-focused view", Icons.Outlined.Apps, Color(0xFFEDE9FE), Color(0xFF6366F1), onClick = onOpenCategoryMode),
        MenuRow("Subcategories", "Explore subcategories", Icons.Outlined.Category, Color(0xFFE0F2FE), Color(0xFF0284C7), onClick = onOpenSubcategories),
        MenuRow("Business Centre", "Manage your business centre", Icons.Outlined.Dashboard, Color(0xFFFFF7ED), Color(0xFFEA580C), onClick = onOpenCentre),
        MenuRow("Public Wall", "See community posts", Icons.Outlined.Group, Color(0xFFECFDF5), Color(0xFF059669), onClick = onOpenPublicWall),
    )

    // â”€â”€ Account & Support section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    val accountRows = listOf(
        MenuRow("Verification", "Verify your identity (Aadhaar/PAN)", Icons.Outlined.VerifiedUser, Color(0xFFECFDF5), Color(0xFF059669), onClick = onOpenVerification),
        MenuRow("Dashboard & Analytics", "View your seller analytics", Icons.Outlined.BarChart, Color(0xFFDBEAFE), Color(0xFF1D4ED8), onClick = onOpenDashboard),
        MenuRow("My Reviews", "Reviews from buyers/sellers", Icons.Outlined.Star, Color(0xFFFEF3C7), Color(0xFFD97706), onClick = onOpenMyReviews),
        MenuRow("Feedback", "Share your feedback", Icons.AutoMirrored.Outlined.HelpOutline, Color(0xFFECFDF5), Color(0xFF22C55E), onClick = onOpenFeedback),
        MenuRow("Complaints", "Report an issue", Icons.Outlined.Report, Color(0xFFFEF2F2), Color(0xFFDC2626), onClick = onOpenComplaints),
        MenuRow("Security", "Password & account security", Icons.Outlined.Security, Color(0xFFF1F5F9), Color(0xFF64748B), onClick = onOpenSettings),
        MenuRow("Delete Account", "Permanently delete your account", Icons.Outlined.Delete, Color(0xFFFEF2F2), Color(0xFFEF4444), onClick = onOpenAccountDelete),
        if (isAdmin) MenuRow("Admin Panel", "Manage the platform", Icons.Outlined.Settings, Color(0xFFFEF2F2), Color(0xFFDC2626), onClick = onOpenAdminPanel) else null,
    ).filterNotNull()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("More", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold, color = Color(0xFF0F172A))
                    Text("All features in one place", style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B))
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color(0xFF64748B))
                }
            }
        }

        // â”€â”€ Quick Access Grid (4 per row) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        item {
            Text("Quick Access", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF64748B), letterSpacing = 0.5.sp, modifier = Modifier.padding(bottom = 8.dp))
            val rows = quickTiles.chunked(4)
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                rows.forEach { rowTiles ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        rowTiles.forEach { tile ->
                            Column(
                                modifier = Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(Color.White).clickable(onClick = tile.onClick).padding(vertical = 12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Box {
                                    Box(
                                        modifier = Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(tile.iconBg),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(tile.icon, null, tint = tile.iconTint, modifier = Modifier.size(22.dp))
                                    }
                                    if (tile.badge != null) {
                                        Box(
                                            modifier = Modifier.align(Alignment.TopEnd).offset(x = 4.dp, y = (-4).dp).size(16.dp).clip(CircleShape).background(Color(0xFFEF4444)),
                                            contentAlignment = Alignment.Center,
                                        ) { Text(tile.badge, color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold) }
                                    }
                                }
                                Text(tile.title, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B), maxLines = 1)
                            }
                        }
                        // fill empty slots
                        repeat(4 - rowTiles.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }
        }

        // â”€â”€ My Activity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        item {
            MoreSectionHeader("My Activity", Color(0xFF2563EB))
            Spacer(Modifier.height(6.dp))
            MoreRowList(activityRows)
        }

        // â”€â”€ Discover â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        item {
            MoreSectionHeader("Discover", Color(0xFF059669))
            Spacer(Modifier.height(6.dp))
            MoreRowList(discoverRows)
        }

        // â”€â”€ Account & Support â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        item {
            MoreSectionHeader("Account & Support", Color(0xFFF59E0B))
            Spacer(Modifier.height(6.dp))
            MoreRowList(accountRows)
        }

        // â”€â”€ Appearance & Language â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        item {
            androidx.compose.material3.Card(
                shape = RoundedCornerShape(16.dp),
                colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.fillMaxWidth().clickable { prefsExpanded = !prefsExpanded },
            ) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Outlined.DarkMode, null, tint = Color(0xFF64748B), modifier = Modifier.size(20.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Text("Appearance & Language", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))
                        Icon(if (prefsExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, tint = Color(0xFF64748B), modifier = Modifier.size(20.dp))
                    }
                    if (prefsExpanded) {
                        Spacer(Modifier.height(12.dp))
                        HorizontalDivider(color = Color(0xFFF1F5F9))
                        Spacer(Modifier.height(12.dp))
                        Text("Theme", fontWeight = FontWeight.Medium, fontSize = 12.sp, color = Color(0xFF64748B))
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("Light" to ThemeMode.LIGHT, "System" to ThemeMode.SYSTEM, "Dark" to ThemeMode.DARK).forEach { (label, mode) ->
                                FilterChip(
                                    selected = currentThemeMode == mode,
                                    onClick = { onSetThemeMode(mode) },
                                    label = { Text(label, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        Text("Language", fontWeight = FontWeight.Medium, fontSize = 12.sp, color = Color(0xFF64748B))
                        Spacer(Modifier.height(6.dp))
                        val currentLocale = androidx.appcompat.app.AppCompatDelegate.getApplicationLocales().toLanguageTags().ifEmpty { "en" }
                        var selectedLang by remember { mutableStateOf(currentLocale.split(",").first().split("-").first()) }
                        val langs = listOf("en" to "English", "hi" to "à¤¹à¤¿à¤¨à¥à¤¦à¥€", "te" to "à°¤à±†à°²à±à°—à±", "ta" to "à®¤à®®à®¿à®´à¯", "kn" to "à²•à²¨à³à²¨à²¡", "mr" to "à¤®à¤°à¤¾à¤ à¥€", "bn" to "à¦¬à¦¾à¦‚à¦²à¦¾", "gu" to "àª—à«àªœàª°àª¾àª¤à«€")
                        androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            langs.forEach { (code, label) ->
                                FilterChip(
                                    selected = selectedLang == code,
                                    onClick = { selectedLang = code; onLanguageChange(code) },
                                    label = { Text(label, fontSize = 11.sp) },
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White),
                                    shape = RoundedCornerShape(20.dp),
                                )
                            }
                        }
                    }
                }
            }
        }

        // â”€â”€ Login / Logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        item {
            if (!isLoggedIn) {
                Button(
                    onClick = onOpenLogin,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                ) {
                    Icon(Icons.AutoMirrored.Outlined.Login, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Log In to MHub", fontWeight = FontWeight.Bold, color = Color.White)
                }
            } else {
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                ) {
                    Icon(Icons.AutoMirrored.Outlined.Logout, null, tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Sign Out", fontWeight = FontWeight.SemiBold, color = Color(0xFFEF4444))
                }
            }
        }

        item { Spacer(Modifier.height(60.dp)) }
    }
}

@Composable
private fun MoreSectionHeader(title: String, accent: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.width(3.dp).height(16.dp).clip(RoundedCornerShape(2.dp)).background(accent))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B))
    }
}

@Composable
private fun MoreRowList(rows: List<MenuRow>) {
    androidx.compose.material3.Card(
        shape = RoundedCornerShape(16.dp),
        colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = Color.White),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column {
            rows.forEachIndexed { idx, row ->
                Row(
                    modifier = Modifier.fillMaxWidth().clickable(onClick = row.onClick).padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(Modifier.size(40.dp).clip(RoundedCornerShape(11.dp)).background(row.iconBg), contentAlignment = Alignment.Center) {
                        Icon(row.icon, null, tint = row.iconTint, modifier = Modifier.size(20.dp))
                    }
                    Column(Modifier.weight(1f)) {
                        Text(row.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                        Text(row.subtitle, fontSize = 12.sp, color = Color(0xFF64748B))
                    }
                    if (row.badge != null) {
                        Box(Modifier.size(20.dp).clip(CircleShape).background(Color(0xFFEF4444)), contentAlignment = Alignment.Center) {
                            Text(row.badge, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(18.dp))
                    }
                }
                if (idx < rows.size - 1) HorizontalDivider(modifier = Modifier.padding(start = 66.dp), color = Color(0xFFF8FAFC))
            }
        }
    }
}

