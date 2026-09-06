package com.zaruda.app.ui.rewards

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.drawText
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
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar
import javax.inject.Inject

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

/* ── Layer 1: Ambient Atmospheric Canvas Backdrop ─────────────────────────── */

@Composable
private fun RewardsBackdrop(
    isDark: Boolean,
    primaryAura: Color = Color(0xFFF59E0B),
    secondaryAura: Color = Color(0xFF10B981),
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(230.dp)
            .background(
                Brush.verticalGradient(
                    colors = if (isDark) {
                        listOf(Color(0xFF0F172A), Color(0xFF281C08), Color(0xFF0F172A))
                    } else {
                        listOf(Color(0xFFFFFBEB), Color(0xFFFEF3C7), Color(0xFFF8FAFC))
                    }
                )
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val canvasWidth = size.width
            val canvasHeight = size.height

            // Aura 1 - Top Left Gold
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        primaryAura.copy(alpha = if (isDark) 0.32f else 0.42f),
                        Color.Transparent,
                    ),
                    center = Offset(canvasWidth * 0.20f, canvasHeight * 0.25f),
                    radius = canvasWidth * 0.60f,
                )
            )

            // Aura 2 - Top Right Emerald
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        secondaryAura.copy(alpha = if (isDark) 0.22f else 0.30f),
                        Color.Transparent,
                    ),
                    center = Offset(canvasWidth * 0.85f, canvasHeight * 0.35f),
                    radius = canvasWidth * 0.50f,
                )
            )
        }

        // Dark top vignette scrim
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(90.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.45f),
                            Color.Transparent,
                        )
                    )
                )
        )

        // Ambient bottom gradient scrim
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            if (isDark) Color(0xFF0F172A).copy(alpha = 0.80f) else Color(0xFFF8FAFC).copy(alpha = 0.85f),
                        )
                    )
                )
        )
    }
}

/* ── Layer 2: Pinned Floating Glassmorphic Top Bar ────────────────────────── */

