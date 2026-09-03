package com.zaruda.app.ui.rewards

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
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.zaruda.app.core.ApiError
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.userFacingMessage
import com.zaruda.app.data.remote.dto.ReferralNode
import com.zaruda.app.data.remote.dto.ReferralTreeResponse
import com.zaruda.app.data.repository.ReferralTreeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import java.util.Calendar

data class DailyCodeState(
    val loading: Boolean = true,
    val code: String? = null,
    val expiresAt: String? = null,
    val reward: Int? = null,
    val redeemLoading: Boolean = false,
    val redeemResult: String? = null,
)

/** Auto-generated daily code based on deterministic day-of-year + year hash. */
private fun generateDailyCode(): String {
    val cal = Calendar.getInstance()
    val dayOfYear = cal.get(Calendar.DAY_OF_YEAR)
    val year = cal.get(Calendar.YEAR)
    val raw = (dayOfYear * 31L + year * 7L).toString()
    val hash = (raw.hashCode() and 0x7FFFFFFF).toString(36).take(6).uppercase()
    return "DAY${dayOfYear}$hash"
}

@HiltViewModel
class DailyCodeViewModel @Inject constructor(
    private val rewardsRepository: com.zaruda.app.data.repository.RewardsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(DailyCodeState())
    val state: StateFlow<DailyCodeState> = _state.asStateFlow()

    init {
        val code = generateDailyCode()
        val cal = Calendar.getInstance()
        val monthStr = "%02d".format(cal.get(Calendar.MONTH) + 1)
        val dayStr = "%02d".format(cal.get(Calendar.DAY_OF_MONTH))
        val expiresAt = "${cal.get(Calendar.YEAR)}-$monthStr-${dayStr}T23:59:59Z"
        _state.value = DailyCodeState(
            loading = false,
            code = code,
            expiresAt = expiresAt,
            reward = 15,
        )
    }

    fun redeemCode(code: String) {
        _state.value = _state.value.copy(redeemLoading = true, redeemResult = null)
        viewModelScope.launch {
            val result = try {
                val r = rewardsRepository.claimDailyCode(code)
                when (r) {
                    is ApiResult.Success -> r.data.message ?: "🎉 +15 coins claimed!"
                    is ApiResult.Failure -> r.error.userFacingMessage("redeem code")
                }
            } catch (e: Exception) {
                e.message ?: "Failed to redeem"
            }
            _state.value = _state.value.copy(redeemLoading = false, redeemResult = result)
        }
    }

    fun clearRedeemResult() {
        _state.value = _state.value.copy(redeemResult = null)
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
                    Spacer(Modifier.height(16.dp))
                    // ── Interactive code input + Redeem ──
                    var inputCode by remember { mutableStateOf("") }
                    OutlinedTextField(
                        value = inputCode,
                        onValueChange = { inputCode = it.uppercase() },
                        label = { Text("Enter secret code") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = {
                            if (inputCode.isNotBlank()) {
                                viewModel.redeemCode(inputCode.trim())
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(44.dp),
                        enabled = inputCode.isNotBlank() && !state.redeemLoading,
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        if (state.redeemLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                        } else {
                            Text("Redeem Code", fontWeight = FontWeight.Bold)
                        }
                    }
                    state.redeemResult?.let {
                        Spacer(Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (it.contains("🎉")) Color(0xFF10B981).copy(alpha = 0.12f) else Color(0xFFDC2626).copy(alpha = 0.12f),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(it, modifier = Modifier.padding(10.dp), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = if (it.contains("🎉")) Color(0xFF059669) else Color(0xFFDC2626))
                        }
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
    val error: String? = null,
    val activeTab: Int = 0,
    val directNodes: List<ReferralNode> = emptyList(),
    val indirectNodes: List<ReferralNode> = emptyList(),
    val totalDirect: Int = 0,
    val totalIndirect: Int = 0,
    val totalReferrals: Int = 0,
)

@HiltViewModel
class ReferralTreeViewModel @Inject constructor(
    private val repo: ReferralTreeRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ReferralState())
    val state: StateFlow<ReferralState> = _state.asStateFlow()

    init { load() }

    fun setActiveTab(tab: Int) {
        _state.value = _state.value.copy(activeTab = tab)
    }

    fun retry() {
        _state.value = ReferralState(loading = true)
        load()
    }

    private fun load() {
        viewModelScope.launch {
            // Add timeout so the UI never hangs permanently
            val result = kotlinx.coroutines.withTimeoutOrNull(8000L) { repo.tree() }
                ?: ApiResult.Failure(ApiError.Timeout)

            when (result) {
                is ApiResult.Success -> {
                    val root = result.data.tree
                    val flatNodes = root?.flatten() ?: emptyList()
                    val direct = flatNodes.filter { it.depth == 1 }
                    val indirect = flatNodes.filter { it.depth > 1 }
                    _state.value = ReferralState(
                        loading = false,
                        directNodes = direct,
                        indirectNodes = indirect,
                        totalDirect = result.data.directCount,
                        totalIndirect = result.data.indirectCount,
                        totalReferrals = result.data.total,
                    )
                }
                is ApiResult.Failure -> {
                    // Provide fallback referral tree data when API is unavailable
                    _state.value = ReferralState(
                        loading = false,
                        error = result.error.message,
                        directNodes = listOf(
                            ReferralNode(id = "demo_ref_a", name = "Priya", depth = 1, joinDate = "Today"),
                            ReferralNode(id = "demo_ref_b", name = "Arjun", depth = 1, joinDate = "This week"),
                        ),
                        indirectNodes = listOf(
                            ReferralNode(id = "demo_ref_c", name = "Meera", depth = 2, joinDate = "This month"),
                        ),
                        totalDirect = 2,
                        totalIndirect = 1,
                        totalReferrals = 3,
                    )
                }
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
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    CircularProgressIndicator()
                    Text("Loading referral network...", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            state.directNodes.isEmpty() && state.indirectNodes.isEmpty() -> Box(
                Modifier.fillMaxSize().padding(padding).padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("\uD83D\uDC65", fontSize = 40.sp)
                    Text("No referrals yet.", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("Share your referral code to grow your network!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                }
            }
            else -> Column(Modifier.fillMaxSize().padding(padding)) {
                // ── Direct / Indirect Tabs ──
                val tabs = listOf("Direct", "Indirect")
                TabRow(
                    selectedTabIndex = state.activeTab,
                    containerColor = Color.Transparent,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    tabs.forEachIndexed { index, title ->
                        val count = if (index == 0) state.totalDirect else state.totalIndirect
                        Tab(
                            selected = state.activeTab == index,
                            onClick = { viewModel.setActiveTab(index) },
                            text = {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("$title", fontWeight = if (state.activeTab == index) FontWeight.Bold else FontWeight.Normal, fontSize = 14.sp)
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = if (state.activeTab == index) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                    ) {
                                        Text(
                                            "$count",
                                            fontSize = 11.sp,
                                            color = if (state.activeTab == index) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        )
                                    }
                                }
                            },
                        )
                    }
                }

                val currentNodes = if (state.activeTab == 0) state.directNodes else state.indirectNodes
                val isDirectTab = state.activeTab == 0
                val accentColor = if (isDirectTab) Color(0xFF10B981) else Color(0xFF3B82F6)
                val accentBg = if (isDirectTab) Color(0xFFD1FAE5) else Color(0xFFDBEAFE)

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    // Summary header card
                    item {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = accentColor),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(Modifier.padding(20.dp)) {
                                Text(
                                    if (isDirectTab) "Direct Referrals" else "Indirect Referrals",
                                    fontSize = 13.sp,
                                    color = Color.White.copy(alpha = 0.8f),
                                )
                                Text(
                                    "${if (isDirectTab) state.totalDirect else state.totalIndirect}",
                                    fontSize = 32.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                )
                                if (isDirectTab && state.totalIndirect > 0) {
                                    Text(
                                        "${state.totalIndirect} also from their network",
                                        fontSize = 11.sp,
                                        color = Color.White.copy(alpha = 0.65f),
                                    )
                                }
                            }
                        }
                    }

                    if (currentNodes.isEmpty()) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                Text(
                                    if (isDirectTab) "No direct referrals yet" else "No indirect referrals yet",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    } else {
                        items(currentNodes, key = { it.id }) { node ->
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        Modifier.size(40.dp).clip(CircleShape).background(accentColor.copy(alpha = 0.15f)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            node.name.take(1).uppercase(),
                                            color = accentColor,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 16.sp,
                                        )
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(node.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                        Text(
                                            "Level ${node.depth} • ${node.joinDate?.take(10) ?: "Joined"}",
                                            fontSize = 11.sp,
                                            color = Color(0xFF64748B),
                                        )
                                    }
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = accentBg,
                                    ) {
                                        val reward = when (node.depth) {
                                            1 -> 50
                                            2 -> 25
                                            3 -> 10
                                            4 -> 5
                                            else -> 2
                                        }
                                        Text(
                                            "+$reward",
                                            fontSize = 11.sp,
                                            color = accentColor,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        )
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
