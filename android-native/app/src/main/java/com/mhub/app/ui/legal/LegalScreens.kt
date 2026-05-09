package com.mhub.app.ui.legal

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

private val bgGradient get() = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))

@Composable
private fun LegalTopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB)) }
        Spacer(Modifier.width(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
    }
}

// ─── Shared CMS ViewModel & State ─────────────────────────────────────────────
data class CmsUiState(val loading: Boolean = true, val content: String? = null, val error: String? = null)

private suspend fun loadCms(fn: suspend () -> ApiResult<CmsContentResponse>, onResult: (CmsUiState) -> Unit) {
    when (val r = fn()) {
        is ApiResult.Success -> onResult(CmsUiState(loading = false, content = r.data.displayContent))
        is ApiResult.Failure -> onResult(CmsUiState(loading = false, error = r.error.message))
    }
}

@HiltViewModel
class TermsViewModel @Inject constructor(private val repo: CmsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CmsUiState())
    val state: StateFlow<CmsUiState> = _state.asStateFlow()
    init { viewModelScope.launch { loadCms(repo::terms) { _state.value = it } } }
}

@HiltViewModel
class PrivacyViewModel @Inject constructor(private val repo: CmsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CmsUiState())
    val state: StateFlow<CmsUiState> = _state.asStateFlow()
    init { viewModelScope.launch { loadCms(repo::privacy) { _state.value = it } } }
}

@HiltViewModel
class RefundViewModel @Inject constructor(private val repo: CmsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CmsUiState())
    val state: StateFlow<CmsUiState> = _state.asStateFlow()
    init { viewModelScope.launch { loadCms(repo::refund) { _state.value = it } } }
}

@HiltViewModel
class SupportPolicyViewModel @Inject constructor(private val repo: CmsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CmsUiState())
    val state: StateFlow<CmsUiState> = _state.asStateFlow()
    init { viewModelScope.launch { loadCms(repo::supportPolicy) { _state.value = it } } }
}

@Composable
private fun CmsScreen(title: String, icon: ImageVector, state: CmsUiState, onBack: () -> Unit) {
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            LegalTopBar(title, onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.content != null -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(20.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF2563EB).copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                                    Icon(icon, null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                                }
                                Spacer(Modifier.width(12.dp))
                                Text(title, fontWeight = FontWeight.Bold, fontSize = 17.sp, color = Color(0xFF1E293B))
                            }
                            Spacer(Modifier.height(16.dp))
                            Text(state.content, fontSize = 14.sp, color = Color(0xFF374151), lineHeight = 22.sp)
                        }
                    }
                }
                else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Text(state.error ?: "Content unavailable", color = Color(0xFF64748B))
                    }
                }
            }
        }
    }
}

@Composable
fun TermsScreen(onBack: () -> Unit, viewModel: TermsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    CmsScreen("Terms & Conditions", Icons.Filled.Gavel, state, onBack)
}

@Composable
fun PrivacyScreen(onBack: () -> Unit, viewModel: PrivacyViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    CmsScreen("Privacy Policy", Icons.Filled.PrivacyTip, state, onBack)
}

@Composable
fun RefundScreen(onBack: () -> Unit, viewModel: RefundViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    CmsScreen("Refund Policy", Icons.Filled.CurrencyRupee, state, onBack)
}

@Composable
fun SupportPolicyScreen(onBack: () -> Unit, viewModel: SupportPolicyViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    CmsScreen("Support Policy", Icons.Filled.SupportAgent, state, onBack)
}

// ─── AdminPanelScreen ─────────────────────────────────────────────────────────
data class AdminUiState(
    val loading: Boolean = true,
    val stats: AdminStats = AdminStats(),
    val flaggedUsers: List<AdminFlaggedUser> = emptyList(),
    val flaggedPosts: List<AdminFlaggedPost> = emptyList(),
    val recentActivity: List<AdminActivity> = emptyList(),
    val error: String? = null,
    val tab: String = "users",
    val search: String = "",
)

