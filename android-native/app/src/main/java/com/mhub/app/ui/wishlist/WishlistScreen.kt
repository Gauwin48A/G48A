package com.mhub.app.ui.wishlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.WishlistRepository
import com.mhub.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WishlistState(val loading: Boolean = true, val items: List<Post> = emptyList(), val error: String? = null)

@HiltViewModel
class WishlistViewModel @Inject constructor(private val repo: WishlistRepository) : ViewModel() {
    private val _state = MutableStateFlow(WishlistState())
    val state: StateFlow<WishlistState> = _state.asStateFlow()
    init { load() }
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.list()) {
                is ApiResult.Success -> _state.value = WishlistState(loading = false, items = r.data)
                is ApiResult.Failure -> _state.value = WishlistState(loading = false, error = r.error.message)
            }
        }
    }
    fun remove(postId: String) {
        viewModelScope.launch { repo.remove(postId); load() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WishlistScreen(
    onOpenPost: (String) -> Unit,
    viewModel: WishlistViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = { TopAppBar(title = { Text(stringResource(R.string.nav_wishlist)) }) }
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.error != null -> Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) { Text(state.error!!, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center) }
                state.items.isEmpty() -> Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(Icons.Default.FavoriteBorder, contentDescription = null, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text(stringResource(R.string.wishlist_empty), textAlign = TextAlign.Center)
                }
                else -> LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(state.items, key = { it.stableId }) { post ->
                        ElevatedCard(onClick = { onOpenPost(post.stableId) }, shape = RoundedCornerShape(16.dp)) {
                            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                post.primaryImage?.let {
                                    AsyncImage(
                                        model = it, contentDescription = null, contentScale = ContentScale.Crop,
                                        modifier = Modifier.size(72.dp).clip(RoundedCornerShape(10.dp)),
                                    )
                                    Spacer(Modifier.width(12.dp))
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(post.displayTitle, style = MaterialTheme.typography.titleMedium, maxLines = 2)
                                    post.price?.let {
                                        Text("₹${"%,.0f".format(it)}", color = MaterialTheme.colorScheme.primary)
                                    }
                                }
                                TextButton(onClick = { viewModel.remove(post.stableId) }) { Text("Remove") }
                            }
                        }
                    }
                }
            }
        }
    }
}
