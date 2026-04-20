package com.mhub.app.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.WishlistRepository
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.components.PrimaryButton
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

    init { reload() }

    fun reload() {
        _state.value = PostDetailState(loading = true)
        viewModelScope.launch {
            when (val res = repo.detail(postId)) {
                is ApiResult.Success -> _state.value = PostDetailState(loading = false, post = res.data)
                is ApiResult.Failure -> _state.value = PostDetailState(loading = false, error = res.error.message)
            }
        }
    }

    fun addToWishlist() {
        viewModelScope.launch { wishlistRepo.add(postId) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(onBack: () -> Unit, viewModel: PostDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.post?.displayTitle ?: "", maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) }
                },
                actions = {
                    IconButton(onClick = { viewModel.addToWishlist() }) {
                        Icon(Icons.Default.FavoriteBorder, contentDescription = stringResource(R.string.nav_wishlist))
                    }
                    IconButton(onClick = { /* share */ }) {
                        Icon(Icons.Default.Share, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.error != null -> Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(state.error!!, color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.height(12.dp))
                    PrimaryButton(text = stringResource(R.string.action_retry), onClick = { viewModel.reload() })
                }
                state.post != null -> {
                    val p = state.post!!
                    Column(
                        Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                    ) {
                        // Image
                        p.primaryImage?.let {
                            AsyncImage(
                                model = it,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxWidth().height(280.dp),
                            )
                        }

                        Column(
                            Modifier.padding(horizontal = 16.dp, vertical = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            // Title
                            Text(
                                p.displayTitle,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                            )

                            // Price
                            p.price?.let {
                                Text(
                                    "₹${"%,.0f".format(it)}",
                                    style = MaterialTheme.typography.headlineMedium,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold,
                                )
                            }

                            // Chips row
                            @OptIn(ExperimentalLayoutApi::class)
                            FlowRow(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                p.categoryName?.let {
                                    AssistChip(onClick = {}, label = { Text(it, maxLines = 1, overflow = TextOverflow.Ellipsis) })
                                }
                                p.location?.let {
                                    AssistChip(
                                        onClick = {},
                                        label = { Text(it, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                        leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp)) },
                                    )
                                }
                            }

                            // Seller info
                            p.userName?.let { seller ->
                                HorizontalDivider()
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier.padding(vertical = 8.dp),
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(50),
                                        color = MaterialTheme.colorScheme.primaryContainer,
                                        modifier = Modifier.size(40.dp),
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                seller.firstOrNull()?.uppercaseChar()?.toString() ?: "?",
                                                style = MaterialTheme.typography.titleMedium,
                                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                            )
                                        }
                                    }
                                    Column {
                                        Text(seller, style = MaterialTheme.typography.titleSmall)
                                        Text("Seller", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                HorizontalDivider()
                            }

                            // Description
                            p.description?.takeIf { it.isNotBlank() }?.let {
                                Spacer(Modifier.height(4.dp))
                                Text("Description", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                Text(it, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }

                            // View count
                            p.viewCount?.let { views ->
                                if (views > 0) {
                                    Text(
                                        "$views views",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }

                            Spacer(Modifier.height(24.dp))
                        }
                    }
                }
            }
        }
    }
}
