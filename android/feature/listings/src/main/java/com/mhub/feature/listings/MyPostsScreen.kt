package com.mhub.feature.listings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.core.common.model.Post
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.AuthRepository
import com.mhub.core.data.repository.PostRepository
import com.mhub.core.ui.components.MhubErrorState
import com.mhub.core.ui.components.MhubLoadingIndicator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale
import javax.inject.Inject

@Composable
fun MyPostsScreen(
    onPostClick: (Int) -> Unit,
    onEditPost: (Int) -> Unit,
    onBack: () -> Unit,
    viewModel: MyPostsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Listings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
            )
        },
    ) { padding ->
        when {
            uiState.isLoading -> MhubLoadingIndicator(modifier = Modifier.padding(padding))
            uiState.error != null -> MhubErrorState(
                message = uiState.error!!,
                onRetry = viewModel::refresh,
                modifier = Modifier.padding(padding),
            )
            uiState.posts.isEmpty() -> {
                Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("No listings yet", style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.height(8.dp))
                        Text("Create your first listing to start selling!", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(uiState.posts, key = { it.id }) { post ->
                        MyPostCard(
                            post = post,
                            onClick = { onPostClick(post.id) },
                            onEdit = { onEditPost(post.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MyPostCard(
    post: Post,
    onClick: () -> Unit,
    onEdit: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(modifier = Modifier.padding(12.dp)) {
            if (post.images.isNotEmpty()) {
                AsyncImage(
                    model = post.images.first(),
                    contentDescription = post.title,
                    modifier = Modifier.size(80.dp),
                    contentScale = ContentScale.Crop,
                )
                Spacer(Modifier.width(12.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(post.title, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                post.price?.let {
                    Text(
                        NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(it),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                if (post.isSold) {
                    AssistChip(onClick = {}, label = { Text("Sold") })
                }
            }
            IconButton(onClick = onEdit) {
                Icon(Icons.Default.Edit, "Edit")
            }
        }
    }
}

data class MyPostsUiState(
    val posts: List<Post> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class MyPostsViewModel @Inject constructor(
    private val postRepository: PostRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MyPostsUiState())
    val uiState = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val userId = authRepository.currentUser.first()?.id
            if (userId == null) {
                _uiState.update { it.copy(isLoading = false, error = "Not logged in") }
                return@launch
            }
            when (val result = postRepository.fetchUserPosts(userId)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, posts = result.data) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }
}
