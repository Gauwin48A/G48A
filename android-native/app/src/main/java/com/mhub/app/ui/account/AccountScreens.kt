package com.mhub.app.ui.account

import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
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
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

private val bgGradient get() = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))

@Composable
private fun AccountTopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB))
        }
        Spacer(Modifier.width(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
    }
}

// ─── DashboardScreen ────────────────────────────────────────────────────────
data class DashboardUiState(val loading: Boolean = true, val error: String? = null, val stats: List<DashboardStat> = emptyList(), val activity: List<DashboardActivity> = emptyList(), val userName: String = "User", val selectedPeriod: Int = 2)

@HiltViewModel
class DashboardViewModel @Inject constructor(private val repo: DashboardRepository) : ViewModel() {
    private val _state = MutableStateFlow(DashboardUiState())
    val state: StateFlow<DashboardUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        when (val r = repo.get()) {
            is ApiResult.Success -> _state.value = _state.value.copy(loading = false, stats = r.data.quickStats, activity = r.data.recentActivity, userName = r.data.user?.displayName ?: "User")
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
        }
    } }
    fun selectPeriod(index: Int) { _state.value = _state.value.copy(selectedPeriod = index); load() }
}

private val periodLabels = listOf("Today", "This Week", "This Month", "All Time")

@Composable
fun DashboardScreen(onBack: () -> Unit, viewModel: DashboardViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val statMeta = listOf(Icons.AutoMirrored.Filled.List to Color(0xFF2563EB), Icons.Filled.ShoppingCart to Color(0xFF22C55E), Icons.Filled.Visibility to Color(0xFF8B5CF6), Icons.Filled.Stars to Color(0xFFF59E0B))
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            AccountTopBar("Dashboard", onBack)
            if (state.loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item {
                    Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFF2563EB), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(48.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                                Text(state.userName.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            }
                            Spacer(Modifier.width(14.dp))
                            Column {
                                Text("Welcome back,", color = Color(0xFFBFDBFE), fontSize = 13.sp)
                                Text(state.userName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            }
                        }
                    }
                }
                // Period selector
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        periodLabels.forEachIndexed { index, label ->
                            FilterChip(
                                selected = state.selectedPeriod == index,
                                onClick = { viewModel.selectPeriod(index) },
                                label = { Text(label, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Color(0xFF2563EB),
                                    selectedLabelColor = Color.White,
                                ),
                            )
                        }
                    }
                }
                item {
                    val statsToShow = if (state.stats.isNotEmpty()) state.stats.take(4) else listOf(DashboardStat(labelKey = "active_listings"), DashboardStat(labelKey = "total_sales"), DashboardStat(labelKey = "total_views"), DashboardStat(labelKey = "coins_earned"))
                    Text("Quick Stats", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                    Spacer(Modifier.height(10.dp))
                    for (i in statsToShow.indices step 2) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(bottom = 12.dp)) {
                            val m1 = statMeta.getOrElse(i) { Icons.Filled.Info to Color(0xFF64748B) }
                            StatCard(Modifier.weight(1f), "${statsToShow[i].value}", statsToShow[i].label ?: statsToShow[i].labelKey ?: "Stat", m1.second, m1.first)
                            if (i + 1 < statsToShow.size) {
                                val m2 = statMeta.getOrElse(i + 1) { Icons.Filled.Info to Color(0xFF64748B) }
                                StatCard(Modifier.weight(1f), "${statsToShow[i + 1].value}", statsToShow[i + 1].label ?: statsToShow[i + 1].labelKey ?: "Stat", m2.second, m2.first)
                            } else Spacer(Modifier.weight(1f))
                        }
                    }
                }
                if (state.activity.isNotEmpty()) {
                    item { Text("Recent Activity", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B)) }
                    items(state.activity.take(10), key = { it.id ?: it.createdAt ?: "" }) { a ->
                        Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFEFF6FF)), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Filled.Notifications, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(a.title ?: "Activity", fontWeight = FontWeight.Medium, fontSize = 13.sp, color = Color(0xFF1E293B), maxLines = 1)
                                    if (a.createdAt != null) Text(a.createdAt.take(10), fontSize = 11.sp, color = Color(0xFF94A3B8))
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
private fun StatCard(modifier: Modifier, value: String, label: String, color: Color, icon: ImageVector) {
    val targetValue = value.toIntOrNull() ?: 0
    val animatedValue by animateIntAsState(targetValue = targetValue, animationSpec = tween(durationMillis = 800), label = "stat_anim")
    Surface(modifier = modifier, shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp) {
        Column(Modifier.padding(16.dp)) {
            Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(color.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text(if (targetValue > 0) "$animatedValue" else value, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF1E293B))
            Text(label.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 12.sp, color = Color(0xFF64748B), maxLines = 1)
        }
    }
}

