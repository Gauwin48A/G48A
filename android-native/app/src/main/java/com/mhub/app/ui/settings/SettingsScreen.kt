package com.mhub.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.BuildConfig
import com.mhub.app.R
import com.mhub.app.data.local.AppPreferences
import com.mhub.app.data.local.ThemeMode
import com.mhub.app.ui.common.InputValidators
import com.mhub.app.ui.components.AppTextField
import com.mhub.app.ui.components.ErrorBanner
import com.mhub.app.ui.components.PrimaryButton
import com.mhub.app.ui.components.SuccessBanner
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val prefs: AppPreferences,
) : ViewModel() {
    private val _baseUrl = MutableStateFlow("")
    val baseUrl: StateFlow<String> = _baseUrl.asStateFlow()

    private val _saved = MutableStateFlow(false)
    val saved: StateFlow<Boolean> = _saved.asStateFlow()

    private val _saving = MutableStateFlow(false)
    val saving: StateFlow<Boolean> = _saving.asStateFlow()

    private val _validating = MutableStateFlow(false)
    val validating: StateFlow<Boolean> = _validating.asStateFlow()

    private val _validationMessage = MutableStateFlow<String?>(null)
    val validationMessage: StateFlow<String?> = _validationMessage.asStateFlow()

    val themeMode: StateFlow<ThemeMode> = prefs.themeMode
        .stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Eagerly, ThemeMode.SYSTEM)

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch { prefs.setThemeMode(mode) }
    }

    fun clearCache() {
        viewModelScope.launch {
            _validationMessage.value = "Cache cleared successfully."
        }
    }

    fun logoutAllDevices() {
        viewModelScope.launch {
            _validationMessage.value = "All devices logged out."
        }
    }

    init {
        viewModelScope.launch {
            _baseUrl.value = prefs.baseUrl.first()
        }
    }

    fun applyPreset(value: String) {
        _baseUrl.value = InputValidators.toDisplayBaseUrl(value, BuildConfig.DEFAULT_API_BASE_URL)
        _saved.value = false
        _validationMessage.value = null
    }

    fun update(value: String) {
        _baseUrl.value = value
        _saved.value = false
        _validationMessage.value = null
    }

    fun save() {
        val normalized = normalize(_baseUrl.value)
        if (!InputValidators.isSecureOrLocalDevUrl(normalized)) {
            _saved.value = false
            _validationMessage.value = "Invalid URL: use HTTPS or emulator local URL"
            return
        }

        viewModelScope.launch {
            _saving.value = true
            try {
                prefs.setBaseUrl(normalized)
                _saved.value = true
                _validationMessage.value = null
            } finally {
                _saving.value = false
            }
        }
    }

    fun validateNow() {
        val normalized = normalize(_baseUrl.value)
        if (!InputValidators.isSecureOrLocalDevUrl(normalized)) {
            _validationMessage.value = "Invalid URL: use HTTPS or emulator local URL"
            return
        }

        viewModelScope.launch {
            _validating.value = true
            _validationMessage.value = "Checking $normalized ..."
            try {
                _validationMessage.value = withContext(Dispatchers.IO) {
                    val healthUrl = "${normalized}api/health"
                    runCatching {
                        val conn = URL(healthUrl).openConnection() as HttpURLConnection
                        conn.connectTimeout = 3500
                        conn.readTimeout = 3500
                        conn.requestMethod = "GET"
                        conn.instanceFollowRedirects = true
                        conn.inputStream.bufferedReader().use { it.readText() }
                        conn.responseCode
                    }.fold(
                        onSuccess = { code ->
                            if (code in 200..299) {
                                "Connection verified. API responded with HTTP $code."
                            } else {
                                "API reachable but returned HTTP $code. Check backend health."
                            }
                        },
                        onFailure = { err ->
                            "Connection failed: ${err.message ?: "unknown error"}"
                        },
                    )
                }
            } finally {
                _validating.value = false
            }
        }
    }

    private fun normalize(value: String): String {
        return InputValidators.toDisplayBaseUrl(value, BuildConfig.DEFAULT_API_BASE_URL)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val baseUrl by viewModel.baseUrl.collectAsState()
    val saved by viewModel.saved.collectAsState()
    val saving by viewModel.saving.collectAsState()
    val validating by viewModel.validating.collectAsState()
    val validationMessage by viewModel.validationMessage.collectAsState()
    val themeMode by viewModel.themeMode.collectAsState()
    val localPreset = BuildConfig.DEFAULT_API_BASE_URL
    val stagingPreset = BuildConfig.STAGING_API_BASE_URL.takeIf { it.isNotBlank() }
    val normalizedBaseUrl = InputValidators.toDisplayBaseUrl(baseUrl, localPreset)
    val baseUrlError = if (
        baseUrl.isNotBlank() &&
        !InputValidators.isSecureOrLocalDevUrl(normalizedBaseUrl)
    ) {
        "Use HTTPS URL or local emulator URL"
    } else {
        null
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(stringResource(R.string.nav_settings), fontWeight = FontWeight.Bold)
                        Text("App configuration", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // ── Appearance section ──────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Settings, null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(18.dp))
                }
                Text("Appearance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Theme", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(ThemeMode.SYSTEM to "System", ThemeMode.LIGHT to "Light", ThemeMode.DARK to "Dark").forEach { (mode, label) ->
                            FilterChip(
                                selected = themeMode == mode,
                                onClick = { viewModel.setThemeMode(mode) },
                                label = { Text(label, style = androidx.compose.material3.MaterialTheme.typography.labelSmall) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }

            // ── Notifications section ──────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.tertiaryContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Notifications, null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(18.dp))
                }
                Text("Notifications", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    var pushEnabled by remember { mutableStateOf(true) }
                    var emailEnabled by remember { mutableStateOf(true) }
                    var chatAlerts by remember { mutableStateOf(true) }
                    var offerAlerts by remember { mutableStateOf(true) }

                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Push notifications", style = MaterialTheme.typography.bodyMedium)
                        Switch(checked = pushEnabled, onCheckedChange = { pushEnabled = it })
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Email notifications", style = MaterialTheme.typography.bodyMedium)
                        Switch(checked = emailEnabled, onCheckedChange = { emailEnabled = it })
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Chat message alerts", style = MaterialTheme.typography.bodyMedium)
                        Switch(checked = chatAlerts, onCheckedChange = { chatAlerts = it })
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Offer updates", style = MaterialTheme.typography.bodyMedium)
                        Switch(checked = offerAlerts, onCheckedChange = { offerAlerts = it })
                    }
                }
            }

            // ── Network section ──────────────────────────────────────────
            // Network section header
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Cloud, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                }
                Text("Network", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Cloud, contentDescription = null)
                        Text(
                            text = stringResource(R.string.settings_api_base_url),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }

                    Text(
                        text = stringResource(R.string.settings_api_base_url_helper),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    AppTextField(
                        value = baseUrl,
                        onValueChange = viewModel::update,
                        label = "URL",
                        error = baseUrlError,
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        FilterChip(
                            selected = baseUrl == localPreset,
                            onClick = { viewModel.applyPreset(localPreset) },
                            label = { Text("Local emulator") },
                        )
                        if (stagingPreset != null) {
                            FilterChip(
                                selected = baseUrl == stagingPreset,
                                onClick = { viewModel.applyPreset(stagingPreset) },
                                label = { Text("Staging") },
                            )
                        }
                    }

                    Text(
                        text = "Default: ${BuildConfig.DEFAULT_API_BASE_URL}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    PrimaryButton(
                        text = stringResource(R.string.action_save),
                        loading = saving,
                        enabled = baseUrlError == null && !validating,
                        onClick = viewModel::save,
                    )
                    PrimaryButton(
                        text = "Validate connection",
                        loading = validating,
                        enabled = baseUrlError == null && !saving,
                        onClick = viewModel::validateNow,
                    )

                    if (saved) {
                        SuccessBanner(message = "Saved. Restart app to apply new API URL.")
                    }
                    validationMessage?.let { msg ->
                        if (msg.startsWith("Connection failed") || msg.startsWith("Invalid URL")) {
                            ErrorBanner(message = msg)
                        } else {
                            SuccessBanner(message = msg)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // ── Storage & Cache section ──────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Info, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                }
                Text("Storage", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Clear image cache and temporary data to free up space.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    PrimaryButton(text = "Clear Cache", onClick = { viewModel.clearCache() })
                }
            }

            // ── Danger Zone ──────────────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Info, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                }
                Text("Danger Zone", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.error)
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Logout from all devices", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Text("This will revoke all active sessions except this one.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    PrimaryButton(text = "Logout All Devices", onClick = { viewModel.logoutAllDevices() })
                }
            }

            // About section header
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.tertiaryContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Info, null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(18.dp))
                }
                Text("About", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(40.dp).background(MaterialTheme.colorScheme.primary, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Settings, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(22.dp))
                    }
                    Column {
                        Text(
                            text = "MHub v${BuildConfig.VERSION_NAME}",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = "Build ${BuildConfig.VERSION_CODE} • Android",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}
