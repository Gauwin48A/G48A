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
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.Channel
import com.mhub.app.data.remote.dto.ChannelDetailResponse
import com.mhub.app.data.remote.dto.CreateChannelRequest
import com.mhub.app.data.repository.ChannelsRepository
import com.mhub.app.data.repository.TiersRepository
import com.mhub.app.ui.components.ListShimmer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────
// CentreList
// ──────────────────────────────────────────────────────────────────────────────

data class CentreListUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val centres: List<Channel> = emptyList(),
    val error: String? = null,
    val isPremium: Boolean = false,
    val hasTrialAvailable: Boolean = false,
)

@HiltViewModel
class CentreListViewModel @Inject constructor(
    private val channelsRepo: ChannelsRepository,
    private val tiersRepo: TiersRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(CentreListUiState())
    val state: StateFlow<CentreListUiState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L

    init {
        load()
        checkPremiumStatus()
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) { load() }
                lastLocaleVersion = version
            }
        }
    }

    fun load() {
        _state.value = _state.value.copy(loading = true)
        viewModelScope.launch {
            when (val r = channelsRepo.list()) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, centres = r.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = null)
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            when (val r = channelsRepo.list()) {
                is ApiResult.Success -> _state.value = _state.value.copy(refreshing = false, centres = r.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(refreshing = false)
            }
        }
    }

    private fun checkPremiumStatus() {
        viewModelScope.launch {
            when (val r = tiersRepo.mySubscription()) {
                is ApiResult.Success -> {
                    val sub = r.data
                    val isPremium = sub.active && sub.currentPlan.equals("premium", ignoreCase = true)
                    _state.value = _state.value.copy(
                        isPremium = isPremium,
                        hasTrialAvailable = sub.active && !isPremium
                    )
                }
                is ApiResult.Failure -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CentreListScreen(
    onBack: () -> Unit,
    onOpenCentre: (String) -> Unit,
    onNavigateToCreate: () -> Unit,
    viewModel: CentreListViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    Column(Modifier.fillMaxSize().background(Color(0xFFF8FAFC))) {
        // Hero Section
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.horizontalGradient(listOf(Color(0xFF4F46E5), Color(0xFF7C3AED)))),
        ) {
            Column(Modifier.padding(horizontal = 20.dp, vertical = 24.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Default.Hub, null, tint = Color.White, modifier = Modifier.size(28.dp))
                    Text("Community Centres", fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Color.White)
                }
                Text("Join hubs, share knowledge and connect with experts", fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f))
            }
        }

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize()
        ) {
            when {
                state.loading && state.centres.isEmpty() -> ListShimmer(count = 5, modifier = Modifier.padding(16.dp))
                state.error != null && state.centres.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Failed to load centres", color = MaterialTheme.colorScheme.error)
                        Button(onClick = { viewModel.load() }) { Text("Retry") }
                    }
                }
                else -> LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    item {
                        // Create Centre Card
                        Surface(
                            onClick = onNavigateToCreate,
                            shape = RoundedCornerShape(16.dp),
                            color = Color.White,
                            shadowElevation = 2.dp,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier.size(48.dp).clip(CircleShape).background(Color(0xFFEEF2FF)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.AddHomeWork, null, tint = Color(0xFF4F46E5))
                                }
                                Column(Modifier.weight(1f)) {
                                    Text("Create Your Own Centre", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    Text("Build a community around your passion", fontSize = 12.sp, color = Color(0xFF64748B))
                                }
                                if (!state.isPremium) {
                                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFFEF3C7)) {
                                        Text("PREMIUM", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF92400E), modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                                    }
                                }
                                Icon(Icons.Default.ChevronRight, null, tint = Color(0xFFCBD5E1))
                            }
                        }
                    }

                    item {
                        Text("Featured Centres", fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
                    }

                    items(state.centres, key = { it.stableId }) { centre ->
                        CentreCard(centre, onClick = { onOpenCentre(centre.stableId) })
                    }
                }
            }
        }
    }
}

