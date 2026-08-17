@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.zaruda.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.appcompat.app.AppCompatDelegate
import com.zaruda.app.core.LocalLocaleManager
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
import androidx.compose.material.icons.filled.Language
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
import androidx.activity.ComponentActivity
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.BuildConfig
import com.zaruda.app.R
import com.zaruda.app.data.local.AppPreferences
import com.zaruda.app.data.local.ThemeMode
import com.zaruda.app.ui.components.PrimaryButton
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

import com.zaruda.app.data.repository.AuthRepository

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val prefs: AppPreferences,
    @dagger.hilt.android.qualifiers.ApplicationContext private val appContext: android.content.Context,
    private val tokenStore: com.zaruda.app.data.local.TokenStore,
    private val authRepository: AuthRepository,
) : ViewModel() {

    fun updateLanguagePreference(languageCode: String) {
        viewModelScope.launch {
            if (tokenStore.accessToken.first() != null) {
                authRepository.updatePreferredLanguage(languageCode)
            }
        }
    }

    private val _validationMessage = MutableStateFlow<String?>(null)
    val validationMessage: StateFlow<String?> = _validationMessage.asStateFlow()

    private val _loggedOut = MutableStateFlow(false)
    val loggedOut: StateFlow<Boolean> = _loggedOut.asStateFlow()

    val themeMode: StateFlow<ThemeMode> = prefs.themeMode
        .stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Eagerly, ThemeMode.SYSTEM)

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch { prefs.setThemeMode(mode) }
    }

    fun clearCache() {
        viewModelScope.launch {
            try {
                appContext.cacheDir.resolve("image_cache").deleteRecursively()
                appContext.cacheDir.listFiles()?.forEach { it.deleteRecursively() }
                _validationMessage.value = "Cache cleared successfully — images & data purged."
            } catch (e: Exception) {
                _validationMessage.value = "Failed to clear cache: ${e.message}"
            }
        }
    }

    fun logoutAllDevices() {
        viewModelScope.launch {
            _validationMessage.value = null
            when (val r = authRepository.logoutAllDevices()) {
                is com.zaruda.app.core.ApiResult.Success -> _loggedOut.value = true
                is com.zaruda.app.core.ApiResult.Failure -> {
                    // Still sign out locally if the server call fails — never trap the user.
                    tokenStore.clear()
                    _loggedOut.value = true
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit = {},
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val localeManager = LocalLocaleManager.current
    val context = LocalContext.current
    val validationMessage by viewModel.validationMessage.collectAsState()
    val themeMode by viewModel.themeMode.collectAsState()
    val loggedOut by viewModel.loggedOut.collectAsState()
    LaunchedEffect(loggedOut) { if (loggedOut) onLogout() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(stringResource(R.string.nav_settings), fontWeight = FontWeight.Bold)
                        Text(stringResource(R.string.settings_app_config), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                Text(stringResource(R.string.settings_appearance), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.settings_theme), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
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

            // ── Language section ──────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Language, null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(18.dp))
                }
                Text(stringResource(R.string.settings_language), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.settings_display_language), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    val currentLocale = AppCompatDelegate.getApplicationLocales().toLanguageTags().ifEmpty { "en" }
                    var selectedLang by remember { mutableStateOf(currentLocale.split(",").first().split("-").first()) }
                    var showAll by remember { mutableStateOf(false) }
                    val indianLangs = listOf(
                        "en" to "English", "hi" to "हिन्दी", "te" to "తెలుగు", "ta" to "தமிழ்",
                        "kn" to "ಕನ್ನಡ", "mr" to "मराठी", "bn" to "বাংলা", "gu" to "ગુજરાતી",
                        "ml" to "മലയാളം", "pa" to "ਪੰਜਾਬੀ", "ur" to "اردو",
                    )
                    val intlLangs = listOf(
                        "es" to "Español", "fr" to "Français", "de" to "Deutsch", "pt" to "Português",
                        "it" to "Italiano", "ru" to "Русский", "ar" to "العربية", "ja" to "日本語",
                        "ko" to "한국어", "zh" to "中文", "id" to "Indonesia", "tr" to "Türkçe",
                        "vi" to "Tiếng Việt", "th" to "ไทย", "sw" to "Kiswahili",
                    )
                    Text(stringResource(R.string.settings_indian_languages), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    androidx.compose.foundation.layout.FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        indianLangs.forEach { (code, label) ->
                            FilterChip(
                                selected = selectedLang == code,
                                onClick = {
                                    selectedLang = code
                                    localeManager.setLocale(code)
                                    (context as? ComponentActivity)?.recreate()
                                },
                                label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                            )
                        }
                    }
                    if (showAll) {
                        Text(stringResource(R.string.settings_intl_languages), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        androidx.compose.foundation.layout.FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            intlLangs.forEach { (code, label) ->
                                FilterChip(
                                    selected = selectedLang == code,
                                    onClick = {
                                        selectedLang = code
                                        localeManager.setLocale(code)
                                        (context as? ComponentActivity)?.recreate()
                                    },
                                    label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                )
                            }
                        }
                    }
                    Text(
                        if (showAll) stringResource(R.string.settings_show_less) else stringResource(R.string.settings_show_all_languages),
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 4.dp).then(
                            Modifier.background(
                                color = androidx.compose.ui.graphics.Color.Transparent,
                                shape = RoundedCornerShape(4.dp),
                            )
                        ).clickable { showAll = !showAll },
                    )
                }
            }

            // ── Storage & Cache section ──────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Info, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                }
                Text(stringResource(R.string.settings_storage), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.settings_clear_cache), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    PrimaryButton(text = "Clear Cache", onClick = { viewModel.clearCache() })
                    validationMessage?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            // ── Danger Zone ──────────────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Info, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                }
                Text(stringResource(R.string.settings_danger_zone), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.error)
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.settings_logout_all), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Text(stringResource(R.string.settings_logout_all_desc), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    PrimaryButton(text = "Logout All Devices", onClick = { viewModel.logoutAllDevices() })
                }
            }

            // About section header
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                Box(Modifier.size(32.dp).background(MaterialTheme.colorScheme.tertiaryContainer, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Info, null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(18.dp))
                }
                Text(stringResource(R.string.settings_about), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
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
                        text = stringResource(R.string.app_name) + " v" + BuildConfig.VERSION_NAME,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "Version ${BuildConfig.VERSION_CODE} • Android",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    }
                }
            }
        }
    }
}
