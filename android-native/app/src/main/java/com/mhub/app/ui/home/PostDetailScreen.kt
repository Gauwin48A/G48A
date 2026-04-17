package com.mhub.app.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Post
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(onBack: () -> Unit, viewModel: PostDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.post?.displayTitle ?: "") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null) }
                },
            )
        }
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.error != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error!!, color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.reload() }) { Text("Retry") }
                }
                state.post != null -> {
                    val p = state.post!!
                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        p.primaryImage?.let {
                            AsyncImage(
                                model = it,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxWidth().height(260.dp),
                            )
                        }
                        Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(p.displayTitle, style = MaterialTheme.typography.headlineMedium)
                            p.price?.let {
                                Text("₹${"%,.0f".format(it)}", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                            }
                            p.description?.let { Text(it, style = MaterialTheme.typography.bodyLarge) }
                            Spacer(Modifier.height(24.dp))
                        }
                    }
                }
            }
        }
    }
}
