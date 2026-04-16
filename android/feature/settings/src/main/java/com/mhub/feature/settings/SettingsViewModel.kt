package com.mhub.feature.settings

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ThemeMode(val displayName: String) {
    SYSTEM("System"),
    LIGHT("Light"),
    DARK("Dark"),
}

data class SettingsUiState(
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val biometricEnabled: Boolean = false,
    val biometricAvailable: Boolean = false,
    val pushEnabled: Boolean = true,
    val chatNotificationsEnabled: Boolean = true,
    val autoDownloadImages: Boolean = true,
    val appVersion: String = "",
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val prefs = context.getSharedPreferences("mhub_settings", Context.MODE_PRIVATE)

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        val packageInfo = try {
            context.packageManager.getPackageInfo(context.packageName, 0)
        } catch (_: Exception) {
            null
        }

        val biometricAvailable = try {
            val biometricManager = androidx.biometric.BiometricManager.from(context)
            biometricManager.canAuthenticate(
                androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
            ) == androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS
        } catch (_: Exception) {
            false
        }

        _uiState.update {
            it.copy(
                themeMode = ThemeMode.entries.find { mode ->
                    mode.name == prefs.getString("theme_mode", ThemeMode.SYSTEM.name)
                } ?: ThemeMode.SYSTEM,
                biometricEnabled = prefs.getBoolean("biometric_enabled", false),
                biometricAvailable = biometricAvailable,
                pushEnabled = prefs.getBoolean("push_enabled", true),
                chatNotificationsEnabled = prefs.getBoolean("chat_notifications", true),
                autoDownloadImages = prefs.getBoolean("auto_download_images", true),
                appVersion = packageInfo?.versionName ?: "1.0.0",
            )
        }
    }

    fun setThemeMode(mode: ThemeMode) {
        prefs.edit().putString("theme_mode", mode.name).apply()
        _uiState.update { it.copy(themeMode = mode) }
    }

    fun toggleBiometric(enabled: Boolean) {
        prefs.edit().putBoolean("biometric_enabled", enabled).apply()
        _uiState.update { it.copy(biometricEnabled = enabled) }
    }

    fun togglePush(enabled: Boolean) {
        prefs.edit().putBoolean("push_enabled", enabled).apply()
        _uiState.update { it.copy(pushEnabled = enabled) }
    }

    fun toggleChatNotifications(enabled: Boolean) {
        prefs.edit().putBoolean("chat_notifications", enabled).apply()
        _uiState.update { it.copy(chatNotificationsEnabled = enabled) }
    }

    fun toggleAutoDownload(enabled: Boolean) {
        prefs.edit().putBoolean("auto_download_images", enabled).apply()
        _uiState.update { it.copy(autoDownloadImages = enabled) }
    }

    fun clearCache() {
        viewModelScope.launch {
            context.cacheDir.deleteRecursively()
        }
    }

    fun openPrivacyPolicy() {
        openUrl("https://mhub.app/privacy")
    }

    fun openTerms() {
        openUrl("https://mhub.app/terms")
    }

    private fun openUrl(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }
}