@Composable
private fun CentreCard(centre: Channel, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            // Cover Image
            AsyncImage(
                model = centre.coverUrl ?: "https://images.unsplash.com/photo-1517245385569-b21a0cf20ad1?q=80&w=800",
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().height(100.dp)
            )
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Profile/Icon
                AsyncImage(
                    model = centre.avatarUrl ?: "https://api.dicebear.com/7.x/identicon/svg?seed=${centre.name}",
                    contentDescription = null,
                    modifier = Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFFF1F5F9))
                )
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(centre.displayName, fontWeight = FontWeight.Bold, fontSize = 16.sp, maxLines = 1)
                        if (centre.isVerified) {
                            Icon(Icons.Default.Verified, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(16.dp))
                        }
                    }
                    Text(centre.description ?: "No description provided", fontSize = 12.sp, color = Color(0xFF64748B), maxLines = 2)
                    Row(
                        modifier = Modifier.padding(top = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Default.People, null, modifier = Modifier.size(14.dp), tint = Color(0xFF94A3B8))
                            Text("${centre.followerCount} followers", fontSize = 11.sp, color = Color(0xFF64748B))
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Default.Article, null, modifier = Modifier.size(14.dp), tint = Color(0xFF94A3B8))
                            Text("${centre.postCount} posts", fontSize = 11.sp, color = Color(0xFF64748B))
                        }
                    }
                }
                Button(
                    onClick = onClick,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp),
                    modifier = Modifier.height(32.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5))
                ) {
                    Text("Join", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CentreCreate
// ──────────────────────────────────────────────────────────────────────────────

data class CentreCreateUiState(
    val loading: Boolean = false,
    val checkingPremium: Boolean = true,
    val isPremium: Boolean = false,
    val canCreateCentre: Boolean = false,
    val isTrialActive: Boolean = false,
    val trialAvailable: Boolean = false,
    val success: Boolean = false,
    val error: String? = null,
    val name: String = "",
    val description: String = "",
    val category: String = "",
)

@HiltViewModel
class CentreCreateViewModel @Inject constructor(
    private val channelsRepo: ChannelsRepository,
    private val tiersRepo: TiersRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CentreCreateUiState())
    val state: StateFlow<CentreCreateUiState> = _state.asStateFlow()

    init {
        checkPremiumStatus()
    }

    private fun checkPremiumStatus() {
        viewModelScope.launch {
            _state.value = _state.value.copy(checkingPremium = true)
            when (val r = tiersRepo.mySubscription()) {
                is ApiResult.Success -> {
                    val sub = r.data
                    val plan = sub.currentPlan.lowercase()
                    val subscription = sub.subscription
                    val isPremium = sub.active && plan == "premium" && subscription?.isTrial != true
                    val isTrialActive = sub.active && (subscription?.isTrial == true || plan.contains("trial"))
                    val canCreateCentre = isPremium || isTrialActive
                    _state.value = _state.value.copy(
                        checkingPremium = false,
                        loading = false,
                        isPremium = isPremium,
                        canCreateCentre = canCreateCentre,
                        isTrialActive = isTrialActive,
                        trialAvailable = !canCreateCentre
                    )
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(checkingPremium = false, loading = false)
                }
            }
        }
    }

    fun setName(v: String) { _state.value = _state.value.copy(name = v) }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v) }
    fun setCategory(v: String) { _state.value = _state.value.copy(category = v) }

    fun activateTrial() {
        _state.value = _state.value.copy(loading = true)
        viewModelScope.launch {
            when (tiersRepo.activateTrial()) {
                is ApiResult.Success -> checkPremiumStatus()
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = "Failed to activate trial")
            }
        }
    }

    fun submit() {
        val s = _state.value
        if (!s.canCreateCentre) {
            _state.value = s.copy(error = "Premium or an active 1-week trial is required to create a centre")
            return
        }
        if (s.name.isBlank()) { _state.value = s.copy(error = "Centre name is required"); return }
        if (s.category.isBlank()) { _state.value = s.copy(error = "Select a category"); return }
        if (s.description.length < 20) { _state.value = s.copy(error = "Description must be at least 20 chars"); return }

        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = channelsRepo.create(CreateChannelRequest(name = s.name, category = s.category, description = s.description))) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
}

data class CentreDetailUiState(
    val loading: Boolean = true,
    val details: ChannelDetailResponse? = null,
    val error: String? = null,
)

