package com.mhub.feature.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Computer
import androidx.compose.material.icons.filled.Devices
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.AuthRepository
import com.mhub.core.network.model.SessionInfo
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SecurityUiState(
    val sessions: List<SessionInfo> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val revokeInProgress: String? = null,
)

@Composable
fun SecuritySettingsScreen(
    onNavigateBack: () -> Unit,
    viewModel: SecuritySettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var showRevokeAllDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Security & Sessions") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    if (uiState.sessions.size > 1) {
                        TextButton(onClick = { showRevokeAllDialog = true }) {
                            Text("Revoke All")
                        }
                    }
                },
            )
        },
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            uiState.error != null -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(uiState.error!!, color = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = viewModel::refresh) { Text("Retry") }
                    }
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    item {
                        Text(
                            "Active Sessions",
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(bottom = 8.dp),
                        )
                        Text(
                            "These are the devices currently logged into your account.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(bottom = 16.dp),
                        )
                    }
                    items(uiState.sessions, key = { it.id }) { session ->
                        SessionCard(
                            session = session,
                            isRevoking = uiState.revokeInProgress == session.id,
                            onRevoke = { viewModel.revokeSession(session.id) },
                        )
                    }
                }
            }
        }
    }

    if (showRevokeAllDialog) {
        AlertDialog(
            onDismissRequest = { showRevokeAllDialog = false },
            title = { Text("Revoke All Sessions") },
            text = { Text("This will sign you out of all devices except this one. Continue?") },
            confirmButton = {
                TextButton(onClick = {
                    showRevokeAllDialog = false
                    viewModel.revokeAllSessions()
                }) { Text("Revoke All") }
            },
            dismissButton = {
                TextButton(onClick = { showRevokeAllDialog = false }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun SessionCard(
    session: SessionInfo,
    isRevoking: Boolean,
    onRevoke: () -> Unit,
) {
    val icon = when {
        (session.deviceType ?: session.deviceName ?: "").contains("Android", ignoreCase = true) ||
            (session.deviceType ?: "").contains("iOS", ignoreCase = true) -> Icons.Default.PhoneAndroid
        (session.deviceType ?: session.deviceName ?: "").contains("Desktop", ignoreCase = true) ||
            (session.deviceType ?: "").contains("Windows", ignoreCase = true) ||
            (session.deviceType ?: "").contains("Mac", ignoreCase = true) -> Icons.Default.Computer
        else -> Icons.Default.Devices
    }

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = if (session.isCurrent) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        session.deviceName ?: session.deviceType ?: "Unknown Device",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                    )
                    if (session.isCurrent) {
                        Spacer(Modifier.width(8.dp))
                        AssistChip(
                            onClick = {},
                            label = { Text("Current", style = MaterialTheme.typography.labelSmall) },
                        )
                    }
                }
                Text(
                    session.ipAddress ?: "Unknown IP",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    "Last active: ${session.lastActive ?: "Unknown"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (!session.isCurrent) {
                IconButton(onClick = onRevoke, enabled = !isRevoking) {
                    if (isRevoking) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.Delete, "Revoke session", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
    }
}

@HiltViewModel
class SecuritySettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SecurityUiState())
    val uiState = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.getSessions()) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, sessions = result.data) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message ?: "Failed to load sessions") }
                is Result.Loading -> {}
            }
        }
    }

    fun revokeSession(sessionId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(revokeInProgress = sessionId) }
            when (authRepository.revokeSession(sessionId)) {
                is Result.Success -> {
                    _uiState.update { state ->
                        state.copy(
                            revokeInProgress = null,
                            sessions = state.sessions.filter { it.id != sessionId },
                        )
                    }
                }
                is Result.Error -> _uiState.update { it.copy(revokeInProgress = null) }
                is Result.Loading -> {}
            }
        }
    }

    fun revokeAllSessions() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (authRepository.revokeAllSessions()) {
                is Result.Success -> {
                    _uiState.update { state ->
                        state.copy(
                            isLoading = false,
                            sessions = state.sessions.filter { it.isCurrent },
                        )
                    }
                }
                is Result.Error -> _uiState.update { it.copy(isLoading = false) }
                is Result.Loading -> {}
            }
        }
    }
}
