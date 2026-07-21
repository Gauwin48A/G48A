package com.zaruda.app.ui.more

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
import androidx.compose.foundation.layout.navigationBarsPadding
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
import androidx.compose.material.icons.outlined.AccountTree
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.Apps
import androidx.compose.material.icons.outlined.Accessibility
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Restore
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LocalOffer
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
import com.zaruda.app.R
import com.zaruda.app.data.local.ThemeMode

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
    onOpenWishlist: () -> Unit,
    onOpenCreatePost: () -> Unit,
    onOpenKyc: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenTierSelection: () -> Unit = {},
    onOpenMyHome: () -> Unit = {},
    onOpenSaleDone: () -> Unit = {},
    onOpenSaleUndone: () -> Unit = {},
    onOpenPublicWall: () -> Unit = {},
    onOpenFeedback: () -> Unit = {},
    onOpenComplaints: () -> Unit = {},
    onOpenProfile: () -> Unit = {},
    onOpenAdminPanel: () -> Unit = {},
    onOpenHelp: () -> Unit = {},
    onOpenLogin: () -> Unit = {},
    onOpenRewards: () -> Unit = {},
    onOpenMyFeed: () -> Unit = {},
    onLogout: () -> Unit = {},
    onLanguageChange: (String) -> Unit = {},
    isAdmin: Boolean = false,
    isLoggedIn: Boolean = true,
    currentThemeMode: ThemeMode = ThemeMode.SYSTEM,
    onSetThemeMode: (ThemeMode) -> Unit = {},
) {
    var prefsExpanded by rememberSaveable { mutableStateOf(false) }
    var accountExpanded by rememberSaveable { mutableStateOf(false) }

    // ── TRADE section: 4 items — Sell, Plans, Sale Done, Sale Undone
    val tradeRows = listOf(
        MenuRow("Sell", "List a new item for sale", Icons.Outlined.LocalOffer, Color(0xFFDBEAFE), Color(0xFF2563EB), onClick = onOpenCreatePost),
        MenuRow("Plans", "Buy Starter Plan (₹111) to unlock KYC", Icons.Outlined.Star, Color(0xFFFFF7ED), Color(0xFFEA580C), onClick = onOpenTierSelection),
        MenuRow("Sale Done", "Mark your listing as sold", Icons.Outlined.CheckCircle, Color(0xFFECFDF5), Color(0xFF059669), onClick = onOpenSaleDone),
        MenuRow("Sale Undone", "Undo or revert a completed sale", Icons.Outlined.Restore, Color(0xFFFFF7ED), Color(0xFFF59E0B), onClick = onOpenSaleUndone),
    )

    // ── SOCIAL section: 2 items — Feedback, Complaints
    val socialRows = listOf(
        MenuRow("Feedback", "Share your app experience", Icons.Outlined.VolunteerActivism, Color(0xFFE0F2FE), Color(0xFF0284C7), onClick = onOpenFeedback),
        MenuRow("Complaints", "Report an issue or dispute", Icons.Outlined.Report, Color(0xFFFEF2F2), Color(0xFFDC2626), onClick = onOpenComplaints),
    )

    // ── ACCOUNT section: rewards, profile, myfeed, myhome, wishlist, publicwall + more
    val accountRows = buildList {
        add(MenuRow("Rewards", "Earn rewards and bonuses", Icons.Outlined.EmojiEvents, Color(0xFFFFF7ED), Color(0xFFD97706), onClick = onOpenRewards))
        add(MenuRow("Profile", "View and edit your profile", Icons.Outlined.Person, Color(0xFFEFF6FF), Color(0xFF2563EB), onClick = onOpenProfile))
        add(MenuRow("My Feed", "Your own posts and discussions", Icons.AutoMirrored.Outlined.Article, Color(0xFFECFDF5), Color(0xFF059669), onClick = onOpenMyFeed))
        add(MenuRow("My Home", "Your own marketplace listings", Icons.Outlined.Home, Color(0xFFEFF6FF), Color(0xFF2563EB), onClick = onOpenMyHome))
        add(MenuRow("Wishlist", "Items you've saved", Icons.Outlined.BookmarkBorder, Color(0xFFF5F3FF), Color(0xFF7C3AED), onClick = onOpenWishlist))
        add(MenuRow("Public Wall", "Community public discussions", Icons.Outlined.Group, Color(0xFFEFF6FF), Color(0xFF3B82F6), onClick = onOpenPublicWall))
        add(MenuRow("Verification", "Complete Aadhaar & PAN KYC (requires plan)", Icons.Outlined.VerifiedUser, Color(0xFFECFDF5), Color(0xFF059669), onClick = onOpenKyc))
        if (isAdmin) {
            add(MenuRow("Admin Panel", "Platform administration tools", Icons.Outlined.AdminPanelSettings, Color(0xFFFFF7ED), Color(0xFFD97706), badge = "Admin", onClick = onOpenAdminPanel))
        }
    }
    // ── Utilities (settings + logout always at bottom) ────────────────────────
    val utilRows = buildList {
        add(MenuRow("Settings", "App preferences and language", Icons.Outlined.Settings, Color(0xFFF1F5F9), Color(0xFF475569), onClick = onOpenSettings))
        add(MenuRow("Help & Support", "FAQs, guides and customer support", Icons.AutoMirrored.Outlined.HelpOutline, Color(0xFFECFDF5), Color(0xFF22C55E), onClick = onOpenHelp))
        if (isLoggedIn) add(MenuRow("Logout", "Sign out of your account", Icons.AutoMirrored.Outlined.Logout, Color(0xFFFEF2F2), Color(0xFFDC2626), onClick = onLogout))
    }

    Column(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // ── Header ──────────────────────────────────────────────────────
            item(key = "header") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("More", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurface)
                        Text("All features in one place", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }

                }
            }

            item(key = "trade") {
                MoreSectionHeader("TRADE", Color(0xFF2563EB))
                Spacer(Modifier.height(6.dp))
                MoreRowList(tradeRows)
            }

            item(key = "div1") {
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
            }

            item(key = "social") {
                MoreSectionHeader("SOCIAL", Color(0xFF059669))
                Spacer(Modifier.height(6.dp))
                MoreRowList(socialRows)
            }

            item(key = "div2") {
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
            }

            item(key = "account") {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { accountExpanded = !accountExpanded },
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MoreSectionHeader("ACCOUNT", Color(0xFFF59E0B))
                    Icon(
                        if (accountExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = if (accountExpanded) "Collapse Account" else "Expand Account",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp),
                    )
                }
                if (accountExpanded) {
                    Spacer(Modifier.height(6.dp))
                    MoreRowList(accountRows)
                }
            }

            item(key = "div3") {
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
            }

            item(key = "settings") {
                MoreSectionHeader("SETTINGS", Color(0xFF64748B))
                Spacer(Modifier.height(6.dp))
                MoreRowList(utilRows)
            }

            item(key = "login") {
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
                }
            }

            item(key = "appearance") {
                androidx.compose.material3.Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth().clickable { prefsExpanded = !prefsExpanded },
                ) {
                    Column(Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                                Icon(Icons.Outlined.DarkMode, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Text("Appearance & Language", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
                            Icon(if (prefsExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                        }
                        if (prefsExpanded) {
                            Spacer(Modifier.height(12.dp))
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                            Spacer(Modifier.height(12.dp))
                            Text("Theme", fontWeight = FontWeight.Medium, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                            Text("Language", fontWeight = FontWeight.Medium, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(6.dp))
                            val currentLocale = androidx.appcompat.app.AppCompatDelegate.getApplicationLocales().toLanguageTags().ifEmpty { "en" }
                            var selectedLang by remember { mutableStateOf(currentLocale.split(",").first().split("-").first()) }
                            val langs = listOf("en" to "English", "hi" to "हिन्दी", "te" to "తెలుగు", "ta" to "தமிழ்", "kn" to "ಕನ್ನಡ", "mr" to "मराठी", "bn" to "বাংলা", "gu" to "ગુજરાતી")
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
        }


    }
}

@Composable
private fun MoreSectionHeader(title: String, accent: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.width(3.dp).height(16.dp).clip(RoundedCornerShape(2.dp)).background(accent))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
private fun MoreRowList(rows: List<MenuRow>) {
    androidx.compose.material3.Card(
        shape = RoundedCornerShape(16.dp),
        colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
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
                        Text(row.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                        Text(row.subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (row.badge != null) {
                        Box(Modifier.size(20.dp).clip(CircleShape).background(Color(0xFFEF4444)), contentAlignment = Alignment.Center) {
                            Text(row.badge, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Icon(Icons.Filled.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(18.dp))
                    }
                }
                if (idx < rows.size - 1) HorizontalDivider(modifier = Modifier.padding(start = 66.dp), color = MaterialTheme.colorScheme.outlineVariant)
            }
        }
    }
}
