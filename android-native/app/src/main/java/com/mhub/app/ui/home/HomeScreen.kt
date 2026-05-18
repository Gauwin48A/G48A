package com.mhub.app.ui.home

import com.mhub.app.R
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NewReleases
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Compare
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.Scaffold
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.InputChip
import androidx.compose.material3.AssistChip
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.mhub.app.domain.model.Category
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.PostGridShimmer
import com.mhub.app.ui.components.PromoBadgeRow
import com.mhub.app.ui.components.ImageZoomDialog
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.min

private enum class SortOption(val label: String) {
    NEWEST("New"),
    POPULAR("Popular"),
    PRICE_ASC("Price low-high"),
    PRICE_DESC("Price high-low"),
}

enum class PageDensity(val label: String, val cardPadding: Int) {
    COMPACT("Compact", 4),
    NORMAL("Normal", 8),
    SPACIOUS("Spacious", 12),
}

// Relative time formatting: "2h ago", "3d ago"
private fun relativeTime(isoDate: String?): String {
    if (isoDate.isNullOrBlank()) return ""
    return try {
        val then = Instant.parse(isoDate)
        val now = Instant.now()
        val mins = ChronoUnit.MINUTES.between(then, now)
        when {
            mins < 1 -> "now"
            mins < 60 -> "${mins}m ago"
            mins < 1440 -> "${mins / 60}h ago"
            mins < 10080 -> "${mins / 1440}d ago"
            else -> "${mins / 10080}w ago"
        }
    } catch (_: Exception) { "" }
}

private data class PostFilters(
    val minPrice: Float = 0f,
    val maxPrice: Float = 100000f,
    val condition: String = "Any",
    val location: String = "",
    val verifiedOnly: Boolean = false,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterBottomSheet(
    filters: PostFilters,
    onApply: (PostFilters) -> Unit,
    onDismiss: () -> Unit,
) {
    var priceRange by remember { mutableStateOf(filters.minPrice..filters.maxPrice) }
    var condition by remember { mutableStateOf(filters.condition) }
    var location by remember { mutableStateOf(filters.location) }
    var verifiedOnly by remember { mutableStateOf(filters.verifiedOnly) }
    var startDate by remember { mutableStateOf(filters.startDate) }
    var endDate by remember { mutableStateOf(filters.endDate) }
    var showStartDatePicker by remember { mutableStateOf(false) }
    var showEndDatePicker by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
            Text(stringResource(R.string.filter_title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))

            Text(stringResource(R.string.filter_price_range, "%,.0f".format(priceRange.start), "%,.0f".format(priceRange.endInclusive)), style = MaterialTheme.typography.labelMedium)
            RangeSlider(value = priceRange, onValueChange = { priceRange = it }, valueRange = 0f..500000f, steps = 9)
            Spacer(Modifier.height(12.dp))

            Text(stringResource(R.string.filter_condition), style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 4.dp)) {
                listOf(
                    stringResource(R.string.filter_condition_any),
                    stringResource(R.string.filter_condition_new),
                    stringResource(R.string.filter_condition_used),
                    stringResource(R.string.filter_condition_like_new),
                ).forEach { opt ->
                    FilterChip(selected = condition == opt, onClick = { condition = opt }, label = { Text(opt) })
                }
            }
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(value = location, onValueChange = { location = it }, label = { Text(stringResource(R.string.filter_location)) }, singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))

            Text(stringResource(R.string.filter_date_range), style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(4.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = startDate?.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")) ?: "",
                    onValueChange = {},
                    label = { Text(stringResource(R.string.filter_from)) },
                    readOnly = true,
                    trailingIcon = { Icon(Icons.Default.CalendarMonth, null) },
                    modifier = Modifier.weight(1f).clickable { showStartDatePicker = true },
                    shape = RoundedCornerShape(12.dp),
                )
                OutlinedTextField(
                    value = endDate?.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")) ?: "",
                    onValueChange = {},
                    label = { Text(stringResource(R.string.filter_to)) },
                    readOnly = true,
                    trailingIcon = { Icon(Icons.Default.CalendarMonth, null) },
                    modifier = Modifier.weight(1f).clickable { showEndDatePicker = true },
                    shape = RoundedCornerShape(12.dp),
                )
            }
            Spacer(Modifier.height(12.dp))

            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.filter_verified_sellers))
                Spacer(Modifier.weight(1f))
                Switch(checked = verifiedOnly, onCheckedChange = { verifiedOnly = it })
            }
            Spacer(Modifier.height(12.dp))

            // Multi-group category filter (web-parity: AllPosts.jsx groupedCategoryFilter)
            Text(stringResource(R.string.filter_category_group), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(4.dp))
            val categoryGroups = listOf("All", "Electronics", "Fashion", "Vehicles", "Home & Living", "Others")
            var selectedGroup by remember { mutableStateOf("All") }
            androidx.compose.foundation.lazy.LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(vertical = 4.dp),
            ) {
                items(categoryGroups, key = { it }) { group ->
                    val groupColors = mapOf(
                        "Electronics" to Color(0xFF3B82F6), "Fashion" to Color(0xFFEC4899),
                        "Vehicles" to Color(0xFF10B981), "Home & Living" to Color(0xFF8B5CF6),
                        "Others" to Color(0xFFF59E0B),
                    )
                    FilterChip(
                        selected = selectedGroup == group,
                        onClick = { selectedGroup = group },
                        label = { Text(group, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = groupColors[group] ?: MaterialTheme.colorScheme.primary,
                            selectedLabelColor = Color.White,
                        ),
                    )
                }
            }
            Spacer(Modifier.height(16.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                androidx.compose.material3.OutlinedButton(onClick = {
                    onApply(PostFilters()); onDismiss()
                }, modifier = Modifier.weight(1f)) { Text(stringResource(R.string.filter_reset)) }
                androidx.compose.material3.Button(onClick = {
                    onApply(PostFilters(priceRange.start, priceRange.endInclusive, condition, location, verifiedOnly, startDate, endDate)); onDismiss()
                }, modifier = Modifier.weight(1f)) { Text(stringResource(R.string.filter_apply)) }
            }
            Spacer(Modifier.height(24.dp))
        }
    }

    if (showStartDatePicker) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showStartDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        startDate = Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()
                    }
                    showStartDatePicker = false
                }) { Text(stringResource(R.string.filter_ok)) }
            },
            dismissButton = { TextButton(onClick = { showStartDatePicker = false }) { Text(stringResource(R.string.filter_cancel)) } }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    if (showEndDatePicker) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showEndDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        endDate = Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()
                    }
                    showEndDatePicker = false
                }) { Text(stringResource(R.string.filter_ok)) }
            },
            dismissButton = { TextButton(onClick = { showEndDatePicker = false }) { Text(stringResource(R.string.filter_cancel)) } }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