@Composable
private fun RewardsGlassTopBar(
    title: String,
    badgeText: String,
    isDark: Boolean,
    onBack: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = if (isDark) Color.Black.copy(alpha = 0.65f) else Color.White.copy(alpha = 0.88f),
            border = BorderStroke(1.dp, if (isDark) Color.White.copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.08f)),
            shadowElevation = 6.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(36.dp),
                        onClick = onBack,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }

                    Text(
                        text = title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFF59E0B).copy(alpha = 0.14f),
                    border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f)),
                ) {
                    Text(
                        text = badgeText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFD97706),
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Code Screen
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun DailyCodeScreen(onBack: () -> Unit, viewModel: DailyCodeViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val isDark = ColorTokens.isDark

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // Layer 1: Ambient Backdrop
        RewardsBackdrop(isDark = isDark, primaryAura = Color(0xFFF59E0B))

        // Layer 3: 32dp Curved Content Sheet
        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Tactile Drag Handle
                    Box(
                        modifier = Modifier
                            .padding(top = 12.dp, bottom = 12.dp)
                            .width(44.dp)
                            .height(4.5.dp)
                            .clip(RoundedCornerShape(2.5.dp))
                            .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f)),
                    )

                    if (state.loading) {
                        Box(Modifier.fillMaxWidth().height(300.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else if (state.code != null) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                        ) {
                            Text(
                                "Today's Zaruda Drop",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.height(12.dp))

                            // Golden Code Card
                            Surface(
                                shape = RoundedCornerShape(20.dp),
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
                                        fontSize = 34.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White,
                                        letterSpacing = 4.sp,
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    state.reward?.let {
                                        Surface(
                                            shape = RoundedCornerShape(10.dp),
                                            color = Color.White.copy(alpha = 0.2f),
                                        ) {
                                            Text(
                                                "🪙 +$it Zaruda Coins",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = Color.White,
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(Modifier.height(16.dp))

                            // Action buttons (Copy / Share)
                            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                Button(
                                    onClick = {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        clipboardManager.setText(AnnotatedString(state.code.orEmpty()))
                                        Toast.makeText(context, "Code copied to clipboard!", Toast.LENGTH_SHORT).show()
                                    },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                ) {
                                    Icon(Icons.Default.ContentCopy, "Copy", modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Copy Code")
                                }

                                OutlinedButton(
                                    onClick = {
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        val sendIntent = android.content.Intent().apply {
                                            action = android.content.Intent.ACTION_SEND
                                            putExtra(android.content.Intent.EXTRA_TEXT, "Use my Zaruda daily code: ${state.code} to get +15 bonus coins!")
                                            type = "text/plain"
                                        }
                                        context.startActivity(android.content.Intent.createChooser(sendIntent, "Share daily code"))
                                    },
                                    shape = RoundedCornerShape(12.dp),
                                ) {
                                    Icon(Icons.Default.Share, "Share", modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Share")
                                }
                            }

                            Spacer(Modifier.height(12.dp))
                            state.expiresAt?.let {
                                Text("Expires today at midnight", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }

                            Spacer(Modifier.height(24.dp))
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                            Spacer(Modifier.height(20.dp))

                            // Redeem Box
                            Text(
                                "Have a Promo or Referral Code?",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Spacer(Modifier.height(8.dp))

                            var inputCode by remember { mutableStateOf("") }
                            OutlinedTextField(
                                value = inputCode,
                                onValueChange = { inputCode = it.uppercase() },
                                label = { Text("Enter secret promo code") },
                                singleLine = true,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Spacer(Modifier.height(10.dp))
                            Button(
                                onClick = {
                                    if (inputCode.isNotBlank()) {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        viewModel.redeemCode(inputCode.trim())
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                enabled = inputCode.isNotBlank() && !state.redeemLoading,
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                            ) {
                                if (state.redeemLoading) {
                                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                                } else {
                                    Text("Redeem Reward", fontWeight = FontWeight.Bold)
                                }
                            }

                            state.redeemResult?.let { resultMsg ->
                                Spacer(Modifier.height(12.dp))
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color(0xFF059669).copy(alpha = 0.12f),
                                    border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.35f)),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text(
                                        resultMsg,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF059669),
                                        modifier = Modifier.padding(12.dp),
                                    )
                                }
                            }

                            Spacer(Modifier.height(40.dp))
                        }
                    }
                }
            }
        }

        // Layer 2: Floating Glass Top Bar
        RewardsGlassTopBar(
            title = "Daily Drops",
            badgeText = "🪙 +15 Coins",
            isDark = isDark,
            onBack = onBack,
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Referral Tree Screen
// ─────────────────────────────────────────────────────────────────────────────

data class ReferralState(
    val loading: Boolean = true,
    val directNodes: List<ReferralNode> = emptyList(),
    val indirectNodes: List<ReferralNode> = emptyList(),
    val totalDirect: Int = 0,
    val totalIndirect: Int = 0,
    val totalReferrals: Int = 0,
    val error: String? = null,
)

@HiltViewModel
class ReferralTreeViewModel @Inject constructor(
    private val repo: ReferralTreeRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ReferralState())
    val state: StateFlow<ReferralState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
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
                    // Never fabricate people — show the real error with a retry.
                    _state.value = ReferralState(
                        loading = false,
                        error = result.error.message,
                    )
                }
            }
        }
    }
}