// ─── SecurityScreen ──────────────────────────────────────────────────────────
data class SecurityUiState(
    val loading: Boolean = true,
    val sessions: List<UserSession> = emptyList(),
    val twoFaEnabled: Boolean = false,
    val error: String? = null,
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val changingPassword: Boolean = false,
    val passwordChanged: Boolean = false,
    val passwordError: String? = null,
    val twoFaCode: String = "",
    val twoFaQr: String? = null,
    val twoFaBackupCodes: List<String> = emptyList(),
    val settingUp2fa: Boolean = false,
)

@HiltViewModel
class SecurityViewModel @Inject constructor(private val repo: SecurityRepository) : ViewModel() {
    private val _state = MutableStateFlow(SecurityUiState())
    val state: StateFlow<SecurityUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true)
        val sessions = repo.sessions()
        val twoFa = repo.twoFaStatus()
        _state.value = _state.value.copy(loading = false, sessions = (sessions as? ApiResult.Success)?.data ?: emptyList(), twoFaEnabled = (twoFa as? ApiResult.Success)?.data?.enabled ?: false)
    } }
    fun revokeSession(id: String) { viewModelScope.launch { repo.revokeSession(id); load() } }
    fun revokeAll() { viewModelScope.launch { repo.revokeAll(); load() } }
    fun setCurrentPassword(v: String) { _state.value = _state.value.copy(currentPassword = v) }
    fun setNewPassword(v: String) { _state.value = _state.value.copy(newPassword = v) }
    fun setConfirmPassword(v: String) { _state.value = _state.value.copy(confirmPassword = v) }
    fun changePassword() {
        val s = _state.value
        if (s.currentPassword.isBlank()) { _state.value = s.copy(passwordError = "Current password required"); return }
        if (s.newPassword.length < 12) { _state.value = s.copy(passwordError = "Min 12 characters"); return }
        if (s.newPassword != s.confirmPassword) { _state.value = s.copy(passwordError = "Passwords don't match"); return }
        _state.value = s.copy(changingPassword = true, passwordError = null)
        viewModelScope.launch {
            when (repo.changePassword(s.currentPassword, s.newPassword)) {
                is ApiResult.Success -> _state.value = _state.value.copy(changingPassword = false, passwordChanged = true, currentPassword = "", newPassword = "", confirmPassword = "")
                is ApiResult.Failure -> _state.value = _state.value.copy(changingPassword = false, passwordError = "Failed to change password")
            }
        }
    }
    fun setTwoFaCode(v: String) { _state.value = _state.value.copy(twoFaCode = v) }
    fun setup2fa() { viewModelScope.launch {
        _state.value = _state.value.copy(settingUp2fa = true)
        when (val r = repo.twoFaSetup()) {
            is ApiResult.Success -> _state.value = _state.value.copy(settingUp2fa = false, twoFaQr = r.data.qrCode)
            is ApiResult.Failure -> _state.value = _state.value.copy(settingUp2fa = false, error = "2FA setup failed")
        }
    } }
    fun verify2fa() { viewModelScope.launch {
        val code = _state.value.twoFaCode
        if (code.length != 6) return@launch
        when (val r = repo.twoFaVerify(code)) {
            is ApiResult.Success -> _state.value = _state.value.copy(twoFaEnabled = true, twoFaBackupCodes = r.data.backupCodes, twoFaCode = "", twoFaQr = null)
            is ApiResult.Failure -> _state.value = _state.value.copy(error = "Invalid code")
        }
    } }
    fun disable2fa() { viewModelScope.launch {
        val code = _state.value.twoFaCode
        if (code.length != 6) return@launch
        when (repo.twoFaDisable(code)) {
            is ApiResult.Success -> _state.value = _state.value.copy(twoFaEnabled = false, twoFaCode = "")
            is ApiResult.Failure -> _state.value = _state.value.copy(error = "Invalid code")
        }
    } }
}

