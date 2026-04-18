package com.mhub.app.ui.post

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
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
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MyPostsState(val loading: Boolean = true, val items: List<Post> = emptyList(), val error: String? = null)

@HiltViewModel
class MyPostsViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    private val _state = MutableStateFlow(MyPostsState())
    val state: StateFlow<MyPostsState> = _state.asStateFlow()
    init { load() }
    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.mine()) {
                is ApiResult.Success -> _state.value = MyPostsState(loading = false, items = r.data)
                is ApiResult.Failure -> _state.value = MyPostsState(loading = false, error = r.error.message)
            }
        }
    }
    fun delete(id: String) {
        viewModelScope.launch { repo.delete(id); load() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyPostsScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit, viewModel: MyPostsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.profile_my_posts)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.error != null -> Text(state.error!!, Modifier.padding(24.dp), color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
                state.items.isEmpty() -> Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(stringResource(R.string.my_posts_empty), textAlign = TextAlign.Center)
                }
                else -> {
                    var deleteTarget by remember { mutableStateOf<Post?>(null) }

                    if (deleteTarget != null) {
                        AlertDialog(
                            onDismissRequest = { deleteTarget = null },
                            title = { Text(stringResource(R.string.action_delete)) },
                            text = { Text(stringResource(R.string.action_confirm_delete)) },
                            confirmButton = {
                                TextButton(onClick = {
                                    viewModel.delete(deleteTarget!!.stableId)
                                    deleteTarget = null
                                }) { Text(stringResource(R.string.action_delete), color = MaterialTheme.colorScheme.error) }
                            },
                            dismissButton = {
                                TextButton(onClick = { deleteTarget = null }) { Text(stringResource(R.string.action_cancel)) }
                            },
                        )
                    }

                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(state.items, key = { it.stableId }) { post ->
                            ElevatedCard(onClick = { onOpenPost(post.stableId) }, shape = RoundedCornerShape(14.dp)) {
                                Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                    post.primaryImage?.let {
                                        AsyncImage(model = it, contentDescription = null, contentScale = ContentScale.Crop,
                                            modifier = Modifier.size(64.dp).clip(RoundedCornerShape(8.dp)))
                                        Spacer(Modifier.width(10.dp))
                                    }
                                    Column(Modifier.weight(1f)) {
                                        Text(post.displayTitle, style = MaterialTheme.typography.titleSmall, maxLines = 2)
                                        post.price?.let { Text("₹${"%,.0f".format(it)}", color = MaterialTheme.colorScheme.primary) }
                                    }
                                    IconButton(onClick = { deleteTarget = post }) {
                                        Icon(Icons.Default.Delete, contentDescription = stringResource(R.string.action_delete), tint = MaterialTheme.colorScheme.error)
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