/* ── Compare Dialog: side-by-side comparison ─────────────────────────── */

@Composable
private fun CompareDialog(
    posts: List<Post>,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.allposts_compare_items, posts.size), fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.allposts_spec), Modifier.weight(1f), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelMedium)
                        posts.forEach { _ ->
                            Text(stringResource(R.string.allposts_item), Modifier.weight(1f), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelSmall, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        }
                    }
                    HorizontalDivider(Modifier.padding(vertical = 4.dp))
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.allposts_title), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        posts.forEach { post ->
                            Text(post.displayTitle, Modifier.weight(1f), maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    HorizontalDivider(Modifier.padding(vertical = 4.dp))
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.allposts_price), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        posts.forEach { post ->
                            Text(post.price?.let { "₹${"%,.0f".format(it)}" } ?: "N/A", Modifier.weight(1f), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    HorizontalDivider(Modifier.padding(vertical = 4.dp))
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.filter_condition), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        posts.forEach { post ->
                            Text(post.condition ?: "N/A", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    HorizontalDivider(Modifier.padding(vertical = 4.dp))
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.compare_brand), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        posts.forEach { post ->
                            Text(post.brand ?: "N/A", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    HorizontalDivider(Modifier.padding(vertical = 4.dp))
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.compare_location), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        posts.forEach { post ->
                            Text(post.location ?: "N/A", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    HorizontalDivider(Modifier.padding(vertical = 4.dp))
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.compare_seller), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        posts.forEach { post ->
                            Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(post.sellerName ?: post.userName ?: "N/A", style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                if (post.sellerName != null) {
                                    Icon(Icons.Default.VerifiedUser, null, Modifier.size(10.dp), tint = Color(0xFF3B82F6))
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.home_close)) }
        },
    )
}

/* ── Promote Dialog: post boost options ──────────────────────────────── */

@Composable
private fun PromoteDialog(
    postId: String,
    postTitle: String,
    onDismiss: () -> Unit,
    onConfirm: (tier: String, duration: Int) -> Unit = { _, _ -> },
) {
    var selectedTier by remember { mutableStateOf("Basic") }
    var duration by remember { mutableStateOf(7) }

    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Default.Campaign, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
        title = { Text(stringResource(R.string.promote_title, postTitle), fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis) },
        text = {
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.promote_boost_subtitle), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(4.dp))

                listOf("Basic" to "₹49", "Featured" to "₹99", "Spotlight" to "₹199").forEach { (tier, price) ->
                    Surface(
                        onClick = { selectedTier = tier },
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (selectedTier == tier) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                        ),
                        color = if (selectedTier == tier) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else Color.Transparent,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(tier, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    when (tier) {
                                        "Basic" -> "2x visibility"
                                        "Featured" -> "5x + homepage"
                                        else -> "10x + top slot"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(price, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                RadioButton(selected = selectedTier == tier, onClick = { selectedTier = tier })
                            }
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))
                Text(stringResource(R.string.promote_duration), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(3, 7, 14, 30).forEach { days ->
                        FilterChip(
                            selected = duration == days,
                            onClick = { duration = days },
                            label = { Text("$days days") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                            ),
                        )
                    }
                }
            }
        },
        confirmButton = {
            androidx.compose.material3.Button(onClick = {
                onConfirm(selectedTier, duration)
                onDismiss()
            }) {
                Text(stringResource(R.string.promote_confirm))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.filter_cancel)) }
        },
    )
}

/* ── Category theme data ──────────────────────────────────────────────── */

private data class CategoryTheme(
    val key: String,
    val label: String,
    val emoji: String,
    val tagline: String,
    val gradient: List<Color>,
)

private val CATEGORY_THEMES = mapOf(
    "electronics" to CategoryTheme("electronics", "Electronics", "📱", "Phones, laptops & gadgets",
        listOf(Color(0xFF3B82F6), Color(0xFF4F46E5), Color(0xFF7C3AED))),
    "fashion" to CategoryTheme("fashion", "Fashion", "👗", "Clothing, shoes & accessories",
        listOf(Color(0xFFEC4899), Color(0xFFF43F5E), Color(0xFFEF4444))),
    "vehicles" to CategoryTheme("vehicles", "Vehicles", "🚗", "Cars, bikes & spare parts",
        listOf(Color(0xFF10B981), Color(0xFF14B8A6), Color(0xFF0891B2))),
    "others" to CategoryTheme("others", "Others", "✨", "Home, services, jobs & more",
        listOf(Color(0xFFA855F7), Color(0xFF7C3AED), Color(0xFF4F46E5))),
)

/* ── Hero banner for active category ──────────────────────────────────── */