@Composable
fun SecurityScreen(onBack: () -> Unit, viewModel: SecurityViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            AccountTopBar("Security Settings", onBack)
            if (state.loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                // Password change section
                item {
                    Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text("Change Password", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                            Spacer(Modifier.height(12.dp))
                            if (state.passwordChanged) {
                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7), modifier = Modifier.fillMaxWidth()) {
                                    Text("Password changed successfully!", color = Color(0xFF22C55E), fontSize = 13.sp, modifier = Modifier.padding(12.dp))
                                }
                            } else {
                                state.passwordError?.let { Text(it, color = Color(0xFFDC2626), fontSize = 12.sp) }
                                Spacer(Modifier.height(4.dp))
                                SecureField("Current Password", state.currentPassword, viewModel::setCurrentPassword)
                                Spacer(Modifier.height(8.dp))
                                SecureField("New Password (12+ chars)", state.newPassword, viewModel::setNewPassword)
                                // Strength indicator
                                val strength = when {
                                    state.newPassword.length >= 16 && state.newPassword.any { it.isDigit() } && state.newPassword.any { !it.isLetterOrDigit() } -> "Strong" to Color(0xFF22C55E)
                                    state.newPassword.length >= 12 -> "Medium" to Color(0xFFF59E0B)
                                    state.newPassword.isNotEmpty() -> "Weak" to Color(0xFFEF4444)
                                    else -> null
                                }
                                strength?.let { (label, color) ->
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                                        Box(Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(color.copy(alpha = 0.3f))) {
                                            Box(Modifier.fillMaxHeight().fillMaxWidth(when(label) { "Strong" -> 1f; "Medium" -> 0.66f; else -> 0.33f }).clip(RoundedCornerShape(2.dp)).background(color))
                                        }
                                        Spacer(Modifier.width(8.dp))
                                        Text(label, fontSize = 11.sp, color = color, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                                Spacer(Modifier.height(8.dp))
                                SecureField("Confirm Password", state.confirmPassword, viewModel::setConfirmPassword)
                                Spacer(Modifier.height(12.dp))
                                Button(onClick = { viewModel.changePassword() }, enabled = !state.changingPassword,
                                    shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                    modifier = Modifier.fillMaxWidth().height(44.dp)) {
                                    Text(if (state.changingPassword) "Changing…" else "Change Password", fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                }
                // 2FA section
                item {
                    Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Security, null, tint = Color(0xFF2563EB), modifier = Modifier.size(22.dp))
                                Spacer(Modifier.width(10.dp))
                                Text("Two-Factor Authentication", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))
                                Surface(shape = RoundedCornerShape(12.dp), color = if (state.twoFaEnabled) Color(0xFFDCFCE7) else Color(0xFFFEE2E2)) {
                                    Text(if (state.twoFaEnabled) "Enabled" else "Disabled", fontSize = 11.sp,
                                        color = if (state.twoFaEnabled) Color(0xFF22C55E) else Color(0xFFEF4444),
                                        fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            if (state.twoFaQr != null) {
                                Text("Scan this QR code with your authenticator app:", fontSize = 12.sp, color = Color(0xFF64748B))
                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                                    Text(state.twoFaQr ?: "", fontSize = 11.sp, color = Color(0xFF374151), modifier = Modifier.padding(12.dp))
                                }
                            }
                            if (state.twoFaBackupCodes.isNotEmpty()) {
                                Text("Backup Codes (save these!):", fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFFEF4444))
                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFFFF7ED), modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                                    Text(state.twoFaBackupCodes.joinToString("\n"), fontSize = 12.sp, color = Color(0xFF374151), modifier = Modifier.padding(12.dp))
                                }
                            }
                            if (!state.twoFaEnabled) {
                                if (state.twoFaQr == null) {
                                    Button(onClick = { viewModel.setup2fa() }, enabled = !state.settingUp2fa,
                                        shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                        modifier = Modifier.fillMaxWidth().height(40.dp)) {
                                        Text(if (state.settingUp2fa) "Setting up…" else "Enable 2FA", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                    }
                                } else {
                                    OutlinedTextField(value = state.twoFaCode, onValueChange = viewModel::setTwoFaCode,
                                        placeholder = { Text("Enter 6-digit code") }, singleLine = true,
                                        shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth(),
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                                    Spacer(Modifier.height(8.dp))
                                    Button(onClick = { viewModel.verify2fa() }, shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                                        modifier = Modifier.fillMaxWidth().height(40.dp)) { Text("Verify & Enable", fontWeight = FontWeight.SemiBold, fontSize = 13.sp) }
                                }
                            } else {
                                OutlinedTextField(value = state.twoFaCode, onValueChange = viewModel::setTwoFaCode,
                                    placeholder = { Text("Enter code to disable") }, singleLine = true,
                                    shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                                Spacer(Modifier.height(8.dp))
                                OutlinedButton(onClick = { viewModel.disable2fa() }, shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                                    modifier = Modifier.fillMaxWidth().height(40.dp)) { Text("Disable 2FA", fontWeight = FontWeight.SemiBold, fontSize = 13.sp) }
                            }
                        }
                    }
                }
                // Active sessions
                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text("Active Sessions (${state.sessions.size})", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                        Spacer(Modifier.weight(1f))
                        if (state.sessions.size > 1) TextButton(onClick = { viewModel.revokeAll() }) { Text("Revoke All", color = Color(0xFFDC2626), fontSize = 12.sp) }
                    }
                }
                if (state.sessions.isEmpty()) item { Text("No active sessions.", fontSize = 13.sp, color = Color(0xFF64748B)) }
                items(state.sessions, key = { it.stableId }) { session ->
                    Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.DeviceHub, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(session.displayDevice, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B), maxLines = 1)
                                    Text("IP: ${session.maskedIp}", fontSize = 11.sp, color = Color(0xFF94A3B8))
                                    if (session.userAgent != null) Text(session.userAgent.take(50), fontSize = 10.sp, color = Color(0xFFBFDBFE), maxLines = 1)
                                }
                                OutlinedButton(onClick = { session.sessionId?.let { viewModel.revokeSession(it) } }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp), modifier = Modifier.height(30.dp)) { Text("Revoke", fontSize = 11.sp) }
                            }
                            if (session.lastActivity != null) { Spacer(Modifier.height(4.dp)); Text("Last active: ${session.lastActivity.take(16).replace("T", " ")}", fontSize = 11.sp, color = Color(0xFF94A3B8)) }
                            if (session.createdAt != null) Text("Created: ${session.createdAt.take(10)}", fontSize = 10.sp, color = Color(0xFFBFDBFE))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SecureField(label: String, value: String, onValueChange: (String) -> Unit) {
    Column {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF374151))
        Spacer(Modifier.height(2.dp))
        OutlinedTextField(value = value, onValueChange = onValueChange, singleLine = true,
            visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
            shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
    }
}

