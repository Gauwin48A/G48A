package com.mhub.app.ui.rewards

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.DailyCodeResponse
import com.mhub.app.data.remote.dto.ReferralNode
import com.mhub.app.data.remote.dto.ReferralTreeResponse
import com.mhub.app.data.repository.DailyCodeRepository
import com.mhub.app.data.repository.ReferralTreeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DailyCodeState(
    val loading: Boolean = true,
    val code: String? = null,
    val expiresAt: String? = null,
    val reward: Int? = null,
)

@HiltViewModel
class DailyCodeViewModel @Inject constructor(
    private val repo: DailyCodeRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(DailyCodeState())
    val state: StateFlow<DailyCodeState> = _state.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            when (val r = repo.get()) {
                is ApiResult.Success -> _state.value = DailyCodeState(
                    loading = false,
                    code = r.data.code,
                    expiresAt = r.data.expiresAt,
                    reward = r.data.reward,
                )
                is ApiResult.Failure -> _state.value = DailyCodeState(loading = false)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyCodeScreen(onBack: () -> Unit, viewModel: DailyCodeViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val clipboardManager = LocalClipboardManager.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Daily Code", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            if (state.loading) {
                CircularProgressIndicator()
            } else if (state.code != null) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                    Text("Today's Code", fontSize = 14.sp, color = Color(0xFF64748B))
                    Spacer(Modifier.height(12.dp))
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFF1D4ED8),
                        shadowElevation = 8.dp,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                state.code.orEmpty(),
                                fontSize = 36.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                letterSpacing = 4.sp,
                            )
                            Spacer(Modifier.height(8.dp))
                            state.reward?.let {
                                Text("Reward: $it points", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                            }
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        IconButton(onClick = { clipboardManager.setText(AnnotatedString(state.code.orEmpty())) }) {
                            Icon(Icons.Default.ContentCopy, "Copy", tint = MaterialTheme.colorScheme.primary)
                        }
                        IconButton(onClick = { /* share intent */ }) {
                            Icon(Icons.Default.Share, "Share", tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    state.expiresAt?.let {
                        Text("Expires: ${it.take(10)}", fontSize = 12.sp, color = Color(0xFF94A3B8))
                    }
                }
            } else {
                Text("No daily code available", color = Color(0xFF64748B))
            }
        }
    }
}

// ─── Referral Tree ──────────────────────────────────────────────────

data class ReferralState(
    val loading: Boolean = true,
    val nodes: List<ReferralNode> = emptyList(),
    val totalReferrals: Int = 0,
)

@HiltViewModel
class ReferralTreeViewModel @Inject constructor(
    private val repo: ReferralTreeRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ReferralState())
    val state: StateFlow<ReferralState> = _state.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            when (val r = repo.tree()) {
                is ApiResult.Success -> {
                    val root = r.data.tree
                    val flatNodes = root?.flatten() ?: emptyList()
                    _state.value = ReferralState(
                        loading = false,
                        nodes = flatNodes,
                        totalReferrals = r.data.total,
                    )
                }
                is ApiResult.Failure -> _state.value = ReferralState(loading = false)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReferralTreeScreen(onBack: () -> Unit, viewModel: ReferralTreeViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Referral Tree", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            state.nodes.isEmpty() -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No referrals yet. Share your code!", color = Color(0xFF64748B))
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1D4ED8)),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(20.dp)) {
                            Text("Total Referrals", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                            Text("${state.totalReferrals}", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
                items(state.nodes, key = { it.id }) { node ->
                    Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(40.dp).clip(CircleShape).background(Color(0xFF2563EB)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(node.name.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(node.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text("Level ${node.depth} • Joined ${node.joinDate?.take(10) ?: ""}", fontSize = 11.sp, color = Color(0xFF64748B))
                            }
                            Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7)) {
                                val reward = when (node.depth) {
                                    1 -> 50
                                    2 -> 25
                                    3 -> 10
                                    4 -> 5
                                    else -> 2
                                }
                                Text("+$reward", fontSize = 11.sp, color = Color(0xFF22C55E), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
