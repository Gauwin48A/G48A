package com.mhub.app.ui.channels

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import com.mhub.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

private val bgGradient get() = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))

@Composable
private fun TopBar(title: String, onBack: () -> Unit, trailing: @Composable (() -> Unit)? = null) {
    Row(
        Modifier.fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB)) }
        Spacer(Modifier.width(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))
        trailing?.invoke()
    }
}

// ─── ChannelsListScreen ──────────────────────────────────────────────────────
data class ChannelsUiState(val loading: Boolean = true, val channels: List<Channel> = emptyList(), val error: String? = null, val search: String = "")

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
    fun setSearch(v: String) { _state.value = _state.value.copy(search = v) }
    fun toggleFollow(ch: Channel) { viewModelScope.launch {
        val id = ch.stableId
        if (ch.isMember) repo.unfollow(id) else repo.follow(id)
        load()
    } }
}

@Composable
fun ChannelsListScreen(onBack: () -> Unit, onOpenChannel: (String) -> Unit = {}, onCreateChannel: () -> Unit = {}, viewModel: ChannelsListViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val filtered = state.channels.filter { state.search.isBlank() || it.displayName.contains(state.search, true) || (it.description ?: "").contains(state.search, true) }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            TopBar("Channels", onBack) {
                IconButton(onClick = onCreateChannel) { Icon(Icons.Filled.Add, null, tint = Color(0xFF2563EB)) }
            }
            // Search bar
            OutlinedTextField(value = state.search, onValueChange = { viewModel.setSearch(it) },
                placeholder = { Text("Search channels…") }, leadingIcon = { Icon(Icons.Filled.Search, null) },
                singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
            Spacer(Modifier.height(8.dp))
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                filtered.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.Forum, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text(if (state.search.isNotBlank()) "No channels match" else "No channels yet", fontWeight = FontWeight.SemiBold, color = Color(0xFF374151))
                        if (state.search.isBlank()) { Spacer(Modifier.height(16.dp)); Button(onClick = onCreateChannel, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text("Create First Channel") } }
                    }
                }
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(filtered, key = { it.stableId }) { ch ->
                        ChannelCard(ch, onFollow = { viewModel.toggleFollow(ch) }) { onOpenChannel(ch.stableId) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChannelCard(channel: Channel, onFollow: () -> Unit, onClick: () -> Unit) {
    Surface(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick), shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).clip(CircleShape).background(Color(0xFF2563EB)), contentAlignment = Alignment.Center) {
                Text(channel.displayName.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(channel.displayName, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                if (channel.description != null) Text(channel.description, fontSize = 12.sp, color = Color(0xFF64748B), maxLines = 1)
                Spacer(Modifier.height(4.dp))
                Row {
                    Icon(Icons.Filled.People, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(13.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("${channel.memberCount} members", fontSize = 11.sp, color = Color(0xFF94A3B8))
                }
            }
            if (channel.isMember) {
                OutlinedButton(onClick = onFollow, shape = RoundedCornerShape(20.dp), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp), modifier = Modifier.height(30.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF64748B))) { Text("Following", fontSize = 11.sp) }
            } else {
                Button(onClick = onFollow, shape = RoundedCornerShape(20.dp), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp), modifier = Modifier.height(30.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text("Follow", fontSize = 11.sp) }
            }
        }
    }
}

// ─── CreateChannelScreen ─────────────────────────────────────────────────────
data class CreateChannelUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val name: String = "", val description: String = "")

@HiltViewModel
class CreateChannelViewModel @Inject constructor(private val repo: ChannelsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CreateChannelUiState())
    val state: StateFlow<CreateChannelUiState> = _state.asStateFlow()
    fun setName(v: String) { _state.value = _state.value.copy(name = v) }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v) }
    fun submit() {
        val s = _state.value
        if (s.name.isBlank()) { _state.value = s.copy(error = "Channel name is required"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.create(CreateChannelRequest(name = s.name, description = s.description.ifBlank { null }))) {
                is ApiResult.Success -> _state.value = CreateChannelUiState(success = true)
                is ApiResult.Failure -> _state.value = s.copy(loading = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun CreateChannelScreen(onBack: () -> Unit, viewModel: CreateChannelViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(state.success) { if (state.success) onBack() }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            TopBar("Create Channel", onBack)
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                CField("Channel Name", state.name, viewModel::setName, "e.g. Electronics Deals, Fashion Hub…")
                CField("Description (optional)", state.description, viewModel::setDescription, "What is this channel about?", maxLines = 3, minLines = 2)
                Button(onClick = { viewModel.submit() }, enabled = !state.loading && state.name.isNotBlank(), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)), modifier = Modifier.fillMaxWidth().height(50.dp)) { Text(if (state.loading) "Creating…" else "Create Channel", fontWeight = FontWeight.SemiBold) }
            }
        }
    }
}