// ─── AccountDeleteScreen ─────────────────────────────────────────────────────
data class DeleteAccountUiState(val loading: Boolean = false, val error: String? = null, val confirmed: Boolean = false, val reason: String = "")

@HiltViewModel
class DeleteAccountViewModel @Inject constructor(private val repo: AccountRepository) : ViewModel() {
    private val _state = MutableStateFlow(DeleteAccountUiState())
    val state: StateFlow<DeleteAccountUiState> = _state.asStateFlow()
    fun setReason(v: String) { _state.value = _state.value.copy(reason = v) }
    fun confirm() { _state.value = _state.value.copy(confirmed = true) }
    fun cancel() { _state.value = _state.value.copy(confirmed = false) }
    fun delete(onDeleted: () -> Unit) {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.deleteAccount(_state.value.reason.ifBlank { null })) {
                is ApiResult.Success -> onDeleted()
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, confirmed = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun AccountDeleteScreen(onBack: () -> Unit, viewModel: DeleteAccountViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            AccountTopBar("Delete Account", onBack)
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFFFFF7ED), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                        Icon(Icons.Filled.Warning, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("This action is permanent", fontWeight = FontWeight.SemiBold, color = Color(0xFF92400E))
                            Spacer(Modifier.height(4.dp))
                            Text("Deleting your account will remove all your data, listings, messages, and history. This cannot be undone.", fontSize = 13.sp, color = Color(0xFFB45309))
                        }
                    }
                }
                Column {
                    Text("Reason (optional)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Spacer(Modifier.height(4.dp))
                    OutlinedTextField(value = state.reason, onValueChange = viewModel::setReason, placeholder = { Text("Why are you deleting?", color = Color(0xFF94A3B8)) }, shape = RoundedCornerShape(12.dp), maxLines = 3, minLines = 2, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White), modifier = Modifier.fillMaxWidth())
                }
                state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                if (!state.confirmed) {
                    Button(onClick = { viewModel.confirm() }, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)), modifier = Modifier.fillMaxWidth().height(50.dp)) {
                        Icon(Icons.Filled.Delete, null, tint = Color.White, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Delete My Account", fontWeight = FontWeight.SemiBold)
                    }
                } else {
                    Text("Are you absolutely sure? This cannot be undone.", fontWeight = FontWeight.SemiBold, color = Color(0xFFDC2626))
                    Spacer(Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(onClick = { viewModel.cancel() }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) { Text("Cancel") }
                        Button(onClick = { viewModel.delete(onBack) }, enabled = !state.loading, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))) { Text(if (state.loading) "Deleting…" else "Yes, Delete", fontWeight = FontWeight.SemiBold) }
                    }
                }
            }
        }
    }
}

