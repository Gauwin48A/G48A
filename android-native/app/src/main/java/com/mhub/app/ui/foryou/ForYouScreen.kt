package com.mhub.app.ui.foryou

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.SponsoredRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.BackToTopButton
import com.mhub.app.ui.components.GreatDealsBanner
import com.mhub.app.ui.components.ShareLinkBottomSheet
import com.mhub.app.ui.components.BuyerInterestModal
import com.mhub.app.ui.components.PostActionRow
import com.mhub.app.ui.components.PromoBadgeRow
import com.mhub.app.ui.components.ImageZoomDialog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ForYouState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val posts: List<Post> = emptyList(),
    val sponsored: List<Post> = emptyList(),
    val error: String? = null,
    val selectedCategory: String? = null,
)

@HiltViewModel
class ForYouViewModel @Inject constructor(
    private val sponsoredRepo: SponsoredRepository,
    private val postsRepo: PostsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ForYouState())
    val state: StateFlow<ForYouState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = sponsoredRepo.forYou(30)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, posts = r.data)
                is ApiResult.Failure -> {
                    when (val f = postsRepo.feed(limit = 30)) {
                        is ApiResult.Success -> _state.value = _state.value.copy(loading = false, posts = f.data)
                        is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = f.error.message)
                    }
                }
            }
            when (val s = sponsoredRepo.list(8)) {
                is ApiResult.Success -> _state.value = _state.value.copy(sponsored = s.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true, error = null)
        viewModelScope.launch {
            when (val r = sponsoredRepo.forYou(30)) {
                is ApiResult.Success -> _state.value = _state.value.copy(refreshing = false, posts = r.data)
                is ApiResult.Failure -> {
                    when (val f = postsRepo.feed(limit = 30)) {
                        is ApiResult.Success -> _state.value = _state.value.copy(refreshing = false, posts = f.data)
                        is ApiResult.Failure -> _state.value = _state.value.copy(refreshing = false, error = f.error.message)
                    }
                }
            }
            when (val s = sponsoredRepo.list(8)) {
                is ApiResult.Success -> _state.value = _state.value.copy(sponsored = s.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun setCategory(cat: String?) {
        _state.value = _state.value.copy(selectedCategory = cat)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForYouScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    viewModel: ForYouViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val categories = listOf(
        null to "All", "electronics" to "Electronics", "fashion" to "Fashion",
        "vehicles" to "Vehicles", "mobiles" to "Mobiles", "grocery" to "Grocery",
        "furniture" to "Furniture",
    )

    var quickFilter by remember { mutableStateOf<String?>(null) }
    var showShareSheet by remember { mutableStateOf(false) }
    var sharePostId by remember { mutableStateOf("") }
    var sharePostTitle by remember { mutableStateOf("") }
    var showInterestModal by remember { mutableStateOf(false) }
    var interestPostId by remember { mutableStateOf("") }
    var interestPostTitle by remember { mutableStateOf("") }
    var zoomImages by remember { mutableStateOf<List<String>>(emptyList()) }

    if (showShareSheet) {
        ShareLinkBottomSheet(title = sharePostTitle, postId = sharePostId, onDismiss = { showShareSheet = false })
    }
    if (showInterestModal) {
        BuyerInterestModal(
            postId = interestPostId, postTitle = interestPostTitle,
            onDismiss = { showInterestModal = false },
            onSubmit = { _, _, _ -> showInterestModal = false },
        )
    }
    if (zoomImages.isNotEmpty()) {
        ImageZoomDialog(imageUrls = zoomImages, onDismiss = { zoomImages = emptyList() })
    }

    val displayed = remember(state.posts, state.selectedCategory, quickFilter) {
        state.posts
            .filter { post ->
                state.selectedCategory == null || post.categoryName?.contains(state.selectedCategory!!, ignoreCase = true) == true
            }
            .let { list ->
                when (quickFilter) {
                    "Under ₹500" -> list.filter { (it.price ?: Double.MAX_VALUE) < 500.0 }
                    "Trending" -> list.sortedByDescending { it.viewCount ?: 0 }
                    else -> list
                }
            }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("For You", fontWeight = FontWeight.Bold)
                        Text("Personalized recommendations", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        floatingActionButton = { BackToTopButton(listState, scope) },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.error != null && state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Outlined.ErrorOutline, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(12.dp))
                        Text("Unable to load recommendations", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(4.dp))
                        Text(state.error ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.load() }) { Text("Retry") }
                    }
                }
                else -> LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 80.dp),
                ) {
                    item { GreatDealsBanner(onShopNow = { quickFilter = "Under ₹500" }, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }

                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(categories, key = { it.first ?: "all" }) { (key, label) ->
                                FilterChip(
                                    selected = state.selectedCategory == key,
                                    onClick = { viewModel.setCategory(key) },
                                    label = { Text(label) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }

                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            val qFilters = listOf(
                                "Under ₹500" to Icons.Default.LocalOffer,
                                "Trending" to Icons.Default.TrendingUp,
                                "New Arrivals" to Icons.Default.NewReleases,
                            )
                            items(qFilters, key = { it.first }) { (label, icon) ->
                                FilterChip(
                                    selected = quickFilter == label,
                                    onClick = { quickFilter = if (quickFilter == label) null else label },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    leadingIcon = { Icon(icon, null, modifier = Modifier.size(14.dp)) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.tertiary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onTertiary,
                                        selectedLeadingIconColor = MaterialTheme.colorScheme.onTertiary,
                                    ),
                                )
                            }
                        }
                    }

                    if (state.sponsored.isNotEmpty()) {
                        item {
                            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                                Text("Sponsored", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(8.dp))
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    items(state.sponsored, key = { "sp_${it.stableId}" }) { post ->
                                        Card(
                                            onClick = { onOpenPost(post.stableId) },
                                            shape = RoundedCornerShape(14.dp),
                                            modifier = Modifier.width(200.dp),
                                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                            elevation = CardDefaults.cardElevation(2.dp),
                                        ) {
                                            Column {
                                                Box(Modifier.fillMaxWidth().height(120.dp).background(MaterialTheme.colorScheme.surfaceVariant)) {
                                                    post.primaryImage?.let { img ->
                                                        AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clickable { zoomImages = listOf(img) })
                                                    }
                                                    Surface(
                                                        shape = RoundedCornerShape(4.dp),
                                                        color = Color(0xFF7C3AED),
                                                        modifier = Modifier.align(Alignment.TopStart).padding(6.dp),
                                                    ) { Text("⚡ Ad", color = Color.White, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) }
                                                }
                                                Column(Modifier.padding(10.dp)) {
                                                    Text(post.displayTitle, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                                    post.price?.let { Text("₹${"%,.0f".format(it)}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary) }
                                                    post.location?.let {
                                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                                            Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(11.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                            Spacer(Modifier.width(2.dp))
                                                            Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                Spacer(Modifier.height(8.dp))
                            }
                        }
                    }

                    item {
                        Text("Recommended for you", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
                    }

                    if (displayed.isEmpty()) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Outlined.Recommend, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(Modifier.height(8.dp))
                                    Text("No recommendations yet", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                    Text("Browse more to improve suggestions", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }

                    items(displayed, key = { it.stableId }) { post ->
                        var wishlisted by remember { mutableStateOf(false) }
                        var liked by remember { mutableStateOf(false) }

                        Card(
                            onClick = { onOpenPost(post.stableId) },
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(2.dp),
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                        ) {
                            Column {
                                Box(Modifier.fillMaxWidth().height(200.dp).background(MaterialTheme.colorScheme.surfaceVariant)) {
                                    post.primaryImage?.let { img ->
                                        AsyncImage(
                                            model = img, contentDescription = null,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize().clickable { zoomImages = listOf(img) },
                                        )
                                    } ?: Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Outlined.ImageNotSupported, null, modifier = Modifier.size(36.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.5f)), startY = 100f)))
                                    post.price?.let { p ->
                                        Text("₹${"%,.0f".format(p)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.align(Alignment.BottomStart).padding(12.dp))
                                    }
                                    IconButton(
                                        onClick = { wishlisted = !wishlisted },
                                        modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(36.dp).background(Color.Black.copy(alpha = 0.25f), CircleShape),
                                    ) {
                                        Icon(if (wishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder, "Wishlist", tint = if (wishlisted) Color(0xFFEF4444) else Color.White, modifier = Modifier.size(18.dp))
                                    }
                                    PromoBadgeRow(postId = post.stableId, modifier = Modifier.align(Alignment.TopStart).padding(8.dp))
                                }

                                Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    val sellerName = post.sellerName ?: post.userName
                                    if (sellerName != null) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(Modifier.size(24.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                                                Text(sellerName.take(1).uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                            }
                                            Spacer(Modifier.width(6.dp))
                                            Text(sellerName, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                            if (post.sellerName != null) {
                                                Icon(Icons.Default.VerifiedUser, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(14.dp))
                                            }
                                        }
                                        Spacer(Modifier.height(2.dp))
                                    }

                                    Text(post.displayTitle, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, fontSize = 15.sp)

                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        post.condition?.let { cond ->
                                            Surface(shape = RoundedCornerShape(4.dp), color = if (cond.lowercase() == "new") Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant) {
                                                Text(cond.replaceFirstChar { c -> c.uppercase() }, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (cond.lowercase() == "new") Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                        }
                                        post.brand?.let { b ->
                                            Surface(shape = RoundedCornerShape(4.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                                                Text(b, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }

                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        post.location?.let {
                                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                                Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(13.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Spacer(Modifier.width(2.dp))
                                                Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            }
                                        }
                                        post.viewCount?.let { v ->
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.Visibility, null, modifier = Modifier.size(13.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Spacer(Modifier.width(2.dp))
                                                Text(v.toString(), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }

                                    HorizontalDivider(modifier = Modifier.padding(top = 4.dp), thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
                                    PostActionRow(
                                        postId = post.stableId,
                                        viewCount = post.viewCount ?: 0,
                                        isLiked = liked,
                                        isWishlisted = wishlisted,
                                        onLike = { liked = !liked },
                                        onWishlist = { wishlisted = !wishlisted },
                                        onInterested = {
                                            interestPostId = post.stableId
                                            interestPostTitle = post.displayTitle
                                            showInterestModal = true
                                        },
                                        onShare = {
                                            sharePostId = post.stableId
                                            sharePostTitle = post.displayTitle
                                            showShareSheet = true
                                        },
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