// ─── ChannelDetailScreen ─────────────────────────────────────────────────────
data class ChannelDetailUiState(val loading: Boolean = true, val channel: Channel? = null, val error: String? = null, val toggling: Boolean = false)

@HiltViewModel
class ChannelDetailViewModel @Inject constructor(private val repo: ChannelsRepository) : ViewModel() {
    private val _state = MutableStateFlow(ChannelDetailUiState())
    val state: StateFlow<ChannelDetailUiState> = _state.asStateFlow()
    fun load(id: String) { viewModelScope.launch {
        when (val r = repo.detail(id)) {
            is ApiResult.Success -> _state.value = ChannelDetailUiState(loading = false, channel = r.data)
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

@Composable
fun ChannelDetailScreen(channelId: String, onBack: () -> Unit, viewModel: ChannelDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(channelId) { viewModel.load(channelId) }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            TopBar(state.channel?.displayName ?: "Channel", onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.channel != null -> {
                    val ch = state.channel!!
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        // Hero cover banner
                        item {
                            Box(Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(16.dp)).background(Brush.horizontalGradient(listOf(Color(0xFF2563EB), Color(0xFF7C3AED)))), contentAlignment = Alignment.BottomStart) {
                                Column(Modifier.padding(16.dp)) {
                                    Text(ch.displayName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                                    if (ch.description != null) Text(ch.description, color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp, maxLines = 2)
                                }
                            }
                        }
                        // Profile card with stats
                        item {
                            Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(Modifier.size(72.dp).clip(CircleShape).background(Color(0xFF2563EB)), contentAlignment = Alignment.Center) {
                                        Text(ch.displayName.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 28.sp)
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${ch.memberCount}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B)); Text("Members", fontSize = 11.sp, color = Color(0xFF64748B)) }
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${ch.postCount}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B)); Text("Posts", fontSize = 11.sp, color = Color(0xFF64748B)) }
                                    }
                                    Spacer(Modifier.height(14.dp))
                                    Button(onClick = { viewModel.toggleFollow(channelId) }, enabled = !state.toggling, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = if (ch.isMember) Color(0xFFF1F5F9) else Color(0xFF2563EB)), modifier = Modifier.fillMaxWidth().height(44.dp)) {
                                        Icon(if (ch.isMember) Icons.Filled.Check else Icons.Filled.PersonAdd, null, tint = if (ch.isMember) Color(0xFF374151) else Color.White, modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text(if (ch.isMember) "Following" else "Follow Channel", color = if (ch.isMember) Color(0xFF374151) else Color.White, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                        // Analytics summary
                        item {
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                listOf("Engagement" to "Active" to Color(0xFF22C55E), "Growth" to "Growing" to Color(0xFF2563EB), "Rank" to "Top 10%" to Color(0xFFF59E0B)).forEach { (pair, color) ->
                                    val (label, value) = pair
                                    Surface(modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp) {
                                        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(value, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = color)
                                            Text(label, fontSize = 10.sp, color = Color(0xFF64748B))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(state.error ?: "Channel not found", color = Color(0xFF64748B)) }
            }
        }
    }
}

// ─── Centres ─────────────────────────────────────────────────────────────────
data class CentresUiState(val loading: Boolean = true, val centres: List<Centre> = emptyList(), val error: String? = null)

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
}

@Composable
fun CentreListScreen(onBack: () -> Unit, onOpenCentre: (String) -> Unit = {}, onCreateCentre: () -> Unit = {}, viewModel: CentresListViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            TopBar("Centres", onBack) { IconButton(onClick = onCreateCentre) { Icon(Icons.Filled.Add, null, tint = Color(0xFF2563EB)) } }
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.centres.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.Store, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("No centres yet", fontWeight = FontWeight.SemiBold, color = Color(0xFF374151))
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = onCreateCentre, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text("Create First Centre") }
                    }
                }
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.centres, key = { it.stableId }) { c ->
                        Surface(modifier = Modifier.fillMaxWidth().clickable { onOpenCentre(c.stableId) }, shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFF10B981)), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Filled.Store, null, tint = Color.White, modifier = Modifier.size(24.dp))
                                }
                                Spacer(Modifier.width(14.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(c.displayName, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                                    if (c.location != null) { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF10B981), modifier = Modifier.size(12.dp)); Spacer(Modifier.width(3.dp)); Text(c.location, fontSize = 12.sp, color = Color(0xFF64748B)) } }
                                    Text("${c.listingCount} listings", fontSize = 11.sp, color = Color(0xFF94A3B8))
                                }
                                Icon(Icons.Filled.ChevronRight, null, tint = Color(0xFFCBD5E1))
                            }
                        }
                    }
                }
            }
        }
    }
}