@HiltViewModel
class CentreDetailViewModel @Inject constructor(
    private val channelsRepo: ChannelsRepository,
    private val localeManager: com.mhub.app.core.LocaleManager,
) : ViewModel() {
    private val _state = MutableStateFlow(CentreDetailUiState())
    val state: StateFlow<CentreDetailUiState> = _state.asStateFlow()
    private var lastLocaleVersion = 0L

    init {
        viewModelScope.launch {
            localeManager.localeVersion.collect { version ->
                if (version > lastLocaleVersion && lastLocaleVersion > 0L) {
                    _state.value.details?.channel?.stableId?.let { load(it) }
                }
                lastLocaleVersion = version
            }
        }
    }

    fun load(id: String) {
        viewModelScope.launch {
            _state.value = CentreDetailUiState(loading = true)
            when (val result = channelsRepo.detail(id)) {
                is ApiResult.Success -> _state.value = CentreDetailUiState(loading = false, details = result.data)
                is ApiResult.Failure -> _state.value = CentreDetailUiState(loading = false, error = result.error.message)
            }
        }
    }

    fun toggleFollow() {
        val channel = _state.value.details?.channel ?: return
        viewModelScope.launch {
            if (channel.followed) channelsRepo.unfollow(channel.stableId) else channelsRepo.follow(channel.stableId)
            load(channel.stableId)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CentreDetailScreen(
    centreId: String,
    onBack: () -> Unit,
    viewModel: CentreDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(centreId) { viewModel.load(centreId) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.details?.channel?.displayName ?: "Centre") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        },
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            state.error != null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.error ?: "Unable to load Centre", color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.load(centreId) }) { Text("Retry") }
                }
            }
            else -> {
                val details = state.details ?: return@Scaffold
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        CentreCard(details.channel, onClick = {})
                    }
                    item {
                        Button(onClick = viewModel::toggleFollow, modifier = Modifier.fillMaxWidth()) {
                            Text(if (details.channel.followed) "Unfollow" else "Follow")
                        }
                    }
                    item {
                        Text("Updates", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    if (details.posts.isEmpty()) {
                        item { Text("No updates yet", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    } else {
                        items(details.posts, key = { it.stableId }) { post ->
                            Surface(shape = RoundedCornerShape(12.dp), tonalElevation = 1.dp) {
                                Text(
                                    post.description.orEmpty(),
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CentreCreateScreen(
    onBack: () -> Unit,
    onNavigateToPremium: () -> Unit,
    viewModel: CentreCreateViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    if (state.success) {
        LaunchedEffect(Unit) { onBack() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Centre", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (state.checkingPremium) {
                Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (!state.canCreateCentre) {
                PremiumUpsellCard(
                    trialAvailable = state.trialAvailable,
                    onActivateTrial = { viewModel.activateTrial() },
                    onNavigateToPremium = onNavigateToPremium
                )
            } else {
                val accessLabel = if (state.isTrialActive) "1-week trial active" else "Premium active"
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFECFDF5), modifier = Modifier.fillMaxWidth()) {
                    Text(accessLabel, color = Color(0xFF047857), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(12.dp))
                }
                Text("Centre Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                Text("Category", fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Electronics", "Fashion", "Vehicles", "Others").forEach { category ->
                        FilterChip(
                            selected = state.category == category,
                            onClick = { viewModel.setCategory(category) },
                            label = { Text(category) },
                        )
                    }
                }
                
                OutlinedTextField(
                    value = state.name,
                    onValueChange = viewModel::setName,
                    label = { Text("Centre Name") },
                    placeholder = { Text("e.g. Vintage Camera Collectors") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = state.description,
                    onValueChange = viewModel::setDescription,
                    label = { Text("Description") },
                    placeholder = { Text("Describe the purpose and community of your centre...") },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    shape = RoundedCornerShape(12.dp)
                )

                state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

                Button(
                    onClick = { viewModel.submit() },
                    enabled = !state.loading && state.name.isNotBlank() && state.category.isNotBlank() && state.description.length >= 20,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5))
                ) {
                    if (state.loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    else Text("Create Centre", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun PremiumUpsellCard(
    trialAvailable: Boolean,
    onActivateTrial: () -> Unit,
    onNavigateToPremium: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color(0xFFEEF2FF),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF4F46E5).copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier.size(64.dp).clip(CircleShape).background(Color.White),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.WorkspacePremium, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(36.dp))
            }
            Spacer(Modifier.height(16.dp))
            Text("Premium Feature", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color(0xFF1E1B4B))
            Text(
                "Centre creation is available for Premium users or during the 1-week trial.",
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                fontSize = 13.sp,
                color = Color(0xFF4338CA),
                modifier = Modifier.padding(vertical = 8.dp)
            )
            
            if (trialAvailable) {
                Button(
                    onClick = onActivateTrial,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5))
                ) {
                    Text("Start 1-Week Free Trial", fontWeight = FontWeight.Bold)
                }
                TextButton(onClick = onNavigateToPremium) {
                    Text("View Plans", color = Color(0xFF4F46E5))
                }
            } else {
                Button(
                    onClick = onNavigateToPremium,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5))
                ) {
                    Text("Upgrade to Premium", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
