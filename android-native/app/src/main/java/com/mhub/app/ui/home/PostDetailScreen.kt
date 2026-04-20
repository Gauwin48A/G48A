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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.ImageNotSupported
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.PostsRepository
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
)

@HiltViewModel
class PostDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repo: PostsRepository,
    private val wishlistRepo: WishlistRepository,
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
                is ApiResult.Success -> _state.value = PostDetailState(loading = false, post = result.data)
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
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .navigationBarsPadding()
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            OutlinedButton(
                                onClick = {},
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(14.dp),
                            ) {
                                Icon(Icons.Default.Chat, contentDescription = null)
                                Spacer(Modifier.width(6.dp))
                                Text("Chat")
                            }
                            Button(
                                onClick = {},
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(14.dp),
                            ) {
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