// ─── VerificationScreen ──────────────────────────────────────────────────────
data class VerificationUiState(val loading: Boolean = true, val status: String? = null, val submitting: Boolean = false, val error: String? = null, val docType: String = "aadhaar", val docNumber: String = "")

@HiltViewModel
class VerificationViewModel @Inject constructor(private val repo: AccountRepository) : ViewModel() {
    private val _state = MutableStateFlow(VerificationUiState())
    val state: StateFlow<VerificationUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        when (val r = repo.verificationStatus()) {
            is ApiResult.Success -> _state.value = VerificationUiState(loading = false, status = r.data.status)
            is ApiResult.Failure -> _state.value = VerificationUiState(loading = false)
        }
    } }
    fun setDocType(v: String) { _state.value = _state.value.copy(docType = v) }
    fun setDocNumber(v: String) { _state.value = _state.value.copy(docNumber = v) }
    fun submit() {
        val s = _state.value
        if (s.docNumber.isBlank()) { _state.value = s.copy(error = "Document number required"); return }
        _state.value = s.copy(submitting = true, error = null)
        viewModelScope.launch {
            when (val r = repo.requestVerification(VerificationRequest(docType = s.docType, docNumber = s.docNumber))) {
                is ApiResult.Success -> _state.value = VerificationUiState(loading = false, status = "pending")
                is ApiResult.Failure -> _state.value = s.copy(submitting = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun VerificationScreen(onBack: () -> Unit, viewModel: VerificationViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            AccountTopBar("Get Verified", onBack)
            if (state.loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            else when (state.status) {
                "verified" -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Box(Modifier.size(80.dp).clip(CircleShape).background(Color(0xFF22C55E)), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Verified, null, tint = Color.White, modifier = Modifier.size(44.dp)) }
                        Spacer(Modifier.height(20.dp))
                        Text("Account Verified!", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF166534))
                        Spacer(Modifier.height(8.dp))
                        Text("Your account has been verified. You can now access all features.", fontSize = 14.sp, color = Color(0xFF64748B))
                    }
                }
                "pending" -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.HourglassTop, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("Verification Pending", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))
                        Spacer(Modifier.height(8.dp))
                        Text("We're reviewing your documents. This usually takes 1-2 business days.", fontSize = 14.sp, color = Color(0xFF64748B))
                    }
                }
                else -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("Submit documents to verify your identity and unlock seller features.", fontSize = 14.sp, color = Color(0xFF64748B))
                    state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                    Text("Document Type", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("aadhaar" to "Aadhaar", "pan" to "PAN", "passport" to "Passport").forEach { (key, label) ->
                            FilterChip(selected = state.docType == key, onClick = { viewModel.setDocType(key) }, label = { Text(label, fontSize = 12.sp) })
                        }
                    }
                    Column {
                        Text("Document Number", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                        Spacer(Modifier.height(4.dp))
                        OutlinedTextField(value = state.docNumber, onValueChange = viewModel::setDocNumber, placeholder = { Text("Enter document number", color = Color(0xFF94A3B8)) }, shape = RoundedCornerShape(12.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White), modifier = Modifier.fillMaxWidth())
                    }
                    Button(onClick = { viewModel.submit() }, enabled = !state.submitting, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)), modifier = Modifier.fillMaxWidth().height(50.dp)) { Text(if (state.submitting) "Submitting…" else "Submit for Verification", fontWeight = FontWeight.SemiBold) }
                }
            }
        }
    }
}

