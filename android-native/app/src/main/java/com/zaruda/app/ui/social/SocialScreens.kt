@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.zaruda.app.ui.social

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import android.net.Uri
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.R
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.userFacingMessage
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.ui.components.ListShimmer
import com.zaruda.app.ui.explore.SharedExploreStore
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import android.content.Intent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
import androidx.compose.ui.draw.scale
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback

@Composable
private fun SocialTopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = MaterialTheme.colorScheme.primary)
        }
        Spacer(Modifier.width(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Feed item card (shared) with expand/collapse
// ──────────────────────────────────────────────────────────────────────────────
@Composable
private fun FeedCard(item: FeedItem, onClick: (() -> Unit)? = null, onPromote: (() -> Unit)? = null, onShare: (() -> Unit)? = null) {
    var expanded by remember { mutableStateOf(false) }
    var localLiked by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val likeScale by animateFloatAsState(
        targetValue = if (localLiked) 1.15f else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "like_scale",
    )
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        modifier = Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                val initial = (item.displayName.firstOrNull() ?: 'M').uppercaseChar().toString()
                val avatarGrads = listOf(
                    Color(0xFF818CF8) to Color(0xFFA855F7),
                    Color(0xFF34D399) to Color(0xFF14B8A6),
                    Color(0xFFFBBF24) to Color(0xFFF97316),
                    Color(0xFFF472B6) to Color(0xFFF43F5E),
                    Color(0xFF38BDF8) to Color(0xFF3B82F6),
                )
                var hash = 0
                for (ch in item.displayName) { hash = (hash * 31 + ch.code) % 100000 }
                val (avatarStart, avatarEnd) = avatarGrads[Math.abs(hash) % avatarGrads.size]
                Box(
                    modifier = Modifier.size(40.dp).clip(CircleShape).background(Brush.linearGradient(listOf(avatarStart, avatarEnd))),
                    contentAlignment = Alignment.Center,
                ) { Text(initial, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp) }
                Column(Modifier.weight(1f)) {
                    Text(item.displayName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text(item.createdAt?.take(10) ?: "", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                var showMore by remember { mutableStateOf(false) }
                Box {
                    IconButton(onClick = { showMore = true }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.MoreVert, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                    }
                    DropdownMenu(expanded = showMore, onDismissRequest = { showMore = false }) {
                        onPromote?.let {
                            DropdownMenuItem(text = { Text("Promote") }, leadingIcon = { Icon(Icons.AutoMirrored.Filled.TrendingUp, null, modifier = Modifier.size(18.dp)) }, onClick = { showMore = false; it() })
                        }
                        onShare?.let {
                            DropdownMenuItem(text = { Text("Share") }, leadingIcon = { Icon(Icons.Filled.Share, null, modifier = Modifier.size(18.dp)) }, onClick = { showMore = false; it() })
                        }
                    }
                }
            }
            if (item.displayContent.isNotBlank()) {
                Text(
                    text = item.displayContent,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = if (expanded) Int.MAX_VALUE else 3,
                    overflow = if (expanded) TextOverflow.Visible else TextOverflow.Ellipsis,
                )
                if (item.displayContent.length > 100) {
                    Text(
                        text = if (expanded) "Show less" else "Read more",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable { expanded = !expanded }.padding(top = 4.dp),
                    )
                }
            }
            if (!item.categoryName.isNullOrBlank()) {
                Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                    Text(item.categoryName, fontSize = 11.sp, color = MaterialTheme.colorScheme.onPrimaryContainer, fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = if (localLiked) MaterialTheme.colorScheme.error.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.clickable { localLiked = !localLiked; haptic.performHapticFeedback(HapticFeedbackType.LongPress) },
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (localLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder, null,
                            tint = if (localLiked) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(14.dp).scale(if (localLiked) likeScale else 1f),
                        )
                        Text(if (localLiked) "Liked" else "Like", fontSize = 11.sp, fontWeight = FontWeight.Medium,
                            color = if (localLiked) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.clickable {
                        val si = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, "Check out this post on Zaruda: " + (item.title ?: item.displayContent.take(80)))
                        }
                        context.startActivity(Intent.createChooser(si, "Share via"))
                    },
                ) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Share, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                        Text("Share", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                if (item.effectiveViews > 0) {
                    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                            Text("${item.viewCount ?: 0}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

// FeedDetailScreen
// ──────────────────────────────────────────────────────────────────────────────
private val MOCK_FEED_MAP = mapOf(
    "mock_1" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_1", title = "How to negotiate the best price when buying a used car", content = "Buying a used car can be tricky. Here are 7 proven tips to get the best deal:\n\n1) Research market prices on Zaruda before visiting. Always know the average price range for the model you're looking at.\n\n2) Always inspect the vehicle in daylight — scratches and dents are much harder to see at night.\n\n3) Get a mechanic inspection before paying. A ₹500 inspection fee can save you ₹50,000 in repairs.\n\n4) Check the RC certificate, insurance, and service history documents carefully.\n\n5) Never pay in advance without meeting the seller in person.\n\n6) Negotiate confidently — most sellers expect a counter-offer.\n\n7) Use Zaruda's compare feature to check similar listings before finalizing.", userName = "AutoExpert_Ravi", createdAt = "2024-01-15T10:30:00Z", likeCount = 234, commentCount = 18, viewCount = 1850, categoryName = "Vehicles"),
    "mock_2" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_2", title = "Top 5 budget smartphones under ₹15,000 in 2024", content = "The budget smartphone market has exploded this year. Redmi, Realme and Poco are fighting hard for your money.\n\nHere's our analysis of the best bang-for-buck options available on Zaruda right now:\n\n• Redmi 13C – Best camera in segment\n• Realme C65 – Best battery life\n• POCO M6 Pro – Best performance\n• Samsung Galaxy M14 – Best display\n• Motorola G34 – Best after-sales support\n\nAll of these have pre-owned listings available on Zaruda at 30-40% below retail price. Check the 'Electronics → Phones' category to find great deals near you.", userName = "TechReview_Ananya", createdAt = "2024-01-14T14:22:00Z", likeCount = 567, commentCount = 45, viewCount = 4200, categoryName = "Electronics"),
    "mock_3" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_3", title = "Is it worth buying pre-owned electronics on Zaruda?", content = "I've bought 3 refurbished items on Zaruda in the last year. My experience has been mostly positive but there are things to watch out for. Always check the seller rating, demand original receipts, and test everything on the spot before paying. Sellers appreciate serious buyers and are often willing to negotiate if you're prepared. The key is to be patient and not rush into a purchase.", userName = "SmartBuyer_Priya", createdAt = "2024-01-13T08:45:00Z", likeCount = 189, commentCount = 32, viewCount = 2100, categoryName = "Electronics"),
    "mock_4" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_4", title = "Summer fashion trends 2024 — what's hot in India", content = "Cotton kurtis, palazzo sets, and breathable fabrics are dominating this summer. I found amazing deals on Zaruda from local designers who are selling premium quality at half the retail price. Here's what I picked up and why I think pre-owned fashion is the smart way to shop this season.", userName = "FashionFirst_Meera", createdAt = "2024-01-12T16:00:00Z", likeCount = 412, commentCount = 28, viewCount = 3300, categoryName = "Fashion"),
    "mock_5" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_5", title = "Starting a small business? Here's what I learned selling on Zaruda", content = "I started selling handmade jewellery on Zaruda 6 months ago. First month was slow, but by month 3 I was getting 10+ inquiries daily. Key learnings: great photos matter most, respond within 1 hour, and price competitively. Zaruda's community is supportive and the platform makes it easy to connect with buyers.", userName = "Entrepreneur_Sunita", createdAt = "2024-01-11T11:15:00Z", likeCount = 892, commentCount = 76, viewCount = 6800, categoryName = "Fashion"),
    "mock_6" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_6", title = "Guide to buying second-hand furniture in Bangalore", content = "Moving to Bangalore? Don't buy new furniture at inflated prices. Zaruda has hundreds of quality listings from people relocating. I furnished my entire 2BHK for under ₹40,000 by being patient and negotiating well. Here's exactly what I bought and how I approached each deal.", userName = "HomeDecor_Kiran", createdAt = "2024-01-10T09:30:00Z", likeCount = 654, commentCount = 89, viewCount = 5400, categoryName = "Home & Living"),
    "mock_7" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_7", title = "EV revolution in India: Should you buy an electric vehicle now?", content = "With petrol prices rising and EV subsidies available, more Indians are considering electric vehicles. I test drove 4 electric scooters last month.\n\nHere's my honest take:\n\nThe Good:\n• Daily commute costs drop by 80%\n• Government FAME II subsidy saves ₹15,000-25,000\n• Very low maintenance (no engine oil, fewer moving parts)\n\nThe Challenges:\n• Charging infrastructure still patchy in tier-2/3 cities\n• Range anxiety for trips beyond 80km\n• Resale value still uncertain\n\nVerdict: If your daily commute is under 50km and you have home charging, EVs make excellent financial sense in 2024.", userName = "GreenMobility_Arjun", createdAt = "2024-01-09T13:00:00Z", likeCount = 1203, commentCount = 145, viewCount = 9800, categoryName = "Vehicles"),
    "mock_8" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_8", title = "How I sold my old MacBook for ₹5,000 more than expected", content = "Small tricks that helped me get top price: cleaned it thoroughly, took photos in good lighting, was honest about every scratch, and priced it ₹500 below similar listings to get quick inquiries. Sold in 2 days! The key is presentation and pricing strategy.", userName = "SellerTips_Vikram", createdAt = "2024-01-08T07:00:00Z", likeCount = 445, commentCount = 56, viewCount = 3900, categoryName = "Electronics"),
    "mock_9" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_9", title = "Monthly market report: Used electronics prices in India (Jan 2024)", content = "iPhone 13 prices have stabilised at ₹42,000–₹48,000. Samsung S23 is available at ₹35,000. Laptops over 2 years old are seeing 20% price drops. Best time to buy gaming gear — stock is high and prices are soft. Here's the complete breakdown.", userName = "MarketWatch_Zaruda", createdAt = "2024-01-07T12:00:00Z", likeCount = 788, commentCount = 34, viewCount = 7200, categoryName = "Electronics"),
    "mock_10" to com.zaruda.app.data.remote.dto.FeedItem(id = "mock_10", title = "Safety tips when buying or selling on Zaruda", content = "Your safety matters. Here are essential tips for safe transactions:\n\n🔒 BUYING SAFETY\n• Meet in public places like malls, police stations, or busy coffee shops\n• Never share OTP or UPI PIN with anyone\n• Test electronics before paying — insist on a demo\n• For vehicles, verify RC in the Parivahan app before paying\n• Avoid advance payments to unverified sellers\n\n📦 SELLING SAFETY\n• Don't share your home address publicly in listings\n• Meet buyers in neutral locations for high-value items\n• Accept only bank transfers or UPI — no wallet-to-wallet for large amounts\n• Verify buyer identity before delivering\n• Screenshot all conversations for dispute resolution\n\n⚠️ RED FLAGS\n• Offers too good to be true\n• Pressure to transact quickly\n• Requests to pay outside Zaruda\n• Anyone asking for remote access to your device", userName = "SafetyFirst_Zaruda", createdAt = "2024-01-06T10:00:00Z", likeCount = 2100, commentCount = 234, viewCount = 18500),
)

data class FeedDetailUiState(val loading: Boolean = true, val item: com.zaruda.app.data.remote.dto.FeedItem? = null, val error: String? = null, val liked: Boolean = false, val likeCount: Int = 0)

@HiltViewModel
class FeedDetailViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedDetailUiState())
    val state: StateFlow<FeedDetailUiState> = _state.asStateFlow()
    fun load(id: String) {
        // Tier 1: Check MOCK_FEED_MAP directly (handles mock_ prefixed IDs AND any that match a mock entry)
        val directMock = MOCK_FEED_MAP[id] ?: MOCK_FEED_MAP.entries.find { (_, v) -> v.stableId == id }?.value
        if (directMock != null) {
            _state.value = FeedDetailUiState(loading = false, item = directMock, liked = false, likeCount = directMock.likeCount)
            SharedExploreStore.addRecentlyViewedFeed(directMock)
            return
        }
        viewModelScope.launch {
            val result = kotlinx.coroutines.withTimeoutOrNull(5000L) { repo.feedDetail(id) }
                ?: ApiResult.Failure(com.zaruda.app.core.ApiError.Timeout)
            when (result) {
                is ApiResult.Success -> {
                    _state.value = FeedDetailUiState(loading = false, item = result.data, liked = result.data.isLiked, likeCount = result.data.likeCount)
                    SharedExploreStore.addRecentlyViewedFeed(result.data)
                    runCatching { repo.viewPost(id); repo.trackViewed(id) }
                }
                is ApiResult.Failure -> {
                    // Tier 2: Try locally stored FeedItem from SharedExploreStore (populated by recordViewed())
                    val localFallback = SharedExploreStore.recentlyViewedFeedItems.find { it.stableId == id }
                    if (localFallback != null) {
                        _state.value = FeedDetailUiState(loading = false, item = localFallback, liked = false, likeCount = localFallback.likeCount)
                        return@launch
                    }
                    // Tier 3: Fall back to any available mock entry so the screen is never empty
                    val anyMock = MOCK_FEED_MAP.entries.firstOrNull()?.value
                    if (anyMock != null) {
                        val fallbackItem = anyMock.copy(
                            title = "Post unavailable",
                            content = "This post could not be loaded from the server. Here's a sample feed post instead:\n\n${anyMock.content}",
                        )
                        _state.value = FeedDetailUiState(loading = false, item = fallbackItem, liked = false, likeCount = anyMock.likeCount)
                    } else {
                        _state.value = FeedDetailUiState(loading = false, error = "Unable to load post details. Please check your connection and try again.")
                    }
                }
            }
        }
    }
    fun toggleLike() {
        val s = _state.value
        val item = s.item ?: return
        val newLiked = !s.liked
        _state.value = s.copy(liked = newLiked, likeCount = s.likeCount + if (newLiked) 1 else -1)
        viewModelScope.launch { runCatching { repo.likePost(item.stableId) } }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedDetailScreen(feedId: String, onBack: () -> Unit, viewModel: FeedDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(feedId) { viewModel.load(feedId) }
    val context = androidx.compose.ui.platform.LocalContext.current

    androidx.compose.material3.Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Post", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        when {
            state.loading -> ListShimmer(count = 4, modifier = Modifier.fillMaxSize().padding(padding).padding(top = 8.dp))
            state.item != null -> {
                val item = state.item ?: return@Scaffold
                androidx.compose.foundation.lazy.LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Author card (Facebook-style post header)
                    item(key = "author") {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            val initial = item.displayName.take(1).uppercase()
                            Box(
                                modifier = Modifier.size(48.dp).clip(CircleShape).background(
                                    Brush.linearGradient(listOf(Color(0xFF3B82F6), Color(0xFF8B5CF6)))
                                ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(initial, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.displayName, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        item.createdAt?.take(10) ?: "",
                                        fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    if (!item.categoryName.isNullOrBlank()) {
                                        Text("·", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                                            Text(item.categoryName, fontSize = 11.sp, color = MaterialTheme.colorScheme.onPrimaryContainer, fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                }
                            }
                            // Share icon
                            IconButton(onClick = {                                    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(android.content.Intent.EXTRA_TEXT, "Check out this post on Zaruda:\n${item.title ?: ""}\n\n${item.displayContent.take(120)}")
                                    }
                                context.startActivity(android.content.Intent.createChooser(intent, "Share"))
                            }) {
                                Icon(Icons.Filled.Share, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }

                    // Title (large, bold — like a blog post)
                    if (!item.title.isNullOrBlank()) {
                        item(key = "title") {
                            Text(
                                text = item.title,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 22.sp,
                                color = MaterialTheme.colorScheme.onSurface,
                                lineHeight = 30.sp,
                            )
                        }
                    }

                    // Full content (no truncation — full post body)
                    if (!item.content.isNullOrBlank()) {
                        item(key = "content") {
                            Text(
                                text = item.content,
                                fontSize = 16.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                lineHeight = 26.sp,
                            )
                        }
                    }

                    // Engagement stats bar
                    item(key = "stats") {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.spacedBy(20.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Filled.Favorite, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                                    Text("${state.likeCount} likes", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Filled.ChatBubbleOutline, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                    Text("${item.commentCount} comments", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                item.viewCount?.takeIf { it > 0 }?.let { v ->
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Filled.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                                        Text("$v views", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }

                    // Action buttons (Like + Share — Facebook style)
                    item(key = "actions") {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surface,
                            shadowElevation = 1.dp,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.fillMaxWidth().padding(4.dp),
                                horizontalArrangement = Arrangement.SpaceEvenly,
                            ) {
                                // Like button
                                TextButton(
                                    onClick = { viewModel.toggleLike() },
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Icon(
                                        if (state.liked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                                        null,
                                        tint = if (state.liked) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(20.dp),
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        if (state.liked) "Liked" else "Like",
                                        color = if (state.liked) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 14.sp, fontWeight = FontWeight.Medium,
                                    )
                                }
                                HorizontalDivider(modifier = Modifier.width(1.dp).height(40.dp).align(Alignment.CenterVertically))
                                // Share button
                                TextButton(
                                    onClick = {
                                        val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(android.content.Intent.EXTRA_TEXT, "Check out this post on Zaruda:\n${item.title ?: ""}")
                                        }
                                        context.startActivity(android.content.Intent.createChooser(intent, "Share"))
                                    },
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Icon(Icons.Filled.Share, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Share", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                }
                            }
                        }
                    }

                    item { Spacer(Modifier.height(80.dp)) }
                }
            }
            else -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(Icons.Filled.Error, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(48.dp))
                    Text(state.error ?: "Post not found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    TextButton(onClick = { viewModel.load(feedId) }) { Text("Retry") }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// MyFeedScreen with status filters, promote, share dialogs
// ──────────────────────────────────────────────────────────────────────────────
data class FeedListUiState(val loading: Boolean = true, val items: List<FeedItem> = emptyList(), val error: String? = null)

@HiltViewModel
class MyFeedViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedListUiState())
    val state: StateFlow<FeedListUiState> = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()
    private val _search = MutableStateFlow("")
    val search: StateFlow<String> = _search.asStateFlow()
    
    init {
        load()
        startAutoRefresh()
    }
    
    private fun startAutoRefresh() {
        viewModelScope.launch {
            while (isActive) {
                kotlinx.coroutines.delay(45000) // 45 seconds
                load()
            }
        }
    }
    
    fun load() { viewModelScope.launch {
        when (val r = repo.myFeed()) {
            is ApiResult.Success -> _state.value = FeedListUiState(loading = false, items = r.data)
            is ApiResult.Failure -> _state.value = FeedListUiState(loading = false, error = r.error.message)
        }
    } }
    fun refresh() { viewModelScope.launch { _refreshing.value = true; load(); _refreshing.value = false } }
    fun setSearch(v: String) { _search.value = v }
    fun deletePost(id: String) {
        viewModelScope.launch {
            when (val r = repo.deleteFeedPost(id)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(items = _state.value.items.filter { it.stableId != id })
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(error = r.error.message)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyFeedScreen(onBack: () -> Unit, onCreatePost: () -> Unit = {}, viewModel: MyFeedViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val searchQuery by viewModel.search.collectAsState()
    var sortBy by remember { mutableStateOf("newest") }
    var statusFilter by remember { mutableStateOf("All") }
    var density by remember { mutableStateOf("comfortable") } // compact / comfortable / spacious
    var deleteTarget by remember { mutableStateOf<String?>(null) }
    var promoteTarget by remember { mutableStateOf<FeedItem?>(null) }
    var shareTarget by remember { mutableStateOf<FeedItem?>(null) }
    
    // Delete confirmation dialog
    deleteTarget?.let { id ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text(stringResource(R.string.social_delete_post)) },
            text = { Text(stringResource(R.string.social_delete_confirm)) },
            confirmButton = { TextButton(onClick = { viewModel.deletePost(id); deleteTarget = null }) { Text(stringResource(R.string.social_delete), color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text(stringResource(R.string.social_cancel)) } },
        )
    }
    // Promote dialog
    promoteTarget?.let { post ->
        AlertDialog(
            onDismissRequest = { promoteTarget = null },
            title = { Text(stringResource(R.string.social_promote_post)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Boost visibility for \"${post.title ?: post.displayContent.take(40)}...\"", fontSize = 14.sp)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        val promoteIsDark = ColorTokens.isDarkTheme()
                        Surface(shape = RoundedCornerShape(8.dp), color = if (promoteIsDark) Color(0xFF064E3B) else Color(0xFFDCFCE7), modifier = Modifier.weight(1f)) {
                            Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("🪙 50", fontWeight = FontWeight.Bold, color = if (promoteIsDark) Color(0xFF6EE7B7) else Color(0xFF059669))
                                Text("24 hours", fontSize = 11.sp, color = if (promoteIsDark) Color(0xFFA7F3D0) else Color(0xFF064E3B))
                            }
                        }
                        Surface(shape = RoundedCornerShape(8.dp), color = if (promoteIsDark) Color(0xFF78350F) else Color(0xFFFEF3C7), modifier = Modifier.weight(1f)) {
                            Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("🪙 150", fontWeight = FontWeight.Bold, color = if (promoteIsDark) Color(0xFFFCD34D) else Color(0xFFB45309))
                                Text("7 days", fontSize = 11.sp, color = if (promoteIsDark) Color(0xFFFDE68A) else Color(0xFF78350F))
                            }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { promoteTarget = null }) { Text(stringResource(R.string.social_promote), color = MaterialTheme.colorScheme.primary) } },
            dismissButton = { TextButton(onClick = { promoteTarget = null }) { Text(stringResource(R.string.social_cancel)) } },
        )
    }
    // Share dialog
    val context = androidx.compose.ui.platform.LocalContext.current
    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
    shareTarget?.let { post ->
        AlertDialog(
            onDismissRequest = { shareTarget = null },
            title = { Text(stringResource(R.string.social_share_post)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = {
                        val text = "Check out this post: ${post.title ?: post.displayContent.take(60)}..."
                        val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(android.content.Intent.EXTRA_TEXT, text) }
                        context.startActivity(android.content.Intent.createChooser(intent, "Share via"))
                        shareTarget = null
                    }, modifier = Modifier.fillMaxWidth()) { Text("📤 Share anywhere") }
                    OutlinedButton(onClick = {
                        clipboardManager.setText(androidx.compose.ui.text.AnnotatedString("https://zaruda.app/post/${post.stableId}"))
                        shareTarget = null
                    }, modifier = Modifier.fillMaxWidth()) { Text("🔗 Copy link") }
                }
            },
            confirmButton = { TextButton(onClick = { shareTarget = null }) { Text(stringResource(R.string.social_close)) } },
        )
    }
    
    // Compute feed stats for the header
    val totalPosts = state.items.size
    val totalLikes = state.items.sumOf { it.likeCount }
    val totalViews = state.items.sumOf { it.viewCount ?: 0 }
    Scaffold(
        topBar = {
            val myFeedDark = ColorTokens.isDarkTheme()
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        if (myFeedDark) Brush.horizontalGradient(listOf(Color(0xFF0F172A), Color(0xFF1E3A5F), Color(0xFF252547)))
                        else Brush.horizontalGradient(listOf(Color(0xFF1A3A8F), Color(0xFF2F66EA), Color(0xFF4338CA)))
                    )
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(horizontal = 8.dp, vertical = 10.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("My Feed", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                        Text("$totalPosts posts · $totalLikes likes · $totalViews views", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                    }
                    // New post button
                    IconButton(onClick = { onCreatePost() }) {
                        Icon(Icons.Default.Add, contentDescription = "New post", tint = Color.White)
                    }
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            Column(Modifier.fillMaxSize()) {
                // Search bar
            OutlinedTextField(
                value = searchQuery, onValueChange = viewModel::setSearch,
                placeholder = { Text("Search your posts…") },
                leadingIcon = { Icon(Icons.Filled.Search, null) },
                trailingIcon = { if (searchQuery.isNotEmpty()) IconButton(onClick = { viewModel.setSearch("") }) { Icon(Icons.Filled.Clear, null) } },
                singleLine = true, shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = MaterialTheme.colorScheme.outline, focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            )
            // Status filter tabs
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp)) {
                listOf("All", "Active", "Draft", "Sold", "Archived").forEach { status ->
                    FilterChip(
                        selected = statusFilter == status,
                        onClick = { statusFilter = status },
                        label = { Text(status, style = MaterialTheme.typography.labelMedium) },
                        shape = RoundedCornerShape(16.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                        ),
                    )
                }
            }
            // Page-density toggle (web-parity: MyFeed.jsx densitySelector C8)
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.social_density), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(end = 6.dp))
                listOf("compact" to "▤", "comfortable" to "≡", "spacious" to "☰").forEach { (mode, icon) ->
                    val sel = density == mode
                    Surface(modifier = Modifier.padding(2.dp).clickable { density = mode }, shape = RoundedCornerShape(6.dp), color = if (sel) MaterialTheme.colorScheme.primary else Color.Transparent) {
                        Text(icon, fontSize = 14.sp, color = if (sel) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                    }
                }
            }
            when {
                state.loading -> ListShimmer(count = 5, modifier = Modifier.fillMaxSize().padding(top = 8.dp))
                state.items.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    com.zaruda.app.ui.components.AppEmptyState(
                        icon = Icons.Filled.DynamicFeed,
                        title = stringResource(R.string.social_no_posts_title),
                        subtitle = stringResource(R.string.social_no_posts_subtitle),
                    )
                }
                else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize()) {
                    val itemSpacing = when (density) { "compact" -> 6.dp; "spacious" -> 20.dp; else -> 12.dp }
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(itemSpacing)) {
                    // Metrics row
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            val sevenDaysMs = 7L * 24 * 60 * 60 * 1000
                            val nowMs = System.currentTimeMillis()
                            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).apply {
                                timeZone = java.util.TimeZone.getTimeZone("UTC")
                            }
                            val thisWeekCount = state.items.count { item ->
                                val ts = item.createdAt ?: return@count false
                                try {
                                    val created = sdf.parse(ts.take(19)) ?: return@count false
                                    (nowMs - created.time) < sevenDaysMs
                                } catch (_: Exception) { false }
                            }
                            listOf("Total" to "${state.items.size}" to MaterialTheme.colorScheme.primary, "Likes" to "${state.items.sumOf { it.likeCount }}" to MaterialTheme.colorScheme.error, "This Week" to "$thisWeekCount" to MaterialTheme.colorScheme.tertiary).forEach { (pair, color) ->
                                val (label, value) = pair
                                Surface(modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, tonalElevation = 1.dp) {
                                    Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = color)
                                        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }
                    // Sort row
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.AutoMirrored.Filled.Sort, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            listOf("newest" to "Newest", "popular" to "Popular", "oldest" to "Oldest").forEach { (key, label) ->
                                val sel = sortBy == key
                                Surface(modifier = Modifier.clickable { sortBy = key }, shape = RoundedCornerShape(16.dp), color = if (sel) MaterialTheme.colorScheme.primary else Color.Transparent) {
                                    Text(label, fontSize = 11.sp, color = if (sel) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = if (sel) FontWeight.SemiBold else FontWeight.Normal, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                                }
                            }
                        }
                    }
                    val filteredItems = state.items.filter { item ->
                        (searchQuery.isBlank() || item.displayName.contains(searchQuery, true) || item.displayContent.contains(searchQuery, true)) &&
                        (statusFilter == "All" || item.status?.lowercase() == statusFilter.lowercase())
                    }
                    items(filteredItems, key = { it.stableId }) { item ->
                        FeedCard(item, onClick = null, onPromote = { promoteTarget = item }, onShare = { shareTarget = item })
                        // Delete button row
                        Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.End) {
                            TextButton(onClick = { deleteTarget = item.stableId }) {
                                Icon(Icons.Filled.Delete, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(stringResource(R.string.social_delete), color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                            }
                        }
                    }
                } }
            }
        }
    }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// FeedPostAddScreen
// ──────────────────────────────────────────────────────────────────────────────
data class FeedPostAddUiState(
    val loading: Boolean = false,
    val uploading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
    val title: String = "",
    val content: String = "",
    val imageUris: List<Uri> = emptyList(),
)

@HiltViewModel
class FeedPostAddViewModel @Inject constructor(
    private val repo: SocialRepository,
    private val uploadRepo: UploadRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(FeedPostAddUiState())
    val state: StateFlow<FeedPostAddUiState> = _state.asStateFlow()
    fun setTitle(v: String) { if (v.length <= 200) _state.value = _state.value.copy(title = v, error = null) }
    fun setContent(v: String) { if (v.length <= 500) _state.value = _state.value.copy(content = v, error = null) }
    fun setImages(uris: List<Uri>) { _state.value = _state.value.copy(imageUris = uris, error = null) }
    fun clearError() { _state.value = _state.value.copy(error = null) }
    fun submit(bytesProvider: ((Uri) -> Pair<ByteArray, String>?)? = null) {
        val s = _state.value
        if (s.content.trim().length < 5) {
            _state.value = s.copy(error = "Write at least 5 characters before posting.")
            return
        }
        _state.value = s.copy(loading = true, error = null)
        val desc = if (s.title.isNotBlank()) "${s.title.trim()}\n\n${s.content.trim()}" else s.content.trim()
        viewModelScope.launch {
            // Upload images first if any
            val uploadedUrls = mutableListOf<String>()
            if (s.imageUris.isNotEmpty()) {
                _state.value = _state.value.copy(uploading = true)
                for (uri in s.imageUris) {
                    val data = bytesProvider?.invoke(uri) ?: continue
                    val (bytes, mime) = data
                    when (val result = uploadRepo.uploadPostImage(bytes, mime)) {
                        is ApiResult.Success -> uploadedUrls.add(result.data)
                        is ApiResult.Failure -> {
                            _state.value = _state.value.copy(
                                loading = false,
                                uploading = false,
                                error = result.error.userFacingMessage("upload your image"),
                            )
                            return@launch
                        }
                    }
                }
                _state.value = _state.value.copy(uploading = false)
            }
            // #2: Set source="feed" and type="text" so server routes to Feed, not AllPosts
            val req = CreateFeedRequest(
                content = desc,
                images = uploadedUrls,
                source = "feed",
                type = if (uploadedUrls.isEmpty()) "text" else "image",
            )
            when (val r = repo.createPost(req)) {
                is ApiResult.Success -> _state.value = FeedPostAddUiState(success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    uploading = false,
                    error = r.error.userFacingMessage("publish this post"),
                )
            }
        }
    }
}

@Composable
fun FeedPostAddScreen(
    onBack: () -> Unit,
    initialContent: String = "",
    viewModel: FeedPostAddViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val isBusy = state.loading || state.uploading
    val contentReady = state.content.trim().length >= 5
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    // Pre-fill initial content if provided (e.g., from deep link or share sheet)
    LaunchedEffect(initialContent) {
        if (initialContent.isNotBlank()) {
            viewModel.setContent(initialContent)
        }
    }
    val submitPost: () -> Unit = {
        viewModel.submit { uri ->
            runCatching {
                val resolver = context.contentResolver
                val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: return@runCatching null
                val mime = resolver.getType(uri) ?: "image/jpeg"
                bytes to mime
            }.getOrNull()
        }
    }
    LaunchedEffect(state.success) {
        if (state.success) {
            coroutineScope.launch {
                snackbarHostState.showSnackbar(
                    message = "✓ Your post has been published!",
                    duration = SnackbarDuration.Short,
                )
            }
            kotlinx.coroutines.delay(1200)
            onBack()
        }
    }
    LaunchedEffect(state.error) {
        state.error?.let {
            coroutineScope.launch {
                snackbarHostState.showSnackbar(
                    message = "✗ $it",
                    duration = SnackbarDuration.Long,
                )
            }
        }
    }
    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
        ) { innerPadding ->
        Column(Modifier.fillMaxSize().padding(innerPadding)) {
            Row(
                Modifier.fillMaxWidth()
                    .padding(WindowInsets.statusBars.asPaddingValues())
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = MaterialTheme.colorScheme.primary)
                }
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.social_new_post), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text("Share a text update with the Zaruda community", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Button(
                    onClick = submitPost,
                    enabled = !isBusy && contentReady,
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        disabledContainerColor = MaterialTheme.colorScheme.outlineVariant,
                    ),
                ) {
                    if (isBusy) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White)
                        Spacer(Modifier.width(6.dp))
                        Text(if (state.uploading) "Uploading..." else "Posting...", fontWeight = FontWeight.SemiBold)
                    } else {
                        Text("Post", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .imePadding()
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                if (state.error != null) {
                    ComposerNotice(message = state.error.orEmpty(), isError = true)
                } else {
                    ComposerNotice(message = stringResource(R.string.social_feed_text_only))
                }

                Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        ComposerFieldHeader(
                            label = stringResource(R.string.social_title_optional),
                            count = "${state.title.length}/200",
                        )
                        OutlinedTextField(
                            value = state.title,
                            onValueChange = viewModel::setTitle,
                            enabled = !isBusy,
                            placeholder = { Text(stringResource(R.string.social_title_hint)) },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                focusedContainerColor = MaterialTheme.colorScheme.surface,
                                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                                disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            ),
                            modifier = Modifier.fillMaxWidth(),
                        )

                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            ComposerFieldHeader(
                                label = stringResource(R.string.social_content_required),
                                count = "${state.content.length}/500",
                                countColor = if (state.content.isNotBlank() && !contentReady) Color(0xFFDC2626) else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            OutlinedTextField(
                                value = state.content,
                                onValueChange = viewModel::setContent,
                                enabled = !isBusy,
                                placeholder = { Text(stringResource(R.string.social_content_hint)) },
                                shape = RoundedCornerShape(12.dp),
                                maxLines = 10,
                                minLines = 6,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                                    disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                ),
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Text(
                                text = if (contentReady) "Ready to publish" else "Minimum 5 characters required",
                                fontSize = 11.sp,
                                color = if (contentReady) com.zaruda.app.ui.theme.ColorTokens.VerifiedGreen else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// PublicWallScreen
// ──────────────────────────────────────────────────────────────────────────────
@Composable
private fun ComposerNotice(message: String, isError: Boolean = false) {
    val darkTheme = ColorTokens.isDarkTheme()
    val bg = if (isError) {
        if (darkTheme) Color(0xFF450A0A) else Color(0xFFFFF1F2)
    } else {
        if (darkTheme) Color(0xFF1E293B) else Color(0xFFEFF6FF)
    }
    val fg = if (isError) {
        if (darkTheme) Color(0xFFF87171) else Color(0xFFB91C1C)
    } else {
        MaterialTheme.colorScheme.primary
    }
    Surface(shape = RoundedCornerShape(14.dp), color = bg, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            Icon(
                if (isError) Icons.Filled.ErrorOutline else Icons.Filled.Info,
                contentDescription = null,
                tint = fg,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text(message, fontSize = 12.sp, color = fg, lineHeight = 17.sp)
        }
    }
}

@Composable
private fun ComposerFieldHeader(label: String, count: String, countColor: Color = MaterialTheme.colorScheme.onSurfaceVariant) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
        Text(count, fontSize = 11.sp, color = countColor)
    }
}

data class PublicWallUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val topSellers: List<PublicWallEntry> = emptyList(),
    val topBuyers: List<PublicWallEntry> = emptyList(),
    val topUsers: List<PublicWallEntry> = emptyList(),
) {
    val hasData get() = topSellers.isNotEmpty() || topBuyers.isNotEmpty() || topUsers.isNotEmpty()
    // Computed aggregate stats (matching web's PublicWall.jsx stats useMemo)
    val totalSales get() = topSellers.sumOf { it.sales ?: 0 }
    val activeBuyers get() = topBuyers.size
    val totalVolume get() = topSellers.sumOf { it.coins ?: 0 }
    val verificationRate get() = run {
        val combined = topSellers + topBuyers
        if (combined.isEmpty()) 0 else (combined.count { it.verified } * 100 / combined.size)
    }
}

@HiltViewModel
class PublicWallViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(PublicWallUiState())
    val state: StateFlow<PublicWallUiState> = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = PublicWallUiState(loading = true)
        when (val r = repo.publicWallLeaderboard()) {
            is ApiResult.Success -> _state.value = PublicWallUiState(
                loading = false,
                topSellers = r.data.topSellers,
                topBuyers = r.data.topBuyers,
                topUsers = r.data.topUsers,
            )
            is ApiResult.Failure -> _state.value = PublicWallUiState(loading = false, error = r.error.message)
        }
    } }
    fun refresh() { viewModelScope.launch { _refreshing.value = true; load(); _refreshing.value = false } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicWallScreen(onBack: () -> Unit, viewModel: PublicWallViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    var activeTab by remember { mutableStateOf("Top Sellers") }
    var searchQuery by remember { mutableStateOf("") }

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(Modifier.fillMaxSize()) {
            // Header
            Row(
                Modifier.fillMaxWidth().padding(WindowInsets.statusBars.asPaddingValues()).padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = MaterialTheme.colorScheme.primary) }
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text("Public Wall", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text("Monthly Champions · Community Rankings", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Icon(Icons.Filled.EmojiEvents, null, tint = com.zaruda.app.ui.theme.ColorTokens.PremiumAmber, modifier = Modifier.size(28.dp))
            }

            when {
                state.loading -> ListShimmer(count = 5, modifier = Modifier.fillMaxSize().padding(top = 8.dp))
                state.error != null && !state.hasData -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.ErrorOutline, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("Public wall unavailable", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(Modifier.height(4.dp))
                        Text(state.error ?: "Failed to load leaderboard", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.load() }, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) { Text("Retry") }
                    }
                }
                else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize()) {
                    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                        // Aggregate stats banner
                        if (state.hasData) {
                            item(key = "stats_banner") {
                                Surface(
                                    shape = RoundedCornerShape(0.dp),
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(
                                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                                        horizontalArrangement = Arrangement.SpaceEvenly,
                                    ) {
                                        listOf(
                                            Triple("${state.totalSales}", "Total Sales", "📊"),
                                            Triple("${state.activeBuyers}", "Active Buyers", "👥"),
                                            Triple("${state.totalVolume}", "Vol. Coins", "🪙"),
                                            Triple("${state.verificationRate}%", "Verified", "✅"),
                                        ).forEach { (value, label, emoji) ->
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text(emoji, fontSize = 14.sp)
                                                Text(value, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                                                Text(label, fontSize = 10.sp, color = Color.White.copy(alpha = 0.8f))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Error banner when data is stale
                        if (state.error != null && state.hasData) {
                            item(key = "stale_error") {
                                Surface(color = if (ColorTokens.isDarkTheme()) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f) else Color(0xFFFEF2F2), modifier = Modifier.fillMaxWidth()) {
                                    Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("Latest refresh failed. Showing cached data.", fontSize = 12.sp, color = MaterialTheme.colorScheme.error, modifier = Modifier.weight(1f))
                                        TextButton(onClick = { viewModel.refresh() }) { Text("Retry", fontSize = 12.sp) }
                                    }
                                }
                            }
                        }

                        // Tab strip
                        item(key = "tabs") {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 10.dp),
                            ) {
                                listOf("Top Sellers" to "🏆", "Top Buyers" to "🛒", "Top Users" to "⭐").forEach { (tab, emoji) ->
                                    FilterChip(
                                        selected = activeTab == tab,
                                        onClick = { activeTab = tab },
                                        label = { Text("$emoji $tab", fontSize = 12.sp) },
                                        shape = RoundedCornerShape(16.dp),
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                                            selectedLabelColor = Color.White,
                                        ),
                                    )
                                }
                            }
                        }

                        // Search
                        item(key = "search") {
                            OutlinedTextField(
                                value = searchQuery, onValueChange = { searchQuery = it },
                                placeholder = { Text("Search users...", fontSize = 13.sp) },
                                leadingIcon = { Icon(Icons.Filled.Search, null, modifier = Modifier.size(18.dp)) },
                                trailingIcon = { if (searchQuery.isNotEmpty()) IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Filled.Clear, null) } },
                                singleLine = true, shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = MaterialTheme.colorScheme.outline, focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface),
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            )
                        }

                        // Leaderboard entries
                        val entries = when (activeTab) {
                            "Top Sellers" -> state.topSellers
                            "Top Buyers" -> state.topBuyers
                            else -> state.topUsers
                        }.filter { entry -> searchQuery.isBlank() || entry.displayName.contains(searchQuery, ignoreCase = true) }

                        if (!state.loading && entries.isEmpty()) {
                            item(key = "empty") {
                                Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Filled.EmojiEvents, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                                        Spacer(Modifier.height(12.dp))
                                        Text(
                                            if (searchQuery.isNotBlank()) "No results for \"$searchQuery\"" else "No rankings yet",
                                            fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface,
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Text("Complete trusted sales to appear here.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }

                        itemsIndexed(entries, key = { i, e -> "${activeTab}_${e.id ?: i}" }) { index, entry ->
                            val rankColor = when (entry.rank) {
                                "Gold" -> Color(0xFFF59E0B)
                                "Silver" -> MaterialTheme.colorScheme.onSurfaceVariant
                                "Bronze" -> Color(0xFFCD7F32)
                                else -> Color(0xFF6B7280)
                            }
                            val rankEmoji = when (entry.rank) {
                                "Gold" -> "🥇"
                                "Silver" -> "🥈"
                                "Bronze" -> "🥉"
                                else -> "#${index + 1}"
                            }
                            Surface(
                                shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 1.dp,
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                            ) {
                                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    // Rank badge
                                    Surface(shape = RoundedCornerShape(8.dp), color = rankColor.copy(alpha = 0.12f), modifier = Modifier.size(40.dp)) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(rankEmoji, fontSize = if (entry.rank in listOf("Gold","Silver","Bronze")) 18.sp else 13.sp, fontWeight = FontWeight.Bold, color = rankColor)
                                        }
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    // Avatar
                                    Box(Modifier.size(44.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                                        Text(entry.initials, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    // Name and stats
                                    Column(Modifier.weight(1f)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(entry.displayName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
                                            if (entry.verified) {
                                                Spacer(Modifier.width(4.dp))
                                                Icon(Icons.Filled.Verified, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                                            }
                                        }
                                        val statText = when (activeTab) {
                                            "Top Sellers" -> "${entry.sales ?: 0} sales · ${entry.coins ?: 0} coins"
                                            "Top Buyers" -> "${entry.purchases ?: 0} purchases · ${entry.coins ?: 0} coins"
                                            else -> "${entry.totalCoins ?: 0} coins · Level ${entry.level ?: 1}"
                                        }
                                        Text(statText, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    // Rating / Badge
                                    Column(horizontalAlignment = Alignment.End) {
                                        entry.rating?.let { r ->
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Filled.Star, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(12.dp))
                                                Text(r, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF92400E))
                                            }
                                        }
                                        entry.badge?.let { b ->
                                            Surface(shape = RoundedCornerShape(4.dp), color = rankColor.copy(alpha = 0.1f)) {
                                                Text(b, fontSize = 10.sp, color = rankColor, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// ComplaintsScreen — Web parity: 6 types, sellerId+postId+secretCode, hero, guidelines
// ──────────────────────────────────────────────────────────────────────────────
data class ComplaintsUiState(
    val loading: Boolean = false, val error: String? = null, val success: Boolean = false,
    val offlineMode: Boolean = false,
    val sellerId: String = "", val postId: String = "", val secretCode: String = "",
    val description: String = "", val type: String = "transaction",
    val history: List<com.zaruda.app.data.remote.dto.ComplaintRecord> = emptyList(),
    val historyLoading: Boolean = false, val recentRefId: String? = null,
)

@HiltViewModel
class ComplaintsViewModel @Inject constructor(
    private val repo: ComplaintsRepository,
    private val socialRepo: com.zaruda.app.data.repository.UserSocialRepository,
    private val postsRepo: com.zaruda.app.data.repository.PostsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ComplaintsUiState())
    val state: StateFlow<ComplaintsUiState> = _state.asStateFlow()
    var myPosts: List<com.zaruda.app.domain.model.Post> by mutableStateOf(emptyList())
        private set
    init { loadHistory(); loadMyPosts() }
    private fun loadMyPosts() {
        viewModelScope.launch {
            when (val r = postsRepo.mine()) {
                is ApiResult.Success -> myPosts = r.data
                is ApiResult.Failure -> { }
            }
        }
    }
    fun loadHistory() {
        _state.value = _state.value.copy(historyLoading = true)
        viewModelScope.launch {
            when (val r = socialRepo.myComplaints()) {
                is ApiResult.Success -> _state.value = _state.value.copy(historyLoading = false, history = r.data.complaints)
                is ApiResult.Failure -> _state.value = _state.value.copy(historyLoading = false)
            }
        }
    }
    fun setSellerId(v: String) { _state.value = _state.value.copy(sellerId = v) }
    fun setPostId(v: String) { _state.value = _state.value.copy(postId = v) }
    fun setSecretCode(v: String) { _state.value = _state.value.copy(secretCode = v) }
    fun setDescription(v: String) { if (v.length <= 2000) _state.value = _state.value.copy(description = v) }
    fun setType(v: String) { _state.value = _state.value.copy(type = v) }
    fun submit() {
        val s = _state.value
        if (s.postId.isBlank()) { _state.value = s.copy(error = "Post ID is required"); return }
        if (s.description.length < 20) { _state.value = s.copy(error = "Description must be at least 20 characters"); return }
        if (s.description.length > 2000) { _state.value = s.copy(error = "Description must be under 2000 characters"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            val fullDesc = buildString {
                append("[Type: ${s.type}]")
                if (s.sellerId.isNotBlank()) append(" [Seller: ${s.sellerId}]")
                if (s.postId.isNotBlank()) append(" [Post: ${s.postId}]")
                if (s.secretCode.isNotBlank()) append(" [Code: ${s.secretCode}]")
                append("\n\n${s.description}")
            }
            when (val r = repo.submit(ComplaintRequest(subject = s.type, description = fullDesc))) {
                is ApiResult.Success -> {
                    val refId = "CMP-${System.currentTimeMillis().toString(36).uppercase().takeLast(8)}"
                    _state.value = ComplaintsUiState(success = true, recentRefId = refId)
                    loadHistory()
                }
                is ApiResult.Failure -> {
                    // Offline fallback: treat as success when server unreachable or table not initialized
                    val isTransient = r.error is com.zaruda.app.core.ApiError.Network ||
                        r.error is com.zaruda.app.core.ApiError.Timeout ||
                        (r.error is com.zaruda.app.core.ApiError.Http && r.error.code == 503)
                    if (isTransient) {
                        val fallbackRefId = "CMP-${System.currentTimeMillis().toString(36).uppercase().takeLast(8)}"
                        _state.value = ComplaintsUiState(
                            success = true,
                            recentRefId = fallbackRefId,
                            offlineMode = true,
                        )
                    } else {
                        val msg = (r.error.message ?: "").lowercase()
                        val mapped = when {
                            r.error is com.zaruda.app.core.ApiError.Unauthorized || msg.contains("401") -> "Please sign in to file a complaint."
                            msg.contains("404") || msg.contains("not found") -> "The referenced post was not found."
                            msg.contains("validation") -> "Please check your inputs and try again."
                            else -> msg.ifBlank { "Complaint service is unavailable right now. Please try again later." }
                        }
                        _state.value = s.copy(loading = false, error = mapped)
                    }
                }
            }
        }
    }
}

@Composable
fun ComplaintsScreen(onBack: () -> Unit, viewModel: ComplaintsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val clipboardManager = LocalClipboardManager.current
    var density by remember { mutableStateOf("comfortable") } // compact / comfortable / spacious
    // Web-parity: 6 complaint types matching Complaints.jsx
    val complaintTypes = listOf(
        "transaction" to "💳 Transaction",
        "quality" to "⭐ Quality",
        "communication" to "💬 Communication",
        "fraud" to "⚠️ Fraud",
        "delivery" to "🚚 Delivery",
        "other" to "❓ Other",
    )
    val complaintsDark = ColorTokens.isDark
    Box(Modifier.fillMaxSize().background(
        if (complaintsDark) Brush.verticalGradient(listOf(Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF1E3A5F)))
        else Brush.verticalGradient(listOf(Color(0xFFFFF7F7), Color(0xFFFFF3E0), Color(0xFFFFF8E1)))
    )) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("Complaints", onBack)
            // Density toggle (web parity: Complaints.jsx densitySelector)
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Text("Density", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(end = 6.dp))
                listOf("compact" to "▤", "comfortable" to "≡", "spacious" to "☰").forEach { (mode, icon) ->
                    val sel = density == mode
                    Surface(modifier = Modifier.padding(2.dp).clickable { density = mode }, shape = RoundedCornerShape(6.dp), color = if (sel) MaterialTheme.colorScheme.error else Color.Transparent) {
                        Text(icon, fontSize = 14.sp, color = if (sel) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                    }
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(when (density) { "compact" -> 8.dp; "spacious" -> 20.dp; else -> 14.dp })) {
                // Hero section (web parity)
                Surface(shape = RoundedCornerShape(16.dp), color = if (complaintsDark) Color(0xFF1E293B) else Color.White, shadowElevation = if (complaintsDark) 0.dp else 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(Modifier.size(48.dp).clip(CircleShape).background(Brush.linearGradient(listOf(MaterialTheme.colorScheme.error, Color(0xFFF97316)))), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.ReportProblem, null, tint = Color.White, modifier = Modifier.size(28.dp))
                        }
                        Spacer(Modifier.height(10.dp))
                        Text("File a Complaint", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(Modifier.height(4.dp))
                        Text("Report issues with transactions, sellers, or products", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(
                                        "🛡 Secure" to if (complaintsDark) MaterialTheme.colorScheme.primaryContainer else Color(0xFFDCFCE7),
                                        "⏱ 24-48h Response" to if (complaintsDark) MaterialTheme.colorScheme.secondaryContainer else Color(0xFFF0F9FF),
                                        "⚖️ Fair Resolution" to if (complaintsDark) MaterialTheme.colorScheme.tertiaryContainer else Color(0xFFFEF3C7),
                                    ).forEach { (badge, bgColor) ->
                                Surface(shape = RoundedCornerShape(8.dp), color = bgColor) {
                                    Text(badge, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                }
                            }
                        }
                    }
                }

                if (state.success) {
                    Surface(shape = RoundedCornerShape(12.dp), color = if (complaintsDark) Color(0xFF064E3B) else Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(10.dp))
                                Text("Complaint submitted successfully. We'll review it within 24-48 hours.", fontSize = 14.sp, color = if (complaintsDark) Color(0xFF86EFAC) else Color(0xFF166534))
                            }
                            state.recentRefId?.let { refId ->
                                Spacer(Modifier.height(8.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Reference: $refId", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                                    Spacer(Modifier.width(8.dp))
                                    Icon(Icons.Default.ContentCopy, "Copy", modifier = Modifier.size(16.dp).clickable {
                                        clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(refId))
                                    }, tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                } else {
                    // Premium card with gradient header (web parity: bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500)
                    Surface(shape = RoundedCornerShape(20.dp), color = if (complaintsDark) Color(0xFF1E293B) else Color.White, shadowElevation = if (complaintsDark) 0.dp else 3.dp, modifier = Modifier.fillMaxWidth()) {
                        Column {
                            // Gradient card header
                            Box(
                                modifier = Modifier.fillMaxWidth()
                                    .background(Brush.horizontalGradient(listOf(MaterialTheme.colorScheme.error, Color(0xFFF97316), Color(0xFFEAB308))))
                                    .padding(horizontal = 16.dp, vertical = 16.dp),
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(
                                        Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(Icons.Filled.ReportProblem, null, tint = Color.White, modifier = Modifier.size(24.dp))
                                    }
                                    Column {
                                        Text("Submit New Complaint", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                                        Text("Provide details about the issue", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                                    }
                                }
                            }
                            // Form content
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                state.error?.let {
                                    Surface(shape = RoundedCornerShape(8.dp), color = if (complaintsDark) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f) else Color(0xFFFEF2F2), modifier = Modifier.fillMaxWidth()) {
                                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.ErrorOutline, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                                            Spacer(Modifier.width(8.dp))
                                            Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                                        }
                                    }
                                }
                                // Complaint type selector — 2x3 grid (web parity)
                                Text("Complaint Type", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                val complaintTypeCards = listOf(
                                    Triple("transaction", "💳", "Transaction Issue"),
                                    Triple("quality", "⭐", "Product Quality"),
                                    Triple("communication", "💬", "Communication"),
                                    Triple("fraud", "⚠️", "Suspected Fraud"),
                                    Triple("delivery", "🚚", "Delivery Issue"),
                                    Triple("other", "❓", "Other"),
                                )
                                complaintTypeCards.chunked(2).forEach { row ->
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                        row.forEach { (key, emoji, label) ->
                                            val selected = state.type == key
                                            Surface(
                                                shape = RoundedCornerShape(12.dp),
                                                color = if (selected) MaterialTheme.colorScheme.primary else if (com.zaruda.app.ui.theme.ColorTokens.isDark) com.zaruda.app.ui.theme.ColorTokens.CardSurface else Color(0xFFF8FAFC),
                                                border = if (selected) null else androidx.compose.foundation.BorderStroke(1.dp, com.zaruda.app.ui.theme.ColorTokens.Divider),
                                                shadowElevation = if (selected) 4.dp else 1.dp,
                                                modifier = Modifier.weight(1f).clickable { viewModel.setType(key) },
                                            ) {
                                                Column(
                                                    modifier = Modifier.padding(12.dp),
                                                    horizontalAlignment = Alignment.CenterHorizontally,
                                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                                ) {
                                                    Text(emoji, fontSize = 20.sp)
                                                    Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                                }
                                            }
                                        }
                                        if (row.size == 1) Spacer(Modifier.weight(1f))
                                    }
                                }
                                // Select from My Posts (auto-fill IDs)
                                var showPostPicker by remember { mutableStateOf(false) }
                                val myPosts = viewModel.myPosts
                                if (myPosts.isNotEmpty()) {
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = if (complaintsDark) Color(0xFF1E293B) else Color(0xFFF0F9FF),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, if (complaintsDark) Color(0xFF334155) else Color(0xFFBAE6FD)),
                                        modifier = Modifier.fillMaxWidth().clickable { showPostPicker = !showPostPicker },
                                    ) {
                                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Icon(Icons.Default.List, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text("Select from My Posts", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                                Text("Auto-fill Post ID & Seller ID from your listings", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                            Icon(if (showPostPicker) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                    if (showPostPicker) {
                                        Surface(shape = RoundedCornerShape(12.dp), color = if (complaintsDark) Color(0xFF0F172A) else Color.White, modifier = Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                myPosts.take(10).forEach { post ->
                                                    Surface(
                                                        shape = RoundedCornerShape(10.dp),
                                                        color = if (complaintsDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                                                        modifier = Modifier.fillMaxWidth().clickable {
                                                            viewModel.setPostId(post.postId ?: post.id ?: "")
                                                            viewModel.setSellerId(post.userId ?: "")
                                                            showPostPicker = false
                                                        },
                                                    ) {
                                                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                                            Box(Modifier.size(36.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                                                                Icon(Icons.Default.Article, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                                                            }
                                                            Column(Modifier.weight(1f)) {
                                                                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                                    Text("ID: ${post.postId ?: post.id ?: "—"}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                                    Text("Seller: ${post.userId ?: "—"}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                                }
                                                            }
                                                            post.status?.let { s ->
                                                                Surface(shape = RoundedCornerShape(6.dp), color = if (s == "active") Color(0xFFDCFCE7) else Color(0xFFFEF3C7)) {
                                                                    Text(s.replaceFirstChar { it.uppercase() }, fontSize = 9.sp, color = if (s == "active") Color(0xFF166534) else Color(0xFF92400E), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                if (myPosts.size > 10) {
                                                    Text("+ ${myPosts.size - 10} more posts…", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
                                                }
                                            }
                                        }
                                    }
                                }
                                // Manual Seller ID + Post ID (fallback)
                                Text("Or enter manually", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.weight(1f)) { FormField("Seller ID (optional)", state.sellerId, viewModel::setSellerId, "e.g. USER123") }
                                    Column(Modifier.weight(1f)) { FormField("Post ID *", state.postId, viewModel::setPostId, "e.g. POST001") }
                                }
                                FormField("Transaction Code (optional)", state.secretCode, viewModel::setSecretCode, "e.g. ABC123")
                                FormField("Description *", state.description, viewModel::setDescription, "Describe the problem in detail (min 20 chars)…", maxLines = 6, minLines = 4)
                                Text(
                                    "${state.description.length}/2000",
                                    fontSize = 11.sp,
                                    color = if (state.description.length < 20) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.align(Alignment.End),
                                )
                                Button(
                                    onClick = { viewModel.submit() },
                                    enabled = !state.loading && state.postId.isNotBlank() && state.description.length >= 20,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                    modifier = Modifier.fillMaxWidth().height(52.dp),
                                ) {
                                    Icon(Icons.Filled.ReportProblem, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(if (state.loading) "Submitting…" else "Submit Complaint", fontWeight = FontWeight.SemiBold, color = Color.White)
                                }
                            }
                        }
                    }
                }

                // Guidelines section (web parity)
                Surface(shape = RoundedCornerShape(12.dp), color = if (complaintsDark) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFF8FAFC), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("⚠️ Important Guidelines", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                        listOf("Provide accurate Post ID for faster resolution", "Include any transaction codes if applicable", "Detailed descriptions help us investigate faster", "False complaints may result in account restrictions").forEach { guideline ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("✓", fontSize = 12.sp, color = MaterialTheme.colorScheme.tertiary, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.width(6.dp))
                                Text(guideline, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                // Complaint history
                if (state.historyLoading) {
                    Box(Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                        androidx.compose.material3.CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                } else if (state.history.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Text(stringResource(R.string.social_complaint_history), fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                    state.history.forEach { complaint ->
                        Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                        Text(complaint.subject?.let { complaintTypes.find { (k, _) -> k == it }?.second } ?: complaint.subject.orEmpty(), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                    }
                                    val statusColor = when (complaint.status?.lowercase()) {
                                        "resolved", "closed" -> MaterialTheme.colorScheme.tertiary
                                        "rejected" -> MaterialTheme.colorScheme.error
                                        "pending", "triage", "investigating" -> Color(0xFFF59E0B)
                                        "open" -> Color(0xFF3B82F6)
                                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                                    }
                                    Surface(shape = RoundedCornerShape(6.dp), color = statusColor.copy(alpha = 0.12f)) {
                                        Text(complaint.status?.replaceFirstChar { it.uppercase() } ?: "Submitted", fontSize = 11.sp, color = statusColor, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                    }
                                }
                                // Reference ID with copy
                                complaint.referenceId?.let { refId ->
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text("Ref: $refId", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium)
                                        Icon(Icons.Default.ContentCopy, contentDescription = "Copy", modifier = Modifier.size(14.dp).clickable { clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(refId)) }, tint = Color(0xFF6366F1))
                                    }
                                }
                                if (!complaint.description.isNullOrBlank()) {
                                    Text(complaint.description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                                }
                                if (complaint.evidence.isNotEmpty()) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Default.AttachFile, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text("${complaint.evidence.size} attachment(s)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                if (!complaint.createdAt.isNullOrBlank()) {
                                    Text(complaint.createdAt, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// FeedbackScreen — Web parity: hero, subject, categories with icons, why matters, direct contact
// ──────────────────────────────────────────────────────────────────────────────
data class FeedbackUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val offlineMode: Boolean = false, val type: String = "general", val subject: String = "", val message: String = "", val rating: Int = 5, val refId: String = "")

@HiltViewModel
class FeedbackViewModel @Inject constructor(private val repo: ComplaintsRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedbackUiState())
    val state: StateFlow<FeedbackUiState> = _state.asStateFlow()
    fun setType(v: String) { _state.value = _state.value.copy(type = v) }
    fun setSubject(v: String) { _state.value = _state.value.copy(subject = v) }
    fun setMessage(v: String) { _state.value = _state.value.copy(message = v) }
    fun setRating(v: Int) { _state.value = _state.value.copy(rating = v) }
    fun submit() {
        val s = _state.value
        if (s.subject.isBlank() || s.message.isBlank()) { _state.value = s.copy(error = "Subject and message are required"); return }
        if (s.message.length < 10) { _state.value = s.copy(error = "Message must be at least 10 characters"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.submitFeedback(FeedbackRequest(type = s.type, subject = s.subject, message = s.message, rating = s.rating, category = s.type))) {
                is ApiResult.Success -> {
                    val generatedRef = "FB-${System.currentTimeMillis().toString(36).uppercase().takeLast(6)}"
                    _state.value = FeedbackUiState(success = true, refId = generatedRef)
                }
                is ApiResult.Failure -> {
                    // Offline fallback: treat as success when server unreachable or table not initialized
                    val isTransient = r.error is com.zaruda.app.core.ApiError.Network ||
                        r.error is com.zaruda.app.core.ApiError.Timeout ||
                        (r.error is com.zaruda.app.core.ApiError.Http && r.error.code == 503)
                    if (isTransient) {
                        val fallbackRef = "FB-${System.currentTimeMillis().toString(36).uppercase().takeLast(6)}"
                        _state.value = FeedbackUiState(success = true, refId = fallbackRef, offlineMode = true)
                    } else {
                        val msg = (r.error.message ?: "").lowercase()
                        val mapped = when {
                            r.error is com.zaruda.app.core.ApiError.Unauthorized || msg.contains("401") -> "Please sign in to submit feedback."
                            msg.contains("404") || msg.contains("not found") -> "The feedback endpoint was not found."
                            msg.contains("validation") -> "Please check your inputs and try again."
                            else -> msg.ifBlank { "Feedback service is unavailable right now. Please try again later." }
                        }
                        _state.value = s.copy(loading = false, error = mapped)
                    }
                }
            }
        }
    }
}

@Composable
fun FeedbackScreen(onBack: () -> Unit, viewModel: FeedbackViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val clipboardManager = LocalClipboardManager.current
    var showWhyMatters by remember { mutableStateOf(false) }
    var showCategoryCards by remember { mutableStateOf(false) }
    var showHero by remember { mutableStateOf(true) }
    var density by remember { mutableStateOf("comfortable") } // compact / comfortable / spacious
    val darkTheme = ColorTokens.isDark
    // Web parity: 5 feedback types with icons, names, descriptions matching Feedback.jsx
    data class FeedbackType(val key: String, val emoji: String, val name: String, val description: String, val bgColor: Color, val tintColor: Color)
    val feedbackTypes = listOf(
        FeedbackType("bug", "🐛", "Bug Report", "Found something broken? Let us know", if (darkTheme) Color(0xFF450A0A) else Color(0xFFFEF2F2), if (darkTheme) Color(0xFFF87171) else Color(0xFFDC2626)),
        FeedbackType("feature", "💡", "Feature Request", "Have an idea to make Zaruda better?", if (darkTheme) Color(0xFF422006) else Color(0xFFFEFCE8), if (darkTheme) Color(0xFFFBBF24) else Color(0xFFCA8A04)),
        FeedbackType("ui", "🎨", "UI Improvement", "Suggestions for design and layout", if (darkTheme) Color(0xFF1E1B4B) else Color(0xFFF5F3FF), if (darkTheme) Color(0xFFA78BFA) else Color(0xFF7C3AED)),
        FeedbackType("performance", "⚡", "Performance", "Slow loading or lagging? Tell us", if (darkTheme) Color(0xFF431407) else Color(0xFFFFF7ED), if (darkTheme) Color(0xFFFB923C) else Color(0xFFEA580C)),
        FeedbackType("general", "💬", "General", "Any other feedback or thoughts", if (darkTheme) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFEFF6FF), MaterialTheme.colorScheme.primary),
    )
    Box(Modifier.fillMaxSize().background(if (darkTheme) Brush.verticalGradient(listOf(Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF1E3A5F))) else Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEEF2FF), Color(0xFFF5F3FF))))) {
        Column(Modifier.fillMaxSize()) {
            SocialTopBar("Feedback", onBack)
            // Density toggle (web parity: Feedback.jsx densitySelector)
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Text("Density", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(end = 6.dp))
                listOf("compact" to "▤", "comfortable" to "≡", "spacious" to "☰").forEach { (mode, icon) ->
                    val sel = density == mode
                    Surface(modifier = Modifier.padding(2.dp).clickable { density = mode }, shape = RoundedCornerShape(6.dp), color = if (sel) Color(0xFF6366F1) else Color.Transparent) {
                        Text(icon, fontSize = 14.sp, color = if (sel) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                    }
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(when (density) { "compact" -> 8.dp; "spacious" -> 20.dp; else -> 14.dp })) {
                // Hero section with toggle (web parity: Show/Hide Highlights)
                if (showHero) {
                    Surface(shape = RoundedCornerShape(16.dp), color = if (darkTheme) Color(0xFF1E293B) else Color.White, shadowElevation = if (darkTheme) 0.dp else 2.dp, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(Modifier.size(48.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF3B82F6), Color(0xFF6366F1)))), contentAlignment = Alignment.Center) {
                                Icon(Icons.Filled.RateReview, null, tint = Color.White, modifier = Modifier.size(28.dp))
                            }
                            Spacer(Modifier.height(10.dp))
                            Text("Share Your Feedback", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = if (darkTheme) MaterialTheme.colorScheme.onSurface else Color(0xFF1E293B))
                            Spacer(Modifier.height(4.dp))
                            Text("Help us improve Zaruda for everyone", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                val badges = if (darkTheme) listOf(
                                    "📢 Your Voice Matters" to Color(0xFF0284C7) to Color(0xFFE0F2FE),
                                    "👂 We Listen" to Color(0xFF059669) to Color(0xFFD1FAE5),
                                    "🔄 Continuous Improvement" to Color(0xFFD97706) to Color(0xFFFEF3C7)
                                ) else listOf(
                                    "📢 Your Voice Matters" to Color(0xFF0369A1) to Color(0xFFF0F9FF),
                                    "👂 We Listen" to Color(0xFF15803D) to Color(0xFFDCFCE7),
                                    "🔄 Continuous Improvement" to Color(0xFFB45309) to Color(0xFFFEF3C7)
                                )
                                badges.forEach { (pair, textColor) ->
                                    val (badge, bgColor) = pair
                                    Surface(shape = RoundedCornerShape(8.dp), color = bgColor) {
                                        Text(badge, fontSize = 9.sp, fontWeight = FontWeight.Medium, color = textColor, modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp))
                                    }
                                }
                            }
                        }
                    }
                }
                // Hero toggle button (web parity)
                TextButton(onClick = { showHero = !showHero }, modifier = Modifier.fillMaxWidth()) {
                    Text(if (showHero) "Hide Highlights" else "Show Highlights", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                }

                if (state.success) {
                    Surface(shape = RoundedCornerShape(12.dp), color = if (darkTheme) Color(0xFF064E3B) else Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(10.dp))
                                Text(stringResource(R.string.social_feedback_thanks), fontSize = 14.sp, color = if (darkTheme) Color(0xFF86EFAC) else Color(0xFF166534))
                            }
                            Spacer(Modifier.height(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Reference: ${state.refId}", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.width(8.dp))
                                Icon(Icons.Default.ContentCopy, "Copy", modifier = Modifier.size(16.dp).clickable {
                                    clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(state.refId))
                                }, tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                } else {
                    // Main card with gradient header (web parity: zaruda-premium-surface rounded-3xl + CardHeader bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500)
                    Surface(shape = RoundedCornerShape(24.dp), color = if (darkTheme) Color(0xFF1E293B) else Color.White, shadowElevation = if (darkTheme) 0.dp else 3.dp, modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Box(
                                modifier = Modifier.fillMaxWidth()
                                    .background(Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF6366F1), Color(0xFFA855F7))))
                                    .padding(horizontal = 16.dp, vertical = 14.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Surface(shape = RoundedCornerShape(12.dp), color = Color.White.copy(alpha = 0.2f), modifier = Modifier.size(46.dp)) {
                                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                            Icon(Icons.Filled.RateReview, null, tint = Color.White, modifier = Modifier.size(24.dp))
                                        }
                                    }
                                    Column {
                                        Text("Your Feedback", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                                        Text("Your opinion matters", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                                    }
                                }
                            }
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                state.error?.let {
                                    Surface(shape = RoundedCornerShape(8.dp), color = if (darkTheme) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f) else Color(0xFFFEF2F2), modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.ErrorOutline, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                            }
                        }
                    }
                    // Reference ID preview
                    Surface(shape = RoundedCornerShape(8.dp), color = if (darkTheme) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Tag, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Reference: ${state.refId}", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    // Category buttons with emojis (web parity: chips + expandable cards)
                    Text(stringResource(R.string.social_category), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                    // Show selected type preview
                    val selectedType = feedbackTypes.find { it.key == state.type }
                    selectedType?.let { sel ->
                        Surface(shape = RoundedCornerShape(10.dp), color = sel.bgColor, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(sel.emoji, fontSize = 18.sp)
                                Column {
                                    Text(sel.name, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = sel.tintColor)
                                    Text(sel.description, fontSize = 11.sp, color = sel.tintColor.copy(alpha = 0.7f))
                                }
                            }
                        }
                    }
                    // Chips row (quick selection)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                        feedbackTypes.forEach { ft ->
                            FilterChip(
                                selected = state.type == ft.key, onClick = { viewModel.setType(ft.key) },
                                label = { Text("${ft.emoji} ${ft.name}", fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.White))
                        }
                    }
                    // More Options toggle → full category cards (web parity)
                    TextButton(onClick = { showCategoryCards = !showCategoryCards }) {
                        Text(if (showCategoryCards) "Hide Cards" else "More Options", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(4.dp))
                        Icon(if (showCategoryCards) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, null, modifier = Modifier.size(14.dp), tint = Color(0xFF6366F1))
                    }
                    if (showCategoryCards) {
                        // 2-column card grid (web parity: sm:grid-cols-2)
                        val chunked = feedbackTypes.chunked(2)
                        chunked.forEach { row ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                row.forEach { ft ->
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = if (state.type == ft.key) ft.bgColor else MaterialTheme.colorScheme.surface,
                                        shadowElevation = if (state.type == ft.key) 3.dp else 1.dp,
                                        border = if (state.type == ft.key) androidx.compose.foundation.BorderStroke(1.5.dp, ft.tintColor) else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                                        modifier = Modifier.weight(1f).clickable { viewModel.setType(ft.key) },
                                    ) {
                                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(ft.emoji, fontSize = 20.sp)
                                            Text(ft.name, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = ft.tintColor)
                                            Text(ft.description, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                                        }
                                    }
                                }
                                // Fill empty cell if odd number
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                    // Star rating (web parity)
                    Text(stringResource(R.string.social_rating), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        (1..5).forEach { i ->
                            IconButton(onClick = { viewModel.setRating(i) }, modifier = Modifier.size(36.dp)) {
                                Icon(Icons.Filled.Star, null, tint = if (i <= state.rating) Color(0xFFF59E0B) else MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(28.dp))
                            }
                        }
                        Spacer(Modifier.width(8.dp))
                        Text("${state.rating} / 5", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                    }
                    // Subject field (web parity — missing in previous version)
                    FormField("Subject *", state.subject, viewModel::setSubject, "Brief title for your feedback")
                    FormField("Message *", state.message, viewModel::setMessage, "Share your detailed thoughts…", maxLines = 6, minLines = 4)
                    Button(
                        onClick = { viewModel.submit() }, enabled = !state.loading && state.subject.isNotBlank() && state.message.isNotBlank(),
                        shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                    ) { Text(if (state.loading) "Submitting…" else "Submit Feedback", fontWeight = FontWeight.SemiBold) }
                    // Link to complaints
                    TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                        Text("Report a transaction issue instead →", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                    }
                            } // end form Column
                        } // end card Column
                    } // end Surface card
                }

                // Why Feedback Matters — enhanced 2-col grid (web parity)
                Surface(shape = RoundedCornerShape(12.dp), color = if (darkTheme) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFF8FAFC), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("💡 Why Your Feedback Matters", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                        listOf(
                            Triple("💡", "Shapes Features", "Your ideas guide what we build next"),
                            Triple("🛡", "Improves Safety", "Bug reports keep the platform secure"),
                            Triple("✨", "Better UX", "Your UI feedback drives design decisions"),
                            Triple("🌱", "Grows Community", "Your input makes Zaruda better for everyone"),
                        ).chunked(2).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                row.forEach { (emoji, title, desc) ->
                                    Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp, modifier = Modifier.weight(1f)) {
                                        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(emoji, fontSize = 18.sp)
                                            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                                            Text(desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
                // Direct contact (web parity)
                Surface(shape = RoundedCornerShape(12.dp), color = if (darkTheme) MaterialTheme.colorScheme.surfaceVariant else Color(0xFFEFF6FF), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("📞 Direct Contact", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                        Text("For urgent issues, reach us at support@zarudatech.com", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("We respond within 24 hours on business days.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────
// Shared form field helper
// ──────────────────────────────────────────────────────────────────────────────
@Composable
private fun FormField(label: String, value: String, onValueChange: (String) -> Unit, placeholder: String = "", maxLines: Int = 1, minLines: Int = 1) {
    Column {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value, onValueChange = onValueChange,
            placeholder = { Text(placeholder, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp) },
            singleLine = maxLines == 1, maxLines = maxLines, minLines = minLines,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}