data class CreateCentreUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val name: String = "", val description: String = "", val location: String = "")

@HiltViewModel
class CreateCentreViewModel @Inject constructor(private val repo: CentresRepository) : ViewModel() {
    private val _state = MutableStateFlow(CreateCentreUiState())
    val state: StateFlow<CreateCentreUiState> = _state.asStateFlow()
    fun setName(v: String) { _state.value = _state.value.copy(name = v) }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v) }
    fun setLocation(v: String) { _state.value = _state.value.copy(location = v) }
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

@Composable
fun CreateCentreScreen(onBack: () -> Unit, viewModel: CreateCentreViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(state.success) { if (state.success) onBack() }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            TopBar("Create Centre", onBack)
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                CField("Centre Name", state.name, viewModel::setName, "e.g. Andheri Electronics Market")
                CField("Description (optional)", state.description, viewModel::setDescription, "What does this centre sell?", maxLines = 3, minLines = 2)
                CField("Location", state.location, viewModel::setLocation, "City, Area")
                Button(onClick = { viewModel.submit() }, enabled = !state.loading && state.name.isNotBlank(), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)), modifier = Modifier.fillMaxWidth().height(50.dp)) { Text(if (state.loading) "Creating…" else "Create Centre", fontWeight = FontWeight.SemiBold) }
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

@Composable
fun CentreDetailScreen(centreId: String, onBack: () -> Unit, viewModel: CentreDetailViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(centreId) { viewModel.load(centreId) }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            TopBar(state.centre?.displayName ?: "Centre", onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.centre != null -> {
                    val c = state.centre!!
                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(20.dp)) {
                                Text(c.displayName, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))
                                if (c.description != null) { Spacer(Modifier.height(8.dp)); Text(c.description, fontSize = 14.sp, color = Color(0xFF64748B)) }
                                if (c.location != null) { Spacer(Modifier.height(8.dp)); Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF10B981), modifier = Modifier.size(16.dp)); Spacer(Modifier.width(6.dp)); Text(c.location, fontSize = 13.sp, color = Color(0xFF374151)) } }
                                Spacer(Modifier.height(12.dp))
                                Text("${c.listingCount} listings", fontWeight = FontWeight.SemiBold, color = Color(0xFF2563EB))
                            }
                        }
                    }
                }
                else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(state.error ?: "Centre not found", color = Color(0xFF64748B)) }
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

@Composable
fun CentreListingsScreen(centreId: String, onBack: () -> Unit, viewModel: CentreListingsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(centreId) { viewModel.load(centreId) }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            TopBar("Centre Listings", onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.posts.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No listings in this centre", color = Color(0xFF64748B)) }
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    item { Text("${state.posts.size} listings", fontSize = 13.sp, color = Color(0xFF64748B)) }
                    items(state.posts, key = { it.stableId }) { post ->
                        Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 1)
                                    if (post.price != null) Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF2563EB))
                                }
                            }
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
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(value = value, onValueChange = onValueChange, placeholder = { Text(placeholder, color = Color(0xFF94A3B8), fontSize = 13.sp) }, singleLine = maxLines == 1, maxLines = maxLines, minLines = minLines, shape = RoundedCornerShape(12.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White), modifier = Modifier.fillMaxWidth())
    }
}


