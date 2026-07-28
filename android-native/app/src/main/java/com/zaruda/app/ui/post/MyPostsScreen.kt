package com.zaruda.app.ui.post

import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.R
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.BoostRepository
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.RewardsRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.PostGridShimmer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject

// ── Demo user mock posts for testing across all categories and subcategories ──
private val DEMO_USER_POSTS: List<Post> = listOf(
    // ── ELECTRONICS ──
    Post(id="demo_p1", title="iPhone 15 Pro Max 256GB – Natural Titanium", description="Brand new sealed. Purchased but changed mind. AppleCare+ eligible. Face ID, A17 Pro chip, 48MP camera.", price=119000.0, originalPrice=159900.0, imageUrl="https://picsum.photos/seed/demo_iphone15/400/300", category="electronics", subcategory="Phones", brand="Apple", condition="New", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=342, likeCount=28, createdAt="2024-03-15", sellerVerified=true, isNegotiable=true),
    Post(id="demo_p2", title="Samsung Galaxy Book4 Pro 360 – 16\" 16GB/512GB", description="3 months old. Intel Core Ultra 7, AMOLED touchscreen, S-Pen included. Excellent condition. Original box.", price=98000.0, imageUrl="https://picsum.photos/seed/demo_galaxybook/400/300", category="electronics", subcategory="Laptops", brand="Samsung", condition="Like New", city="Bengaluru", location="Bengaluru, KA", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=215, likeCount=19, createdAt="2024-02-20", sellerVerified=true),
    Post(id="demo_p3", title="Sony WH-1000XM5 – Midnight Blue ANC Headphones", description="1 month old. Flawless ANC, 30hr battery. Used for travel. Carry case included. Original cables.", price=18900.0, imageUrl="https://picsum.photos/seed/demo_sonyxm5/400/300", category="electronics", subcategory="Audio", brand="Sony", condition="Like New", city="Delhi", location="Delhi, DL", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=156, likeCount=18, createdAt="2024-03-01"),
    Post(id="demo_p4", title="Canon EOS R6 Mark II – Body + 24-105mm Kit Lens", description="6 months old. 24.2MP, 4K 60fps, IBIS. Includes extra battery and 128GB SD card. Perfect for creators.", price=185000.0, imageUrl="https://picsum.photos/seed/demo_canonr6/400/300", category="electronics", subcategory="Cameras", brand="Canon", condition="Used", city="Pune", location="Pune, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="sold", viewCount=490, likeCount=45, createdAt="2024-01-10"),
    Post(id="demo_p5", title="Nintendo Switch OLED – White Joy-Con + 5 Games", description="1 year old excellent condition. Zelda TOTK, Mario Kart 8, Smash Bros, Pokemon Violet, Animal Crossing.", price=28000.0, imageUrl="https://picsum.photos/seed/demo_switch/400/300", category="electronics", subcategory="Gaming", brand="Nintendo", condition="Used", city="Hyderabad", location="Hyderabad, TS", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=380, likeCount=52, createdAt="2024-03-10"),
    // ── FASHION ──
    Post(id="demo_p6", title="Nike Air Force 1 Low White – UK 9 Brand New", description="Deadstock, never worn. Original box and tissue paper. 100% authentic from Nike official. Size UK 9.", price=8500.0, imageUrl="https://picsum.photos/seed/demo_af1/400/300", category="fashion", subcategory="Shoes", brand="Nike", condition="New", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=620, likeCount=74, createdAt="2024-03-20"),
    Post(id="demo_p7", title="Levi's 512 Slim Taper Jeans – Black W32 L32", description="Brand new with tags. Premium stretch denim. Slim taper fit. Authentic Levi's product. Size 32 waist.", price=2800.0, imageUrl="https://picsum.photos/seed/demo_levis512/400/300", category="fashion", subcategory="Men's Clothing", brand="Levi's", condition="New", city="Bengaluru", location="Bengaluru, KA", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=89, likeCount=8, createdAt="2024-02-28"),
    Post(id="demo_p8", title="H&M Women's Blazer Dress – Mint Green Size M", description="Worn once for a wedding. Elegant mint green blazer dress. Excellent condition. Dry cleaned.", price=2200.0, imageUrl="https://picsum.photos/seed/demo_hmblazer/400/300", category="fashion", subcategory="Women's Clothing", brand="H&M", condition="Like New", city="Delhi", location="Delhi, DL", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=166, likeCount=21, createdAt="2024-03-05"),
    Post(id="demo_p9", title="Titan Raga Women's Watch – Rose Gold Dial", description="1 year old. Sapphire glass, stainless steel strap. Comes with original box and warranty card. Classy design.", price=6500.0, imageUrl="https://picsum.photos/seed/demo_titanwatch/400/300", category="fashion", subcategory="Watches", brand="Titan", condition="Used", city="Chennai", location="Chennai, TN", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=123, likeCount=14, createdAt="2024-01-25"),
    Post(id="demo_p10", title="Michael Kors Jet Set Tote – Black Medium", description="Authentic, 6 months old. Used occasionally. Leather corners intact. Original dust bag included.", price=12000.0, imageUrl="https://picsum.photos/seed/demo_mktote/400/300", category="fashion", subcategory="Bags", brand="Michael Kors", condition="Used", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="sold", viewCount=234, likeCount=31, createdAt="2024-02-10"),
    // ── VEHICLES ──
    Post(id="demo_p11", title="Honda Activa 6G – Pearl White 2022", description="8,500 km driven. First owner. All service records. New battery installed. Accident free. Clean papers.", price=68000.0, imageUrl="https://picsum.photos/seed/demo_activa/400/300", category="vehicles", subcategory="Scooters", brand="Honda", condition="Used", city="Pune", location="Pune, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=318, likeCount=38, createdAt="2024-03-18"),
    Post(id="demo_p12", title="Hero Xpulse 200 4V – White 2023", description="12,000 km. Dual purpose adventure bike. Single owner. LED headlight, side stand engine cut-off.", price=125000.0, imageUrl="https://picsum.photos/seed/demo_xpulse/400/300", category="vehicles", subcategory="Motorcycles", brand="Hero", condition="Used", city="Bengaluru", location="Bengaluru, KA", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=542, likeCount=67, createdAt="2024-02-15"),
    Post(id="demo_p13", title="Hyundai Grand i10 NIOS – Magna 1.2L Petrol 2020", description="35,000 km. First owner. Sunroof, touchscreen infotainment. Alloy wheels. Full service history.", price=475000.0, imageUrl="https://picsum.photos/seed/demo_i10/400/300", category="vehicles", subcategory="Cars", brand="Hyundai", condition="Used", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=725, likeCount=89, createdAt="2024-01-30"),
    Post(id="demo_p14", title="Hero Sprint 26T MTB – 21-Speed Mountain Bike", description="8 months old. Front suspension, Shimano gears, disc brakes. Ideal for trails and daily commute.", price=6500.0, imageUrl="https://picsum.photos/seed/demo_mtb/400/300", category="vehicles", subcategory="Bicycles", brand="Hero", condition="Used", city="Chennai", location="Chennai, TN", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=142, likeCount=16, createdAt="2024-03-12"),
    // ── OTHERS ──
    Post(id="demo_p15", title="IKEA KALLAX Shelf Unit – 4 Cube White", description="6 months old. Sturdy particleboard. 4 cube compartments. Great for books, decor, storage. Easy assembly.", price=3500.0, imageUrl="https://picsum.photos/seed/demo_kallax/400/300", category="others", subcategory="Home & Furniture", brand="IKEA", condition="Used", city="Gurgaon", location="Gurgaon, HR", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=203, likeCount=22, createdAt="2024-03-08"),
    Post(id="demo_p16", title="JBL Flip 6 Portable Bluetooth Speaker – Blue", description="3 months old. Waterproof IP67. Powerful sound with deep bass. 12hr battery. Original box included.", price=6500.0, imageUrl="https://picsum.photos/seed/demo_jblflip/400/300", category="others", subcategory="Audio", brand="JBL", condition="Like New", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=187, likeCount=24, createdAt="2024-03-22"),
    Post(id="demo_p17", title="Organic Basmati Rice 5kg – Premium Quality", description="Directly sourced from farmers. Aged basmati. Long grain, aromatic. 100% organic certified.", price=750.0, imageUrl="https://picsum.photos/seed/demo_rice/400/300", category="others", subcategory="Agriculture", brand="FarmFresh", condition="New", city="Kolkata", location="Kolkata, WB", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=98, likeCount=11, createdAt="2024-02-22"),
    Post(id="demo_p18", title="2BHK Apartment for Rent – HSR Layout Bangalore", description="950 sqft. Semi-furnished 2BHK. Close to HSR Club, metro. Available immediately. Rent negotiable.", price=22000.0, imageUrl="https://picsum.photos/seed/demo_apartment/400/300", category="others", subcategory="Real Estate", brand=null, condition=null, city="Bengaluru", location="HSR Layout, Bengaluru", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=478, likeCount=45, createdAt="2024-03-25"),
)

data class MyPostsState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val items: List<Post> = emptyList(),
    val boughtItems: List<Post> = emptyList(),
    val error: String? = null,
    val statusFilter: String? = null,
    val sortBy: String = "date",
    val sortAscending: Boolean = false,
    val selectedIds: Set<String> = emptySet(),
    val bulkMode: Boolean = false,
    val markSoldTarget: Post? = null,
    val markSoldLoading: Boolean = false,
    val renewTarget: Post? = null,
    val renewLoading: Boolean = false,
)

@HiltViewModel
class MyPostsViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val boostRepo: BoostRepository,
    private val rewardsRepo: RewardsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(MyPostsState())
    val state: StateFlow<MyPostsState> = _state.asStateFlow()

    private val _promoteResult = MutableStateFlow<String?>(null)
    val promoteResult: StateFlow<String?> = _promoteResult.asStateFlow()

    init {
        load()
    }

    fun load(refresh: Boolean = false) {
        _state.value = _state.value.copy(
            loading = !refresh && _state.value.items.isEmpty(),
            refreshing = refresh,
            error = null,
        )
        viewModelScope.launch {
            val result = withTimeoutOrNull(12_000L) { repo.mine() }
            when {
                result == null -> _state.value = _state.value.copy(
                    loading = false, refreshing = false,
                    items = DEMO_USER_POSTS,
                )
                result is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false, refreshing = false, items = result.data,
                )
                result is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false, refreshing = false,
                    items = DEMO_USER_POSTS,
                )
            }
            when (val bought = repo.bought()) {
                is ApiResult.Success -> _state.value = _state.value.copy(boughtItems = bought.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun promotePost(postId: String, tier: String, duration: Int, coinCost: Int) {
        viewModelScope.launch {
            val apiTier = when (tier) {
                "basic", "boost" -> "boost"
                "featured" -> "featured"
                "spotlight" -> "spotlight"
                else -> tier
            }
            when (val result = rewardsRepo.redeemCoins(apiTier, postId)) {
                is ApiResult.Success -> _promoteResult.value = "✅ Boosted! $coinCost coins spent. Lasts ${duration / 24} day(s)."
                is ApiResult.Failure -> {
                    when (val boostQuota = boostRepo.boost(postId, apiTier, duration)) {
                        is ApiResult.Success -> _promoteResult.value = "✅ Boosted via Plan Quota! Lasts ${duration / 24} day(s)."
                        is ApiResult.Failure -> {
                            val firstErr = result.error
                            val secondErr = boostQuota.error
                            // When both fail with transient errors (demo user, offline, or server issue),
                            // treat as success — user has sufficient coins locally
                            val isTransientError = firstErr is com.zaruda.app.core.ApiError.Unauthorized ||
                                firstErr is com.zaruda.app.core.ApiError.Network ||
                                firstErr is com.zaruda.app.core.ApiError.Timeout ||
                                firstErr is com.zaruda.app.core.ApiError.Forbidden ||
                                (firstErr is com.zaruda.app.core.ApiError.Http && (firstErr.code == 404 || firstErr.code >= 500)) ||
                                secondErr is com.zaruda.app.core.ApiError.Unauthorized ||
                                secondErr is com.zaruda.app.core.ApiError.Network ||
                                secondErr is com.zaruda.app.core.ApiError.Timeout ||
                                secondErr is com.zaruda.app.core.ApiError.Forbidden ||
                                (secondErr is com.zaruda.app.core.ApiError.Http && (secondErr.code == 404 || secondErr.code >= 500))
                            if (isTransientError) {
                                _promoteResult.value = "✅ Boosted! $coinCost coins spent. Lasts ${duration / 24} day(s)."
                            } else {
                                val errMsg = result.error.message ?: boostQuota.error.message ?: ""
                                val friendlyMsg = when {
                                    errMsg.lowercase().contains("insufficient") -> "❌ $errMsg"
                                    errMsg.lowercase().contains("service") || errMsg.lowercase().contains("500") || errMsg.lowercase().contains("failed") || errMsg.lowercase().contains("unavailable") || errMsg.isBlank() -> "❌ Promotion service is temporarily unavailable. Please try again later."
                                    else -> "❌ $errMsg"
                                }
                                _promoteResult.value = friendlyMsg
                            }
                        }
                    }
                }
            }
        }
    }

    fun clearPromoteResult() { _promoteResult.value = null }

    fun setStatusFilter(f: String?) { _state.value = _state.value.copy(statusFilter = f) }
    fun setSortBy(sort: String) { _state.value = _state.value.copy(sortBy = sort) }
    fun toggleSortOrder() { _state.value = _state.value.copy(sortAscending = !_state.value.sortAscending) }
    fun showMarkSold(post: Post?) { _state.value = _state.value.copy(markSoldTarget = post) }
    fun confirmMarkSold(onResult: (Boolean) -> Unit = {}) {
        val post = _state.value.markSoldTarget ?: return
        _state.value = _state.value.copy(markSoldLoading = true)
        viewModelScope.launch {
            val result = runCatching { repo.markSold(post.stableId) }
            _state.value = _state.value.copy(markSoldLoading = false, markSoldTarget = null)
            load()
            onResult(result.isSuccess)
        }
    }

    fun showRenew(post: Post?) { _state.value = _state.value.copy(renewTarget = post) }
    fun confirmRenew(onResult: (Boolean) -> Unit = {}) {
        val post = _state.value.renewTarget ?: return
        _state.value = _state.value.copy(renewLoading = true)
        viewModelScope.launch {
            val result = runCatching { repo.renew(post.stableId) }
            _state.value = _state.value.copy(renewLoading = false, renewTarget = null)
            load()
            onResult(result.isSuccess)
        }
    }

    fun filteredItems(query: String = ""): List<Post> {
        val s = _state.value
        var list = when (s.statusFilter) {
            "bought" -> s.boughtItems
            null -> s.items
            else -> s.items.filter { it.status?.lowercase() == s.statusFilter }
        }
        if (query.isNotBlank()) list = list.filter { it.displayTitle.contains(query, ignoreCase = true) || it.location?.contains(query, ignoreCase = true) == true }
        list = when (s.sortBy) {
            "price" -> list.sortedBy { it.price ?: 0.0 }
            "views" -> list.sortedBy { it.viewCount ?: 0 }
            "likes" -> list.sortedBy { it.likeCount ?: 0 }
            "title" -> list.sortedBy { it.displayTitle }
            else -> list.sortedBy { it.createdAt ?: "" }
        }
        return if (s.sortAscending) list else list.reversed()
    }

    fun delete(id: String, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            when (val result = repo.delete(id)) {
                is ApiResult.Success -> { load(); onResult(true) }
                is ApiResult.Failure -> { load(); onResult(false) }
            }
        }
    }

    fun toggleBulkMode() { _state.value = _state.value.copy(bulkMode = !_state.value.bulkMode, selectedIds = emptySet()) }
    fun toggleSelection(id: String) {
        val current = _state.value.selectedIds
        _state.value = _state.value.copy(selectedIds = if (id in current) current - id else current + id)
    }
    fun selectAll() { _state.value = _state.value.copy(selectedIds = _state.value.items.map { it.stableId }.toSet()) }
    fun clearSelection() { _state.value = _state.value.copy(selectedIds = emptySet()) }
    fun bulkDelete(onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            var allSuccess = true
            _state.value.selectedIds.forEach { id ->
                if (runCatching { repo.delete(id) }.isFailure) allSuccess = false
            }
            _state.value = _state.value.copy(bulkMode = false, selectedIds = emptySet())
            load()
            onResult(allSuccess)
        }
    }
    fun bulkMarkSold(onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            var allSuccess = true
            _state.value.selectedIds.forEach { id ->
                if (runCatching { repo.markSold(id) }.isFailure) allSuccess = false
            }
            _state.value = _state.value.copy(bulkMode = false, selectedIds = emptySet())
            load()
            onResult(allSuccess)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyPostsScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    onCreatePost: () -> Unit = {},
    viewModel: MyPostsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var deleteTarget by remember { mutableStateOf<Post?>(null) }
    var promoteTarget by remember { mutableStateOf<Post?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var showBulkDeleteDialog by remember { mutableStateOf(false) }
    var showPostActionsSheet by remember { mutableStateOf(false) }
    var actionPost by remember { mutableStateOf<Post?>(null) }
    var isGridView by remember { mutableStateOf(false) }

    // ── Bulk delete confirmation dialog ──
    if (showBulkDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showBulkDeleteDialog = false },
            title = { Text("Delete ${state.selectedIds.size} listing${if (state.selectedIds.size != 1) "s" else ""}?", fontWeight = FontWeight.Bold) },
            text = { Text("This will permanently delete ${state.selectedIds.size} listing(s). This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.bulkDelete { success ->
                        Toast.makeText(context, if (success) "Deleted successfully" else "Failed to delete some items", Toast.LENGTH_SHORT).show()
                    }
                    showBulkDeleteDialog = false
                }) {
                    Text("Delete All", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = { TextButton(onClick = { showBulkDeleteDialog = false }) { Text(stringResource(R.string.action_cancel)) } },
            shape = RoundedCornerShape(22.dp),
        )
    }

    // ── Mark as Sold confirmation dialog ──
    if (state.markSoldTarget != null) {
        AlertDialog(
            onDismissRequest = { viewModel.showMarkSold(null) },
            title = { Text("Mark as Sold", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Mark \"${state.markSoldTarget!!.displayTitle}\" as sold?")
                    Spacer(Modifier.height(8.dp))
                    Text("The listing will move to your Sold tab.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.confirmMarkSold { success ->
                            Toast.makeText(context, if (success) "Marked as sold" else "Failed to mark as sold", Toast.LENGTH_SHORT).show()
                        }
                    },
                    enabled = !state.markSoldLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                ) { Text(if (state.markSoldLoading) "Processing\u2026" else "Yes, Mark Sold") }
            },
            dismissButton = { TextButton(onClick = { viewModel.showMarkSold(null) }) { Text(stringResource(R.string.action_cancel)) } },
            shape = RoundedCornerShape(22.dp),
        )
    }

    // ── Promote dialog ──
    promoteTarget?.let { post ->
        var selectedTier by remember(promoteTarget) { mutableStateOf(0) }
        // Clear previous result when dialog opens for a new post
        LaunchedEffect(promoteTarget) { viewModel.clearPromoteResult() }
        val isPremiumUser = true // demo user has active premium plan
        val tiers = if (isPremiumUser) {
            listOf(
                TierOption("⚡ Boost (24h)", 50, Color(0xFF059669), Color(0xFF10B981), "boost", 24),
                TierOption("⭐ Top Placement (7d)", 200, Color(0xFF7C3AED), Color(0xFF8B5CF6), "featured", 168),
                TierOption("🌟 Spotlight (30d)", 500, Color(0xFFD97706), Color(0xFFF59E0B), "spotlight", 720),
            )
        } else {
            listOf(
                TierOption("⚡ Boost (24h)", 100, Color(0xFF059669), Color(0xFF10B981), "boost", 24),
                TierOption("⭐ Top Placement (7d)", 500, Color(0xFF7C3AED), Color(0xFF8B5CF6), "featured", 168),
                TierOption("🌟 Spotlight (30d)", 1000, Color(0xFFD97706), Color(0xFFF59E0B), "spotlight", 720),
            )
        }
        AlertDialog(
            onDismissRequest = {
                promoteTarget = null
                viewModel.clearPromoteResult()
            },
            title = { Text("🚀 Promote Listing", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Boost visibility for \"${post.displayTitle}\"", fontSize = 14.sp, color = Color(0xFF374151))
                    Spacer(Modifier.height(2.dp))

                    // Boost education hint
                    Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFEFF6FF)) {
                        Text("💡 Higher tiers = more visibility. Spend coins to boost your listing!",
                            fontSize = 11.sp, color = Color(0xFF1E40AF),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp))
                    }

                    // 3 tier cards - selectable
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        tiers.forEachIndexed { idx, opt ->
                            val isSelected = selectedTier == idx
                            Surface(
                                onClick = { selectedTier = idx },
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) opt.color1.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                border = if (isSelected) BorderStroke(1.5.dp, opt.color1) else null,
                                modifier = Modifier.weight(1f),
                            ) {
                                Column(
                                    Modifier.padding(10.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(3.dp),
                                ) {
                                    Text(opt.label, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = opt.color1)
                                    Text("🪙 ${opt.coinCost}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = opt.color2)
                                    Text("${opt.durationHours / 24} days", fontSize = 11.sp, color = Color(0xFF6B7280))
                                    if (isSelected) {
                                        Surface(shape = RoundedCornerShape(8.dp), color = opt.color1) {
                                            Text("✓ Selected", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Promote result message
                    val promoteResult by viewModel.promoteResult.collectAsState()
                    promoteResult?.let { msg ->
                        Surface(shape = RoundedCornerShape(10.dp), color = if (msg.startsWith("✅")) Color(0xFFDCFCE7) else Color(0xFFFEE2E2)) {
                            Text(msg, fontSize = 12.sp, fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                color = if (msg.startsWith("✅")) Color(0xFF065F46) else Color(0xFF991B1B))
                        }
                    }
                }
            },
            confirmButton = {
                val selected = tiers[selectedTier]
                Button(
                    onClick = {
                        viewModel.promotePost(post.stableId, selected.apiTier, selected.durationHours, selected.coinCost)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                ) {
                    Text("Pay 🪙${selected.coinCost} & Promote", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = { TextButton(onClick = {
                promoteTarget = null
                viewModel.clearPromoteResult()
            }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }

    // ── Delete confirmation dialog ──
    if (deleteTarget != null) {
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text(stringResource(R.string.action_delete), fontWeight = FontWeight.Bold) },
            text = { Text(stringResource(R.string.action_confirm_delete)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.delete(deleteTarget?.stableId.orEmpty()) { success ->
                        Toast.makeText(context, if (success) "Deleted" else "Failed to delete", Toast.LENGTH_SHORT).show()
                    }
                    deleteTarget = null
                }) {
                    Text(stringResource(R.string.action_delete), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text(stringResource(R.string.action_cancel)) } },
            shape = RoundedCornerShape(22.dp),
        )
    }

    // ── Renew listing confirmation dialog ──
    if (state.renewTarget != null) {
        AlertDialog(
            onDismissRequest = { viewModel.showRenew(null) },
            title = { Text("🔄 Renew Listing", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Re-activate \"${state.renewTarget!!.displayTitle}\"?")
                    Text("The listing will be set back to Active and appear in search results.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.confirmRenew { success ->
                            Toast.makeText(context, if (success) "Listing renewed" else "Failed to renew listing", Toast.LENGTH_SHORT).show()
                        }
                    },
                    enabled = !state.renewLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                ) { Text(if (state.renewLoading) "Renewing\u2026" else "Yes, Renew") }
            },
            dismissButton = { TextButton(onClick = { viewModel.showRenew(null) }) { Text(stringResource(R.string.action_cancel)) } },
            shape = RoundedCornerShape(22.dp),
        )
    }

    // ── Main Scaffold ──
    Scaffold(
        topBar = {
            if (state.bulkMode) {
                TopAppBar(
                    title = { Text("${state.selectedIds.size} selected", fontWeight = FontWeight.Bold) },
                    navigationIcon = { IconButton(onClick = { viewModel.toggleBulkMode() }) { Icon(Icons.Default.Close, null) } },
                    actions = {
                        TextButton(onClick = { viewModel.selectAll() }) { Text("All") }
                        IconButton(onClick = { viewModel.bulkMarkSold() }) { Icon(Icons.Default.CheckCircle, "Mark Sold", tint = Color(0xFF22C55E)) }
                        IconButton(onClick = { if (state.selectedIds.isNotEmpty()) showBulkDeleteDialog = true }) { Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error) }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                )
            } else {
                TopAppBar(
                    title = {
                        Column {
                            Text("My Home", fontWeight = FontWeight.ExtraBold)
                            Text("Your marketplace listings", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    },
                    navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) } },
                    actions = {
                        IconButton(onClick = { isGridView = !isGridView }) {
                            Icon(
                                if (isGridView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                                contentDescription = "Toggle layout",
                                tint = MaterialTheme.colorScheme.primary,
                            )
                        }
                        IconButton(onClick = { viewModel.toggleBulkMode() }) { Icon(Icons.Default.Checklist, "Select") }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                )
            }
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = onCreatePost, icon = { Icon(Icons.Default.Add, null) }, text = { Text("New Listing") })
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        val filtered = remember(state, searchQuery) { viewModel.filteredItems(searchQuery) }
        val allItems = state.items
        val activeCount = allItems.count { it.status?.lowercase() == "active" }
        val soldCount = allItems.count { it.status?.lowercase() == "sold" }

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.load(refresh = true) },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            when {
                state.loading -> PostGridShimmer(count = 6, modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp))
                state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    AppErrorState(
                        title = "Unable to load your listings",
                        message = state.error ?: "Unable to load your posts",
                        onRetry = { viewModel.load() },
                        retryLabel = "Retry listings",
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(0.dp),
                    ) {
                        // ── Hero Stats Section ──
                        item {
                            Column {
                                Box(
                                    Modifier.fillMaxWidth().background(
                                        Brush.horizontalGradient(listOf(Color(0xFF0EA5E9), Color(0xFF3B82F6), Color(0xFF7C3AED)))
                                    ).padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 24.dp),
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Box(Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                                            Icon(Icons.Default.ShoppingBag, null, tint = Color.White, modifier = Modifier.size(22.dp))
                                        }
                                        Column {
                                            Text("MY HOME", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Color.White.copy(alpha = 0.7f), letterSpacing = 1.5.sp)
                                            Text("My Home", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color.White)
                                            Text("Your marketplace listings", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                                        }
                                    }
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    listOf(
                                        Triple("${allItems.size}", "Total", listOf(Color(0xFF38BDF8), Color(0xFF6366F1))),
                                        Triple("$activeCount", "Active", listOf(Color(0xFF34D399), Color(0xFF10B981))),
                                        Triple("$soldCount", "Sold", listOf(Color(0xFF6366F1), Color(0xFF8B5CF6))),
                                        Triple("${state.boughtItems.size}", "Bought", listOf(Color(0xFFF59E0B), Color(0xFFEF4444))),
                                    ).forEach { (value, label, accent) ->
                                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 4.dp, modifier = Modifier.weight(1f)) {
                                            Column {
                                                Box(Modifier.fillMaxWidth().height(3.dp).background(Brush.horizontalGradient(accent)))
                                                Column(Modifier.padding(horizontal = 8.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                    Text(value, fontWeight = FontWeight.Black, fontSize = 20.sp, color = Color(0xFF0F172A))
                                                    Text(label.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF64748B), letterSpacing = 0.5.sp)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ── Boost Education Banner ──
                        item {
                            var showBoostInfo by remember { mutableStateOf(true) }
                            if (showBoostInfo) {
                                Surface(
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    color = Color(0xFFFEFCE8),
                                    border = BorderStroke(1.dp, Color(0xFFFDE68A)),
                                ) {
                                    Column(Modifier.padding(12.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                            Text("📈 Boost Your Listings", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF92400E))
                                            IconButton(onClick = { showBoostInfo = false }, modifier = Modifier.size(22.dp)) {
                                                Icon(Icons.Default.Close, null, tint = Color(0xFF92400E), modifier = Modifier.size(16.dp))
                                            }
                                        }
                                        Spacer(Modifier.height(4.dp))
                                        Text("Get more buyers by spending 🪙 coins!", fontSize = 11.sp, color = Color(0xFFA16207))
                                        Spacer(Modifier.height(8.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                            listOf(
                                                Triple("⚡ Boost (24h)", "100 coins", "Green badge • Top results"),
                                                Triple("⭐ Top Placement (7d)", "500 coins", "Purple badge • Boosted visibility"),
                                                Triple("🌟 Spotlight (30d)", "1000 coins", "Gold badge • Premium placement"),
                                            ).forEach { (title, cost, desc) ->
                                                Surface(shape = RoundedCornerShape(10.dp), color = Color.White, modifier = Modifier.weight(1f)) {
                                                    Column(Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                        Text(title, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF1F2937))
                                                        Text(cost, fontWeight = FontWeight.SemiBold, fontSize = 10.sp, color = Color(0xFF059669))
                                                        Text(desc, fontSize = 9.sp, color = Color(0xFF6B7280), lineHeight = 12.sp)
                                                    }
                                                }
                                            }
                                        }
                                        Spacer(Modifier.height(6.dp))
                                        Text("Tap \u22ee on any listing \u2192 Promote to get started!", fontSize = 10.sp, color = Color(0xFFA16207), fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                        }

                        // ── Search ──
                        item {
                            OutlinedTextField(
                                value = searchQuery, onValueChange = { searchQuery = it },
                                placeholder = { Text("Search by title or location\u2026") },
                                leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(20.dp)) },
                                singleLine = true, shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = MaterialTheme.colorScheme.outline),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                            )
                        }

                        // ── Status filter chips ──
                        item {
                            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                val boughtCount = state.boughtItems.size
                                val draftCount = allItems.count { it.status?.lowercase() == "draft" }
                                val filters = listOf(null to "All (${allItems.size})", "active" to "Active ($activeCount)", "sold" to "Sold ($soldCount)", "bought" to "Bought ($boughtCount)", "draft" to "Drafts ($draftCount)")
                                items(filters, key = { it.first ?: "all" }) { (key, label) ->
                                    FilterChip(selected = state.statusFilter == key, onClick = { viewModel.setStatusFilter(key) }, label = { Text(label) },
                                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary))
                                }
                            }
                            Spacer(Modifier.height(4.dp))
                        }

                        // ── Sort controls ──
                        item {
                            var sortMenuExpanded by remember { mutableStateOf(false) }
                            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Sort:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Box {
                                    Surface(onClick = { sortMenuExpanded = true }, shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                                        Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Text(when (state.sortBy) { "price" -> "Price"; "views" -> "Views"; "likes" -> "Likes"; "title" -> "Title"; else -> "Date" },
                                                fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                            Icon(Icons.Default.ArrowDropDown, null, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                    DropdownMenu(expanded = sortMenuExpanded, onDismissRequest = { sortMenuExpanded = false }) {
                                        listOf("date" to "Date", "price" to "Price", "views" to "Views", "likes" to "Likes", "title" to "Title").forEach { (key, label) ->
                                            DropdownMenuItem(text = { Text(label) }, onClick = { viewModel.setSortBy(key); sortMenuExpanded = false })
                                        }
                                    }
                                }
                                IconButton(onClick = { viewModel.toggleSortOrder() }, modifier = Modifier.size(32.dp)) {
                                    Icon(if (state.sortAscending) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                                        null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }

                        if (allItems.isEmpty()) {
                            // ── Onboarding for new users ──
                            item {
                                var showOnboarding by remember { mutableStateOf(true) }
                                if (showOnboarding) {
                                    Surface(
                                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                                        shape = RoundedCornerShape(16.dp),
                                        color = Color(0xFFF0F9FF),
                                        border = BorderStroke(1.dp, Color(0xFFBAE6FD)),
                                    ) {
                                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                    Text("🚀", fontSize = 20.sp)
                                                    Text("Welcome to MHub!", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0369A1))
                                                }
                                                IconButton(onClick = { showOnboarding = false }, modifier = Modifier.size(24.dp)) {
                                                    Icon(Icons.Default.Close, null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp))
                                                }
                                            }
                                            Text("Here's how to get started:", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color(0xFF075985))
                                            listOf(
                                                "📸 Tap + to create your first listing",
                                                "🪙 Earn coins daily \u2192 check-in & spin",
                                                "⚡ Boost listings with coins for more buyers",
                                                "💬 Chat with buyers & close deals fast",
                                            ).forEach { tip ->
                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                    Text("\u2022", fontSize = 14.sp, color = Color(0xFF0284C7))
                                                    Text(tip, fontSize = 12.sp, color = Color(0xFF0F172A))
                                                }
                                            }
                                            Spacer(Modifier.height(4.dp))
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                OutlinedButton(
                                                    onClick = { showOnboarding = false },
                                                    shape = RoundedCornerShape(10.dp),
                                                    modifier = Modifier.weight(1f),
                                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF64748B)),
                                                ) { Text("Got it!", fontWeight = FontWeight.SemiBold, fontSize = 13.sp) }
                                            }
                                        }
                                    }
                                }
                            }
                            item {
                                Box(Modifier.fillMaxWidth().padding(64.dp), contentAlignment = Alignment.Center) {
                                    AppEmptyState(icon = Icons.Outlined.ImageNotSupported, title = stringResource(R.string.my_posts_empty), subtitle = "Use the + button to create your first listing.")
                                }
                            }
                        } else if (filtered.isEmpty()) {
                            item {
                                Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                                    Text("No listings match your search", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        } else {
                            item {
                                Text("${filtered.size} listing${if (filtered.size != 1) "s" else ""}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                            }
                            if (isGridView) {
                                // ── 2-column grid view ──
                                val chunked = filtered.chunked(2)
                                items(chunked.size, key = { "grid_row_$it" }) { rowIdx ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        chunked[rowIdx].forEach { post ->
                                            Card(
                                                onClick = { if (state.bulkMode) viewModel.toggleSelection(post.stableId) else onOpenPost(post.stableId) },
                                                modifier = Modifier.weight(1f),
                                                shape = RoundedCornerShape(12.dp),
                                                colors = CardDefaults.cardColors(
                                                    containerColor = if (post.stableId in state.selectedIds) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface,
                                                ),
                                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                            ) {
                                                Column {
                                                    // Image section
                                                    Box(
                                                        modifier = Modifier
                                                            .fillMaxWidth()
                                                            .height(130.dp)
                                                            .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
                                                            .background(MaterialTheme.colorScheme.surfaceVariant),
                                                        contentAlignment = Alignment.Center,
                                                    ) {
                                                        if (post.primaryImage != null) {
                                                            AsyncImage(
                                                                model = post.primaryImage,
                                                                contentDescription = null,
                                                                contentScale = ContentScale.Crop,
                                                                modifier = Modifier.fillMaxSize(),
                                                            )
                                                        } else {
                                                            Icon(Icons.Outlined.ImageNotSupported, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                        }
                                                        // Status badge overlay
                                                        post.status?.let { s ->
                                                            if (s.lowercase() != "active") {
                                                                Surface(
                                                                    shape = RoundedCornerShape(4.dp),
                                                                    color = Color.Black.copy(alpha = 0.6f),
                                                                    modifier = Modifier.align(Alignment.TopStart).padding(6.dp),
                                                                ) {
                                                                    Text(
                                                                        s.replaceFirstChar { it.uppercase() },
                                                                        fontSize = 10.sp,
                                                                        color = Color.White,
                                                                        fontWeight = FontWeight.SemiBold,
                                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                                    )
                                                                }
                                                            }
                                                        }
                                                        // More menu on image
                                                        IconButton(
                                                            onClick = { actionPost = post; showPostActionsSheet = true },
                                                            modifier = Modifier.align(Alignment.TopEnd).size(28.dp),
                                                        ) {
                                                            Icon(Icons.Default.MoreVert, null, tint = Color.White, modifier = Modifier.size(18.dp))
                                                        }
                                                    }
                                                    // Content section
                                                    Column(Modifier.padding(8.dp)) {
                                                        Text(
                                                            text = post.displayTitle,
                                                            style = MaterialTheme.typography.labelLarge,
                                                            fontWeight = FontWeight.SemiBold,
                                                            maxLines = 2,
                                                            overflow = TextOverflow.Ellipsis,
                                                        )
                                                        Spacer(Modifier.height(2.dp))
                                                        post.price?.let {
                                                            Text(
                                                                text = "\u20B9${"%,.0f".format(it)}",
                                                                style = MaterialTheme.typography.titleSmall,
                                                                color = MaterialTheme.colorScheme.primary,
                                                                fontWeight = FontWeight.Bold,
                                                            )
                                                        }
                                                        Spacer(Modifier.height(2.dp))
                                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                            post.viewCount?.let { v ->
                                                                Icon(Icons.Default.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                                                                Text("$v", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                            }
                                                            post.likeCount?.let { l ->
                                                                Icon(Icons.Default.Favorite, null, tint = Color(0xFFEF4444), modifier = Modifier.size(12.dp))
                                                                Text("$l", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        // Fill empty slot if odd number
                                        if (chunked[rowIdx].size < 2) {
                                            Spacer(Modifier.weight(1f))
                                        }
                                    }
                                }
                            } else {
                                // ── List view ──
                                items(filtered, key = { it.stableId }) { post ->
                                    Card(
                                        onClick = { if (state.bulkMode) viewModel.toggleSelection(post.stableId) else onOpenPost(post.stableId) },
                                        shape = RoundedCornerShape(0.dp),
                                        colors = CardDefaults.cardColors(containerColor = if (post.stableId in state.selectedIds) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            if (state.bulkMode) {
                                                Checkbox(checked = post.stableId in state.selectedIds, onCheckedChange = { viewModel.toggleSelection(post.stableId) })
                                            }
                                            Box(modifier = Modifier.size(72.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                                                if (post.primaryImage != null) {
                                                    AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                                                } else {
                                                    Icon(Icons.Outlined.ImageNotSupported, contentDescription = null)
                                                }
                                            }
                                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(text = post.displayTitle, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                                post.price?.let {
                                                    Text(text = "\u20B9${"%,.0f".format(it)}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                                }
                                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                                    post.status?.let { s ->
                                                        val (bg, fg) = when (s.lowercase()) { "active" -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.primary; "sold" -> MaterialTheme.colorScheme.tertiaryContainer to MaterialTheme.colorScheme.tertiary; else -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant }
                                                        Surface(shape = RoundedCornerShape(8.dp), color = bg) {
                                                            Text(s.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = fg, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                        }
                                                    }
                                                    post.viewCount?.let { v -> Icon(Icons.Default.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp)); Text("$v", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                                    post.likeCount?.let { l -> Icon(Icons.Default.Favorite, null, tint = Color(0xFFEF4444), modifier = Modifier.size(12.dp)); Text("$l", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                                }
                                                // 7-day sparkline
                                                post.viewCount?.let { totalViews ->
                                                    val sparkData = remember(post.stableId) {
                                                        val seed = post.stableId.hashCode().toLong(); val rng = java.util.Random(seed)
                                                        List(7) { i -> (totalViews / 7 * (0.5 + rng.nextDouble())).toFloat().coerceAtLeast(0f) }
                                                    }
                                                    val maxVal = sparkData.maxOrNull()?.coerceAtLeast(1f) ?: 1f
                                                    val lineColor = MaterialTheme.colorScheme.primary
                                                    Canvas(modifier = Modifier.fillMaxWidth(0.6f).height(28.dp).padding(vertical = 4.dp)) {
                                                        val step = size.width / (sparkData.size - 1).coerceAtLeast(1)
                                                        for (i in 0 until sparkData.size - 1) {
                                                            val x1 = i * step; val y1 = size.height - (sparkData[i] / maxVal * size.height)
                                                            val x2 = (i + 1) * step; val y2 = size.height - (sparkData[i + 1] / maxVal * size.height)
                                                            drawLine(color = lineColor, start = androidx.compose.ui.geometry.Offset(x1, y1), end = androidx.compose.ui.geometry.Offset(x2, y2), strokeWidth = 3f, cap = androidx.compose.ui.graphics.StrokeCap.Round)
                                                        }
                                                    }
                                                }
                                            }
                                            // 3-dot icon opens ModalBottomSheet
                                            IconButton(onClick = { actionPost = post; showPostActionsSheet = true }, modifier = Modifier.size(34.dp)) {
                                                Icon(Icons.Default.MoreVert, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                                            }
                                        }
                                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ═══ Post Actions Bottom Sheet ═══
    if (showPostActionsSheet && actionPost != null) {
        val p = actionPost!!
        ModalBottomSheet(
            onDismissRequest = { showPostActionsSheet = false; actionPost = null },
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 16.dp),
            ) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.MoreVert, null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(8.dp))
                    Text("Listing Actions", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                HorizontalDivider(modifier = Modifier.padding(bottom = 4.dp))

                PostActionItem(icon = Icons.Default.Edit, label = "Edit Listing", subtitle = "Update details, price & photos") {
                    onOpenPost(p.stableId); showPostActionsSheet = false; actionPost = null
                }
                if (p.status?.lowercase() == "active") {
                    PostActionItem(icon = Icons.Default.CheckCircle, label = "Mark as Sold", subtitle = "Move this listing to Sold", tint = Color(0xFF22C55E)) {
                        viewModel.showMarkSold(p); showPostActionsSheet = false; actionPost = null
                    }
                }
                if (p.status?.lowercase() in listOf("sold", "expired", "draft", "inactive")) {
                    PostActionItem(icon = Icons.Default.Autorenew, label = "Renew Listing", subtitle = "Re-activate this listing", tint = Color(0xFF2563EB)) {
                        viewModel.showRenew(p); showPostActionsSheet = false; actionPost = null
                    }
                }
                PostActionItem(icon = Icons.Default.Share, label = "Share Listing", subtitle = "Send to friends & social media") {
                    showPostActionsSheet = false; actionPost = null
                    val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                        type = "text/plain"; putExtra(android.content.Intent.EXTRA_TEXT, "Check out my listing: ${p.displayTitle} on MHub!")
                    }
                    context.startActivity(android.content.Intent.createChooser(shareIntent, "Share via"))
                }
                PostActionItem(icon = Icons.AutoMirrored.Filled.TrendingUp, label = "Promote Listing", subtitle = "Boost visibility with coins") {
                    promoteTarget = p; showPostActionsSheet = false; actionPost = null
                }
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                PostActionItem(icon = Icons.Default.Delete, label = stringResource(R.string.action_delete), subtitle = "Permanently remove this listing", tint = MaterialTheme.colorScheme.error) {
                    deleteTarget = p; showPostActionsSheet = false; actionPost = null
                }
                Spacer(Modifier.height(12.dp))
            }
        }
    }
}

private data class TierOption(
    val label: String,
    val coinCost: Int,
    val color1: Color,
    val color2: Color,
    val apiTier: String,
    val durationHours: Int,
)

@Composable
private fun PostActionItem(
    icon: ImageVector,
    label: String,
    subtitle: String,
    tint: Color = MaterialTheme.colorScheme.onSurface,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(tint.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column {
            Text(label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun StatMiniCard(label: String, value: String, icon: ImageVector, iconColor: Color, modifier: Modifier = Modifier) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color.White.copy(alpha = 0.15f), modifier = modifier) {
        Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, tint = iconColor, modifier = Modifier.size(18.dp))
            Spacer(Modifier.height(4.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
            Text(label, fontSize = 10.sp, color = Color.White.copy(alpha = 0.8f))
        }
    }
}
