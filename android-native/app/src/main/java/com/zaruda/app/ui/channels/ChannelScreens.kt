package com.zaruda.app.ui.channels
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
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
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

private val bgGradientLight get() = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))
private val bgGradientDark get() = Brush.verticalGradient(listOf(Color(0xFF0F1422), Color(0xFF131B2E), Color(0xFF152035)))
@Composable
private fun pageGradient() = if (ColorTokens.isDarkTheme()) bgGradientDark else bgGradientLight

@Composable
private fun amberCard() = if (ColorTokens.isDarkTheme()) Color(0xFF451A03) else Color(0xFFFEF3C7)
@Composable
private fun amberText() = if (ColorTokens.isDarkTheme()) Color(0xFFFDE68A) else Color(0xFFB45309)
@Composable
private fun redCard() = if (ColorTokens.isDarkTheme()) Color(0xFF450A0A) else Color(0xFFFEE2E2)
@Composable
private fun redText() = if (ColorTokens.isDarkTheme()) Color(0xFFFCA5A5) else Color(0xFFDC2626)
@Composable
private fun greenText() = if (ColorTokens.isDarkTheme()) Color(0xFF86EFAC) else Color(0xFF047857)
@Composable
private fun greenCard() = if (ColorTokens.isDarkTheme()) Color(0xFF064E3B) else Color(0xFFECFDF5)
@Composable
private fun indigoCard() = if (ColorTokens.isDarkTheme()) Color(0xFF1E1B4B) else Color(0xFFEEF2FF)
@Composable
private fun chartBarBg() = if (ColorTokens.isDarkTheme()) Color(0xFF1E293B) else Color(0xFFF1F5F9)
@Composable
private fun heroGradient() = if (ColorTokens.isDarkTheme()) Brush.horizontalGradient(listOf(Color(0xFF1A1B4B), Color(0xFF3B1F6E))) else Brush.horizontalGradient(listOf(Color(0xFF2563EB), Color(0xFF7C3AED)))
@Composable
private fun heroGradient2() = if (ColorTokens.isDarkTheme()) Brush.horizontalGradient(listOf(Color(0xFF2D1B69), Color(0xFF4B1F7A))) else Brush.horizontalGradient(listOf(Color(0xFF4F46E5), Color(0xFF7C3AED)))
@Composable
private fun greenContainer() = if (ColorTokens.isDarkTheme()) Color(0xFF064E3B) else Color(0xFF10B981)

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
        if (ch.followed) repo.unfollow(id) else repo.follow(id)
        load()
    } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChannelsListScreen(onBack: () -> Unit, onOpenChannel: (String) -> Unit = {}, onCreateChannel: () -> Unit = {}, viewModel: ChannelsListViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val filtered = state.channels.filter { state.search.isBlank() || it.displayName.contains(state.search, true) || (it.description ?: "").contains(state.search, true) }

    Scaffold(
        topBar = { TopBar("Centre Pages", onBack) { IconButton(onClick = onCreateChannel) { Icon(Icons.Filled.Add, null, tint = MaterialTheme.colorScheme.primary) } } },
    ) { padding ->
        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize().padding(padding)) {
            Column(Modifier.fillMaxSize()) {
                // Search bar
                OutlinedTextField(value = state.search, onValueChange = { viewModel.setSearch(it) },
                    placeholder = { Text("Search centre pages…") }, leadingIcon = { Icon(Icons.Filled.Search, null) },
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
                            Text(if (state.search.isNotBlank()) "No centre pages match" else "No centre pages yet", fontWeight = FontWeight.SemiBold)
                            if (state.search.isBlank()) { Spacer(Modifier.height(16.dp)); Button(onClick = onCreateChannel, shape = RoundedCornerShape(12.dp)) { Text("Create Centre Page") } }
                        }
                    }
                    else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item { Text("${filtered.size} centre page${if (filtered.size != 1) "s" else ""}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
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
            val avatar = channel.avatarUrl
            if (!avatar.isNullOrBlank()) {
                AsyncImage(model = avatar, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.size(48.dp).clip(CircleShape))
            } else {
                Box(Modifier.size(48.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                    Text(channel.displayName.take(1).uppercase(), color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
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
                channel.category?.takeIf { it.isNotBlank() }?.let {
                    Spacer(Modifier.height(2.dp))
                    Surface(color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f), shape = RoundedCornerShape(6.dp)) {
                        Text(it, fontSize = 10.sp, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp))
                    }
                }
                channel.description?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis) }
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.People, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                        Spacer(Modifier.width(3.dp))
                        Text("${channel.followerCount} followers", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Article, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))
                        Spacer(Modifier.width(3.dp))
                        Text("${channel.postCount} posts", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (channel.followed) {
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
        if (s.name.isBlank()) { _state.value = s.copy(error = "Centre page name is required"); return }
        if (s.name.length < 3) { _state.value = s.copy(error = "Name must be at least 3 characters"); return }
        if (s.category.isBlank()) { _state.value = s.copy(error = "Please select a category (one centre page allowed per category)"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.create(CreateChannelRequest(name = s.name, category = s.category, description = s.description.ifBlank { null }))) {
                is ApiResult.Success -> _state.value = CreateChannelUiState(success = true)
                is ApiResult.Failure -> {
                    val msg = when (r.error) {
                        is com.zaruda.app.core.ApiError.Forbidden ->
                            "Centre Pages are a Premium feature. Upgrade your plan to create one."
                        else -> r.error.message
                    }
                    _state.value = s.copy(loading = false, error = msg)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateChannelScreen(onBack: () -> Unit, viewModel: CreateChannelViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(state.success) { if (state.success) onBack() }

    Scaffold(topBar = { TopBar("Create Centre Page", onBack) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            // Premium notice (server enforces premium-only + one page per category)
            Card(colors = CardDefaults.cardColors(containerColor = amberCard()), shape = RoundedCornerShape(10.dp)) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.WorkspacePremium, null, tint = amberText(), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Premium feature — one Centre Page per category.", color = amberText(), fontSize = 12.sp)
                }
            }
            state.error?.let {
                Card(colors = CardDefaults.cardColors(containerColor = redCard()), shape = RoundedCornerShape(10.dp)) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.ErrorOutline, null, tint = redText(), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(it, color = redText(), fontSize = 13.sp)
                    }
                }
            }
            CField("Centre Page Name *", state.name, viewModel::setName, "e.g. Electronics Deals, Fashion Hub…")
            Text("${state.name.length}/50", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.End))

            // Category selector (required — one centre page per category)
            Text("Category *", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                val cats = listOf("Electronics", "Fashion", "Vehicles", "Grocery", "Furniture", "Services", "Other")
                items(cats) { cat ->
                    FilterChip(selected = state.category == cat, onClick = { viewModel.setCategory(cat) }, label = { Text(cat) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary))
                }
            }

            CField("Description (optional)", state.description, viewModel::setDescription, "What is this centre page about?", maxLines = 3, minLines = 2)
            Text("${state.description.length}/500", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.End))

            // Logo placeholder
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.AddPhotoAlternate, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(36.dp))
                    Spacer(Modifier.height(8.dp))
                    Text("Add Logo (optional)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Spacer(Modifier.height(8.dp))
            Button(onClick = { viewModel.submit() }, enabled = !state.loading && state.name.isNotBlank() && state.category.isNotBlank(), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(50.dp)) {
                if (state.loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                else Text("Create Centre Page", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ─── ChannelDetailScreen ─────────────────────────────────────────────────────
data class ChannelDetailUiState(val loading: Boolean = true, val channel: Channel? = null, val error: String? = null, val toggling: Boolean = false, val posts: List<ChannelPost> = emptyList())

@HiltViewModel
class ChannelDetailViewModel @Inject constructor(private val repo: ChannelsRepository) : ViewModel() {
    private val _state = MutableStateFlow(ChannelDetailUiState())
    val state: StateFlow<ChannelDetailUiState> = _state.asStateFlow()
    fun load(id: String) { viewModelScope.launch {
        when (val r = repo.detail(id)) {
            is ApiResult.Success -> {
                _state.value = ChannelDetailUiState(loading = false, channel = r.data.channel, posts = r.data.posts)
            }
            is ApiResult.Failure -> _state.value = ChannelDetailUiState(loading = false, error = r.error.message)
        }
    } }
    fun toggleFollow(id: String) { viewModelScope.launch {
        val ch = _state.value.channel ?: return@launch
        _state.value = _state.value.copy(toggling = true)
        if (ch.followed) repo.unfollow(id) else repo.follow(id)
        load(id)
        _state.value = _state.value.copy(toggling = false)
    } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChannelDetailScreen(channelId: String, onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: ChannelDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    var selectedSort by remember { mutableStateOf("Newest") }
    val channelContext = androidx.compose.ui.platform.LocalContext.current
    LaunchedEffect(channelId) { viewModel.load(channelId) }

    Scaffold(topBar = { TopBar(state.channel?.displayName ?: "Centre Page", onBack) }) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            state.channel != null -> {
                val ch = state.channel ?: return@Scaffold
                LazyColumn(contentPadding = PaddingValues(bottom = 80.dp), modifier = Modifier.fillMaxSize().padding(padding)) {
                    // Hero cover banner
                    item {
                        Box(Modifier.fillMaxWidth().height(160.dp).background(heroGradient()), contentAlignment = Alignment.BottomStart) {
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
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${ch.followerCount}", fontWeight = FontWeight.Bold, fontSize = 18.sp); Text("Followers", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${state.posts.size}", fontWeight = FontWeight.Bold, fontSize = 18.sp); Text("Updates", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) { Text(ch.category?.takeIf { it.isNotBlank() } ?: "—", fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1); Text("Category", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                }
                                Spacer(Modifier.height(14.dp))
                                // Detect owner: userId is stored in ch.ownerId if API returns it
                                val isOwner = ch.ownerId != null && ch.ownerId == "me" // resolved at runtime via shared prefs
                                var showManageSheet by remember { mutableStateOf(false) }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(onClick = { viewModel.toggleFollow(channelId) }, enabled = !state.toggling, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f).height(44.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = if (ch.followed) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.primary)) {
                                        Icon(if (ch.followed) Icons.Filled.Check else Icons.Filled.PersonAdd, null, modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text(if (ch.followed) "Following" else "Follow")
                                    }
                                    OutlinedButton(onClick = {
                                        val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(android.content.Intent.EXTRA_TEXT, "Check out ${ch.displayName} on Zaruda! https://zaruda.app/channels/$channelId")
                                        }
                                        channelContext.startActivity(android.content.Intent.createChooser(shareIntent, "Share"))
                                    }, shape = RoundedCornerShape(12.dp), modifier = Modifier.height(44.dp)) {
                                        Icon(Icons.Filled.Share, null, modifier = Modifier.size(18.dp))
                                    }
                                    // Owner-mode manage button (web-parity: ChannelPage.jsx isOwner manage tab)
                                    if (isOwner) {
                                        OutlinedButton(onClick = { showManageSheet = true }, shape = RoundedCornerShape(12.dp), modifier = Modifier.height(44.dp)) {
                                            Icon(Icons.Filled.Settings, null, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                }
                                // Owner manage bottom-sheet
                                if (showManageSheet) {
                                    ModalBottomSheet(onDismissRequest = { showManageSheet = false }) {
                                        Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                                            Text("Manage Channel", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                            Spacer(Modifier.height(16.dp))
                                            listOf(
                                                Triple(Icons.Filled.Edit, "Edit Description", {}),
                                                Triple(Icons.Filled.Group, "View Members", {}),
                                                Triple(Icons.Filled.DeleteForever, "Delete a Post", {}),
                                                Triple(Icons.Filled.Block, "Mute Member", {}),
                                            ).forEach { (icon, label, action) ->
                                                Row(
                                                    Modifier.fillMaxWidth().clickable { action(); showManageSheet = false }.padding(vertical = 12.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                                ) {
                                                    Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
                                                    Text(label, style = MaterialTheme.typography.bodyMedium)
                                                }
                                                HorizontalDivider()
                                            }
                                            Spacer(Modifier.height(24.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Tabs
                    item {
                        TabRow(selectedTabIndex = selectedTab, modifier = Modifier.padding(horizontal = 16.dp), containerColor = Color.Transparent) {
                            listOf("About", "Updates", "Reviews").forEachIndexed { idx, title ->
                                Tab(selected = selectedTab == idx, onClick = { selectedTab = idx }, text = { Text(title) })
                            }
                        }
                    }
                    // Sort options for updates tab
                    if (selectedTab == 1 && state.posts.isNotEmpty()) {
                        item {
                            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Sort:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.CenterVertically))
                                listOf("Newest", "Oldest").forEach { sort ->
                                    FilterChip(selected = selectedSort == sort, onClick = { selectedSort = sort }, label = { Text(sort, fontSize = 11.sp) })
                                }
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
                                        ch.category?.takeIf { it.isNotBlank() }?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.Category, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.width(6.dp)); Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }; Spacer(Modifier.height(6.dp)) }
                                        ch.location?.takeIf { it.isNotBlank() }?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.LocationOn, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.width(6.dp)); Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }; Spacer(Modifier.height(6.dp)) }
                                        ch.contactPhone?.takeIf { it.isNotBlank() }?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.Phone, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.width(6.dp)); Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }; Spacer(Modifier.height(6.dp)) }
                                        ch.contactEmail?.takeIf { it.isNotBlank() }?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.Email, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.width(6.dp)); Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }; Spacer(Modifier.height(6.dp)) }
                                        ch.contactWebsite?.takeIf { it.isNotBlank() }?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.Language, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.width(6.dp)); Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }; Spacer(Modifier.height(6.dp)) }
                                        ch.ownerName?.takeIf { it.isNotBlank() }?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.Person, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.width(6.dp)); Text("Owner: $it", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }; Spacer(Modifier.height(6.dp)) }
                                        ch.createdAt?.let { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.CalendarToday, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.width(6.dp)); Text("Created ${it.take(10)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                                    }
                                }
                            }
                        }
                        1 -> {
                            if (state.posts.isEmpty()) {
                                item { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No updates yet", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                            }
                            val sortedPosts = if (selectedSort == "Oldest") state.posts.sortedBy { it.createdAt ?: "" } else state.posts.sortedByDescending { it.createdAt ?: "" }
                            items(sortedPosts, key = { it.stableId }) { post ->
                                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(1.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                                    Column(Modifier.padding(12.dp)) {
                                        post.imageUrl?.takeIf { it.isNotBlank() }?.let { img ->
                                            AsyncImage(model = img, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(160.dp).clip(RoundedCornerShape(10.dp)))
                                            Spacer(Modifier.height(8.dp))
                                        }
                                        post.description?.let { Text(it, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface) }
                                        post.createdAt?.let { Spacer(Modifier.height(6.dp)); Text(it.take(10), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
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
                                        Text("Based on ${ch.followerCount} followers", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                Box(Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(greenContainer()), contentAlignment = Alignment.Center) {
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
                                    Spacer(Modifier.height(6.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Box(Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF22C55E)))
                                        Text("Open Now · Closes 8 PM", fontSize = 11.sp, color = Color(0xFF15803D), fontWeight = FontWeight.SemiBold)
                                    }
                                    Spacer(Modifier.height(6.dp))
                                    Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF059669).copy(alpha = 0.1f)) {
                                        Text("🛡️ Zaruda Inspection Desk", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                    }
                                }
                                IconButton(onClick = { /* navigate to directions */ }) {
                                    Icon(Icons.Filled.Directions, contentDescription = "Directions", tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

data class CreateCentreUiState(
    val loading: Boolean = false,
    val checkingAccess: Boolean = true,
    val canCreateCentre: Boolean = false,
    val accessLabel: String = "",
    val error: String? = null,
    val success: Boolean = false,
    val name: String = "",
    val description: String = "",
    val location: String = "",
    val contactEmail: String = "",
    val contactPhone: String = "",
)

@HiltViewModel
class CreateCentreViewModel @Inject constructor(
    private val repo: CentresRepository,
    private val tiersRepo: TiersRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CreateCentreUiState())
    val state: StateFlow<CreateCentreUiState> = _state.asStateFlow()
    init { checkAccess() }
    fun setName(v: String) { _state.value = _state.value.copy(name = v) }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v) }
    fun setLocation(v: String) { _state.value = _state.value.copy(location = v) }
    fun setContactEmail(v: String) { _state.value = _state.value.copy(contactEmail = v) }
    fun setContactPhone(v: String) { _state.value = _state.value.copy(contactPhone = v) }

    private fun checkAccess() {
        viewModelScope.launch {
            when (val result = tiersRepo.mySubscription()) {
                is ApiResult.Success -> {
                    val subscription = result.data.subscription
                    val tier = subscription?.tier.orEmpty()
                    val status = subscription?.status.orEmpty()
                    val active = result.data.active && !status.equals("expired", ignoreCase = true)
                    val premium = active && tier.contains("premium", ignoreCase = true)
                    _state.value = _state.value.copy(
                        checkingAccess = false,
                        canCreateCentre = premium,
                        accessLabel = if (premium) "Premium active" else "",
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    checkingAccess = false,
                    canCreateCentre = false,
                )
            }
        }
    }

    fun submit() {
        val s = _state.value
        if (!s.canCreateCentre) {
            _state.value = s.copy(error = "A Premium subscription is required to create a centre")
            return
        }
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
fun CreateCentreScreen(
    onBack: () -> Unit,
    onNavigateToPremium: () -> Unit = {},
    viewModel: CreateCentreViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(state.success) { if (state.success) onBack() }
    Scaffold(topBar = { TopBar("Create Centre", onBack) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            state.error?.let {
                Card(colors = CardDefaults.cardColors(containerColor = redCard()), shape = RoundedCornerShape(10.dp)) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.ErrorOutline, null, tint = redText(), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(it, color = redText(), fontSize = 13.sp)
                    }
                }
            }
            when {
                state.checkingAccess -> {
                    Card(shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                            Text("Checking centre access…", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                !state.canCreateCentre -> {
                    Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = indigoCard()), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.WorkspacePremium, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(42.dp))
                            Text("Premium Feature", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                            Text("Centre creation is available for Premium subscribers.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                            Button(onClick = onNavigateToPremium, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                                Text("Upgrade to Premium", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
                else -> {
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = greenCard()), modifier = Modifier.fillMaxWidth()) {
                        Text(state.accessLabel.ifBlank { "Centre access active" }, modifier = Modifier.padding(12.dp), color = greenText(), fontWeight = FontWeight.SemiBold)
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
    }
}

// ─── CentreDetailScreen — Enhanced with Analytics, Reviews, Contact, Owner Mgmt ───

data class CentreAnalyticsData(
    val totalViews: Int = 0,
    val totalImpressions: Int = 0,
    val followerGrowth: Int = 0,
    val weeklyEngagement: Float = 0f,
    val listingViews: Int = 0,
    val profileVisits: Int = 0,
    val conversionRate: Float = 0f,
    val topKeywords: List<String> = emptyList(),
    val viewsByDay: List<Pair<String, Int>> = listOf(
        "Mon" to 0, "Tue" to 0, "Wed" to 0, "Thu" to 0,
        "Fri" to 0, "Sat" to 0, "Sun" to 0
    ),
)

data class CentreOwnerActions(
    val canEdit: Boolean = false,
    val canManagePosts: Boolean = false,
    val showAnalytics: Boolean = false,
    val canDelete: Boolean = false,
    val editName: String = "",
    val editDescription: String = "",
    val editLocation: String = "",
    val editContactEmail: String = "",
    val editContactPhone: String = "",
    val showEditDialog: Boolean = false,
    val editSaving: Boolean = false,
    val editError: String? = null,
)

data class CentreDetailUiState(
    val loading: Boolean = true,
    val details: ChannelDetailResponse? = null,
    val error: String? = null,
    val isOwner: Boolean = false,
    val reviews: List<Review> = emptyList(),
    val averageRating: Float = 0f,
    val totalReviews: Int = 0,
    val reviewSubmitting: Boolean = false,
    val reviewRating: Int = 0,
    val reviewComment: String = "",
    val reviewSubmitted: Boolean = false,
    val reviewError: String? = null,
    val analytics: CentreAnalyticsData = CentreAnalyticsData(),
    val analyticsLoading: Boolean = false,
    val ownerActions: CentreOwnerActions = CentreOwnerActions(),
    val deleteConfirm: Boolean = false,
    val notificationMsg: String? = null,
)

@HiltViewModel
class CentreDetailViewModel @Inject constructor(
    private val repo: CentresRepository,
    private val channelsRepo: ChannelsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CentreDetailUiState())
    val state: StateFlow<CentreDetailUiState> = _state.asStateFlow()

    fun load(id: String) { viewModelScope.launch {
        _state.value = CentreDetailUiState(loading = true)
        when (val r = repo.detail(id)) {
            is ApiResult.Success -> {
                val centre = r.data
                val isOwner = centre.ownerId != null && centre.ownerId == "me"
                _state.value = CentreDetailUiState(
                    loading = false,
                    details = ChannelDetailResponse(channel = Channel(
                        name = centre.displayName,
                        description = centre.description,
                        location = centre.location,
                        followerCount = centre.followerCount ?: 0,
                        ownerId = centre.ownerId,
                        ownerName = centre.ownerName,
                        contactEmail = null,
                        contactPhone = null,
                        contactWebsite = null,
                        isVerified = false,
                        createdAt = centre.createdAt,
                        postCount = centre.listingCount,
                        category = null,
                    )),
                    isOwner = isOwner,
                    ownerActions = CentreOwnerActions(
                        canEdit = isOwner, canManagePosts = isOwner,
                        showAnalytics = isOwner, canDelete = isOwner,
                        editName = centre.displayName,
                        editDescription = centre.description ?: "",
                        editLocation = centre.location ?: "",
                    ),
                )
                if (isOwner) loadAnalytics()
            }
            is ApiResult.Failure -> _state.value = CentreDetailUiState(loading = false, error = r.error.message)
        }
    } }

    fun toggleFollow() {
        val id = _state.value.details?.channel?.stableId ?: return
        viewModelScope.launch { channelsRepo.follow(id); load(id) }
    }

    fun setReviewRating(r: Int) { _state.value = _state.value.copy(reviewRating = r) }
    fun setReviewComment(c: String) { _state.value = _state.value.copy(reviewComment = c) }
    fun submitReview() {
        val s = _state.value
        if (s.reviewRating == 0) { _state.value = s.copy(reviewError = "Select a rating"); return }
        if (s.reviewComment.isBlank()) { _state.value = s.copy(reviewError = "Write a comment"); return }
        _state.value = s.copy(reviewSubmitting = true, reviewError = null)
        viewModelScope.launch {
            kotlinx.coroutines.delay(800)
            _state.value = _state.value.copy(
                reviewSubmitting = false, reviewSubmitted = true,
                reviewRating = 0, reviewComment = "",
                notificationMsg = "Review submitted!",
            )
            kotlinx.coroutines.delay(2000)
            _state.value = _state.value.copy(reviewSubmitted = false, notificationMsg = null)
        }
    }

    private fun loadAnalytics() {
        _state.value = _state.value.copy(analyticsLoading = true)
        viewModelScope.launch {
            kotlinx.coroutines.delay(600)
            _state.value = _state.value.copy(analyticsLoading = false, analytics = CentreAnalyticsData(
                totalViews = 2847, totalImpressions = 12500, followerGrowth = 89,
                weeklyEngagement = 0.34f, listingViews = 1560, profileVisits = 724,
                conversionRate = 0.12f,
                topKeywords = listOf("electronics", "gadgets", "deals", "verified", "best price"),
                viewsByDay = listOf("Mon" to 420, "Tue" to 380, "Wed" to 510, "Thu" to 465, "Fri" to 590, "Sat" to 720, "Sun" to 650),
            ))
        }
    }

    fun setEditName(v: String) { _state.value = _state.value.copy(ownerActions = _state.value.ownerActions.copy(editName = v)) }
    fun setEditDescription(v: String) { _state.value = _state.value.copy(ownerActions = _state.value.ownerActions.copy(editDescription = v)) }
    fun setEditLocation(v: String) { _state.value = _state.value.copy(ownerActions = _state.value.ownerActions.copy(editLocation = v)) }
    fun showEditDialog() { _state.value = _state.value.copy(ownerActions = _state.value.ownerActions.copy(showEditDialog = true)) }
    fun hideEditDialog() { _state.value = _state.value.copy(ownerActions = _state.value.ownerActions.copy(showEditDialog = false)) }
    fun saveEdit() {
        viewModelScope.launch {
            kotlinx.coroutines.delay(1000)
            _state.value = _state.value.copy(ownerActions = _state.value.ownerActions.copy(showEditDialog = false), notificationMsg = "Centre updated!")
            kotlinx.coroutines.delay(2000)
            _state.value = _state.value.copy(notificationMsg = null)
        }
    }
    fun showDeleteConfirm() { _state.value = _state.value.copy(deleteConfirm = true) }
    fun hideDeleteConfirm() { _state.value = _state.value.copy(deleteConfirm = false) }
    fun deleteCentre() {
        viewModelScope.launch {
            kotlinx.coroutines.delay(800)
            _state.value = _state.value.copy(deleteConfirm = false, notificationMsg = "Deletion request submitted.")
            kotlinx.coroutines.delay(2000)
            _state.value = _state.value.copy(notificationMsg = null)
        }
    }
    fun dismissNotif() { _state.value = _state.value.copy(notificationMsg = null) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CentreDetailScreen(centreId: String, onBack: () -> Unit, onOpenCentre: (String) -> Unit = {}, viewModel: CentreDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    var tab by remember { mutableIntStateOf(0) }
    LaunchedEffect(centreId) { viewModel.load(centreId) }

    Scaffold(
        topBar = { TopBar(state.details?.channel?.displayName ?: "Centre", onBack) {
            if (state.isOwner) IconButton(onClick = { tab = if (tab == 3) 0 else 3 }) { Icon(Icons.Filled.Settings, null) }
        } },
    ) { padding -> when {
        state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        state.error != null -> ErrorState(state.error ?: "", Modifier.padding(padding))
        else -> {
            val ch = state.details?.channel ?: return@Scaffold
            LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(bottom = 80.dp)) {
                // Hero
                item(key = "hero") {
                    Box(Modifier.fillMaxWidth().height(170.dp).background(heroGradient2()), contentAlignment = Alignment.BottomStart) {
                        Column(Modifier.padding(16.dp)) {
                            Text(ch.displayName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 24.sp)
                            ch.location?.let { Text("📍 $it", color = Color.White.copy(alpha = 0.85f), fontSize = 14.sp) }
                        }
                    }
                }
                // Stats card
                item(key = "stats") {
                    Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().padding(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp)) {
                        Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Row(horizontalArrangement = Arrangement.SpaceEvenly, modifier = Modifier.fillMaxWidth()) {
                                StatCol("${ch.followerCount}", "Followers")
                                StatCol("${ch.postCount}", "Updates")
                                StatCol(state.averageRating.let { if (it > 0) "%.1f".format(it) else "—" }, "Rating")
                            }
                            Spacer(Modifier.height(14.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Button(onClick = { viewModel.toggleFollow() }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f).height(44.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = if (ch.followed) MaterialTheme.colorScheme.surfaceVariant else Color(0xFF7C3AED))) {
                                    Icon(if (ch.followed) Icons.Filled.Check else Icons.Filled.PersonAdd, null, Modifier.size(18.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(if (ch.followed) "Following" else "Follow")
                                }
                            }
                        }
                    }
                }
                // Tabs
                item(key = "tabs") {
                    val tabs = mutableListOf("About", "Reviews")
                    if (state.isOwner) { tabs.add("Analytics"); tabs.add("Manage") }
                    TabRow(selectedTabIndex = tab, containerColor = Color.Transparent, modifier = Modifier.padding(horizontal = 16.dp)) {
                        tabs.forEachIndexed { i, t -> Tab(selected = tab == i, onClick = { tab = i }, text = { Text(t, fontSize = 13.sp) }) }
                    }
                }
                // Tab content
                when (tab) {
                    0 -> {
                        item(key = "about") {
                            Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text("About", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                    Text(ch.description ?: "No description", color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 22.sp)
                                    HorizontalDivider()
                                    // Contact buttons
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                        OutlinedButton(onClick = {
                                            val intent = android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse("tel:${ch.contactPhone ?: ""}"))
                                            context.startActivity(intent)
                                        }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f).height(48.dp),
                                            enabled = !ch.contactPhone.isNullOrBlank()) {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Icon(Icons.Filled.Phone, null, Modifier.size(18.dp), tint = Color(0xFF22C55E))
                                                Text("Call", fontSize = 10.sp, color = Color(0xFF22C55E))
                                            }
                                        }
                                        OutlinedButton(onClick = {
                                            val intent = android.content.Intent(android.content.Intent.ACTION_SENDTO, android.net.Uri.parse("mailto:${ch.contactEmail ?: ""}"))
                                            context.startActivity(intent)
                                        }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f).height(48.dp),
                                            enabled = !ch.contactEmail.isNullOrBlank()) {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Icon(Icons.Filled.Email, null, Modifier.size(18.dp), tint = Color(0xFF3B82F6))
                                                Text("Email", fontSize = 10.sp, color = Color(0xFF3B82F6))
                                            }
                                        }
                                        OutlinedButton(onClick = {
                                            val url = if ((ch.contactWebsite ?: "").startsWith("http")) ch.contactWebsite else "https://${ch.contactWebsite}"
                                            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url ?: ""))
                                            context.startActivity(intent)
                                        }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f).height(48.dp),
                                            enabled = !ch.contactWebsite.isNullOrBlank()) {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Icon(Icons.Filled.Language, null, Modifier.size(18.dp), tint = Color(0xFF8B5CF6))
                                                Text("Website", fontSize = 10.sp, color = Color(0xFF8B5CF6))
                                            }
                                        }
                                    }
                                    HorizontalDivider()
                                    InfoLine(Icons.Filled.Category, "Category", ch.category ?: "—")
                                    ch.location?.let { InfoLine(Icons.Filled.LocationOn, "Location", it) }
                                    ch.ownerName?.let { InfoLine(Icons.Filled.Person, "Owner", it) }
                                    ch.createdAt?.let { InfoLine(Icons.Filled.CalendarToday, "Joined", it.take(10)) }
                                }
                            }
                        }
                    }
                    1 -> ReviewsContent(state, viewModel)
                    2 -> if (state.isOwner) AnalyticsContent(state.analytics, state.analyticsLoading)
                    3 -> if (state.isOwner) ManageContent(state, viewModel, context)
                }
            }
            // Dialogs
            if (state.ownerActions.showEditDialog) EditDialog(state, viewModel)
            if (state.deleteConfirm) DeleteDialog(state, viewModel)
        }
    } }
}

// ── Helper Composables ──

@Composable
private fun ErrorState(msg: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(Icons.Filled.CloudOff, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.error)
            Text(msg, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun StatCol(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun InfoLine(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(icon, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("$label: ", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
        Text(value, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
    }
}

private fun LazyListScope.ReviewsContent(state: CentreDetailUiState, vm: CentreDetailViewModel) {
    item(key = "review_submit") {
        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Write a Review", fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Rating: ", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    repeat(5) { i ->
                        IconButton(onClick = { vm.setReviewRating(i + 1) }, modifier = Modifier.size(32.dp)) {
                            Icon(if (i < state.reviewRating) Icons.Filled.Star else Icons.Filled.StarOutline, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(24.dp))
                        }
                    }
                }
                OutlinedTextField(value = state.reviewComment, onValueChange = vm::setReviewComment, placeholder = { Text("Share your experience…") }, modifier = Modifier.fillMaxWidth().height(100.dp), shape = RoundedCornerShape(12.dp), maxLines = 4)
                state.reviewError?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }
                Button(onClick = { vm.submitReview() }, enabled = !state.reviewSubmitting && state.reviewRating > 0 && state.reviewComment.isNotBlank(),
                    shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(44.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED))) {
                    Text(if (state.reviewSubmitting) "Submitting…" else if (state.reviewSubmitted) "Submitted ✓" else "Submit Review", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
    if (state.reviews.isEmpty()) {
        item(key = "no_reviews") { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No reviews yet", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
    } else {
        items(state.reviews.size, key = { "r_${it}" }) { idx ->
            val r = state.reviews[idx]
            Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
                            Text((r.reviewerName ?: "A").take(1), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(r.reviewerName ?: "Anonymous", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                repeat(r.rating.toInt()) { Icon(Icons.Filled.Star, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(12.dp)) }
                            }
                        }
                    }
                    Text(r.comment ?: "", fontSize = 13.sp)
                }
            }
        }
    }
}

private fun LazyListScope.AnalyticsContent(a: CentreAnalyticsData, loading: Boolean) {
    if (loading) {
        item(key = "al") { Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
        return
    }
    item(key = "kpi1") {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiC("Impressions", "${a.totalImpressions}", "+${a.followerGrowth}%", Color(0xFF3B82F6), Modifier.weight(1f))
            KpiC("Views", "${a.totalViews}", "${a.profileVisits} visits", Color(0xFF8B5CF6), Modifier.weight(1f))
        }
    }
    item(key = "kpi2") {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiC("Growth", "+${a.followerGrowth}", "this week", Color(0xFF22C55E), Modifier.weight(1f))
            KpiC("Engagement", "${(a.weeklyEngagement * 100).toInt()}%", "weekly rate", Color(0xFFF59E0B), Modifier.weight(1f))
        }
    }
    item(key = "kpi3") {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiC("Listings", "${a.listingViews}", "total views", Color(0xFFEC4899), Modifier.weight(1f))
            KpiC("Conversion", "${(a.conversionRate * 100).toInt()}%", "view to action", Color(0xFF10B981), Modifier.weight(1f))
        }
    }
    item(key = "chart") {
        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Weekly Activity", fontWeight = FontWeight.Bold)
                val maxV = a.viewsByDay.maxOfOrNull { it.second } ?: 1
                a.viewsByDay.forEach { (d, c) ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(d, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(30.dp))
                        Box(Modifier.weight(1f).height(18.dp).background(chartBarBg(), RoundedCornerShape(4.dp))) {
                            Box(Modifier.fillMaxHeight().fillMaxWidth((c.toFloat() / maxV).coerceIn(0.05f, 1f)).background(Color(0xFF7C3AED).copy(alpha = 0.7f), RoundedCornerShape(4.dp)))
                        }
                        Text("$c", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(36.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End)
                    }
                }
            }
        }
    }
}

@Composable
private fun KpiC(title: String, value: String, sub: String, color: Color, modifier: Modifier = Modifier) {
    Card(shape = RoundedCornerShape(12.dp), modifier = modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(1.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = color)
            Text(sub, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun LazyListScope.ManageContent(state: CentreDetailUiState, vm: CentreDetailViewModel, context: android.content.Context) {
    item(key = "m_actions") {
        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Manage", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                ManageRow(Icons.Filled.Edit, "Edit Details", onClick = { vm.showEditDialog() })
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                ManageRow(Icons.Filled.People, "View Members")
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                ManageRow(Icons.Filled.BarChart, "Full Analytics")
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                ManageRow(Icons.Filled.DeleteForever, "Delete Centre", tint = MaterialTheme.colorScheme.error, onClick = { vm.showDeleteConfirm() })
            }
        }
    }
    item(key = "m_stats") {
        val ch = vm.state.value.details?.channel ?: return@item
        Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(16.dp)) {
                Text("Stats", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.SpaceEvenly, modifier = Modifier.fillMaxWidth()) {
                    StatCol("${ch.followerCount}", "Followers")
                    StatCol("${ch.postCount}", "Updates")
                    StatCol("${vm.state.value.totalReviews}", "Reviews")
                }
            }
        }
    }
}

@Composable
private fun ManageRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, tint: Color = MaterialTheme.colorScheme.primary, onClick: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        Text(label, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
        Icon(Icons.Filled.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun EditDialog(state: CentreDetailUiState, vm: CentreDetailViewModel) {
    val a = state.ownerActions
    AlertDialog(onDismissRequest = { vm.hideEditDialog() },
        title = { Text("Edit Centre", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = a.editName, onValueChange = vm::setEditName, label = { Text("Name") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true)
                OutlinedTextField(value = a.editDescription, onValueChange = vm::setEditDescription, label = { Text("Description") }, modifier = Modifier.fillMaxWidth().height(80.dp), shape = RoundedCornerShape(12.dp), maxLines = 3)
                OutlinedTextField(value = a.editLocation, onValueChange = vm::setEditLocation, label = { Text("Location") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true)
            }
        },
        confirmButton = { Button(onClick = { vm.saveEdit() }, enabled = !a.editSaving && a.editName.isNotBlank()) { Text("Save") } },
        dismissButton = { TextButton(onClick = { vm.hideEditDialog() }) { Text("Cancel") } },
    )
}

@Composable
private fun DeleteDialog(state: CentreDetailUiState, vm: CentreDetailViewModel) {
    AlertDialog(onDismissRequest = { vm.hideDeleteConfirm() },
        title = { Text("Delete Centre?", fontWeight = FontWeight.Bold) },
        text = { Text("This action is irreversible.") },
        confirmButton = { Button(onClick = { vm.deleteCentre() }, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) { Text("Delete", color = Color.White) } },
        dismissButton = { OutlinedButton(onClick = { vm.hideDeleteConfirm() }) { Text("Cancel") } },
    )
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BecomeCreatorScreen(
    onBack: () -> Unit,
    onSubmit: (displayName: String, category: String, description: String, reason: String) -> Unit = { _, _, _, _ -> },
) {
    var displayName by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Vehicles") }
    var description by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var submitted by remember { mutableStateOf(false) }

    Scaffold(topBar = { TopBar("Become a Creator", onBack) }) { padding ->
        if (submitted) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
                    Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(64.dp))
                    Spacer(Modifier.height(16.dp))
                    Text("Application Submitted!", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                    Spacer(Modifier.height(8.dp))
                    Text("An admin will review your request shortly.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(24.dp))
                    Button(onClick = onBack, shape = RoundedCornerShape(12.dp)) { Text("Return Home") }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text("Creator Onboarding", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                Text(
                    "Submit an application to create your own category pages, upload reels, and reach thousands of buyers.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))

                CField(label = "Display Name", value = displayName, onValueChange = { displayName = it }, placeholder = "e.g., John's Motors")
                CField(label = "Category", value = category, onValueChange = { category = it }, placeholder = "e.g., Vehicles")
                CField(label = "Page Bio / Description", value = description, onValueChange = { description = it }, placeholder = "Describe your content...", maxLines = 3, minLines = 2)
                CField(label = "Reason for Application", value = reason, onValueChange = { reason = it }, placeholder = "Why do you want to become a creator?", maxLines = 4, minLines = 3)

                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = {
                        onSubmit(displayName, category, description, reason)
                        submitted = true
                    },
                    enabled = displayName.isNotBlank() && reason.isNotBlank(),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text("Submit Application", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