@Composable
fun ReferralTreeScreen(onBack: () -> Unit, viewModel: ReferralTreeViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDark

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // Layer 1: Ambient Canvas Backdrop
        RewardsBackdrop(isDark = isDark, primaryAura = Color(0xFF2563EB), secondaryAura = Color(0xFF059669))

        // Layer 3: 32dp Curved Content Sheet
        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Tactile Drag Handle
                    Box(
                        modifier = Modifier
                            .padding(top = 12.dp, bottom = 10.dp)
                            .width(44.dp)
                            .height(4.5.dp)
                            .clip(RoundedCornerShape(2.5.dp))
                            .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
                            .align(Alignment.CenterHorizontally),
                    )

                    when {
                        state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                CircularProgressIndicator()
                                Text("Loading your network...", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        state.error != null -> Box(
                            Modifier.fillMaxSize().padding(32.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text("📡", fontSize = 40.sp)
                                Text("Couldn't load your network", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "Check your connection and try again.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                )
                                Button(onClick = { viewModel.load() }, shape = RoundedCornerShape(12.dp)) {
                                    Text("Retry", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                        state.directNodes.isEmpty() && state.indirectNodes.isEmpty() -> Box(
                            Modifier.fillMaxSize().padding(32.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("👥", fontSize = 44.sp)
                                Text("No referrals yet.", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                Text("Invite friends with your code — you earn cash + coins when they join and complete their first deal.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                            }
                        }
                        else -> Column(Modifier.fillMaxSize()) {
                            // Summary Header Card
                            Surface(
                                shape = RoundedCornerShape(18.dp),
                                color = if (isDark) Color(0xFF1E293B) else Color(0xFF2563EB),
                                border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color.Transparent),
                                shadowElevation = 4.dp,
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                            ) {
                                Row(
                                    modifier = Modifier.padding(18.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Column {
                                        Text("Your Network", fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
                                        Text("${state.totalReferrals} Members", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        Text("${state.totalDirect} invited by you • ${state.totalIndirect} friends of friends", fontSize = 11.sp, color = Color.White.copy(alpha = 0.7f))
                                    }
                                    Surface(
                                        shape = CircleShape,
                                        color = Color.White.copy(alpha = 0.2f),
                                        modifier = Modifier.size(44.dp),
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(Icons.Filled.People, null, tint = Color.White, modifier = Modifier.size(24.dp))
                                        }
                                    }
                                }
                            }

                            // Member list — plain-language, scannable, no abstract graph
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                if (state.directNodes.isNotEmpty()) {
                                    item {
                                        Text(
                                            "INVITED BY YOU",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontWeight = FontWeight.Bold,
                                            letterSpacing = 1.2.sp,
                                            modifier = Modifier.padding(top = 4.dp),
                                        )
                                    }
                                    items(state.directNodes, key = { it.id }) { node ->
                                        NetworkMemberRow(name = node.name, joinDate = node.joinDate, invitedByYou = true, isDark = isDark)
                                    }
                                }
                                if (state.indirectNodes.isNotEmpty()) {
                                    item {
                                        Text(
                                            "FRIENDS OF YOUR FRIENDS",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontWeight = FontWeight.Bold,
                                            letterSpacing = 1.2.sp,
                                            modifier = Modifier.padding(top = 6.dp),
                                        )
                                    }
                                    items(state.indirectNodes, key = { it.id }) { node ->
                                        NetworkMemberRow(name = node.name, joinDate = node.joinDate, invitedByYou = false, isDark = isDark)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Layer 2: Pinned Floating Glass Top Bar
        RewardsGlassTopBar(
            title = "My Network",
            badgeText = "👥 Invite & Earn",
            isDark = isDark,
            onBack = onBack,
        )
    }
}

@Composable
private fun NetworkMemberRow(
    name: String,
    joinDate: String?,
    invitedByYou: Boolean,
    isDark: Boolean,
) {
    val accent = if (invitedByYou) Color(0xFF2563EB) else Color(0xFF10B981)
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        border = BorderStroke(1.dp, accent.copy(alpha = 0.25f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(accent.copy(alpha = 0.15f)),
            ) {
                Text(
                    name.firstOrNull()?.uppercase() ?: "?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = accent,
                )
            }
            Column(Modifier.weight(1f)) {
                Text(name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = if (isDark) Color(0xFFF1F5F9) else Color(0xFF0F172A))
                Text(
                    listOfNotNull(
                        if (invitedByYou) "Joined from your invite" else "Joined from a friend's invite",
                        joinDate?.takeIf { it.isNotBlank() },
                    ).joinToString(" • "),
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