// ─── AnalyticsScreen ─────────────────────────────────────────────────────────
data class AnalyticsUiState(
    val loading: Boolean = true,
    val data: AnalyticsResponse? = null,
    val sellerStats: SellerAnalyticsResponse? = null,
    val postAnalytics: List<PostAnalytic> = emptyList(),
    val categoryAnalytics: List<CategoryAnalytic> = emptyList(),
    val error: String? = null,
    val timeRange: String = "30d",
)

@HiltViewModel
class AnalyticsViewModel @Inject constructor(private val repo: AnalyticsRepository) : ViewModel() {
    private val _state = MutableStateFlow(AnalyticsUiState())
    val state: StateFlow<AnalyticsUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true)
        val range = _state.value.timeRange
        when (val r = repo.get()) {
            is ApiResult.Success -> _state.value = _state.value.copy(data = r.data)
            is ApiResult.Failure -> {}
        }
        when (val r = repo.sellerStats(range)) {
            is ApiResult.Success -> _state.value = _state.value.copy(sellerStats = r.data)
            is ApiResult.Failure -> {}
        }
        when (val r = repo.postAnalytics(range)) {
            is ApiResult.Success -> _state.value = _state.value.copy(postAnalytics = r.data)
            is ApiResult.Failure -> {}
        }
        when (val r = repo.categoryAnalytics(range)) {
            is ApiResult.Success -> _state.value = _state.value.copy(categoryAnalytics = r.data)
            is ApiResult.Failure -> {}
        }
        _state.value = _state.value.copy(loading = false)
    } }
    fun setTimeRange(r: String) { _state.value = _state.value.copy(timeRange = r); load() }
}

