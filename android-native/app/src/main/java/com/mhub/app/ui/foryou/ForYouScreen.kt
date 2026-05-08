package com.mhub.app.ui.foryou

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ForYouState(
    val loading: Boolean = true,
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
        _state.value = _state.value.copy(loading = true)
        viewModelScope.launch {
            // Load for-you posts
            when (val r = sponsoredRepo.forYou(30)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, posts = r.data)
                is ApiResult.Failure -> {
                    // Fallback to regular feed
                    when (val f = postsRepo.feed(limit = 30)) {
                        is ApiResult.Success -> _state.value = _state.value.copy(loading = false, posts = f.data)
                        is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = f.error.message)
                    }
                }
            }
            // Load sponsored
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
    val categories = listOf(null to "All", "electronics" to "Electronics", "fashion" to "Fashion", "vehicles" to "Vehicles", "mobiles" to "Mobiles")

    val displayed = remember(state.posts, state.selectedCategory) {
        if (state.selectedCategory == null) state.posts
        else state.posts.filter { it.categoryName?.contains(state.selectedCategory!!, ignoreCase = true) == true }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("For You", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        floatingActionButton = { BackToTopButton(listState, scope) },
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            state.error != null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Unable to load recommendations", fontWeight = FontWeight.SemiBold)
                    Text(state.error ?: "", style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.load() }) { Text("Retry") }
                }
            }
            else -> LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(bottom = 80.dp),
            ) {
                // Great deals banner
                item { GreatDealsBanner(onShopNow = {}) }

                // Category filter chips
                item {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(categories, key = { it.first ?: "all" }) { (key, label) ->
                            FilterChip(
                                selected = state.selectedCategory == key,
                                onClick = { viewModel.setCategory(key) },
                                label = { Text(label) },
                            )
                        }
                    }
                }

                // Sponsored carousel
                if (state.sponsored.isNotEmpty()) {
                    item {
                        Column(Modifier.padding(horizontal = 16.dp)) {
                            Text("Sponsored", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(8.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                items(state.sponsored, key = { "sp_${it.stableId}" }) { post ->
                                    Card(
                                        onClick = { onOpenPost(post.stableId) },
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier.width(200.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    ) {
                                        Column {
                                            Box(Modifier.fillMaxWidth().height(120.dp).background(MaterialTheme.colorScheme.surfaceVariant)) {
                                                post.primaryImage?.let { img ->
                                                    AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
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
                                            }
                                        }
                                    }
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                        }
                    }
                }

                // For You posts
                item {
                    Text(
                        "Recommended for you",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    )
                }

                if (displayed.isEmpty()) {
                    item {
                        Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Outlined.Recommend, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(8.dp))
                                Text("No recommendations yet", style = MaterialTheme.typography.bodyMedium)
                                Text("Browse more to improve suggestions", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                items(displayed, key = { it.stableId }) { post ->
                    Card(
                        onClick = { onOpenPost(post.stableId) },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    ) {
                        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(Modifier.size(80.dp).background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                                post.primaryImage?.let { img ->
                                    AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                                } ?: Icon(Icons.Outlined.ImageNotSupported, null)
                            }
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, fontSize = 14.sp)
                                post.price?.let { Text("₹${"%,.0f".format(it)}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary) }
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    post.condition?.let { Surface(shape = RoundedCornerShape(4.dp), color = MaterialTheme.colorScheme.surfaceVariant) { Text(it, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) } }
                                    post.location?.let { Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
