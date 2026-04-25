package com.mhub.app.ui.home

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.TrustScoreResponse
import com.mhub.app.data.repository.OffersRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.SocialRepository
import com.mhub.app.data.repository.TrustRepository
import com.mhub.app.data.repository.WishlistRepository
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.AppEmptyState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PostDetailState(
    val loading: Boolean = true,
    val post: Post? = null,
    val error: String? = null,
    val wishlisted: Boolean = false,
    val wishlistLoading: Boolean = false,
    val trustScore: TrustScoreResponse? = null,
    val offerSent: Boolean = false,
    val offerError: String? = null,
    val reported: Boolean = false,
)

@HiltViewModel
class PostDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repo: PostsRepository,
    private val wishlistRepo: WishlistRepository,
    private val trustRepo: TrustRepository,
    private val offersRepo: OffersRepository,
    private val socialRepo: SocialRepository,
) : ViewModel() {
    private val postId: String = savedStateHandle.get<String>("postId").orEmpty()
    private val _state = MutableStateFlow(PostDetailState())
    val state: StateFlow<PostDetailState> = _state.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        _state.value = PostDetailState(loading = true)
        viewModelScope.launch {
            when (val result = repo.detail(postId)) {
                is ApiResult.Success -> {
                    _state.value = PostDetailState(loading = false, post = result.data)
                    // Track view + recently viewed
                    launch { runCatching { socialRepo.viewPost(postId) } }
                    launch { runCatching { socialRepo.trackViewed(postId) } }
                    // Load trust score for seller
                    result.data.userId?.let { userId ->
                        launch {
                            when (val t = trustRepo.score(userId)) {
                                is ApiResult.Success -> _state.value = _state.value.copy(trustScore = t.data)
                                is ApiResult.Failure -> {} // non-critical
                            }
                        }
                    }
                }
                is ApiResult.Failure -> _state.value = PostDetailState(
                    loading = false,
                    error = result.error.message,
                )
            }
        }
    }

    fun toggleWishlist() {
        val current = _state.value
        if (current.wishlistLoading) return

        _state.value = current.copy(wishlistLoading = true)
        viewModelScope.launch {
            if (current.wishlisted) {
                wishlistRepo.remove(postId)
                _state.value = _state.value.copy(wishlisted = false, wishlistLoading = false)
            } else {
                wishlistRepo.add(postId)
                _state.value = _state.value.copy(wishlisted = true, wishlistLoading = false)
            }
        }
    }

    fun makeOffer(amount: Double) {
        viewModelScope.launch {
            when (offersRepo.makeOffer(postId, amount)) {
                is ApiResult.Success -> _state.value = _state.value.copy(offerSent = true, offerError = null)
                is ApiResult.Failure -> _state.value = _state.value.copy(offerError = "Failed to send offer")
            }
        }
    }

    fun reportPost() {
        viewModelScope.launch {
            runCatching { repo.report(postId) }
            _state.value = _state.value.copy(reported = true)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(
    onBack: () -> Unit,
    viewModel: PostDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Listing", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    FilledIconButton(
                        onClick = { viewModel.toggleWishlist() },
                        enabled = !state.wishlistLoading,
                    ) {
                        Icon(
                            imageVector = if (state.wishlisted) {
                                Icons.Filled.Favorite
                            } else {
                                Icons.Outlined.FavoriteBorder
                            },
                            contentDescription = null,
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    FilledIconButton(
                        onClick = {
                            val post = state.post ?: return@FilledIconButton
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, "Check this listing: ${post.displayTitle}")
                            }
                            context.startActivity(Intent.createChooser(intent, "Share listing"))
                        },
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null)
                    }
                    Spacer(Modifier.width(8.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        when {
            state.loading -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }

            state.error != null -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                AppErrorState(
                    title = "Unable to open listing",
                    message = state.error ?: "Unable to load listing",
                    onRetry = { viewModel.reload() },
                    retryLabel = "Reload listing",
                )
            }

            state.post == null -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                AppEmptyState(
                    icon = Icons.Outlined.ErrorOutline,
                    title = "Listing not available",
                    subtitle = "This listing may have been removed.",
                )
            }

            else -> {
                val post = state.post ?: return@Scaffold
                val images = buildList {
                    post.primaryImage?.let { add(it) }
                    post.images.filter { it != post.primaryImage }.forEach { add(it) }
                }.ifEmpty { listOf<String?>(null) }
                val pagerState = rememberPagerState(pageCount = { images.size })

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                ) {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(bottom = 20.dp),
                    ) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(280.dp)
                                    .background(MaterialTheme.colorScheme.surfaceVariant),
                                contentAlignment = Alignment.Center,
                            ) {
                                HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                                    val img = images[page]
                                    if (img != null) {
                                        AsyncImage(
                                            model = img,
                                            contentDescription = null,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize(),
                                        )
                                    } else {
                                        Icon(Icons.Outlined.ImageNotSupported, contentDescription = null)
                                    }
                                }

                                if (images.size > 1) {
                                    AssistChip(
                                        onClick = {},
                                        label = { Text("${pagerState.currentPage + 1}/${images.size}") },
                                        modifier = Modifier
                                            .align(Alignment.BottomEnd)
                                            .padding(10.dp),
                                    )
                                }
                            }
                        }

                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Text(
                                    text = post.displayTitle,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                                post.price?.let {
                                    Text(
                                        text = "INR ${"%,.0f".format(it)}",
                                        style = MaterialTheme.typography.headlineSmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    post.categoryName?.let { name ->
                                        AssistChip(onClick = {}, label = { Text(name) })
                                    }
                                    post.location?.let { loc ->
                                        AssistChip(
                                            onClick = {},
                                            label = { Text(loc, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                            leadingIcon = {
                                                Icon(Icons.Default.LocationOn, contentDescription = null)
                                            },
                                        )
                                    }
                                }

                                post.description?.takeIf { it.isNotBlank() }?.let {
                                    Text(
                                        text = it,
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }

                                post.viewCount?.let {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Outlined.Visibility, contentDescription = null)
                                        Spacer(Modifier.width(6.dp))
                                        Text("$it views", style = MaterialTheme.typography.bodySmall)
                                    }
                                }

                                // Trust Score Badge
                                state.trustScore?.let { ts ->
                                    val score = ts.trustScore.toInt()
                                    val trustColor = when { score >= 80 -> Color(0xFF22C55E); score >= 50 -> Color(0xFFF59E0B); else -> Color(0xFFEF4444) }
                                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = trustColor.copy(alpha = 0.1f)), modifier = Modifier.fillMaxWidth()) {
                                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.VerifiedUser, null, tint = trustColor, modifier = Modifier.size(22.dp))
                                            Spacer(Modifier.width(8.dp))
                                            Column {
                                                Text("Trust Score: $score/100", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = trustColor)
                                                Text(ts.trustLabel ?: when { score >= 80 -> "Highly Trusted"; score >= 50 -> "Trusted"; else -> "New Seller" }, fontSize = 12.sp, color = trustColor.copy(alpha = 0.8f))
                                            }
                                        }
                                    }
                                }

                                // Condition & Brand chips
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    post.condition?.let { c -> AssistChip(onClick = {}, label = { Text(c) }) }
                                    post.brand?.let { b -> AssistChip(onClick = {}, label = { Text(b) }) }
                                }

                                post.userName?.let {
                                    Card(
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = MaterialTheme.colorScheme.surface,
                                        ),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                        ) {
                                            Column {
                                                Text("Seller", style = MaterialTheme.typography.labelMedium)
                                                Text(it, fontWeight = FontWeight.SemiBold)
                                            }
                                            OutlinedButton(onClick = {
                                                val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:+91"))
                                                context.startActivity(dialIntent)
                                            }) {
                                                Icon(Icons.Default.Call, contentDescription = null)
                                                Spacer(Modifier.width(6.dp))
                                                Text("Call")
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Surface(color = MaterialTheme.colorScheme.surface) {
                        Column(Modifier.navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp)) {
                            // Make Offer / Report row
                            var showOfferDialog by remember { mutableStateOf(false) }
                            var offerAmount by remember { mutableStateOf("") }

                            if (state.offerSent) {
                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Text("Offer sent successfully!", color = Color(0xFF22C55E), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(12.dp))
                                }
                            }

                            if (showOfferDialog) {
                                Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        value = offerAmount, onValueChange = { offerAmount = it.filter(Char::isDigit) },
                                        placeholder = { Text("Your offer ₹") }, singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f).height(48.dp),
                                    )
                                    Button(onClick = {
                                        offerAmount.toDoubleOrNull()?.let { viewModel.makeOffer(it) }
                                        showOfferDialog = false
                                    }, enabled = offerAmount.isNotBlank(), shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))) {
                                        Text("Send", fontWeight = FontWeight.SemiBold)
                                    }
                                    TextButton(onClick = { showOfferDialog = false }) { Text("Cancel") }
                                }
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { showOfferDialog = !showOfferDialog }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                                    Icon(Icons.Filled.LocalOffer, null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Make Offer")
                                }
                                OutlinedButton(onClick = { if (!state.reported) viewModel.reportPost() }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = if (state.reported) Color(0xFF94A3B8) else Color(0xFFEF4444))) {
                                    Icon(Icons.Filled.Flag, null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(if (state.reported) "Reported" else "Report")
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedButton(onClick = {}, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                                    Icon(Icons.Default.Chat, contentDescription = null)
                                    Spacer(Modifier.width(6.dp))
                                    Text("Chat")
                                }
                                Button(onClick = {}, modifier = Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) {
                                    Icon(Icons.Default.ShoppingBag, contentDescription = null)
                                    Spacer(Modifier.width(6.dp))
                                    Text("Buy now")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