@Composable
fun AnalyticsScreen(onBack: () -> Unit, viewModel: AnalyticsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val ss = state.sellerStats
    val d = state.data
    val timeRanges = listOf("7d" to "7 Days", "30d" to "30 Days", "90d" to "90 Days", "all" to "All Time")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            AccountTopBar("Analytics", onBack)
            // Time range filter
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                timeRanges.forEach { (key, label) ->
                    FilterChip(selected = state.timeRange == key, onClick = { viewModel.setTimeRange(key) },
                        label = { Text(label, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                }
            }
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    // Overview stats (4-card grid)
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            AStatCard(Modifier.weight(1f), "${ss?.totalViews ?: d?.postViews ?: 0}", "Total Views", Icons.Filled.Visibility, Color(0xFF8B5CF6))
                            AStatCard(Modifier.weight(1f), "${ss?.totalInquiries ?: d?.profileVisits ?: 0}", "Inquiries", Icons.Filled.QuestionAnswer, Color(0xFF2563EB))
                        }
                    }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            AStatCard(Modifier.weight(1f), "${ss?.soldPosts ?: d?.totalSales ?: 0}", "Sold Posts", Icons.Filled.ShoppingCart, Color(0xFF22C55E))
                            AStatCard(Modifier.weight(1f), "${ss?.activePosts ?: d?.totalListings ?: 0}", "Active Posts", Icons.AutoMirrored.Filled.List, Color(0xFFF59E0B))
                        }
                    }
                    // Revenue + conversion
                    item {
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp)) {
                                Text("Revenue", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                                Spacer(Modifier.height(8.dp))
                                Text("₹${(ss?.totalRevenue ?: d?.totalRevenue ?: 0.0).toLong()}", fontWeight = FontWeight.Bold, fontSize = 28.sp, color = Color(0xFF22C55E))
                                Spacer(Modifier.height(8.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    Column {
                                        Text("Conversion", fontSize = 11.sp, color = Color(0xFF64748B))
                                        Text("${String.format("%.1f", (ss?.conversionRate ?: d?.conversionRate ?: 0f) * 100)}%", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF2563EB))
                                    }
                                    Column {
                                        Text("Avg Rating", fontSize = 11.sp, color = Color(0xFF64748B))
                                        Text("${String.format("%.1f", ss?.avgRating ?: 0f)} ★", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFFF59E0B))
                                    }
                                    Column {
                                        Text("Reviews", fontSize = 11.sp, color = Color(0xFF64748B))
                                        Text("${ss?.totalReviews ?: 0}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF374151))
                                    }
                                }
                                // Simple bar chart
                                Spacer(Modifier.height(12.dp))
                                Text("Performance Overview", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF64748B))
                                Spacer(Modifier.height(8.dp))
                                val maxVal = maxOf(ss?.totalViews ?: 1, ss?.totalInquiries ?: 1, ss?.soldPosts ?: 1, 1).toFloat()
                                listOf("Views" to (ss?.totalViews ?: d?.postViews ?: 0) to Color(0xFF8B5CF6),
                                    "Inquiries" to (ss?.totalInquiries ?: 0) to Color(0xFF2563EB),
                                    "Sales" to (ss?.soldPosts ?: d?.totalSales ?: 0) to Color(0xFF22C55E)).forEach { (pair, color) ->
                                    val (label, value) = pair
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 3.dp)) {
                                        Text(label, fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.width(64.dp))
                                        Box(Modifier.weight(1f).height(16.dp).clip(RoundedCornerShape(4.dp)).background(Color(0xFFF1F5F9))) {
                                            Box(Modifier.fillMaxHeight().fillMaxWidth((value / maxVal).coerceIn(0f, 1f)).clip(RoundedCornerShape(4.dp)).background(color))
                                        }
                                        Text("$value", fontSize = 11.sp, color = Color(0xFF374151), modifier = Modifier.width(40.dp).padding(start = 6.dp))
                                    }
                                }
                            }
                        }
                    }
                    // Post analytics
                    if (state.postAnalytics.isNotEmpty()) {
                        item { Text("Post Performance", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B)) }
                        items(state.postAnalytics.take(10), key = { it.postId ?: it.title ?: "" }) { pa ->
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.AutoMirrored.Filled.TrendingUp, null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(pa.title ?: "Post", fontWeight = FontWeight.Medium, fontSize = 13.sp, color = Color(0xFF1E293B), maxLines = 1)
                                        Text("${pa.views} views · ${pa.inquiries} inquiries · ${pa.offers} offers", fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
                                }
                            }
                        }
                    }
                    // Category analytics
                    if (state.categoryAnalytics.isNotEmpty()) {
                        item { Text("Category Breakdown", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B)) }
                        items(state.categoryAnalytics, key = { it.category ?: "" }) { ca ->
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text(ca.category ?: "Category", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                        Text("${ca.listings} listings · ${ca.views} views · ${ca.sales} sales", fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
                                }
                            }
                        }
                    }
                    if (d != null && d.topPerforming.isNotEmpty()) {
                        item { Text("Top Performing Listings", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B)) }
                        items(d.topPerforming.take(5)) { post ->
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.AutoMirrored.Filled.TrendingUp, null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(post.displayTitle, fontWeight = FontWeight.Medium, fontSize = 13.sp, color = Color(0xFF1E293B), maxLines = 1)
                                        if (post.viewCount != null) Text("${post.viewCount} views", fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
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
private fun AStatCard(modifier: Modifier, value: String, label: String, icon: ImageVector, color: Color) {
    Surface(modifier = modifier, shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp) {
        Column(Modifier.padding(16.dp)) {
            Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(color.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) { Icon(icon, null, tint = color, modifier = Modifier.size(18.dp)) }
            Spacer(Modifier.height(10.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF1E293B))
            Text(label, fontSize = 12.sp, color = Color(0xFF64748B))
        }
    }
}

