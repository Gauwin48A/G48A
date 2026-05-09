package com.mhub.app.ui.channels

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
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
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import com.mhub.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

private val bgGradient get() = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TopBar(title: String, onBack: () -> Unit, trailing: @Composable (() -> Unit)? = null) {
    TopAppBar(
        title = { Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp) },
        navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
        actions = { trailing?.invoke() },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
    )
}

// ─── ChannelsListScreen ──────────────────────────────────────────────────────
data class ChannelsUiState(val loading: Boolean = true, val refreshing: Boolean = false, val channels: List<Channel> = emptyList(), val error: String? = null, val search: String = "")

@HiltViewModel
class ChannelsListViewModel @Inject constructor(private val repo: ChannelsRepository) : ViewModel() {
    private val _state = MutableStateFlow(ChannelsUiState())
    val state: StateFlow<ChannelsUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true)
        when (val r = repo.list()) {
            is ApiResult.Success -> _state.value = _state.value.copy(loading = false, channels = r.data)
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
        }
    } }
    fun refresh() { viewModelScope.launch {
        _state.value = _state.value.copy(refreshing = true)
        when (val r = repo.list()) {
            is ApiResult.Success -> _state.value = _state.value.copy(refreshing = false, channels = r.data)
            is ApiResult.Failure -> _state.value = _state.value.copy(refreshing = false)
        }
    } }
    fun setSearch(v: String) { _state.value = _state.value.copy(search = v) }
    fun toggleFollow(ch: Channel) { viewModelScope.launch {
        val id = ch.stableId
        if (ch.isMember) repo.unfollow(id) else repo.follow(id)
        load()
    } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChannelsListScreen(onBack: () -> Unit, onOpenChannel: (String) -> Unit = {}, onCreateChannel: () -> Unit = {}, viewModel: ChannelsListViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val filtered = state.channels.filter { state.search.isBlank() || it.displayName.contains(state.search, true) || (it.description ?: "").contains(state.search, true) }

    Scaffold(
        topBar = { TopBar("Channels", onBack) { IconButton(onClick = onCreateChannel) { Icon(Icons.Filled.Add, null, tint = MaterialTheme.colorScheme.primary) } } },
    ) { padding ->
        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize().padding(padding)) {
            Column(Modifier.fillMaxSize()) {
                // Search bar
                OutlinedTextField(value = state.search, onValueChange = { viewModel.setSearch(it) },
                    placeholder = { Text("Search channels…") }, leadingIcon = { Icon(Icons.Filled.Search, null) },
                    trailingIcon = { if (state.search.isNotBlank()) IconButton(onClick = { viewModel.setSearch("") }) { Icon(Icons.Filled.Close, null) } },
                    singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface))
                Spacer(Modifier.height(8.dp))
                when {
                    state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                    filtered.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                            Icon(Icons.Filled.Forum, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(16.dp))
                            Text(if (state.search.isNotBlank()) "No channels match" else "No channels yet", fontWeight = FontWeight.SemiBold)
                            if (state.search.isBlank()) { Spacer(Modifier.height(16.dp)); Button(onClick = onCreateChannel, shape = RoundedCornerShape(12.dp)) { Text("Create First Channel") } }
                        }
                    }
                    else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item { Text("${filtered.size} channel${if (filtered.size != 1) "s" else ""}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        items(filtered, key = { it.stableId }) { ch ->
                            ChannelCard(ch, onFollow = { viewModel.toggleFollow(ch) }) { onOpenChannel(ch.stableId) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChannelCard(channel: Channel, onFollow: () -> Unit, onClick: () -> Unit) {
    Card(onClick = onClick, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp), modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                Text(channel.displayName.take(1).uppercase(), color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(channel.displayName, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                    if (channel.isVerified) {
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Filled.Verified, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(16.dp))
                    }
                }
                channel.description?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis) }
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.People, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                        Spacer(Modifier.width(3.dp))
                        Text("${channel.memberCount} members", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Article, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                        Spacer(Modifier.width(3.dp))
                        Text("${channel.postCount} posts", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (channel.isMember) {
                OutlinedButton(onClick = onFollow, shape = RoundedCornerShape(20.dp), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp), modifier = Modifier.height(32.dp)) { Text("Following", fontSize = 11.sp) }
            } else {
                Button(onClick = onFollow, shape = RoundedCornerShape(20.dp), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp), modifier = Modifier.height(32.dp)) { Text("Follow", fontSize = 11.sp) }
            }
        }
    }
}

// ─── CreateChannelScreen ─────────────────────────────────────────────────────
data class CreateChannelUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val name: String = "", val description: String = "", val category: String = "")

