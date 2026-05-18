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

private data class MoreEntry(
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val tint: Color = Color(0xFF2563EB),
    val onClick: () -> Unit,
    val key: String = "",
)

private data class MoreGroup(
    val header: String,
    val accentColor: Color,
    val bgColor: Color,
    val entries: List<MoreEntry>,
)

// Web-matching color scheme: Trade=blue, Social=emerald, Account=amber
private val TRADE_ACCENT = Color(0xFF3B82F6)
private val TRADE_BG = Color(0xFFEFF6FF)
private val SOCIAL_ACCENT = Color(0xFF10B981)
private val SOCIAL_BG = Color(0xFFECFDF5)
private val ACCOUNT_ACCENT = Color(0xFFF59E0B)
private val ACCOUNT_BG = Color(0xFFFFFBEB)

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
    var searchQuery by remember { mutableStateOf("") }
    var prefsExpanded by rememberSaveable { mutableStateOf(false) }
    val expandedGroups = remember { mutableStateOf(setOf("Trade & Browse", "Social")) }
    fun toggleGroup(header: String) {
        expandedGroups.value = if (header in expandedGroups.value) expandedGroups.value - header else expandedGroups.value + header
    }

    // ── Web-matching 3 color-coded groups ──────────────────────────────
    val tradeGroup = MoreGroup(
        header = stringResource(R.string.more_trade),
        accentColor = TRADE_ACCENT,
        bgColor = TRADE_BG,
        entries = listOf(
            MoreEntry(stringResource(R.string.more_sell), stringResource(R.string.more_sell_desc), Icons.Outlined.ShoppingCart, Color(0xFF22C55E), onOpenCreatePost),
            MoreEntry(stringResource(R.string.more_plans), stringResource(R.string.more_plans_desc), Icons.Outlined.Star, Color(0xFFF59E0B), onOpenTierSelection),
            MoreEntry(stringResource(R.string.more_centre), stringResource(R.string.more_centre_desc), Icons.Outlined.Category, Color(0xFF0284C7), onOpenCentre),
            MoreEntry(stringResource(R.string.more_all_categories), stringResource(R.string.more_all_categories_desc), Icons.Outlined.Category, Color(0xFF0EA5E9), onOpenCategories),
            MoreEntry(stringResource(R.string.more_category_mode), stringResource(R.string.more_category_mode_desc), Icons.Outlined.Apps, Color(0xFF6366F1), onOpenCategoryMode),
            MoreEntry(stringResource(R.string.more_subcategories), stringResource(R.string.more_subcategories_desc), Icons.Outlined.Category, Color(0xFF0284C7), onOpenSubcategories),
            MoreEntry(stringResource(R.string.more_nearby), stringResource(R.string.more_nearby_desc), Icons.Outlined.LocationOn, Color(0xFF10B981), onOpenNearby),
            MoreEntry(stringResource(R.string.more_saved_searches), stringResource(R.string.more_saved_searches_desc), Icons.Outlined.Search, Color(0xFF8B5CF6), onOpenSavedSearches),
            MoreEntry(key = "wishlist", title = stringResource(R.string.more_wishlist), subtitle = stringResource(R.string.more_wishlist_desc), icon = Icons.Outlined.VolunteerActivism, tint = Color(0xFFEC4899), onClick = onOpenWishlist),
            MoreEntry(stringResource(R.string.more_recently_viewed), stringResource(R.string.more_recently_viewed_desc), Icons.Outlined.History, Color(0xFF6B7280), onOpenRecentlyViewed),
            MoreEntry(stringResource(R.string.more_cart), stringResource(R.string.more_cart_desc), Icons.Outlined.ShoppingCart, Color(0xFF3B82F6), onOpenCart),
            MoreEntry(stringResource(R.string.more_compare), stringResource(R.string.more_compare_desc), Icons.Outlined.BarChart, Color(0xFF0EA5E9), onOpenCompare),
        ),
    )

    val socialGroup = MoreGroup(
        header = stringResource(R.string.more_social),
        accentColor = SOCIAL_ACCENT,
        bgColor = SOCIAL_BG,
        entries = listOf(
            MoreEntry(stringResource(R.string.more_feed), stringResource(R.string.more_feed_desc), Icons.AutoMirrored.Outlined.Article, Color(0xFF3B82F6), onOpenFeed),
            MoreEntry(stringResource(R.string.more_public_wall), stringResource(R.string.more_public_wall_desc), Icons.Outlined.Group, Color(0xFF059669), onOpenPublicWall),
            MoreEntry(stringResource(R.string.more_chat), stringResource(R.string.more_chat_desc), Icons.AutoMirrored.Outlined.Chat, Color(0xFF2563EB), onOpenChat),
            MoreEntry(stringResource(R.string.more_my_reviews), stringResource(R.string.more_my_reviews_desc), Icons.Outlined.Star, Color(0xFFF59E0B), onOpenMyReviews),
            MoreEntry(stringResource(R.string.more_my_offers), stringResource(R.string.more_my_offers_desc), Icons.Outlined.LocalOffer, Color(0xFF7C3AED), onOpenOffers),
            MoreEntry(stringResource(R.string.more_feedback), stringResource(R.string.more_feedback_desc), Icons.AutoMirrored.Outlined.HelpOutline, Color(0xFF22C55E), onOpenFeedback),
            MoreEntry(stringResource(R.string.more_complaints), stringResource(R.string.more_complaints_desc), Icons.Outlined.Report, Color(0xFFEF4444), onOpenComplaints),
        ),
    )

    val accountGroup = MoreGroup(
        header = stringResource(R.string.more_account),
        accentColor = ACCOUNT_ACCENT,
        bgColor = ACCOUNT_BG,
        entries = buildList {
            add(MoreEntry(stringResource(R.string.more_profile), stringResource(R.string.more_profile_desc), Icons.Outlined.Person, Color(0xFF2563EB), onOpenProfile))
            add(MoreEntry(stringResource(R.string.more_rewards), stringResource(R.string.more_rewards_desc), Icons.Outlined.EmojiEvents, Color(0xFFD97706), onOpenRewards))
            add(MoreEntry(key = "notifications", title = stringResource(R.string.more_notifications), subtitle = stringResource(R.string.more_notifications_desc), icon = Icons.Outlined.Notifications, tint = Color(0xFFEF4444), onClick = onOpenNotifications))
            add(MoreEntry(stringResource(R.string.more_verification), stringResource(R.string.more_verification_desc), Icons.Outlined.VerifiedUser, Color(0xFF059669), onOpenVerification))
            add(MoreEntry(stringResource(R.string.more_dashboard), stringResource(R.string.more_dashboard_desc), Icons.Outlined.Dashboard, Color(0xFF3B82F6), onOpenDashboard))
            add(MoreEntry(stringResource(R.string.more_security), stringResource(R.string.more_security_desc), Icons.Outlined.Security, Color(0xFF64748B), onOpenSettings))
            add(MoreEntry(stringResource(R.string.more_delete_account), stringResource(R.string.more_delete_account_desc), Icons.Outlined.Delete, Color(0xFFEF4444), onOpenAccountDelete))
            if (isAdmin) add(MoreEntry(stringResource(R.string.more_admin_panel), stringResource(R.string.more_admin_panel_desc), Icons.Outlined.Security, Color(0xFFDC2626), onOpenAdminPanel))
        },
    )

    val groups = listOf(tradeGroup, socialGroup, accountGroup)

    // ── Drawer Content ─────────────────────────────────────────────────
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Header with close button
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    stringResource(R.string.more_menu),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.more_close_menu), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        // Search bar
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text(stringResource(R.string.more_search_menu)) },
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Filled.Close, null) }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF2563EB),
                    unfocusedBorderColor = Color(0xFFE5E7EB),
                ),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        // Preferences section header (collapsed by default — menu items visible first)
        item(key = "prefs_header") {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth().clickable { prefsExpanded = !prefsExpanded },
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(Icons.Outlined.Settings, contentDescription = null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(stringResource(R.string.more_appearance_language), fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.weight(1f))
                    Icon(
                        if (prefsExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }

        // Theme mode toggle (Light / System / Dark) — matches web
        if (prefsExpanded) item {
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.DarkMode,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp),
                    )
                    Text(stringResource(R.string.more_theme), fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.weight(1f))
                    listOf(stringResource(R.string.more_theme_light) to ThemeMode.LIGHT, stringResource(R.string.more_theme_system) to ThemeMode.SYSTEM, stringResource(R.string.more_theme_dark) to ThemeMode.DARK).forEach { (label, mode) ->
                        FilterChip(
                            selected = currentThemeMode == mode,
                            onClick = { onSetThemeMode(mode) },
                            label = { Text(label, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                            ),
                        )
                    }
                }
            }
        }

        // Language selector — matches web's 25 languages
        if (prefsExpanded) item {
            val currentLocale = androidx.appcompat.app.AppCompatDelegate.getApplicationLocales().toLanguageTags().ifEmpty { "en" }
            var selectedLang by remember { mutableStateOf(currentLocale.split(",").first().split("-").first()) }
            var showAllLangs by rememberSaveable { mutableStateOf(false) }
            val indianLangs = listOf(
                "en" to "English", "hi" to "हिन्दी", "te" to "తెలుగు", "ta" to "தமிழ்",
                "kn" to "ಕನ್ನಡ", "mr" to "मराठी", "bn" to "বাংলা", "gu" to "ગુજરાતી",
                "ml" to "മലയാളം", "pa" to "ਪੰਜਾਬੀ", "ur" to "اردو",
            )
            val intlLangs = listOf(
                "es" to "Español", "fr" to "Français", "de" to "Deutsch", "pt" to "Português",
                "it" to "Italiano", "ru" to "Русский", "ar" to "العربية", "ja" to "日本語",
                "ko" to "한국어", "zh" to "中文", "id" to "Indonesia", "tr" to "Türkçe",
                "vi" to "Tiếng Việt", "th" to "ไทย", "sw" to "Kiswahili",
            )
            val displayLangs = if (showAllLangs) indianLangs + intlLangs else indianLangs.take(4)
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.Settings,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.more_language), fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.weight(1f))
                        Text(
                            if (showAllLangs) stringResource(R.string.more_show_less) else stringResource(R.string.more_show_all),
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.clickable { showAllLangs = !showAllLangs },
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    if (showAllLangs) {
                        Text(stringResource(R.string.more_indian), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B),
                            modifier = Modifier.padding(bottom = 4.dp))
                    }
                    androidx.compose.foundation.layout.FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        val currentList = if (showAllLangs) indianLangs else displayLangs
                        currentList.forEach { (code, label) ->
                            FilterChip(
                                selected = selectedLang == code,
                                onClick = {
                                    selectedLang = code
                                    onLanguageChange(code)
                                },
                                label = { Text(label, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                ),
                            )
                        }
                    }
                    if (showAllLangs) {
                        Spacer(Modifier.height(8.dp))
                        Text(stringResource(R.string.more_international), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B),
                            modifier = Modifier.padding(bottom = 4.dp))
                        androidx.compose.foundation.layout.FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            intlLangs.forEach { (code, label) ->
                                FilterChip(
                                    selected = selectedLang == code,
                                    onClick = {
                                        selectedLang = code
                                        onLanguageChange(code)
                                    },
                                    label = { Text(label, fontSize = 11.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }
                }
            }
        }

        // Color-coded groups — matching web's drawer style
        val filteredGroups = if (searchQuery.isBlank()) groups
        else groups.mapNotNull { group ->
            val filtered = group.entries.filter {
                it.title.contains(searchQuery, ignoreCase = true) ||
                    it.subtitle.contains(searchQuery, ignoreCase = true)
            }
            if (filtered.isEmpty()) null else group.copy(entries = filtered)
        }

        filteredGroups.forEach { group ->
            // Group header with accent color — collapsible
            item(key = "hdr_${group.header}") {
                Spacer(Modifier.height(4.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { toggleGroup(group.header) }
                        .padding(start = 4.dp, bottom = 2.dp, end = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        group.header.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = group.accentColor,
                    )
                    Icon(
                        if (group.header in expandedGroups.value) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = if (group.header in expandedGroups.value) stringResource(R.string.more_collapse) else stringResource(R.string.more_expand),
                        tint = group.accentColor,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }

            // Group card with colored background — animated collapse
            item(key = "grp_${group.header}") {
                AnimatedVisibility(
                    visible = group.header in expandedGroups.value,
                    enter = expandVertically(),
                    exit = shrinkVertically(),
                ) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = group.bgColor),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.padding(vertical = 4.dp)) {
                        group.entries.forEach { entry ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable(onClick = entry.onClick)
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                // Icon circle
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(entry.tint.copy(alpha = 0.12f)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        imageVector = entry.icon,
                                        contentDescription = null,
                                        tint = entry.tint,
                                        modifier = Modifier.size(20.dp),
                                    )
                                    if (entry.key == "notifications") {
                                        Box(
                                            Modifier
                                                .align(Alignment.TopEnd)
                                                .offset(x = 4.dp, y = (-4).dp)
                                                .size(14.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFFEF4444)),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text("3", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    if (entry.key == "wishlist") {
                                        Box(
                                            Modifier
                                                .align(Alignment.TopEnd)
                                                .offset(x = 4.dp, y = (-4).dp)
                                                .size(14.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFF7C3AED)),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text("•", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }

                                // Title + subtitle
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        entry.title,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        entry.subtitle,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }

                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                    }
                }
                }
            }
        }

        // Accessibility
        item(key = "accessibility") {
            var largeFont by rememberSaveable { mutableStateOf(false) }
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
            ) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Accessibility, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.more_accessibility), fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(stringResource(R.string.more_large_font), style = MaterialTheme.typography.bodySmall)
                        Switch(checked = largeFont, onCheckedChange = { largeFont = it })
                    }
                }
            }
        }

        // Login button for guests
        if (!isLoggedIn) {
            item(key = "login_btn") {
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = onOpenLogin,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Icon(Icons.AutoMirrored.Outlined.Login, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.more_login))
                }
            }
        }

        // Logout button for authenticated users
        if (isLoggedIn) {
            item(key = "logout_btn") {
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error,
                    ),
                ) {
                    Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.profile_sign_out))
                }
            }
        }

        // Footer
        item {
            Spacer(Modifier.height(8.dp))
            Text(
                stringResource(R.string.more_footer),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
            )
            Spacer(Modifier.height(60.dp))
        }
    }
}