@HiltViewModel
class AdminViewModel @Inject constructor(private val repo: AdminRepository) : ViewModel() {
    private val _state = MutableStateFlow(AdminUiState())
    val state: StateFlow<AdminUiState> = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        when (val r = repo.dashboard()) {
            is ApiResult.Success -> _state.value = AdminUiState(loading = false, stats = r.data.stats, flaggedUsers = r.data.flaggedUsers, flaggedPosts = r.data.flaggedPosts, recentActivity = r.data.recentActivity)
            is ApiResult.Failure -> _state.value = AdminUiState(loading = false, error = r.error.message)
        }
    } }
    fun refresh() { viewModelScope.launch { _refreshing.value = true; load(); _refreshing.value = false } }
    fun setTab(t: String) { _state.value = _state.value.copy(tab = t) }
    fun setSearch(v: String) { _state.value = _state.value.copy(search = v) }
    fun approveUser(id: String) { _state.value = _state.value.copy(flaggedUsers = _state.value.flaggedUsers.map { if ((it.id ?: "") == id) it.copy(status = "approved") else it }) }
    fun rejectUser(id: String) { _state.value = _state.value.copy(flaggedUsers = _state.value.flaggedUsers.map { if ((it.id ?: "") == id) it.copy(status = "rejected") else it }) }
    fun banUser(id: String) { _state.value = _state.value.copy(flaggedUsers = _state.value.flaggedUsers.map { if ((it.id ?: "") == id) it.copy(status = "banned") else it }) }
    fun approvePost(id: String) { _state.value = _state.value.copy(flaggedPosts = _state.value.flaggedPosts.map { if ((it.id ?: "") == id) it.copy(status = "approved") else it }) }
    fun removePost(id: String) { _state.value = _state.value.copy(flaggedPosts = _state.value.flaggedPosts.filter { (it.id ?: "") != id }) }
}