@HiltViewModel
class CreateChannelViewModel @Inject constructor(private val repo: ChannelsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CreateChannelUiState())
    val state: StateFlow<CreateChannelUiState> = _state.asStateFlow()
    fun setName(v: String) { _state.value = _state.value.copy(name = v) }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v) }
    fun setCategory(v: String) { _state.value = _state.value.copy(category = v) }
    fun submit() {
        val s = _state.value
        if (s.name.isBlank()) { _state.value = s.copy(error = "Channel name is required"); return }
        if (s.name.length < 3) { _state.value = s.copy(error = "Name must be at least 3 characters"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.create(CreateChannelRequest(name = s.name, description = s.description.ifBlank { null }))) {
                is ApiResult.Success -> _state.value = CreateChannelUiState(success = true)
                is ApiResult.Failure -> _state.value = s.copy(loading = false, error = r.error.message)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateChannelScreen(onBack: () -> Unit, viewModel: CreateChannelViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(state.success) { if (state.success) onBack() }

    Scaffold(topBar = { TopBar("Create Channel", onBack) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            state.error?.let {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFEE2E2)), shape = RoundedCornerShape(10.dp)) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.ErrorOutline, null, tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(it, color = Color(0xFFDC2626), fontSize = 13.sp)
                    }
                }
            }
            CField("Channel Name *", state.name, viewModel::setName, "e.g. Electronics Deals, Fashion Hub…")
            Text("${state.name.length}/50", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.End))

            // Category selector
            Text("Category", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                val cats = listOf("Electronics", "Fashion", "Vehicles", "Grocery", "Furniture", "Services", "Other")
                items(cats) { cat ->
                    FilterChip(selected = state.category == cat, onClick = { viewModel.setCategory(cat) }, label = { Text(cat) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary))
                }
            }

            CField("Description (optional)", state.description, viewModel::setDescription, "What is this channel about?", maxLines = 3, minLines = 2)
            Text("${state.description.length}/500", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.End))

            // Logo placeholder
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.AddPhotoAlternate, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(36.dp))
                    Spacer(Modifier.height(8.dp))
                    Text("Add Channel Logo (optional)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Spacer(Modifier.height(8.dp))
            Button(onClick = { viewModel.submit() }, enabled = !state.loading && state.name.isNotBlank(), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(50.dp)) {
                if (state.loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                else Text("Create Channel", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ─── ChannelDetailScreen ─────────────────────────────────────────────────────
data class ChannelDetailUiState(val loading: Boolean = true, val channel: Channel? = null, val error: String? = null, val toggling: Boolean = false, val posts: List<Post> = emptyList())

@HiltViewModel
class ChannelDetailViewModel @Inject constructor(private val repo: ChannelsRepository) : ViewModel() {
    private val _state = MutableStateFlow(ChannelDetailUiState())
    val state: StateFlow<ChannelDetailUiState> = _state.asStateFlow()
    fun load(id: String) { viewModelScope.launch {
        when (val r = repo.detail(id)) {
            is ApiResult.Success -> {
                _state.value = ChannelDetailUiState(loading = false, channel = r.data)
                // Load channel posts
                when (val p = repo.posts(id)) {
                    is ApiResult.Success -> _state.value = _state.value.copy(posts = p.data)
                    is ApiResult.Failure -> {}
                }
            }
            is ApiResult.Failure -> _state.value = ChannelDetailUiState(loading = false, error = r.error.message)
        }
    } }
    fun toggleFollow(id: String) { viewModelScope.launch {
        val ch = _state.value.channel ?: return@launch
        _state.value = _state.value.copy(toggling = true)
        if (ch.isMember) repo.unfollow(id) else repo.follow(id)
        load(id)
        _state.value = _state.value.copy(toggling = false)
    } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChannelDetailScreen(channelId: String, onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: ChannelDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    LaunchedEffect(channelId) { viewModel.load(channelId) }

    Scaffold(topBar = { TopBar(state.channel?.displayName ?: "Channel", onBack) }) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            state.channel != null -> {
                val ch = state.channel!!
                LazyColumn(contentPadding = PaddingValues(bottom = 80.dp), modifier = Modifier.fillMaxSize().padding(padding)) {
                    // Hero cover banner
                    item {
                        Box(Modifier.fillMaxWidth().height(160.dp).background(Brush.horizontalGradient(listOf(Color(0xFF2563EB), Color(0xFF7C3AED)))), contentAlignment = Alignment.BottomStart) {
                            Column(Modifier.padding(16.dp)) {
                                Text(ch.displayName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 24.sp)
                                ch.description?.let { Text(it, color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis) }
                            }
                            if (ch.isVerified) {
                                Icon(Icons.Filled.Verified, null, tint = Color.White, modifier = Modifier.align(Alignment.TopEnd).padding(12.dp).size(24.dp))
                            }
                        }
                    }
                    // Profile card with stats
                    item {
                        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp), modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                            Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(Modifier.size(72.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                                    Text(ch.displayName.take(1).uppercase(), color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold, fontSize = 28.sp)
                                }
                                Spacer(Modifier.height(12.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${ch.memberCount}", fontWeight = FontWeight.Bold, fontSize = 18.sp); Text("Members", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${ch.postCount}", fontWeight = FontWeight.Bold, fontSize = 18.sp); Text("Posts", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${ch.followerCount}", fontWeight = FontWeight.Bold, fontSize = 18.sp); Text("Followers", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                }
                                Spacer(Modifier.height(14.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(onClick = { viewModel.toggleFollow(channelId) }, enabled = !state.toggling, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f).height(44.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = if (ch.isMember) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.primary)) {
                                        Icon(if (ch.isMember) Icons.Filled.Check else Icons.Filled.PersonAdd, null, modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text(if (ch.isMember) "Following" else "Follow")
                                    }
                                    OutlinedButton(onClick = {}, shape = RoundedCornerShape(12.dp), modifier = Modifier.height(44.dp)) {
                                        Icon(Icons.Filled.Share, null, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                        }
                    }
                    // Tabs
                    item {
                        TabRow(selectedTabIndex = selectedTab, modifier = Modifier.padding(horizontal = 16.dp), containerColor = Color.Transparent) {
                            listOf("About", "Listings", "Reviews").forEachIndexed { idx, title ->
                                Tab(selected = selectedTab == idx, onClick = { selectedTab = idx }, text = { Text(title) })
                            }
                        }
                    }
                    // Tab content
                    when (selectedTab) {
                        0 -> {
                            // Analytics summary
                            item {
                                Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    listOf("Active" to Color(0xFF22C55E), "Growing" to Color(0xFF2563EB), "Top 10%" to Color(0xFFF59E0B)).forEach { (value, color) ->
                                        Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(1.dp)) {
                                            Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text(value, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = color)
                                                Text("Status", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }
                            item {
                                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                                    Column(Modifier.padding(16.dp)) {
                                        Text("About", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                        Spacer(Modifier.height(8.dp))
                                        Text(ch.description ?: "No description provided", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Spacer(Modifier.height(12.dp))
                                        ch.createdAt?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.CalendarToday, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.width(6.dp)); Text("Created ${it.take(10)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                                    }
                                }
                            }
                        }
                        1 -> {
                            if (state.posts.isEmpty()) {
                                item { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No listings yet", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                            }
                            items(state.posts, key = { it.stableId }) { post ->
                                Card(onClick = { onOpenPost(post.stableId) }, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(1.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                        post.primaryImage?.let { img ->
                                            AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.size(60.dp).clip(RoundedCornerShape(10.dp)))
                                        } ?: Box(Modifier.size(60.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                                            Icon(Icons.Filled.Image, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Spacer(Modifier.width(12.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            post.price?.let { Text("₹${"%,.0f".format(it)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary) }
                                            post.location?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.LocationOn, null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1) } }
                                        }
                                    }
                                }
                            }
                        }
                        2 -> {
                            item {
                                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                                    Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            repeat(5) { Icon(Icons.Filled.Star, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp)) }
                                            Spacer(Modifier.width(8.dp))
                                            Text("4.5/5", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                        }
                                        Spacer(Modifier.height(4.dp))
                                        Text("Based on ${ch.memberCount} reviews", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                            item { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No reviews yet", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                        }
                    }
                }
            }
            else -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.ErrorOutline, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.height(12.dp))
                    Text(state.error ?: "Channel not found")
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.load(channelId) }) { Text("Retry") }
                }
            }
        }
    }
}

// ─── Centres ─────────────────────────────────────────────────────────────────
data class CentresUiState(val loading: Boolean = true, val refreshing: Boolean = false, val centres: List<Centre> = emptyList(), val error: String? = null)

@HiltViewModel
class CentresListViewModel @Inject constructor(private val repo: CentresRepository) : ViewModel() {
    private val _state = MutableStateFlow(CentresUiState())
    val state: StateFlow<CentresUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = CentresUiState(loading = true)
        when (val r = repo.list()) {
            is ApiResult.Success -> _state.value = CentresUiState(loading = false, centres = r.data)
            is ApiResult.Failure -> _state.value = CentresUiState(loading = false, error = r.error.message)
        }
    } }
    fun refresh() { viewModelScope.launch {
        _state.value = _state.value.copy(refreshing = true)
        when (val r = repo.list()) {
            is ApiResult.Success -> _state.value = _state.value.copy(refreshing = false, centres = r.data)
            is ApiResult.Failure -> _state.value = _state.value.copy(refreshing = false)
        }
    } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CentreListScreen(onBack: () -> Unit, onOpenCentre: (String) -> Unit = {}, onCreateCentre: () -> Unit = {}, viewModel: CentresListViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Scaffold(topBar = { TopBar("Centres", onBack) { IconButton(onClick = onCreateCentre) { Icon(Icons.Filled.Add, null, tint = MaterialTheme.colorScheme.primary) } } }) { padding ->
        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize().padding(padding)) {
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.centres.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.Store, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("No centres yet", fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = onCreateCentre, shape = RoundedCornerShape(12.dp)) { Text("Create First Centre") }
                    }
                }
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.centres, key = { it.stableId }) { c ->
                        Card(onClick = { onOpenCentre(c.stableId) }, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp), modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFF10B981)), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Filled.Store, null, tint = Color.White, modifier = Modifier.size(24.dp))
                                }
                                Spacer(Modifier.width(14.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(c.displayName, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                    c.location?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF10B981), modifier = Modifier.size(12.dp)); Spacer(Modifier.width(3.dp)); Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("${c.listingCount} listings", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        c.followerCount?.let { Text("$it followers", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    }
                                }
                                Icon(Icons.Filled.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}

data class CreateCentreUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val name: String = "", val description: String = "", val location: String = "", val contactEmail: String = "", val contactPhone: String = "")

@HiltViewModel
class CreateCentreViewModel @Inject constructor(private val repo: CentresRepository) : ViewModel() {
    private val _state = MutableStateFlow(CreateCentreUiState())
    val state: StateFlow<CreateCentreUiState> = _state.asStateFlow()
    fun setName(v: String) { _state.value = _state.value.copy(name = v) }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v) }
    fun setLocation(v: String) { _state.value = _state.value.copy(location = v) }
    fun setContactEmail(v: String) { _state.value = _state.value.copy(contactEmail = v) }
    fun setContactPhone(v: String) { _state.value = _state.value.copy(contactPhone = v) }
    fun submit() {
        val s = _state.value
        if (s.name.isBlank()) { _state.value = s.copy(error = "Centre name is required"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.create(CreateCentreRequest(name = s.name, description = s.description.ifBlank { null }, location = s.location.ifBlank { null }))) {
                is ApiResult.Success -> _state.value = CreateCentreUiState(success = true)
                is ApiResult.Failure -> _state.value = s.copy(loading = false, error = r.error.message)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateCentreScreen(onBack: () -> Unit, viewModel: CreateCentreViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(state.success) { if (state.success) onBack() }
    Scaffold(topBar = { TopBar("Create Centre", onBack) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            state.error?.let {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFEE2E2)), shape = RoundedCornerShape(10.dp)) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.ErrorOutline, null, tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(it, color = Color(0xFFDC2626), fontSize = 13.sp)
                    }
                }
            }
            CField("Centre Name *", state.name, viewModel::setName, "e.g. Andheri Electronics Market")
            CField("Description (optional)", state.description, viewModel::setDescription, "What does this centre sell?", maxLines = 3, minLines = 2)
            CField("Location", state.location, viewModel::setLocation, "City, Area")
            CField("Contact Email (optional)", state.contactEmail, viewModel::setContactEmail, "centre@example.com")
            CField("Contact Phone (optional)", state.contactPhone, viewModel::setContactPhone, "+91 XXXXX XXXXX")

            // Logo placeholder
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.AddPhotoAlternate, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(36.dp))
                    Spacer(Modifier.height(8.dp))
                    Text("Add Centre Logo (optional)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Button(onClick = { viewModel.submit() }, enabled = !state.loading && state.name.isNotBlank(), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(50.dp)) {
                if (state.loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                else Text("Create Centre", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

data class CentreDetailUiState(val loading: Boolean = true, val centre: Centre? = null, val error: String? = null)

@HiltViewModel
class CentreDetailViewModel @Inject constructor(private val repo: CentresRepository) : ViewModel() {
    private val _state = MutableStateFlow(CentreDetailUiState())
    val state: StateFlow<CentreDetailUiState> = _state.asStateFlow()
    fun load(id: String) { viewModelScope.launch {
        when (val r = repo.detail(id)) {
            is ApiResult.Success -> _state.value = CentreDetailUiState(loading = false, centre = r.data)
            is ApiResult.Failure -> _state.value = CentreDetailUiState(loading = false, error = r.error.message)
        }
    } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CentreDetailScreen(centreId: String, onBack: () -> Unit, viewModel: CentreDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    LaunchedEffect(centreId) { viewModel.load(centreId) }
    Scaffold(topBar = { TopBar(state.centre?.displayName ?: "Centre", onBack) }) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            state.centre != null -> {
                val c = state.centre!!
                LazyColumn(modifier = Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(bottom = 80.dp)) {
                    // Hero banner
                    item {
                        Box(Modifier.fillMaxWidth().height(140.dp).background(Brush.horizontalGradient(listOf(Color(0xFF10B981), Color(0xFF059669)))), contentAlignment = Alignment.BottomStart) {
                            Column(Modifier.padding(16.dp)) {
                                Text(c.displayName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                                c.location?.let { Text("📍 $it", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp) }
                            }
                        }
                    }
                    // Stats card
                    item {
                        Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().padding(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp)) {
                            Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(Modifier.size(64.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFF10B981)), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Filled.Store, null, tint = Color.White, modifier = Modifier.size(32.dp))
                                }
                                Spacer(Modifier.height(12.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${c.listingCount}", fontWeight = FontWeight.Bold, fontSize = 18.sp); Text("Listings", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${c.followerCount ?: 0}", fontWeight = FontWeight.Bold, fontSize = 18.sp); Text("Followers", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Row { repeat(5) { Icon(Icons.Filled.Star, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(12.dp)) } }
                                        Text("Rating", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                Spacer(Modifier.height(14.dp))
                                Button(onClick = {}, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(44.dp)) {
                                    Icon(Icons.Filled.PersonAdd, null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Follow Centre")
                                }
                            }
                        }
                    }
                    // Tabs
                    item {
                        TabRow(selectedTabIndex = selectedTab, modifier = Modifier.padding(horizontal = 16.dp), containerColor = Color.Transparent) {
                            listOf("About", "Listings", "Reviews").forEachIndexed { idx, title ->
                                Tab(selected = selectedTab == idx, onClick = { selectedTab = idx }, text = { Text(title) })
                            }
                        }
                    }
                    when (selectedTab) {
                        0 -> item {
                            Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                                Column(Modifier.padding(16.dp)) {
                                    Text("About", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                    Spacer(Modifier.height(8.dp))
                                    Text(c.description ?: "No description provided", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    c.location?.let { Spacer(Modifier.height(8.dp)); Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.LocationOn, null, modifier = Modifier.size(14.dp), tint = Color(0xFF10B981)); Spacer(Modifier.width(6.dp)); Text(it) } }
                                    c.createdAt?.let { Spacer(Modifier.height(4.dp)); Text("Member since ${it.take(10)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                }
                            }
                        }
                        1 -> item { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("View centre listings", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                        2 -> item { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No reviews yet", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                    }
                }
            }
            else -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error ?: "Centre not found")
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.load(centreId) }) { Text("Retry") }
                }
            }
        }
    }
}

data class CentreListingsUiState(val loading: Boolean = true, val posts: List<Post> = emptyList(), val error: String? = null)

@HiltViewModel
class CentreListingsViewModel @Inject constructor(private val repo: CentresRepository) : ViewModel() {
    private val _state = MutableStateFlow(CentreListingsUiState())
    val state: StateFlow<CentreListingsUiState> = _state.asStateFlow()
    fun load(id: String) { viewModelScope.launch {
        when (val r = repo.listings(id)) {
            is ApiResult.Success -> _state.value = CentreListingsUiState(loading = false, posts = r.data)
            is ApiResult.Failure -> _state.value = CentreListingsUiState(loading = false, error = r.error.message)
        }
    } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CentreListingsScreen(centreId: String, onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: CentreListingsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(centreId) { viewModel.load(centreId) }
    Scaffold(topBar = { TopBar("Centre Listings", onBack) }) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            state.posts.isEmpty() -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.Inventory2, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(12.dp))
                    Text("No listings in this centre", fontWeight = FontWeight.SemiBold)
                }
            }
            else -> LazyColumn(modifier = Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { Text("${state.posts.size} listings", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                items(state.posts, key = { it.stableId }) { post ->
                    Card(onClick = { onOpenPost(post.stableId) }, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(1.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            post.primaryImage?.let { img ->
                                AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.size(64.dp).clip(RoundedCornerShape(10.dp)))
                            } ?: Box(Modifier.size(64.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                                Icon(Icons.Filled.Image, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                post.price?.let { Text("₹${"%,.0f".format(it)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary) }
                                post.location?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.LocationOn, null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1) } }
                            }
                            Icon(Icons.Filled.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CField(label: String, value: String, onValueChange: (String) -> Unit, placeholder: String = "", maxLines: Int = 1, minLines: Int = 1) {
    Column {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(value = value, onValueChange = onValueChange, placeholder = { Text(placeholder, fontSize = 13.sp) }, singleLine = maxLines == 1, maxLines = maxLines, minLines = minLines, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth())
    }
}