@Composable
private fun CategoryHeroBanner(
    theme: CategoryTheme,
    listingsCount: Int,
    onChangeApp: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.horizontalGradient(theme.gradient))
            .padding(20.dp),
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(theme.emoji, fontSize = 32.sp)
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(theme.label, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                        Text(theme.tagline, color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp)
                    }
                }
                Surface(
                    onClick = onChangeApp,
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White.copy(alpha = 0.2f),
                ) {
                    Text(
                        "Switch",
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    )
                }
            }
            if (listingsCount > 0) {
                Spacer(Modifier.height(8.dp))
                Text(
                    "$listingsCount listings available",
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

/* ── Quick-access row (Cart / Wishlist / Recently Viewed) ─────────────── */

@Composable
private fun QuickAccessRow(
    onOpenCart: () -> Unit,
    onOpenWishlist: () -> Unit,
    onOpenRecentlyViewed: () -> Unit,
    accentColor: Color,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        QuickAccessChip(Icons.Default.ShoppingCart, "Cart", accentColor, Modifier.weight(1f), onOpenCart)
        QuickAccessChip(Icons.Default.FavoriteBorder, "Wishlist", accentColor, Modifier.weight(1f), onOpenWishlist)
        QuickAccessChip(Icons.Default.History, "Recent", accentColor, Modifier.weight(1f), onOpenRecentlyViewed)
    }
}

@Composable
private fun QuickAccessChip(
    icon: ImageVector,
    label: String,
    accentColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = accentColor.copy(alpha = 0.08f),
        modifier = modifier,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(icon, null, tint = accentColor, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, color = accentColor, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

/* ── Subcategory strip (shown when a category app is active) ──────────── */

@Composable
private fun SubcategoryStrip(
    subcategories: List<Category>,
    selected: String?,
    accentColor: Color,
    onSelect: (String?) -> Unit,
) {
    Column {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                stringResource(R.string.allposts_browse_subcategories),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.weight(1f))
            Text(
                stringResource(R.string.allposts_available_count, subcategories.size),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
            )
        }
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        ) {
            item {
                AssistChip(
                    onClick = { onSelect(null) },
                    label = {
                        Text(
                            stringResource(R.string.allposts_all),
                            fontWeight = if (selected == null) FontWeight.Bold else FontWeight.Normal,
                            style = MaterialTheme.typography.labelMedium,
                        )
                    },
                    border = if (selected == null) {
                        androidx.compose.foundation.BorderStroke(2.dp, accentColor)
                    } else {
                        androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                    },
                    colors = androidx.compose.material3.AssistChipDefaults.assistChipColors(
                        containerColor = if (selected == null) accentColor.copy(alpha = 0.12f) else Color.Transparent,
                        labelColor = if (selected == null) accentColor else MaterialTheme.colorScheme.onSurface,
                    ),
                )
            }
            items(subcategories, key = { it.stableId }) { sub ->
                val isSelected = selected == sub.stableId
                AssistChip(
                    onClick = { onSelect(sub.stableId) },
                    label = {
                        Text(
                            sub.displayName,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            style = MaterialTheme.typography.labelMedium,
                        )
                    },
                    border = if (isSelected) {
                        androidx.compose.foundation.BorderStroke(2.dp, accentColor)
                    } else {
                        androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                    },
                    colors = androidx.compose.material3.AssistChipDefaults.assistChipColors(
                        containerColor = if (isSelected) accentColor.copy(alpha = 0.12f) else Color.Transparent,
                        labelColor = if (isSelected) accentColor else MaterialTheme.colorScheme.onSurface,
                    ),
                )
            }
        }
    }
}

/* ── Heroic banner for AllPosts (web parity: AllPosts.jsx hero section) ── */

