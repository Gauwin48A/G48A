package com.mhub.feature.detail

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import android.content.Intent
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.core.common.model.Post
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.PostRepository
import com.mhub.core.data.repository.WishlistRepository
import com.mhub.core.ui.components.MhubErrorState
import com.mhub.core.ui.components.MhubLoadingIndicator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale
import javax.inject.Inject

@Composable
fun PostDetailScreen(
    onBack: () -> Unit,
    onNavigateToChat: ((Int) -> Unit)? = null,
    viewModel: PostDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Details") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.toggleWishlist() }) {
                        Icon(
                            if (uiState.isWishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = if (uiState.isWishlisted) "Remove from wishlist" else "Add to wishlist",
                            tint = if (uiState.isWishlisted) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                        )
                    }
                    IconButton(onClick = {
                        uiState.post?.let { post ->
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_SUBJECT, post.title)
                                putExtra(Intent.EXTRA_TEXT, "Check out ${post.title} on MHub: https://mhub.app/post/${post.id}")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                        }
                    }) {
                        Icon(Icons.Default.Share, contentDescription = "Share")
                    }
                },
            )
        },
    ) { padding ->
        when {
            uiState.isLoading -> MhubLoadingIndicator(modifier = Modifier.padding(padding))
            uiState.error != null -> MhubErrorState(message = uiState.error!!, onRetry = viewModel::refresh, modifier = Modifier.padding(padding))
            uiState.post != null -> {
                val post = uiState.post!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .semantics { contentDescription = "Post detail: ${post.title}" },
                ) {
                    // Image pager
                    if (post.images.isNotEmpty()) {
                        val pagerState = rememberPagerState(pageCount = { post.images.size })
                        HorizontalPager(state = pagerState) { page ->
                            AsyncImage(
                                model = post.images[page],
                                contentDescription = "${post.title} image ${page + 1}",
                                modifier = Modifier.fillMaxWidth().height(300.dp),
                                contentScale = ContentScale.Crop,
                            )
                        }
                        if (post.images.size > 1) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(8.dp),
                                horizontalArrangement = Arrangement.Center,
                            ) {
                                repeat(post.images.size) { index ->
                                    val color = if (pagerState.currentPage == index) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.outlineVariant
                                    Surface(
                                        modifier = Modifier.size(8.dp).clip(CircleShape),
                                        color = color,
                                    ) {}
                                    if (index < post.images.size - 1) Spacer(modifier = Modifier.width(4.dp))
                                }
                            }
                        }
                    }

                    Column(modifier = Modifier.padding(16.dp)) {
                        // Price
                        post.price?.let { price ->
                            Text(
                                text = formatPrice(price, post.currency),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        // Title
                        Text(text = post.title, style = MaterialTheme.typography.titleLarge)
                        Spacer(modifier = Modifier.height(8.dp))

                        // Location & condition
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            post.location?.let { AssistChip(onClick = {}, label = { Text(it) }) }
                            post.condition?.let { AssistChip(onClick = {}, label = { Text(it) }) }
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                        HorizontalDivider()
                        Spacer(modifier = Modifier.height(16.dp))

                        // Description
                        Text("Description", style = MaterialTheme.typography.titleMedium)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = post.description ?: "No description provided",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )

                        Spacer(modifier = Modifier.height(16.dp))
                        HorizontalDivider()
                        Spacer(modifier = Modifier.height(16.dp))

                        // Seller info
                        Text("Seller", style = MaterialTheme.typography.titleMedium)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            post.userAvatar?.let { avatar ->
                                AsyncImage(
                                    model = avatar,
                                    contentDescription = "Seller avatar",
                                    modifier = Modifier.size(40.dp).clip(CircleShape),
                                    contentScale = ContentScale.Crop,
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                            }
                            Text(text = post.userName ?: "Unknown seller", style = MaterialTheme.typography.bodyLarge)
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        // Contact button
                        Button(
                            onClick = {
                                uiState.post?.userId?.let { userId ->
                                    onNavigateToChat?.invoke(userId)
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                        ) {
                            Text("Contact Seller")
                        }
                    }
                }
            }
        }
    }
}

private fun formatPrice(price: Double, currency: String): String {
    val locale = if (currency == "INR") Locale("en", "IN") else Locale.getDefault()
    return NumberFormat.getCurrencyInstance(locale).format(price)
}

data class PostDetailUiState(
    val post: Post? = null, val isLoading: Boolean = false, val error: String? = null, val isWishlisted: Boolean = false,
)

@HiltViewModel
class PostDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val postRepository: PostRepository,
    private val wishlistRepository: WishlistRepository,
) : ViewModel() {

    private val postId: Int = savedStateHandle["postId"] ?: 0
    private val _uiState = MutableStateFlow(PostDetailUiState())
    val uiState = _uiState.asStateFlow()

    init {
        // Observe cache
        viewModelScope.launch {
            postRepository.observePost(postId).collect { post ->
                if (post != null) _uiState.update { it.copy(post = post) }
            }
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isWishlisted = wishlistRepository.isInWishlist(postId)) }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = postRepository.fetchPost(postId)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message ?: "Failed to load post") }
                is Result.Loading -> {}
            }
        }
    }

    fun toggleWishlist() {
        viewModelScope.launch {
            val isCurrentlyWishlisted = _uiState.value.isWishlisted
            if (isCurrentlyWishlisted) {
                wishlistRepository.removeFromWishlist(postId)
            } else {
                wishlistRepository.addToWishlist(postId)
            }
            _uiState.update { it.copy(isWishlisted = !isCurrentlyWishlisted) }
        }
    }
}