@Composable
fun AdminPanelScreen(onBack: () -> Unit, viewModel: AdminViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val tabs = listOf("users" to "Users", "posts" to "Posts", "activity" to "Activity")
    // Confirmation dialog state
    var confirmAction by remember { mutableStateOf<Triple<String, String, () -> Unit>?>(null) } // (title, message, action)
    confirmAction?.let { (title, message, action) ->
        AlertDialog(
            onDismissRequest = { confirmAction = null },
            title = { Text(title) },
            text = { Text(message) },
            confirmButton = { TextButton(onClick = { action(); confirmAction = null }) { Text("Confirm", color = Color(0xFFEF4444)) } },
            dismissButton = { TextButton(onClick = { confirmAction = null }) { Text("Cancel") } },
        )
    }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            LegalTopBar("Admin Panel", onBack)
            if (state.loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            else PullToRefreshBox(isRefreshing = refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize()) { LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Stats grid
                item {
                    val s = state.stats
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Users" to "${s.totalUsers}" to Color(0xFF2563EB), "Posts" to "${s.totalPosts}" to Color(0xFF22C55E), "Flagged" to "${s.flaggedPosts}" to Color(0xFFEF4444)).forEach { (pair, color) ->
                            val (label, value) = pair
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.weight(1f)) {
                                Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(value, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = color)
                                    Text(label, fontSize = 11.sp, color = Color(0xFF64748B))
                                }
                            }
                        }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Restricted" to "${state.stats.restrictedUsers}" to Color(0xFFF59E0B), "Today Sign" to "${state.stats.todaySignups}" to Color(0xFF8B5CF6), "Today Post" to "${state.stats.todayPosts}" to Color(0xFF06B6D4)).forEach { (pair, color) ->
                            val (label, value) = pair
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.weight(1f)) {
                                Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(value, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = color)
                                    Text(label, fontSize = 11.sp, color = Color(0xFF64748B))
                                }
                            }
                        }
                    }
                }
                // Tabs
                item {
                    TabRow(selectedTabIndex = tabs.indexOfFirst { it.first == state.tab }.coerceAtLeast(0), containerColor = Color.Transparent) {
                        tabs.forEach { (key, label) ->
                            Tab(selected = state.tab == key, onClick = { viewModel.setTab(key) },
                                text = { Text(label, fontWeight = if (state.tab == key) FontWeight.SemiBold else FontWeight.Normal) })
                        }
                    }
                }
                // Search
                item {
                    OutlinedTextField(value = state.search, onValueChange = { viewModel.setSearch(it) },
                        placeholder = { Text("Search…") }, leadingIcon = { Icon(Icons.Filled.Search, null) },
                        singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                }
                when (state.tab) {
                    "users" -> {
                        val filtered = state.flaggedUsers.filter { u -> state.search.isBlank() || (u.name ?: "").contains(state.search, true) || (u.email ?: "").contains(state.search, true) }
                        if (filtered.isEmpty()) item { Text("No flagged users", color = Color(0xFF64748B)) }
                        items(filtered, key = { it.id ?: it.name ?: "" }) { user ->
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Column {
                                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Box(Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFFEE2E2)), contentAlignment = Alignment.Center) {
                                            Icon(Icons.Filled.Person, null, tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                                        }
                                        Spacer(Modifier.width(10.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(user.name ?: "Unknown", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                            Text(user.reason ?: "Flagged", fontSize = 11.sp, color = Color(0xFFEF4444))
                                        }
                                        val statusColor = when (user.status) {
                                            "approved" -> Color(0xFF22C55E)
                                            "rejected" -> Color(0xFFEF4444)
                                            "banned" -> Color(0xFF7C3AED)
                                            else -> Color(0xFFEF4444)
                                        }
                                        Surface(shape = RoundedCornerShape(8.dp), color = statusColor.copy(alpha = 0.1f)) {
                                            Text(user.status ?: "flagged", fontSize = 10.sp, color = statusColor, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    // Action buttons
                                    if (user.status == null || user.status == "flagged") {
                                        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Button(onClick = { viewModel.approveUser(user.id ?: "") }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Approve", fontSize = 11.sp) }
                                            Button(onClick = { confirmAction = Triple("Reject User", "Are you sure you want to reject this user?") { viewModel.rejectUser(user.id ?: "") } }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Reject", fontSize = 11.sp) }
                                            Button(onClick = { confirmAction = Triple("Ban User", "Are you sure you want to ban this user? This action is serious.") { viewModel.banUser(user.id ?: "") } }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Ban", fontSize = 11.sp) }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "posts" -> {
                        val filtered = state.flaggedPosts.filter { p -> state.search.isBlank() || (p.title ?: "").contains(state.search, true) }
                        if (filtered.isEmpty()) item { Text("No flagged posts", color = Color(0xFF64748B)) }
                        items(filtered, key = { it.id ?: it.title ?: "" }) { post ->
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Column {
                                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.Flag, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.width(10.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(post.title ?: "Post", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                            Text(post.reason ?: "Flagged", fontSize = 11.sp, color = Color(0xFFF59E0B))
                                        }
                                        val statusColor = if (post.status == "approved") Color(0xFF22C55E) else Color(0xFFF59E0B)
                                        Surface(shape = RoundedCornerShape(8.dp), color = statusColor.copy(alpha = 0.1f)) {
                                            Text(post.status ?: "flagged", fontSize = 10.sp, color = statusColor, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    // Post action buttons
                                    if (post.status == null || post.status == "flagged") {
                                        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Button(onClick = { viewModel.approvePost(post.id ?: "") }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Approve", fontSize = 11.sp) }
                                            Button(onClick = { confirmAction = Triple("Remove Post", "Are you sure you want to remove this flagged post?") { viewModel.removePost(post.id ?: "") } }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Remove", fontSize = 11.sp) }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "activity" -> {
                        if (state.recentActivity.isEmpty()) item { Text("No recent activity", color = Color(0xFF64748B)) }
                        items(state.recentActivity, key = { it.id ?: it.description ?: "" }) { act ->
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.History, null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(act.description ?: act.type ?: "Action", fontSize = 13.sp, color = Color(0xFF374151))
                                        if (act.createdAt != null) Text(act.createdAt.take(16).replace("T", " "), fontSize = 10.sp, color = Color(0xFF94A3B8))
                                    }
                                }
                            }
                        }
                    }
                }
            } }
        }
    }
}

// ─── InviteScreen ─────────────────────────────────────────────────────────────
data class InviteUiState(val loading: Boolean = true, val inviterName: String? = null, val bonus: String? = null, val valid: Boolean = false, val error: String? = null)

@HiltViewModel
class InviteViewModel @Inject constructor(private val repo: InviteRepository) : ViewModel() {
    private val _state = MutableStateFlow(InviteUiState())
    val state: StateFlow<InviteUiState> = _state.asStateFlow()
    fun load(code: String) { viewModelScope.launch {
        when (val r = repo.info(code)) {
            is ApiResult.Success -> _state.value = InviteUiState(loading = false, valid = r.data.valid, inviterName = r.data.inviterName, bonus = r.data.bonus?.toString())
            is ApiResult.Failure -> _state.value = InviteUiState(loading = false, error = r.error.message)
        }
    } }
}

@Composable
fun InviteScreen(code: String, onBack: () -> Unit, viewModel: InviteViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(code) { viewModel.load(code) }
    Box(Modifier.fillMaxSize().background(bgGradient), contentAlignment = Alignment.Center) {
        Column(Modifier.fillMaxSize()) {
            LegalTopBar("Invite", onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.valid -> Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Box(Modifier.size(80.dp).clip(CircleShape).background(Color(0xFF2563EB)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.PersonAdd, null, tint = Color.White, modifier = Modifier.size(40.dp))
                    }
                    Spacer(Modifier.height(20.dp))
                    Text("You've been invited!", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF1E293B))
                    if (state.inviterName != null) { Spacer(Modifier.height(8.dp)); Text("by ${state.inviterName}", fontSize = 15.sp, color = Color(0xFF64748B)) }
                    if (state.bonus != null) {
                        Spacer(Modifier.height(16.dp))
                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFFFF7ED)) {
                            Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Stars, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Bonus: ${state.bonus} coins on sign up!", fontWeight = FontWeight.SemiBold, color = Color(0xFF92400E))
                            }
                        }
                    }
                    Spacer(Modifier.height(28.dp))
                    Button(onClick = onBack, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)), modifier = Modifier.padding(horizontal = 32.dp).fillMaxWidth().height(50.dp)) { Text("Sign Up & Accept", fontWeight = FontWeight.SemiBold) }
                }
                else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.LinkOff, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("Invalid Invite", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = Color(0xFF374151))
                        Spacer(Modifier.height(8.dp))
                        Text(state.error ?: "This invite link is invalid or has expired.", fontSize = 14.sp, color = Color(0xFF64748B))
                        Spacer(Modifier.height(20.dp))
                        Button(onClick = onBack, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text("Go Back") }
                    }
                }
            }
        }
    }
}

// ─── NotFoundScreen ───────────────────────────────────────────────────────────
@Composable
fun NotFoundScreen(onBack: () -> Unit) {
    Box(Modifier.fillMaxSize().background(bgGradient), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
            Box(
                Modifier.size(120.dp).clip(CircleShape).background(Color(0xFFEFF6FF)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.SearchOff, null, tint = Color(0xFF2563EB), modifier = Modifier.size(56.dp))
            }
            Spacer(Modifier.height(20.dp))
            Text("404", fontWeight = FontWeight.Bold, fontSize = 64.sp, color = Color(0xFF2563EB))
            Spacer(Modifier.height(8.dp))
            Text("Page Not Found", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF1E293B))
            Spacer(Modifier.height(8.dp))
            Text("The page you're looking for doesn't exist or has been moved.", fontSize = 14.sp, color = Color(0xFF64748B), modifier = Modifier.padding(horizontal = 16.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Spacer(Modifier.height(28.dp))
            Button(onClick = onBack, shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)), modifier = Modifier.fillMaxWidth().height(50.dp)) { Text("Go Home", fontWeight = FontWeight.SemiBold) }
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onBack) { Text("Go back", color = Color(0xFF64748B)) }
        }
    }
}