@Composable
private fun AllPostsHeroBanner(
    listingsCount: Int,
    onExplore: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(Color(0xFF1E40AF), Color(0xFF6366F1), Color(0xFF7C3AED)),
                ),
            )
            .padding(20.dp),
    ) {
        Column {
            Text(stringResource(R.string.allposts_hero_title), color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp)
            Spacer(Modifier.height(4.dp))
            Text(
                stringResource(R.string.allposts_hero_subtitle),
                color = Color.White.copy(alpha = 0.85f),
                fontSize = 13.sp,
                lineHeight = 18.sp,
            )
            Spacer(Modifier.height(14.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Stats badges
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.White.copy(alpha = 0.18f),
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("📦", fontSize = 14.sp)
                        Spacer(Modifier.width(4.dp))
                        Text(
                            stringResource(R.string.allposts_items_count, listingsCount),
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.White.copy(alpha = 0.18f),
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF4ADE80)),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            stringResource(R.string.allposts_live_marketplace),
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                Spacer(Modifier.weight(1f))
                Surface(
                    onClick = onExplore,
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White.copy(alpha = 0.2f),
                ) {
                    Text(
                        stringResource(R.string.allposts_for_you),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onOpenPost: (String) -> Unit,
    onOpenSearch: () -> Unit = {},
    onCreatePost: () -> Unit = {},
    onOpenExplore: () -> Unit = {},
    onOpenCategories: () -> Unit = {},
    activeCategoryKey: String? = null,
    onChangeApp: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    onOpenWishlist: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    isGuest: Boolean = false,
    onNavigateToLogin: () -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var gridMode by remember { mutableStateOf(false) }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var sortBy by remember { mutableStateOf(SortOption.NEWEST) }
    var searchQuery by remember { mutableStateOf("") }
    var showSearch by remember { mutableStateOf(false) }
    var showFilterSheet by remember { mutableStateOf(false) }
    var filters by remember { mutableStateOf(PostFilters()) }
    var quickFilter by remember { mutableStateOf<String?>(null) }
    var showShareSheet by remember { mutableStateOf(false) }
    var sharePostId by remember { mutableStateOf("") }
    var sharePostTitle by remember { mutableStateOf("") }
    var showInterestModal by remember { mutableStateOf(false) }
    var interestPostId by remember { mutableStateOf("") }
    var interestPostTitle by remember { mutableStateOf("") }
    var compareItems by remember { mutableStateOf(listOf<Post>()) }
    var showCompareDialog by remember { mutableStateOf(false) }
    var showPromoteDialog by remember { mutableStateOf(false) }
    var zoomImages by remember { mutableStateOf<List<String>>(emptyList()) }
    var promotePostId by remember { mutableStateOf("") }
    var promotePostTitle by remember { mutableStateOf("") }
    var pageDensity by remember { mutableStateOf(PageDensity.NORMAL) }
    var loadingStartTime by remember { mutableStateOf(0L) }
    // Persist scroll position across navigation (saves first visible item index + offset)
    val firstVisibleIndex = rememberSaveable { mutableStateOf(0) }
    val firstVisibleOffset = rememberSaveable { mutableStateOf(0) }
    val listState = rememberLazyListState(firstVisibleIndex.value, firstVisibleOffset.value)
    // Save scroll position when leaving
    DisposableEffect(Unit) {
        onDispose {
            firstVisibleIndex.value = listState.firstVisibleItemIndex
            firstVisibleOffset.value = listState.firstVisibleItemScrollOffset
        }
    }
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val categoryTheme = activeCategoryKey?.let { CATEGORY_THEMES[it] }

    // Sync category key with ViewModel
    LaunchedEffect(activeCategoryKey) {
        viewModel.setCategoryKey(activeCategoryKey)
    }

    // Resilient state restoration: reload if posts are empty when screen becomes visible
    LaunchedEffect(Unit) {
        if (state.posts.isEmpty() && !state.loading) {
            viewModel.load(initial = true)
        }
    }

    // Track loading time for stalled state
    LaunchedEffect(state.loading) {
        if (state.loading && state.posts.isEmpty()) {
            loadingStartTime = System.currentTimeMillis()
        }
    }

    // Auto-refresh every 30 seconds
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(30_000L)
            viewModel.load()
        }
    }

    if (showShareSheet) {
        com.mhub.app.ui.components.ShareLinkBottomSheet(
            title = sharePostTitle, postId = sharePostId,
            onDismiss = { showShareSheet = false },
        )
    }
    if (showInterestModal) {
        com.mhub.app.ui.components.BuyerInterestModal(
            postId = interestPostId, postTitle = interestPostTitle,
            onDismiss = { showInterestModal = false },
            onSubmit = { _, _, _ -> showInterestModal = false },
        )
    }
    if (zoomImages.isNotEmpty()) {
        ImageZoomDialog(imageUrls = zoomImages, onDismiss = { zoomImages = emptyList() })
    }
    if (showCompareDialog && compareItems.isNotEmpty()) {
        CompareDialog(
            posts = compareItems,
            onDismiss = { showCompareDialog = false },
        )
    }
    if (showPromoteDialog) {
        PromoteDialog(
            postId = promotePostId,
            postTitle = promotePostTitle,
            onDismiss = { showPromoteDialog = false },
            onConfirm = { tier, duration -> viewModel.boostPost(promotePostId, tier, duration) },
        )
    }

    val filteredPosts = remember(state.posts, selectedCategory, sortBy, searchQuery, filters, quickFilter) {
        // Multi-token search: split query into tokens
        val searchTokens = searchQuery.trim().split("\\s+".toRegex()).filter { it.isNotBlank() }
        
        state.posts
            .filter { post ->
                (selectedCategory == null || post.categoryName == selectedCategory) &&
                    // Multi-token search: all tokens must match
                    (searchTokens.isEmpty() || searchTokens.all { token ->
                        post.displayTitle.contains(token, ignoreCase = true) ||
                        post.description?.contains(token, ignoreCase = true) == true ||
                        post.location?.contains(token, ignoreCase = true) == true ||
                        post.categoryName?.contains(token, ignoreCase = true) == true ||
                        post.subcategoryName?.contains(token, ignoreCase = true) == true ||
                        post.brand?.contains(token, ignoreCase = true) == true ||
                        post.model?.contains(token, ignoreCase = true) == true ||
                        post.sellerName?.contains(token, ignoreCase = true) == true ||
                        post.userName?.contains(token, ignoreCase = true) == true
                    }) &&
                    (filters.condition == "Any" || post.condition?.equals(filters.condition, ignoreCase = true) == true) &&
                    (filters.location.isBlank() || post.location?.contains(filters.location, ignoreCase = true) == true) &&
                    (!filters.verifiedOnly || post.sellerName != null) &&
                    (post.price == null || (post.price >= filters.minPrice && post.price <= filters.maxPrice)) &&
                    // Date range filter
                    (filters.startDate == null || try {
                        val postDate = Instant.parse(post.createdAt).atZone(ZoneId.systemDefault()).toLocalDate()
                        !postDate.isBefore(filters.startDate)
                    } catch (_: Exception) { true }) &&
                    (filters.endDate == null || try {
                        val postDate = Instant.parse(post.createdAt).atZone(ZoneId.systemDefault()).toLocalDate()
                        !postDate.isAfter(filters.endDate)
                    } catch (_: Exception) { true })
            }
            .let { list ->
                when (quickFilter) {
                    "Under ₹1K" -> list.filter { (it.price ?: Double.MAX_VALUE) < 1000.0 }
                    "₹500–₹2K" -> list.filter { val p = it.price ?: return@filter false; p in 500.0..2000.0 }
                    "₹2K–₹10K" -> list.filter { val p = it.price ?: return@filter false; p in 2000.0..10000.0 }
                    "Above ₹10K" -> list.filter { (it.price ?: 0.0) > 10000.0 }
                    "Latest 5" -> list.take(5)
                    "Latest 10" -> list.take(10)
                    "Posted Today" -> list.filter {
                        try {
                            val postDate = Instant.parse(it.createdAt).atZone(ZoneId.systemDefault()).toLocalDate()
                            postDate == LocalDate.now()
                        } catch (_: Exception) { false }
                    }
                    "Near Me" -> list.filter { it.location != null }
                    else -> list
                }
            }
            .let { list ->
                when (sortBy) {
                    SortOption.NEWEST -> list
                    SortOption.POPULAR -> list.sortedByDescending { it.viewCount ?: 0 }
                    SortOption.PRICE_ASC -> list.sortedBy { it.price ?: Double.MAX_VALUE }
                    SortOption.PRICE_DESC -> list.sortedByDescending { it.price ?: 0.0 }
                }
            }
            // Guest preview limit: take only 5 for guests
            .let { list -> if (isGuest) list.take(5) else list }
    }

    if (showFilterSheet) {
        FilterBottomSheet(filters = filters, onApply = { filters = it }, onDismiss = { showFilterSheet = false })
    }

    val filterCount = listOf(
        filters.condition != "Any",
        filters.location.isNotBlank(),
        filters.verifiedOnly,
        filters.minPrice > 0f,
        filters.maxPrice < 100000f,
        filters.startDate != null,
        filters.endDate != null,
        selectedCategory != null,
    ).count { it }

    Scaffold(
        topBar = {
            if (categoryTheme != null) {
                // Category-branded top bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.horizontalGradient(categoryTheme.gradient))
                        .padding(top = with(androidx.compose.ui.platform.LocalDensity.current) {
                            androidx.compose.foundation.layout.WindowInsets.statusBars.getTop(this).toDp()
                        }),
                ) {
                    TopAppBar(
                        title = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(categoryTheme.emoji, fontSize = 22.sp)
                                Spacer(Modifier.width(8.dp))
                                Column {
                                    Text(categoryTheme.label, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 18.sp)
                                    Text(categoryTheme.tagline, color = Color.White.copy(alpha = 0.75f), fontSize = 11.sp)
                                }
                            }
                        },
                        actions = {
                            IconButton(onClick = { showSearch = !showSearch }) {
                                Icon(if (showSearch) Icons.Default.Close else Icons.Default.Search, "Search", tint = Color.White)
                            }
                            IconButton(onClick = { showFilterSheet = true }) {
                                BadgedBox(
                                    badge = {
                                        if (filterCount > 0) {
                                            Badge { Text("$filterCount") }
                                        }
                                    },
                                ) {
                                    Icon(Icons.Default.Tune, "Filters", tint = Color.White)
                                }
                            }
                            // Density toggle
                            IconButton(onClick = {
                                pageDensity = when (pageDensity) {
                                    PageDensity.COMPACT -> PageDensity.NORMAL
                                    PageDensity.NORMAL -> PageDensity.SPACIOUS
                                    PageDensity.SPACIOUS -> PageDensity.COMPACT
                                }
                            }) {
                                Icon(
                                    imageVector = when (pageDensity) {
                                        PageDensity.COMPACT -> Icons.Default.GridView
                                        PageDensity.NORMAL -> Icons.AutoMirrored.Filled.ViewList
                                        PageDensity.SPACIOUS -> Icons.Outlined.Inventory2
                                    },
                                    contentDescription = "Density: ${pageDensity.label}",
                                    tint = Color.White,
                                )
                            }
                            FilledTonalIconButton(onClick = { gridMode = !gridMode }) {
                                Icon(if (gridMode) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView, "Toggle view")
                            }
                            Spacer(Modifier.width(4.dp))
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Color.Transparent,
                            scrolledContainerColor = Color.Transparent,
                        ),
                    )
                }
            } else {
                // Default top bar
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "MHub",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            text = stringResource(com.mhub.app.R.string.trust_marketplace),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            letterSpacing = androidx.compose.ui.unit.TextUnit(
                                value = 1.2f,
                                type = androidx.compose.ui.unit.TextUnitType.Sp,
                            ),
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showSearch = !showSearch }) {
                        Icon(
                            imageVector = if (showSearch) Icons.Default.Close else Icons.Default.Search,
                            contentDescription = "Search",
                        )
                    }
                    IconButton(onClick = { showFilterSheet = true }) {
                        BadgedBox(
                            badge = {
                                if (filterCount > 0) {
                                    Badge { Text("$filterCount") }
                                }
                            },
                        ) {
                            Icon(Icons.Default.Tune, contentDescription = "Filters")
                        }
                    }
                    // Density toggle
                    IconButton(onClick = {
                        pageDensity = when (pageDensity) {
                            PageDensity.COMPACT -> PageDensity.NORMAL
                            PageDensity.NORMAL -> PageDensity.SPACIOUS
                            PageDensity.SPACIOUS -> PageDensity.COMPACT
                        }
                    }) {
                        Icon(
                            imageVector = when (pageDensity) {
                                PageDensity.COMPACT -> Icons.Default.GridView
                                PageDensity.NORMAL -> Icons.AutoMirrored.Filled.ViewList
                                PageDensity.SPACIOUS -> Icons.Outlined.Inventory2
                            },
                            contentDescription = "Density: ${pageDensity.label}",
                        )
                    }
                    FilledTonalIconButton(onClick = { gridMode = !gridMode }) {
                        Icon(
                            imageVector = if (gridMode) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                            contentDescription = "Toggle view",
                        )
                    }
                    Spacer(Modifier.width(4.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
            }
        },
        floatingActionButton = {
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                com.mhub.app.ui.components.BackToTopButton(listState = listState, coroutineScope = coroutineScope)
                ExtendedFloatingActionButton(
                    onClick = onCreatePost,
                    icon = { Icon(Icons.Default.Add, contentDescription = null) },
                    text = { Text(stringResource(R.string.home_sell), fontWeight = FontWeight.SemiBold) },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 4.dp),
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        // Premium gradient page-shell (web-parity: AllPosts.jsx page gradient wrapper)
        val pageShellGradient = Brush.verticalGradient(listOf(Color(0xFFF8FAFC), Color(0xFFF1F5F9), Color(0xFFEEF2FF)))
        Box(modifier = Modifier.fillMaxSize().background(pageShellGradient)) {
            PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = { viewModel.load() },
                modifier = Modifier.fillMaxSize().padding(padding),
            ) {
            when {
                state.loading && state.posts.isEmpty() -> {
                    // Stalled loading state check
                    val isStalled = remember(loadingStartTime) {
                        loadingStartTime > 0 && (System.currentTimeMillis() - loadingStartTime) > 15_000
                    }
                    if (isStalled) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Card(
                                modifier = Modifier.padding(16.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                            ) {
                                Column(
                                    modifier = Modifier.padding(20.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Icon(Icons.Outlined.Inventory2, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.error)
                                    Text(stringResource(R.string.home_loading_slow), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                    Text(stringResource(R.string.home_feed_unavailable), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        androidx.compose.material3.OutlinedButton(onClick = {
                                            filters = PostFilters()
                                            quickFilter = null
                                            selectedCategory = null
                                            searchQuery = ""
                                        }) {
                                            Text(stringResource(R.string.home_reset_filters))
                                        }
                                        androidx.compose.material3.Button(onClick = { viewModel.load(initial = true) }) {
                                            Text(stringResource(R.string.home_retry))
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        PostGridShimmer(
                            count = 6,
                            modifier = Modifier.fillMaxSize().padding(top = 8.dp),
                        )
                    }
                }
                state.error != null && state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = "Feed unavailable",
                        message = state.error ?: "Could not load posts.",
                        onRetry = { viewModel.load(initial = true) },
                        retryLabel = "Reload feed",
                    )
                }
                state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppEmptyState(icon = Icons.Outlined.Inventory2, title = "No listings yet", subtitle = "Pull to refresh or create the first listing.")
                }
                else -> LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(bottom = 100.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    // Category hero banner when inside a category app
                    if (categoryTheme != null) {
                        item {
                            CategoryHeroBanner(
                                theme = categoryTheme,
                                listingsCount = state.posts.size,
                                onChangeApp = onChangeApp,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                        // Quick access row (Cart, Wishlist, Recently Viewed)
                        item {
                            QuickAccessRow(
                                onOpenCart = onOpenCart,
                                onOpenWishlist = onOpenWishlist,
                                onOpenRecentlyViewed = onOpenRecentlyViewed,
                                accentColor = categoryTheme.gradient.first(),
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            )
                        }
                    } else {
                        // ── Heroic banner (web parity: AllPosts.jsx hero section) ──
                        item {
                            AllPostsHeroBanner(
                                listingsCount = state.posts.size,
                                onExplore = onOpenExplore,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                        // Great Deals promotional banner
                        item {
                            com.mhub.app.ui.components.GreatDealsBanner(
                                onShopNow = { quickFilter = "Under ₹500" },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                        // Promoted posts strip (web-parity: AllPosts.jsx promoted_strip)
                        val promotedPosts = state.posts.filter { it.isPromoted == true }.take(6)
                        if (promotedPosts.isNotEmpty()) {
                            item {
                                Column(Modifier.fillMaxWidth()) {
                                    Row(
                                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(androidx.compose.material.icons.Icons.Default.Campaign, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(stringResource(R.string.allposts_promoted), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFFF59E0B))
                                    }
                                    LazyRow(
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                                    ) {
                                        items(promotedPosts, key = { "promo-${it.stableId}" }) { post ->
                                            Surface(
                                                onClick = { onOpenPost(post.stableId) },
                                                shape = androidx.compose.foundation.shape.RoundedCornerShape(14.dp),
                                                color = Color.White,
                                                shadowElevation = 3.dp,
                                                modifier = Modifier.width(160.dp),
                                            ) {
                                                Column {
                                                    Box(Modifier.fillMaxWidth().height(100.dp)) {
                                                        if (post.primaryImage != null) {
                                                            coil.compose.AsyncImage(
                                                                model = post.primaryImage, contentDescription = null,
                                                                contentScale = ContentScale.Crop,
                                                                modifier = Modifier.fillMaxSize().clip(
                                                                    androidx.compose.foundation.shape.RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)
                                                                ),
                                                            )
                                                        }
                                                        // Promo badge
                                                        Surface(
                                                            shape = androidx.compose.foundation.shape.RoundedCornerShape(bottomEnd = 8.dp),
                                                            color = Color(0xFFF59E0B),
                                                            modifier = Modifier.align(Alignment.TopStart),
                                                        ) {
                                                            Text(
                                                                "Promoted",
                                                                fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White,
                                                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                                                            )
                                                        }
                                                    }
                                                    Column(Modifier.padding(8.dp)) {
                                                        Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, color = Color(0xFF1E293B))
                                                        if (post.price != null) Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF2563EB))
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    HorizontalDivider(Modifier.padding(horizontal = 12.dp, vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                }
                            }
                        }
                    }

                    if (showSearch) {
                        item {
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text(stringResource(R.string.home_search_placeholder)) },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                trailingIcon = {
                                    if (searchQuery.isNotBlank()) {
                                        IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Close, contentDescription = "Clear") }
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
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                            )
                        }
                    }

                    // Active filter badges: show when filters are applied
                    val hasActiveFilters = selectedCategory != null || filters.condition != "Any" || filters.location.isNotBlank() ||
                            filters.verifiedOnly || filters.minPrice > 0f || filters.maxPrice < 100000f ||
                            filters.startDate != null || filters.endDate != null
                    if (hasActiveFilters) {
                        item {
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                            ) {
                                if (selectedCategory != null) {
                                    item {
                                        InputChip(
                                            selected = true,
                                            onClick = { selectedCategory = null },
                                            label = { Text(selectedCategory!!, style = MaterialTheme.typography.labelSmall) },
                                            trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(16.dp)) },
                                        )
                                    }
                                }
                                if (filters.condition != "Any") {
                                    item {
                                        InputChip(
                                            selected = true,
                                            onClick = { filters = filters.copy(condition = "Any") },
                                            label = { Text(filters.condition, style = MaterialTheme.typography.labelSmall) },
                                            trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(16.dp)) },
                                        )
                                    }
                                }
                                if (filters.location.isNotBlank()) {
                                    item {
                                        InputChip(
                                            selected = true,
                                            onClick = { filters = filters.copy(location = "") },
                                            label = { Text(filters.location, style = MaterialTheme.typography.labelSmall) },
                                            trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(16.dp)) },
                                        )
                                    }
                                }
                                if (filters.verifiedOnly) {
                                    item {
                                        InputChip(
                                            selected = true,
                                            onClick = { filters = filters.copy(verifiedOnly = false) },
                                            label = { Text(stringResource(R.string.home_verified_only_label), style = MaterialTheme.typography.labelSmall) },
                                            trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(16.dp)) },
                                        )
                                    }
                                }
                                if (filters.minPrice > 0f || filters.maxPrice < 100000f) {
                                    item {
                                        InputChip(
                                            selected = true,
                                            onClick = { filters = filters.copy(minPrice = 0f, maxPrice = 100000f) },
                                            label = { Text("₹${"%,.0f".format(filters.minPrice)}-₹${"%,.0f".format(filters.maxPrice)}", style = MaterialTheme.typography.labelSmall) },
                                            trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(16.dp)) },
                                        )
                                    }
                                }
                                if (filters.startDate != null || filters.endDate != null) {
                                    item {
                                        InputChip(
                                            selected = true,
                                            onClick = { filters = filters.copy(startDate = null, endDate = null) },
                                            label = {
                                                Text(
                                                    "${filters.startDate?.format(DateTimeFormatter.ofPattern("MMM dd")) ?: "Start"} - ${filters.endDate?.format(DateTimeFormatter.ofPattern("MMM dd")) ?: "End"}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                )
                                            },
                                            trailingIcon = { Icon(Icons.Default.Close, null, Modifier.size(16.dp)) },
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Subcategory chips (category app) or category chips (all-posts)
                    if (categoryTheme != null && state.subcategories.isNotEmpty()) {
                        item {
                            SubcategoryStrip(
                                subcategories = state.subcategories,
                                selected = state.selectedSubcategory,
                                accentColor = categoryTheme.gradient.first(),
                                onSelect = { viewModel.selectSubcategory(it) },
                            )
                        }
                    } else if (state.categories.isNotEmpty()) {
                        item {
                            CategoriesStrip(categories = state.categories, selected = selectedCategory, onSelect = { tapped ->
                                selectedCategory = if (tapped.isBlank() || selectedCategory == tapped) null else tapped
                            })
                        }
                    }

                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                        ) {
                            items(SortOption.entries, key = { it.name }) { option ->
                                FilterChip(
                                    selected = sortBy == option,
                                    onClick = { sortBy = option },
                                    label = { Text(option.label, style = MaterialTheme.typography.labelMedium) },
                                    leadingIcon = when (option) {
                                        SortOption.POPULAR -> ({ Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null, modifier = Modifier.size(14.dp)) })
                                        SortOption.NEWEST -> ({ Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(14.dp)) })
                                        else -> null
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }

                    // Quick filter chips (web parity: price tiers + time + location)
                    item {
                        Column {
                            // Price filter row
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 2.dp),
                            ) {
                                val priceFilters = listOf(
                                    "Under ₹1K" to Icons.Default.LocalOffer,
                                    "₹500–₹2K" to Icons.Default.LocalOffer,
                                    "₹2K–₹10K" to Icons.Default.LocalOffer,
                                    "Above ₹10K" to Icons.Default.LocalOffer,
                                )
                                items(priceFilters, key = { it.first }) { (label, icon) ->
                                    FilterChip(
                                        selected = quickFilter == label,
                                        onClick = { quickFilter = if (quickFilter == label) null else label },
                                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                        leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(12.dp)) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.tertiary,
                                            selectedLabelColor = MaterialTheme.colorScheme.onTertiary,
                                            selectedLeadingIconColor = MaterialTheme.colorScheme.onTertiary,
                                        ),
                                    )
                                }
                            }
                            // Time + location filter row
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 2.dp),
                            ) {
                                val moreFilters = listOf(
                                    "Latest 5" to Icons.AutoMirrored.Filled.Sort,
                                    "Latest 10" to Icons.AutoMirrored.Filled.Sort,
                                    "Posted Today" to Icons.Default.NewReleases,
                                    "Near Me" to Icons.Default.LocationOn,
                                )
                                items(moreFilters, key = { it.first }) { (label, icon) ->
                                    FilterChip(
                                        selected = quickFilter == label,
                                        onClick = { quickFilter = if (quickFilter == label) null else label },
                                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                        leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(12.dp)) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = Color(0xFF8B5CF6),
                                            selectedLabelColor = Color.White,
                                            selectedLeadingIconColor = Color.White,
                                        ),
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("${filteredPosts.size} listing${if (filteredPosts.size != 1) "s" else ""}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (selectedCategory != null) {
                                Spacer(Modifier.width(6.dp))
                                Text(stringResource(R.string.home_in_category, selectedCategory!!), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium)
                            }
                        }
                    }

                    if (filteredPosts.isEmpty()) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                                AppEmptyState(icon = Icons.Outlined.Inventory2, title = "No results", subtitle = "Try a different filter or search term.")
                            }
                        }
                    } else if (gridMode) {
                        items(filteredPosts.chunked(2), key = { row -> row.joinToString("-") { it.stableId } }) { row ->
                            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                row.forEach { post ->
                                    GridPostCard(
                                        post = post,
                                        onClick = { onOpenPost(post.stableId) },
                                        modifier = Modifier.weight(1f),
                                        pageDensity = pageDensity,
                                    )
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    } else {
                        items(filteredPosts, key = { it.stableId }) { post ->
                            ListPostCard(
                                post = post,
                                onClick = { onOpenPost(post.stableId) },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                onShare = {
                                    sharePostId = post.stableId
                                    sharePostTitle = post.displayTitle
                                    showShareSheet = true
                                },
                                onInterested = {
                                    interestPostId = post.stableId
                                    interestPostTitle = post.displayTitle
                                    showInterestModal = true
                                },
                                onCompare = {
                                    if (compareItems.none { it.stableId == post.stableId }) {
                                        if (compareItems.size < 4) {
                                            compareItems = compareItems + post
                                        }
                                    } else {
                                        compareItems = compareItems.filter { it.stableId != post.stableId }
                                    }
                                },
                                onPromote = {
                                    promotePostId = post.stableId
                                    promotePostTitle = post.displayTitle
                                    showPromoteDialog = true
                                },
                                isInCompare = compareItems.any { it.stableId == post.stableId },
                                pageDensity = pageDensity,
                            )
                        }
                    }

                    // Guest preview sign-in card (shown after 5 posts for guests)
                    if (isGuest && filteredPosts.size >= 5) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Icon(Icons.Default.Visibility, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.primary)
                                    Text(stringResource(R.string.home_guest_title), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                    Text(stringResource(R.string.home_guest_subtitle), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                    androidx.compose.material3.Button(
                                        onClick = onNavigateToLogin,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Text(stringResource(R.string.home_guest_sign_in))
                                    }
                                }
                            }
                        }
                    }

                    // Infinite scroll: load more when reaching end
                    if (state.hasMore && filteredPosts.isNotEmpty()) {
                        item {
                            LaunchedEffect(Unit) { viewModel.loadMore() }
                            if (state.loadingMore) {
                                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                                }
                            }
                        }
                    }
                }
            }
            }
            
            // Compare panel floater bar
            AnimatedVisibility(
                visible = compareItems.isNotEmpty(),
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 80.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(50.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shadowElevation = 8.dp,
                    modifier = Modifier.padding(16.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Compare, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary)
                        Text(
                            "${compareItems.size} item${if (compareItems.size != 1) "s" else ""} selected",
                            fontWeight = FontWeight.SemiBold,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        androidx.compose.material3.Button(
                            onClick = { showCompareDialog = true },
                            enabled = compareItems.size >= 2,
                        ) {
                            Text(stringResource(R.string.home_compare_now))
                        }
                        IconButton(onClick = { compareItems = emptyList() }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, "Clear", Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoriesStrip(categories: List<Category>, selected: String?, onSelect: (String) -> Unit) {
    Column {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Filter by Category",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        ) {
            item {
                FilterChip(
                    selected = selected == null,
                    onClick = { onSelect("") }, // empty resets
                    label = { Text("All", fontWeight = if (selected == null) FontWeight.Bold else FontWeight.Normal, style = MaterialTheme.typography.labelMedium) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                )
            }
            items(categories, key = { it.stableId }) { category ->
                val active = selected == category.displayName
                FilterChip(
                    selected = active,
                    onClick = { onSelect(category.displayName) },
                    label = { Text(category.displayName, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = if (active) FontWeight.Bold else FontWeight.Normal, style = MaterialTheme.typography.labelMedium) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    ),
                )
            }
        }
    }
}

@Composable
fun ListPostCard(
    post: Post,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    onShare: (() -> Unit)? = null,
    onInterested: (() -> Unit)? = null,
    onCompare: (() -> Unit)? = null,
    onPromote: (() -> Unit)? = null,
    isOwner: Boolean = false,
    isInCompare: Boolean = false,
    pageDensity: PageDensity = PageDensity.NORMAL,
) {
    var wishlisted by remember { mutableStateOf(false) }
    var liked by remember { mutableStateOf(false) }
    val allImages = remember(post) {
        buildList {
            post.primaryImage?.let { add(it) }
            post.images.filter { it != post.primaryImage }.forEach { add(it) }
        }
    }
    val cardPadding = pageDensity.cardPadding.dp
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column {
            // Seller header row
            if (post.sellerName != null || post.userName != null) {
                val name = post.sellerName ?: post.userName ?: "Seller"
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = cardPadding, vertical = cardPadding),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(28.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(name.take(1).uppercase(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                        Spacer(Modifier.width(6.dp))
                        Text(name, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 160.dp))
                        if (post.sellerName != null) {
                            Spacer(Modifier.width(4.dp))
                            Icon(Icons.Default.VerifiedUser, contentDescription = "Verified", tint = Color(0xFF3B82F6), modifier = Modifier.size(14.dp))
                        }
                    }
                    Spacer(Modifier.weight(1f))
                }
            }
            Box(modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
                if (allImages.size > 1) {
                    val pagerState = rememberPagerState(pageCount = { allImages.size })
                    val scope = rememberCoroutineScope()
                    HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                        AsyncImage(model = allImages[page], contentDescription = post.displayTitle, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)))
                    }
                    
                    // Carousel navigation arrows
                    if (pagerState.currentPage > 0) {
                        IconButton(
                            onClick = {
                                scope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage - 1)
                                }
                            },
                            modifier = Modifier.align(Alignment.CenterStart).padding(8.dp).size(32.dp).background(Color.Black.copy(alpha = 0.5f), CircleShape),
                        ) {
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "Previous", tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                    }
                    if (pagerState.currentPage < allImages.size - 1) {
                        IconButton(
                            onClick = {
                                scope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage + 1)
                                }
                            },
                            modifier = Modifier.align(Alignment.CenterEnd).padding(8.dp).size(32.dp).background(Color.Black.copy(alpha = 0.5f), CircleShape),
                        ) {
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "Next", tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                    }
                    
                    // Page counter overlay
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color.Black.copy(alpha = 0.6f),
                        modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
                    ) {
                        Text(
                            "${pagerState.currentPage + 1}/${allImages.size}",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                    
                    // Page indicator dots
                    Row(modifier = Modifier.align(Alignment.BottomCenter).padding(8.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        repeat(allImages.size) { i ->
                            Box(modifier = Modifier.size(if (i == pagerState.currentPage) 8.dp else 6.dp).clip(CircleShape).background(if (i == pagerState.currentPage) Color.White else Color.White.copy(alpha = 0.5f)))
                        }
                    }
                } else if (post.primaryImage != null) {
                    AsyncImage(model = post.primaryImage, contentDescription = post.displayTitle, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)))
                } else {
                    Box(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.ImageNotSupported, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(36.dp))
                    }
                }
                Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.55f)), startY = 80f)))
                post.price?.let { price ->
                    Text("INR ${"%,.0f".format(price)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.align(Alignment.BottomStart).padding(12.dp))
                }
                val heartColor by animateColorAsState(if (wishlisted) Color(0xFFEF4444) else Color.White, label = "wishlist")
                IconButton(onClick = { wishlisted = !wishlisted }, modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(36.dp).background(Color.Black.copy(alpha = 0.25f), CircleShape)) {
                    Icon(imageVector = if (wishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder, contentDescription = "Wishlist", tint = heartColor, modifier = Modifier.size(18.dp))
                }
                // Promo badges overlay
                PromoBadgeRow(modifier = Modifier.align(Alignment.TopStart).padding(8.dp))
            }
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = cardPadding, vertical = cardPadding), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(text = post.displayTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                post.categoryName?.let { cat ->
                    Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.align(Alignment.Start)) {
                        Text(cat, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    post.condition?.let { cond ->
                        Surface(shape = RoundedCornerShape(6.dp), color = if (cond.lowercase() == "new") Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant) {
                            Text(cond.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = if (cond.lowercase() == "new") Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                    post.brand?.let { b ->
                        Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                            Text(b, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                    post.sellerName?.let {
                        Icon(Icons.Default.VerifiedUser, contentDescription = "Verified", tint = Color(0xFF3B82F6), modifier = Modifier.size(14.dp))
                    }
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                        Spacer(Modifier.width(3.dp))
                        Text(post.location ?: "Nearby", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    val timeAgo = relativeTime(post.createdAt)
                    if (timeAgo.isNotBlank()) {
                        Text(timeAgo, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(8.dp))
                    }
                    post.viewCount?.let { views ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Visibility, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                            Spacer(Modifier.width(3.dp))
                            Text(views.toString(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                // Action row
                HorizontalDivider(modifier = Modifier.padding(top = 6.dp), thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
                com.mhub.app.ui.components.PostActionRow(
                    postId = post.stableId,
                    viewCount = post.viewCount ?: 0,
                    isLiked = liked,
                    isWishlisted = wishlisted,
                    onLike = { liked = !liked },
                    onWishlist = { wishlisted = !wishlisted },
                    onInterested = { onInterested?.invoke() },
                    onShare = { onShare?.invoke() },
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
                )
            }
        }
    }
}

@Composable
fun GridPostCard(
    post: Post,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    pageDensity: PageDensity = PageDensity.NORMAL,
) {
    var wishlisted by remember { mutableStateOf(false) }
    val cardPadding = pageDensity.cardPadding.dp
    Card(onClick = onClick, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp), modifier = modifier) {
        Column {
            Box(modifier = Modifier.fillMaxWidth().aspectRatio(4f / 3f)) {
                if (post.primaryImage != null) {
                    AsyncImage(model = post.primaryImage, contentDescription = post.displayTitle, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)))
                } else {
                    Box(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.ImageNotSupported, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f)), startY = 60f)))
                post.price?.let { price ->
                    Text("INR ${"%,.0f".format(price)}", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.align(Alignment.BottomStart).padding(8.dp))
                }
                val heartColor by animateColorAsState(if (wishlisted) Color(0xFFEF4444) else Color.White, label = "wishlist")
                Box(modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).size(28.dp).background(Color.Black.copy(alpha = 0.25f), CircleShape).clickable { wishlisted = !wishlisted }, contentAlignment = Alignment.Center) {
                    Icon(imageVector = if (wishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder, contentDescription = "Wishlist", tint = heartColor, modifier = Modifier.size(14.dp))
                }
                PromoBadgeRow(modifier = Modifier.align(Alignment.TopStart).padding(6.dp))
            }
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = cardPadding, vertical = cardPadding), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(text = post.displayTitle, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                    post.condition?.let { cond ->
                        Surface(shape = RoundedCornerShape(4.dp), color = if (cond.lowercase() == "new") Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant) {
                            Text(cond.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = if (cond.lowercase() == "new") Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                        }
                    }
                    post.sellerName?.let {
                        Icon(Icons.Default.VerifiedUser, contentDescription = "Verified", tint = Color(0xFF3B82F6), modifier = Modifier.size(12.dp))
                    }
                }
                post.location?.let {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(11.dp))
                        Spacer(Modifier.width(2.dp))
                        Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}
